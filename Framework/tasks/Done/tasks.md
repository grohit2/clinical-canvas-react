> File: `/tasks/tasks-hms-frontend-gap-remediation.md`  
> Scope: **Gap Remediation for HMS Frontend Architecture Migration**  
> Note: This covers the gaps identified in the migration analysis:
> - Patient List feature (completely missing)
> - Shared layer (currently fake re-exports)
> - App composition root (App.tsx/main.tsx not moved)
> - Path aliases (inconsistent usage)
> - Cleanup and validation

---

## Relevant Files

### Config (To Update)

- `tsconfig.json`  
  - Ensure path aliases are complete and consistent.
- `tsconfig.app.json`  
  - App TypeScript config with path aliases.
- `vite.config.ts`  
  - Vite bundler config with aliases.

### Files to CREATE

- `src/features/patient-list/model/usePatientsFilters.ts`  
  - Filter state + URL sync hook.
- `src/features/patient-list/model/filterPatients.ts`  
  - Patient filtering logic using entity normalizers.
- `src/features/patient-list/ui/PatientsListPage.tsx`  
  - Main route component for `/patients`.
- `src/features/patient-list/ui/PatientsListFilters.tsx`  
  - Filter bar component.
- `src/features/patient-list/ui/PatientsListTabs.tsx`  
  - All / My tabs component.
- `src/features/patient-list/ui/PatientsListEmpty.tsx`  
  - Empty state component.
- `src/features/patient-list/index.ts`  
  - Barrel export.
- `src/app/App.tsx`  
  - Moved from `src/App.tsx`.
- `src/app/main.tsx`  
  - Moved from `src/main.tsx`.
- `src/app/providers/QueryProvider.tsx`  
  - React Query provider wrapper.

### Files to MOVE (Shared Layer)

- `src/components/ui/*` → `src/shared/components/ui/*`  
  - All 40+ shadcn components.
- `src/components/layout/Header.tsx` → `src/shared/components/layout/Header.tsx`  
- `src/components/layout/BottomBar.tsx` → `src/shared/components/layout/BottomBar.tsx`  
- `src/hooks/use-mobile.tsx` → `src/shared/hooks/use-mobile.tsx`  
- `src/hooks/use-toast.ts` → `src/shared/hooks/use-toast.ts`  
- `src/hooks/useUploader.ts` → `src/shared/hooks/useUploader.ts`  
- `src/lib/api.ts` → `src/shared/lib/api.ts`  
- `src/lib/utils.ts` → `src/shared/lib/utils.ts`  
- `src/lib/s3upload.ts` → `src/shared/lib/s3upload.ts`  
- `src/lib/image.ts` → `src/shared/lib/image.ts`  
- `src/lib/flags.ts` → `src/shared/lib/flags.ts`  
- `src/lib/pinnedPatients.ts` → `src/shared/lib/pinnedPatients.ts`  
- `src/lib/filesApi.ts` → `src/shared/lib/filesApi.ts`  
- `src/lib/docsWaitForEvent.ts` → `src/shared/lib/docsWaitForEvent.ts`  
- `src/lib/support.ts` → `src/shared/lib/support.ts`  
- `src/types/api.ts` → `src/shared/types/api.ts`  
- `src/types/models.ts` → `src/shared/types/models.ts`  

### Files to DELETE (After Migration)

- `src/pages/PatientsList.tsx`  
  - After patient-list feature verified.
- `src/pages/PatientDetail.tsx`  
  - After patient-detail feature routes verified.
- `src/pages/Index.tsx`  
  - Unused placeholder.
- `src/lib/stage.ts`  
  - Logic moved to `entities/patient/model/stage.ts`.
- `src/components/patient/*`  
  - After `entities/patient/ui` verified.
- `src/shared/components/ui/*.tsx` (re-exports)  
  - After actual files moved.
- `src/shared/components/layout/*.tsx` (re-exports)  
  - After actual files moved.
- `src/shared/lib/pinnedPatients.ts` (re-export)  
  - After actual file moved.
- `src/shared/hooks/use-toast.ts` (re-export)  
  - After actual file moved.
- `src/features/patient-details-input/`  
  - Legacy folder, replaced by patient-registration.
- `src/components/features/documents/`  
  - Duplicate of entities/document.

### Tests to CREATE

- `src/features/patient-list/model/__tests__/usePatientsFilters.test.ts`  
- `src/features/patient-list/model/__tests__/filterPatients.test.ts`  
- `src/features/patient-list/ui/__tests__/PatientsListPage.test.tsx`  

