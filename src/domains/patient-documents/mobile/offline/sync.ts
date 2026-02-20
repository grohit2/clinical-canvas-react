import NetInfo from '@react-native-community/netinfo';
import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';
import type { DocumentsApi } from '../../api/documentsApi';
import { mapAllDocumentsFromApi } from '../../core/mapFromApi';
import type { DocCategory, DocumentItem } from '../../core/types';
import { normalizeError, sanitizeFileName } from '../../core/utils';
import {
  dequeueNextSyncAction,
  deleteDocumentById,
  enqueueSyncAction,
  getDocumentById,
  getLocalStateByRemoteKey,
  listPatientDocuments,
  markSyncActionFailed,
  patchDocument,
  removeSyncAction,
  upsertDocuments,
} from './db';
import {
  copyIntoCache,
  ensureDownloaded,
  getDocLocalPath,
  removeCachedFile,
} from './fileCache';
import { mergeServerDocuments } from './merge';

const MAX_RETRY_COUNT = 5;
let isSyncRunning = false;

export async function refreshPatientDocuments(
  patientId: string,
  documentsApi: DocumentsApi
): Promise<DocumentItem[]> {
  let profile;

  try {
    profile = await documentsApi.getDocuments(patientId);
  } catch (error) {
    const status = (error as { status?: number } | undefined)?.status;
    if (status === 404) {
      const initialized = await documentsApi.initDocuments(patientId);
      profile = initialized.documents;
    } else {
      throw error;
    }
  }

  const localState = await getLocalStateByRemoteKey(patientId);
  const serverDocs = mapAllDocumentsFromApi(patientId, profile, localState);
  return mergeServerDocuments(patientId, serverDocs);
}

export async function createLocalDocument(args: {
  patientId: string;
  category: DocCategory;
  sourceUri: string;
  name: string;
  contentType?: string;
  size?: number;
}): Promise<DocumentItem> {
  const id = uuidv4();
  const localUri = await copyIntoCache({
    fromUri: args.sourceUri,
    patientId: args.patientId,
    docId: id,
    name: args.name,
    variant: 'full',
  });

  const item: DocumentItem = {
    id,
    patientId: args.patientId,
    category: args.category,
    name: args.name,
    uploadedAt: new Date().toISOString(),
    contentType: args.contentType,
    isImage: (args.contentType || '').startsWith('image/'),
    size: args.size,
    localUri,
    localThumbUri: undefined,
    backupState: 'device_only',
    offlineState: 'available_offline',
  };

  await upsertDocuments([item]);
  await enqueueSyncAction({
    action: 'upload',
    patientId: args.patientId,
    docId: id,
    category: args.category,
  });

  return item;
}

async function uploadToPresignedUrl(args: {
  uploadUrl: string;
  localUri: string;
  contentType: string;
  headers?: Record<string, string>;
}): Promise<void> {
  const file = new File(args.localUri);
  await expoFetch(args.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': args.contentType,
      ...(args.headers || {}),
    },
  });
}

export async function ensureLocalFileForViewing(
  doc: DocumentItem,
  documentsApi: DocumentsApi
): Promise<string> {
  if (doc.localUri) return doc.localUri;

  let remoteUrl = doc.fileUrl;
  if (!remoteUrl && doc.remoteKey) {
    const presigned = await documentsApi.presignDownload(doc.patientId, doc.remoteKey);
    remoteUrl = presigned.url;
  }

  if (!remoteUrl) {
    throw new Error('No local or remote file available');
  }

  const localUri = await ensureDownloaded({
    patientId: doc.patientId,
    docId: doc.id,
    name: doc.name || 'document',
    remoteUrl,
    variant: 'full',
  });

  await patchDocument(doc.id, {
    localUri,
    offlineState: 'available_offline',
  });

  return localUri;
}

export async function prefetchOfflineForDocuments(
  documents: DocumentItem[],
  documentsApi: DocumentsApi
): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;

  for (const doc of documents) {
    try {
      await ensureLocalFileForViewing(doc, documentsApi);
      succeeded += 1;
    } catch {
      failed += 1;
    }
  }

  return { succeeded, failed };
}

