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

  uploaderName?: string;
  isShared?: boolean;
  version?: number;
}

export interface FolderSummary {
  category: DocCategory;
  count: number;
  lastUpdatedAt?: string;
  pendingBackupCount: number;
}

export type SortOrder = 'asc' | 'desc';

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

export function hasPendingBackup(item: Pick<DocumentItem, 'backupState'>): boolean {
  return item.backupState !== 'backed_up';
}
