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
