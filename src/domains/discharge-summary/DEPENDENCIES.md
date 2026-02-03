# Discharge Summary — Dependencies

## Shared UI
- `@/shared/ui/Card`
- `@/shared/ui/Button`
- `@/shared/ui/Input`
- `@/shared/ui/Textarea`
- `@/shared/ui/Select`
- `@/shared/ui/DatePicker`
- `@/shared/ui/Dialog`

## Theme
- `@/theme` — useTheme

## Shared Hooks
- `@/shared/hooks/useBreakpoint`
- `@/shared/hooks/useToast`

## Shared Lib
- `@/shared/lib/api` — API client (api.discharge.*)
- `@/shared/lib/utils` — formatDate, cn

## Shared Types
- `@/shared/types/api` — DischargeSummaryVersion (API response type)

## Cross-Domain Imports
- `@/domains/patient-list/core/types` — Patient base type
- `@/domains/patient-detail` — Patient context

## External Packages
- `@tanstack/react-query`
- `docx` — DOCX file generation
- `file-saver` — File download utility
