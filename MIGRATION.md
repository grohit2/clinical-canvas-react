# Domain Migration Tracker

Track progress of reorganizing codebase from feature-sliced to domain-driven architecture.

**Status: ✅ Migration Complete | 🧹 Cleanup Complete**

---

## Migration Status

| Domain | Status | Files Moved | Imports Fixed | Tests Pass |
|--------|--------|-------------|---------------|------------|
| `patient-list` | ✅ Moved | 17/17 | ⏳ Pending | ⏳ Pending |
| `patient-detail` | ✅ Moved | 30/30 | ⏳ Pending | ⏳ Pending |
| `patient-documents` | ✅ Moved | 21/21 | ⏳ Pending | ⏳ Pending |
| `tasks` | ✅ Moved | 21/21 | ⏳ Pending | ⏳ Pending |
| `patient-workflow` | ✅ Moved | 15/15 | ⏳ Pending | ⏳ Pending |
| `patient-registration` | ✅ Moved | 21/21 | ⏳ Pending | ⏳ Pending |
| `patient-notes` | ✅ Moved | 13/13 | ⏳ Pending | ⏳ Pending |
| `patient-medications` | ✅ Moved | 12/12 | ⏳ Pending | ⏳ Pending |
| `discharge-summary` | ✅ Moved | 11/11 | ⏳ Pending | ⏳ Pending |
| `dashboard` | ✅ Moved | 7/7 | ⏳ Pending | ⏳ Pending |
| `profile` | ✅ Moved | 5/5 | ⏳ Pending | ⏳ Pending |
| `referrals` | ✅ Moved | 5/5 | ⏳ Pending | ⏳ Pending |

---

## Domain 1: `patient-list`

### Completed Moves ✅

| # | From | To | Status |
|---|------|-----|--------|
| 1 | `entities/patient/model/types.ts` | `domains/patient-list/core/types.ts` | ✅ |
| 2 | `entities/patient/model/stage.ts` | `domains/patient-list/core/stage.ts` | ✅ |
| 3 | `entities/patient/model/comorbidities.ts` | `domains/patient-list/core/comorbidities.ts` | ✅ |
| 4 | `entities/patient/model/normalize.ts` | `domains/patient-list/core/normalize.ts` | ✅ |
| 5 | `entities/patient/model/validation.ts` | `domains/patient-list/core/validation.ts` | ✅ |
| 6 | `entities/patient/model/__tests__/payload.test.ts` | `domains/patient-list/core/__tests__/payload.test.ts` | ✅ |
| 7 | `entities/patient/api/usePatients.ts` | `domains/patient-list/api/usePatients.ts` | ✅ |
| 8 | `features/patient-list/model/usePatientsFilters.ts` | `domains/patient-list/hooks/usePatientsFilters.ts` | ✅ |
| 9 | `features/patient-list/ui/PatientsListPage.tsx` | `domains/patient-list/screens/PatientListScreen.tsx` | ✅ Renamed |
| 10 | `entities/patient/ui/patient/PatientCard.tsx` | `domains/patient-list/components/PatientCard.tsx` | ✅ |
| 11 | `entities/patient/ui/patient/PatientGridCard.tsx` | `domains/patient-list/components/PatientGridCard.tsx` | ✅ |
| 12 | `entities/patient/ui/patient/StageChip.tsx` | `domains/patient-list/components/StageChip.tsx` | ✅ |
| 13 | `entities/patient/ui/patient/FilterPopup.tsx` | `domains/patient-list/components/FilterPopup.tsx` | ✅ |
| 14 | `entities/patient/ui/patient/ViewToggle.tsx` | `domains/patient-list/components/ViewToggle.tsx` | ✅ |
| 15 | `features/patient-list/ui/PatientsListFilters.tsx` | `domains/patient-list/components/PatientsListFilters.tsx` | ✅ |
| 16 | `features/patient-list/ui/PatientsListEmpty.tsx` | `domains/patient-list/components/EmptyState.tsx` | ✅ Renamed |
| 17 | `features/patient-list/ui/PatientsListTabs.tsx` | `domains/patient-list/components/PatientsListTabs.tsx` | ✅ |

### Scaffold Files Created ✅

- [x] `domains/patient-list/index.ts`
- [x] `domains/patient-list/README.md`
- [x] `domains/patient-list/DEPENDENCIES.md`

### Import Fixes Needed

- [ ] Update all imports in moved files to use `@/domains/`, `@/shared/`, `@/theme/`
- [ ] Update files that import from old paths

---

## Domain 2: `patient-detail`

### Target Structure

```
domains/patient-detail/
├── README.md
├── DEPENDENCIES.md
├── index.ts
├── api/
│   ├── usePatient.ts                    # Single patient fetch
│   ├── useUpdatePatient.ts              # Mutation hook
│   └── usePatientLabs.ts               # Labs data
├── core/
│   ├── types.ts                         # PatientDetail, Lab, Vitals, etc.
│   ├── payload.ts                       # API payload builder for updates
│   ├── vitals.ts                        # Vitals calculations, ranges
│   ├── labs.ts                          # Lab value parsing, normals
│   ├── timeline.ts                      # Timeline event sorting/grouping
│   └── __tests__/
│       ├── payload.test.ts
│       ├── vitals.test.ts
│       └── timeline.test.ts
├── hooks/
│   ├── usePatientTabs.ts               # Tab navigation state
│   └── useZoneData.ts                  # Zone-specific data assembly
├── screens/
│   └── PatientDetailScreen.tsx          # Main detail screen
├── components/
│   ├── PatientHeader.tsx                # Name, age, MRN, stage chip
│   ├── PatientTabs.tsx                  # Case sheet tab bar
│   ├── PatientQRView.tsx               # QR code display
│   ├── ArcSpeedDial.tsx                 # Floating action menu
│   ├── UpdateRing.tsx                   # Circular update indicator
│   ├── Timeline.tsx                     # Event timeline
│   ├── MrnEditor.tsx                    # Edit MRN inline
│   ├── MrnOverview.tsx                  # MRN display card
│   ├── LabsOverviewCard.tsx             # Lab results card
│   ├── MedsTab.tsx                      # Medications tab content
│   ├── NotesTab.tsx                     # Notes tab content
│   ├── TasksTab.tsx                     # Tasks tab content
│   └── zones/
│       ├── BlueZone.tsx                 # Admission zone
│       ├── YellowZone.tsx               # Pre-op / Post-op zone
│       ├── RedZone.tsx                  # OT zone
│       └── GreenZone.tsx                # Discharge zone
└── __tests__/
    ├── PatientDetailScreen.test.tsx
    └── PatientTabs.test.tsx
```