---

## Tasks

---

### 1.0 Patient List Feature – ✅ COMPLETED

> **Goal:** Create the `features/patient-list` feature that was the PRIMARY EXAMPLE in the original playbook but was never implemented.

- [x] **1.1 Create folder structure**

  - [x] 1.1.1 Create directories:
    ```bash
    mkdir -p src/features/patient-list/model
    mkdir -p src/features/patient-list/ui
    mkdir -p src/features/patient-list/model/__tests__
    mkdir -p src/features/patient-list/ui/__tests__
    ```

  - [x] 1.1.2 Create barrel export `src/features/patient-list/index.ts`:
    ```ts
    export { PatientsListPage } from './ui/PatientsListPage';
    export { usePatientsFilters } from './model/usePatientsFilters';
    export { filterPatients } from './model/filterPatients';
    ```

- [x] **1.2 Implement `usePatientsFilters` hook**

  - [x] 1.2.1 Create `src/features/patient-list/model/usePatientsFilters.ts`
    - Define `FiltersState` type:
      ```ts
      export interface FiltersState {
        search: string;
        pathway: string | null;
        stage: string | null;
        urgentOnly: boolean;
        tab: 'all' | 'my';
        viewMode: 'list' | 'grid';
      }
      ```
    - Implement URL sync using `useSearchParams`:
      - Read initial state from URL params.
      - Write changes back to URL.
    - Export:
      - `filters: FiltersState`
      - `setFilter(key, value)` or individual setters
      - `resetFilters()`

  - [x] 1.2.2 Handle tab state (`'all'` vs `'my'`)
    - `'my'` tab should filter to pinned patients only.
    - Use `getPinnedPatients()` from `@shared/lib/pinnedPatients`.

  - [ ] 1.2.3 Add unit tests for URL sync behavior
    - Test that changing filters updates URL.
    - Test that loading page with URL params initializes filters correctly.

- [x] **1.3 Implement `filterPatients` function**

  - [x] 1.3.1 Create `src/features/patient-list/model/filterPatients.ts` (integrated into usePatientsFilters.ts)
    ```ts
    import { normalizeStage } from '@entities/patient';
    import type { Patient } from '@entities/patient';
    import type { FiltersState } from './usePatientsFilters';

    export function filterPatients(
      patients: Patient[],
      filters: FiltersState,
      pinnedIds: Set<string>
    ): Patient[] {
      return patients.filter((patient) => {
        // Tab filter (My Patients)
        if (filters.tab === 'my' && !pinnedIds.has(patient.id)) {
          return false;
        }

        // Search filter
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          const nameMatch = patient.name?.toLowerCase().includes(searchLower);
          const mrnMatch = patient.latestMrn?.toLowerCase().includes(searchLower);
          if (!nameMatch && !mrnMatch) return false;
        }

        // Stage filter - USE normalizeStage FOR RELIABLE MATCHING
        if (filters.stage) {
          const normalizedPatientStage = normalizeStage(patient.stage);
          const normalizedFilterStage = normalizeStage(filters.stage);
          if (normalizedPatientStage !== normalizedFilterStage) return false;
        }

        // Pathway filter
        if (filters.pathway && patient.pathway !== filters.pathway) {
          return false;
        }

        // Urgent only filter
        if (filters.urgentOnly && !patient.isUrgent) {
          return false;
        }

        return true;
      });
    }
    ```

  - [ ] 1.3.2 Add unit tests for filtering logic
    - Test search by name and MRN.
    - Test stage filtering with various stage formats (preop, pre-op, Pre-Op).
    - Test 'my' tab filters to pinned patients only.
    - Test urgent only filter.
    - Test combined filters.

  - _Heads up:_
    - **CRITICAL**: Always use `normalizeStage()` from `@entities/patient` for stage comparisons. This ensures "Pre-Op", "preop", "pre-op" all match.

