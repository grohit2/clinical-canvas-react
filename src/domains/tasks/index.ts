// Screens
export { TaskBoardScreen } from './screens/web/TaskBoardScreen';
export { AddTaskPage } from './screens/web/AddTaskScreen';
export { EditTaskPage } from './screens/web/EditTaskScreen';

// Backwards-compatible aliases
export { TaskBoardScreen as TasksPage } from './screens/web/TaskBoardScreen';
export { TaskBoardScreen as TasksScreen } from './screens/web/TaskBoardScreen';
export { AddTaskPage as AddTaskScreen } from './screens/web/AddTaskScreen';
export { EditTaskPage as EditTaskScreen } from './screens/web/EditTaskScreen';

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
export {
  useMyActionsToday,
  useMyActionCountToday,
  useTaskActivity,
} from './hooks/useMyActivity';
export { usePatientTasks } from './hooks/usePatientTasks';
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

// Models
export { buildTaskBoardModel, deriveTaskBoardMetrics, buildAuditRows } from './models/boardModel';
export {
  BOARD_VIEW_OPTIONS,
  buildViewSections,
  buildPatientViewSections,
} from './models/boardViews';
export { buildPatientLookup } from './models/patientLookup';
export type {
  TaskBoardTab,
  TaskBoardFilter,
  TaskBoardRow,
  TaskBoardSection,
  TaskBoardMetrics,
  TaskBoardAuditRow,
} from './models/types';

// Components
export { TaskCard } from './components/shared/TaskCard';
export { TaskList } from './components/shared/TaskList';
export { PriorityBadge } from './components/shared/PriorityBadge';
export { TaskBottomNav } from './components/web/TaskBottomNav';
