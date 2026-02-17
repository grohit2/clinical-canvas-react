import type { TaskLedgerState } from './types';

const LEGACY_JSON_STORAGE_KEY = 'tasks_local_ledger_v1';
const SQLITE_STORAGE_KEY = 'tasks_local_ledger_sqlite_v1';
const SQLITE_STATE_ROW_KEY = 'state';

const INITIAL_STATE: TaskLedgerState = {
  schemaVersion: 1,
  tasks: {},
  ops: [],
  outboxOps: [],
  automationRuns: [],
};

function cloneState<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

type SQLiteStatement = {
  bind: (values?: unknown[] | Record<string, unknown>) => void;
  step: () => boolean;
  get: () => unknown[];
  free: () => void;
};

type SQLiteDatabase = {
  run: (sql: string, params?: unknown[]) => void;
  prepare: (sql: string) => SQLiteStatement;
  export: () => Uint8Array;
};

type SQLiteModule = {
  Database: new (data?: Uint8Array) => SQLiteDatabase;
};

const memoryStorage = new Map<string, string>();

function getStorage(): StorageLike {
  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    return window.localStorage;
  }

  return {
    getItem: (key: string) => memoryStorage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memoryStorage.set(key, value);
    },
    removeItem: (key: string) => {
      memoryStorage.delete(key);
    },
  };
}

function toBase64(bytes: Uint8Array): string {
  if (typeof btoa !== 'function') {
    throw new Error('Base64 encoder is unavailable in this runtime');
  }

  let binary = '';
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  if (typeof atob !== 'function') {
    throw new Error('Base64 decoder is unavailable in this runtime');
  }

  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function normalizeState(parsed: Partial<TaskLedgerState> | null | undefined): TaskLedgerState {
  if (!parsed || parsed.schemaVersion !== 1) {
    return cloneState(INITIAL_STATE);
  }

  return {
    schemaVersion: 1,
    tasks: parsed.tasks ?? {},
    ops: parsed.ops ?? [],
    outboxOps: parsed.outboxOps ?? [],
    automationRuns: (parsed.automationRuns ?? []).map((run) => ({
      ...run,
      errorMessage: run.errorMessage ?? null,
    })),
  };
}

let sqlModulePromise: Promise<SQLiteModule> | null = null;
let databasePromise: Promise<SQLiteDatabase> | null = null;

function isVitestRuntime(): boolean {
  const maybeProcess = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return Boolean(maybeProcess.process?.env?.VITEST);
}

function loadSqlJsFromBrowserScript(): Promise<SQLiteModule> {
  const root = globalThis as {
    initSqlJs?: () => Promise<SQLiteModule>;
    document?: Document;
  };

  if (root.initSqlJs) {
    return root.initSqlJs();
  }

  const doc = root.document;
  if (!doc) {
    throw new Error('Document is unavailable while loading sql.js');
  }

  return new Promise((resolve, reject) => {
    const existing = doc.querySelector('script[data-sqljs="asm"]') as HTMLScriptElement | null;
    const finish = async () => {
      try {
        if (!root.initSqlJs) {
          reject(new Error('sql.js script loaded but initSqlJs is missing'));
          return;
        }
        resolve(await root.initSqlJs());
      } catch (error) {
        reject(error);
      }
    };

    if (existing) {
      if (existing.getAttribute('data-loaded') === 'true') {
        void finish();
      } else {
        existing.addEventListener('load', () => void finish(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load sql.js script')), {
          once: true,
        });
      }
      return;
    }

    const script = doc.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/sql.js@1.13.0/dist/sql-asm.js';
    script.async = true;
    script.setAttribute('data-sqljs', 'asm');
    script.addEventListener(
      'load',
      () => {
        script.setAttribute('data-loaded', 'true');
        void finish();
      },
      { once: true },
    );
    script.addEventListener('error', () => reject(new Error('Failed to load sql.js script')), {
      once: true,
    });
    doc.head.appendChild(script);
  });
}

async function getSqlModule(): Promise<SQLiteModule> {
  if (!sqlModulePromise) {
    if (typeof window !== 'undefined' && typeof document !== 'undefined' && !isVitestRuntime()) {
      sqlModulePromise = loadSqlJsFromBrowserScript();
    } else {
      const sqlAsmSpecifier = 'sql.js/dist/' + 'sql-asm.js';
      sqlModulePromise = import(sqlAsmSpecifier).then(async (mod) => {
        const init = (mod as { default?: () => Promise<SQLiteModule> }).default;
        if (!init) {
          throw new Error('Failed to load sql.js asm module');
        }
        return init();
      });
    }
  }

  return sqlModulePromise;
}

function readStateJsonFromDb(db: SQLiteDatabase): string | null {
  const stmt = db.prepare('SELECT value FROM ledger_state WHERE key = ? LIMIT 1;');

  try {
    stmt.bind([SQLITE_STATE_ROW_KEY]);
    if (!stmt.step()) {
      return null;
    }

    const row = stmt.get();
    const value = row[0];
    return typeof value === 'string' ? value : null;
  } finally {
    stmt.free();
  }
}

function writeStateJsonToDb(db: SQLiteDatabase, json: string) {
  db.run(
    `
      INSERT INTO ledger_state(key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value;
    `,
    [SQLITE_STATE_ROW_KEY, json],
  );
}

function persistDbToStorage(db: SQLiteDatabase) {
  const storage = getStorage();
  const binary = db.export();
  storage.setItem(SQLITE_STORAGE_KEY, toBase64(binary));
}

async function getDatabase(): Promise<SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = (async () => {
      const SQL = await getSqlModule();
      const storage = getStorage();
      const persisted = storage.getItem(SQLITE_STORAGE_KEY);

      let db: SQLiteDatabase;
      if (persisted) {
        try {
          db = new SQL.Database(fromBase64(persisted));
        } catch {
          db = new SQL.Database();
        }
      } else {
        db = new SQL.Database();
      }

      db.run('CREATE TABLE IF NOT EXISTS ledger_state (key TEXT PRIMARY KEY, value TEXT NOT NULL);');

      const existingState = readStateJsonFromDb(db);
      if (!existingState) {
        const legacy = storage.getItem(LEGACY_JSON_STORAGE_KEY);
        let parsedLegacy: Partial<TaskLedgerState> | null = null;

        if (legacy) {
          try {
            parsedLegacy = JSON.parse(legacy) as Partial<TaskLedgerState>;
          } catch {
            parsedLegacy = null;
          }
        }

        const normalized = normalizeState(parsedLegacy ?? INITIAL_STATE);

        writeStateJsonToDb(db, JSON.stringify(normalized));
        persistDbToStorage(db);
      }

      return db;
    })();
  }

  return databasePromise;
}

