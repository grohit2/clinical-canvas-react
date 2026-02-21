# Tasks Domain

## Purpose
Manages clinical tasks and alerts across the hospital. Supports task creation,
assignment, prioritization, filtering, and completion tracking.

## Screens
| Screen | Route | Description |
|--------|-------|-------------|
| TaskBoardScreen (web) | `/tasks` | Main task board with status filters |
| TaskBoardScreen (native) | native app | Multi-view task board (ward/patient/doctor/etc.) |
| AddTaskScreen | `/patients/:id/add-task` | Create task for a patient (REST API) |
| EditTaskScreen | `/patients/:id/tasks/:taskId/edit` | Edit existing patient task (REST API) |

## Components
| Component | Description |
|-----------|-------------|
| TaskCard | Single task display with priority badge |
| TaskList | List container with empty state |
| PriorityBadge | Visual priority indicator |
| TaskBottomNav | Bottom tab nav used by task board screens |

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
- **Due Today** — `/tasks?preset=due-today`
- **Urgent Alerts** — `/tasks?preset=urgent`
- **Completed Today** — `/tasks?preset=completed-today`

## Cross-Domain Consumers
- `patient-detail/TasksTab` — Shows patient-specific tasks
- `dashboard` — Shows task counts and urgent alerts