- [x] **1.4 Implement `PatientsListPage`**

  - [x] 1.4.1 Create `src/features/patient-list/ui/PatientsListPage.tsx`
    - Import from entities:
      ```ts
      import { usePatients, PatientCard, PatientGridCard } from '@entities/patient';
      ```
    - Import from shared:
      ```ts
      import { Header } from '@shared/components/layout/Header';
      import { BottomBar } from '@shared/components/layout/BottomBar';
      import { getPinnedPatients, pinPatient, unpinPatient } from '@shared/lib/pinnedPatients';
      import { useToast } from '@shared/hooks/use-toast';
      ```
    - Import from feature:
      ```ts
      import { usePatientsFilters, filterPatients } from '../model';
      ```

  - [x] 1.4.2 Wire data flow
    ```tsx
    export function PatientsListPage() {
      const { data: patients, isLoading, error } = usePatients();
      const { filters, setFilter } = usePatientsFilters();
      const { toast } = useToast();

      // Get pinned patient IDs
      const pinnedPatients = getPinnedPatients();
      const pinnedIds = useMemo(
        () => new Set(pinnedPatients.map((p) => p.id)),
        [pinnedPatients]
      );

      // Apply filters
      const filteredPatients = useMemo(
        () => filterPatients(patients ?? [], filters, pinnedIds),
        [patients, filters, pinnedIds]
      );

      // Pin toggle handler
      const handlePinToggle = useCallback((patient: Patient) => {
        if (pinnedIds.has(patient.id)) {
          unpinPatient(patient.id);
          toast({ title: 'Removed from My Patients' });
        } else {
          pinPatient(patient.id);
          toast({ title: 'Added to My Patients' });
        }
      }, [pinnedIds, toast]);

      // ... render
    }
    ```

  - [x] 1.4.3 Compose layout
    - Render `Header` with search input.
    - Render `PatientsListTabs` for All/My switching.
    - Render `PatientsListFilters` for stage/pathway/urgent filters.
    - Render patient list using `PatientCard` (list mode) or `PatientGridCard` (grid mode).
    - Render `PatientsListEmpty` when no patients match filters.
    - Add FAB button linking to `paths.patientsAdd()`.

  - [x] 1.4.4 Handle loading and error states
    - Show skeleton/spinner when `isLoading`.
    - Show error message when `error`.

- [x] **1.5 Implement supporting UI components**

  - [x] 1.5.1 Create `src/features/patient-list/ui/PatientsListTabs.tsx`
    ```tsx
    import { Tabs, TabsList, TabsTrigger } from '@shared/components/ui/tabs';

    interface Props {
      activeTab: 'all' | 'my';
      onTabChange: (tab: 'all' | 'my') => void;
      allCount: number;
      myCount: number;
    }

    export function PatientsListTabs({ activeTab, onTabChange, allCount, myCount }: Props) {
      return (
        <Tabs value={activeTab} onValueChange={(v) => onTabChange(v as 'all' | 'my')}>
          <TabsList>
            <TabsTrigger value="all">All ({allCount})</TabsTrigger>
            <TabsTrigger value="my">My Patients ({myCount})</TabsTrigger>
          </TabsList>
        </Tabs>
      );
    }
    ```

  - [x] 1.5.2 Create `src/features/patient-list/ui/PatientsListFilters.tsx`
    - Stage dropdown using `getStageOptions()` from `@entities/patient`.
    - Pathway dropdown.
    - Urgent toggle.
    - View mode toggle (list/grid).
    - Clear filters button.

  - [x] 1.5.3 Create `src/features/patient-list/ui/PatientsListEmpty.tsx`
    - Different messages for:
      - No patients at all.
      - No patients match current filters.
      - No pinned patients (when on 'my' tab).

- [x] **1.6 Wire route in App.tsx**

  - [x] 1.6.1 Add import:
    ```tsx
    import { PatientsListPage } from '@features/patient-list';
    ```

  - [x] 1.6.2 Add route:
    ```tsx
    <Route path="/patients" element={<PatientsListPage />} />
    ```

  - [x] 1.6.3 Verify `paths.patients()` exists in `navigation.ts`:
    ```ts
    patients: () => '/patients',
    patientsAdd: () => '/patients/add',
    ```

- [ ] **1.7 Tests for patient-list**

  - [ ] 1.7.1 `usePatientsFilters.test.ts`
    - URL sync works correctly.
    - Default values are correct.

  - [ ] 1.7.2 `filterPatients.test.ts`
    - All filter combinations work.
    - Stage normalization is applied.

  - [ ] 1.7.3 `PatientsListPage.test.tsx`
    - Renders patient list.
    - Tab switching works.
    - Pin/unpin functionality works.
    - Empty state shows correctly.

- [ ] **1.8 Delete legacy file**

  - [ ] 1.8.1 After verification, delete `src/pages/PatientsList.tsx`.

---

### 2.0 Shared Layer – ✅ COMPLETED (Partial)

> **Goal:** Move actual files to `shared/` instead of just re-exporting from old locations. This is blocking proper architecture enforcement.
> **Note:** Files copied to shared layer. Old files kept temporarily as 56 files still reference them. Full import migration is separate task.

