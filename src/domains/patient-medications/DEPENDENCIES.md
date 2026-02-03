# Patient Medications — Dependencies

## Shared UI
- `@/shared/ui/Card`
- `@/shared/ui/Button`
- `@/shared/ui/Badge`
- `@/shared/ui/Input`
- `@/shared/ui/Select`
- `@/shared/ui/Dialog`
- `@/shared/ui/Skeleton`

## Theme
- `@/theme` — useTheme

## Shared Hooks
- `@/shared/hooks/useBreakpoint`
- `@/shared/hooks/useToast`

## Shared Lib
- `@/shared/lib/api` — API client (api.meds.*)
- `@/shared/lib/filesApi` — attachMedFile, detachMedFile
- `@/shared/lib/utils` — formatDate, cn

## Shared Types
- `@/shared/types/api` — Base Medication interface

## Cross-Domain Imports
- `@/domains/patient-list/core/types` — Patient (for patient context)

## External Packages
- `@tanstack/react-query`
- `react-hook-form`
- `zod`
