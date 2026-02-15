// Task Sorting - Pure TypeScript (NO React/RN imports)
// Extracted from inline logic in screens

import type { Task, TaskSort, TaskGroup, TaskStatus } from './types';
import { comparePriority } from './priorities';

export function sortTasks(tasks: Task[], sort: TaskSort): Task[] {
  const sorted = [...tasks];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sort.field) {
      case 'dueDate': {
        const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        comparison = dateA - dateB;
        break;
      }

      case 'priority':
        comparison = comparePriority(a.priority, b.priority);
        break;

      case 'createdAt':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;

      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
    }

    return sort.order === 'desc' ? -comparison : comparison;
  });

  return sorted;
}

export function sortByDueDate(tasks: Task[], order: 'asc' | 'desc' = 'asc'): Task[] {
  return sortTasks(tasks, { field: 'dueDate', order });
}

export function sortByPriority(tasks: Task[], order: 'asc' | 'desc' = 'asc'): Task[] {
  return sortTasks(tasks, { field: 'priority', order });
}

export function groupByStatus(tasks: Task[]): TaskGroup[] {
  const statusOrder: TaskStatus[] = ['in_progress', 'pending', 'completed', 'cancelled'];
  const statusLabels: Record<TaskStatus, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  const groups: Map<TaskStatus, Task[]> = new Map();

  for (const task of tasks) {
    const existing = groups.get(task.status) || [];
    groups.set(task.status, [...existing, task]);
  }

  return statusOrder
    .filter((status) => groups.has(status))
    .map((status) => ({
      label: statusLabels[status],
      tasks: groups.get(status) || [],
      count: groups.get(status)?.length || 0,
    }));
}

export function groupByDate(tasks: Task[]): TaskGroup[] {
  const groups: Map<string, Task[]> = new Map();

  for (const task of tasks) {
    const date = task.dueDate
      ? new Date(task.dueDate).toISOString().split('T')[0]
      : 'No Due Date';
    const existing = groups.get(date) || [];
    groups.set(date, [...existing, task]);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => {
      if (a === 'No Due Date') return 1;
      if (b === 'No Due Date') return -1;
      return a.localeCompare(b);
    })
    .map(([date, tasks]) => ({
      label: date === 'No Due Date' ? date : formatDateLabel(date),
      tasks,
      count: tasks.length,
    }));
}

function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (dateStr === today.toISOString().split('T')[0]) {
    return 'Today';
  }
  if (dateStr === tomorrow.toISOString().split('T')[0]) {
    return 'Tomorrow';
  }

  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}
