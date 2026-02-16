import type { Task, TaskPriority, TaskStatus } from '../core/types';

export type TaskBoardTab = 'home' | 'board' | 'reminders' | 'audit';
export type TaskBoardFilter = 'all' | 'urgent' | 'in_progress' | 'scheduled' | 'completed';
export type TaskBoardSortMode = 'default' | 'priority' | 'time';

export interface TaskBoardPerson {
  name: string;
  initials: string;
  color: string;
}

export interface TaskBoardRow {
  id: string;
  title: string;
  patientName: string;
  doctor: TaskBoardPerson;
  nurse: TaskBoardPerson;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  dueLabel: string;
  sectionId: string;
  sectionTitle: string;
  urgent: boolean;
  source: Task;
}

export interface TaskBoardSection {
  id: string;
  title: string;
  color: string;
  rows: TaskBoardRow[];
  urgentCount: number;
  total: number;
}

export interface TaskBoardMetrics {
  total: number;
  urgent: number;
  active: number;
  scheduled: number;
  done: number;
}

export interface TaskBoardAuditRow {
  id: string;
  title: string;
  detail: string;
  at: string;
  opType: string;
  actorId: string | null;
}

export interface BuildTaskBoardOptions {
  filter: TaskBoardFilter;
  sortMode?: TaskBoardSortMode;
  now?: Date;
}

export interface TaskBoardModel {
  allRows: TaskBoardRow[];
  filteredRows: TaskBoardRow[];
  sections: TaskBoardSection[];
  metrics: TaskBoardMetrics;
  remindersToday: TaskBoardRow[];
  remindersUpcoming: TaskBoardRow[];
}

export interface ActivityLike {
  opId?: string;
  entityId: string;
  opType: string;
  patchJson: string;
  reason: string | null;
  actorId: string | null;
  createdAt: string;
}

export type PatientLookup = Record<string, string>;
