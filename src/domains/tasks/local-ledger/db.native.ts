import type { TaskLedgerState } from './types';

const SQLITE_DB_NAME = 'tasks_local_ledger.db';
const SQLITE_STATE_TABLE = 'ledger_state';
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

type SQLiteDatabase = {
  execAsync: (sql: string) => Promise<void>;
  runAsync: (sql: string, params?: unknown[]) => Promise<unknown>;
  getFirstAsync: <T>(sql: string, params?: unknown[]) => Promise<T | null>;
};

type SQLiteModule = {
  openDatabaseAsync: (name: string) => Promise<SQLiteDatabase>;
};

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

let dbPromise: Promise<SQLiteDatabase> | null = null;
let initPromise: Promise<void> | null = null;

async function getSQLiteModule(): Promise<SQLiteModule> {
  const mod = (await import('expo-sqlite')) as SQLiteModule;
  if (!mod || typeof mod.openDatabaseAsync !== 'function') {
    throw new Error('expo-sqlite openDatabaseAsync is unavailable');
  }
  return mod;
}

async function readStateJsonFromDb(db: SQLiteDatabase): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM ${SQLITE_STATE_TABLE} WHERE key = ? LIMIT 1;`,
    [SQLITE_STATE_ROW_KEY],
  );

  if (!row || typeof row.value !== 'string') {
    return null;
  }

  return row.value;
}

async function writeStateJsonToDb(db: SQLiteDatabase, json: string): Promise<void> {
  await db.runAsync(
    `
      INSERT INTO ${SQLITE_STATE_TABLE}(key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value;
    `,
    [SQLITE_STATE_ROW_KEY, json],
  );
}

async function getDatabase(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const sqlite = await getSQLiteModule();
      return sqlite.openDatabaseAsync(SQLITE_DB_NAME);
    })();
  }

  const db = await dbPromise;

  if (!initPromise) {
    initPromise = (async () => {
      await db.execAsync(
        `CREATE TABLE IF NOT EXISTS ${SQLITE_STATE_TABLE} (key TEXT PRIMARY KEY, value TEXT NOT NULL);`,
      );

      const existing = await readStateJsonFromDb(db);
      if (!existing) {
        await writeStateJsonToDb(db, JSON.stringify(cloneState(INITIAL_STATE)));
      }
    })();
  }

  await initPromise;
  return db;
}

export async function readLedgerState(): Promise<TaskLedgerState> {
  const db = await getDatabase();
  const raw = await readStateJsonFromDb(db);

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

export async function writeLedgerState(state: TaskLedgerState): Promise<void> {
  const db = await getDatabase();
  const payload = JSON.stringify(normalizeState(state));
  await writeStateJsonToDb(db, payload);
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
  await writeStateJsonToDb(db, JSON.stringify(cloneState(INITIAL_STATE)));
}
