import { runInLedgerTransaction } from '../db';
import { enqueueOutbox, insertOp } from '../internal/ops.mutate';
import { insertTask, updateTask } from '../internal/tasks.mutate';
import { getOpById } from '../queries/ops.read';
import { getLocalDayFromIso } from '../utils/device';
import { runAutomationForOp } from './automationService';
import type { MutableEntityType, OpType, TaskPatch } from '../types';

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

export async function applyOp(op: OpInput): Promise<{ resultVersion: number }> {
  const existingOp = await getOpById(op.opId);
  if (existingOp) {
    return { resultVersion: existingOp.resultVersion };
  }

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

    if (op.entityType === 'task') {
      if (op.opType === 'create' || op.opType === 'automation') {
        const inserted = insertTask(state, {
          id: op.entityId,
          title: typeof effectivePatch.title === 'string' ? effectivePatch.title : 'Untitled task',
          description:
            typeof effectivePatch.description === 'string' ? effectivePatch.description : null,
          priority:
            effectivePatch.priority === 'low' ||
            effectivePatch.priority === 'medium' ||
            effectivePatch.priority === 'high' ||
            effectivePatch.priority === 'urgent'
              ? effectivePatch.priority
              : 'medium',
          status:
            effectivePatch.status === 'pending' ||
            effectivePatch.status === 'in_progress' ||
            effectivePatch.status === 'completed' ||
            effectivePatch.status === 'cancelled'
              ? effectivePatch.status
              : 'pending',
          dueDate: typeof effectivePatch.dueDate === 'string' ? effectivePatch.dueDate : null,
          patientId:
            typeof effectivePatch.patientId === 'string' ? effectivePatch.patientId : null,
          patientName:
            typeof effectivePatch.patientName === 'string' ? effectivePatch.patientName : null,
          assigneeId:
            typeof effectivePatch.assigneeId === 'string' ? effectivePatch.assigneeId : null,
          assigneeName:
            typeof effectivePatch.assigneeName === 'string' ? effectivePatch.assigneeName : null,
          departmentId:
            typeof effectivePatch.departmentId === 'string' ? effectivePatch.departmentId : null,
          completedAt:
            typeof effectivePatch.completedAt === 'string' ? effectivePatch.completedAt : null,
          sortOrder:
            typeof effectivePatch.sortOrder === 'number' ? effectivePatch.sortOrder : undefined,
          origin:
            effectivePatch.origin === 'automation' || effectivePatch.origin === 'manual'
              ? effectivePatch.origin
              : 'manual',
          originKey:
            typeof effectivePatch.originKey === 'string' ? effectivePatch.originKey : null,
          createdAt,
          updatedAt: createdAt,
          updatedBy: op.actorId ?? null,
          deletedAt: effectivePatch.deletedAt ?? null,
        });
        nextVersion = inserted.version;
      } else {
        const updated = updateTask(state, {
          id: op.entityId,
          baseVersion: op.baseVersion,
          patch: effectivePatch,
          actorId: op.actorId ?? null,
          updatedAt: createdAt,
        });
        nextVersion = updated.version;
      }
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