### Files to Move

| # | From | To | Notes | Status |
|---|------|-----|-------|--------|
| **From `entities/patient/`** |||||
| 1 | `entities/patient/model/payload.ts` | `core/payload.ts` | Pure TS, no React | ✅ |
| 2 | `entities/patient/ui/patient/LabsOverviewCard.tsx` | `components/LabsOverviewCard.tsx` | Add theme tokens | ✅ |
| 3 | `entities/patient/ui/patient/MrnEditor.tsx` | `components/MrnEditor.tsx` | Add theme tokens | ✅ |
| 4 | `entities/patient/ui/patient/MrnOverview.tsx` | `components/MrnOverview.tsx` | Add theme tokens | ✅ |
| 5 | `entities/patient/ui/patient/PatientMeds.tsx` | `components/MedsTab.tsx` | Rename | ✅ |
| 6 | `entities/patient/ui/patient/PatientNotes.tsx` | `components/NotesTab.tsx` | Rename | ✅ |
| 7 | `entities/patient/ui/patient/PatientTasks.tsx` | `components/TasksTab.tsx` | Rename | ✅ |
| 8 | `entities/patient/ui/patient/Timeline.tsx` | `components/Timeline.tsx` | Extract logic to `core/timeline.ts` | ✅ |
| 9 | `entities/patient/ui/patient/UpdateRing.tsx` | `components/UpdateRing.tsx` | Add theme tokens | ✅ |
| 10 | `entities/patient/ui/patient/ArcSpeedDial.tsx` | `components/ArcSpeedDial.tsx` | Add theme tokens | ✅ |
| **From `features/patient-detail/`** |||||
| 11 | `features/patient-detail/ui/PatientDetailPage.tsx` | `screens/PatientDetailScreen.tsx` | Rename Page→Screen | ✅ |
| 12 | `features/patient-detail/ui/PatientSummaryHeader.tsx` | `components/PatientHeader.tsx` | Rename | ✅ |
| 13 | `features/patient-detail/ui/PatientCaseSheetTabs.tsx` | `components/PatientTabs.tsx` | Rename | ✅ |
| 14 | `features/patient-detail/ui/zones/BlueZone.tsx` | `components/zones/BlueZone.tsx` | Add zone tokens | ✅ |
| 15 | `features/patient-detail/ui/zones/GreenZone.tsx` | `components/zones/GreenZone.tsx` | Add zone tokens | ✅ |
| 16 | `features/patient-detail/ui/zones/RedZone.tsx` | `components/zones/RedZone.tsx` | Add zone tokens | ✅ |
| 17 | `features/patient-detail/ui/zones/YellowZone.tsx` | `components/zones/YellowZone.tsx` | Add zone tokens | ✅ |
| 18 | `features/patient-detail/ui/__tests__/PatientDetailPage.test.tsx` | `__tests__/PatientDetailScreen.test.tsx` | Rename | ✅ |
| 19 | `features/patient-detail/ui/__tests__/PatientCaseSheetTabs.test.tsx` | `__tests__/PatientTabs.test.tsx` | Rename | ✅ |
| **From `pages/`** |||||
| 20 | `pages/PatientQRView.tsx` | `components/PatientQRView.tsx` | Move into domain | ✅ |
| 21 | `pages/PatientDetail.tsx` | **DELETE** | Replaced by screen | ⏳ |

### New Files Created

| # | File | Purpose | Status |
|---|------|---------|--------|
| 22 | `core/types.ts` | `PatientDetail`, `LabResult`, `VitalSign`, `TimelineEvent`, `ZoneData` | ✅ |
| 23 | `core/vitals.ts` | `isVitalNormal()`, `getVitalRange()`, `formatVital()` | ✅ |
| 24 | `core/labs.ts` | `isLabNormal()`, `formatLabValue()`, `groupLabsByCategory()` | ✅ |
| 25 | `core/timeline.ts` | `sortEvents()`, `groupByDate()`, `formatTimelineEntry()` | ✅ |
| 26 | `hooks/usePatientTabs.ts` | Active tab state, tab config array | ✅ |
| 27 | `hooks/useZoneData.ts` | Assembles zone-specific checklist/form data | ✅ |
| 28 | `api/usePatient.ts` | `useQuery` for single patient by ID | ✅ |
| 29 | `api/useUpdatePatient.ts` | `useMutation` for patient updates | ✅ |
| 30 | `api/usePatientLabs.ts` | `useQuery` for lab results | ✅ |

### Scaffold Files Created ✅

- [x] `domains/patient-detail/index.ts`
- [x] `domains/patient-detail/README.md`
- [x] `domains/patient-detail/DEPENDENCIES.md`

### Files to Delete After Migration

| File | Reason |
|------|--------|
| `features/patient-detail/index.ts` | Old barrel |
| `pages/PatientDetail.tsx` | Replaced by screen |

### Bash Commands

