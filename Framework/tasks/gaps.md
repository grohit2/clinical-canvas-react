# HMS Frontend Architecture Migration - Gap Analysis Report

## Executive Summary

| Category | Status | Completion |
|----------|--------|------------|
| **Folder Structure** | Partially Done | ~40% |
| **Shared Layer Migration** | NOT DONE | ~10% |
| **Patient Entity** | DONE | ~95% |
| **Document Entity** | DONE | ~90% |
| **Features Migration** | Partially Done | ~60% |
| **App Layer Setup** | NOT DONE | ~20% |

**Overall Assessment: 45-50% Complete**

---

## CRITICAL GAPS (High Priority - Deploy Team Here First)

### 1. ❌ `features/patient-list` NOT CREATED AT ALL

**Plan Required:**
```
features/patient-list/
├── ui/
│   ├── PatientsListPage.tsx
│   ├── PatientsListFilters.tsx
│   ├── PatientsListTabs.tsx
│   └── PatientsListEmpty.tsx
├── model/
│   └── usePatientsFilters.ts
└── index.ts
```

**Current State:** 
- `pages/PatientsList.tsx` still exists at old location
- NO `features/patient-list/` folder created
- No `usePatientsFilters.ts` hook created
- No URL-synced filters implementation

**Impact:** This was the PRIMARY EXAMPLE feature in the plan demonstrating:
- Tab management (All vs My)
- Pinned patients filtering
- Stage filtering with `normalizeStage()`
- URL parameter sync

**Team Assignment: 2-3 developers, 3-4 days**

---

### 2. ❌ Shared Layer is Fake (Re-exports Only, Not Actual Migration)

**Plan Required:** Move actual files to `shared/`

**Current State - ONLY RE-EXPORTS:**
```typescript
// src/shared/components/ui/button.tsx - THIS IS WRONG
export { Button } from "@/components/ui/button";  // Just a re-export!

// src/shared/components/layout/Header.tsx - THIS IS WRONG
export { Header } from "@/components/layout/Header";  // Just a re-export!

// src/shared/lib/pinnedPatients.ts - THIS IS WRONG
export * from "@/lib/pinnedPatients";  // Just a re-export!
```

**What Should Have Been Done:**
- MOVE `components/ui/*` → `shared/components/ui/*` (40+ files)
- MOVE `components/layout/*` → `shared/components/layout/*`
- MOVE `hooks/*` → `shared/hooks/*`
- MOVE `lib/*` → `shared/lib/*`
- MOVE `types/*` → `shared/types/*`
- Update ALL import paths

**Files NOT Moved (Still at old locations):**
| Category | Files at Old Location | Should Be At |
|----------|----------------------|--------------|
| UI Components | 40+ files in `components/ui/` | `shared/components/ui/` |
| Layout | `BottomBar.tsx`, `Header.tsx` in `components/layout/` | `shared/components/layout/` |
| Hooks | `use-mobile.tsx`, `use-toast.ts`, `useUploader.ts` in `hooks/` | `shared/hooks/` |
| Lib | `api.ts`, `utils.ts`, `s3upload.ts`, `image.ts`, etc. in `lib/` | `shared/lib/` |
| Types | `api.ts`, `models.ts` in `types/` | `shared/types/` |

**Team Assignment: 1-2 developers, 2-3 days (tedious but straightforward)**

---

### 3. ❌ App.tsx and main.tsx NOT Moved

**Plan Required:**
```
src/app/
├── App.tsx          ← NOT HERE
├── main.tsx         ← NOT HERE  
├── navigation.ts    ✓ EXISTS
└── providers/
```

**Current State:**
- `App.tsx` still at `src/App.tsx`
- `main.tsx` still at `src/main.tsx`
- Only `navigation.ts` is in `src/app/`

**Team Assignment: 1 developer, 0.5 days**

---

### 4. ❌ Path Aliases Not Fully Configured/Used

**Plan Required Aliases:**
```ts
@shared/*   → src/shared/*
@entities/* → src/entities/*
@features/* → src/features/*
@app/*      → src/app/*
```

**Current State:** Mixed usage observed:
- Some files use `@shared/components/ui/card`
- Some files still use `@/components/ui/`
- Inconsistent throughout codebase

**Impact:** Import rule enforcement impossible without consistent aliases

**Team Assignment: 1 developer, 1 day (includes tsconfig.json + vite.config.ts updates)**

---

## PARTIALLY COMPLETED ITEMS (Medium Priority)

### 5. ⚠️ Discharge Summary Feature NOT Renamed

**Plan Required:**
```
features/patient-discharge-summary/    ← This name
```

**Current State:**
```
features/discharge-summary/            ← Old name still used
```

**Impact:** Naming inconsistency with other patient features

**Team Assignment: 1 developer, 0.5 days**

---

### 6. ⚠️ Duplicate/Orphaned Files Cleanup Needed

**Old locations that should be deleted after migration:**

