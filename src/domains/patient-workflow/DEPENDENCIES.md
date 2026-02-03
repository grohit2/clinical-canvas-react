# Patient Workflow — Dependencies

## Shared UI
- `@/shared/ui/Card`
- `@/shared/ui/Button`
- `@/shared/ui/Checkbox`
- `@/shared/ui/Badge`
- `@/shared/ui/Tabs`
- `@/shared/ui/Dialog`
- `@/shared/ui/Skeleton`

## Theme
- `@/theme` — useTheme, zone colors

## Shared Hooks
- `@/shared/hooks/useBreakpoint`
- `@/shared/hooks/useToast`

## Shared Lib
- `@/shared/lib/api` — API client
- `@/shared/lib/utils` — formatDate, cn

## Cross-Domain Imports
- `@/domains/patient-list/core/types` — Patient, PatientStage
- `@/domains/patient-detail` — LabsOverviewCard, MedsTab, TasksTab
- `@/domains/discharge-summary` — Navigation to discharge summary

## External Packages
- `@tanstack/react-query`
- `react-native-reanimated` (for stepper animations)