export async function readLedgerState(): Promise<TaskLedgerState> {
  const db = await getDatabase();
  const raw = readStateJsonFromDb(db);

  if (!raw) {
    return cloneState(INITIAL_STATE);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<TaskLedgerState>;
    return normalizeState(parsed);
  } catch {
    return cloneState(INITIAL_STATE);
  }
}

let persistQueue: Promise<void> = Promise.resolve();

export async function writeLedgerState(state: TaskLedgerState): Promise<void> {
  const db = await getDatabase();
  const payload = JSON.stringify(normalizeState(state));

  writeStateJsonToDb(db, payload);

  persistQueue = persistQueue.then(
    async () => {
      persistDbToStorage(db);
    },
    async () => {
      persistDbToStorage(db);
    },
  );

  await persistQueue;
}

let txQueue: Promise<void> = Promise.resolve();

export async function runInLedgerTransaction<T>(
  fn: (draft: TaskLedgerState) => Promise<T> | T,
): Promise<T> {
  const run = async () => {
    const draft = cloneState(await readLedgerState());
    const result = await fn(draft);
    await writeLedgerState(draft);
    return result;
  };

  const tx = txQueue.then(run, run);
  txQueue = tx.then(
    () => undefined,
    () => undefined,
  );

  return tx;
}

export async function resetLedgerState(): Promise<void> {
  const db = await getDatabase();
  const storage = getStorage();

  writeStateJsonToDb(db, JSON.stringify(cloneState(INITIAL_STATE)));
  storage.removeItem(LEGACY_JSON_STORAGE_KEY);
  persistDbToStorage(db);
}
