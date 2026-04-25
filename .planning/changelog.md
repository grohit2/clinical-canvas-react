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

============================================

date  commit version
goal
reasons
changes

what files were wouched
package-lock.json
=========================================

============================================

date  commit version
goal
reasons
changes

what files were wouched
src/app/layout/AppShell.tsx
src/app/layout/index.ts
src/domains/dashboard/screens/DashboardScreen.tsx
src/domains/patient-list/screens/PatientListScreen.tsx
src/domains/profile/screens/ProfileScreen.tsx
src/shared/components/layout/PageShell.tsx
src/shared/hooks/usePullToSearch.ts
=========================================

============================================

date  commit version
goal
reasons
changes

what files were wouched
src/app/layout/AppShell.tsx
src/domains/profile/screens/ProfileScreen.tsx
=========================================

============================================

date  commit version
goal
reasons
changes

what files were wouched
apps/mobile/app/(tabs)/patients.tsx
apps/mobile/package.json
apps/mobile/src/lib/haptics.ts
pnpm-lock.yaml
src/index.css
src/shared/components/layout/PageShell.tsx
=========================================

============================================

date  commit version
goal
reasons
changes

what files were wouched
apps/mobile/app/(tabs)/patients.tsx
apps/mobile/package.json
apps/mobile/src/lib/haptics.ts
pnpm-lock.yaml
src/index.css
src/shared/components/layout/PageShell.tsx
=========================================

============================================

date  commit version
goal
reasons
changes

what files were wouched
apps/mobile/src/lib/api.ts
=========================================

============================================

date  commit version
goal
reasons
changes

what files were wouched
apps/mobile/app/(tabs)/index.tsx
src/domains/referrals/DEPENDENCIES.md
src/domains/referrals/README.md
src/domains/referrals/screens/ReferralsScreen.tsx
=========================================

============================================

date  commit version
goal
reasons
changes

what files were wouched
.planning/changelog.md
apps/mobile/app/(tabs)/index.tsx
src/domains/referrals/DEPENDENCIES.md
src/domains/referrals/README.md
src/domains/referrals/screens/ReferralsScreen.tsx
=========================================

============================================

date  commit version
goal
reasons
changes

what files were wouched
apps/mobile/package.json
pnpm-lock.yaml
src/domains/patient-documents/api/documentsApi.ts
src/domains/patient-documents/core/categories.ts
src/domains/patient-documents/core/categoryMeta.ts
src/domains/patient-documents/core/mapFromApi.ts
src/domains/patient-documents/core/types.ts
src/domains/patient-documents/mobile/categoryConfig.native.ts
src/domains/patient-documents/mobile/components/DocumentLightbox.native.tsx
src/domains/patient-documents/mobile/components/MoveDocumentModal.native.tsx
src/domains/patient-documents/mobile/hooks/useDocumentActions.ts
src/domains/patient-documents/mobile/offline/db.ts
src/domains/patient-documents/mobile/offline/sync.ts
src/domains/patient-documents/mobile/screens/DocumentCollectionView.native.tsx
src/domains/patient-documents/mobile/screens/DocumentsRootScreen.native.tsx
src/domains/patient-documents/web/categoryConfig.web.ts
=========================================

============================================

date  commit version
goal
reasons
changes

what files were wouched
.planning/PM/1 complete guide.md
.planning/PM/2 people.md
.planning/PM/3 patient-detail.md
.planning/PM/4.task-management
.planning/PM/5 template .md
apps/mobile/app/(tabs)/patients.tsx
apps/mobile/app/(tabs)/patients/[id]/index.tsx
apps/mobile/src/components/PatientActionsSheet.tsx
apps/mobile/src/shared/ui/fabConstants.ts
apps/mobile/src/shared/ui/formStyles.ts
src/domains/tasks/screens/native/TaskBoardScreen.native.tsx
=========================================

============================================

date  commit version
goal
reasons
changes

what files were wouched
Docs/backend/task-management-backend-design.md
prd.json
=========================================

============================================

date  commit version
goal
reasons
changes

