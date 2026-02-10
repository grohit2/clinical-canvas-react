## Relevant Files

- `apps/mobile/package.json` - Add React Native/Expo dependencies for offline docs, sync, sharing, and date/time inputs.
- `apps/mobile/app.json` - Register app scheme and plugins (including share intent) required for inbound sharing.
- `apps/mobile/babel.config.js` - Add module resolver aliases and Reanimated plugin configuration for gesture/lightbox support.
- `apps/mobile/app/_layout.tsx` - Wire global providers (QueryClient, onlineManager bridge, DB init, share-intent provider).
- `apps/mobile/src/lib/api.ts` - Ensure robust API base URL resolution for simulator/device/emulator environments.
- `apps/mobile/src/lib/storage.ts` - Keep cache-first support for non-document modules and shared persistence utilities.
- `apps/mobile/app/patient/[id]/documents/index.tsx` - Route entry for patient document folder summary.
- `apps/mobile/app/patient/[id]/documents/[category].tsx` - Route entry for per-category document grid.
- `apps/mobile/app/import-shared.tsx` - Modal/screen route for WhatsApp share-intent imports.
- `apps/mobile/src/domains/patient-documents/core/types.ts` - Canonical mobile document types including backup/offline status fields.
- `apps/mobile/src/domains/patient-documents/core/mapFromApi.ts` - API-to-domain mapping and normalization for document metadata.
- `apps/mobile/src/domains/patient-documents/core/categoryConfig.ts` - Category labels, icons, gradients, and ordering.
- `apps/mobile/src/domains/patient-documents/offline/db.ts` - SQLite initialization, schema, indexes, and repository functions.
- `apps/mobile/src/domains/patient-documents/offline/fileCache.ts` - Local file pathing, cache lookup, download, and prefetch helpers.
- `apps/mobile/src/domains/patient-documents/offline/merge.ts` - Server/local merge rules preserving unsynced local files.
- `apps/mobile/src/domains/patient-documents/offline/sync.ts` - Sync queue processing, upload/delete orchestration, retry, and state transitions.
- `apps/mobile/src/domains/patient-documents/hooks/useDocumentFolders.ts` - Folder summary query hook (SQLite-first, online refresh merge).
- `apps/mobile/src/domains/patient-documents/hooks/useCategoryDocuments.ts` - Category document query hook (SQLite-first).
- `apps/mobile/src/domains/patient-documents/hooks/useDocumentSync.ts` - Connectivity/app-state sync trigger hook.
- `apps/mobile/src/domains/patient-documents/hooks/useDocumentActions.ts` - Share, delete, download-for-offline, retry actions.
- `apps/mobile/src/domains/patient-documents/hooks/usePhotoCapture.ts` - Camera/gallery capture flow and offline queue enqueue.
- `apps/mobile/src/domains/patient-documents/components/BackupBadge.tsx` - Backup/offline indicator pill UI.
- `apps/mobile/src/domains/patient-documents/components/DocumentCard.native.tsx` - Grid card with thumbnail, selection state, and status badges.
- `apps/mobile/src/domains/patient-documents/components/DocumentGrid.native.tsx` - FlatList-based responsive grid with selection mode.
- `apps/mobile/src/domains/patient-documents/components/DocumentLightbox.native.tsx` - Pinch/pan/swipe lightbox viewer.
- `apps/mobile/src/domains/patient-documents/components/FolderCard.tsx` - Folder-level summary card with pending backup count.
- `apps/mobile/src/domains/patient-documents/components/FolderSummaryGrid.tsx` - Category folder grid for root document screen.
- `apps/mobile/src/domains/patient-documents/components/PhotoUploader.tsx` - Camera/gallery picker and upload trigger controls.
- `apps/mobile/src/domains/patient-documents/screens/DocumentsRootScreen.tsx` - Patient-level folder summary screen.
- `apps/mobile/src/domains/patient-documents/screens/DocumentsFolderScreen.tsx` - Category-level grid screen with actions and lightbox.
- `apps/mobile/src/domains/patient-documents/screens/ImportSharedToPatientScreen.tsx` - Assign inbound shared files to patient/category and queue backup.
- `src/shared/lib/filesApi.ts` - Reuse/extend existing backend document API contracts (presign, list, detach).
- `src/shared/lib/docsWaitForEvent.ts` - Reuse materialization waiting logic where applicable in mobile sync completion.
- `apps/mobile/src/domains/patient-documents/offline/__tests__/db.test.ts` - Unit tests for SQLite repository behavior.
- `apps/mobile/src/domains/patient-documents/offline/__tests__/fileCache.test.ts` - Unit tests for cache pathing/download/prefetch behavior.
- `apps/mobile/src/domains/patient-documents/offline/__tests__/merge.test.ts` - Unit tests for server/local merge conflict rules.
- `apps/mobile/src/domains/patient-documents/offline/__tests__/sync.test.ts` - Unit tests for queue processing and state transitions.
- `apps/mobile/src/domains/patient-documents/core/__tests__/mapFromApi.test.ts` - Unit tests for API mapping compatibility.
- `apps/mobile/src/domains/patient-documents/components/__tests__/BackupBadge.test.tsx` - Component tests for backup state rendering.
- `apps/mobile/src/domains/patient-documents/components/__tests__/DocumentGrid.test.tsx` - Component tests for selection and empty/grid states.
- `apps/mobile/src/domains/patient-documents/components/__tests__/DocumentLightbox.test.tsx` - Component tests for navigation and zoom reset behaviors.

### Notes

