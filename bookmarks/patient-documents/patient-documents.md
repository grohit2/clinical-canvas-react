# Patient Documents Feature - Mobile Runtime
apps/mobile/src/domains/patient-documents/api/documentsApi.ts
apps/mobile/src/domains/patient-documents/components/BackupBadge.tsx
apps/mobile/src/domains/patient-documents/components/DocumentCard.native.tsx
apps/mobile/src/domains/patient-documents/components/DocumentGrid.native.tsx
apps/mobile/src/domains/patient-documents/components/DocumentLightbox.native.tsx
apps/mobile/src/domains/patient-documents/components/FolderCard.tsx
apps/mobile/src/domains/patient-documents/components/FolderSummaryGrid.tsx
apps/mobile/src/domains/patient-documents/components/PhotoUploader.tsx
apps/mobile/src/domains/patient-documents/core/categoryConfig.ts
apps/mobile/src/domains/patient-documents/core/mapFromApi.ts
apps/mobile/src/domains/patient-documents/core/types.ts
apps/mobile/src/domains/patient-documents/hooks/useCategoryDocuments.ts
apps/mobile/src/domains/patient-documents/hooks/useDocumentActions.ts
apps/mobile/src/domains/patient-documents/hooks/useDocumentFolders.ts
apps/mobile/src/domains/patient-documents/hooks/useDocumentSync.ts
apps/mobile/src/domains/patient-documents/hooks/usePhotoCapture.ts
apps/mobile/src/domains/patient-documents/index.ts
apps/mobile/src/domains/patient-documents/offline/db.ts
apps/mobile/src/domains/patient-documents/offline/fileCache.ts
apps/mobile/src/domains/patient-documents/offline/merge.ts
apps/mobile/src/domains/patient-documents/offline/sync.ts
apps/mobile/src/domains/patient-documents/screens/DocumentsFolderScreen.tsx
apps/mobile/src/domains/patient-documents/screens/DocumentsRootScreen.tsx
apps/mobile/src/domains/patient-documents/screens/ImportSharedToPatientScreen.tsx

# Patient Documents Routes and Entry Points - Mobile
apps/mobile/app/patient/[id]/documents/index.tsx
apps/mobile/app/patient/[id]/documents/[category].tsx
apps/mobile/app/import-shared.tsx

# Patient Documents Cross-Feature Consumers - Mobile
apps/mobile/app/patient/[id]/index.tsx
apps/mobile/app/(tabs)/patients.tsx
apps/mobile/app/_layout.tsx

# Patient Documents Dependency Chain - Mobile
apps/mobile/src/hooks/usePatients.ts
apps/mobile/src/lib/api.ts
apps/mobile/src/lib/shareIntent-context.ts
apps/mobile/src/lib/shareIntent-provider.tsx
apps/mobile/app.json
apps/mobile/package.json

# Patient Documents Feature - Web Runtime (Legacy)
src/domains/patient-documents/DEPENDENCIES.md
src/domains/patient-documents/README.md
src/domains/patient-documents/api/usePatientDocuments.ts
src/domains/patient-documents/components/CategoryChips.tsx
src/domains/patient-documents/components/DocumentCard.tsx
src/domains/patient-documents/components/DocumentGrid.tsx
src/domains/patient-documents/components/DocumentLightbox.tsx
src/domains/patient-documents/components/FolderCard.tsx
src/domains/patient-documents/components/index.ts
src/domains/patient-documents/core/CategoryConfig.ts
src/domains/patient-documents/core/mapFromApi.ts
src/domains/patient-documents/core/types.ts
src/domains/patient-documents/core/waitForS3Event.ts
src/domains/patient-documents/index.ts
src/domains/patient-documents/screens/DocumentsFolderScreen.tsx
src/domains/patient-documents/screens/DocumentsRootScreen.tsx

# Patient Documents Routes and Consumers - Web
src/app/App.tsx
src/app/navigation.ts

# Patient Documents Dependency Chain - Web
src/shared/lib/filesApi.ts
src/shared/lib/api.ts
src/shared/lib/utils.ts
src/shared/components/layout/Header.tsx
src/shared/components/layout/BottomBar.tsx
src/shared/components/ui/button.tsx
src/shared/components/ui/checkbox.tsx
src/domains/patient-registration/components/PhotoUploader.tsx
