===============================
date: 2026-02-22
what all changes
- Added broad file-kind and MIME inference for image, video, pdf, word, spreadsheet, presentation, dicom, and text so uploads and API documents are classified consistently.
- Updated API-to-domain mapping to avoid using full file URL as thumbnail for non-image files so non-image tiles do not attempt broken image rendering.
- Expanded mobile capture and gallery import to accept both images and videos so clinical photo and video evidence can be captured in the same flow.
- Implemented non-image open flow in document actions using local viewer first, remote URL fallback second, and share fallback last so attachments open reliably.
- Restricted lightbox navigation datasets to image-only items so swipe/next/prev behavior is stable and avoids non-image preview failures.
- Added mobile gallery and card visual type labels for non-image files so users can identify file type before opening.
- Added mobile video tile rendering with first-frame thumbnail generation and centered play badge so video items appear visually similar to image tiles.
- Added mobile background thumbnail generation for videos during local creation and offline prefetch so both new and synced videos gain preview frames.
- Updated auto-prefetch logic to include documents that still need video thumbnails so preview generation completes without manual user action.
- Added web video card preview with play overlay while keeping non-preview documents opening in a new tab so web behavior matches mixed-media expectations.
- Added web lightbox video support and preserved image zoom/pan logic only for images so each media type uses appropriate interaction.
- Added expo-video-thumbnails dependency to support deterministic first-frame extraction for mobile video previews.
- Verified changes with repo typecheck, mobile app typecheck, and targeted lint so integration is consistent across touched modules.

====================================

===============================
date: 2026-02-22
what all changes
- Documents folder screen top bar was refactored to match the same header system used in Patients and Dashboard so navigation feels consistent across document flows.
- Patient detail top bar layout was normalized across both patient detail routes to avoid different behavior/styles between route entry points.
- Patient detail top bar back button was removed to match the requested product flow and reduce duplicate navigation controls.
- Main app bottom tab icons were pinned to a consistent size and the Tasks bottom navigation was aligned to the same text size, color system, and spacing for uniform visual behavior.
- Tasks screen top header was redesigned from gradient/ledger style into the standard light header pattern, and undo/local-ledger messaging was removed to keep language product-focused.
- Task table collapse interaction was simplified by removing the dedicated collapse control and using table-title tap as the single collapse/expand trigger.
- Task table headers now include a right-side 3-dot menu button with per-table action scaffolding and working sort options (default, priority, time) to support immediate usability and future extensibility.
- Per-table sorting now reorders only the selected table rows and keeps task selection/row actions intact to avoid cross-section side effects.
- Task board top Add Task button was removed from the board action row to reduce visual clutter while keeping creation through existing lower add actions.

====================================

============================================

date  commit version
goal
reasons
changes

what files were wouched
.planning/changelog.md
.planning/changelogPM.md
apps/mobile/app/(tabs)/_layout.tsx
apps/mobile/app/(tabs)/patients/[id]/index.tsx
apps/mobile/app/patient/[id]/index.tsx
src/domains/patient-documents/mobile/screens/DocumentsFolderScreen.native.tsx
src/domains/tasks/components/native/TableGroup.native.tsx
src/domains/tasks/components/native/TaskBottomNav.native.tsx
src/domains/tasks/screens/native/TaskBoardScreen.native.tsx
=========================================

============================================

date  commit version
goal
reasons
changes

what files were wouched
.planning/changelog.md
.planning/changelogPM.md
apps/mobile/package.json
package.json
pnpm-lock.yaml
src/domains/patient-documents/core/mapFromApi.ts
src/domains/patient-documents/core/utils.ts
src/domains/patient-documents/mobile/components/DocumentCard.native.tsx
src/domains/patient-documents/mobile/components/ThumbnailRow.native.tsx
src/domains/patient-documents/mobile/hooks/useDocumentActions.ts
src/domains/patient-documents/mobile/hooks/usePhotoCapture.ts
src/domains/patient-documents/mobile/offline/sync.ts
src/domains/patient-documents/mobile/screens/DocumentsFolderScreen.native.tsx
src/domains/patient-documents/mobile/screens/DocumentsRootScreen.native.tsx
src/domains/patient-documents/web/components/DocumentCard.web.tsx
src/domains/patient-documents/web/components/DocumentGrid.web.tsx
src/domains/patient-documents/web/components/DocumentLightbox.web.tsx
=========================================

============================================

date  commit version
goal
reasons
changes

what files were wouched
src/app/layout/AppShell.tsx
src/domains/dashboard/screens/DashboardScreen.tsx
src/domains/discharge-summary/screens/DischargeSummaryScreen.tsx
src/domains/patient-detail/components/PatientQRView.tsx
src/domains/patient-detail/screens/PatientDetailScreen.tsx
src/domains/patient-documents/web/pages/DocumentsFolderPage.web.tsx
src/domains/patient-documents/web/pages/DocumentsRootPage.web.tsx
src/domains/patient-list/screens/PatientListScreen.tsx
src/domains/patient-medications/screens/AddMedicationScreen.tsx
src/domains/patient-medications/screens/EditMedicationScreen.tsx
src/domains/patient-notes/screens/AddNoteScreen.tsx
src/domains/patient-registration/screens/AddMrnScreen.tsx
src/domains/patient-workflow/components/WorkflowLayout.tsx
src/domains/profile/screens/ProfileScreen.tsx
src/domains/referrals/screens/ReferralsScreen.tsx
src/domains/tasks/screens/web/AddTaskScreen.tsx
src/domains/tasks/screens/web/EditTaskScreen.tsx
src/domains/tasks/screens/web/TaskBoardScreen.tsx
src/shared/components/layout/PageShell.tsx
src/shared/hooks/usePullToSearch.ts
=========================================

============================================

date  commit version
goal
reasons
changes

what files were wouched
.planning/changelog.md
src/app/layout/AppShell.tsx
src/domains/dashboard/screens/DashboardScreen.tsx
src/domains/discharge-summary/screens/DischargeSummaryScreen.tsx
src/domains/patient-detail/components/PatientQRView.tsx
src/domains/patient-detail/screens/PatientDetailScreen.tsx
src/domains/patient-documents/web/pages/DocumentsFolderPage.web.tsx
src/domains/patient-documents/web/pages/DocumentsRootPage.web.tsx
src/domains/patient-list/screens/PatientListScreen.tsx
src/domains/patient-medications/screens/AddMedicationScreen.tsx
src/domains/patient-medications/screens/EditMedicationScreen.tsx
src/domains/patient-notes/screens/AddNoteScreen.tsx
src/domains/patient-registration/screens/AddMrnScreen.tsx
src/domains/patient-workflow/components/WorkflowLayout.tsx
src/domains/profile/screens/ProfileScreen.tsx
src/domains/referrals/screens/ReferralsScreen.tsx
src/domains/tasks/screens/web/AddTaskScreen.tsx
src/domains/tasks/screens/web/EditTaskScreen.tsx
src/domains/tasks/screens/web/TaskBoardScreen.tsx
src/shared/components/layout/PageShell.tsx
src/shared/hooks/usePullToSearch.ts
=========================================
