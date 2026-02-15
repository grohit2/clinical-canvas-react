import { readLedgerState } from '../db';
import type { TaskEntity } from '../types';

const TASK_SELECT = `
  SELECT t.*, NULL AS patientNameSnapshot
  FROM tasks t
`;

function isActiveTask(task: TaskEntity): boolean {
  return task.deletedAt === null;
}

function bySortOrderAndDueDate(a: TaskEntity, b: TaskEntity): number {
  const sortDiff = a.sortOrder - b.sortOrder;
  if (sortDiff !== 0) {
    return sortDiff;
  }

  const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
  const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
  return aTime - bTime;
}

export async function getTaskById(
  id: string,
  options: { includeDeleted?: boolean } = {},
): Promise<TaskEntity | null> {
  const state = readLedgerState();
  const task = state.tasks[id];
  if (!task) {
    return null;
  }
  if (!options.includeDeleted && !isActiveTask(task)) {
    return null;
  }
  return task;
}

export async function listTasks(): Promise<TaskEntity[]> {
  const state = readLedgerState();
  return Object.values(state.tasks).filter(isActiveTask).sort(bySortOrderAndDueDate);
}

export async function getTasksByWard(wardId: string): Promise<TaskEntity[]> {
  const state = readLedgerState();
  return Object.values(state.tasks)
    .filter((task) => isActiveTask(task) && task.departmentId === wardId)
    .sort(bySortOrderAndDueDate);
}

export async function getTasksByDepartment(departmentId: string): Promise<TaskEntity[]> {
  return getTasksByWard(departmentId);
}

export async function getTasksByPatient(patientId: string): Promise<TaskEntity[]> {
  const state = readLedgerState();
  return Object.values(state.tasks)
    .filter((task) => isActiveTask(task) && task.patientId === patientId)
    .sort(bySortOrderAndDueDate);
}

export async function findTaskByOriginKey(originKey: string): Promise<{ id: string } | null> {
  const state = readLedgerState();
  const match = Object.values(state.tasks).find(
    (task) => isActiveTask(task) && task.originKey === originKey,
  );

  if (!match) {
    return null;
  }

  return { id: match.id };
}
