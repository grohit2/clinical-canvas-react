import { beforeEach, describe, expect, it } from 'vitest';
import { resetLedgerState } from '../db';
import { getOpsForEntity } from '../queries/ops.read';
import { getTaskById } from '../queries/tasks.read';
import { applyOp } from './commandService';
import { undoLastOp } from './undoService';

describe('undoService', () => {
  beforeEach(() => {
    resetLedgerState();
  });

  it('creates standalone undo op and restores previous value', async () => {
    await applyOp({
      opId: 'op_create',
      entityType: 'task',
      entityId: 'task_undo',
      opType: 'create',
      actorId: 'actor_undo',
      deviceId: 'device_undo',
      baseVersion: 0,
      patch: { id: 'task_undo', title: 'Original title' },
      inversePatch: { deletedAt: '2026-02-15T08:00:00.000Z' },
      createdAt: '2026-02-15T08:00:00.000Z',
    });

    await applyOp({
      opId: 'op_update',
      entityType: 'task',
      entityId: 'task_undo',
      opType: 'update',
      actorId: 'actor_undo',
      deviceId: 'device_undo',
      baseVersion: 1,
      patch: { title: 'Changed title' },
      inversePatch: { title: 'Original title' },
      opGroupId: 'group_1',
      createdAt: '2026-02-15T08:01:00.000Z',
    });

    await undoLastOp({ actorId: 'actor_undo', deviceId: 'device_undo' });

    const task = await getTaskById('task_undo');
    expect(task?.title).toBe('Original title');

    const ops = await getOpsForEntity('task', 'task_undo');
    const undoOp = ops.find((op) => op.opType === 'undo');
    expect(undoOp).toBeDefined();
    if (!undoOp) {
      return;
    }
    expect(undoOp.opType).toBe('undo');
    expect(undoOp.opGroupId).toBeNull();
    expect(undoOp.revertsOpId).toBe('op_update');
  });
});
