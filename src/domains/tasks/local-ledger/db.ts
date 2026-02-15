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

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readLedgerState(): TaskLedgerState {
  if (!canUseLocalStorage()) {
    return cloneState(INITIAL_STATE);
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
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
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
      automationRuns: (parsed.automationRuns ?? []).map((run) => ({
        ...run,
        errorMessage: run.errorMessage ?? null,
      })),
=======
      automationRuns: parsed.automationRuns ?? [],
>>>>>>> theirs
=======
      automationRuns: parsed.automationRuns ?? [],
>>>>>>> theirs
=======
      automationRuns: parsed.automationRuns ?? [],
>>>>>>> theirs
=======
      automationRuns: parsed.automationRuns ?? [],
>>>>>>> theirs
=======
      automationRuns: parsed.automationRuns ?? [],
>>>>>>> theirs
=======
      automationRuns: parsed.automationRuns ?? [],
>>>>>>> theirs
=======
      automationRuns: parsed.automationRuns ?? [],
>>>>>>> theirs
    };
  } catch {
    return cloneState(INITIAL_STATE);
  }
}

export function writeLedgerState(state: TaskLedgerState) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
  writeLedgerState(cloneState(INITIAL_STATE));
}
