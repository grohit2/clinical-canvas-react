import { Platform } from 'react-native';
import type {
  BackupState,
  DocCategory,
  DocumentItem,
  FolderSummary,
  OfflineState,
  SyncActionType,
  SyncQueueItem,
} from '../../core/types';

type SQLiteDatabase = {
  execAsync: (sql: string) => Promise<void>;
  getAllAsync: <T>(sql: string, params?: Array<string | number | null>) => Promise<T[]>;
  getFirstAsync: <T>(sql: string, params?: Array<string | number | null>) => Promise<T | null>;
  runAsync: (sql: string, params?: Array<string | number | null>) => Promise<unknown>;
  withTransactionAsync: (task: () => Promise<void>) => Promise<void>;
};

let dbPromise: Promise<SQLiteDatabase> | null = null;
let sqliteModule: (typeof import('expo-sqlite')) | null = null;

// Web fallback: keeps local behavior for browser development without native SQLite.
const webDocs = new Map<string, DocumentItem>();
let webQueue: SyncQueueItem[] = [];
let nextWebQueueId = 1;

function sortByUploadedAtDesc(a: DocumentItem, b: DocumentItem): number {
  return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
}

function webPatientDocs(patientId: string): DocumentItem[] {
  return Array.from(webDocs.values())
    .filter((item) => item.patientId === patientId)
    .sort(sortByUploadedAtDesc);
}

async function getDb(): Promise<SQLiteDatabase> {
  if (Platform.OS === 'web') {
    throw new Error('SQLite database unavailable on web fallback');
  }

  if (!sqliteModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    sqliteModule = require('expo-sqlite') as typeof import('expo-sqlite');
  }

  if (!dbPromise) {
    dbPromise = sqliteModule.openDatabaseAsync('clinical_canvas.db') as unknown as Promise<SQLiteDatabase>;
  }

  return dbPromise;
}