| File/Folder | Status |
|-------------|--------|
| `components/patient/*` | ❌ Still exists (should be deleted after entities/patient/ui works) |
| `pages/Dashboard.tsx` | ✓ Appears deleted |
| `pages/Referrals.tsx` | ✓ Appears deleted |
| `pages/AddPatientPage.tsx` | ✓ Appears deleted |
| `pages/PatientsList.tsx` | ❌ Still exists (feature not created) |
| `pages/PatientDetail.tsx` | ❌ Still exists (should use feature) |
| `features/patient-details-input/` | ❌ Check if still referenced |
| `lib/stage.ts` | ❌ Should be deleted (logic moved to entities/patient/model/stage.ts) |

**Team Assignment: 1 developer, 1 day (after other migrations complete)**

---

## COMPLETED ITEMS ✓ (Verify & Document)

### 7. ✓ Patient Entity - WELL DONE

**Completed Structure:**
```
entities/patient/
├── model/
│   ├── types.ts           ✓
│   ├── normalize.ts       ✓
│   ├── comorbidities.ts   ✓
│   ├── stage.ts           ✓
│   ├── payload.ts         ✓
│   └── validation.ts      ✓
├── api/
│   └── usePatients.ts     ✓
├── ui/
│   └── patient/           ✓ (extra nesting - minor issue)
│       ├── PatientCard.tsx
│       ├── PatientGridCard.tsx
│       ├── StageChip.tsx
│       ├── etc...
└── index.ts               ✓ (exports all)
```

**Minor Issue:** Extra `ui/patient/` nesting not in plan but functional

**Action:** Verify `normalizeStage`, `normalizeScheme`, `tokenizeComorbidities` are being used correctly everywhere

---

### 8. ✓ Document Entity - DONE

**Completed Structure:**
```
entities/document/
├── model/
│   ├── types.ts           ✓
│   └── mapFromApi.ts      ✓
├── api/
│   └── usePatientDocuments.ts  ✓
├── ui/
│   ├── DocumentCard.tsx   ✓
│   ├── DocumentGrid.tsx   ✓
│   ├── DocumentLightbox.tsx ✓
│   ├── CategoryChips.tsx  ✓
│   ├── FolderCard.tsx     ✓
│   └── CategoryConfig.ts  ✓
└── index.ts               ✓
```

**Action:** Verify all document-related code uses `entities/document` imports

---

### 9. ✓ Patient Registration Feature - DONE

**Completed Structure:**
```
features/patient-registration/
├── model/
│   └── usePatientRegistrationForm.ts  ✓
├── ui/
│   ├── PatientRegistrationPage.tsx    ✓
│   └── sections/
│       ├── ButtonGroup.tsx            ✓
│       ├── PatientIdentitySection.tsx ✓
│       ├── RegistrationSection.tsx    ✓
│       ├── MedicalDetailsSection.tsx  ✓
│       ├── FilesPrioritySection.tsx   ✓
│       ├── EmergencyContactSection.tsx ✓
│       └── SubmitBar.tsx              ✓
└── index.ts                           ✓
```

**Note:** This follows the React Hook Form + sections pattern from the plan ✓

---

### 10. ✓ Patient Documents Feature - DONE

**Completed Structure:**
```
features/patient-documents/
├── ui/
│   ├── DocumentsRootPage.tsx    ✓
│   └── DocumentsFolderPage.tsx  ✓
└── index.ts                     ✓
```

---

### 11. ✓ Dashboard & Referrals Features - DONE

```
features/dashboard/
├── ui/
│   └── DashboardPage.tsx  ✓
└── index.ts               ✓

features/referrals/
├── ui/
│   └── ReferralsPage.tsx  ✓
└── index.ts               ✓
```

---

### 12. ✓ Patient Detail Feature - DONE

```
features/patient-detail/
├── ui/
│   ├── zones/
│   │   ├── BlueZone.tsx   ✓
│   │   ├── GreenZone.tsx  ✓
│   │   ├── RedZone.tsx    ✓
│   │   └── YellowZone.tsx ✓
│   ├── PatientDetailPage.tsx      ✓
│   ├── PatientCaseSheetTabs.tsx   ✓
│   └── PatientSummaryHeader.tsx   ✓
└── index.ts               ✓
```

---

### 13. ✓ Additional Good Work Found

- `app/guards/UnsavedChanges.tsx` - Form guard component ✓
- `app/layout/AppShell.tsx` - Layout wrapper ✓
- `features/patient-workflow/` - Workflow steps feature ✓
- Tests added for multiple components ✓

---

## RESOURCE ALLOCATION RECOMMENDATION

### Week 1 Priority (Critical Path)

| Task | Developers | Days | Blocker For |
|------|------------|------|-------------|
| Create `features/patient-list` | 2-3 | 3-4 | Core navigation |
| Move shared layer (not re-exports) | 1-2 | 2-3 | Import consistency |
| Setup path aliases properly | 1 | 1 | All imports |
| Move App.tsx/main.tsx | 1 | 0.5 | Folder structure |

### Week 2 Priority (Cleanup)

