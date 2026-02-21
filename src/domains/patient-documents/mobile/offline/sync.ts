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
  prefetchMany,
  removeCachedFile,
  type OnPrefetchProgress,
} from './fileCache';
import { mergeServerDocuments } from './merge';

const MAX_RETRY_COUNT = 5;
let isSyncRunning = false;
const GEO_CAPTION_PREFIX = '__geojson:';

function serializeGeoCaption(geo: DocumentItem['geo']): string | undefined {
  if (!geo) return undefined;
  return `${GEO_CAPTION_PREFIX}${JSON.stringify({
    latitude: geo.latitude,
    longitude: geo.longitude,
    address: geo.address,
    capturedAt: geo.capturedAt,
  })}`;
}

// ------------------------------------------------------------------------------
// Network check helper
// ------------------------------------------------------------------------------

async function assertOnline(): Promise<void> {
  const state = await NetInfo.fetch();
  if (!state.isConnected) {
    throw new Error('Device is offline - cannot download files');
  }
}

// ------------------------------------------------------------------------------
// Server sync: pull latest from backend
// ------------------------------------------------------------------------------

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

// ------------------------------------------------------------------------------
// Local document creation (camera/gallery capture)
// ------------------------------------------------------------------------------

export async function createLocalDocument(args: {
  patientId: string;
  category: DocCategory;
  sourceUri: string;
  name: string;
  contentType?: string;
  size?: number;
  geo?: DocumentItem['geo'];
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
    geo: args.geo,
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

// ------------------------------------------------------------------------------
// Resolve a downloadable URL for a document
//
// Strategy:
//   1. Try the CDN URL (doc.fileUrl) if available.
//   2. If CDN fails or is missing, fall back to a fresh presigned URL.
//   3. If neither is available, throw.
// ------------------------------------------------------------------------------

async function resolveDownloadUrl(
  doc: DocumentItem,
  documentsApi: DocumentsApi
): Promise<string> {
  // Attempt 1: CDN URL (fast, no extra API call)
  if (doc.fileUrl) {
    try {
      // Do a lightweight HEAD request to verify the URL is still valid.
      const headResponse = await fetch(doc.fileUrl, { method: 'HEAD' });
      if (headResponse.ok) {
        return doc.fileUrl;
      }
      console.warn(
        `[sync] CDN URL returned ${headResponse.status} for doc ${doc.id}, falling back to presign`
      );
    } catch (error) {
      console.warn(
        `[sync] CDN URL unreachable for doc ${doc.id}, falling back to presign:`,
        error instanceof Error ? error.message : error
      );
    }
  }

  // Attempt 2: Get a fresh presigned URL from the backend.
  if (doc.remoteKey) {
    const presigned = await documentsApi.presignDownload(doc.patientId, doc.remoteKey);
    return presigned.url;
  }

  throw new Error(`No downloadable URL for document "${doc.name}" (no CDN URL or remote key)`);
}

// ------------------------------------------------------------------------------
// Single-document download (for viewing / sharing)
// ------------------------------------------------------------------------------

/**
 * Ensures a document has a local file. Downloads if missing.
 * Returns the local URI.
 * Throws a descriptive error if download fails.
 */
export async function ensureLocalFileForViewing(
  doc: DocumentItem,
  documentsApi: DocumentsApi
): Promise<string> {
  // Already have a local copy.
  if (doc.localUri) {
    // Verify it still exists on disk (user may have cleared app data).
    const { fileExists } = await import('./fileCache');
    if (fileExists(doc.localUri)) {
      return doc.localUri;
    }
    // Local file is gone - clear stale reference and re-download.
    console.warn(`[sync] Stale localUri for doc ${doc.id}, re-downloading`);
  }

  const remoteUrl = await resolveDownloadUrl(doc, documentsApi);

  const localUri = await ensureDownloaded({
    patientId: doc.patientId,
    docId: doc.id,
    name: doc.name || 'document',
    remoteUrl,
    variant: 'full',
  });

  // Update SQLite with the new local path.
  await patchDocument(doc.id, {
    localUri,
    offlineState: 'available_offline',
    // Also mark backup state since the file exists both locally and remotely.
    ...(doc.remoteKey ? { backupState: 'backed_up' as const } : {}),
  });

  return localUri;
}

// ------------------------------------------------------------------------------
// Batch offline download (the "Download Offline" button)
//
// Uses prefetchMany for concurrent downloads + progress reporting.
// ------------------------------------------------------------------------------

export interface OfflineDownloadResult {
  succeeded: number;
  failed: number;
  skipped: number;
  errors: Array<{ docId: string; name: string; error: string }>;
}

/**
 * Downloads multiple documents for offline use.
 *
 * @param documents    - Documents to download.
 * @param documentsApi - API client for presigned URLs.
 * @param onProgress   - Optional progress callback for UI updates.
 * @returns Detailed result with per-item error information.
 */
export async function prefetchOfflineForDocuments(
  documents: DocumentItem[],
  documentsApi: DocumentsApi,
  onProgress?: OnPrefetchProgress
): Promise<OfflineDownloadResult> {
  if (!documents.length) {
    return { succeeded: 0, failed: 0, skipped: 0, errors: [] };
  }

  // Check network before starting.
  await assertOnline();

  // Filter out documents that are already available offline.
  const needsDownload: DocumentItem[] = [];
  let skipped = 0;

  for (const doc of documents) {
    if (doc.localUri) {
      const { fileExists } = await import('./fileCache');
      if (fileExists(doc.localUri)) {
        skipped += 1;
        continue;
      }
    }
    needsDownload.push(doc);
  }

  if (!needsDownload.length) {
    return { succeeded: 0, failed: 0, skipped, errors: [] };
  }

  // Resolve downloadable URLs for all documents upfront.
  // This way we get fresh presigned URLs in bulk before starting downloads,
  // avoiding the TTL race condition where later URLs expire.
  const downloadItems: Array<{
    doc: DocumentItem;
    patientId: string;
    docId: string;
    name: string;
    remoteUrl: string;
    variant: 'full';
  }> = [];
  const resolveErrors: Array<{ docId: string; name: string; error: string }> = [];

  await Promise.all(
    needsDownload.map(async (doc) => {
      try {
        const remoteUrl = await resolveDownloadUrl(doc, documentsApi);
        downloadItems.push({
          doc,
          patientId: doc.patientId,
          docId: doc.id,
          name: doc.name || 'document',
          remoteUrl,
          variant: 'full',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        resolveErrors.push({ docId: doc.id, name: doc.name, error: message });
        console.warn(`[sync] Could not resolve URL for ${doc.name}:`, message);
      }
    })
  );

  // Download all resolved items concurrently.
  const result = await prefetchMany(
    downloadItems,
    onProgress,
    3 // concurrency
  );

  // Update SQLite for successfully downloaded files.
  for (const item of downloadItems) {
    // Check if this item succeeded (not in errors list).
    const didFail = result.errors.some((e) => e.docId === item.docId);
    if (didFail) continue;

    const localUri = getDocLocalPath({
      patientId: item.patientId,
      docId: item.docId,
      name: item.name,
      variant: 'full',
    });

    await patchDocument(item.docId, {
      localUri,
      offlineState: 'available_offline',
      ...(item.doc.remoteKey ? { backupState: 'backed_up' as const } : {}),
    });
  }

  return {
    succeeded: result.succeeded,
    failed: result.failed + resolveErrors.length,
    skipped,
    errors: [...resolveErrors, ...result.errors],
  };
}

// ------------------------------------------------------------------------------
// Upload to presigned URL
// ------------------------------------------------------------------------------

async function uploadToPresignedUrl(args: {
  uploadUrl: string;
  localUri: string;
  contentType: string;
  headers?: Record<string, string>;
}): Promise<void> {
  const file = new File(args.localUri);
  if (!file.exists) {
    throw new Error(`Upload source file missing: ${args.localUri}`);
  }

  await expoFetch(args.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': args.contentType,
      ...(args.headers || {}),
    },
  });
}

// ------------------------------------------------------------------------------
// Sync queue processing
// ------------------------------------------------------------------------------

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
    caption: serializeGeoCaption(doc.geo),
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

        console.error(`[sync] Queue item ${item.qid} failed:`, message);
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
  await refreshPatientDocuments(patientId, documentsApi);
}

export function getCachedThumbPath(args: {
  patientId: string;
  docId: string;
  name: string;
}): string {
  return getDocLocalPath({ ...args, variant: 'thumb' });
}
