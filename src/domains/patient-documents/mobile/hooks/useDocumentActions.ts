import { useCallback, useState } from 'react';
import { Alert, Linking } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import * as Sharing from 'expo-sharing';
import type { DocumentsApi } from '../../api/documentsApi';
import { DOC_CATEGORIES } from '../../core/categories';
import type { DocCategory, DocumentItem } from '../../core/types';
import { enqueueSyncAction, listPatientDocuments, patchDocument } from '../offline/db';
import type { PrefetchProgress } from '../offline/fileCache';
import {
  ensureLocalFileForViewing,
  prefetchOfflineForDocuments,
  queueDeleteDocument,
  runSyncQueueOnce,
  type OfflineDownloadResult,
} from '../offline/sync';
import { getDocumentFoldersKey } from './useDocumentFolders';
import { getCategoryDocumentsKey } from './useCategoryDocuments';
import { getPatientDocumentsKey } from './useDateGroups';

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>, patientId: string) {
  queryClient.invalidateQueries({ queryKey: getDocumentFoldersKey(patientId) });
  queryClient.invalidateQueries({ queryKey: getPatientDocumentsKey(patientId) });
  DOC_CATEGORIES.forEach((category) => {
    queryClient.invalidateQueries({ queryKey: getCategoryDocumentsKey(patientId, category) });
  });
}

export interface DownloadProgress {
  /** true while the batch download is active */
  isDownloading: boolean;
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  /** Name of the file currently being downloaded */
  currentName?: string;
}

export interface DownloadForOfflineOptions {
  /** Suppresses user alerts; intended for automatic background prefetch. */
  silent?: boolean;
}

const IDLE_PROGRESS: DownloadProgress = {
  isDownloading: false,
  total: 0,
  completed: 0,
  succeeded: 0,
  failed: 0,
};