async function processUploadAction(
  item: {
    qid: number;
    patientId: string;
    docId: string;
    category: DocCategory;
    retryCount: number;
  },
  documentsApi: DocumentsApi
): Promise<void> {
  const doc = await getDocumentById(item.docId);
  if (!doc) {
    await removeSyncAction(item.qid);
    return;
  }

  if (!doc.localUri) {
    const retryCount = item.retryCount + 1;
    await patchDocument(item.docId, {
      backupState: 'error',
      lastError: 'Local file missing from device cache',
    });
    await markSyncActionFailed(item.qid, 'Local file missing from device cache', retryCount);
    return;
  }

  await patchDocument(item.docId, {
    backupState: 'pending_backup',
    lastError: undefined,
  });

  const contentType = doc.contentType || (doc.isImage ? 'image/jpeg' : 'application/octet-stream');
  const upload = await documentsApi.presignUpload(item.patientId, {
    filename: sanitizeFileName(doc.name || 'document'),
    mimeType: contentType,
    category: item.category,
  });

  await uploadToPresignedUrl({
    uploadUrl: upload.uploadUrl,
    localUri: doc.localUri,
    contentType,
    headers: upload.headers,
  });

  await documentsApi.attachDocument(item.patientId, {
    category: item.category,
    key: upload.key,
    mimeType: doc.contentType,
    size: doc.size,
  });

  await patchDocument(item.docId, {
    remoteKey: upload.key,
    backupState: 'backed_up',
    lastError: undefined,
  });

  await removeSyncAction(item.qid);

  // Pull fresh URLs/metadata from the backend after a successful attach.
  await refreshPatientDocuments(item.patientId, documentsApi);
}

async function processDeleteAction(
  item: {
    qid: number;
    patientId: string;
    docId: string;
    category: DocCategory;
  },
  documentsApi: DocumentsApi
): Promise<void> {
  const doc = await getDocumentById(item.docId);
  if (!doc) {
    await removeSyncAction(item.qid);
    return;
  }

  if (doc.remoteKey) {
    await documentsApi.detachDocument(item.patientId, {
      category: item.category,
      key: doc.remoteKey,
    });
  }

  await removeCachedFile(doc.localUri);
  await removeCachedFile(doc.localThumbUri);
  await deleteDocumentById(item.docId);
  await removeSyncAction(item.qid);
}

export async function runSyncQueueOnce(
  documentsApi: DocumentsApi
): Promise<{ processed: number; failed: boolean }> {
  if (isSyncRunning) return { processed: 0, failed: false };

  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    return { processed: 0, failed: false };
  }

  isSyncRunning = true;
  let processed = 0;

  try {
    while (true) {
      const item = await dequeueNextSyncAction();
      if (!item) break;

      if (item.retryCount >= MAX_RETRY_COUNT) {
        // Remove permanently failed item to avoid blocking the queue forever.
        await removeSyncAction(item.qid);
        continue;
      }

      try {
        if (item.action === 'upload') {
          await processUploadAction(item, documentsApi);
        } else {
          await processDeleteAction(item, documentsApi);
        }
        processed += 1;
      } catch (error) {
        const message = normalizeError(error);
        const retryCount = item.retryCount + 1;

        await markSyncActionFailed(item.qid, message, retryCount);
        await patchDocument(item.docId, {
          backupState: 'error',
          lastError: message,
        });

        return { processed, failed: true };
      }
    }

    return { processed, failed: false };
  } finally {
    isSyncRunning = false;
  }
}

export async function queueDeleteDocument(doc: DocumentItem): Promise<void> {
  if (!doc.remoteKey) {
    await removeCachedFile(doc.localUri);
    await removeCachedFile(doc.localThumbUri);
    await deleteDocumentById(doc.id);
    return;
  }

  await patchDocument(doc.id, {
    backupState: 'pending_backup',
    lastError: undefined,
  });

  await enqueueSyncAction({
    action: 'delete',
    patientId: doc.patientId,
    docId: doc.id,
    category: doc.category,
  });
}

export async function rebuildFolderFromServer(
  patientId: string,
  documentsApi: DocumentsApi
): Promise<void> {
  const localDocs = await listPatientDocuments(patientId);
  if (!localDocs.length) {
    await refreshPatientDocuments(patientId, documentsApi);
    return;
  }

  await refreshPatientDocuments(patientId, documentsApi);
}

export function getCachedThumbPath(args: {
  patientId: string;
  docId: string;
  name: string;
}): string {
  return getDocLocalPath({ ...args, variant: 'thumb' });
}
