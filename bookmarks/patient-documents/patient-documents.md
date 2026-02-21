# Patient Documents Runtime - Web Feature Module
src/domains/patient-documents/index.ts
src/domains/patient-documents/api/index.ts
src/domains/patient-documents/api/documentsApi.ts
src/domains/patient-documents/core/index.ts
src/domains/patient-documents/core/categories.ts
src/domains/patient-documents/core/categoryMeta.ts
src/domains/patient-documents/core/mapFromApi.ts
src/domains/patient-documents/core/types.ts
src/domains/patient-documents/core/utils.ts
src/domains/patient-documents/core/waitForS3Event.ts
src/domains/patient-documents/web/index.ts
src/domains/patient-documents/web/categoryConfig.web.ts
src/domains/patient-documents/web/hooks/usePatientDocuments.ts
src/domains/patient-documents/web/components/CategoryChips.web.tsx
src/domains/patient-documents/web/components/DocumentCard.web.tsx
src/domains/patient-documents/web/components/DocumentGrid.web.tsx
src/domains/patient-documents/web/components/DocumentLightbox.web.tsx
src/domains/patient-documents/web/components/FolderCard.web.tsx
src/domains/patient-documents/web/pages/DocumentsFolderPage.web.tsx
src/domains/patient-documents/web/pages/DocumentsRootPage.web.tsx

# Patient Documents Runtime - Mobile Feature Module
src/domains/patient-documents/mobile/index.ts
src/domains/patient-documents/mobile/categoryConfig.native.ts
src/domains/patient-documents/mobile/hooks/useCategoryDocuments.ts
src/domains/patient-documents/mobile/hooks/useDocumentActions.ts
src/domains/patient-documents/mobile/hooks/useDocumentFolders.ts
src/domains/patient-documents/mobile/hooks/useDocumentSync.ts
src/domains/patient-documents/mobile/hooks/usePhotoCapture.ts
src/domains/patient-documents/mobile/offline/db.ts
src/domains/patient-documents/mobile/offline/fileCache.ts
src/domains/patient-documents/mobile/offline/merge.ts
src/domains/patient-documents/mobile/offline/sync.ts
src/domains/patient-documents/mobile/components/BackupBadge.native.tsx
src/domains/patient-documents/mobile/components/DocumentCard.native.tsx
src/domains/patient-documents/mobile/components/DocumentGrid.native.tsx
src/domains/patient-documents/mobile/components/DocumentLightbox.native.tsx
src/domains/patient-documents/mobile/components/FolderCard.native.tsx
src/domains/patient-documents/mobile/components/FolderSummaryGrid.native.tsx
src/domains/patient-documents/mobile/components/PhotoUploader.native.tsx
src/domains/patient-documents/mobile/screens/DocumentsFolderScreen.native.tsx
src/domains/patient-documents/mobile/screens/DocumentsRootScreen.native.tsx
src/domains/patient-documents/mobile/screens/ImportSharedToPatientScreen.native.tsx
src/domains/patient-documents/api/documentsApi.ts

# Patient Documents Routes and Entry Points
src/app/App.tsx
src/app/navigation.ts
apps/mobile/app/_layout.tsx
apps/mobile/app/import-shared.tsx
apps/mobile/app/patient/[id]/documents/index.tsx
apps/mobile/app/patient/[id]/documents/[category].tsx

# Patient Documents Cross-Feature Consumers
src/domains/patient-detail/components/PatientHeader.tsx
apps/mobile/app/(tabs)/patients.tsx
apps/mobile/app/(tabs)/patients/[id]/index.tsx
apps/mobile/app/patient/[id]/index.tsx

# Patient Documents Dependency Chain
src/lib/api.ts
src/shared/lib/api.ts
src/shared/lib/filesApi.ts
src/shared/lib/utils.ts
src/shared/components/layout/Header.tsx
src/shared/components/layout/BottomBar.tsx
src/shared/components/ui/button.tsx
src/shared/components/ui/alert-dialog.tsx
src/shared/components/ui/checkbox.tsx
src/domains/patient-registration/components/PhotoUploader.tsx
apps/mobile/src/lib/api.ts
apps/mobile/src/hooks/usePatients.ts
apps/mobile/src/lib/shareIntent-context.ts
apps/mobile/src/lib/shareIntent-provider.tsx
apps/mobile/src/navigation/tabBarStyle.ts
apps/mobile/app.json
apps/mobile/package.json