```bash
# 1. Create folders
mkdir -p src/domains/patient-detail/{api,core/__tests__,hooks,screens,components/zones,__tests__}

# 2. Move from entities/patient/
mv src/entities/patient/model/payload.ts src/domains/patient-detail/core/payload.ts
mv src/entities/patient/ui/patient/LabsOverviewCard.tsx src/domains/patient-detail/components/LabsOverviewCard.tsx
mv src/entities/patient/ui/patient/MrnEditor.tsx src/domains/patient-detail/components/MrnEditor.tsx
mv src/entities/patient/ui/patient/MrnOverview.tsx src/domains/patient-detail/components/MrnOverview.tsx
mv src/entities/patient/ui/patient/PatientMeds.tsx src/domains/patient-detail/components/MedsTab.tsx
mv src/entities/patient/ui/patient/PatientNotes.tsx src/domains/patient-detail/components/NotesTab.tsx
mv src/entities/patient/ui/patient/PatientTasks.tsx src/domains/patient-detail/components/TasksTab.tsx
mv src/entities/patient/ui/patient/Timeline.tsx src/domains/patient-detail/components/Timeline.tsx
mv src/entities/patient/ui/patient/UpdateRing.tsx src/domains/patient-detail/components/UpdateRing.tsx
mv src/entities/patient/ui/patient/ArcSpeedDial.tsx src/domains/patient-detail/components/ArcSpeedDial.tsx

# 3. Move from features/patient-detail/
mv src/features/patient-detail/ui/PatientDetailPage.tsx src/domains/patient-detail/screens/PatientDetailScreen.tsx
mv src/features/patient-detail/ui/PatientSummaryHeader.tsx src/domains/patient-detail/components/PatientHeader.tsx
mv src/features/patient-detail/ui/PatientCaseSheetTabs.tsx src/domains/patient-detail/components/PatientTabs.tsx
mv src/features/patient-detail/ui/zones/BlueZone.tsx src/domains/patient-detail/components/zones/BlueZone.tsx
mv src/features/patient-detail/ui/zones/GreenZone.tsx src/domains/patient-detail/components/zones/GreenZone.tsx
mv src/features/patient-detail/ui/zones/RedZone.tsx src/domains/patient-detail/components/zones/RedZone.tsx
mv src/features/patient-detail/ui/zones/YellowZone.tsx src/domains/patient-detail/components/zones/YellowZone.tsx
mv src/features/patient-detail/ui/__tests__/PatientDetailPage.test.tsx src/domains/patient-detail/__tests__/PatientDetailScreen.test.tsx
mv src/features/patient-detail/ui/__tests__/PatientCaseSheetTabs.test.tsx src/domains/patient-detail/__tests__/PatientTabs.test.tsx

# 4. Move from pages/
mv src/pages/PatientQRView.tsx src/domains/patient-detail/components/PatientQRView.tsx

# 5. Create scaffolds
touch src/domains/patient-detail/index.ts
touch src/domains/patient-detail/README.md
touch src/domains/patient-detail/DEPENDENCIES.md

# 6. Create new core files (empty)
touch src/domains/patient-detail/core/types.ts
touch src/domains/patient-detail/core/vitals.ts
touch src/domains/patient-detail/core/labs.ts
touch src/domains/patient-detail/core/timeline.ts

# 7. Create new hook files (empty)
touch src/domains/patient-detail/hooks/usePatientTabs.ts
touch src/domains/patient-detail/hooks/useZoneData.ts

# 8. Create new API files (empty)
touch src/domains/patient-detail/api/usePatient.ts
touch src/domains/patient-detail/api/useUpdatePatient.ts
touch src/domains/patient-detail/api/usePatientLabs.ts
```

### Zone Color Mapping (for theme tokens)

| Zone | Stage | Token |
|------|-------|-------|
| Blue | Admission | `colors.zone.blue` |
| Yellow | Pre-Op, Post-Op | `colors.zone.yellow` |
| Red | OT | `colors.zone.red` |
| Green | Discharge, Discharged | `colors.zone.green` |

### Cross-Domain Dependencies

```
@/domains/patient-list/core/types     → Patient, PatientStage
@/domains/patient-list/core/stage     → getStageConfig, getStageZoneColor
@/domains/tasks                       → TaskCard (in TasksTab)
@/domains/patient-notes               → NoteCard (in NotesTab)
@/domains/patient-medications         → MedicationCard (in MedsTab)
```

---

## Domain 3: `patient-registration`

### Target Structure

```
domains/patient-registration/
├── README.md
├── DEPENDENCIES.md
├── index.ts
├── api/
│   ├── useCreatePatient.ts
│   └── useAddMrn.ts
├── core/
│   ├── types.ts
│   └── validation.ts
├── hooks/
│   └── useRegistrationForm.ts
├── screens/
│   ├── RegistrationScreen.tsx
│   └── AddMrnScreen.tsx
├── components/
│   ├── PatientIdentitySection.tsx
│   ├── MedicalDetailsSection.tsx
│   ├── EmergencyContactSection.tsx
│   ├── FilesPrioritySection.tsx
│   ├── RegistrationSection.tsx
│   ├── ButtonGroup.tsx
│   ├── SubmitBar.tsx
│   ├── PhotoUploader.tsx
│   └── index.ts
└── __tests__/
    ├── useRegistrationForm.test.tsx
    └── RegistrationScreen.test.tsx
```

### Files Moved ✅

