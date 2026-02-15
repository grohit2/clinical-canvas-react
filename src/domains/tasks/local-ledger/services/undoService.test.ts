<<<<<<< ours
<<<<<<< ours
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
=======
=======
>>>>>>> theirs
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getTaskById: vi.fn(),
  getLastUndoableOp: vi.fn(),
  getOpsByGroupId: vi.fn(),
  ulid: vi.fn(),
  applyOp: vi.fn(),
}));

vi.mock('../queries/tasks.read', () => ({
  getTaskById: mocks.getTaskById,
}));

vi.mock('../queries/ops.read', () => ({
  getLastUndoableOp: mocks.getLastUndoableOp,
  getOpsByGroupId: mocks.getOpsByGroupId,
}));

vi.mock('../utils/ids', () => ({
  ulid: mocks.ulid,
}));

vi.mock('./commandService', () => ({
  applyOp: mocks.applyOp,
}));

import { undoLastOp, undoOpGroup } from './undoService';

describe('undoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ulid.mockReturnValue('undo-op-id');
  });

  it('undoLastOp throws when nothing is undoable', async () => {
    mocks.getLastUndoableOp.mockResolvedValue(null);

    await expect(undoLastOp({ actorId: 'actor-1', deviceId: 'device-1' })).rejects.toThrow('Nothing to undo');
  });

  it('undoLastOp applies compensating op', async () => {
    mocks.getLastUndoableOp.mockResolvedValue({
      opId: 'op-1',
      opGroupId: 'grp-1',
      entityId: 'task-1',
      opType: 'update',
      patchJson: '{"status":"In Progress"}',
      inversePatchJson: '{"status":"Scheduled"}',
    });
    mocks.getTaskById.mockResolvedValue({ id: 'task-1', version: 3 });
    mocks.applyOp.mockResolvedValue({ resultVersion: 4 });

    await undoLastOp({ actorId: 'actor-1', deviceId: 'device-1' });

    expect(mocks.applyOp).toHaveBeenCalledWith(expect.objectContaining({
      opType: 'undo',
      entityId: 'task-1',
      baseVersion: 3,
      revertsOpId: 'op-1',
      patch: { status: 'Scheduled' },
      inversePatch: { status: 'In Progress' },
    }));
  });

  it('undoOpGroup reverts group in reverse order and skips missing entities', async () => {
    mocks.ulid
      .mockReturnValueOnce('undo-group-id')
      .mockReturnValueOnce('undo-op-1')
      .mockReturnValueOnce('undo-op-2');

    mocks.getOpsByGroupId.mockResolvedValue([
      {
        opId: 'op-a',
        opType: 'update',
        entityId: 'task-a',
        patchJson: '{"priority":"High"}',
        inversePatchJson: '{"priority":"Medium"}',
      },
      {
        opId: 'op-b',
        opType: 'update',
        entityId: 'task-b',
        patchJson: '{"status":"In Progress"}',
        inversePatchJson: '{"status":"Scheduled"}',
      },
    ]);

    mocks.getTaskById
      .mockResolvedValueOnce({ id: 'task-b', version: 5 })
      .mockResolvedValueOnce(null);

    mocks.applyOp.mockResolvedValue({ resultVersion: 6 });

    const result = await undoOpGroup({ opGroupId: 'grp-1', actorId: 'actor-1', deviceId: 'device-1' });

    expect(mocks.applyOp).toHaveBeenCalledTimes(1);
    expect(mocks.applyOp).toHaveBeenCalledWith(expect.objectContaining({
      opGroupId: 'undo-group-id',
      entityId: 'task-b',
      patch: { status: 'Scheduled' },
      inversePatch: { status: 'In Progress' },
      revertsOpId: 'op-b',
    }));
    expect(result).toEqual([{ resultVersion: 6, opId: 'op-b' }]);
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
  });
});
