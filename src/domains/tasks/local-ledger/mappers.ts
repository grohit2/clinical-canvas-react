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
    doctorName: entity.doctorName ?? undefined,
    nurseName: entity.nurseName ?? undefined,
    taskType: entity.taskType ?? undefined,
    placeText: entity.placeText ?? undefined,
    recurrence: entity.recurrence ?? undefined,
    scheduleDay: entity.scheduleDay ?? undefined,
    scheduleTime: entity.scheduleTime ?? undefined,
    boardStatusLabel: entity.boardStatusLabel ?? undefined,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    completedAt: entity.completedAt ?? undefined,
  };
}
