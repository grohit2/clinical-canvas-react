// useCreateTask - TanStack Query mutation hook for creating tasks

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Task, TaskPriority } from '../core/types';
// TODO: Update import path after shared lib migration
// import { api } from '@/shared/lib/api';

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string;
  patientId?: string;
  assigneeId?: string;
  departmentId?: string;
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation<Task, Error, CreateTaskPayload>({
    mutationFn: async (payload) => {
      // TODO: Implement actual API call
      // return api.tasks.create(payload);
      throw new Error('Not implemented');
    },
    onSuccess: (newTask) => {
      // Invalidate all task queries to refetch
      queryClient.invalidateQueries({ queryKey: ['tasks'] });

      // If task is for a specific patient, invalidate patient tasks too
      if (newTask.patientId) {
        queryClient.invalidateQueries({
          queryKey: ['tasks', { patientId: newTask.patientId }],
        });
      }
    },
  });
}
