import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Task, TaskPriority, TaskStatus } from '../core/types';
import { toPublicTask } from '../local-ledger/mappers';
import { getTaskById } from '../local-ledger/queries/tasks.read';
import { applyOp } from '../local-ledger/services/commandService';
import { computePatch } from '../local-ledger/services/opService';
import { getActiveActorId, getDeviceId } from '../local-ledger/utils/device';
import { ulid } from '../local-ledger/utils/ids';

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  dueDate?: string;
  assigneeId?: string;
  assigneeName?: string;
  departmentId?: string;
}

export function useUpdateTask(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation<Task, Error, UpdateTaskPayload>({
    mutationFn: async (updates) => {
      const current = await getTaskById(taskId);
      if (!current) {
        throw new Error('Task not found');
      }

      const now = new Date().toISOString();
      const desiredStatus = updates.status;
      const updatesWithDerived: Record<string, unknown> = {
        ...updates,
      };

      if (desiredStatus === 'completed' && !current.completedAt) {
        updatesWithDerived.completedAt = now;
      }
      if (desiredStatus && desiredStatus !== 'completed' && current.completedAt) {
        updatesWithDerived.completedAt = null;
      }

      const { patch, inversePatch } = computePatch(current as Record<string, unknown>, updatesWithDerived);

      if (Object.keys(patch).length === 0) {
        return toPublicTask(current);
      }

      await applyOp({
        opId: ulid(),
        entityType: 'task',
        entityId: taskId,
        opType: 'update',
        actorId: getActiveActorId() ?? 'anon',
        deviceId: getDeviceId(),
        baseVersion: current.version,
        patch,
        inversePatch,
      });

      const updated = await getTaskById(taskId);
      if (!updated) {
        throw new Error('Task not found after update');
      }

      return toPublicTask(updated);
    },
    onSuccess: (updatedTask) => {
      queryClient.setQueryData(['task', taskId], updatedTask);
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
      const current = await getTaskById(taskId);
      if (!current) {
        return;
      }

      await applyOp({
        opId: ulid(),
        entityType: 'task',
        entityId: taskId,
        opType: 'delete',
        actorId: getActiveActorId() ?? 'anon',
        deviceId: getDeviceId(),
        baseVersion: current.version,
        patch: {},
        inversePatch: {},
      });
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
