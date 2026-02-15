import { beforeEach, describe, expect, it } from 'vitest';
import { resetLedgerState } from '../db';
import { getOpsForEntity } from '../queries/ops.read';
import { getTaskById } from '../queries/tasks.read';
import { applyOp } from './commandService';
import { undoLastOp, undoOpGroup } from './undoService';

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
    expect(undoOp?.opGroupId).toBeNull();
    expect(undoOp?.revertsOpId).toBe('op_update');
  });

  it('undoOpGroup reverts group in reverse order and returns applied op results', async () => {
    await applyOp({
      opId: 'op_group_create_a',
      entityType: 'task',
      entityId: 'task_group_a',
      opType: 'create',
      actorId: 'actor_group',
      deviceId: 'device_group',
      baseVersion: 0,
      patch: { id: 'task_group_a', title: 'Task A v1' },
      inversePatch: { deletedAt: '2026-02-15T09:00:00.000Z' },
      createdAt: '2026-02-15T09:00:00.000Z',
    });

    await applyOp({
      opId: 'op_group_create_b',
      entityType: 'task',
      entityId: 'task_group_b',
      opType: 'create',
      actorId: 'actor_group',
      deviceId: 'device_group',
      baseVersion: 0,
      patch: { id: 'task_group_b', title: 'Task B v1' },
      inversePatch: { deletedAt: '2026-02-15T09:01:00.000Z' },
      createdAt: '2026-02-15T09:01:00.000Z',
    });

    await applyOp({
      opId: 'op_group_update_a',
      entityType: 'task',
      entityId: 'task_group_a',
      opType: 'update',
      actorId: 'actor_group',
      deviceId: 'device_group',
      baseVersion: 1,
      patch: { title: 'Task A v2' },
      inversePatch: { title: 'Task A v1' },
      opGroupId: 'grp-1',
      createdAt: '2026-02-15T09:02:00.000Z',
    });

    await applyOp({
      opId: 'op_group_update_b',
      entityType: 'task',
      entityId: 'task_group_b',
      opType: 'update',
      actorId: 'actor_group',
      deviceId: 'device_group',
      baseVersion: 1,
      patch: { title: 'Task B v2' },
      inversePatch: { title: 'Task B v1' },
      opGroupId: 'grp-1',
      createdAt: '2026-02-15T09:03:00.000Z',
    });

    const results = await undoOpGroup({
      opGroupId: 'grp-1',
      actorId: 'actor_group',
      deviceId: 'device_group',
    });

    expect(results.map((item) => item.opId)).toEqual(['op_group_update_b', 'op_group_update_a']);

    const taskA = await getTaskById('task_group_a');
    const taskB = await getTaskById('task_group_b');
    expect(taskA?.title).toBe('Task A v1');
    expect(taskB?.title).toBe('Task B v1');
  });

  it('undoes a delete by restoring visibility and clearing deletedAt', async () => {
    await applyOp({
      opId: 'op_create_restore',
      entityType: 'task',
      entityId: 'task_restore',
      opType: 'create',
      actorId: 'actor_restore',
      deviceId: 'device_restore',
      baseVersion: 0,
      patch: { id: 'task_restore', title: 'Recover me' },
      inversePatch: { deletedAt: '2026-02-15T10:00:00.000Z' },
      createdAt: '2026-02-15T10:00:00.000Z',
    });

    await applyOp({
      opId: 'op_delete_restore',
      entityType: 'task',
      entityId: 'task_restore',
      opType: 'delete',
      actorId: 'actor_restore',
      deviceId: 'device_restore',
      baseVersion: 1,
      patch: {},
      inversePatch: {},
      createdAt: '2026-02-15T10:01:00.000Z',
    });

    expect(await getTaskById('task_restore')).toBeNull();

    await undoLastOp({ actorId: 'actor_restore', deviceId: 'device_restore' });

    const restored = await getTaskById('task_restore');
    expect(restored).not.toBeNull();
    expect(restored?.deletedAt).toBeNull();

    const ops = await getOpsForEntity('task', 'task_restore');
    const undoDelete = ops.find((op) => op.revertsOpId === 'op_delete_restore');
    expect(undoDelete).toBeDefined();
  });
});
