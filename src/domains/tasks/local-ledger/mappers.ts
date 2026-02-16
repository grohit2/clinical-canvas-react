import type { Task } from '../core/types';
import type { TaskEntity } from './types';

export function toPublicTask(entity: TaskEntity): Task {
  return {
    id: entity.id,
    title: entity.title,
    description: entity.description || undefined,
    priority: entity.priority,
    status: entity.status,
    dueDate: entity.dueDate ?? undefined,
    patientId: entity.patientId ?? undefined,
    patientName: entity.patientName ?? undefined,
    assigneeId: entity.assigneeId ?? undefined,
    assigneeName: entity.assigneeName ?? undefined,
    departmentId: entity.departmentId ?? undefined,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    completedAt: entity.completedAt ?? undefined,
  };
}