| # | From | To | Status |
|---|------|-----|--------|
| 1 | `features/patient-registration/ui/PatientRegistrationPage.tsx` | `screens/RegistrationScreen.tsx` | ✅ |
| 2 | `features/patient-registration/ui/AddMrnPage.tsx` | `screens/AddMrnScreen.tsx` | ✅ |
| 3 | `features/patient-registration/model/usePatientRegistrationForm.ts` | `hooks/useRegistrationForm.ts` | ✅ |
| 4 | `features/patient-registration/ui/sections/PatientIdentitySection.tsx` | `components/PatientIdentitySection.tsx` | ✅ |
| 5 | `features/patient-registration/ui/sections/MedicalDetailsSection.tsx` | `components/MedicalDetailsSection.tsx` | ✅ |
| 6 | `features/patient-registration/ui/sections/EmergencyContactSection.tsx` | `components/EmergencyContactSection.tsx` | ✅ |
| 7 | `features/patient-registration/ui/sections/FilesPrioritySection.tsx` | `components/FilesPrioritySection.tsx` | ✅ |
| 8 | `features/patient-registration/ui/sections/RegistrationSection.tsx` | `components/RegistrationSection.tsx` | ✅ |
| 9 | `features/patient-registration/ui/sections/ButtonGroup.tsx` | `components/ButtonGroup.tsx` | ✅ |
| 10 | `features/patient-registration/ui/sections/SubmitBar.tsx` | `components/SubmitBar.tsx` | ✅ |
| 11 | `features/patient-registration/ui/sections/index.ts` | `components/index.ts` | ✅ |
| 12 | `features/patient-registration/model/__tests__/usePatientRegistrationForm.test.tsx` | `__tests__/useRegistrationForm.test.tsx` | ✅ |
| 13 | `features/patient-registration/ui/__tests__/PatientRegistrationPage.test.tsx` | `__tests__/RegistrationScreen.test.tsx` | ✅ |
| 14 | `components/PhotoUploader.tsx` | `components/PhotoUploader.tsx` | ✅ |

### New Files Created ✅

| # | File | Purpose | Status |
|---|------|---------|--------|
| 15 | `core/types.ts` | `RegistrationFormData`, `RegistrationStep`, `MrnEntry` | ✅ |
| 16 | `core/validation.ts` | Zod schemas for form validation | ✅ |
| 17 | `api/useCreatePatient.ts` | Mutation hook for patient creation | ✅ |
| 18 | `api/useAddMrn.ts` | Mutation hook for adding MRN | ✅ |
| 19 | `index.ts` | Public exports | ✅ |
| 20 | `README.md` | Domain documentation | ✅ |
| 21 | `DEPENDENCIES.md` | Shared imports list | ✅ |

### Files to Delete After Migration

| File | Reason |
|------|--------|
| `features/patient-registration/index.ts` | Old barrel |

---

## Domain 4: `patient-documents`

### Target Structure

```
domains/patient-documents/
├── README.md
├── DEPENDENCIES.md
├── index.ts
├── api/
│   └── usePatientDocuments.ts
├── core/
│   ├── types.ts
│   ├── mapFromApi.ts
│   ├── CategoryConfig.ts
│   ├── waitForS3Event.ts
│   └── __tests__/
│       ├── mapFromApi.test.ts
│       └── types.test.ts
├── screens/
│   ├── DocumentsRootScreen.tsx
│   └── DocumentsFolderScreen.tsx
├── components/
│   ├── DocumentCard.tsx
│   ├── DocumentGrid.tsx
│   ├── DocumentLightbox.tsx
│   ├── CategoryChips.tsx
│   ├── FolderCard.tsx
│   └── index.ts
└── __tests__/
    ├── DocumentGrid.test.tsx
    ├── DocumentLightbox.test.tsx
    └── DocumentsRootScreen.test.tsx
```

### Files Moved ✅

| # | From | To | Status |
|---|------|-----|--------|
| **From `entities/document/`** ||||
| 1 | `model/types.ts` | `core/types.ts` | ✅ |
| 2 | `model/mapFromApi.ts` | `core/mapFromApi.ts` | ✅ |
| 3 | `model/__tests__/mapFromApi.test.ts` | `core/__tests__/mapFromApi.test.ts` | ✅ |
| 4 | `model/__tests__/types.test.ts` | `core/__tests__/types.test.ts` | ✅ |
| 5 | `api/usePatientDocuments.ts` | `api/usePatientDocuments.ts` | ✅ |
| 6 | `ui/CategoryConfig.ts` | `core/CategoryConfig.ts` | ✅ (moved to core) |
| 7 | `ui/DocumentCard.tsx` | `components/DocumentCard.tsx` | ✅ |
| 8 | `ui/DocumentGrid.tsx` | `components/DocumentGrid.tsx` | ✅ |
| 9 | `ui/DocumentLightbox.tsx` | `components/DocumentLightbox.tsx` | ✅ |
| 10 | `ui/CategoryChips.tsx` | `components/CategoryChips.tsx` | ✅ |
| 11 | `ui/FolderCard.tsx` | `components/FolderCard.tsx` | ✅ |
| 12 | `ui/index.ts` | `components/index.ts` | ✅ |
| 13 | `ui/__tests__/DocumentGrid.test.tsx` | `__tests__/DocumentGrid.test.tsx` | ✅ |
| 14 | `ui/__tests__/DocumentLightbox.test.tsx` | `__tests__/DocumentLightbox.test.tsx` | ✅ |
| **From `features/patient-documents/`** ||||
| 15 | `ui/DocumentsRootPage.tsx` | `screens/DocumentsRootScreen.tsx` | ✅ |
| 16 | `ui/DocumentsFolderPage.tsx` | `screens/DocumentsFolderScreen.tsx` | ✅ |
| 17 | `ui/__tests__/DocumentsRootPage.test.tsx` | `__tests__/DocumentsRootScreen.test.tsx` | ✅ |
| **From `lib/`** ||||
| 18 | `lib/docsWaitForEvent.ts` | `core/waitForS3Event.ts` | ✅ |

### Scaffold Files Created ✅

| # | File | Status |
|---|------|--------|
| 19 | `index.ts` | ✅ |
| 20 | `README.md` | ✅ |
| 21 | `DEPENDENCIES.md` | ✅ |

### Files to Delete After Migration

| File | Reason |
|------|--------|
| `entities/document/index.ts` | Old barrel |
| `features/patient-documents/index.ts` | Old barrel |

---

## Domain 5: `discharge-summary`

### Target Structure

```
domains/discharge-summary/
├── README.md
├── DEPENDENCIES.md
├── index.ts
├── api/
│   ├── useDischargeLatest.ts
│   └── useCreateDischargeVersion.ts
├── core/
│   ├── types.ts
│   ├── sections.ts
│   └── export/
│       ├── structuredDischargeDocx.ts
│       └── sectionsToDocx.ts
├── screens/
│   └── DischargeSummaryScreen.tsx
├── components/
│   └── DischargeSummaryForm.tsx
└── __tests__/
```