- Keep the two-tier offline rule from the plan: full offline-first only for Patient Documents; cache-first persistence for other modules.
- Preserve reusable pure TypeScript logic from the web domain where possible (`types`, `mapFromApi`, category metadata) and only replace web-specific UI/router code.
- Unit tests should typically be placed alongside the code files they are testing (same feature directory).
- This repository currently uses Vitest at root; run targeted tests with `npx vitest [optional/path/to/test/file]`.
- If a Jest-based RN test setup is introduced for mobile UI tests, use `npx jest [optional/path/to/test/file]`.
- WhatsApp inbound sharing requires a development build (not Expo Go); include that in QA and release readiness checks.

## Tasks

- [ ] 1.0 Establish patient-documents mobile foundation in Expo Router
  - [ ] 1.1 Finalize mobile route structure for patient document flows (folder summary, category screen, import-shared modal) using Expo Router.
  - [ ] 1.2 Install and configure required dependencies from the unified plan (SQLite, NetInfo, sharing, image picker, gesture/reanimated, query persistence utilities).
  - [ ] 1.3 Update `app.json`/plugins/scheme and bootstrap providers in root layout (Query client + online state + share intent + DB initialization).
  - [ ] 1.4 Set up aliasing/config conventions so mobile code can reuse shared domain logic cleanly without path drift.
  - [ ] 1.5 Verify API base URL strategy across iOS simulator, Android emulator (`10.0.2.2`), and physical devices on LAN.

- [ ] 2.0 Build the offline-first data layer (SQLite schema, repository functions, file cache paths)
  - [ ] 2.1 Extend document domain types for `backupState` and `offlineState`, plus local file URIs and sync error metadata.
  - [ ] 2.2 Implement SQLite schema (`documents`, `sync_queue`) with indexes and WAL mode for reliable local-first reads/writes.
  - [ ] 2.3 Implement repository APIs for folder summaries, category document lists, upsert/patch operations, and queue management.
  - [ ] 2.4 Build deterministic file-cache helpers for thumbnail/full variants and patient-scoped local directories.
  - [ ] 2.5 Add download/prefetch support for “Download Offline” behavior and update offline availability state in SQLite.
  - [ ] 2.6 Adapt API mapping functions to merge remote payloads with preserved local metadata (e.g., local URIs and pending status).

- [ ] 3.0 Implement sync orchestration (queue processing, API merge, retry/error states, NetInfo triggers)
  - [ ] 3.1 Implement sync engine loop to process queue actions sequentially (`upload`, `delete`) with idempotent behavior.
  - [ ] 3.2 Integrate presign + upload + materialization confirmation + metadata update pipeline for reliable S3-backed uploads.
  - [ ] 3.3 Implement online merge flow: fetch server docs, merge into SQLite, preserve unsynced local docs, invalidate relevant queries.
  - [ ] 3.4 Add robust retry/error handling (retry counts, terminal error state, “retry failed uploads” action).
  - [ ] 3.5 Trigger sync on connectivity restoration, app foreground, and manual refresh while preventing overlapping runs.
  - [ ] 3.6 Implement offline delete semantics (local-first UI update with deferred server detach).

- [ ] 4.0 Deliver Patient Documents UI in React Native (folder summary, category view, grid cards, lightbox, backup badges)
  - [ ] 4.1 Build category configuration and folder summary cards (icons, gradients, counts, pending backup badge).
  - [ ] 4.2 Implement `BackupBadge` states: Backed up, Not backed up, Pending, Error, plus offline pin indicator.
  - [ ] 4.3 Implement `DocumentCard.native` and `DocumentGrid.native` with selection mode, delete affordance, and local/remote thumbnail fallbacks.
  - [ ] 4.4 Implement `DocumentsRootScreen` (folder-level dashboard with pending status and navigation to category screens).
  - [ ] 4.5 Implement `DocumentsFolderScreen` (grid, pull-to-refresh, download offline, selection toolbar, share/delete actions).
  - [ ] 4.6 Implement `DocumentLightbox.native` with pinch/pan/double-tap/swipe behavior and robust reset between documents.

- [ ] 5.0 Add document capture/import/export flows (camera/gallery ingest, share out, share-intent import to patient/category)
  - [ ] 5.1 Build photo capture and gallery ingestion flow (permissions + file normalization + local copy).
  - [ ] 5.2 On capture/import, create local document rows immediately, mark pending backup, enqueue upload, and refresh UI optimistically.
  - [ ] 5.3 Implement outbound sharing with confirm dialog + audit logging, using local file guarantee before opening share sheet.
  - [ ] 5.4 Implement inbound share-intent handling (WhatsApp/files) with patient and category selection before persistence.
  - [ ] 5.5 Build import screen UX for previewing shared files, duplicate checks, and user confirmation before enqueue.
  - [ ] 5.6 Validate import/export flows on Android and iOS development builds.

- [ ] 6.0 Add validation and rollout hardening (unit tests, integration checks, telemetry/audit hooks, edge-case handling)
  - [ ] 6.1 Add unit tests for DB repository, cache service, merge rules, and sync engine transitions.
  - [ ] 6.2 Add component tests for backup badges, grid selection behavior, and lightbox navigation state resets.
  - [ ] 6.3 Execute offline reliability test matrix (airplane mode capture, reconnect sync, queued delete replay, server merge correctness).
  - [ ] 6.4 Add telemetry/audit events for external share actions and sync failures for operational visibility.
  - [ ] 6.5 Add safeguards for edge cases from the plan (large files, low storage, duplicate imports, network flapping).
  - [ ] 6.6 Update mobile/domain READMEs with operational runbook and constraints (Expo Go limits, dev build requirements, retry semantics).
