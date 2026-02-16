import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Task, TaskPriority } from '../core/types';
import { toPublicTask } from '../local-ledger/mappers';
import { getTaskById } from '../local-ledger/queries/tasks.read';
import { applyOp } from '../local-ledger/services/commandService';
import { getActiveActorId, getDeviceId } from '../local-ledger/utils/device';
import { ulid } from '../local-ledger/utils/ids';

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string;
  patientId?: string;
  patientName?: string;
  assigneeId?: string;
  assigneeName?: string;
  departmentId?: string;
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation<Task, Error, CreateTaskPayload>({
    mutationFn: async (payload) => {
      const taskId = ulid();
      const opId = ulid();
      const now = new Date().toISOString();
      const actorId = getActiveActorId() ?? 'anon';
      const deviceId = getDeviceId();

      await applyOp({
        opId,
        entityType: 'task',
        entityId: taskId,
        opType: 'create',
        actorId,
        deviceId,
        baseVersion: 0,
        patch: {
          id: taskId,
          title: payload.title,
          description: payload.description ?? '',
          priority: payload.priority ?? 'medium',
          status: 'pending',
          dueDate: payload.dueDate ?? null,
          patientId: payload.patientId ?? null,
          patientName: payload.patientName ?? null,
          assigneeId: payload.assigneeId ?? null,
          assigneeName: payload.assigneeName ?? null,
          departmentId: payload.departmentId ?? null,
          createdAt: now,
          updatedAt: now,
          completedAt: null,
          sortOrder: 0,
          origin: 'manual',
          originKey: null,
        },
        inversePatch: {
          deletedAt: now,
        },
      });

      const row = await getTaskById(taskId);
      if (!row) {
        throw new Error('Failed to create task');
      }

      return toPublicTask(row);
    },
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.setQueryData(['task', newTask.id], newTask);
    },
  });
}