async function tryOpenUrl(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

export function useDocumentActions(
  patientId: string,
  documentsApi: DocumentsApi,
  category?: DocCategory
) {
  const queryClient = useQueryClient();
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>(IDLE_PROGRESS);

  // -- Share ---------------------------------------------------------------

  const shareDocument = useCallback(
    async (document: DocumentItem) => {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
        return;
      }

      try {
        const localUri = await ensureLocalFileForViewing(document, documentsApi);

        console.log('audit.external_share', {
          patientId: document.patientId,
          docId: document.id,
          timestamp: new Date().toISOString(),
        });

        await Sharing.shareAsync(localUri, {
          mimeType: document.contentType,
          dialogTitle: 'Share document',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        Alert.alert('Share failed', message);
      }
    },
    [documentsApi]
  );

  const shareDocuments = useCallback(
    async (documents: DocumentItem[]) => {
      if (!documents.length) return;
      await shareDocument(documents[0]);
      if (documents.length > 1) {
        Alert.alert('Shared first file', 'Share selected files one by one from the action bar.');
      }
    },
    [shareDocument]
  );

  // -- Open ----------------------------------------------------------------

  const openDocument = useCallback(
    async (document: DocumentItem) => {
      let localUri: string | undefined;

      try {
        localUri = await ensureLocalFileForViewing(document, documentsApi);
      } catch (error) {
        // Continue: some documents can still be opened via remote URL.
        if (!document.fileUrl) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          Alert.alert('Open failed', message);
          return;
        }
      }

      if (localUri) {
        const openedLocal = await tryOpenUrl(localUri);
        if (openedLocal) return;
      }

      if (document.fileUrl) {
        const openedRemote = await tryOpenUrl(document.fileUrl);
        if (openedRemote) return;
      }

      if (localUri) {
        await shareDocument(document);
        return;
      }

      Alert.alert('Open failed', 'No compatible viewer is available for this file.');
    },
    [documentsApi, shareDocument]
  );

  // -- Delete --------------------------------------------------------------

  const deleteDocuments = useCallback(
    async (documents: DocumentItem[]) => {
      if (!documents.length) return;

      for (const doc of documents) {
        await queueDeleteDocument(doc);
      }

      invalidateAll(queryClient, patientId);
      await runSyncQueueOnce(documentsApi);
      invalidateAll(queryClient, patientId);
    },
    [documentsApi, patientId, queryClient]
  );

  // -- Download for offline -----------------------------------------------

  const downloadForOffline = useCallback(
    async (
      documents: DocumentItem[],
      options?: DownloadForOfflineOptions
    ): Promise<OfflineDownloadResult> => {
      if (!documents.length) {
        return { succeeded: 0, failed: 0, skipped: 0, errors: [] };
      }

      setDownloadProgress({
        isDownloading: true,
        total: documents.length,
        completed: 0,
        succeeded: 0,
        failed: 0,
      });

      try {
        const onProgress = (progress: PrefetchProgress) => {
          setDownloadProgress({
            isDownloading: true,
            total: progress.total,
            completed: progress.completed,
            succeeded: progress.succeeded,
            failed: progress.failed,
            currentName: progress.currentName,
          });
        };

        const result = await prefetchOfflineForDocuments(documents, documentsApi, onProgress);

        if (result.succeeded > 0 || result.failed > 0) {
          invalidateAll(queryClient, patientId);
        }

        if (!options?.silent) {
          // Show appropriate feedback.
          if (result.failed > 0 && result.succeeded > 0) {
            Alert.alert(
              'Offline download partially complete',
              `${result.succeeded} downloaded, ${result.failed} failed${result.skipped ? `, ${result.skipped} already cached` : ''}.`,
              [
                {
                  text: 'View errors',
                  onPress: () => {
                    const details = result.errors
                      .slice(0, 5)
                      .map((e) => `- ${e.name}: ${e.error}`)
                      .join('\n');
                    const suffix = result.errors.length > 5
                      ? `\n...and ${result.errors.length - 5} more`
                      : '';
                    Alert.alert('Download errors', details + suffix);
                  },
                },
                { text: 'OK' },
              ]
            );
          } else if (result.failed > 0 && result.succeeded === 0) {
            Alert.alert(
              'Download failed',
              result.errors[0]?.error || 'Could not download files. Check your network connection.',
            );
          } else if (result.succeeded > 0) {
            Alert.alert(
              'Downloads complete',
              `${result.succeeded} file${result.succeeded > 1 ? 's' : ''} saved for offline use${result.skipped ? ` (${result.skipped} already cached)` : ''}.`
            );
          } else if (result.skipped > 0) {
            // Everything was already cached.
            Alert.alert('Already available', 'All documents are already saved for offline use.');
          }
        }

        return result;
      } catch (error) {
        // Network-level failure (offline check, etc.)
        const message = error instanceof Error ? error.message : 'Unknown error';
        if (!options?.silent) {
          Alert.alert('Download failed', message);
        }
        return {
          succeeded: 0,
          failed: documents.length,
          skipped: 0,
          errors: [{ docId: '', name: '', error: message }],
        };
      } finally {
        setDownloadProgress(IDLE_PROGRESS);
      }
    },
    [documentsApi, patientId, queryClient]
  );

  // -- Retry failed uploads -----------------------------------------------

  const retryFailedUploads = useCallback(async () => {
    const docs = await listPatientDocuments(patientId);
    const failed = docs.filter((doc) => doc.backupState === 'error');

    for (const doc of failed) {
      await patchDocument(doc.id, {
        backupState: 'pending_backup',
        lastError: undefined,
      });
      await enqueueSyncAction({
        action: 'upload',
        patientId: doc.patientId,
        docId: doc.id,
        category: doc.category,
      });
    }

    await runSyncQueueOnce(documentsApi);
    invalidateAll(queryClient, patientId);
    return failed.length;
  }, [documentsApi, patientId, queryClient]);

  // -- Refresh ------------------------------------------------------------

  const refreshCategory = useCallback(() => {
    if (!category) return;
    queryClient.invalidateQueries({ queryKey: getCategoryDocumentsKey(patientId, category) });
    queryClient.invalidateQueries({ queryKey: getDocumentFoldersKey(patientId) });
  }, [category, patientId, queryClient]);

  return {
    openDocument,
    shareDocument,
    shareDocuments,
    deleteDocuments,
    downloadForOffline,
    downloadProgress,
    retryFailedUploads,
    refreshCategory,
  };
}
