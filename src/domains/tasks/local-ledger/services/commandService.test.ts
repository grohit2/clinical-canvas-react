import { beforeEach, describe, expect, it } from 'vitest';
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
import { readLedgerState, resetLedgerState } from '../db';
=======
import { resetLedgerState } from '../db';
>>>>>>> theirs
=======
import { resetLedgerState } from '../db';
>>>>>>> theirs
=======
import { resetLedgerState } from '../db';
>>>>>>> theirs
=======
import { resetLedgerState } from '../db';
>>>>>>> theirs
=======
import { resetLedgerState } from '../db';
>>>>>>> theirs
import { getOpById, getOpsForActorDay, getOpsForEntity } from '../queries/ops.read';
import { getTaskById } from '../queries/tasks.read';
import { getLocalDayFromIso } from '../utils/device';
import { applyOp } from './commandService';

describe('applyOp', () => {
  beforeEach(() => {
    resetLedgerState();
  });

  it('creates task snapshot + ops row + outbox idempotently', async () => {
    const op = {
      opId: 'op_create_1',
      entityType: 'task' as const,
      entityId: 'task_1',
      opType: 'create' as const,
      actorId: 'actor_1',
      deviceId: 'device_1',
      baseVersion: 0,
      patch: {
        id: 'task_1',
        title: 'Admission vitals',
        description: '',
        priority: 'high' as const,
        status: 'pending' as const,
        dueDate: null,
      },
      inversePatch: {
        deletedAt: '2026-02-15T00:00:00.000Z',
      },
      createdAt: '2026-02-15T00:00:00.000Z',
    };

    const first = await applyOp(op);
    const second = await applyOp(op);

    expect(first.resultVersion).toBe(1);
    expect(second.resultVersion).toBe(1);

    const task = await getTaskById('task_1');
    expect(task?.title).toBe('Admission vitals');
    expect(task?.version).toBe(1);

    const opRow = await getOpById('op_create_1');
    expect(opRow).not.toBeNull();

    const entityOps = await getOpsForEntity('task', 'task_1');
    expect(entityOps).toHaveLength(1);
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours

    const state = readLedgerState();
    expect(state.outboxOps).toHaveLength(1);
    expect(state.outboxOps[0].status).toBe('pending');
  });

  it('rejects unsupported entity types without writing ledger rows', async () => {
    await expect(
      applyOp({
        opId: 'op_patient_1',
        entityType: 'patient',
        entityId: 'patient_1',
        opType: 'create',
        actorId: 'actor_1',
        deviceId: 'device_1',
        baseVersion: 0,
        patch: { id: 'patient_1' },
        inversePatch: {},
      }),
    ).rejects.toThrow('Unsupported entity type: patient');

    const opRow = await getOpById('op_patient_1');
    expect(opRow).toBeNull();
    expect(readLedgerState().outboxOps).toHaveLength(0);
  });

  it('throws version conflict when baseVersion is stale', async () => {
    await applyOp({
      opId: 'op_create_conflict',
      entityType: 'task',
      entityId: 'task_conflict',
      opType: 'create',
      actorId: 'actor_1',
      deviceId: 'device_1',
      baseVersion: 0,
      patch: { id: 'task_conflict', title: 'Initial' },
      inversePatch: { deletedAt: '2026-02-15T00:00:00.000Z' },
      createdAt: '2026-02-15T00:00:00.000Z',
    });

    await expect(
      applyOp({
        opId: 'op_update_conflict',
        entityType: 'task',
        entityId: 'task_conflict',
        opType: 'update',
        actorId: 'actor_1',
        deviceId: 'device_1',
        baseVersion: 0,
        patch: { title: 'Stale Update' },
        inversePatch: { title: 'Initial' },
        createdAt: '2026-02-15T00:01:00.000Z',
      }),
    ).rejects.toThrow('Version conflict or task not found');
  });

  it('soft deletes tasks by setting deletedAt and hiding from reads', async () => {
    await applyOp({
      opId: 'op_create_delete',
      entityType: 'task',
      entityId: 'task_delete',
      opType: 'create',
      actorId: 'actor_1',
      deviceId: 'device_1',
      baseVersion: 0,
      patch: { id: 'task_delete', title: 'Delete me' },
      inversePatch: { deletedAt: '2026-02-15T10:00:00.000Z' },
      createdAt: '2026-02-15T10:00:00.000Z',
    });

    await applyOp({
      opId: 'op_delete_task',
      entityType: 'task',
      entityId: 'task_delete',
      opType: 'delete',
      actorId: 'actor_1',
      deviceId: 'device_1',
      baseVersion: 1,
      patch: {},
      inversePatch: {},
      createdAt: '2026-02-15T10:01:00.000Z',
    });

    const hidden = await getTaskById('task_delete');
    expect(hidden).toBeNull();

    const state = readLedgerState();
    expect(state.tasks.task_delete.deletedAt).toBe('2026-02-15T10:01:00.000Z');
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
  });

  it('records activity rows in reverse-chronological order', async () => {
    const actorId = 'actor_2';
    const deviceId = 'device_2';

    await applyOp({
      opId: 'op_a',
      entityType: 'task',
      entityId: 'task_a',
      opType: 'create',
      actorId,
      deviceId,
      baseVersion: 0,
      patch: { id: 'task_a', title: 'Task A' },
      inversePatch: { deletedAt: '2026-02-15T12:00:00.000Z' },
      createdAt: '2026-02-15T12:00:00.000Z',
    });

    await applyOp({
      opId: 'op_b',
      entityType: 'task',
      entityId: 'task_b',
      opType: 'create',
      actorId,
      deviceId,
      baseVersion: 0,
      patch: { id: 'task_b', title: 'Task B' },
      inversePatch: { deletedAt: '2026-02-15T12:01:00.000Z' },
      createdAt: '2026-02-15T12:01:00.000Z',
    });

    await applyOp({
      opId: 'op_c',
      entityType: 'task',
      entityId: 'task_a',
      opType: 'update',
      actorId,
      deviceId,
      baseVersion: 1,
      patch: { title: 'Task A updated' },
      inversePatch: { title: 'Task A' },
      createdAt: '2026-02-15T12:02:00.000Z',
    });

    await applyOp({
      opId: 'op_d',
      entityType: 'task',
      entityId: 'task_b',
      opType: 'update',
      actorId,
      deviceId,
      baseVersion: 1,
      patch: { priority: 'high' },
      inversePatch: { priority: 'medium' },
      createdAt: '2026-02-15T12:03:00.000Z',
    });

    await applyOp({
      opId: 'op_e',
      entityType: 'task',
      entityId: 'task_a',
      opType: 'delete',
      actorId,
      deviceId,
      baseVersion: 2,
      patch: {},
      inversePatch: {},
      createdAt: '2026-02-15T12:04:00.000Z',
    });

    const day = getLocalDayFromIso('2026-02-15T12:04:00.000Z');
    const rows = await getOpsForActorDay(actorId, day);

    expect(rows).toHaveLength(5);
    expect(rows.map((row) => row.opId)).toEqual(['op_e', 'op_d', 'op_c', 'op_b', 'op_a']);
  });
});