### Files Moved ✅

| # | From | To | Status |
|---|------|-----|--------|
| 1 | `features/patient-discharge-summary/DischargeSummaryForm.tsx` | `components/DischargeSummaryForm.tsx` | ✅ |
| 2 | `features/patient-discharge-summary/discharge.sections.ts` | `core/sections.ts` | ✅ |
| 3 | `features/patient-discharge-summary/export/structuredDischargeDocx.ts` | `core/export/structuredDischargeDocx.ts` | ✅ |
| 4 | `features/patient-discharge-summary/export/sectionsToDocx.ts` | `core/export/sectionsToDocx.ts` | ✅ |
| 5 | `pages/DischargeSummary.tsx` | `screens/DischargeSummaryScreen.tsx` | ✅ |

### New Files Created ✅

| # | File | Purpose | Status |
|---|------|---------|--------|
| 6 | `core/types.ts` | DischargeSummaryData, DischargeMedicationItem types | ✅ |
| 7 | `api/useDischargeLatest.ts` | Fetch latest discharge summary | ✅ |
| 8 | `api/useCreateDischargeVersion.ts` | Create discharge version | ✅ |
| 9 | `index.ts` | Public exports | ✅ |
| 10 | `README.md` | Domain documentation | ✅ |
| 11 | `DEPENDENCIES.md` | Shared imports list | ✅ |

### Cross-Domain Consumers

| Consumer | What It Imports |
|----------|-----------------|
| `patient-detail` | `buildStructuredDischargeDocxBlob` for export |
| `patient-detail` | `SECTION_DEFINITIONS`, `adaptSections` for notes |

---

## Domain 6: `tasks`

### Target Structure

```
domains/tasks/
├── README.md
├── DEPENDENCIES.md
├── index.ts
├── api/
│   ├── useTasks.ts
│   ├── useCreateTask.ts
│   └── useUpdateTask.ts
├── core/
│   ├── types.ts
│   ├── priorities.ts
│   ├── sorting.ts
│   └── filters.ts
├── hooks/
│   └── useTaskFilters.ts
├── screens/
│   ├── TasksScreen.tsx
│   ├── TasksDueScreen.tsx
│   ├── UrgentAlertsScreen.tsx
│   ├── CompletedTodayScreen.tsx
│   ├── AddTaskScreen.tsx
│   └── EditTaskScreen.tsx
├── components/
│   ├── TaskForm.tsx
│   ├── TaskCard.tsx
│   ├── TaskList.tsx
│   └── PriorityBadge.tsx
└── __tests__/
```

### Files Moved ✅

| # | From | To | Status |
|---|------|-----|--------|
| **From `features/tasks/`** ||||
| 1 | `ui/TasksPage.tsx` | `screens/TasksScreen.tsx` | ✅ |
| 2 | `ui/TasksDuePage.tsx` | `screens/TasksDueScreen.tsx` | ✅ |
| 3 | `ui/UrgentAlertsPage.tsx` | `screens/UrgentAlertsScreen.tsx` | ✅ |
| 4 | `ui/CompletedTodayPage.tsx` | `screens/CompletedTodayScreen.tsx` | ✅ |
| **From `features/patient-tasks/`** ||||
| 5 | `ui/AddTaskPage.tsx` | `screens/AddTaskScreen.tsx` | ✅ |
| 6 | `ui/EditTaskPage.tsx` | `screens/EditTaskScreen.tsx` | ✅ |
| **From `components/task/`** ||||
| 7 | `AddTaskForm.tsx` | `components/TaskForm.tsx` | ✅ |

### New Files Created ✅

| # | File | Purpose | Status |
|---|------|---------|--------|
| 8 | `core/types.ts` | TaskFilter, TaskSort, TaskGroup types | ✅ |
| 9 | `core/priorities.ts` | Priority config, colors, labels | ✅ |
| 10 | `core/sorting.ts` | Sort/group utilities | ✅ |
| 11 | `core/filters.ts` | Filter functions (isOverdue, etc.) | ✅ |
| 12 | `api/useTasks.ts` | TanStack Query hook | ✅ |
| 13 | `api/useCreateTask.ts` | Create task mutation | ✅ |
| 14 | `api/useUpdateTask.ts` | Update/delete task mutations | ✅ |
| 15 | `hooks/useTaskFilters.ts` | Filter state management | ✅ |
| 16 | `components/TaskCard.tsx` | Task display component | ✅ |
| 17 | `components/TaskList.tsx` | List with empty state | ✅ |
| 18 | `components/PriorityBadge.tsx` | Priority indicator | ✅ |
| 19 | `index.ts` | Public exports | ✅ |
| 20 | `README.md` | Domain documentation | ✅ |
| 21 | `DEPENDENCIES.md` | Shared imports list | ✅ |

### Files to Delete After Migration

| File | Reason |
|------|--------|
| `features/tasks/index.ts` | Old barrel |
| `features/patient-tasks/index.ts` | Old barrel |

---

## Domain 7: `patient-notes`

### Target Structure

```
domains/patient-notes/
├── README.md
├── DEPENDENCIES.md
├── index.ts
├── api/
│   ├── useNotes.ts
│   ├── useCreateNote.ts
│   ├── useUpdateNote.ts
│   └── useDeleteNote.ts
├── core/
│   └── types.ts
├── screens/
│   ├── AddNoteScreen.tsx
│   ├── EditNoteScreen.tsx
│   └── NoteDetailScreen.tsx
├── components/
│   ├── NoteCard.tsx
│   └── NoteForm.tsx
└── __tests__/
```

### Files Moved ✅

