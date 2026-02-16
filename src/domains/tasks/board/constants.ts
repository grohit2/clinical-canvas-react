import type { TaskBoardFilter, TaskBoardPerson, TaskBoardTab } from './types';

export const TASK_BOARD_TABS: Array<{ id: TaskBoardTab; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'board', label: 'Board' },
  { id: 'reminders', label: 'Reminders' },
  { id: 'audit', label: 'Audit' },
];

export const TASK_BOARD_FILTERS: Array<{ id: TaskBoardFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'urgent', label: 'Urgent' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'completed', label: 'Completed' },
];

export const DUMMY_DOCTORS: TaskBoardPerson[] = [
  { name: 'Dr. Patel', initials: 'VP', color: '#1f6feb' },
  { name: 'Dr. Chen', initials: 'LC', color: '#8b5cf6' },
  { name: 'Dr. Garcia', initials: 'MG', color: '#ef4444' },
  { name: 'Dr. Kim', initials: 'SK', color: '#f59e0b' },
  { name: 'Dr. Brooks', initials: 'AB', color: '#0f766e' },
];

export const DUMMY_NURSES: TaskBoardPerson[] = [
  { name: 'RN Sarah M.', initials: 'SM', color: '#ec4899' },
  { name: 'RN James T.', initials: 'JT', color: '#2563eb' },
  { name: 'RN Maria L.', initials: 'ML', color: '#9333ea' },
  { name: 'RN David K.', initials: 'DK', color: '#16a34a' },
  { name: 'RN Emily R.', initials: 'ER', color: '#ea580c' },
];

export const SECTION_COLORS = [
  '#2563eb',
  '#8b5cf6',
  '#ef4444',
  '#16a34a',
  '#f59e0b',
  '#0ea5e9',
  '#d946ef',
  '#0f766e',
];
