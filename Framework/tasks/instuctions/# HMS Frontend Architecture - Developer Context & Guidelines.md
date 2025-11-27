# HMS Frontend Architecture - Developer Context & Guidelines

> **Version:** 3.0  
> **Last Updated:** 2024  
> **Purpose:** Single source of truth for all frontend development decisions  
> **Audience:** All developers (current and future) working on HMS Clinical Canvas

---

## Table of Contents

1. [Architecture Philosophy](#1-architecture-philosophy)
2. [Folder Structure Reference](#2-folder-structure-reference)
3. [Layer Definitions & Rules](#3-layer-definitions--rules)
4. [Import Rules (NEVER VIOLATE)](#4-import-rules-never-violate)
5. [Path Aliases](#5-path-aliases)
6. [Decision Trees](#6-decision-trees)
7. [Naming Conventions](#7-naming-conventions)
8. [File Patterns & Templates](#8-file-patterns--templates)
9. [Entity Guidelines](#9-entity-guidelines)
10. [Feature Guidelines](#10-feature-guidelines)
11. [Shared Layer Guidelines](#11-shared-layer-guidelines)
12. [App Layer Guidelines](#12-app-layer-guidelines)
13. [Testing Standards](#13-testing-standards)
14. [State Management Patterns](#14-state-management-patterns)
15. [API & Data Flow Patterns](#15-api--data-flow-patterns)
16. [Form Patterns](#16-form-patterns)
17. [Navigation & Routing Patterns](#17-navigation--routing-patterns)
18. [UI Component Patterns](#18-ui-component-patterns)
19. [Code Review Checklist](#19-code-review-checklist)
20. [Common Mistakes to Avoid](#20-common-mistakes-to-avoid)
21. [Requirement Evaluation Framework](#21-requirement-evaluation-framework)
22. [Migration & Refactoring Guidelines](#22-migration--refactoring-guidelines)
23. [Quick Reference Card](#23-quick-reference-card)

---

## 1. Architecture Philosophy

### 1.1 Core Principles

| Principle | Description |
|-----------|-------------|
| **Domain-Driven** | Organize by business domain (patient, document, task), not by file type |
| **Layered Architecture** | Clear separation: shared → entities → features → app |
| **Single Responsibility** | Each module has one clear purpose |
| **Dependency Inversion** | Lower layers don't know about higher layers |
| **DRY (Don't Repeat Yourself)** | Centralize logic in entities, reuse across features |
| **Composition over Inheritance** | Build features by composing entities and shared components |

### 1.2 The LEGO Analogy

| Layer | LEGO Equivalent | HMS Example |
|-------|-----------------|-------------|
| `shared/` | Generic pieces (2x2 brick, wheels) | Button, Card, useToast, api.ts |
| `entities/` | LEGO kits with instructions | PatientCard, normalizePatient, usePatients |
| `features/` | Finished builds (police station) | PatientsListPage, PatientDetailPage |
| `app/` | Table holding all builds | Router, Providers, App.tsx |

### 1.3 The Golden Questions

Before writing ANY code, ask:

1. **"Could this exist in a completely different app (todo, finance, etc.)?"**
   - YES → `shared/`
   - NO → Continue to question 2

2. **"Is this reusable domain logic/UI used in 2+ places?"**
   - YES → `entities/<domain>/`
   - NO → Continue to question 3

3. **"Is this a complete user flow/screen?"**
   - YES → `features/<feature-name>/`
   - NO → Continue to question 4

4. **"Is this routing, providers, or app-level wiring?"**
   - YES → `app/`
   - NO → Re-evaluate; you may be over-engineering

---

## 2. Folder Structure Reference

### 2.1 Complete Target Structure

```
src/
├── app/                              # App-level wiring (COMPOSITION ROOT)
│   ├── App.tsx                       # Main app component with routes
│   ├── main.tsx                      # Entry point
│   ├── navigation.ts                 # Route path builders (paths.*)
│   ├── guards/                       # Route guards
│   │   ├── RequireAuth.tsx           # Auth protection
│   │   └── UnsavedChanges.tsx        # Form dirty state guard
│   ├── layout/                       # App-level layouts
│   │   └── AppShell.tsx              # Header + Content + BottomBar
│   └── providers/                    # Global providers
│       └── QueryProvider.tsx         # React Query setup
│
├── shared/                           # Generic, app-agnostic code
│   ├── components/
│   │   ├── ui/                       # shadcn primitives
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── ... (40+ components)
│   │   ├── layout/                   # Layout components
│   │   │   ├── Header.tsx
│   │   │   └── BottomBar.tsx
│   │   └── common/                   # Reusable composed components
│   │       ├── ConfirmDialog.tsx
│   │       ├── DateTimeField.tsx
│   │       └── TogglePillGroup.tsx
│   ├── hooks/                        # Generic hooks
│   │   ├── use-mobile.ts
│   │   ├── use-toast.ts
│   │   ├── use-unsaved-guard.ts
│   │   └── useUploader.ts
│   ├── lib/                          # Utilities
│   │   ├── api.ts                    # HTTP client
│   │   ├── utils.ts                  # cn(), formatters
│   │   ├── date.ts                   # Date helpers
│   │   ├── pinnedPatients.ts         # LocalStorage for pins
│   │   ├── s3upload.ts               # S3 upload helpers
│   │   └── logger.ts                 # Logging (no PHI)
│   └── types/                        # Global types
│       ├── api.ts                    # API DTOs
│       └── models.ts                 # Shared models
│
├── entities/                         # Domain building blocks
│   ├── patient/
│   │   ├── model/                    # Types, normalization, business logic
│   │   │   ├── types.ts              # Patient, Stage, Pathway, etc.
│   │   │   ├── normalize.ts          # normalizePatient, normalizeScheme
│   │   │   ├── stage.ts              # normalizeStage, stageLabel, stageColors
│   │   │   ├── comorbidities.ts      # tokenize, parse, build comorbidities
│   │   │   ├── validation.ts         # Zod schema, PatientFormValues
│   │   │   └── payload.ts            # toCreatePayload, toUpdatePayload
│   │   ├── api/                      # React Query hooks
│   │   │   └── usePatients.ts        # usePatients, usePatient, mutations
│   │   ├── ui/                       # Reusable patient UI
│   │   │   ├── PatientCard.tsx
│   │   │   ├── PatientGridCard.tsx
│   │   │   ├── StageChip.tsx
│   │   │   ├── MrnOverview.tsx
│   │   │   └── ... (more components)
│   │   └── index.ts                  # Barrel export
│   │
│   ├── document/
│   │   ├── model/
│   │   │   ├── types.ts              # DocCategory, DocumentItem
│   │   │   └── mapFromApi.ts         # API mapping functions
│   │   ├── api/
│   │   │   └── usePatientDocuments.ts
│   │   ├── ui/
│   │   │   ├── DocumentGrid.tsx
│   │   │   ├── DocumentLightbox.tsx
│   │   │   ├── CategoryChips.tsx
│   │   │   └── FolderCard.tsx
│   │   └── index.ts
│   │
│   ├── task/                         # Future entity
│   └── medication/                   # Future entity
│
└── features/                         # Complete user flows/screens
    ├── patient-list/
    │   ├── model/
    │   │   ├── usePatientsFilters.ts # Filter state + URL sync
    │   │   └── filterPatients.ts     # Filtering logic
    │   ├── ui/
    │   │   ├── PatientsListPage.tsx  # Main page component
    │   │   ├── PatientsListFilters.tsx
    │   │   ├── PatientsListTabs.tsx
    │   │   └── PatientsListEmpty.tsx
    │   └── index.ts
    │
    ├── patient-detail/
    │   ├── model/
    │   │   └── usePatientZones.ts
    │   ├── ui/
    │   │   ├── PatientDetailPage.tsx
    │   │   ├── PatientSummaryHeader.tsx
    │   │   ├── PatientCaseSheetTabs.tsx
    │   │   └── zones/
    │   │       ├── RedZone.tsx
    │   │       ├── YellowZone.tsx
    │   │       ├── BlueZone.tsx
    │   │       └── GreenZone.tsx
    │   └── index.ts
    │
    ├── patient-registration/
    │   ├── model/
    │   │   └── usePatientRegistrationForm.ts
    │   ├── ui/
    │   │   ├── PatientRegistrationPage.tsx
    │   │   └── sections/
    │   │       ├── PatientIdentitySection.tsx
    │   │       ├── MedicalDetailsSection.tsx
    │   │       └── SubmitBar.tsx
    │   └── index.ts
    │
    ├── patient-workflow/
    │   ├── model/
    │   │   └── useWorkflowSteps.ts
    │   ├── ui/
    │   │   ├── WorkflowStepper.tsx
    │   │   ├── AdmissionPage.tsx
    │   │   ├── PreOpPage.tsx
    │   │   ├── OTPage.tsx
    │   │   ├── PostOpPage.tsx
    │   │   └── DischargePage.tsx
    │   └── index.ts
    │
    ├── patient-documents/
    │   ├── ui/
    │   │   ├── DocumentsRootPage.tsx
    │   │   └── DocumentsFolderPage.tsx
    │   └── index.ts
    │
    ├── patient-discharge-summary/
    │   └── ...
    │
    ├── dashboard/
    │   ├── ui/
    │   │   └── DashboardPage.tsx
    │   └── index.ts
    │
    └── referrals/
        ├── ui/
        │   └── ReferralsPage.tsx
        └── index.ts
```

### 2.2 Folder Purposes

| Folder | Purpose | Contains |
|--------|---------|----------|
| `model/` | Business logic, types, state | Types, normalizers, Zod schemas, custom hooks for state |
| `api/` | Data fetching | React Query hooks, API calls |
| `ui/` | Presentational components | React components, styling |
| `__tests__/` | Tests | Test files co-located with source |

---

## 3. Layer Definitions & Rules

### 3.1 Shared Layer (`src/shared/`)

**Purpose:** Generic, app-agnostic building blocks

**Rules:**
- ✅ CAN contain: Generic UI, utilities, generic hooks
- ❌ CANNOT contain: Domain terms (patient, MRN, stage, discharge)
- ❌ CANNOT import from: `@entities/*`, `@features/*`
- ✅ CAN import from: External libraries only

**The "Todo App Test":** If a component/function could exist in a todo app, finance app, or any generic app, it belongs in `shared/`.

**Examples:**
```typescript
// ✅ GOOD - belongs in shared
export function cn(...inputs: ClassValue[]) { ... }
export function Button({ children }) { ... }
export function useToast() { ... }

// ❌ BAD - has domain knowledge, belongs in entities
export function formatPatientName(patient) { ... }
export function StageChip({ stage }) { ... }
```

### 3.2 Entities Layer (`src/entities/`)

**Purpose:** Domain-specific, reusable building blocks

**Rules:**
- ✅ CAN contain: Domain types, normalization, domain UI, data hooks
- ✅ CAN import from: `@shared/*`
- ❌ CANNOT import from: `@features/*`, `@app/*`
- ❌ CANNOT contain: Route-aware logic, URL params, navigation

**Each entity has three sub-folders:**

| Folder | Contains |
|--------|----------|
| `model/` | Types, normalization, validation, business logic |
| `api/` | React Query hooks, API integration |
| `ui/` | Reusable UI components for this domain |

**Entity UI Rules:**
- Components receive data via props
- Components do NOT use `useNavigate`, `useParams`, `useSearchParams`
- Components do NOT know about routes or URLs
- Components emit events via callbacks (`onClick`, `onPin`, etc.)

**Examples:**
```typescript
// ✅ GOOD - entity UI component
export function PatientCard({ patient, onPin, isPinned }: Props) {
  return (
    <Card onClick={() => onPin(patient)}>
      {patient.name}
    </Card>
  );
}

// ❌ BAD - uses routing (should be in feature)
export function PatientCard({ patient }: Props) {
  const navigate = useNavigate();
  return (
    <Card onClick={() => navigate(`/patients/${patient.id}`)}>
      {patient.name}
    </Card>
  );
}
```

### 3.3 Features Layer (`src/features/`)

**Purpose:** Complete user flows, screens, pages

**Rules:**
- ✅ CAN contain: Pages, route-aware logic, feature-specific state
- ✅ CAN import from: `@shared/*`, `@entities/*`
- ❌ CANNOT import from: Other features (`@features/other-feature`)
- ✅ CAN use: `useNavigate`, `useParams`, `useSearchParams`

**If Feature A needs something from Feature B:**
1. Move that "something" to an entity (if domain-specific)
2. Move that "something" to shared (if generic)

**Feature Structure:**
```
features/<feature-name>/
├── model/           # Feature-specific state, hooks
├── ui/              # Page components, feature UI
│   └── sections/    # Page sections (for complex pages)
└── index.ts         # Barrel export
```

### 3.4 App Layer (`src/app/`)

**Purpose:** Composition root, app wiring

**Rules:**
- ✅ CAN contain: Router, providers, guards, layouts
- ✅ CAN import from: ALL layers
- ❌ CANNOT contain: Business logic, domain logic

**App is purely about wiring:**
- Which routes exist
- Which providers wrap the app
- Which guards protect routes
- Which layouts are used

---

## 4. Import Rules (NEVER VIOLATE)

### 4.1 The Dependency Direction

```
┌─────────────────────────────────────────────────────────────┐
│                          app                                 │
│  (can import from: shared, entities, features)              │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────┐
│                        features                              │
│  (can import from: shared, entities)                        │
│  (CANNOT import from: other features)                       │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────┐
│                        entities                              │
│  (can import from: shared only)                             │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────────────────────────────────────┐
│                         shared                               │
│  (can import from: external libraries only)                 │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Import Rule Matrix

| From ↓ / To → | shared | entities | features | app |
|---------------|--------|----------|----------|-----|
| **shared** | ✅ | ❌ | ❌ | ❌ |
| **entities** | ✅ | ✅ (same entity) | ❌ | ❌ |
| **features** | ✅ | ✅ | ❌ | ❌ |
| **app** | ✅ | ✅ | ✅ | ✅ |

### 4.3 Violation Examples

```typescript
// ❌ VIOLATION: shared importing from entities
// File: src/shared/lib/utils.ts
import { Patient } from '@entities/patient';  // WRONG!

// ❌ VIOLATION: entities importing from features
// File: src/entities/patient/ui/PatientCard.tsx
import { usePatientsFilters } from '@features/patient-list';  // WRONG!

// ❌ VIOLATION: feature importing from another feature
// File: src/features/patient-detail/ui/PatientDetailPage.tsx
import { PatientsListFilters } from '@features/patient-list';  // WRONG!

// ✅ CORRECT: Move shared component to entities or shared
// File: src/entities/patient/ui/PatientCard.tsx
import { Button } from '@shared/components/ui/button';  // CORRECT!
import { normalizeStage } from '../model/stage';  // CORRECT!
```

### 4.4 How to Fix Violations

| Violation | Solution |
|-----------|----------|
| Feature A needs component from Feature B | Move component to `entities/` or `shared/` |
| Entity needs route info | Pass as prop from feature |
| Shared needs domain type | Move to entities, or pass as generic |

---

## 5. Path Aliases

### 5.1 Configured Aliases

```typescript
// tsconfig.json / vite.config.ts
{
  "@/*": ["src/*"],           // Legacy, minimize usage
  "@shared/*": ["src/shared/*"],
  "@entities/*": ["src/entities/*"],
  "@features/*": ["src/features/*"],
  "@app/*": ["src/app/*"]
}
```

### 5.2 Import Preferences

```typescript
// ✅ PREFERRED: Use layer aliases
import { Button } from '@shared/components/ui/button';
import { usePatients, PatientCard } from '@entities/patient';
import { PatientsListPage } from '@features/patient-list';

// ✅ PREFERRED: Use barrel exports
import { normalizeStage, PatientCard, usePatients } from '@entities/patient';

// ⚠️ AVOID: Deep imports (use barrel exports instead)
import { normalizeStage } from '@entities/patient/model/stage';

// ❌ WRONG: Old-style imports (after migration)
import { Button } from '@/components/ui/button';
import { usePatients } from '@/hooks/usePatients';
```

---

## 6. Decision Trees

### 6.1 "Where Does This Code Go?"

```
START: I need to add new code
│
├─► Is it a new PAGE/SCREEN the user navigates to?
│   │
│   └─► YES: Create feature in features/<feature-name>/
│       │
│       ├─► Does it need URL params or navigation?
│       │   └─► YES: Put in features/<feature-name>/ui/
│       │
│       └─► Does it need local state/hooks?
│           └─► YES: Put in features/<feature-name>/model/
│
├─► Is it REUSABLE DOMAIN logic/UI (used in 2+ places)?
│   │
│   └─► YES: Create/add to entities/<domain>/
│       │
│       ├─► Is it a TYPE, VALIDATION, or NORMALIZATION?
│       │   └─► Put in entities/<domain>/model/
│       │
│       ├─► Is it a DATA FETCHING hook?
│       │   └─► Put in entities/<domain>/api/
│       │
│       └─► Is it a UI COMPONENT?
│           └─► Put in entities/<domain>/ui/
│
├─► Is it GENERIC (could exist in any app)?
│   │
│   └─► YES: Put in shared/
│       │
│       ├─► Is it a UI COMPONENT?
│       │   └─► Put in shared/components/ui/ or shared/components/common/
│       │
│       ├─► Is it a HOOK?
│       │   └─► Put in shared/hooks/
│       │
│       ├─► Is it a UTILITY FUNCTION?
│       │   └─► Put in shared/lib/
│       │
│       └─► Is it a TYPE?
│           └─► Put in shared/types/
│
└─► Is it ROUTING, PROVIDERS, or APP WIRING?
    │
    └─► YES: Put in app/
        │
        ├─► Is it a ROUTE GUARD?
        │   └─► Put in app/guards/
        │
        ├─► Is it a LAYOUT?
        │   └─► Put in app/layout/
        │
        └─► Is it a PROVIDER?
            └─► Put in app/providers/
```

### 6.2 "Should I Create a New Entity?"

```
Is there a new DOMAIN CONCEPT in the app?
│
├─► YES: Consider if it needs:
│   │
│   ├─► Its own API endpoints? (e.g., /api/tasks)
│   ├─► Its own types/interfaces?
│   ├─► Its own normalization/validation?
│   ├─► Its own reusable UI components?
│   │
│   └─► If 2+ of above are YES:
│       └─► CREATE new entity: entities/<domain>/
│
└─► NO: Use existing entity or shared
```

### 6.3 "Should I Create a New Feature?"

```
Is there a new USER FLOW or SCREEN?
│
├─► Does it have its own URL/route?
│   └─► YES: Create feature
│
├─► Is it a distinct user journey?
│   └─► YES: Create feature
│
├─► Is it just a modal/dialog within another feature?
│   └─► NO: Keep in parent feature or move to entity UI
│
└─► Decision:
    ├─► New route → New feature
    ├─► Reusable across features → Entity or shared
    └─► One-time use → Keep in current feature
```

---

## 7. Naming Conventions

### 7.1 Folders

| Type | Convention | Example |
|------|------------|---------|
| Feature folders | `kebab-case`, noun-based | `patient-list`, `patient-detail` |
| Entity folders | `singular`, `lowercase` | `patient`, `document`, `task` |
| Sub-folders | `lowercase` | `model`, `api`, `ui`, `sections` |

### 7.2 Files

| Type | Convention | Example |
|------|------------|---------|
| React components | `PascalCase.tsx` | `PatientCard.tsx`, `PatientsListPage.tsx` |
| Hooks | `use<Name>.ts` or `use-<name>.ts` | `usePatients.ts`, `use-toast.ts` |
| Utilities | `camelCase.ts` or `kebab-case.ts` | `normalize.ts`, `date-utils.ts` |
| Types | `types.ts` or `<name>.types.ts` | `types.ts` |
| Tests | `<filename>.test.ts(x)` | `PatientCard.test.tsx` |
| Index/barrel | `index.ts` | `index.ts` |

### 7.3 Exports

| Type | Convention | Example |
|------|------------|---------|
| Components | Named export, PascalCase | `export function PatientCard()` |
| Hooks | Named export, camelCase | `export function usePatients()` |
| Types | Named export, PascalCase | `export type Patient = ...` |
| Constants | Named export, UPPER_SNAKE | `export const STAGES = [...]` |
| Utilities | Named export, camelCase | `export function normalizeStage()` |
| Default API client | Default export | `export default api` |

### 7.4 Component Props

```typescript
// Interface naming: <ComponentName>Props
interface PatientCardProps {
  patient: Patient;
  isPinned: boolean;
  onPin: (patient: Patient) => void;
  className?: string;
}

// Destructure in function signature
export function PatientCard({ patient, isPinned, onPin, className }: PatientCardProps) {
  // ...
}
```

### 7.5 Feature Page Naming

| Pattern | Example |
|---------|---------|
| List page | `<Entity>sListPage.tsx` → `PatientsListPage.tsx` |
| Detail page | `<Entity>DetailPage.tsx` → `PatientDetailPage.tsx` |
| Add/Create page | `<Entity>RegistrationPage.tsx` or `Add<Entity>Page.tsx` |
| Edit page | Use same as Add with mode detection |

---

## 8. File Patterns & Templates

### 8.1 Entity Barrel Export (`entities/<entity>/index.ts`)

```typescript
// src/entities/patient/index.ts

// Model exports
export * from './model/types';
export * from './model/normalize';
export * from './model/stage';
export * from './model/comorbidities';
export * from './model/validation';
export * from './model/payload';

// API exports
export * from './api/usePatients';

// UI exports
export * from './ui';
```

### 8.2 Feature Barrel Export (`features/<feature>/index.ts`)

```typescript
// src/features/patient-list/index.ts

export { PatientsListPage } from './ui/PatientsListPage';
export { usePatientsFilters } from './model/usePatientsFilters';
export { filterPatients } from './model/filterPatients';
```

### 8.3 React Query Hook Template

```typescript
// src/entities/patient/api/usePatients.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@shared/lib/api';
import { normalizePatient } from '../model/normalize';
import type { Patient } from '../model/types';

// Query keys factory
export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (filters: object) => [...patientKeys.lists(), filters] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
};

// List hook
export function usePatients(filters?: object) {
  return useQuery({
    queryKey: patientKeys.list(filters ?? {}),
    queryFn: async () => {
      const response = await api.patients.list(filters);
      return response.data.map(normalizePatient);
    },
  });
}

// Detail hook
export function usePatient(id: string) {
  return useQuery({
    queryKey: patientKeys.detail(id),
    queryFn: async () => {
      const response = await api.patients.get(id);
      return normalizePatient(response.data);
    },
    enabled: !!id,
  });
}

// Mutation hook
export function useCreatePatient() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: CreatePatientPayload) => api.patients.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}
```

### 8.4 Feature Page Template

```typescript
// src/features/patient-list/ui/PatientsListPage.tsx

import { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Shared imports
import { Header } from '@shared/components/layout/Header';
import { Button } from '@shared/components/ui/button';
import { useToast } from '@shared/hooks/use-toast';
import { getPinnedPatients, pinPatient, unpinPatient } from '@shared/lib/pinnedPatients';

// Entity imports
import { usePatients, PatientCard, PatientGridCard } from '@entities/patient';
import type { Patient } from '@entities/patient';

// Feature imports (same feature only)
import { usePatientsFilters, filterPatients } from '../model';
import { PatientsListFilters } from './PatientsListFilters';
import { PatientsListTabs } from './PatientsListTabs';
import { PatientsListEmpty } from './PatientsListEmpty';

// Navigation
import { paths } from '@app/navigation';

export function PatientsListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Data
  const { data: patients, isLoading, error } = usePatients();
  const { filters, setFilter } = usePatientsFilters();
  
  // Derived state
  const pinnedIds = useMemo(() => {
    const pinned = getPinnedPatients();
    return new Set(pinned.map(p => p.id));
  }, []);
  
  const filteredPatients = useMemo(
    () => filterPatients(patients ?? [], filters, pinnedIds),
    [patients, filters, pinnedIds]
  );
  
  // Handlers
  const handlePatientClick = useCallback((patient: Patient) => {
    navigate(paths.patient(patient.id));
  }, [navigate]);
  
  const handlePinToggle = useCallback((patient: Patient) => {
    if (pinnedIds.has(patient.id)) {
      unpinPatient(patient.id);
      toast({ title: 'Removed from My Patients' });
    } else {
      pinPatient(patient.id);
      toast({ title: 'Added to My Patients' });
    }
  }, [pinnedIds, toast]);
  
  // Loading state
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  // Error state
  if (error) {
    return <div>Error loading patients</div>;
  }
  
  // Render
  return (
    <div className="min-h-screen">
      <Header title="Patients" />
      
      <PatientsListTabs
        activeTab={filters.tab}
        onTabChange={(tab) => setFilter('tab', tab)}
      />
      
      <PatientsListFilters
        filters={filters}
        onFilterChange={setFilter}
      />
      
      {filteredPatients.length === 0 ? (
        <PatientsListEmpty tab={filters.tab} />
      ) : (
        <div className="grid gap-4 p-4">
          {filteredPatients.map((patient) => (
            <PatientCard
              key={patient.id}
              patient={patient}
              isPinned={pinnedIds.has(patient.id)}
              onClick={() => handlePatientClick(patient)}
              onPin={() => handlePinToggle(patient)}
            />
          ))}
        </div>
      )}
      
      <Button
        className="fixed bottom-20 right-4"
        onClick={() => navigate(paths.patientsAdd())}
      >
        Add Patient
      </Button>
    </div>
  );
}
```

### 8.5 Entity UI Component Template

```typescript
// src/entities/patient/ui/PatientCard.tsx

import { memo } from 'react';
import { Card } from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Pin, PinOff } from 'lucide-react';
import { cn } from '@shared/lib/utils';
import { StageChip } from './StageChip';
import type { Patient } from '../model/types';

interface PatientCardProps {
  patient: Patient;
  isPinned?: boolean;
  onClick?: () => void;
  onPin?: () => void;
  className?: string;
}

export const PatientCard = memo(function PatientCard({
  patient,
  isPinned = false,
  onClick,
  onPin,
  className,
}: PatientCardProps) {
  return (
    <Card
      className={cn('p-4 cursor-pointer hover:shadow-md transition-shadow', className)}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium">{patient.name}</h3>
          <p className="text-sm text-muted-foreground">
            MRN: {patient.latestMrn}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <StageChip stage={patient.stage} />
          
          {onPin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onPin();
              }}
            >
              {isPinned ? <PinOff /> : <Pin />}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
});
```

### 8.6 Normalization Function Template

```typescript
// src/entities/patient/model/normalize.ts

import type { Patient, SchemeOption } from './types';
import { SCHEME_OPTIONS } from './types';

/**
 * Normalizes a scheme value to a valid SchemeOption.
 * Handles various input formats and defaults to 'OTHERS'.
 */
export function normalizeScheme(value?: string | null): SchemeOption {
  if (!value) return 'OTHERS';
  
  const normalized = value.trim().toUpperCase();
  
  if (SCHEME_OPTIONS.includes(normalized as SchemeOption)) {
    return normalized as SchemeOption;
  }
  
  // Handle known variations
  if (['UNKNOWN', 'GENERAL', 'OTHER'].includes(normalized)) {
    return 'OTHERS';
  }
  
  return 'OTHERS';
}

/**
 * Normalizes a raw patient object from the API.
 * Applies all field normalizations and ensures consistent data shape.
 */
export function normalizePatient(raw: Patient): Patient {
  return {
    ...raw,
    scheme: normalizeScheme(raw.scheme),
    stage: normalizeStage(raw.stage),
    // ... other normalizations
  };
}
```

---

## 9. Entity Guidelines

### 9.1 When to Create an Entity

Create a new entity when:
- [ ] It's a core domain concept (patient, document, task, medication)
- [ ] It has its own API endpoints
- [ ] It has its own types/interfaces
- [ ] It needs normalization or validation
- [ ] Its UI components are used in 2+ features

### 9.2 Entity Checklist

Every entity SHOULD have:
- [ ] `model/types.ts` - Type definitions and constants
- [ ] `model/normalize.ts` - Data normalization functions
- [ ] `api/use<Entity>.ts` - React Query hooks
- [ ] `index.ts` - Barrel export

Every entity MAY have:
- [ ] `model/validation.ts` - Zod schemas for forms
- [ ] `model/payload.ts` - API payload adapters
- [ ] `ui/*.tsx` - Reusable UI components

### 9.3 Entity Model Rules

```typescript
// ✅ GOOD: Pure functions, no side effects
export function normalizeStage(value?: string): Stage {
  // Pure transformation
  return normalized;
}

// ✅ GOOD: Constants exported for reuse
export const STAGES = ['onboarding', 'preop', 'intraop', 'postop', 'discharge'] as const;

// ❌ BAD: Side effects in model
export function normalizeStage(value?: string): Stage {
  console.log('Normalizing:', value);  // Side effect!
  localStorage.setItem('lastStage', value);  // Side effect!
  return normalized;
}
```

### 9.4 Entity API Rules

```typescript
// ✅ GOOD: Always normalize in hooks
export function usePatients() {
  return useQuery({
    queryKey: patientKeys.all,
    queryFn: async () => {
      const data = await api.patients.list();
      return data.map(normalizePatient);  // Always normalize!
    },
  });
}

// ❌ BAD: Returning raw API data
export function usePatients() {
  return useQuery({
    queryKey: patientKeys.all,
    queryFn: () => api.patients.list(),  // Raw data, not normalized!
  });
}
```

### 9.5 Entity UI Rules

```typescript
// ✅ GOOD: Props-driven, no routing knowledge
interface PatientCardProps {
  patient: Patient;
  onClick?: () => void;  // Callback, not navigation
}

// ❌ BAD: Uses routing directly
function PatientCard({ patient }: Props) {
  const navigate = useNavigate();  // NO! Entity shouldn't know routes
  return <Card onClick={() => navigate(`/patients/${patient.id}`)} />;
}
```

---

## 10. Feature Guidelines

### 10.1 When to Create a Feature

Create a new feature when:
- [ ] It's a distinct user flow or screen
- [ ] It has its own route/URL
- [ ] It needs URL state (search params, path params)
- [ ] It composes multiple entities

### 10.2 Feature Checklist

Every feature MUST have:
- [ ] `ui/<FeatureName>Page.tsx` - Main page component
- [ ] `index.ts` - Barrel export

Every feature MAY have:
- [ ] `model/use<Feature>State.ts` - Feature-specific state hooks
- [ ] `ui/sections/*.tsx` - Page sections for complex pages

### 10.3 Feature Composition Pattern

Features are "traffic cops" that:
1. Get route params (`useParams`, `useSearchParams`)
2. Call entity hooks (`usePatients`, `usePatient`)
3. Manage feature-specific state (`usePatientsFilters`)
4. Compose entity UI and shared UI
5. Handle navigation (`useNavigate`, `paths.*`)

```typescript
export function PatientDetailPage() {
  // 1. Route params
  const { id } = useParams();
  
  // 2. Entity data
  const { data: patient, isLoading } = usePatient(id!);
  
  // 3. Feature state (if needed)
  const [activeZone, setActiveZone] = useState('red');
  
  // 4. Navigation
  const navigate = useNavigate();
  
  // 5. Compose
  return (
    <div>
      <Header />  {/* shared */}
      <PatientSummaryHeader patient={patient} />  {/* entity or feature */}
      <PatientCaseSheetTabs zone={activeZone} onZoneChange={setActiveZone} />
    </div>
  );
}
```

### 10.4 Feature Isolation

Features should NEVER import from other features:

```typescript
// ❌ WRONG: Cross-feature import
import { PatientsListFilters } from '@features/patient-list';

// ✅ CORRECT: Move to entity if shared
import { PatientFilters } from '@entities/patient';

// ✅ CORRECT: Move to shared if generic
import { FilterBar } from '@shared/components/common/FilterBar';
```

---

## 11. Shared Layer Guidelines

### 11.1 What Belongs in Shared

| Category | Examples |
|----------|----------|
| UI Primitives | Button, Card, Dialog, Input, Tabs |
| Layout | Header, BottomBar, AppShell |
| Generic Hooks | useToast, useMobile, useDebounce |
| Utilities | cn(), formatDate(), debounce() |
| API Client | api.ts (HTTP wrapper) |
| Types | Generic API response types |

### 11.2 What Does NOT Belong in Shared

| Category | Should Go To |
|----------|--------------|
| PatientCard | `entities/patient/ui/` |
| normalizeStage | `entities/patient/model/` |
| usePatients | `entities/patient/api/` |
| PatientsListPage | `features/patient-list/ui/` |

### 11.3 Shared Component Rules

```typescript
// ✅ GOOD: Generic, no domain knowledge
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  children: ReactNode;
  onClick?: () => void;
}

// ❌ BAD: Has domain knowledge
interface ButtonProps {
  patient?: Patient;  // Domain type!
  onPatientSelect?: (p: Patient) => void;  // Domain callback!
}
```

---

## 12. App Layer Guidelines

### 12.1 Navigation.ts Pattern

```typescript
// src/app/navigation.ts

export const paths = {
  // Root
  root: () => '/',
  
  // Patients
  patients: () => '/patients',
  patientsAdd: () => '/patients/add',
  patient: (id: string) => `/patients/${id}`,
  patientEdit: (id: string) => `/patients/${id}/edit`,
  patientDocs: (id: string) => `/patients/${id}/docs`,
  patientDocsCategory: (id: string, category: string) => `/patients/${id}/docs/${category}`,
  
  // Workflow
  patientAdmission: (id: string) => `/patients/${id}/admission`,
  patientPreOp: (id: string) => `/patients/${id}/pre-op`,
  patientOt: (id: string) => `/patients/${id}/ot`,
  patientPostOp: (id: string) => `/patients/${id}/post-op`,
  patientDischarge: (id: string) => `/patients/${id}/discharge`,
  
  // Other
  dashboard: () => '/dashboard',
  referrals: () => '/referrals',
} as const;
```

### 12.2 Using Paths

```typescript
// ✅ ALWAYS use paths helper
navigate(paths.patient(id));
navigate(paths.patientsAdd());

// ❌ NEVER hardcode routes
navigate(`/patients/${id}`);
navigate('/patients/add');
```

### 12.3 Route Guards

```typescript
// src/app/guards/UnsavedChanges.tsx

export function UnsavedChangesGuard({ children }: { children: ReactNode }) {
  const { isDirty } = useFormContext();
  
  useBlocker(
    useCallback(
      () => isDirty && !window.confirm('Discard changes?'),
      [isDirty]
    )
  );
  
  return <>{children}</>;
}
```

---

## 13. Testing Standards

### 13.1 Test Location

Tests are co-located with source files:

```
entities/patient/
├── model/
│   ├── normalize.ts
│   ├── stage.ts
│   └── __tests__/
│       ├── normalize.test.ts
│       └── stage.test.ts
├── ui/
│   ├── PatientCard.tsx
│   └── __tests__/
│       └── PatientCard.test.tsx
```

### 13.2 Test Naming

```typescript
// File: PatientCard.test.tsx
describe('PatientCard', () => {
  it('renders patient name and MRN', () => { ... });
  it('shows pin icon when isPinned is true', () => { ... });
  it('calls onPin when pin button clicked', () => { ... });
});

// File: normalize.test.ts
describe('normalizeScheme', () => {
  it('returns OTHERS for null input', () => { ... });
  it('normalizes lowercase to uppercase', () => { ... });
  it('maps UNKNOWN to OTHERS', () => { ... });
});
```

### 13.3 Test Patterns

```typescript
// Component test
import { render, screen, fireEvent } from '@testing-library/react';
import { PatientCard } from '../PatientCard';

const mockPatient = {
  id: '1',
  name: 'John Doe',
  latestMrn: 'MRN001',
  stage: 'preop',
};

describe('PatientCard', () => {
  it('renders patient info', () => {
    render(<PatientCard patient={mockPatient} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText(/MRN001/)).toBeInTheDocument();
  });
  
  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<PatientCard patient={mockPatient} onClick={onClick} />);
    
    fireEvent.click(screen.getByRole('article'));
    expect(onClick).toHaveBeenCalled();
  });
});

// Hook test
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePatients } from '../usePatients';

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

describe('usePatients', () => {
  it('fetches and normalizes patients', async () => {
    const { result } = renderHook(() => usePatients(), { wrapper });
    
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(3);
  });
});

// Pure function test
import { normalizeStage } from '../stage';

describe('normalizeStage', () => {
  it.each([
    ['preop', 'preop'],
    ['Pre-Op', 'preop'],
    ['PRE-OP', 'preop'],
    ['pre op', 'preop'],
    [null, 'onboarding'],
    [undefined, 'onboarding'],
  ])('normalizeStage(%s) returns %s', (input, expected) => {
    expect(normalizeStage(input)).toBe(expected);
  });
});
```

### 13.4 What to Test

| Layer | What to Test |
|-------|-------------|
| Entity model | Pure functions, normalization, validation |
| Entity API | Hook behavior, data transformation |
| Entity UI | Rendering, user interactions, callbacks |
| Feature | Page rendering, navigation, integration |
| Shared | Component behavior, hook behavior |

---

## 14. State Management Patterns

### 14.1 State Location Decision

```
Is it SERVER DATA (from API)?
└─► Use React Query in entity/api hooks

Is it URL STATE (filters, page, tab)?
└─► Use useSearchParams in feature

Is it FORM STATE?
└─► Use React Hook Form in feature

Is it UI STATE (open/closed, selected item)?
└─► Use useState/useReducer in component

Is it GLOBAL APP STATE (auth, theme)?
└─► Use Context or Zustand in app/providers
```

### 14.2 React Query Patterns

```typescript
// Standard query
const { data, isLoading, error } = usePatients();

// Query with params
const { data } = usePatient(id);

// Mutation with invalidation
const mutation = useCreatePatient();
mutation.mutate(payload, {
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
    navigate(paths.patients());
    toast({ title: 'Patient created' });
  },
});
```

### 14.3 URL State Pattern

```typescript
// src/features/patient-list/model/usePatientsFilters.ts

export function usePatientsFilters() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const filters: FiltersState = {
    search: searchParams.get('search') ?? '',
    stage: searchParams.get('stage'),
    tab: (searchParams.get('tab') as 'all' | 'my') ?? 'all',
  };
  
  const setFilter = useCallback(<K extends keyof FiltersState>(
    key: K,
    value: FiltersState[K]
  ) => {
    setSearchParams((prev) => {
      if (value === null || value === '') {
        prev.delete(key);
      } else {
        prev.set(key, String(value));
      }
      return prev;
    });
  }, [setSearchParams]);
  
  return { filters, setFilter };
}
```

---

## 15. API & Data Flow Patterns

### 15.1 Data Flow

```
API Response
    │
    ▼
Entity API Hook (usePatients)
    │
    ├─► normalize (normalizePatient)
    │
    ▼
Feature Page (PatientsListPage)
    │
    ├─► filter/transform (filterPatients)
    │
    ▼
Entity UI (PatientCard)
    │
    ▼
User sees data
```

### 15.2 API Client Pattern

```typescript
// src/shared/lib/api.ts

const BASE_URL = import.meta.env.VITE_API_URL;

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
}

const api = {
  patients: {
    list: (filters?: object) => request<Patient[]>('/patients', { ... }),
    get: (id: string) => request<Patient>(`/patients/${id}`),
    create: (data: CreatePatientPayload) => request<Patient>('/patients', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: UpdatePatientPayload) => request<Patient>(`/patients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
  documents: {
    // ...
  },
};

export default api;
```

---

## 16. Form Patterns

### 16.1 React Hook Form + Zod

```typescript
// Entity: validation schema
// src/entities/patient/model/validation.ts
import { z } from 'zod';

export const patientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  age: z.number().min(0).max(150),
  gender: z.enum(['male', 'female', 'other']),
  scheme: z.enum(['ASP', 'NAM', 'EHS', 'PAID', 'OTHERS']),
  // ...
});

export type PatientFormValues = z.infer<typeof patientSchema>;

// Feature: form hook
// src/features/patient-registration/model/usePatientRegistrationForm.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { patientSchema, PatientFormValues, toCreatePayload, toUpdatePayload } from '@entities/patient';

export function usePatientRegistrationForm(existingPatient?: Patient) {
  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: existingPatient ? mapPatientToFormValues(existingPatient) : getDefaultValues(),
  });
  
  const createMutation = useCreatePatient();
  const updateMutation = useUpdatePatient();
  
  const onSubmit = async (values: PatientFormValues) => {
    if (existingPatient) {
      await updateMutation.mutateAsync(toUpdatePayload(values, existingPatient));
    } else {
      await createMutation.mutateAsync(toCreatePayload(values));
    }
  };
  
  return {
    form,
    onSubmit: form.handleSubmit(onSubmit),
    isSubmitting: createMutation.isPending || updateMutation.isPending,
  };
}
```

### 16.2 Form Sections Pattern

```typescript
// Feature: form page
export function PatientRegistrationPage() {
  const { form, onSubmit, isSubmitting } = usePatientRegistrationForm();
  
  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit}>
        <PatientIdentitySection />
        <MedicalDetailsSection />
        <ComorbiditySection />
        <SubmitBar isSubmitting={isSubmitting} />
      </form>
    </FormProvider>
  );
}

// Feature: form section
export function PatientIdentitySection() {
  const { register, formState: { errors } } = useFormContext<PatientFormValues>();
  
  return (
    <section>
      <Input {...register('name')} error={errors.name?.message} />
      <Input {...register('age')} type="number" error={errors.age?.message} />
    </section>
  );
}
```

---

## 17. Navigation & Routing Patterns

### 17.1 Route Definition (App.tsx)

```typescript
// src/app/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Feature imports
import { PatientsListPage } from '@features/patient-list';
import { PatientDetailPage } from '@features/patient-detail';
import { PatientRegistrationPage } from '@features/patient-registration';

// Layout imports
import { AppShell } from './layout/AppShell';
import { UnsavedChangesGuard } from './guards/UnsavedChanges';

export function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/patients" element={<PatientsListPage />} />
            <Route path="/patients/:id" element={<PatientDetailPage />} />
          </Route>
          
          {/* Forms outside AppShell for guard to work */}
          <Route
            path="/patients/add"
            element={
              <UnsavedChangesGuard>
                <PatientRegistrationPage />
              </UnsavedChangesGuard>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryProvider>
  );
}
```

### 17.2 Navigation in Features

```typescript
// ✅ CORRECT: Use paths helper
import { paths } from '@app/navigation';

function handleClick() {
  navigate(paths.patient(id));
}

// For links
<Link to={paths.patientDocs(id)}>View Documents</Link>
```

---

## 18. UI Component Patterns

### 18.1 Compound Components

```typescript
// For complex UI with multiple related parts
<PatientCaseSheetTabs>
  <PatientCaseSheetTabs.Trigger zone="red">Red Zone</PatientCaseSheetTabs.Trigger>
  <PatientCaseSheetTabs.Content zone="red">
    <RedZone patient={patient} />
  </PatientCaseSheetTabs.Content>
</PatientCaseSheetTabs>
```

### 18.2 Render Props (when needed)

```typescript
<DataTable
  data={patients}
  renderRow={(patient) => (
    <PatientCard patient={patient} />
  )}
/>
```

### 18.3 Component Composition

```typescript
// ✅ GOOD: Compose smaller components
function PatientDetailPage() {
  return (
    <div>
      <PatientSummaryHeader patient={patient} />
      <PatientCaseSheetTabs patient={patient} />
    </div>
  );
}

// ❌ BAD: God component with everything inline
function PatientDetailPage() {
  return (
    <div>
      <div className="header">
        {/* 200 lines of header code */}
      </div>
      <div className="tabs">
        {/* 500 lines of tabs code */}
      </div>
    </div>
  );
}
```

---

## 19. Code Review Checklist

### 19.1 Architecture Compliance

- [ ] Code is in correct layer (shared/entities/features/app)
- [ ] Import rules are not violated
- [ ] Path aliases are used correctly
- [ ] No cross-feature imports

### 19.2 Entity Compliance

- [ ] Entity UI components don't use routing hooks
- [ ] Data is normalized in API hooks
- [ ] Types are properly defined
- [ ] Barrel exports are updated

### 19.3 Feature Compliance

- [ ] Page uses entity hooks for data
- [ ] Feature-specific state is in model/
- [ ] Navigation uses paths helper
- [ ] Proper loading/error states

### 19.4 Code Quality

- [ ] Components are reasonably sized (<200 lines)
- [ ] No duplicate logic (use entities)
- [ ] Proper TypeScript types
- [ ] Tests for new functionality

---

## 20. Common Mistakes to Avoid

### 20.1 Architecture Mistakes

| Mistake | Correct Approach |
|---------|------------------|
| Putting PatientCard in `shared/` | Put in `entities/patient/ui/` |
| Using `useNavigate` in entity UI | Pass callback prop from feature |
| Importing from another feature | Move shared code to entity/shared |
| Hardcoding routes | Use `paths.*` from navigation.ts |
| Creating re-export files | Actually move the files |

### 20.2 Data Mistakes

| Mistake | Correct Approach |
|---------|------------------|
| Not normalizing API data | Always normalize in hooks |
| Filtering in render | Use useMemo for derived data |
| Duplicating normalization logic | Centralize in entity model |
| Raw API types in UI | Use normalized entity types |

### 20.3 Form Mistakes

| Mistake | Correct Approach |
|---------|------------------|
| Form logic in component | Use custom hook (useXxxForm) |
| Inline Zod schema | Define in entity validation.ts |
| Manual form state | Use React Hook Form |
| Converting data in submit | Use payload adapters |

---

## 21. Requirement Evaluation Framework

### 21.1 New Feature Checklist

When you receive a new requirement, ask:

```
1. ROUTING
   □ Does it need a new route? → New feature
   □ Which route pattern? → Update navigation.ts

2. ENTITIES
   □ Does it introduce new domain concepts? → New entity
   □ Does it reuse existing entities? → Import from @entities/*
   □ Does it need new entity UI? → Add to entity ui/
   □ Does it need new normalization? → Add to entity model/

3. STATE
   □ What data does it need? → Entity API hooks
   □ Does it need URL state? → Feature model hook
   □ Does it need form state? → React Hook Form

4. UI
   □ Can existing entity UI be reused? → Import from @entities/*
   □ Is new generic UI needed? → Add to @shared/
   □ Is feature-specific UI needed? → Add to feature ui/

5. DEPENDENCIES
   □ What entities does it depend on?
   □ What shared components does it need?
   □ Does it create any new shared needs?
```

### 21.2 Requirement → Architecture Mapping

| Requirement Type | Architecture Action |
|-----------------|---------------------|
| "New page for X" | Create `features/x/` |
| "Add X to patient list" | Add to `features/patient-list/` |
| "Show X in multiple places" | Create in `entities/x/ui/` |
| "New data type X" | Create `entities/x/` |
| "Generic button variant" | Add to `shared/components/ui/` |
| "New API endpoint" | Add to `shared/lib/api.ts` and entity |

### 21.3 Complexity Assessment

```
LOW COMPLEXITY (1-2 days):
- Add field to existing form
- Add column to existing list
- New filter option
→ Modify existing feature, maybe entity

MEDIUM COMPLEXITY (3-5 days):
- New page with existing data
- New sub-feature within page
- New form with existing entity
→ New feature, reuse entities

HIGH COMPLEXITY (1-2 weeks):
- New domain concept
- Multiple new pages
- New data relationships
→ New entity + new features

VERY HIGH COMPLEXITY (2+ weeks):
- Major refactoring
- New architecture pattern
- Cross-cutting concerns
→ Spike/POC first, then plan
```

---

## 22. Migration & Refactoring Guidelines

### 22.1 Safe Migration Steps

1. **Create new structure first** (don't delete old)
2. **Add new code to new location**
3. **Update imports gradually**
4. **Test thoroughly**
5. **Delete old code only after verification**

### 22.2 Refactoring Checklist

When moving code:
- [ ] Create target folder/file
- [ ] Copy code (don't cut)
- [ ] Update internal imports in new location
- [ ] Update barrel exports
- [ ] Find all usages of old location
- [ ] Update imports to new location
- [ ] Run build & tests
- [ ] Delete old location

### 22.3 Finding Usages

```bash
# Find all imports of a module
grep -r "from ['\"]@/path/to/old" src/ --include="*.tsx" --include="*.ts"

# Find all usages of a function/component
grep -r "ComponentName" src/ --include="*.tsx" --include="*.ts"
```

---

## 23. Quick Reference Card

### Import Rules (Print This!)

```
┌─────────────────────────────────────────────────────┐
│  IMPORT RULES - NEVER VIOLATE                       │
├─────────────────────────────────────────────────────┤
│  shared   ← entities ← features ← app               │
│                                                     │
│  ✅ features can import from entities and shared   │
│  ✅ entities can import from shared                │
│  ❌ shared CANNOT import from entities/features    │
│  ❌ entities CANNOT import from features           │
│  ❌ features CANNOT import from other features     │
└─────────────────────────────────────────────────────┘
```

### File Placement (Print This!)

```
┌─────────────────────────────────────────────────────┐
│  WHERE DOES IT GO?                                  │
├─────────────────────────────────────────────────────┤
│  Generic UI (Button, Modal)        → shared/       │
│  Generic utility (cn, formatDate)  → shared/lib/   │
│  Domain type (Patient, Document)   → entities/     │
│  Domain UI (PatientCard)           → entities/ui/  │
│  Domain logic (normalizeStage)     → entities/model│
│  Data hook (usePatients)           → entities/api/ │
│  Page/Screen (PatientsListPage)    → features/ui/  │
│  Feature state (usePatientsFilters)→ features/model│
│  Router, Providers                 → app/          │
└─────────────────────────────────────────────────────┘
```

### Path Aliases

```typescript
@shared/*   → src/shared/*
@entities/* → src/entities/*
@features/* → src/features/*
@app/*      → src/app/*
```

### Naming Patterns

```
Components:     PascalCase.tsx      (PatientCard.tsx)
Hooks:          use<Name>.ts        (usePatients.ts)
Types:          types.ts            (types.ts)
Tests:          <name>.test.tsx     (PatientCard.test.tsx)
Features:       kebab-case          (patient-list)
Entities:       singular lowercase  (patient)
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Initial | Original playbook |
| 2.0 | Updated | Added fixes for pinned patients, stage filters |
| 3.0 | Current | Added gap remediation, expanded guidelines |

---

## Appendix: Commands

```bash
# Build verification
npm run build
npx tsc --noEmit
npm run lint
npm test

# Find architecture violations
grep -r "from ['\"]@entities" src/shared/ --include="*.tsx" --include="*.ts"
grep -r "from ['\"]@features" src/shared/ --include="*.tsx" --include="*.ts"
grep -r "from ['\"]@features" src/entities/ --include="*.tsx" --include="*.ts"

# Find old-style imports
grep -r "from ['\"]@/components" src/ --include="*.tsx" --include="*.ts"
grep -r "from ['\"]@/hooks" src/ --include="*.tsx" --include="*.ts"
grep -r "from ['\"]@/lib" src/ --include="*.tsx" --include="*.ts"

# Find duplicate logic
grep -r "normalizeScheme" src/ --include="*.tsx" --include="*.ts"
grep -r "normalizeStage" src/ --include="*.tsx" --include="*.ts"
```

---

**Remember:** When in doubt, ask:
1. "Could this exist in any app?" → shared
2. "Is this reusable domain logic?" → entities  
3. "Is this a user flow/page?" → features
4. "Is this app wiring?" → app