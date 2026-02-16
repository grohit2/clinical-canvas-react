import { useQuery } from '@tanstack/react-query';
import type { Task, TaskFilter } from '../core/types';
import { filterTasks } from '../core/filters';
import { toPublicTask } from '../local-ledger/mappers';
import {
  getTaskById,
  getTasksByDepartment,
  getTasksByPatient,
  listTasks,
} from '../local-ledger/queries/tasks.read';

export interface UseTasksOptions {
  filter?: TaskFilter;
  enabled?: boolean;
}

export function useTasks(options: UseTasksOptions = {}) {
  const { filter, enabled = true } = options;

  return useQuery<Task[]>({
    queryKey: ['tasks', filter],
    queryFn: async () => {
      const all = await listTasks();
      const mapped = all.map(toPublicTask);
      if (!filter) {
        return mapped;
      }
      return filterTasks(mapped, filter);
    },
    enabled,
  });
}

export function useTasksByPatient(patientId: string, options: Omit<UseTasksOptions, 'filter'> = {}) {
  return useQuery<Task[]>({
    queryKey: ['tasks', 'patient', patientId],
    queryFn: async () => {
      const rows = await getTasksByPatient(patientId);
      return rows.map(toPublicTask);
    },
    enabled: options.enabled !== false && !!patientId,
  });
}

export function useTasksByDepartment(
  departmentId: string,
  options: Omit<UseTasksOptions, 'filter'> = {},
) {
  return useQuery<Task[]>({
    queryKey: ['tasks', 'department', departmentId],
    queryFn: async () => {
      const rows = await getTasksByDepartment(departmentId);
      return rows.map(toPublicTask);
    },
    enabled: options.enabled !== false && !!departmentId,
  });
}

export function useTask(taskId: string, options: { enabled?: boolean } = {}) {
  return useQuery<Task | null>({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const row = await getTaskById(taskId);
      return row ? toPublicTask(row) : null;
    },
    enabled: options.enabled !== false && !!taskId,
  });
}