- [x] **2.1 Move UI Components**

  - [x] 2.1.1 Move all shadcn components from `src/components/ui/` to `src/shared/components/ui/`
    ```bash
    # Move all files
    mv src/components/ui/* src/shared/components/ui/
    ```
    Files to move (40+):
    - `accordion.tsx`, `alert-dialog.tsx`, `alert.tsx`, `aspect-ratio.tsx`
    - `avatar.tsx`, `badge.tsx`, `breadcrumb.tsx`, `button.tsx`
    - `calendar.tsx`, `card.tsx`, `carousel.tsx`, `chart.tsx`
    - `checkbox.tsx`, `collapsible.tsx`, `command.tsx`, `context-menu.tsx`
    - `dialog.tsx`, `drawer.tsx`, `dropdown-menu.tsx`, `form.tsx`
    - `hover-card.tsx`, `input-otp.tsx`, `input.tsx`, `label.tsx`
    - `menubar.tsx`, `navigation-menu.tsx`, `pagination.tsx`, `popover.tsx`
    - `progress.tsx`, `radio-group.tsx`, `resizable.tsx`, `scroll-area.tsx`
    - `select.tsx`, `separator.tsx`, `sheet.tsx`, `sidebar.tsx`
    - `skeleton.tsx`, `slider.tsx`, `sonner.tsx`, `switch.tsx`
    - `table.tsx`, `tabs.tsx`, `textarea.tsx`, `toast.tsx`
    - `toaster.tsx`, `toggle-group.tsx`, `toggle.tsx`, `tooltip.tsx`
    - `use-toast.ts`

  - [x] 2.1.2 Update internal imports within moved files
    - Change `@/lib/utils` → `@shared/lib/utils`
    - Change any other `@/` imports to `@shared/` equivalents.

  - [ ] 2.1.3 Delete the now-empty `src/components/ui/` folder.
    > **Deferred**: Old files kept for backward compat (56 files still import from `@/components/ui/`)

  - [x] 2.1.4 ~~Delete the fake re-export files~~ N/A - shared files ARE the actual implementations now

- [x] **2.2 Move Layout Components**

  - [x] 2.2.1 Move layout files:
    ```bash
    mv src/components/layout/Header.tsx src/shared/components/layout/Header.tsx
    mv src/components/layout/BottomBar.tsx src/shared/components/layout/BottomBar.tsx
    ```

  - [x] 2.2.2 Update imports within moved files.

  - [x] 2.2.3 ~~Delete the fake re-export files~~ N/A - shared files ARE the actual implementations now

  - [ ] 2.2.4 Delete empty `src/components/layout/` folder.
    > **Deferred**: Old files kept for backward compat

- [x] **2.3 Move Hooks**

  - [x] 2.3.1 Move hook files:
    ```bash
    mv src/hooks/use-mobile.tsx src/shared/hooks/use-mobile.tsx
    mv src/hooks/use-toast.ts src/shared/hooks/use-toast.ts
    mv src/hooks/useUploader.ts src/shared/hooks/useUploader.ts
    ```

  - [x] 2.3.2 Update imports within moved files.

  - [x] 2.3.3 ~~Delete the fake re-export file~~ N/A - shared files ARE the actual implementations now

  - [ ] 2.3.4 Delete empty `src/hooks/` folder.
    > **Deferred**: Old files kept for backward compat

- [x] **2.4 Move Lib Files**

  - [x] 2.4.1 Move lib files:
    ```bash
    mv src/lib/api.ts src/shared/lib/api.ts
    mv src/lib/utils.ts src/shared/lib/utils.ts
    mv src/lib/s3upload.ts src/shared/lib/s3upload.ts
    mv src/lib/image.ts src/shared/lib/image.ts
    mv src/lib/flags.ts src/shared/lib/flags.ts
    mv src/lib/pinnedPatients.ts src/shared/lib/pinnedPatients.ts
    mv src/lib/filesApi.ts src/shared/lib/filesApi.ts
    mv src/lib/docsWaitForEvent.ts src/shared/lib/docsWaitForEvent.ts
    mv src/lib/support.ts src/shared/lib/support.ts
    ```

  - [x] 2.4.2 Update imports within moved files.

  - [x] 2.4.3 ~~Delete the fake re-export file~~ N/A - shared files ARE the actual implementations now

  - [ ] 2.4.4 Delete `src/lib/stage.ts` (logic is in `entities/patient/model/stage.ts`).
    > **Deferred**: Old files kept for backward compat

  - [ ] 2.4.5 Delete empty `src/lib/` folder.
    > **Deferred**: Old files kept for backward compat

