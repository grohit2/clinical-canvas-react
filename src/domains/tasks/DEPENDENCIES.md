# Tasks — Dependencies

## Shared UI
- `@/shared/ui/Card`
- `@/shared/ui/Button`
- `@/shared/ui/Badge`
- `@/shared/ui/Input`
- `@/shared/ui/Textarea`
- `@/shared/ui/Select`
- `@/shared/ui/DatePicker`
- `@/shared/ui/Dialog`
- `@/shared/ui/Skeleton`

## Theme
- `@/theme` — useTheme

## Shared Hooks
- `@/shared/hooks/useBreakpoint`
- `@/shared/hooks/useToast`

## Shared Lib
- `@/shared/lib/api` — API client (api.tasks.*)
- `@/shared/lib/filesApi` — attachTaskFile, detachTaskFile
- `@/shared/lib/utils` — formatDate, cn

## Shared Types
- `@/shared/types/api` — Base Task interface
- `@/shared/types/models` — Simpler Task interface

## Cross-Domain Imports
- `@/domains/patient-list/core/types` — Patient (for patient selector)

## External Packages
- `@tanstack/react-query`
- `react-hook-form`
- `zod`
- `date-fns` (for date calculations)
