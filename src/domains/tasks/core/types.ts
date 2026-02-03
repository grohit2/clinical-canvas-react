// Tasks Domain Types
// Pure TypeScript (NO React/RN imports)
// Note: Base Task interface stays in shared/types/api.ts

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type TaskSortField = 'dueDate' | 'priority' | 'createdAt' | 'title';
export type TaskSortOrder = 'asc' | 'desc';

export interface TaskFilter {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  assigneeId?: string;
  patientId?: string;
  departmentId?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  search?: string;
}

export interface TaskSort {
  field: TaskSortField;
  order: TaskSortOrder;
}

export interface TaskGroup {
  label: string;
  tasks: Task[];
  count: number;
}

// Re-export for convenience - actual type from shared
export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  patientId?: string;
  patientName?: string;
  assigneeId?: string;
  assigneeName?: string;
  departmentId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
