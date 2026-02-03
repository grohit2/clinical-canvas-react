# Patient Registration — Dependencies

## Shared UI
- `@/shared/ui/Button`
- `@/shared/ui/Input`
- `@/shared/ui/Select`
- `@/shared/ui/DatePicker`
- `@/shared/ui/Card`
- `@/shared/ui/Dialog`
- `@/shared/ui/FileGrid`
- `@/shared/ui/AttachBar`
- `@/shared/ui/ImageUploader`

## Theme
- `@/theme` — useTheme

## Shared Hooks
- `@/shared/hooks/useBreakpoint`
- `@/shared/hooks/useToast`
- `@/shared/hooks/useUnsavedChanges`

## Shared Lib
- `@/shared/lib/api` — API client
- `@/shared/lib/ImageUploadS3` — S3 upload utility
- `@/shared/lib/utils` — formatDate, cn
- `@/shared/lib/flags` — Feature flags (patientFormV2)

## Cross-Domain Imports
- `@/domains/patient-list/core/types` — Patient base type
- `@/domains/patient-list/core/stage` — Initial stage assignment

## External Packages
- `@tanstack/react-query`
- `react-hook-form`
- `@hookform/resolvers/zod`
- `zod`
- `expo-image-picker`
- `expo-camera` (for photo capture)
