# Patient Documents Download + Offline + Gallery + Share: Full Engineering Prompt

Use this as the source-of-truth prompt when debugging or extending patient documents on mobile.
Goal: a new engineer should understand UI, data flow, sync queue, remote API, local cache, permissions, and known failure points without extra context.

## Scope
- Feature: patient documents in mobile app
- Critical flows:
  - Download Offline
  - Open/Preview docs
  - Gallery upload
  - Camera upload
  - Share selected docs
  - Sync/retry failed uploads
  - Import from OS share sheet

## Primary Route Entry Points
- `apps/mobile/app/patient/[id]/documents/index.tsx`
- `apps/mobile/app/patient/[id]/documents/[category].tsx`
- `apps/mobile/app/import-shared.tsx`
- `apps/mobile/app/_layout.tsx` (DB init + share-intent provider wiring)

## Cross-Feature Entrypoints into Documents
- `apps/mobile/app/patient/[id]/index.tsx`
- `apps/mobile/app/(tabs)/patients/[id]/index.tsx`
- `apps/mobile/app/(tabs)/patients.tsx` (documents sandbox route when empty list)

## UI Surfaces and Responsibilities
- `apps/mobile/src/domains/patient-documents/screens/DocumentsRootScreen.tsx`
  - Folder overview, online/offline badge, refresh, pending-backup banner
- `apps/mobile/src/domains/patient-documents/screens/DocumentsFolderScreen.tsx`
  - Action bar: Download Offline / Sync / Retry Failed
  - Selection mode: Share / Delete
  - Upload controls: Camera / Gallery
  - Open doc behavior: image lightbox or direct share
- `apps/mobile/src/domains/patient-documents/screens/ImportSharedToPatientScreen.tsx`
  - Import files received from Android/iOS share intent
- `apps/mobile/src/domains/patient-documents/components/PhotoUploader.tsx`
- `apps/mobile/src/domains/patient-documents/components/DocumentGrid.native.tsx`
- `apps/mobile/src/domains/patient-documents/components/DocumentCard.native.tsx`
- `apps/mobile/src/domains/patient-documents/components/DocumentLightbox.native.tsx`
- `apps/mobile/src/domains/patient-documents/components/FolderSummaryGrid.tsx`
- `apps/mobile/src/domains/patient-documents/components/FolderCard.tsx`
- `apps/mobile/src/domains/patient-documents/components/BackupBadge.tsx`

## Hook Layer (Orchestration)
- `apps/mobile/src/domains/patient-documents/hooks/useDocumentFolders.ts`
  - Query keys + folder summary list from local DB
- `apps/mobile/src/domains/patient-documents/hooks/useCategoryDocuments.ts`
  - Category-level docs query from local DB
- `apps/mobile/src/domains/patient-documents/hooks/useDocumentSync.ts`
  - Sync trigger on mount, reconnect, app foreground
  - Calls `refreshPatientDocuments` + `runSyncQueueOnce`
- `apps/mobile/src/domains/patient-documents/hooks/useDocumentActions.ts`
  - `downloadForOffline` -> `prefetchOfflineForDocuments`
  - `shareDocument/shareDocuments` -> `expo-sharing`
  - `deleteDocuments` -> queue delete + sync
  - `retryFailedUploads` -> reset failed docs + enqueue upload
- `apps/mobile/src/domains/patient-documents/hooks/usePhotoCapture.ts`
  - Camera permission + capture
  - Media library permission + gallery picker
  - Creates local docs then runs sync queue

## Offline + Data Layer (Core of Download/Upload)
- `apps/mobile/src/domains/patient-documents/offline/db.ts`
  - SQLite tables:
    - `documents` (remote + local cache metadata + backup/offline state)
    - `sync_queue` (upload/delete queue with retry count)
  - `initDocumentsDb()` is called in root layout at app startup
- `apps/mobile/src/domains/patient-documents/offline/fileCache.ts`
  - Cache root: `FileSystem.documentDirectory + "patient-docs/"`
  - Downloaded/offline files and local copies are stored here
- `apps/mobile/src/domains/patient-documents/offline/sync.ts`
  - `refreshPatientDocuments`: pull server docs and merge local state
  - `createLocalDocument`: creates local DB doc + queue upload
  - `ensureLocalFileForViewing`: downloads from presigned URL if missing
  - `prefetchOfflineForDocuments`: bulk offline download loop
  - `runSyncQueueOnce`: processes upload/delete actions with retry policy
- `apps/mobile/src/domains/patient-documents/offline/merge.ts`
  - Merges server state + local unsynced/cached state safely

## Remote API Layer
- `apps/mobile/src/domains/patient-documents/api/documentsApi.ts`
  - `/patients/:id/documents`
  - `/patients/:id/documents/init`
  - `/patients/:id/files/presign-upload`
  - `/patients/:id/files/presign-download`
  - `/patients/:id/documents/attach`
  - `/patients/:id/documents/detach`