| # | From | To | Status |
|---|------|-----|--------|
| 1 | `features/patient-notes/ui/AddNotePage.tsx` | `screens/AddNoteScreen.tsx` | ✅ |
| 2 | `features/patient-notes/ui/EditNotePage.tsx` | `screens/EditNoteScreen.tsx` | ✅ |
| 3 | `features/patient-notes/ui/NoteDetailPage.tsx` | `screens/NoteDetailScreen.tsx` | ✅ |

### New Files Created ✅

| # | File | Purpose | Status |
|---|------|---------|--------|
| 4 | `core/types.ts` | NoteCategory, NOTE_CATEGORIES, badge colors | ✅ |
| 5 | `api/useNotes.ts` | TanStack Query hook | ✅ |
| 6 | `api/useCreateNote.ts` | Create note mutation | ✅ |
| 7 | `api/useUpdateNote.ts` | Update note mutation | ✅ |
| 8 | `api/useDeleteNote.ts` | Delete note mutation | ✅ |
| 9 | `components/NoteCard.tsx` | Note display component | ✅ |
| 10 | `components/NoteForm.tsx` | Shared form component | ✅ |
| 11 | `index.ts` | Public exports | ✅ |
| 12 | `README.md` | Domain documentation | ✅ |
| 13 | `DEPENDENCIES.md` | Shared imports list | ✅ |

### Files to Delete After Migration

| File | Reason |
|------|--------|
| `features/patient-notes/index.ts` | Old barrel |

---

## Domain 8: `patient-workflow`

### Target Structure

```
domains/patient-workflow/
├── README.md
├── DEPENDENCIES.md
├── index.ts
├── core/
│   ├── types.ts
│   ├── steps.ts
│   └── checklists.ts
├── hooks/
│   └── useWorkflowProgress.ts
├── screens/
│   ├── PreOpScreen.tsx
│   └── PostOpScreen.tsx
├── components/
│   ├── WorkflowStepper.tsx
│   ├── ChecklistSection.tsx
│   ├── StepIndicator.tsx
│   ├── WorkflowCard.tsx
│   └── ZoneHeader.tsx
└── __tests__/
```

### Files Moved ✅

| # | From | To | Status |
|---|------|-----|--------|
| 1 | `features/surgical-workflow/ui/PreOpPage.tsx` | `screens/PreOpScreen.tsx` | ✅ |
| 2 | `features/surgical-workflow/ui/PostOpPage.tsx` | `screens/PostOpScreen.tsx` | ✅ |
| 3 | `features/surgical-workflow/ui/WorkflowStepper.tsx` | `components/WorkflowStepper.tsx` | ✅ |
| 4 | `features/surgical-workflow/ui/ChecklistSection.tsx` | `components/ChecklistSection.tsx` | ✅ |
| 5 | `features/surgical-workflow/ui/StepIndicator.tsx` | `components/StepIndicator.tsx` | ✅ |
| 6 | `features/surgical-workflow/ui/WorkflowCard.tsx` | `components/WorkflowCard.tsx` | ✅ |
| 7 | `features/surgical-workflow/ui/ZoneHeader.tsx` | `components/ZoneHeader.tsx` | ✅ |
| 8 | `features/surgical-workflow/model/useWorkflowProgress.ts` | `hooks/useWorkflowProgress.ts` | ✅ |
| 9 | `features/surgical-workflow/model/workflowSteps.ts` | `core/steps.ts` | ✅ |

### New Files Created ✅

| # | File | Purpose | Status |
|---|------|---------|--------|
| 10 | `core/types.ts` | WorkflowStepId, WorkflowStepStatus, ChecklistItem types | ✅ |
| 11 | `core/checklists.ts` | Pre-defined checklists for each workflow step | ✅ |
| 12 | `index.ts` | Public exports | ✅ |
| 13 | `README.md` | Domain documentation | ✅ |
| 14 | `DEPENDENCIES.md` | Shared imports list | ✅ |
| 15 | (components moved count toward total) | | |

### Files to Delete After Migration

| File | Reason |
|------|--------|
| `features/surgical-workflow/index.ts` | Old barrel |

### Cross-Domain Consumers

| Consumer | What It Imports |
|----------|-----------------|
| `patient-detail` zones | WorkflowStepper, ChecklistSection |
| `patient-detail` | useWorkflowProgress for zone completion |

---

## Domain 9: `patient-medications`

### Target Structure

```
domains/patient-medications/
├── README.md
├── DEPENDENCIES.md
├── index.ts
├── api/
│   ├── useMedications.ts
│   ├── useCreateMedication.ts
│   └── useUpdateMedication.ts
├── core/
│   ├── types.ts
│   └── priorities.ts
├── screens/
│   ├── AddMedicationScreen.tsx
│   └── EditMedicationScreen.tsx
├── components/
│   ├── MedicationCard.tsx
│   └── MedicationForm.tsx
└── __tests__/
```

### Files Moved ✅

| # | From | To | Status |
|---|------|-----|--------|
| 1 | `features/patient-medications/ui/AddMedicationPage.tsx` | `screens/AddMedicationScreen.tsx` | ✅ |
| 2 | `features/patient-medications/ui/EditMedicationPage.tsx` | `screens/EditMedicationScreen.tsx` | ✅ |

### New Files Created ✅

| # | File | Purpose | Status |
|---|------|---------|--------|
| 3 | `core/types.ts` | MedPriority, MedRoute, MedFrequency, ROUTES, FREQUENCIES | ✅ |
| 4 | `core/priorities.ts` | PRIORITY_CONFIG, PRIORITY_COLORS, getPriorityConfig | ✅ |
| 5 | `api/useMedications.ts` | TanStack Query hooks for fetching medications | ✅ |
| 6 | `api/useCreateMedication.ts` | Create medication mutation | ✅ |
| 7 | `api/useUpdateMedication.ts` | Update/discontinue medication mutations | ✅ |
| 8 | `components/MedicationCard.tsx` | Medication display with priority badge | ✅ |
| 9 | `components/MedicationForm.tsx` | Shared form between add/edit screens | ✅ |
| 10 | `index.ts` | Public exports | ✅ |
| 11 | `README.md` | Domain documentation | ✅ |
| 12 | `DEPENDENCIES.md` | Shared imports list | ✅ |