export async function initDocumentsDb(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  const db = await getDb();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY NOT NULL,
      patient_id TEXT NOT NULL,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      content_type TEXT,
      is_image INTEGER NOT NULL,
      size INTEGER,

      remote_key TEXT,
      file_url TEXT,
      thumb_url TEXT,

      local_uri TEXT,
      local_thumb_uri TEXT,

      backup_state TEXT NOT NULL,
      offline_state TEXT NOT NULL,
      last_error TEXT,

      geo_lat REAL,
      geo_lng REAL,
      geo_address TEXT,
      geo_captured_at TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_documents_patient_category
      ON documents(patient_id, category);

    CREATE INDEX IF NOT EXISTS idx_documents_patient_uploaded
      ON documents(patient_id, uploaded_at);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_remote_key
      ON documents(remote_key);

    CREATE TABLE IF NOT EXISTS sync_queue (
      qid INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      doc_id TEXT NOT NULL,
      category TEXT NOT NULL,
      created_at TEXT NOT NULL,
      retry_count INTEGER DEFAULT 0,
      last_error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_sync_queue_created
      ON sync_queue(created_at, qid);
  `);

  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(documents)');
  const colNames = new Set(columns.map((col) => col.name));

  async function addColumnIfMissing(name: string, definition: string) {
    if (colNames.has(name)) return;
    await db.execAsync(`ALTER TABLE documents ADD COLUMN ${name} ${definition}`);
    colNames.add(name);
  }

  await addColumnIfMissing('geo_lat', 'REAL');
  await addColumnIfMissing('geo_lng', 'REAL');
  await addColumnIfMissing('geo_address', 'TEXT');
  await addColumnIfMissing('geo_captured_at', 'TEXT');
}


interface DocumentRow {
  id: string;
  patient_id: string;
  category: DocCategory;
  name: string;
  uploaded_at: string;
  content_type: string | null;
  is_image: number;
  size: number | null;
  remote_key: string | null;
  file_url: string | null;
  thumb_url: string | null;
  local_uri: string | null;
  local_thumb_uri: string | null;
  backup_state: BackupState;
  offline_state: OfflineState;
  last_error: string | null;
}

interface SyncQueueRow {
  qid: number;
  action: SyncActionType;
  patient_id: string;
  doc_id: string;
  category: DocCategory;
  created_at: string;
  retry_count: number;
  last_error: string | null;
}

function rowToDocument(row: DocumentRow): DocumentItem {
  return {
    id: row.id,
    patientId: row.patient_id,
    category: row.category,
    name: row.name,
    uploadedAt: row.uploaded_at,
    contentType: row.content_type || undefined,
    isImage: !!row.is_image,
    size: row.size ?? undefined,
    remoteKey: row.remote_key || undefined,
    fileUrl: row.file_url || undefined,
    thumbUrl: row.thumb_url || undefined,
    localUri: row.local_uri || undefined,
    localThumbUri: row.local_thumb_uri || undefined,
    backupState: row.backup_state,
    offlineState: row.offline_state,
    lastError: row.last_error || undefined,
    geo:
      row.geo_lat !== null && row.geo_lng !== null
        ? {
            latitude: row.geo_lat,
            longitude: row.geo_lng,
            address: row.geo_address || undefined,
            capturedAt: row.geo_captured_at || undefined,
          }
        : undefined,
  };
}

function rowToSyncQueueItem(row: SyncQueueRow): SyncQueueItem {
  return {
    qid: row.qid,
    action: row.action,
    patientId: row.patient_id,
    docId: row.doc_id,
    category: row.category,
    createdAt: row.created_at,
    retryCount: row.retry_count,
    lastError: row.last_error || undefined,
  };
}

export async function listPatientDocuments(patientId: string): Promise<DocumentItem[]> {
  if (Platform.OS === 'web') {
    return webPatientDocs(patientId);
  }

  const db = await getDb();
  const rows = await db.getAllAsync<DocumentRow>(
    `SELECT * FROM documents WHERE patient_id = ? ORDER BY datetime(uploaded_at) DESC`,
    [patientId]
  );
  return rows.map(rowToDocument);
}

export async function listCategoryDocuments(
  patientId: string,
  category: DocCategory
): Promise<DocumentItem[]> {
  if (Platform.OS === 'web') {
    return webPatientDocs(patientId).filter((item) => item.category === category);
  }

  const db = await getDb();
  const rows = await db.getAllAsync<DocumentRow>(
    `SELECT * FROM documents
     WHERE patient_id = ? AND category = ?
     ORDER BY datetime(uploaded_at) DESC`,
    [patientId, category]
  );
  return rows.map(rowToDocument);
}

export async function getDocumentById(docId: string): Promise<DocumentItem | null> {
  if (Platform.OS === 'web') {
    return webDocs.get(docId) || null;
  }

  const db = await getDb();
  const row = await db.getFirstAsync<DocumentRow>('SELECT * FROM documents WHERE id = ?', [docId]);
  return row ? rowToDocument(row) : null;
}

export async function getLocalStateByRemoteKey(patientId: string): Promise<
  Record<
    string,
    {
      id: string;
      localUri?: string;
      localThumbUri?: string;
      backupState: BackupState;
      offlineState: OfflineState;
      lastError?: string;
    }
  >
> {
  if (Platform.OS === 'web') {
    const map: Record<
      string,
      {
        id: string;
        localUri?: string;
        localThumbUri?: string;
        backupState: BackupState;
        offlineState: OfflineState;
        lastError?: string;
      }
    > = {};

    for (const doc of webPatientDocs(patientId)) {
      if (!doc.remoteKey) continue;
      map[doc.remoteKey] = {
        id: doc.id,
        localUri: doc.localUri,
        localThumbUri: doc.localThumbUri,
        backupState: doc.backupState,
        offlineState: doc.offlineState,
        lastError: doc.lastError,
      };
    }

    return map;
  }

  const db = await getDb();
  const rows = await db.getAllAsync<{
    id: string;
    remote_key: string;
    local_uri: string | null;
    local_thumb_uri: string | null;
    backup_state: BackupState;
    offline_state: OfflineState;
    last_error: string | null;
  }>(
    `SELECT id, remote_key, local_uri, local_thumb_uri, backup_state, offline_state, last_error
     FROM documents
     WHERE patient_id = ? AND remote_key IS NOT NULL`,
    [patientId]
  );

  return rows.reduce<
    Record<
      string,
      {
        id: string;
        localUri?: string;
        localThumbUri?: string;
        backupState: BackupState;
        offlineState: OfflineState;
        lastError?: string;
      }
    >
  >((acc, row) => {
    acc[row.remote_key] = {
      id: row.id,
      localUri: row.local_uri || undefined,
      localThumbUri: row.local_thumb_uri || undefined,
      backupState: row.backup_state,
      offlineState: row.offline_state,
      lastError: row.last_error || undefined,
    };
    return acc;
  }, {});
}

export async function listFolderSummaries(patientId: string): Promise<FolderSummary[]> {
  if (Platform.OS === 'web') {
    const docs = webPatientDocs(patientId);
    const byCategory = new Map<DocCategory, FolderSummary>();

    for (const doc of docs) {
      const current = byCategory.get(doc.category);
      if (!current) {
        byCategory.set(doc.category, {
          category: doc.category,
          count: 1,
          lastUpdatedAt: doc.uploadedAt,
          pendingBackupCount: doc.backupState === 'backed_up' ? 0 : 1,
        });
      } else {
        current.count += 1;
        if (doc.backupState !== 'backed_up') current.pendingBackupCount += 1;
        if (!current.lastUpdatedAt || new Date(doc.uploadedAt) > new Date(current.lastUpdatedAt)) {
          current.lastUpdatedAt = doc.uploadedAt;
        }
      }
    }

    return Array.from(byCategory.values());
  }

  const db = await getDb();
  const rows = await db.getAllAsync<{
    category: DocCategory;
    count: number;
    lastUpdatedAt: string | null;
    pendingBackupCount: number;
  }>(
    `SELECT
      category as category,
      COUNT(*) as count,
      MAX(uploaded_at) as lastUpdatedAt,
      SUM(CASE WHEN backup_state != 'backed_up' THEN 1 ELSE 0 END) as pendingBackupCount
     FROM documents
     WHERE patient_id = ?
     GROUP BY category`,
    [patientId]
  );

  return rows.map((row) => ({
    category: row.category,
    count: row.count,
    lastUpdatedAt: row.lastUpdatedAt || undefined,
    pendingBackupCount: row.pendingBackupCount || 0,
  }));
}

function toDbKey(key: keyof Partial<DocumentItem>): string {
  switch (key) {
    case 'patientId':
      return 'patient_id';
    case 'uploadedAt':
      return 'uploaded_at';
    case 'contentType':
      return 'content_type';
    case 'isImage':
      return 'is_image';
    case 'remoteKey':
      return 'remote_key';
    case 'fileUrl':
      return 'file_url';
    case 'thumbUrl':
      return 'thumb_url';
    case 'localUri':
      return 'local_uri';
    case 'localThumbUri':
      return 'local_thumb_uri';
    case 'backupState':
      return 'backup_state';
    case 'offlineState':
      return 'offline_state';
    case 'lastError':
      return 'last_error';
    case 'geo':
      return 'geo';
    default:
      return key;
  }
}

function toDbValue(key: keyof Partial<DocumentItem>, value: unknown): unknown {
  if (key === 'isImage') return value ? 1 : 0;
  return value ?? null;
}

export async function upsertDocuments(items: DocumentItem[]): Promise<void> {
  if (!items.length) return;

  if (Platform.OS === 'web') {
    for (const item of items) {
      webDocs.set(item.id, item);
    }
    return;
  }

  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const item of items) {
      await db.runAsync(
        `INSERT INTO documents (
          id, patient_id, category, name, uploaded_at,
          content_type, is_image, size,
          remote_key, file_url, thumb_url,
          local_uri, local_thumb_uri,
          backup_state, offline_state, last_error,
          geo_lat, geo_lng, geo_address, geo_captured_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          patient_id = excluded.patient_id,
          category = excluded.category,
          name = excluded.name,
          uploaded_at = excluded.uploaded_at,
          content_type = excluded.content_type,
          is_image = excluded.is_image,
          size = excluded.size,
          remote_key = excluded.remote_key,
          file_url = excluded.file_url,
          thumb_url = excluded.thumb_url,
          local_uri = excluded.local_uri,
          local_thumb_uri = excluded.local_thumb_uri,
          backup_state = excluded.backup_state,
          offline_state = excluded.offline_state,
          last_error = excluded.last_error,
          geo_lat = excluded.geo_lat,
          geo_lng = excluded.geo_lng,
          geo_address = excluded.geo_address,
          geo_captured_at = excluded.geo_captured_at`,
        [
          item.id,
          item.patientId,
          item.category,
          item.name,
          item.uploadedAt,
          item.contentType || null,
          item.isImage ? 1 : 0,
          item.size ?? null,
          item.remoteKey || null,
          item.fileUrl || null,
          item.thumbUrl || null,
          item.localUri || null,
          item.localThumbUri || null,
          item.backupState,
          item.offlineState,
          item.lastError || null,
          item.geo?.latitude ?? null,
          item.geo?.longitude ?? null,
          item.geo?.address ?? null,
          item.geo?.capturedAt ?? null,
        ]
      );
    }
  });
}

export async function patchDocument(
  docId: string,
  patch: Partial<DocumentItem>
): Promise<void> {
  const entries = Object.entries(patch) as Array<[keyof DocumentItem, unknown]>;
  if (!entries.length) return;

  if (Platform.OS === 'web') {
    const current = webDocs.get(docId);
    if (!current) return;
    webDocs.set(docId, { ...current, ...patch });
    return;
  }

  const db = await getDb();
  const normalizedEntries: Array<[string, unknown]> = [];

  for (const [key, value] of entries) {
    if (key === 'geo') {
      const geo = value as DocumentItem['geo'];
      normalizedEntries.push(['geo_lat', geo?.latitude ?? null]);
      normalizedEntries.push(['geo_lng', geo?.longitude ?? null]);
      normalizedEntries.push(['geo_address', geo?.address ?? null]);
      normalizedEntries.push(['geo_captured_at', geo?.capturedAt ?? null]);
      continue;
    }

    normalizedEntries.push([toDbKey(key), toDbValue(key, value)]);
  }

  const assignments = normalizedEntries.map(([key]) => `${key} = ?`).join(', ');
  const values = normalizedEntries.map(([, value]) => value as string | number | null);
  const bindValues = [...values, docId] as Array<string | number | null>;

  await db.runAsync(`UPDATE documents SET ${assignments} WHERE id = ?`, bindValues);
}

export async function deleteDocumentById(docId: string): Promise<void> {
  if (Platform.OS === 'web') {
    webDocs.delete(docId);
    webQueue = webQueue.filter((item) => item.docId !== docId);
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM documents WHERE id = ?', [docId]);
}

export async function enqueueSyncAction(args: {
  action: SyncActionType;
  patientId: string;
  docId: string;
  category: DocCategory;
}): Promise<void> {
  if (Platform.OS === 'web') {
    const existing = webQueue.find((item) => item.action === args.action && item.docId === args.docId);
    if (existing) return;

    webQueue.push({
      qid: nextWebQueueId++,
      action: args.action,
      patientId: args.patientId,
      docId: args.docId,
      category: args.category,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    });
    webQueue.sort((a, b) => a.qid - b.qid);
    return;
  }

  const db = await getDb();
  const existing = await db.getFirstAsync<{ qid: number }>(
    'SELECT qid FROM sync_queue WHERE action = ? AND doc_id = ? LIMIT 1',
    [args.action, args.docId]
  );

  if (existing?.qid) return;

  await db.runAsync(
    `INSERT INTO sync_queue (action, patient_id, doc_id, category, created_at, retry_count, last_error)
     VALUES (?, ?, ?, ?, ?, 0, NULL)`,
    [args.action, args.patientId, args.docId, args.category, new Date().toISOString()]
  );
}

export async function dequeueNextSyncAction(): Promise<SyncQueueItem | null> {
  if (Platform.OS === 'web') {
    return webQueue[0] || null;
  }

  const db = await getDb();
  const row = await db.getFirstAsync<SyncQueueRow>(
    `SELECT * FROM sync_queue ORDER BY qid ASC LIMIT 1`
  );
  return row ? rowToSyncQueueItem(row) : null;
}

export async function listSyncQueue(): Promise<SyncQueueItem[]> {
  if (Platform.OS === 'web') {
    return [...webQueue].sort((a, b) => a.qid - b.qid);
  }

  const db = await getDb();
  const rows = await db.getAllAsync<SyncQueueRow>(
    `SELECT * FROM sync_queue ORDER BY qid ASC`
  );
  return rows.map(rowToSyncQueueItem);
}

export async function removeSyncAction(qid: number): Promise<void> {
  if (Platform.OS === 'web') {
    webQueue = webQueue.filter((item) => item.qid !== qid);
    return;
  }

  const db = await getDb();
  await db.runAsync('DELETE FROM sync_queue WHERE qid = ?', [qid]);
}

export async function markSyncActionFailed(
  qid: number,
  lastError: string,
  retryCount: number
): Promise<void> {
  if (Platform.OS === 'web') {
    webQueue = webQueue.map((item) =>
      item.qid === qid ? { ...item, lastError, retryCount } : item
    );
    return;
  }

  const db = await getDb();
  await db.runAsync(
    'UPDATE sync_queue SET last_error = ?, retry_count = ? WHERE qid = ?',
    [lastError, retryCount, qid]
  );
}
