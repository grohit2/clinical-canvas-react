import {
  HOSPITAL_DEMO_GROUPS,
} from '../../core/constants';
import {
  mapBoardPriorityToTaskPriority,
  mapBoardStatusToTaskStatus,
  toIsoFromBoardSchedule,
} from '../../core/statuses';
import { listTasks } from '../queries/tasks.read';
import { getDeviceId } from '../utils/device';
import { applyOp } from './commandService';

const DEMO_ACTOR_ID = 'demo_seed';
const DEMO_SEED_BASE_ISO = '2026-02-16T00:00:00.000Z';

let seedInFlight: Promise<{ seeded: boolean }> | null = null;

declare const __DEV__: boolean;

function getBundlerDevFlag(): boolean | undefined {
  try {
    return __DEV__;
  } catch {
    return undefined;
  }
}

function isDevRuntime(): boolean {
  const bundlerDev = getBundlerDevFlag();
  if (typeof bundlerDev === 'boolean') {
    return bundlerDev;
  }

  const devFlag = (globalThis as { __DEV__?: boolean }).__DEV__;
  if (typeof devFlag === 'boolean') {
    return devFlag;
  }

  const maybeProcess = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return maybeProcess.process?.env?.NODE_ENV !== 'production';
}

export async function ensureHospitalDemoSeed(): Promise<{ seeded: boolean }> {
  const devRuntime = isDevRuntime();
  if (!devRuntime) {
    return { seeded: false };
  }

  if (seedInFlight) {
    return seedInFlight;
  }

  seedInFlight = (async () => {
    const existing = await listTasks();
    if (existing.length > 0) {
      return { seeded: false };
    }

    const deviceId = getDeviceId();

    for (let groupIndex = 0; groupIndex < HOSPITAL_DEMO_GROUPS.length; groupIndex += 1) {
      const group = HOSPITAL_DEMO_GROUPS[groupIndex];

      for (let taskIndex = 0; taskIndex < group.tasks.length; taskIndex += 1) {
        const template = group.tasks[taskIndex];
        const dueDate = toIsoFromBoardSchedule(template.day, template.time);
        const createdAt = new Date(
          Date.parse(DEMO_SEED_BASE_ISO) + (groupIndex * 10 + taskIndex) * 60 * 1000,
        ).toISOString();
        const status = mapBoardStatusToTaskStatus(template.statusLabel);

        await applyOp({
          opId: `demo_op_${template.id}`,
          entityType: 'task',
          entityId: `demo_task_${template.id}`,
          opType: 'create',
          actorId: DEMO_ACTOR_ID,
          deviceId,
          baseVersion: 0,
          patch: {
            id: `demo_task_${template.id}`,
            title: template.name,
            description: template.notes,
            priority: mapBoardPriorityToTaskPriority(template.priorityLabel),
            status,
            dueDate,
            patientId: null,
            patientName: template.patient,
            assigneeId: null,
            assigneeName: template.nurse,
            departmentId: group.name,
            doctorName: template.doctor,
            nurseName: template.nurse,
            taskType: template.type,
            placeText: template.place,
            recurrence: template.recurrence,
            scheduleDay: template.day,
            scheduleTime: template.time,
            boardStatusLabel: template.statusLabel,
            createdAt,
            updatedAt: createdAt,
            completedAt: status === 'completed' ? dueDate : null,
            sortOrder: groupIndex * 100 + taskIndex,
            origin: 'manual',
            originKey: `demo:${template.id}`,
          },
          inversePatch: {
            deletedAt: createdAt,
          },
          createdAt,
          reason: 'Hospital demo seed',
        });
      }
    }

    return { seeded: true };
  })();

  try {
    return await seedInFlight;
  } finally {
    seedInFlight = null;
  }
}
