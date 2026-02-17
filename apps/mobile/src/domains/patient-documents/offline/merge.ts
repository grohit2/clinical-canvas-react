import type { DocumentItem } from '../core/types';
import {
  deleteDocumentById,
  listPatientDocuments,
  upsertDocuments,
} from './db';

export async function mergeServerDocuments(
  patientId: string,
  serverDocuments: DocumentItem[]
): Promise<DocumentItem[]> {
  const localDocuments = await listPatientDocuments(patientId);

  const localByRemote = new Map<string, DocumentItem>();
  const localById = new Map<string, DocumentItem>();

  for (const doc of localDocuments) {
    localById.set(doc.id, doc);
    if (doc.remoteKey) {
      localByRemote.set(doc.remoteKey, doc);
    }
  }

  const merged: DocumentItem[] = [];
  const seenLocalIds = new Set<string>();
  const seenRemoteKeys = new Set<string>();

  for (const serverDoc of serverDocuments) {
    const localMatch =
      (serverDoc.remoteKey ? localByRemote.get(serverDoc.remoteKey) : undefined) ||
      localById.get(serverDoc.id);

    if (serverDoc.remoteKey) {
      seenRemoteKeys.add(serverDoc.remoteKey);
    }

    if (!localMatch) {
      merged.push(serverDoc);
      continue;
    }

    seenLocalIds.add(localMatch.id);

    merged.push({
      ...serverDoc,
      id: localMatch.id,
      localUri: localMatch.localUri,
      localThumbUri: localMatch.localThumbUri,
      offlineState: localMatch.localUri ? 'available_offline' : 'online_only',
      backupState: 'backed_up',
      lastError: undefined,
    });
  }

  const localUnsynced = localDocuments.filter((local) => {
    if (seenLocalIds.has(local.id)) return false;
    if (!local.remoteKey) return true;
    if (local.backupState !== 'backed_up') return true;

    // Keep locally cached files even if the server read is temporarily stale.
    return Boolean(local.localUri || local.localThumbUri);
  });

  const staleBackedUpLocalDocs = localDocuments.filter((local) => {
    if (seenLocalIds.has(local.id)) return false;
    if (!local.remoteKey) return false;
    if (local.backupState !== 'backed_up') return false;
    if (local.localUri || local.localThumbUri) return false;
    return !seenRemoteKeys.has(local.remoteKey);
  });

  const next = [...merged, ...localUnsynced].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );

  await upsertDocuments(next);

  for (const stale of staleBackedUpLocalDocs) {
    await deleteDocumentById(stale.id);
  }

  return next;
}
