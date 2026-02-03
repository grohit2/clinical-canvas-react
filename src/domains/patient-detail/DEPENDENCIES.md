# Patient Detail — Dependencies

## Shared UI
- `@/shared/ui/Card`
- `@/shared/ui/Badge`
- `@/shared/ui/Button`
- `@/shared/ui/Tabs`
- `@/shared/ui/Skeleton`
- `@/shared/ui/Avatar`
- `@/shared/ui/Dialog`

## Theme
- `@/theme` — useTheme, useZoneColors

## Shared Hooks
- `@/shared/hooks/useBreakpoint`
- `@/shared/hooks/useToast`

## Shared Lib
- `@/shared/lib/api` — API client
- `@/shared/lib/utils` — formatDate, cn

## Cross-Domain Imports
- `@/domains/patient-list/core/types` — Patient, PatientStage
- `@/domains/patient-list/core/stage` — getStageConfig, getStageZoneColor
- `@/domains/tasks` — TaskCard (in TasksTab)
- `@/domains/patient-notes` — NoteCard (in NotesTab)
- `@/domains/patient-medications` — MedicationCard (in MedsTab)

## External Packages
- `@tanstack/react-query`
- `react-native-reanimated`
- `expo-image`
- `react-native-qrcode-svg` (QR view)
