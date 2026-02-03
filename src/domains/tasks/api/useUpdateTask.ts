// useUpdateTask - TanStack Query mutation hook for updating tasks

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Task, TaskPriority, TaskStatus } from '../core/types';
// TODO: Update import path after shared lib migration
// import { api } from '@/shared/lib/api';

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string;
  assigneeId?: string;
}

export function useUpdateTask(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation<Task, Error, UpdateTaskPayload>({
    mutationFn: async (payload) => {
      // TODO: Implement actual API call
      // return api.tasks.update(taskId, payload);
      throw new Error('Not implemented');
    },
    onSuccess: (updatedTask) => {
      // Update the specific task in cache
      queryClient.setQueryData(['task', taskId], updatedTask);

      // Invalidate all task list queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useCompleteTask(taskId: string) {
  const updateTask = useUpdateTask(taskId);

  return {
    ...updateTask,
    mutate: () => updateTask.mutate({ status: 'completed' }),
    mutateAsync: () => updateTask.mutateAsync({ status: 'completed' }),
  };
}

export function useDeleteTask(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, Error>({
    mutationFn: async () => {
      // TODO: Implement actual API call
      // return api.tasks.delete(taskId);
      throw new Error('Not implemented');
    },
    onSuccess: () => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['task', taskId] });

      // Invalidate all task list queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
