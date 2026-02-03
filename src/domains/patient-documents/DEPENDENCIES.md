# Patient Documents — Dependencies

## Shared UI
- `@/shared/ui/Card`
- `@/shared/ui/Button`
- `@/shared/ui/Badge`
- `@/shared/ui/Skeleton`
- `@/shared/ui/Dialog`
- `@/shared/ui/FileGrid`
- `@/shared/ui/ImageUploader`

## Theme
- `@/theme` — useTheme

## Shared Hooks
- `@/shared/hooks/useBreakpoint`
- `@/shared/hooks/useToast`
- `@/shared/hooks/useUploader`

## Shared Lib
- `@/shared/lib/api` — API client
- `@/shared/lib/filesApi` — File upload/download utilities
- `@/shared/lib/ImageUploadS3` — S3 upload utility
- `@/shared/lib/image` — Image processing helpers
- `@/shared/lib/utils` — formatDate, cn

## Cross-Domain Imports
- `@/domains/patient-list/core/types` — Patient base type (for patientId)

## External Packages
- `@tanstack/react-query`
- `expo-image`
- `expo-file-system`
- `expo-sharing`
- `react-native-gesture-handler` (for lightbox gestures)
