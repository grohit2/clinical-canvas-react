import type {
  BackupState,
  DocCategory,
  DocumentItem,
  FolderSummary,
  OfflineState,
} from './types';

export interface ApiDocument {
  key?: string;
  id?: string;
  name?: string;
  title?: string;
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
}

export interface ApiDocumentsProfile {
  preopPics?: ApiDocument[];
  labReports?: ApiDocument[];
  radiology?: ApiDocument[];
  intraopPics?: ApiDocument[];
  otNotes?: ApiDocument[];
  postopPics?: ApiDocument[];
  dischargePics?: ApiDocument[];
}

export type LocalStateByRemoteKey = Record<
  string,
  {
    id?: string;
    localUri?: string;
    localThumbUri?: string;
    backupState?: BackupState;
    offlineState?: OfflineState;
    lastError?: string;
  }
>;

function filenameFromKey(key?: string): string {
  if (!key) return 'file';
  const parts = key.split('/');
  return parts[parts.length - 1] || 'file';
}

function isImageByMimeOrExt(mime?: string, name?: string): boolean {
  if (mime?.startsWith('image/')) return true;
  const ext = name?.split('.').pop()?.toLowerCase() ?? '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif'].includes(ext);
}

function normalizeUploadedAt(raw: ApiDocument): string {
  return raw.uploadedAt || raw.createdAt || raw.date || raw.timestamp || new Date().toISOString();
}

function makeStableDocId(patientId: string, category: DocCategory, key?: string, uploadedAt?: string): string {
  if (key) return `${patientId}:${category}:${key}`;
  return `${patientId}:${category}:${uploadedAt || new Date().toISOString()}`;
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
  const thumbUrl = raw.thumbUrl || raw.thumbnailUrl || fileUrl;
  const name = raw.name || raw.title || filenameFromKey(remoteKey);
  const contentType = raw.mimeType || undefined;
  const isImage = isImageByMimeOrExt(contentType, name);
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
    backupState: 'backed_up',
    offlineState: localState?.offlineState || 'online_only',
    lastError: localState?.lastError,
  };
}

const CATEGORY_PROFILE_MAP: Record<DocCategory, keyof ApiDocumentsProfile> = {
  preop_pics: 'preopPics',
  lab_reports: 'labReports',
  radiology: 'radiology',
  intraop_pics: 'intraopPics',
  ot_notes: 'otNotes',
  postop_pics: 'postopPics',
  discharge_pics: 'dischargePics',
};

export function mapCategoryDocumentsFromApi(
  patientId: string,
  profile: ApiDocumentsProfile,
  category: DocCategory,
  localStateByRemoteKey?: LocalStateByRemoteKey
): DocumentItem[] {
  const key = CATEGORY_PROFILE_MAP[category];
  const rawDocs = (profile[key] || []) as ApiDocument[];

  return rawDocs
    .map((raw) => mapDocumentFromApi(patientId, raw, category, localStateByRemoteKey))
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
}

export function mapAllDocumentsFromApi(
  patientId: string,
  profile: ApiDocumentsProfile,
  localStateByRemoteKey?: LocalStateByRemoteKey
): DocumentItem[] {
  const categories: DocCategory[] = [
    'preop_pics',
    'lab_reports',
    'radiology',
    'intraop_pics',
    'ot_notes',
    'postop_pics',
    'discharge_pics',
  ];

  const items = categories.flatMap((category) =>
    mapCategoryDocumentsFromApi(patientId, profile, category, localStateByRemoteKey)
  );

  items.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  return items;
}

export function mapFolderSummariesFromDocuments(items: DocumentItem[]): FolderSummary[] {
  const categories: DocCategory[] = [
    'preop_pics',
    'lab_reports',
    'radiology',
    'intraop_pics',
    'ot_notes',
    'postop_pics',
    'discharge_pics',
  ];

  return categories.map((category) => {
    const docs = items.filter((item) => item.category === category);
    return {
      category,
      count: docs.length,
      lastUpdatedAt: docs[0]?.uploadedAt,
      pendingBackupCount: docs.filter((doc) => doc.backupState !== 'backed_up').length,
    };
  });
}