### Medication Priorities

| Priority | Color | Use Case |
|----------|-------|----------|
| STAT | Red | Immediate administration |
| Urgent | Orange | Within 1 hour |
| Routine | Blue | Scheduled administration |
| PRN | Gray | As needed |

### Routes & Frequencies

**Routes**: Oral (PO), IV, IM, SC, Topical, Inhaled, Rectal, Sublingual, Transdermal, Ophthalmic, Otic, Nasal

**Frequencies**: Once, Daily, BID, TID, QID, Q4H, Q6H, Q8H, Q12H, Weekly, PRN

### Files to Delete After Migration

| File | Reason |
|------|--------|
| `features/patient-medications/index.ts` | Old barrel |

### Cross-Domain Consumers

| Consumer | What It Imports |
|----------|-----------------|
| `patient-detail/MedsTab` | MedicationCard for consistent rendering |
| `patient-workflow/PostOpScreen` | Shows medications in post-op orders |

---

## Domain 10: `dashboard`

### Target Structure

```
domains/dashboard/
├── README.md
├── DEPENDENCIES.md
├── index.ts
├── core/
│   └── types.ts
├── screens/
│   └── DashboardScreen.tsx
└── components/
    ├── KPITile.tsx
    └── MindfulnessTile.tsx
```

### Files Moved ✅

| # | From | To | Status |
|---|------|-----|--------|
| 1 | `features/dashboard/ui/DashboardPage.tsx` | `screens/DashboardScreen.tsx` | ✅ |
| 2 | `components/dashboard/KPITile.tsx` | `components/KPITile.tsx` | ✅ |
| 3 | `components/dashboard/MindfulnessTile.tsx` | `components/MindfulnessTile.tsx` | ✅ |

### New Files Created ✅

| # | File | Purpose | Status |
|---|------|---------|--------|
| 4 | `core/types.ts` | KPIData, StageEntry, normalizeStageKey | ✅ |
| 5 | `index.ts` | Public exports | ✅ |
| 6 | `README.md` | Domain documentation | ✅ |
| 7 | `DEPENDENCIES.md` | Shared imports list | ✅ |

### Files to Delete After Migration

| File | Reason |
|------|--------|
| `features/dashboard/index.ts` | Old barrel |

---

## Domain 11: `profile`

### Target Structure

```
domains/profile/
├── README.md
├── DEPENDENCIES.md
├── index.ts
├── core/
│   └── types.ts
└── screens/
    └── ProfileScreen.tsx
```

### Files Moved ✅

| # | From | To | Status |
|---|------|-----|--------|
| 1 | `features/profile/ui/ProfilePage.tsx` | `screens/ProfileScreen.tsx` | ✅ |

### New Files Created ✅

| # | File | Purpose | Status |
|---|------|---------|--------|
| 2 | `core/types.ts` | UserProfile, UserStats, Preferences types | ✅ |
| 3 | `index.ts` | Public exports | ✅ |
| 4 | `README.md` | Domain documentation | ✅ |
| 5 | `DEPENDENCIES.md` | Shared imports list | ✅ |

### Files to Delete After Migration

| File | Reason |
|------|--------|
| `features/profile/index.ts` | Old barrel |

---

## Domain 12: `referrals`

### Target Structure

```
domains/referrals/
├── README.md
├── DEPENDENCIES.md
├── index.ts
├── core/
│   └── types.ts
└── screens/
    └── ReferralsScreen.tsx
```

### Files Moved ✅

| # | From | To | Status |
|---|------|-----|--------|
| 1 | `features/referrals/ui/ReferralsPage.tsx` | `screens/ReferralsScreen.tsx` | ✅ |

### New Files Created ✅

| # | File | Purpose | Status |
|---|------|---------|--------|
| 2 | `core/types.ts` | ReferralItem, ConsultItem, helper functions | ✅ |
| 3 | `index.ts` | Public exports | ✅ |
| 4 | `README.md` | Domain documentation | ✅ |
| 5 | `DEPENDENCIES.md` | Shared imports list | ✅ |

### Files to Delete After Migration

| File | Reason |
|------|--------|
| `features/referrals/index.ts` | Old barrel |

---

## Cleanup Complete ✅

### Deleted Folders

| Deleted | Reason |
|---------|--------|
| `src/entities/` | All content migrated to domains |
| `src/features/` | All content migrated to domains |
| `src/pages/` | All content migrated to domains |
| `src/components/` | Consolidated into `src/shared/components/` |
| `src/hooks/` | Duplicate of `src/shared/hooks/` |
| `src/lib/` | Duplicate of `src/shared/lib/` |
| `src/types/` | Duplicate of `src/shared/types/` |

### Deleted Unused UI Components (22 files)

The following unused components were removed from `src/shared/components/ui/`:

| # | Component | File |
|---|-----------|------|
| 1 | Accordion | `accordion.tsx` |
| 2 | Alert | `alert.tsx` |
| 3 | Aspect Ratio | `aspect-ratio.tsx` |
| 4 | Breadcrumb | `breadcrumb.tsx` |
| 5 | Carousel | `carousel.tsx` |
| 6 | Chart | `chart.tsx` |
| 7 | Collapsible | `collapsible.tsx` |
| 8 | Command | `command.tsx` |
| 9 | Context Menu | `context-menu.tsx` |
| 10 | Form | `form.tsx` |
| 11 | Hover Card | `hover-card.tsx` |
| 12 | Input OTP | `input-otp.tsx` |
| 13 | Menubar | `menubar.tsx` |
| 14 | Navigation Menu | `navigation-menu.tsx` |
| 15 | Pagination | `pagination.tsx` |
| 16 | Progress | `progress.tsx` |
| 17 | Resizable | `resizable.tsx` |
| 18 | Sidebar | `sidebar.tsx` |
| 19 | Slider | `slider.tsx` |
| 20 | Table | `table.tsx` |
| 21 | Toggle Group | `toggle-group.tsx` |
| 22 | use-toast | `use-toast.ts` (duplicate re-export) |

