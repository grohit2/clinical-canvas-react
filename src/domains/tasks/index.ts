// Screens
export { TasksPage } from './screens/TasksScreen';
export { TasksDuePage } from './screens/TasksDueScreen';
export { UrgentAlertsPage } from './screens/UrgentAlertsScreen';
export { CompletedTodayPage } from './screens/CompletedTodayScreen';
export { AddTaskPage } from './screens/AddTaskScreen';
export { EditTaskPage } from './screens/EditTaskScreen';

// Backwards-compatible aliases
export { TasksPage as TasksScreen } from './screens/TasksScreen';
export { TasksDuePage as TasksDueScreen } from './screens/TasksDueScreen';
export { UrgentAlertsPage as UrgentAlertsScreen } from './screens/UrgentAlertsScreen';
export { CompletedTodayPage as CompletedTodayScreen } from './screens/CompletedTodayScreen';
export { AddTaskPage as AddTaskScreen } from './screens/AddTaskScreen';
export { EditTaskPage as EditTaskScreen } from './screens/EditTaskScreen';

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
export {
  useMyActionsToday,
  useMyActionCountToday,
  useTaskActivity,
} from './api/useMyActivity';

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

// Components
export { TaskCard } from './components/TaskCard';
export { TaskList } from './components/TaskList';
export { TaskForm } from './components/TaskForm';
export { PriorityBadge } from './components/PriorityBadge';
