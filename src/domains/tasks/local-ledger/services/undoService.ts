import { getTaskById } from '../queries/tasks.read';
import { getLastUndoableOp, getOpsByGroupId } from '../queries/ops.read';
import { ulid } from '../utils/ids';
import { applyOp } from './commandService';
import type { TaskPatch } from '../types';

function parsePatch(json: string): TaskPatch {
  try {
    return JSON.parse(json) as TaskPatch;
  } catch {
    return {};
  }
}

export async function undoLastOp(params: { actorId: string; deviceId: string }) {
  const last = await getLastUndoableOp(params.actorId);
  if (!last) {
    throw new Error('Nothing to undo');
  }

  if (last.entityType !== 'task') {
    throw new Error(`Unsupported entity type for undo: ${last.entityType}`);
  }

  const task = await getTaskById(last.entityId, { includeDeleted: true });
  if (!task) {
    throw new Error('Cannot undo: entity not found');
  }

  return applyOp({
    opId: ulid(),
    opGroupId: null,
    entityType: 'task',
    entityId: last.entityId,
    opType: 'undo',
    actorId: params.actorId,
    deviceId: params.deviceId,
    baseVersion: task.version,
    patch: parsePatch(last.inversePatchJson),
    inversePatch: parsePatch(last.patchJson),
    revertsOpId: last.opId,
    reason: `Undo: ${last.opType} on task ${last.entityId}`,
  });
}

export async function undoOpGroup(params: {
  opGroupId: string;
  actorId: string;
  deviceId: string;
}): Promise<Array<{ resultVersion: number; opId: string }>> {
  const groupOps = await getOpsByGroupId(params.opGroupId);
  const reversed = [...groupOps].reverse();

  const undoGroupId = ulid();
  const results: Array<{ resultVersion: number; opId: string }> = [];

  for (const op of reversed) {
    if (op.entityType !== 'task') {
      continue;
    }

    const task = await getTaskById(op.entityId, { includeDeleted: true });
    if (!task) {
      continue;
    }

    const result = await applyOp({
      opId: ulid(),
      opGroupId: undoGroupId,
      entityType: 'task',
      entityId: op.entityId,
      opType: 'undo',
      actorId: params.actorId,
      deviceId: params.deviceId,
      baseVersion: task.version,
      patch: parsePatch(op.inversePatchJson),
      inversePatch: parsePatch(op.patchJson),
      revertsOpId: op.opId,
      reason: `Group undo: ${op.opType} on task`,
    });

    results.push({ resultVersion: result.resultVersion, opId: op.opId });
  }

  return results;
}
