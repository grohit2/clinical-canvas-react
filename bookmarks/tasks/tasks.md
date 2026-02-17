# Tasks Feature Runtime
src/domains/tasks/DEPENDENCIES.md
src/domains/tasks/README.md
src/domains/tasks/api/useCreateTask.ts
src/domains/tasks/api/useMyActivity.ts
src/domains/tasks/api/useTasks.ts
src/domains/tasks/api/useUndo.ts
src/domains/tasks/api/useUpdateTask.ts
src/domains/tasks/board/constants.ts
src/domains/tasks/board/patientLookup.ts
src/domains/tasks/board/selectors.ts
src/domains/tasks/board/types.ts
src/domains/tasks/components/PriorityBadge.tsx
src/domains/tasks/components/TaskBottomNav.native.tsx
src/domains/tasks/components/TaskBottomNav.tsx
src/domains/tasks/components/TaskCard.tsx
src/domains/tasks/components/TaskForm.tsx
src/domains/tasks/components/TaskList.tsx
src/domains/tasks/core/filters.ts
src/domains/tasks/core/priorities.ts
src/domains/tasks/core/sorting.ts
src/domains/tasks/core/types.ts
src/domains/tasks/hooks/useTaskFilters.ts
src/domains/tasks/hospital-board/components/BottomSheet.native.tsx
src/domains/tasks/hospital-board/components/StatsBar.native.tsx
src/domains/tasks/hospital-board/components/TableGroup.native.tsx
src/domains/tasks/hospital-board/components/TaskAuditLogView.native.tsx
src/domains/tasks/hospital-board/components/TaskCells.native.tsx
src/domains/tasks/hospital-board/components/TaskModal.native.tsx
src/domains/tasks/hospital-board/constants.ts
src/domains/tasks/index.ts
src/domains/tasks/learning.md
src/domains/tasks/local-ledger/db.native.ts
src/domains/tasks/local-ledger/db.ts
src/domains/tasks/local-ledger/internal/ops.mutate.ts
src/domains/tasks/local-ledger/internal/tasks.mutate.ts
src/domains/tasks/local-ledger/mappers.ts
src/domains/tasks/local-ledger/queries/locations.read.ts
src/domains/tasks/local-ledger/queries/ops.read.ts
src/domains/tasks/local-ledger/queries/patients.read.ts
src/domains/tasks/local-ledger/queries/tasks.read.ts
src/domains/tasks/local-ledger/services/automationService.ts
src/domains/tasks/local-ledger/services/commandService.ts
src/domains/tasks/local-ledger/services/demoSeedService.ts
src/domains/tasks/local-ledger/services/opService.ts
src/domains/tasks/local-ledger/services/undoService.ts
src/domains/tasks/local-ledger/types.ts
src/domains/tasks/local-ledger/utils/device.ts
src/domains/tasks/local-ledger/utils/ids.ts
src/domains/tasks/screens/AddTaskScreen.tsx
src/domains/tasks/screens/CompletedTodayScreen.tsx
src/domains/tasks/screens/EditTaskScreen.tsx
src/domains/tasks/screens/TaskBoardMobileScreen.native.tsx
src/domains/tasks/screens/TasksDueScreen.tsx
src/domains/tasks/screens/TasksScreen.tsx
src/domains/tasks/screens/UrgentAlertsScreen.tsx
src/domains/tasks/task architecture.md
src/domains/tasks/task_tasks.md

# Tasks Routes and Entry Points
src/app/App.tsx
src/app/navigation.ts
apps/mobile/app/(tabs)/_layout.tsx
apps/mobile/app/(tabs)/tasks.tsx

# Tasks Public API Importers
apps/mobile/app/(tabs)/tasks.tsx
src/app/App.tsx

# Tasks Cross-Feature Consumers
src/app/layout/AppShell.tsx
src/shared/components/layout/BottomBar.tsx

# Tasks Dependency Chain
src/shared/lib/api.ts
src/shared/types/api.ts
src/shared/components/layout/Header.tsx
src/shared/components/layout/BottomBar.tsx
apps/mobile/src/hooks/usePatients.ts