what files were wouched
.GCC/index.yaml
.claude/skills/gcc/CONTRIBUTING.md
.claude/skills/gcc/LICENSE
.claude/skills/gcc/README.md
.claude/skills/gcc/SKILL.md
.claude/skills/gcc/examples/sample_session.md
.claude/skills/gcc/install_gcc_parallel.sh
.claude/skills/gcc/references/file_formats.md
.claude/skills/gcc/scripts/gcc_bridge.sh
.claude/skills/gcc/scripts/gcc_cleanup.sh
.claude/skills/gcc/scripts/gcc_commit.sh
.claude/skills/gcc/scripts/gcc_context.sh
.claude/skills/gcc/scripts/gcc_init.sh
GCC_TEST.md
src/components/AttachBar.tsx
src/components/FileGrid.tsx
src/components/ImageUploadS3.tsx
src/components/ImageUploader.tsx
src/components/PhotoUploader.tsx
src/components/common/panels/BottomActionPanel.tsx
src/components/dashboard/KPITile.tsx
src/components/dashboard/MindfulnessTile.tsx
src/components/layout/BottomBar.tsx
src/components/layout/Header.tsx
src/components/notifications/NotificationsPopup.tsx
src/components/qr/QRCodeGenerator.tsx
src/components/task/AddTaskForm.tsx
src/components/ui/accordion.tsx
src/components/ui/alert-dialog.tsx
src/components/ui/alert.tsx
src/components/ui/aspect-ratio.tsx
src/components/ui/avatar.tsx
src/components/ui/badge.tsx
src/components/ui/breadcrumb.tsx
src/components/ui/button.tsx
src/components/ui/calendar.tsx
src/components/ui/card.tsx
src/components/ui/carousel.tsx
src/components/ui/chart.tsx
src/components/ui/checkbox.tsx
src/components/ui/collapsible.tsx
src/components/ui/command.tsx
src/components/ui/context-menu.tsx
src/components/ui/dialog.tsx
src/components/ui/drawer.tsx
src/components/ui/dropdown-menu.tsx
src/components/ui/form.tsx
src/components/ui/hover-card.tsx
src/components/ui/input-otp.tsx
src/components/ui/input.tsx
src/components/ui/label.tsx
src/components/ui/menubar.tsx
src/components/ui/navigation-menu.tsx
src/components/ui/pagination.tsx
src/components/ui/popover.tsx
src/components/ui/progress.tsx
src/components/ui/radio-group.tsx
src/components/ui/resizable.tsx
src/components/ui/scroll-area.tsx
src/components/ui/select.tsx
src/components/ui/separator.tsx
src/components/ui/sheet.tsx
src/components/ui/sidebar.tsx
src/components/ui/skeleton.tsx
src/components/ui/slider.tsx
src/components/ui/sonner.tsx
src/components/ui/switch.tsx
src/components/ui/table.tsx
src/components/ui/tabs.tsx
src/components/ui/textarea.tsx
src/components/ui/toast.tsx
src/components/ui/toaster.tsx
src/components/ui/toggle-group.tsx
src/components/ui/toggle.tsx
src/components/ui/tooltip.tsx
src/components/ui/use-toast.ts
src/entities/.gitkeep
src/entities/document/api/usePatientDocuments.ts
src/entities/document/index.ts
src/entities/document/model/__tests__/mapFromApi.test.ts
src/entities/document/model/__tests__/types.test.ts
src/entities/document/model/mapFromApi.ts
src/entities/document/model/types.ts
src/entities/document/ui/CategoryChips.tsx
src/entities/document/ui/CategoryConfig.ts
src/entities/document/ui/DocumentCard.tsx
src/entities/document/ui/DocumentGrid.tsx
src/entities/document/ui/DocumentLightbox.tsx
src/entities/document/ui/FolderCard.tsx
src/entities/document/ui/__tests__/DocumentGrid.test.tsx
src/entities/document/ui/__tests__/DocumentLightbox.test.tsx
src/entities/document/ui/index.ts
src/entities/patient/api/usePatients.ts
src/entities/patient/index.ts
src/entities/patient/model/__tests__/payload.test.ts
src/entities/patient/model/comorbidities.ts
src/entities/patient/model/normalize.ts
src/entities/patient/model/payload.ts
src/entities/patient/model/stage.ts
src/entities/patient/model/types.ts
src/entities/patient/model/validation.ts
src/entities/patient/ui/index.ts
src/entities/patient/ui/patient/ArcSpeedDial.tsx
src/entities/patient/ui/patient/FilterPopup.tsx
src/entities/patient/ui/patient/LabsOverviewCard.tsx
src/entities/patient/ui/patient/MrnEditor.tsx
src/entities/patient/ui/patient/MrnOverview.tsx
src/entities/patient/ui/patient/PatientCard.tsx
src/entities/patient/ui/patient/PatientGridCard.tsx
src/entities/patient/ui/patient/PatientMeds.tsx
src/entities/patient/ui/patient/PatientNotes.tsx
src/entities/patient/ui/patient/PatientTasks.tsx
src/entities/patient/ui/patient/StageChip.tsx
src/entities/patient/ui/patient/Timeline.tsx
src/entities/patient/ui/patient/UpdateRing.tsx
src/entities/patient/ui/patient/ViewToggle.tsx
src/entities/patient/ui/patient/index.ts
src/features/dashboard/index.ts
src/features/dashboard/ui/DashboardPage.tsx
src/features/patient-detail/index.ts
src/features/patient-detail/ui/PatientCaseSheetTabs.tsx
src/features/patient-detail/ui/PatientDetailPage.tsx
src/features/patient-detail/ui/PatientSummaryHeader.tsx
src/features/patient-detail/ui/__tests__/PatientCaseSheetTabs.test.tsx
src/features/patient-detail/ui/__tests__/PatientDetailPage.test.tsx
src/features/patient-detail/ui/zones/BlueZone.tsx
src/features/patient-detail/ui/zones/GreenZone.tsx
src/features/patient-detail/ui/zones/RedZone.tsx
src/features/patient-detail/ui/zones/YellowZone.tsx
src/features/patient-discharge-summary/DischargeSummaryForm.tsx
src/features/patient-discharge-summary/discharge.sections.ts
src/features/patient-discharge-summary/export/sectionsToDocx.ts
src/features/patient-discharge-summary/export/structuredDischargeDocx.ts
src/features/patient-documents/index.ts
src/features/patient-documents/ui/DocumentsFolderPage.tsx
src/features/patient-documents/ui/DocumentsRootPage.tsx
src/features/patient-documents/ui/__tests__/DocumentsRootPage.test.tsx
src/features/patient-list/index.ts
src/features/patient-list/model/usePatientsFilters.ts
src/features/patient-list/ui/PatientsListEmpty.tsx
src/features/patient-list/ui/PatientsListFilters.tsx
src/features/patient-list/ui/PatientsListPage.tsx
src/features/patient-list/ui/PatientsListTabs.tsx
src/features/patient-medications/index.ts
src/features/patient-medications/ui/AddMedicationPage.tsx
src/features/patient-medications/ui/EditMedicationPage.tsx
src/features/patient-notes/index.ts
src/features/patient-notes/ui/AddNotePage.tsx
src/features/patient-notes/ui/EditNotePage.tsx
src/features/patient-notes/ui/NoteDetailPage.tsx
src/features/patient-registration/index.ts
src/features/patient-registration/model/__tests__/usePatientRegistrationForm.test.tsx
src/features/patient-registration/model/usePatientRegistrationForm.ts
src/features/patient-registration/ui/AddMrnPage.tsx
src/features/patient-registration/ui/PatientRegistrationPage.tsx
src/features/patient-registration/ui/__tests__/PatientRegistrationPage.test.tsx
src/features/patient-registration/ui/sections/ButtonGroup.tsx
src/features/patient-registration/ui/sections/EmergencyContactSection.tsx
src/features/patient-registration/ui/sections/FilesPrioritySection.tsx
src/features/patient-registration/ui/sections/MedicalDetailsSection.tsx
src/features/patient-registration/ui/sections/PatientIdentitySection.tsx
src/features/patient-registration/ui/sections/RegistrationSection.tsx
src/features/patient-registration/ui/sections/SubmitBar.tsx
src/features/patient-registration/ui/sections/index.ts
src/features/patient-tasks/index.ts
src/features/patient-tasks/ui/AddTaskPage.tsx
src/features/patient-tasks/ui/EditTaskPage.tsx
src/features/patient-workflow/index.ts
src/features/patient-workflow/model/__tests__/useWorkflowSteps.test.tsx
src/features/patient-workflow/model/useWorkflowSteps.ts
src/features/patient-workflow/ui/AdmissionPage.tsx
src/features/patient-workflow/ui/DischargePage.tsx
src/features/patient-workflow/ui/OTPage.tsx
src/features/patient-workflow/ui/PostOpPage.tsx
src/features/patient-workflow/ui/PreOpPage.tsx
src/features/patient-workflow/ui/WorkflowPageLayout.tsx
src/features/patient-workflow/ui/WorkflowStepper.tsx
src/features/profile/index.ts
src/features/profile/ui/ProfilePage.tsx
src/features/referrals/index.ts
src/features/referrals/ui/ReferralsPage.tsx
src/features/tasks/index.ts
src/features/tasks/ui/CompletedTodayPage.tsx
src/features/tasks/ui/TasksDuePage.tsx
src/features/tasks/ui/TasksPage.tsx
src/features/tasks/ui/UrgentAlertsPage.tsx
src/hooks/use-mobile.tsx
src/hooks/use-toast.ts
src/hooks/useUploader.ts
src/lib/docsWaitForEvent.ts
src/lib/filesApi.ts
src/lib/flags.ts
src/lib/image.ts
src/lib/pinnedPatients.ts
src/lib/s3upload.ts
src/lib/support.ts
src/lib/utils.ts
src/pages/DischargeSummary.tsx
src/pages/PatientDetail.tsx
src/pages/PatientQRView.tsx
src/shared/components/ui/accordion.tsx
src/shared/components/ui/alert.tsx
src/shared/components/ui/aspect-ratio.tsx
src/shared/components/ui/breadcrumb.tsx
src/shared/components/ui/carousel.tsx
src/shared/components/ui/chart.tsx
src/shared/components/ui/collapsible.tsx
src/shared/components/ui/command.tsx
src/shared/components/ui/context-menu.tsx
src/shared/components/ui/form.tsx
src/shared/components/ui/hover-card.tsx
src/shared/components/ui/input-otp.tsx
src/shared/components/ui/menubar.tsx
src/shared/components/ui/navigation-menu.tsx
src/shared/components/ui/pagination.tsx
src/shared/components/ui/progress.tsx
src/shared/components/ui/resizable.tsx
src/shared/components/ui/sidebar.tsx
src/shared/components/ui/slider.tsx
src/shared/components/ui/table.tsx
src/shared/components/ui/toggle-group.tsx
src/shared/components/ui/use-toast.ts
src/shared/lib/docsWaitForEvent.ts
src/types/models.ts
=========================================
