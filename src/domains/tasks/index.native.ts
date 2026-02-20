// Native entrypoint for Expo / React Native.
// Keeps web-only screens/components out of the native bundle graph.

export { TaskBoardMobileScreen } from './screens/TaskBoardMobileScreen.native';

// Native UI
export { TaskBottomNavNative } from './components/TaskBottomNav.native';

// Types
export type {
  Task,
  TaskPriority,
  TaskStatus,
  TaskFilter,
  TaskSort,
  TaskSortField,
  TaskGroup,
} from './core/types';

// API hooks
export { useTasks, useTask, useTasksByPatient, useTasksByDepartment } from './api/useTasks';
export { useCreateTask } from './api/useCreateTask';
export { useUpdateTask, useCompleteTask, useDeleteTask } from './api/useUpdateTask';
export { useUndo } from './api/useUndo';
export { useMyActionsToday, useMyActionCountToday, useTaskActivity } from './api/useMyActivity';

// Hooks
export { useTaskFilters } from './hooks/useTaskFilters';

// Core utilities
export {
  getPriorityConfig,
  getPriorityColor,
  getPriorityBgColor,
  getPriorityLabel,
  comparePriority,
  PRIORITY_CONFIG,
  PRIORITY_ORDER,
} from './core/priorities';

export { sortTasks, sortByDueDate, sortByPriority, groupByStatus, groupByDate } from './core/sorting';

export {
  filterTasks,
  isOverdue,
  isDueToday,
  isDueTomorrow,
  isDueThisWeek,
  isCompletedToday,
  isUrgent,
  isHighPriority,
  getOverdueTasks,
  getTasksDueToday,
  getUrgentTasks,
  getCompletedTodayTasks,
} from './core/filters';
