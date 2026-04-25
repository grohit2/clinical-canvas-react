import { DOC_CATEGORIES } from './categories';
import {
  type BackupState,
  type DocCategory,
  type DocumentItem,
  type FolderSummary,
  type OfflineState,
  type SortOrder,
} from './types';
import { filenameFromKey, isImageByMimeOrExt } from './utils';

export interface ApiDocument {
  key?: string;
  id?: string;
  name?: string;
  title?: string;
  caption?: string;
  cdnUrl?: string | null;
  url?: string | null;
  thumbUrl?: string | null;
  thumbnailUrl?: string | null;
  uploadedAt?: string;
  createdAt?: string;
  date?: string;
  timestamp?: string;
  mimeType?: string | null;
  size?: number | null;
  uploadedBy?: string | null;
  version?: number;
  isShared?: boolean;
}

export interface ApiDocumentsProfile {
  preopPics?: ApiDocument[];
  labReports?: ApiDocument[];
  radiology?: ApiDocument[];
  intraopPics?: ApiDocument[];
  otNotes?: ApiDocument[];
  postopPics?: ApiDocument[];
  dischargePics?: ApiDocument[];
  unorganized?: ApiDocument[];
}

export type LocalStateByRemoteKey = Record<
  string,
  {
    id?: string;
    localUri?: string;
    localThumbUri?: string;
    geo?: DocumentItem['geo'];
    backupState?: BackupState;
    offlineState?: OfflineState;
    lastError?: string;
  }
>;

function normalizeUploadedAt(raw: ApiDocument): string {
  return raw.uploadedAt || raw.createdAt || raw.date || raw.timestamp || new Date().toISOString();
}

function makeStableDocId(patientId: string, category: DocCategory, key?: string, uploadedAt?: string): string {
  if (key) return `${patientId}:${category}:${key}`;
  return `${patientId}:${category}:${uploadedAt || new Date().toISOString()}`;
}

const CATEGORY_PROFILE_MAP: Record<DocCategory, keyof ApiDocumentsProfile> = {
  preop_pics: 'preopPics',
  lab_reports: 'labReports',
  radiology: 'radiology',
  intraop_pics: 'intraopPics',
  ot_notes: 'otNotes',
  postop_pics: 'postopPics',
  discharge_pics: 'dischargePics',
  unorganized: 'unorganized',
};

function sortByUploadedAt(items: DocumentItem[], sortOrder: SortOrder): DocumentItem[] {
  return [...items].sort((a, b) => {
    const ta = new Date(a.uploadedAt).getTime();
    const tb = new Date(b.uploadedAt).getTime();
    return sortOrder === 'asc' ? ta - tb : tb - ta;
  });
}

export function mapDocumentFromApi(
  patientId: string,
  raw: ApiDocument,
  category: DocCategory,
  localStateByRemoteKey?: LocalStateByRemoteKey
): DocumentItem {
  const uploadedAt = normalizeUploadedAt(raw);
  const remoteKey = raw.key ?? raw.id;
  const fileUrl = raw.cdnUrl || raw.url || undefined;
  const name = raw.name || raw.title || raw.caption || filenameFromKey(remoteKey);
  const contentType = raw.mimeType || undefined;
  const isImage = isImageByMimeOrExt(contentType, name);
  const thumbUrl = raw.thumbUrl || raw.thumbnailUrl || (isImage ? fileUrl : undefined);
  const localState = remoteKey ? localStateByRemoteKey?.[remoteKey] : undefined;

  return {
    id: localState?.id || makeStableDocId(patientId, category, remoteKey, uploadedAt),
    patientId,
    category,
    name,
    uploadedAt,
    contentType,
    isImage,
    size: raw.size ?? undefined,
    remoteKey,
    fileUrl,
    thumbUrl,
    localUri: localState?.localUri,
    localThumbUri: localState?.localThumbUri,
    geo: localState?.geo,
    backupState: localState?.backupState ?? 'backed_up',
    offlineState: localState?.offlineState ?? 'online_only',
    lastError: localState?.lastError,
    uploaderName: raw.uploadedBy || undefined,
    isShared: raw.isShared,
    version: raw.version,
  };
}

export function mapCategoryDocumentsFromApi(
  patientId: string,
  profile: ApiDocumentsProfile,
  category: DocCategory,
  localStateByRemoteKey?: LocalStateByRemoteKey,
  sortOrder: SortOrder = 'desc'
): DocumentItem[] {
  const key = CATEGORY_PROFILE_MAP[category];
  const rawDocs = (profile[key] || []) as ApiDocument[];

  const items = rawDocs.map((raw) =>
    mapDocumentFromApi(patientId, raw, category, localStateByRemoteKey)
  );

  return sortByUploadedAt(items, sortOrder);
}

export function mapAllDocumentsFromApi(
  patientId: string,
  profile: ApiDocumentsProfile,
  localStateByRemoteKey?: LocalStateByRemoteKey,
  sortOrder: SortOrder = 'desc'
): DocumentItem[] {
  const items = DOC_CATEGORIES.flatMap((category) =>
    mapCategoryDocumentsFromApi(patientId, profile, category, localStateByRemoteKey, sortOrder)
  );

  return sortByUploadedAt(items, sortOrder);
}

export function mapFolderSummariesFromDocuments(items: DocumentItem[]): FolderSummary[] {
  return DOC_CATEGORIES.map((category) => {
    const docs = items
      .filter((item) => item.category === category)
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

    return {
      category,
      count: docs.length,
      lastUpdatedAt: docs[0]?.uploadedAt,
      pendingBackupCount: docs.filter((doc) => doc.backupState !== 'backed_up').length,
    };
  });
}

export function mapFolderSummariesFromApi(
  patientId: string,
  profile: ApiDocumentsProfile,
  localStateByRemoteKey?: LocalStateByRemoteKey
): FolderSummary[] {
  const documents = mapAllDocumentsFromApi(patientId, profile, localStateByRemoteKey, 'desc');
  return mapFolderSummariesFromDocuments(documents);
}