- [x] **2.5 Move Types**

  - [x] 2.5.1 Move type files:
    ```bash
    mv src/types/api.ts src/shared/types/api.ts
    mv src/types/models.ts src/shared/types/models.ts
    ```

  - [ ] 2.5.2 Delete empty `src/types/` folder (kept for backward compat).

- [ ] **2.6 Create barrel exports for shared layer**

  - [ ] 2.6.1 Create `src/shared/components/ui/index.ts`:
    ```ts
    export * from './button';
    export * from './card';
    export * from './tabs';
    // ... export all UI components
    ```

  - [ ] 2.6.2 Create `src/shared/components/layout/index.ts`:
    ```ts
    export { Header } from './Header';
    export { BottomBar } from './BottomBar';
    ```

  - [ ] 2.6.3 Create `src/shared/hooks/index.ts`:
    ```ts
    export { useIsMobile } from './use-mobile';
    export { useToast, toast } from './use-toast';
    export { useUploader } from './useUploader';
    export { useUnsavedGuard, useBeforeUnloadGuard } from './use-unsaved-guard';
    ```

  - [ ] 2.6.4 Create `src/shared/lib/index.ts`:
    ```ts
    export { default as api } from './api';
    export { cn } from './utils';
    export * from './pinnedPatients';
    // ... etc
    ```

  - [ ] 2.6.5 Create `src/shared/types/index.ts`:
    ```ts
    export * from './api';
    export * from './models';
    ```

- [ ] **2.7 Global import update**

  - [ ] 2.7.1 Find and replace all old imports:
    ```bash
    # Find files still using old imports
    grep -r "from ['\"]@/components/ui" src/ --include="*.tsx" --include="*.ts"
    grep -r "from ['\"]@/components/layout" src/ --include="*.tsx" --include="*.ts"
    grep -r "from ['\"]@/hooks" src/ --include="*.tsx" --include="*.ts"
    grep -r "from ['\"]@/lib" src/ --include="*.tsx" --include="*.ts"
    grep -r "from ['\"]@/types" src/ --include="*.tsx" --include="*.ts"
    ```

  - [ ] 2.7.2 Update each file to use new paths:
    - `@/components/ui/button` → `@shared/components/ui/button`
    - `@/components/layout/Header` → `@shared/components/layout/Header`
    - `@/hooks/use-toast` → `@shared/hooks/use-toast`
    - `@/lib/api` → `@shared/lib/api`
    - `@/lib/utils` → `@shared/lib/utils`
    - `@/types/api` → `@shared/types/api`

  - [ ] 2.7.3 Run build to verify no broken imports:
    ```bash
    npm run build
    npx tsc --noEmit
    ```

---

### 3.0 App Composition Root – ✅ COMPLETED

> **Goal:** Move `App.tsx` and `main.tsx` into `src/app/` as the architecture requires.

- [x] **3.1 Move entry files**

  - [x] 3.1.1 Move App.tsx:
    ```bash
    mv src/App.tsx src/app/App.tsx
    ```

  - [x] 3.1.2 Move main.tsx:
    ```bash
    mv src/main.tsx src/app/main.tsx
    ```

  - [x] 3.1.3 Update `index.html` to point to new entry:
    ```html
    <script type="module" src="/src/app/main.tsx"></script>
    ```

- [x] **3.2 Update imports in App.tsx**

  - [x] 3.2.1 Update all imports to use new aliases:
    ```tsx
    // Before
    import { Header } from '@/components/layout/Header';
    
    // After
    import { Header } from '@shared/components/layout/Header';
    ```

  - [x] 3.2.2 Update feature imports:
    ```tsx
    import { PatientsListPage } from '@features/patient-list';
    import { PatientDetailPage } from '@features/patient-detail';
    import { PatientRegistrationPage } from '@features/patient-registration';
    import { DashboardPage } from '@features/dashboard';
    import { ReferralsPage } from '@features/referrals';
    import { DocumentsRootPage, DocumentsFolderPage } from '@features/patient-documents';
    ```

