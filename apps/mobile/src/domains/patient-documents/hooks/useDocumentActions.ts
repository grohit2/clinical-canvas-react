import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import * as Sharing from 'expo-sharing';
import type { DocCategory, DocumentItem } from '../core/types';
import { DOC_CATEGORIES } from '../core/types';
import { enqueueSyncAction, listPatientDocuments, patchDocument } from '../offline/db';
import {
  ensureLocalFileForViewing,
  prefetchOfflineForDocuments,
  queueDeleteDocument,
  runSyncQueueOnce,
} from '../offline/sync';
import { getDocumentFoldersKey } from './useDocumentFolders';
import { getCategoryDocumentsKey } from './useCategoryDocuments';

function invalidateAll(queryClient: ReturnType<typeof useQueryClient>, patientId: string) {
  queryClient.invalidateQueries({ queryKey: getDocumentFoldersKey(patientId) });
  DOC_CATEGORIES.forEach((category) => {
    queryClient.invalidateQueries({ queryKey: getCategoryDocumentsKey(patientId, category) });
  });
}

export function useDocumentActions(patientId: string, category?: DocCategory) {
  const queryClient = useQueryClient();

  const shareDocument = useCallback(
    async (document: DocumentItem) => {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('Sharing unavailable', 'Sharing is not available on this device.');
        return;
      }

      const localUri = await ensureLocalFileForViewing(document);

      // Lightweight audit log hook point.
      console.log('audit.external_share', {
        patientId: document.patientId,
        docId: document.id,
        timestamp: new Date().toISOString(),
      });

      await Sharing.shareAsync(localUri, {
        mimeType: document.contentType,
        dialogTitle: 'Share document',
      });
    },
    []
  );

  const shareDocuments = useCallback(
    async (documents: DocumentItem[]) => {
      if (!documents.length) return;
      // Native share sheet supports one URI per invocation on most platforms.
      await shareDocument(documents[0]);
      if (documents.length > 1) {
        Alert.alert('Shared first file', 'Share selected files one by one from the action bar.');
      }
    },
    [shareDocument]
  );

  const deleteDocuments = useCallback(
    async (documents: DocumentItem[]) => {
      if (!documents.length) return;

      for (const doc of documents) {
        await queueDeleteDocument(doc);
      }

      invalidateAll(queryClient, patientId);
      await runSyncQueueOnce();
      invalidateAll(queryClient, patientId);
    },
    [patientId, queryClient]
  );

  const downloadForOffline = useCallback(
    async (documents: DocumentItem[]) => {
      const result = await prefetchOfflineForDocuments(documents);
      invalidateAll(queryClient, patientId);

      if (result.failed > 0) {
        Alert.alert('Offline download complete', `${result.succeeded} downloaded, ${result.failed} failed.`);
      }

      return result;
    },
    [patientId, queryClient]
  );

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

    await runSyncQueueOnce();
    invalidateAll(queryClient, patientId);
    return failed.length;
  }, [patientId, queryClient]);

  const refreshCategory = useCallback(() => {
    if (!category) return;
    queryClient.invalidateQueries({ queryKey: getCategoryDocumentsKey(patientId, category) });
    queryClient.invalidateQueries({ queryKey: getDocumentFoldersKey(patientId) });
  }, [category, patientId, queryClient]);

  return {
    shareDocument,
    shareDocuments,
    deleteDocuments,
    downloadForOffline,
    retryFailedUploads,
    refreshCategory,
  };
}
