import { runInLedgerTransaction } from '../db';
import { enqueueOutbox, insertOp } from '../internal/ops.mutate';
import { insertTask, updateTask } from '../internal/tasks.mutate';
import { getOpById } from '../queries/ops.read';
import { getLocalDayFromIso } from '../utils/device';
import { runAutomationForOp } from './automationService';
import type {
  MutableEntityType,
  OpType,
  TaskCreateInput,
  TaskEntity,
  TaskPatch,
} from '../types';

export interface OpInput {
  opId: string;
  opGroupId?: string | null;
  entityType: MutableEntityType;
  entityId: string;
  opType: OpType;
  actorId?: string | null;
  deviceId: string;
  baseVersion: number;
  patch: TaskPatch;
  inversePatch: TaskPatch;
  revertsOpId?: string | null;
  causedByOpId?: string | null;
  reason?: string | null;
  createdAt?: string;
}

function assertSupportedEntity(entityType: MutableEntityType): asserts entityType is 'task' {
  if (entityType !== 'task') {
    throw new Error(`Unsupported entity type: ${entityType}`);
  }
}

function isTaskPriority(value: unknown): value is TaskEntity['priority'] {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'urgent';
}

function isTaskStatus(value: unknown): value is TaskEntity['status'] {
  return (
    value === 'pending' ||
    value === 'in_progress' ||
    value === 'completed' ||
    value === 'cancelled'
  );
}

function toNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function toTaskCreateInput(
  op: OpInput,
  effectivePatch: TaskPatch,
  createdAt: string,
): TaskCreateInput {
  return {
    id: op.entityId,
    title: typeof effectivePatch.title === 'string' ? effectivePatch.title : 'Untitled task',
    description:
      typeof effectivePatch.description === 'string' ? effectivePatch.description : null,
    priority: isTaskPriority(effectivePatch.priority) ? effectivePatch.priority : 'medium',
    status: isTaskStatus(effectivePatch.status) ? effectivePatch.status : 'pending',
    dueDate: toNullableString(effectivePatch.dueDate),
    patientId: toNullableString(effectivePatch.patientId),
    patientName: toNullableString(effectivePatch.patientName),
    assigneeId: toNullableString(effectivePatch.assigneeId),
    assigneeName: toNullableString(effectivePatch.assigneeName),
    departmentId: toNullableString(effectivePatch.departmentId),
    completedAt: toNullableString(effectivePatch.completedAt),
    sortOrder: typeof effectivePatch.sortOrder === 'number' ? effectivePatch.sortOrder : undefined,
    origin:
      effectivePatch.origin === 'automation' || effectivePatch.origin === 'manual'
        ? effectivePatch.origin
        : 'manual',
    originKey: toNullableString(effectivePatch.originKey),
    createdAt,
    updatedAt: createdAt,
    updatedBy: op.actorId ?? null,
    deletedAt: effectivePatch.deletedAt ?? null,
  };
}

export async function applyOp(op: OpInput): Promise<{ resultVersion: number }> {
  const existingOp = await getOpById(op.opId);
  if (existingOp) {
    return { resultVersion: existingOp.resultVersion };
  }

  assertSupportedEntity(op.entityType);

  const createdAt = op.createdAt ?? new Date().toISOString();
  const createdDayLocal = getLocalDayFromIso(createdAt);

  let effectivePatch: TaskPatch = { ...op.patch };
  let effectiveInverse: TaskPatch = { ...op.inversePatch };

  if (op.opType === 'delete') {
    effectivePatch = {
      ...effectivePatch,
      deletedAt: createdAt,
    };
    effectiveInverse = {
      ...effectiveInverse,
      deletedAt: null,
    };
  }

  if (op.opType === 'create' || op.opType === 'automation') {
    effectivePatch = {
      ...effectivePatch,
      deletedAt: null,
    };
  }

  const { resultVersion } = await runInLedgerTransaction(async (state) => {
    const alreadyApplied = state.ops.find((row) => row.opId === op.opId);
    if (alreadyApplied) {
      return { resultVersion: alreadyApplied.resultVersion };
    }

    let nextVersion = op.baseVersion + 1;

    if (op.opType === 'create' || op.opType === 'automation') {
      const inserted = insertTask(state, toTaskCreateInput(op, effectivePatch, createdAt));
      nextVersion = inserted.version;
    } else {
      const updated = updateTask(state, {
        id: op.entityId,
        baseVersion: op.baseVersion,
        patch: effectivePatch,
        actorId: op.actorId ?? null,
        updatedAt: createdAt,
        allowDeletedTarget: op.opType === 'undo',
      });
      nextVersion = updated.version;
    }

    insertOp(state, {
      opId: op.opId,
      opGroupId: op.opGroupId ?? null,
      entityType: op.entityType,
      entityId: op.entityId,
      opType: op.opType,
      actorId: op.actorId ?? null,
      deviceId: op.deviceId,
      baseVersion: op.baseVersion,
      resultVersion: nextVersion,
      patchJson: JSON.stringify(effectivePatch),
      inversePatchJson: JSON.stringify(effectiveInverse),
      revertsOpId: op.revertsOpId ?? null,
      causedByOpId: op.causedByOpId ?? null,
      reason: op.reason ?? null,
      createdAt,
      createdDayLocal,
    });

    enqueueOutbox(state, op.opId);

    return { resultVersion: nextVersion };
  });

  try {
    await runAutomationForOp({
      ...op,
      patch: effectivePatch,
      inversePatch: effectiveInverse,
      resultVersion,
      createdAt,
    });
  } catch (error) {
    console.error('Task automation failed after commit', error);
  }

  return { resultVersion };
}

export async function applyOpsBatch(ops: OpInput[]): Promise<Array<{ resultVersion: number }>> {
  const out: Array<{ resultVersion: number }> = [];
  for (const op of ops) {
    out.push(await applyOp(op));
  }
  return out;
}