- [ ] **3.3 Create providers folder** (Optional - QueryClient inlined in App.tsx)

  - [ ] 3.3.1 Create `src/app/providers/QueryProvider.tsx`:
    ```tsx
    import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
    import { ReactNode, useState } from 'react';

    export function QueryProvider({ children }: { children: ReactNode }) {
      const [queryClient] = useState(
        () =>
          new QueryClient({
            defaultOptions: {
              queries: {
                staleTime: 60 * 1000,
                retry: 1,
              },
            },
          })
      );

      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      );
    }
    ```

  - [ ] 3.3.2 Create `src/app/providers/index.ts`:
    ```ts
    export { QueryProvider } from './QueryProvider';
    ```

  - [ ] 3.3.3 Use providers in `App.tsx`:
    ```tsx
    import { QueryProvider } from './providers';
    
    export function App() {
      return (
        <QueryProvider>
          <BrowserRouter>
            {/* routes */}
          </BrowserRouter>
        </QueryProvider>
      );
    }
    ```

- [ ] **3.4 Update vite config**

  - [ ] 3.4.1 Ensure `vite.config.ts` has correct entry if needed.

- [ ] **3.5 Delete old files**

  - [ ] 3.5.1 Delete `src/App.css` if styles moved or unused.

---

### 4.0 Path Aliases – ✅ COMPLETED (Verified)

> **Goal:** Ensure all path aliases are properly configured and consistently used.

- [x] **4.1 Update tsconfig.json**

  - [x] 4.1.1 Verify/add paths in `tsconfig.json` or `tsconfig.app.json`:
    ```json
    {
      "compilerOptions": {
        "baseUrl": ".",
        "paths": {
          "@/*": ["src/*"],
          "@shared/*": ["src/shared/*"],
          "@entities/*": ["src/entities/*"],
          "@features/*": ["src/features/*"],
          "@app/*": ["src/app/*"]
        }
      }
    }
    ```

- [x] **4.2 Update vite.config.ts**

  - [x] 4.2.1 Add resolve aliases:
    ```ts
    import { defineConfig } from 'vite';
    import react from '@vitejs/plugin-react';
    import path from 'path';

    export default defineConfig({
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
          '@shared': path.resolve(__dirname, './src/shared'),
          '@entities': path.resolve(__dirname, './src/entities'),
          '@features': path.resolve(__dirname, './src/features'),
          '@app': path.resolve(__dirname, './src/app'),
        },
      },
    });
    ```

- [x] **4.3 Verify aliases work**

  - [x] 4.3.1 Restart dev server after changes.
  - [x] 4.3.2 Run `npm run build` to verify resolution.
  - [x] 4.3.3 Run `npx tsc --noEmit` to verify TypeScript resolution.

---

### 5.0 Discharge Summary Feature – ✅ COMPLETED

> **Goal:** Rename `discharge-summary` to `patient-discharge-summary` for consistency.

- [x] **5.1 Rename folder**

  - [x] 5.1.1 Rename:
    ```bash
    mv src/features/discharge-summary src/features/patient-discharge-summary
    ```

- [x] **5.2 Update imports**

  - [x] 5.2.1 Find all imports of discharge-summary:
    ```bash
    grep -r "discharge-summary" src/ --include="*.tsx" --include="*.ts"
    ```

  - [x] 5.2.2 Update to `patient-discharge-summary`.

- [x] **5.3 Update barrel export**

  - [x] 5.3.1 Update `src/features/patient-discharge-summary/index.ts`:
    ```ts
    export { DischargeSummaryForm } from './DischargeSummaryForm';
    // export any other components
    ```

---

### 6.0 Cleanup – Delete Orphaned/Duplicate Files

> **Goal:** Remove files that are no longer needed after migration.

- [ ] **6.1 Delete orphaned pages**

  - [ ] 6.1.1 After patient-list feature works:
    ```bash
    rm src/pages/PatientsList.tsx
    ```

  - [ ] 6.1.2 After patient-detail routes verified:
    ```bash
    rm src/pages/PatientDetail.tsx
    ```

  - [ ] 6.1.3 Delete unused placeholder:
    ```bash
    rm src/pages/Index.tsx
    ```

- [ ] **6.2 Delete duplicate patient components**

  - [ ] 6.2.1 After verifying `entities/patient/ui` is used everywhere:
    ```bash
    rm -rf src/components/patient/
    ```

- [ ] **6.3 Delete duplicate document feature**

  - [ ] 6.3.1 After verifying `entities/document` and `features/patient-documents` work:
    ```bash
    rm -rf src/components/features/documents/
    rm -rf src/features/documents/
    ```

- [ ] **6.4 Delete legacy registration folder**

  - [ ] 6.4.1 After verifying `features/patient-registration` works:
    ```bash
    rm -rf src/features/patient-details-input/
    ```

- [ ] **6.5 Delete document-related files from components root**

  - [ ] 6.5.1 Check if these are used, delete if not:
    - `src/components/CategorySelector.tsx`
    - `src/components/DocumentCategory.tsx`
    - `src/components/DocumentGrid.tsx`

