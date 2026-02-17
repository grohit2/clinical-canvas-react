import { beforeEach, describe, expect, it } from 'vitest';
import { listTasks } from '../queries/tasks.read';
import { resetLedgerState } from '../db';
import { applyOp } from './commandService';
import { ensureHospitalDemoSeed } from './demoSeedService';

describe('ensureHospitalDemoSeed', () => {
  beforeEach(async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    await resetLedgerState();
  });

  it('seeds 12 tasks when ledger is empty in dev runtime', async () => {
    const result = await ensureHospitalDemoSeed();
    const tasks = await listTasks();

    expect(result.seeded).toBe(true);
    expect(tasks).toHaveLength(12);
    expect(tasks[0]?.title).toBeTruthy();
  });

  it('no-ops when tasks already exist', async () => {
    const createdAt = '2026-02-16T00:00:00.000Z';

    await applyOp({
      opId: 'op_existing_task',
      entityType: 'task',
      entityId: 'task_existing',
      opType: 'create',
      actorId: 'actor_1',
      deviceId: 'device_1',
      baseVersion: 0,
      patch: {
        id: 'task_existing',
        title: 'Existing task',
        createdAt,
        updatedAt: createdAt,
      },
      inversePatch: {
        deletedAt: createdAt,
      },
      createdAt,
    });

    const result = await ensureHospitalDemoSeed();
    const tasks = await listTasks();

    expect(result.seeded).toBe(false);
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.id).toBe('task_existing');
  });

  it('is idempotent when called twice', async () => {
    const first = await ensureHospitalDemoSeed();
    const second = await ensureHospitalDemoSeed();
    const tasks = await listTasks();

    expect(first.seeded).toBe(true);
    expect(second.seeded).toBe(false);
    expect(tasks).toHaveLength(12);
  });
});
