# Tasks Domain

## Purpose
Manages clinical tasks and alerts across the hospital. Supports task creation,
assignment, prioritization, filtering, and completion tracking.

## Screens
| Screen | Route | Description |
|--------|-------|-------------|
| TasksScreen | `/(app)/tasks` | Main task list with filters |
| TasksDueScreen | `/(app)/tasks/due` | Tasks due today/tomorrow |
| UrgentAlertsScreen | `/(app)/tasks/urgent` | Urgent priority tasks |
| CompletedTodayScreen | `/(app)/tasks/completed` | Tasks completed today |
| AddTaskScreen | `/(app)/patient/[id]/tasks/new` | Create task for patient |
| EditTaskScreen | `/(app)/tasks/[id]/edit` | Edit existing task |

## Components
| Component | Description |
|-----------|-------------|
| TaskCard | Single task display with priority badge |
| TaskList | List container with empty state |
| TaskForm | Create/edit task form |
| PriorityBadge | Visual priority indicator |

## Core Logic (Pure TypeScript)
| File | Purpose |
|------|---------|
| `types.ts` | TaskFilter, TaskSort, TaskGroup types |
| `priorities.ts` | Priority config, colors, labels, ordering |
| `sorting.ts` | Sort by date, priority; group by status/date |
| `filters.ts` | isOverdue, isDueToday, isUrgent, etc. |

## Task Priorities
| Priority | Color | Use Case |
|----------|-------|----------|
| Urgent | Red | Requires immediate attention |
| High | Orange | Important, time-sensitive |
| Medium | Yellow | Standard priority |
| Low | Green | Can be deferred |

## Filter Presets
- **Due Today** — Tasks with due date = today
- **Overdue** — Past due date, not completed
- **Urgent Alerts** — Priority = urgent, not completed
- **Completed Today** — Completed within last 24h

## Cross-Domain Consumers
- `patient-detail/TasksTab` — Shows patient-specific tasks
- `dashboard` — Shows task counts and urgent alerts