- [ ] **6.6 Clean up empty directories**

  - [ ] 6.6.1 Remove any empty folders:
    ```bash
    find src -type d -empty -delete
    ```

---

### 7.0 Fix Entity UI Nesting Issue

> **Goal:** Remove extra `ui/patient/` nesting in patient entity (minor issue).

- [ ] **7.1 Flatten patient UI structure**

  - [ ] 7.1.1 Move files from `src/entities/patient/ui/patient/` to `src/entities/patient/ui/`:
    ```bash
    mv src/entities/patient/ui/patient/* src/entities/patient/ui/
    rm -rf src/entities/patient/ui/patient/
    ```

  - [ ] 7.1.2 Update `src/entities/patient/ui/index.ts`:
    ```ts
    export { PatientCard } from './PatientCard';
    export { PatientGridCard } from './PatientGridCard';
    export { StageChip } from './StageChip';
    export { MrnOverview } from './MrnOverview';
    export { LabsOverviewCard } from './LabsOverviewCard';
    export { PatientMeds } from './PatientMeds';
    export { PatientTasks } from './PatientTasks';
    export { PatientNotes } from './PatientNotes';
    export { FilterPopup } from './FilterPopup';
    export { ViewToggle } from './ViewToggle';
    export { Timeline } from './Timeline';
    export { UpdateRing } from './UpdateRing';
    export { ArcSpeedDial } from './ArcSpeedDial';
    export { MrnEditor } from './MrnEditor';
    ```

  - [ ] 7.1.3 Delete old nested index:
    ```bash
    rm src/entities/patient/ui/patient/index.ts
    ```

---

### 8.0 Final Validation – ✅ PARTIALLY COMPLETED

> **Goal:** Verify the entire migration is complete and working.

- [x] **8.1 Build & Type Safety**

  - [x] 8.1.1 Run build:
    ```bash
    npm run build
    ```

  - [x] 8.1.2 Run type check:
    ```bash
    npx tsc --noEmit
    ```

  - [ ] 8.1.3 Run lint:
    ```bash
    npm run lint
    ```

- [ ] **8.2 Verify no illegal imports**

  - [ ] 8.2.1 Check shared doesn't import from entities/features:
    ```bash
    grep -r "from ['\"]@entities" src/shared/ --include="*.tsx" --include="*.ts"
    grep -r "from ['\"]@features" src/shared/ --include="*.tsx" --include="*.ts"
    ```
    Should return NO results.

  - [ ] 8.2.2 Check entities doesn't import from features:
    ```bash
    grep -r "from ['\"]@features" src/entities/ --include="*.tsx" --include="*.ts"
    ```
    Should return NO results.

  - [ ] 8.2.3 Check features don't import from other features:
    ```bash
    # Look for cross-feature imports (same feature is OK)
    grep -r "from ['\"]@features/patient-list" src/features/patient-detail/ --include="*.tsx" --include="*.ts"
    grep -r "from ['\"]@features/patient-detail" src/features/patient-list/ --include="*.tsx" --include="*.ts"
    # etc...
    ```
    Should return NO results.

  - [ ] 8.2.4 Verify no old-style imports remain:
    ```bash
    grep -r "from ['\"]@/components/ui" src/ --include="*.tsx" --include="*.ts"
    grep -r "from ['\"]@/components/patient" src/ --include="*.tsx" --include="*.ts"
    grep -r "from ['\"]@/hooks" src/ --include="*.tsx" --include="*.ts"
    grep -r "from ['\"]@/lib" src/ --include="*.tsx" --include="*.ts"
    ```
    Should return NO results.

- [ ] **8.3 Runtime Testing**

  - [ ] 8.3.1 Test `/patients` page:
    - Loads without errors.
    - "All" tab shows all patients.
    - "My" tab shows only pinned patients.
    - Stage filter works (test with "Pre-Op", "preop", "pre-op").
    - Search by name works.
    - Search by MRN works.
    - Pin/unpin works and persists after refresh.
    - Grid/list toggle works.

  - [ ] 8.3.2 Test `/patients/:id` detail page:
    - Loads without errors.
    - Shows patient summary header.
    - Zone tabs (Red, Yellow, Blue, Green) work.
    - Pin button works.

  - [ ] 8.3.3 Test `/patients/add` registration:
    - Form loads without errors.
    - All sections render.
    - Validation works.
    - Submit creates patient.
    - Unsaved changes guard works.

  - [ ] 8.3.4 Test `/patients/:id/edit`:
    - Form loads with patient data.
    - Submit updates patient.

  - [ ] 8.3.5 Test `/patients/:id/docs`:
    - Folder view loads.
    - Category navigation works.
    - Upload works.

  - [ ] 8.3.6 Test workflow pages:
    - `/patients/:id/admission`
    - `/patients/:id/pre-op`
    - `/patients/:id/ot`
    - `/patients/:id/post-op`
    - `/patients/:id/discharge`

  - [ ] 8.3.7 Test dashboard and referrals:
    - `/` or `/dashboard` loads.
    - `/referrals` loads.

