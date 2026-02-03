// Task Filters - Pure TypeScript (NO React/RN imports)
// Extracted from hardcoded logic in TasksDuePage, UrgentAlertsPage, CompletedTodayPage

import type { Task, TaskFilter, TaskPriority, TaskStatus } from './types';

export function filterTasks(tasks: Task[], filter: TaskFilter): Task[] {
  return tasks.filter((task) => {
    // Status filter
    if (filter.status && filter.status.length > 0) {
      if (!filter.status.includes(task.status)) return false;
    }

    // Priority filter
    if (filter.priority && filter.priority.length > 0) {
      if (!filter.priority.includes(task.priority)) return false;
    }

    // Assignee filter
    if (filter.assigneeId && task.assigneeId !== filter.assigneeId) {
      return false;
    }

    // Patient filter
    if (filter.patientId && task.patientId !== filter.patientId) {
      return false;
    }

    // Department filter
    if (filter.departmentId && task.departmentId !== filter.departmentId) {
      return false;
    }

    // Due date range filter
    if (filter.dueDateFrom && task.dueDate) {
      if (new Date(task.dueDate) < new Date(filter.dueDateFrom)) return false;
    }
    if (filter.dueDateTo && task.dueDate) {
      if (new Date(task.dueDate) > new Date(filter.dueDateTo)) return false;
    }

    // Search filter
    if (filter.search) {
      const search = filter.search.toLowerCase();
      const matchesTitle = task.title.toLowerCase().includes(search);
      const matchesDescription = task.description?.toLowerCase().includes(search);
      const matchesPatient = task.patientName?.toLowerCase().includes(search);
      if (!matchesTitle && !matchesDescription && !matchesPatient) return false;
    }

    return true;
  });
}

// Date-based filters
export function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') {
    return false;
  }
  return new Date(task.dueDate) < new Date();
}

export function isDueToday(task: Task): boolean {
  if (!task.dueDate) return false;
  const today = new Date().toISOString().split('T')[0];
  const dueDate = new Date(task.dueDate).toISOString().split('T')[0];
  return today === dueDate;
}

export function isDueTomorrow(task: Task): boolean {
  if (!task.dueDate) return false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  const dueDate = new Date(task.dueDate).toISOString().split('T')[0];
  return tomorrowStr === dueDate;
}

export function isDueThisWeek(task: Task): boolean {
  if (!task.dueDate) return false;
  const today = new Date();
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
  const dueDate = new Date(task.dueDate);
  return dueDate >= today && dueDate <= endOfWeek;
}

export function isCompletedToday(task: Task): boolean {
  if (task.status !== 'completed' || !task.completedAt) return false;
  const today = new Date().toISOString().split('T')[0];
  const completedDate = new Date(task.completedAt).toISOString().split('T')[0];
  return today === completedDate;
}

// Priority-based filters
export function isUrgent(task: Task): boolean {
  return task.priority === 'urgent' && task.status !== 'completed' && task.status !== 'cancelled';
}

export function isHighPriority(task: Task): boolean {
  return (
    (task.priority === 'urgent' || task.priority === 'high') &&
    task.status !== 'completed' &&
    task.status !== 'cancelled'
  );
}

// Convenience filter functions
export function getOverdueTasks(tasks: Task[]): Task[] {
  return tasks.filter(isOverdue);
}

export function getTasksDueToday(tasks: Task[]): Task[] {
  return tasks.filter(isDueToday);
}

export function getUrgentTasks(tasks: Task[]): Task[] {
  return tasks.filter(isUrgent);
}

export function getCompletedTodayTasks(tasks: Task[]): Task[] {
  return tasks.filter(isCompletedToday);
}