- `apps/mobile/src/lib/api.ts`
  - Base URL resolution:
    - Web: `http://localhost:3001` (local proxy)
    - Mobile: `expoConfig.extra.apiBaseUrl || EXPO_PUBLIC_API_BASE_URL || DEFAULT_REMOTE_API`
  - Android localhost normalization to `10.0.2.2`

## Share Intent Integration (Remote App -> Clinical Canvas)
- `apps/mobile/src/lib/shareIntent-provider.tsx`
- `apps/mobile/src/lib/shareIntent-context.ts`
- `apps/mobile/app/_layout.tsx`
  - Detects share intent and routes to `/import-shared`

## Config + Permissions + Runtime Dependencies
- `apps/mobile/app.json`
  - Plugin `expo-image-picker` with camera/photos permission strings
  - Plugins used by docs feature:
    - `expo-image-picker`
    - `expo-sqlite`
    - `expo-share-intent`
    - `expo-secure-store`
- `apps/mobile/package.json`
  - Runtime deps used in docs path:
    - `expo-file-system`
    - `expo-sharing`
    - `expo-image-picker`
    - `expo-sqlite`
    - `expo-share-intent`
    - `@react-native-community/netinfo`
    - `uuid`

## Flow Map (Call Chain)

### Download Offline
1. UI tap in `DocumentsFolderScreen` -> `downloadForOffline(documents)`
2. `useDocumentActions.downloadForOffline` -> `prefetchOfflineForDocuments`
3. `prefetchOfflineForDocuments` loops docs and calls `ensureLocalFileForViewing`
4. `ensureLocalFileForViewing`:
   - uses existing `localUri` if available
   - else calls `presignDownload` (if needed)
   - downloads via `fileCache.ensureDownloaded`
   - updates DB (`offlineState`, `localUri`)
5. UI shows alert on partial/full failure

### Gallery Upload
1. `PhotoUploader` gallery tap -> `usePhotoCapture.pickFromGallery`
2. Permission request via `ImagePicker.requestMediaLibraryPermissionsAsync`
3. `launchImageLibraryAsync`
4. `persistAssets` -> `createLocalDocument` per asset
5. `createLocalDocument` writes local cache file + DB row + enqueue upload
6. `runSyncQueueOnce` uploads queued items

### Share Selected
1. Selection mode in `DocumentsFolderScreen` -> `shareDocuments(selectedDocs)`
2. `useDocumentActions.shareDocuments` shares first file only
3. `shareDocument` calls `ensureLocalFileForViewing` then `Sharing.shareAsync`

## Known Current Runtime Failures (Android Validation)
- Offline download dialog: `"Offline download complete: 0 downloaded, 15 failed."`
- Gallery import: `"Upload failed: Could not import selected photo(s). Please try again."`
- Share from selected docs: share sheet does not open (stays on same screen)
- Observed JS/runtime signal:
  - `gallery pick failed [Error: crypto.getRandomValues() not supported ...]`
  - Relevant code path currently using UUID:
    - `apps/mobile/src/domains/patient-documents/offline/sync.ts`
    - `import { v4 as uuidv4 } from 'uuid'`
    - `const id = uuidv4();`

## High-Value Debug Targets
- `apps/mobile/src/domains/patient-documents/offline/sync.ts`
- `apps/mobile/src/domains/patient-documents/hooks/usePhotoCapture.ts`
- `apps/mobile/src/domains/patient-documents/hooks/useDocumentActions.ts`
- `apps/mobile/src/domains/patient-documents/offline/fileCache.ts`
- `apps/mobile/src/domains/patient-documents/api/documentsApi.ts`
- `apps/mobile/src/lib/api.ts`
- `apps/mobile/app.json`
- `apps/mobile/app/_layout.tsx`

## Tests + Non-mobile Parity References
- `src/domains/patient-documents/__tests__/DocumentsRootScreen.test.tsx`
- `src/domains/patient-documents/__tests__/DocumentGrid.test.tsx`
- `src/domains/patient-documents/__tests__/DocumentLightbox.test.tsx`
- `src/domains/patient-documents/core/__tests__/mapFromApi.test.ts`
- `src/domains/patient-documents/core/__tests__/types.test.ts`

## Execution Checklist for Any Documents Download Task
- Confirm route and patient/category context
- Confirm permission prompts and grant status
- Confirm local DB init (`initDocumentsDb`) happened
- Confirm `getApiBaseUrl()` resolves correctly for current platform
- Confirm presign upload/download responses are valid
- Confirm file cache path creation and file existence
- Confirm sync queue enqueue/dequeue/retry behavior
- Confirm share path has local file URI before `shareAsync`