### Remaining UI Components (27 files)

Components still in use in `src/shared/components/ui/`:

```
alert-dialog, avatar, badge, button, calendar, card, checkbox,
dialog, drawer, dropdown-menu, input, label, popover, radio-group,
scroll-area, select, separator, sheet, skeleton, sonner, switch,
tabs, textarea, toast, toaster, toggle, tooltip
```

---

## Final Project Structure

```
src/
├── app/                        # App routing, guards, layout
│   ├── guards/
│   └── layout/
├── domains/                    # 12 self-contained domains
│   ├── dashboard/
│   ├── discharge-summary/
│   ├── patient-detail/
│   ├── patient-documents/
│   ├── patient-list/
│   ├── patient-medications/
│   ├── patient-notes/
│   ├── patient-registration/
│   ├── patient-workflow/
│   ├── profile/
│   ├── referrals/
│   └── tasks/
├── shared/                     # All shared code
│   ├── components/             # UI, layout, notifications, qr
│   │   ├── ui/                 # 27 components (Button, Card, Dialog, etc.)
│   │   ├── layout/             # Header, BottomBar
│   │   ├── common/             # BottomActionPanel
│   │   ├── notifications/      # NotificationsPopup
│   │   └── qr/                 # QRCodeGenerator
│   ├── hooks/                  # use-mobile, use-toast, useUploader
│   ├── lib/                    # api, filesApi, utils, s3upload
│   └── types/                  # api.ts, models.ts
└── test/                       # Test utilities
```

---

## Import Path Convention

| Import | Path |
|--------|------|
| Domain code | `@/domains/patient-list/...` |
| Shared UI | `@/shared/components/ui/...` |
| Shared hooks | `@/shared/hooks/...` |
| Shared lib | `@/shared/lib/...` |
| Shared types | `@/shared/types/...` |
| App routing | `@/app/...` |

---

## Notes

- **Import path alias**: Using `@/` for src root. Ensure `tsconfig.json` has this configured.
- **Theme tokens**: While fixing imports, also replace hardcoded hex colors with `useTheme()` tokens.
- **Cross-domain imports**: Domains can import from other domains via `@/domains/[name]`
- **Shared types**: Common types used across domains are in `@/shared/types/`

---

## Next Steps

1. **Fix imports** — Update all imports to use new paths (`@/domains/`, `@/shared/`)
2. **Run TypeScript check** — `npx tsc --noEmit`
3. **Run tests** — Verify all domain tests pass
4. **Update tsconfig** — Ensure path aliases are configured

---

## Commands Reference

```bash
# Check for broken imports after migration
npx tsc --noEmit

# Find files still importing from old paths
grep -r "from '@/entities/patient" src/
grep -r "from '@/features/patient-list" src/
grep -r "from '@/features/patient-detail" src/
grep -r "from '@/pages/Patient" src/

# Run tests for a domain
npm test -- --testPathPattern="domains/patient-list"
```

---

## React Native Migration (In Progress)

### Monorepo Structure

```
clinical-canvas-react/
├── apps/
│   └── mobile/              # Expo React Native app
├── packages/
│   └── core/                # Shared pure TypeScript logic
├── src/                     # Existing web app (Vite)
└── pnpm-workspace.yaml      # Monorepo config
```

### packages/core

Shared platform-agnostic code:

| Module | Files | Description |
|--------|-------|-------------|
| `types/` | `api.ts` | API models (Patient, Task, Note, etc.) |
| `api/` | `client.ts` | Platform-agnostic API client factory |
| `patient/` | `types.ts`, `normalize.ts`, `stage.ts`, `filter.ts`, `comorbidities.ts` | Patient utilities |
| `storage/` | `types.ts`, `pinnedPatients.ts` | Storage adapter pattern |

### apps/mobile

Expo mobile app with:

| Component | Status | Description |
|-----------|--------|-------------|
| Root Layout | ✅ | Query client, gesture handler, safe area |
| Tab Navigator | ✅ | Dashboard, Patients, Tasks, Profile |
| Dashboard Screen | ✅ | KPI tiles, quick actions |
| Patients Screen | ✅ | FlatList, search, filters, PatientCard |
| Tasks Screen | ✅ | Placeholder |
| Profile Screen | ✅ | Placeholder |
| PatientCard | ✅ | RN version with NativeWind |
| StageChip | ✅ | RN version |
| Badge | ✅ | RN version |
| Button | ✅ | RN version |
| Card | ✅ | RN version |
| usePatients | ✅ | TanStack Query hook |
| usePatientsFilters | ✅ | Uses core filter logic |
| usePinnedPatients | ✅ | Uses MMKV storage |
| MMKV Storage | ✅ | StorageAdapter implementation |

### Tech Stack

- **Expo SDK 52** + Expo Router
- **NativeWind 4** (Tailwind for RN)
- **TanStack Query** for data fetching
- **react-native-mmkv** for fast local storage
- **lucide-react-native** for icons

### Key Migrations

| Web | Mobile |
|-----|--------|
| `react-router-dom` | Expo Router |
| `localStorage` | MMKV |
| `lucide-react` | `lucide-react-native` |
| Tailwind CSS | NativeWind |
| `div`, `span`, `p` | `View`, `Text` |
| `onClick` | `onPress` |
| `window.open()` | `Linking.openURL()` |

### Getting Started

```bash
# From project root
pnpm install

# Start mobile dev server
cd apps/mobile
pnpm start
```

### Remaining Work

- [ ] Patient detail screen
- [ ] Add patient screen
- [ ] Notes, Tasks, Medications tabs
- [ ] Document picker/camera
- [ ] Offline file caching
- [ ] Push notifications
- [ ] Deep linking
