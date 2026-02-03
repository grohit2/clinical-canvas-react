// Task Priorities - Pure TypeScript (NO React/RN imports)
// Extracted from inline duplication across TasksPage, PatientTasks, AddTaskPage

import type { TaskPriority } from './types';

export interface PriorityConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  order: number;
}

export const PRIORITY_CONFIG: Record<TaskPriority, PriorityConfig> = {
  urgent: {
    label: 'Urgent',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    order: 0,
  },
  high: {
    label: 'High',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    order: 1,
  },
  medium: {
    label: 'Medium',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300',
    order: 2,
  },
  low: {
    label: 'Low',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    order: 3,
  },
};

export const PRIORITY_ORDER: TaskPriority[] = ['urgent', 'high', 'medium', 'low'];

export function getPriorityConfig(priority: TaskPriority): PriorityConfig {
  return PRIORITY_CONFIG[priority];
}

export function getPriorityColor(priority: TaskPriority): string {
  return PRIORITY_CONFIG[priority].color;
}

export function getPriorityBgColor(priority: TaskPriority): string {
  return PRIORITY_CONFIG[priority].bgColor;
}

export function getPriorityLabel(priority: TaskPriority): string {
  return PRIORITY_CONFIG[priority].label;
}

export function comparePriority(a: TaskPriority, b: TaskPriority): number {
  return PRIORITY_CONFIG[a].order - PRIORITY_CONFIG[b].order;
}
