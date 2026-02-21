import api from '@shared/lib/api';
import type { Task as ApiTask } from '@shared/types/api';
import type { Task } from '../../core/types';
import { mapTaskStatusToBoardStatus } from '../../core/statuses';

function mapApiStatusToDomain(status: ApiTask['status']): Task['status'] {
  switch (status) {
    case 'open':
      return 'pending';
    case 'in-progress':
      return 'in_progress';
    case 'done':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

function mapApiTypeToTaskType(type: ApiTask['type']): string {
  switch (type) {
    case 'lab':
      return 'Lab Work';
    case 'medication':
      return 'Medication';
    case 'procedure':
      return 'Procedure';
    case 'assessment':
      return 'Assessment';
    case 'discharge':
      return 'Discharge Planning';
    default:
      return 'Task';
  }
}

function scheduleTimeFromIso(iso: string): string | undefined {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString().slice(11, 16);
}

function scheduleDayFromIso(iso: string): string | undefined {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

export function mapApiTaskToDomain(apiTask: ApiTask): Task {
  const status = mapApiStatusToDomain(apiTask.status);
  const recurrence = apiTask.recurring ? apiTask.recurrence?.frequency ?? 'Recurring' : 'None';

  return {
    id: apiTask.taskId,
    title: apiTask.title,
    description: typeof apiTask.details?.description === 'string' ? apiTask.details.description : undefined,
    priority: apiTask.priority,
    status,
    dueDate: apiTask.due,
    patientId: apiTask.patientId,
    assigneeId: apiTask.assigneeId,
    departmentId: apiTask.department ?? undefined,
    taskType: mapApiTypeToTaskType(apiTask.type),
    recurrence,
    scheduleDay: scheduleDayFromIso(apiTask.due),
    scheduleTime: scheduleTimeFromIso(apiTask.due),
    boardStatusLabel: mapTaskStatusToBoardStatus(status),
    createdAt: apiTask.createdAt,
    updatedAt: apiTask.updatedAt,
    completedAt: status === 'completed' ? apiTask.updatedAt : undefined,
  };
}

export async function listPatientTasks(patientId: string): Promise<Task[]> {
  if (!patientId) {
    return [];
  }

  const tasks = await api.tasks.list(patientId);
  return tasks.map(mapApiTaskToDomain);
}

export async function getPatientTask(patientId: string, taskId: string): Promise<Task | null> {
  if (!patientId || !taskId) {
    return null;
  }

  const tasks = await listPatientTasks(patientId);
  return tasks.find((task) => task.id === taskId) ?? null;
}
