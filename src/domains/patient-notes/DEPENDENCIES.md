# Patient Notes — Dependencies

## Shared UI
- `@/shared/ui/Card`
- `@/shared/ui/Button`
- `@/shared/ui/Badge`
- `@/shared/ui/Input`
- `@/shared/ui/Textarea`
- `@/shared/ui/Select`
- `@/shared/ui/Dialog`
- `@/shared/ui/Skeleton`

## Theme
- `@/theme` — useTheme

## Shared Hooks
- `@/shared/hooks/useBreakpoint`
- `@/shared/hooks/useToast`

## Shared Lib
- `@/shared/lib/api` — API client (api.notes.*)
- `@/shared/lib/filesApi` — attachNoteFile, detachNoteFile, listFiles
- `@/shared/lib/ImageUploadS3` — S3 upload for attachments
- `@/shared/lib/utils` — formatDate, cn

## Shared Types
- `@/shared/types/api` — Base Note interface

## Cross-Domain Imports
- `@/domains/patient-list/core/types` — Patient (for patient context)

## External Packages
- `@tanstack/react-query`
- `react-hook-form`
- `zod`