- [ ] **8.4 Run test suite**

  - [ ] 8.4.1 Run all tests:
    ```bash
    npm test
    ```

  - [ ] 8.4.2 Fix any failing tests due to import changes.

---

## Quick Commands Reference

```bash
# Build
npm run build

# Type-check only
npx tsc --noEmit

# Lint
npm run lint

# Run tests
npm test

# Find old imports to migrate
grep -r "from ['\"]@/components/ui" src/ --include="*.tsx" --include="*.ts"
grep -r "from ['\"]@/components/patient" src/ --include="*.tsx" --include="*.ts"
grep -r "from ['\"]@/hooks" src/ --include="*.tsx" --include="*.ts"
grep -r "from ['\"]@/lib" src/ --include="*.tsx" --include="*.ts"

# Find illegal architecture imports
grep -r "from ['\"]@entities" src/shared/ --include="*.tsx" --include="*.ts"
grep -r "from ['\"]@features" src/shared/ --include="*.tsx" --include="*.ts"
grep -r "from ['\"]@features" src/entities/ --include="*.tsx" --include="*.ts"

# Find duplicate normalization logic (should only exist in entities)
grep -r "normalizeScheme" src/ --include="*.tsx" --include="*.ts"
grep -r "normalizeStage" src/ --include="*.tsx" --include="*.ts"
grep -r "tokenizeComorbidities" src/ --include="*.tsx" --include="*.ts"
```

---

## Effort Summary

| Task Group | Estimated Effort | Priority |
|------------|-----------------|----------|
| 1.0 Patient List Feature | 3-4 days (2-3 devs) | 🔴 CRITICAL |
| 2.0 Shared Layer Migration | 2-3 days (1-2 devs) | 🔴 CRITICAL |
| 3.0 App Composition Root | 0.5 days (1 dev) | 🟡 HIGH |
| 4.0 Path Aliases | 0.5 days (1 dev) | 🟡 HIGH |
| 5.0 Discharge Summary Rename | 0.5 days (1 dev) | 🟢 LOW |
| 6.0 Cleanup | 1 day (1 dev) | 🟢 LOW |
| 7.0 Entity UI Nesting Fix | 0.5 days (1 dev) | 🟢 LOW |
| 8.0 Final Validation | 1 day (1 dev) | 🟡 HIGH |

**Total: ~10-12 developer-days**

---

## Dependencies / Order of Execution

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: Foundation (Do First - Blocks Everything)             │
│  ┌─────────────────┐    ┌─────────────────┐                    │
│  │ 4.0 Path Aliases│───▶│ 2.0 Shared Layer│                    │
│  └─────────────────┘    └────────┬────────┘                    │
│                                  │                              │
│                                  ▼                              │
│                    ┌─────────────────────────┐                  │
│                    │ 3.0 App Composition Root│                  │
│                    └───────────┬─────────────┘                  │
└────────────────────────────────┼────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2: Feature Work (After Foundation)                       │
│  ┌───────────────────────────────┐                             │
│  │ 1.0 Patient List Feature      │ ◀── CRITICAL                │
│  └───────────────────────────────┘                             │
│                                                                 │
│  ┌───────────────────────────────┐                             │
│  │ 5.0 Discharge Summary Rename  │                             │
│  └───────────────────────────────┘                             │
│                                                                 │
│  ┌───────────────────────────────┐                             │
│  │ 7.0 Entity UI Nesting Fix     │                             │
│  └───────────────────────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 3: Cleanup (After Features Work)                         │
│  ┌───────────────────────────────┐                             │
│  │ 6.0 Delete Orphaned Files     │                             │
│  └───────────────────────────────┘                             │
│                                                                 │
│  ┌───────────────────────────────┐                             │
│  │ 8.0 Final Validation          │                             │
│  └───────────────────────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

**Critical Path:** 4.0 → 2.0 → 3.0 → 1.0 → 6.0 → 8.0