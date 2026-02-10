export type DocCategory =
  | 'preop_pics'
  | 'lab_reports'
  | 'radiology'
  | 'intraop_pics'
  | 'ot_notes'
  | 'postop_pics'
  | 'discharge_pics';

export type BackupState = 'backed_up' | 'device_only' | 'pending_backup' | 'error';
export type OfflineState = 'available_offline' | 'online_only';

export interface DocumentItem {
  id: string;
  patientId: string;
  category: DocCategory;

  name: string;
  uploadedAt: string;
  contentType?: string;
  isImage: boolean;
  size?: number;

  remoteKey?: string;
  fileUrl?: string;
  thumbUrl?: string;

  localUri?: string;
  localThumbUri?: string;

  backupState: BackupState;
  offlineState: OfflineState;
  lastError?: string;
}

export interface FolderSummary {
  category: DocCategory;
  count: number;
  lastUpdatedAt?: string;
  pendingBackupCount: number;
}

export type SyncActionType = 'upload' | 'delete';

export interface SyncQueueItem {
  qid: number;
  action: SyncActionType;
  patientId: string;
  docId: string;
  category: DocCategory;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

export const DOC_CATEGORIES: DocCategory[] = [
  'preop_pics',
  'lab_reports',
  'radiology',
  'intraop_pics',
  'ot_notes',
  'postop_pics',
  'discharge_pics',
];

export const CATEGORY_LABELS: Record<DocCategory, string> = {
  preop_pics: 'Pre-op',
  lab_reports: 'Lab Reports',
  radiology: 'Radiology',
  intraop_pics: 'Intra-op',
  ot_notes: 'OT Notes',
  postop_pics: 'Post-op',
  discharge_pics: 'Discharge',
};

export const CATEGORY_FULL_LABELS: Record<DocCategory, string> = {
  preop_pics: 'Pre-operative',
  lab_reports: 'Lab Reports',
  radiology: 'Radiology',
  intraop_pics: 'Intra-operative',
  ot_notes: 'OT Notes',
  postop_pics: 'Post-operative',
  discharge_pics: 'Discharge',
};

export function isValidCategory(value: unknown): value is DocCategory {
  return DOC_CATEGORIES.includes(value as DocCategory);
}

export function hasPendingBackup(item: Pick<DocumentItem, 'backupState'>): boolean {
  return item.backupState !== 'backed_up';
}
