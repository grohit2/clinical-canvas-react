import type { TaskLedgerState } from './types';

const STORAGE_KEY = 'tasks_local_ledger_v1';

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

export function readLedgerState(): TaskLedgerState {
  const storage = getStorage();
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return cloneState(INITIAL_STATE);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<TaskLedgerState>;
    if (parsed.schemaVersion !== 1) {
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
  } catch {
    return cloneState(INITIAL_STATE);
  }
}

export function writeLedgerState(state: TaskLedgerState) {
  const storage = getStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let txQueue: Promise<void> = Promise.resolve();

export async function runInLedgerTransaction<T>(
  fn: (draft: TaskLedgerState) => Promise<T> | T,
): Promise<T> {
  const run = async () => {
    const draft = cloneState(readLedgerState());
    const result = await fn(draft);
    writeLedgerState(draft);
    return result;
  };

  const tx = txQueue.then(run, run);
  txQueue = tx.then(
    () => undefined,
    () => undefined,
  );

  return tx;
}

export function resetLedgerState() {
  const storage = getStorage();
  storage.removeItem(STORAGE_KEY);
  writeLedgerState(cloneState(INITIAL_STATE));
}