| Task | Developers | Days |
|------|------------|------|
| Rename discharge-summary feature | 1 | 0.5 |
| Delete orphaned files | 1 | 1 |
| Verify import rules everywhere | 1 | 1-2 |
| Update App.tsx routes | 1 | 1 |
| Run build/lint/type checks | 1 | 0.5 |

---

## VALIDATION CHECKLIST (After Migration)

### Build & Type Safety
- [ ] `npm run build` passes
- [ ] `npx tsc --noEmit` passes  
- [ ] `npm run lint` passes
- [ ] No circular dependency warnings

### Import Rule Violations to Check
```bash
# Should return NO results after migration:
grep -r "from ['\"]@/components/ui" src/ --include="*.tsx" --include="*.ts"
grep -r "from ['\"]@/components/patient" src/ --include="*.tsx" --include="*.ts"
grep -r "from ['\"]@/hooks" src/ --include="*.tsx" --include="*.ts"
grep -r "from ['\"]@/lib" src/ --include="*.tsx" --include="*.ts"

# After migration, all should use:
# @shared/*, @entities/*, @features/*, @app/*
```

### Runtime Tests
- [ ] `/patients` loads (with All/My tabs working)
- [ ] Stage filters work with normalized values
- [ ] "My Patients" shows only pinned patients
- [ ] Pinned patients persist across refresh
- [ ] `/patients/:id` detail page works
- [ ] `/patients/add` registration works
- [ ] `/patients/:id/docs` documents page works
- [ ] Dashboard loads
- [ ] Referrals page loads

---

## DETAILED FILE MAPPING (For Dev Reference)

### Files to CREATE

| New Location | Source/Notes |
|--------------|--------------|
| `features/patient-list/ui/PatientsListPage.tsx` | Refactor from `pages/PatientsList.tsx` |
| `features/patient-list/ui/PatientsListFilters.tsx` | Extract from PatientsList |
| `features/patient-list/ui/PatientsListTabs.tsx` | Extract All/My tab logic |
| `features/patient-list/ui/PatientsListEmpty.tsx` | Empty state component |
| `features/patient-list/model/usePatientsFilters.ts` | New - URL sync + filter state |
| `features/patient-list/index.ts` | Barrel export |

### Files to MOVE (Not Re-export)

| Current Location | New Location |
|-----------------|--------------|
| `components/ui/*` (40+ files) | `shared/components/ui/*` |
| `components/layout/Header.tsx` | `shared/components/layout/Header.tsx` |
| `components/layout/BottomBar.tsx` | `shared/components/layout/BottomBar.tsx` |
| `hooks/use-mobile.tsx` | `shared/hooks/use-mobile.tsx` |
| `hooks/use-toast.ts` | `shared/hooks/use-toast.ts` |
| `hooks/useUploader.ts` | `shared/hooks/useUploader.ts` |
| `lib/api.ts` | `shared/lib/api.ts` |
| `lib/utils.ts` | `shared/lib/utils.ts` |
| `lib/s3upload.ts` | `shared/lib/s3upload.ts` |
| `lib/image.ts` | `shared/lib/image.ts` |
| `lib/flags.ts` | `shared/lib/flags.ts` |
| `lib/pinnedPatients.ts` | `shared/lib/pinnedPatients.ts` |
| `types/api.ts` | `shared/types/api.ts` |
| `types/models.ts` | `shared/types/models.ts` |
| `App.tsx` | `app/App.tsx` |
| `main.tsx` | `app/main.tsx` |

### Files to DELETE (After Verification)

| File | Reason |
|------|--------|
| `pages/PatientsList.tsx` | After patient-list feature created |
| `pages/PatientDetail.tsx` | After routes use feature |
| `lib/stage.ts` | Logic moved to entities/patient/model/stage.ts |
| `components/patient/*` | After entities/patient/ui verified |
| `shared/components/ui/*.tsx` (re-exports) | After actual files moved |
| `shared/components/layout/*.tsx` (re-exports) | After actual files moved |
| `shared/lib/pinnedPatients.ts` (re-export) | After actual file moved |

---

## RISK ASSESSMENT

### HIGH RISK
1. **patient-list feature missing** - Core user flow broken if not done properly
2. **Import inconsistency** - Build failures, circular deps possible
3. **Re-export pattern** - Technical debt, no actual code organization benefit

### MEDIUM RISK  
1. **Routing updates needed** - App.tsx routes must point to new feature components
2. **Test coverage gaps** - New features need tests before release

### LOW RISK
1. **Naming conventions** - discharge-summary vs patient-discharge-summary (cosmetic)
2. **Extra folder nesting** - ui/patient/ in entities (works, just not per spec)

---

## CONCLUSION

**Approximately 45-50% of the migration is complete.** The good news is the hardest conceptual work (patient entity with normalization, document entity, registration form refactor) is DONE and done well.

**The biggest gaps are:**
1. The flagship `patient-list` feature was never created
2. The shared layer migration is fake (just re-exports, not actual moves)
3. App composition root not set up properly

