// Native entrypoint for Expo / React Native.
// Keeps web-only screens/components out of the native bundle graph.

export { TaskBoardScreenNative } from './screens/native/TaskBoardScreen.native';
export { TaskBoardScreenNative as TaskBoardMobileScreen } from './screens/native/TaskBoardScreen.native';

// Native UI
export { TaskBottomNavNative } from './components/native/TaskBottomNav.native';

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

// Hooks
export { useTasks, useTask, useTasksByPatient, useTasksByDepartment } from './hooks/useTasks';
export { useCreateTask } from './hooks/useCreateTask';
export { useUpdateTask, useCompleteTask, useDeleteTask } from './hooks/useUpdateTask';
export { useUndo } from './hooks/useUndo';
export { useMyActionsToday, useMyActionCountToday, useTaskActivity } from './hooks/useMyActivity';
export { useTaskFilters } from './hooks/useTaskFilters';

// Core utilities
export {
  TASK_BOARD_FILTERS,
  TASK_BOARD_TABS,
  DOCTORS,
  NURSES,
  GROUP_COLORS,
  TASK_TYPES,
  PLACES,
  RECURRENCE,
  DAYS,
} from './core/constants';

export {
  TASK_STATUS_TONES,
  PRIORITY_TONES,
  mapBoardStatusToTaskStatus,
  mapBoardPriorityToTaskPriority,
  mapTaskStatusToBoardStatus,
  mapTaskPriorityToBoardPriority,
  toIsoFromBoardSchedule,
} from './core/statuses';

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
