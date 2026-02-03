// useTasks - TanStack Query hook for fetching tasks

import { useQuery } from '@tanstack/react-query';
import type { Task, TaskFilter } from '../core/types';
// TODO: Update import path after shared lib migration
// import { api } from '@/shared/lib/api';

export interface UseTasksOptions {
  filter?: TaskFilter;
  enabled?: boolean;
}

export function useTasks(options: UseTasksOptions = {}) {
  const { filter, enabled = true } = options;

  return useQuery<Task[]>({
    queryKey: ['tasks', filter],
    queryFn: async () => {
      // TODO: Implement actual API call
      // return api.tasks.list(filter);
      throw new Error('Not implemented');
    },
    enabled,
  });
}

export function useTasksByPatient(patientId: string, options: Omit<UseTasksOptions, 'filter'> = {}) {
  return useTasks({
    ...options,
    filter: { patientId },
    enabled: options.enabled !== false && !!patientId,
  });
}

export function useTasksByDepartment(departmentId: string, options: Omit<UseTasksOptions, 'filter'> = {}) {
  return useTasks({
    ...options,
    filter: { departmentId },
    enabled: options.enabled !== false && !!departmentId,
  });
}

export function useTask(taskId: string, options: { enabled?: boolean } = {}) {
  return useQuery<Task>({
    queryKey: ['task', taskId],
    queryFn: async () => {
      // TODO: Implement actual API call
      // return api.tasks.get(taskId);
      throw new Error('Not implemented');
    },
    enabled: options.enabled !== false && !!taskId,
  });
}
