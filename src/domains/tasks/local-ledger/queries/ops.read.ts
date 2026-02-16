import { readLedgerState } from '../db';
import type { MutableEntityType, TaskOpRow } from '../types';

function descByCreatedAt(a: TaskOpRow, b: TaskOpRow): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

export async function getOpById(opId: string): Promise<TaskOpRow | null> {
  const state = readLedgerState();
  return state.ops.find((op) => op.opId === opId) ?? null;
}

export async function getOpsForEntity(
  entityType: MutableEntityType,
  entityId: string,
  limit = 200,
): Promise<TaskOpRow[]> {
  const state = readLedgerState();
  return state.ops
    .filter((op) => op.entityType === entityType && op.entityId === entityId)
    .sort(descByCreatedAt)
    .slice(0, limit);
}

export async function getOpsForActorDay(actorId: string, dayLocal: string): Promise<TaskOpRow[]> {
  const state = readLedgerState();
  return state.ops
    .filter((op) => op.actorId === actorId && op.createdDayLocal === dayLocal)
    .sort(descByCreatedAt)
    .slice(0, 500);
}

export async function countOpsForActorDay(actorId: string, dayLocal: string): Promise<number> {
  const rows = await getOpsForActorDay(actorId, dayLocal);
  return rows.length;
}

export async function getLastUndoableOp(actorId?: string): Promise<TaskOpRow | null> {
  const state = readLedgerState();

  const filtered = state.ops
    .filter((op) => op.opType !== 'undo' && op.opType !== 'automation')
    .filter((op) => (actorId ? op.actorId === actorId : true))
    .sort(descByCreatedAt);

  return filtered[0] ?? null;
}

export async function getOpsByGroupId(opGroupId: string): Promise<TaskOpRow[]> {
  const state = readLedgerState();
  return state.ops
    .filter((op) => op.opGroupId === opGroupId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function hasAutomationRun(ruleId: string, triggerOpId: string): Promise<boolean> {
  const state = readLedgerState();
  return state.automationRuns.some(
    (row) => row.ruleId === ruleId && row.triggerOpId === triggerOpId,
  );
}
