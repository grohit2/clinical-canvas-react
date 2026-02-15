import type { AutomationRunRow, TaskLedgerState, TaskOpRow } from '../types';

export function insertOp(state: TaskLedgerState, row: TaskOpRow): void {
  state.ops.push(row);
}

export function enqueueOutbox(state: TaskLedgerState, opId: string): void {
  const exists = state.outboxOps.some((item) => item.opId === opId);
  if (exists) {
    return;
  }

  state.outboxOps.push({ opId, status: 'pending' });
}

export function tryInsertAutomationRun(
  state: TaskLedgerState,
  run: AutomationRunRow,
): boolean {
  const exists = state.automationRuns.some(
    (row) => row.ruleId === run.ruleId && row.triggerOpId === run.triggerOpId,
  );

  if (exists) {
    return false;
  }

  state.automationRuns.push(run);
  return true;
}

export function updateAutomationRunOpsCreated(
  state: TaskLedgerState,
  runId: string,
  opsCreated: number,
): void {
  const idx = state.automationRuns.findIndex((row) => row.id === runId);
  if (idx === -1) {
    return;
  }

  state.automationRuns[idx] = {
    ...state.automationRuns[idx],
    opsCreated,
  };
}
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours

export function updateAutomationRunStatus(
  state: TaskLedgerState,
  runId: string,
  status: AutomationRunRow['status'],
  errorMessage: string | null,
): void {
  const idx = state.automationRuns.findIndex((row) => row.id === runId);
  if (idx === -1) {
    return;
  }

  state.automationRuns[idx] = {
    ...state.automationRuns[idx],
    status,
    errorMessage,
  };
}
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
=======
>>>>>>> theirs
