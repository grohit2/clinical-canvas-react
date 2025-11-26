HMS Frontend Architecture Migration Playbook

A Complete Guide for Junior Developers
Clinical Canvas React Application
Version 2.5 – Entities + Features + Workflow + Zones
Fixes pinned patients, stage filters, navigation paths, “My Patients”, and introduces patient workflow, case-sheet zones, and unified patient forms.

Table of Contents

Quick Reference Card

Big Picture: What We’re Doing and Why

The New High-Level Folder Structure

Deep Dive: Each Layer Explained

Decision Tree: Where Does New Code Go?

Import Rules (The Linter Mental Model)

Deep Dive: Patient Entity (Main Example)

Deep Dive: Features (Patient List, Detail, Workflow)

Document Entity & Patient Documents

Cross-Cutting Concerns

Step-by-Step Migration Plan

File-by-File Migration Reference

Testing & Validation Checklist

Troubleshooting Guide

Quick Commands Reference

Summary

1. Quick Reference Card

Print this and keep it next to your laptop.

The Golden Rules
If it’s…	Put it in…
GENERIC UI (Button, Modal, table, low-level utils)	shared/
DOMAIN LOGIC reused in multiple places	entities/<domain>/
A SPECIFIC PAGE / SCREEN / USER WORKFLOW	features/<feature>/
ROUTING, PROVIDERS, GLOBAL SHELL, GUARDS	app/
Import Direction (NEVER VIOLATE)
shared ← entities ← features ← app

✅ features can import from entities and shared  
✅ entities can import from shared  
❌ shared CANNOT import from entities or features  
❌ entities CANNOT import from features  
❌ features should NOT import from other features

Path Aliases
@/*         → src/*
@app/*      → src/app/*
@shared/*   → src/shared/*
@entities/* → src/entities/*
@features/* → src/features/*

Core Mental Model

shared = generic pieces you could reuse in any React app

entities = domain LEGO kits (patient, document, task, medication, etc.)

features = complete screens/flows (/patients, /patients/:id, /patients/:id/docs, /patients/:id/discharge)

app = wiring (router, providers, AppShell, route guards)

2. Big Picture: What We’re Doing and Why
2.1 Current Situation (Why V2.5 Exists)

The current codebase is still partly organized by file type:

components/
pages/
lib/
hooks/
features/   # used inconsistently


Pain points:

Duplicate domain logic:

Scheme normalization, MRN/room resolution, comorbidity parsing, stage mapping repeated in multiple files.

No single source of truth:

Patient shape & normalization logic scattered.

Patient create/update payloads defined in multiple adapters/components.

Huge “god” components:

PatientRegistrationForm.tsx mixes:

Layout + UI

Validation

Business rules

Network calls & side-effects

Bugs & inconsistencies:

“My Patients” tab not always using pinned patients correctly.

Stage filters comparing raw strings instead of normalized stages.

Hard-coded route strings drifting from navigation.ts.

No clearly modeled in-patient workflow stages.

Case-sheet zones (Red/Yellow/Blue/Green) not modeled as a first-class concept.

2.2 The Target Architecture (V2.5)

We’re moving to a layered, domain-focused architecture with explicit clinical workflows:

Layer	Purpose
shared/	Generic building blocks and cross-cutting utilities
entities/	Reusable domain building blocks (Patient, Document, etc.)
features/	User-facing screens and workflows
app/	Composition root: routing, providers, shell, guards

Version 2.5 guarantees:

One canonical Patient entity:

Types, normalization, comorbidities, stages, Zod schema, payload adapter, React Query hooks in entities/patient.

Pinned patients:

Handled via shared/lib/pinnedPatients.ts.

“My Patients” tab filters by pinned IDs only.

Stage filters:

Always use normalizeStage() and getStageOptions() from entities/patient/model/stage.ts.

Navigation:

All paths (including workflow and zone routes) come from paths.* in app/navigation.ts.

Patient workflow:

Separate routes for Admission, Pre-Op, OT, Post-Op, Discharge in features/patient-workflow.

Case-sheet zones:

Red/Yellow/Blue/Green zone tabs in features/patient-detail.

Unified patient form:

Add/Edit share one RHF + Zod form in features/patient-registration, driven by patientSchema + toCreatePayload.

Unsaved changes guard:

Shared hook in shared/hooks/use-unsaved-guard.ts + route guard wrapper in app/guards/UnsavedChanges.tsx.

3. The New High-Level Folder Structure
src/
├── app/                      # App-level wiring
│   ├── App.tsx               # Main app component with routes
│   ├── main.tsx              # Entry point
│   ├── navigation.ts         # Route path builders (paths.*)
│   ├── providers/            # QueryClientProvider, ThemeProvider, etc.
│   ├── guards/               # RequireAuth, UnsavedChanges
│   │   ├── RequireAuth.tsx
│   │   └── UnsavedChanges.tsx
│   └── layout/
│       └── AppShell.tsx      # Header + <Outlet /> + BottomBar
│
├── shared/                   # Generic & cross-cutting
│   ├── components/
│   │   ├── ui/               # shadcn primitives: Button, Input, Tabs, Dialog, ...
│   │   ├── common/           # DateTimeField, ConfirmDialog, TogglePillGroup
│   │   └── layout/           # Header, BottomBar
│   ├── hooks/                # use-toast, use-mobile, use-unsaved-guard
│   ├── lib/                  # api.ts, utils.ts, cn.ts, pinnedPatients.ts, date.ts, logger.ts
│   └── types/                # API DTOs, cross-cutting types
│
├── entities/                 # Domain building blocks
│   ├── patient/
│   │   ├── model/            # types, normalize, comorbidities, stage, payload, validation
│   │   ├── api/              # usePatients, usePatient, usePatientTimeline
│   │   ├── ui/               # PatientCard, PatientGridCard, StageChip, MrnOverview, ...
│   │   └── index.ts
│   ├── document/
│   │   ├── model/            # DocItem types, mappers
│   │   ├── api/              # usePatientDocuments
│   │   ├── ui/               # DocumentGrid, DocumentLightbox, CategoryChips
│   │   └── index.ts
│   ├── task/
│   ├── medication/
│   └── note/
│
└── features/                 # End-user flows / screens
    ├── patient-list/         # /patients
    ├── patient-detail/       # /patients/:id + zone tabs
    ├── patient-registration/ # /patients/add, /patients/:id/edit
    ├── patient-workflow/     # admission, pre-op, ot, post-op, discharge
    ├── patient-documents/    # /patients/:id/docs[..]
    ├── patient-discharge-summary/  # (optional: structured discharge editor)
    ├── dashboard/
    ├── referrals/
    └── _demo/                # Temporary/demo-only flows

4. Deep Dive: Each Layer Explained
4.1 shared/ – Generic & Cross-Cutting

Goal: no HMS-specific business rules, just general-purpose utilities & UI.

shared/components/ui/

All shadcn primitives and basic UI elements (no domain):

button.tsx, card.tsx

dialog.tsx, drawer.tsx

tabs.tsx, table.tsx

input.tsx, textarea.tsx, select.tsx, checkbox.tsx, radio-group.tsx

toast.tsx, toaster.tsx, popover.tsx, tooltip.tsx

etc.

shared/components/common/

Slightly higher level but still non-domain:

DateTimeField.tsx

ConfirmDialog.tsx

TogglePillGroup.tsx (used for filter chips, stage toggles, etc.)

shared/components/layout/

Header.tsx – app header (title + optional action buttons).

BottomBar.tsx – mobile navigation.

AppShell.tsx – layout wrapper with Header, Outlet, BottomBar.

shared/hooks/

use-toast.ts – standard toast API.

use-mobile.ts – responsive helpers.

use-unsaved-guard.ts – tracks isDirty and blocks navigation.

shared/lib/

api.ts – typed API client.

utils.ts, cn.ts – utilities.

date.ts – date/time helpers.

logger.ts – logs with environment-aware behavior (no PHI).

pinnedPatients.ts – pinned patient persistence via localStorage.

shared/types/

api.ts – DTOs from backend: ApiPatient, ApiDocument, etc.

4.2 entities/ – Domain LEGO Kits

Each entity encapsulates everything about that domain, except routing and page-specific state.

Example: entities/patient:

model/:

types.ts: domain type aliases over DTOs.

normalize.ts: canonical normalization for patient objects.

comorbidities.ts: parse/build comorbidity tokens and summaries.

stage.ts: stage normalization, labels, colors.

validation.ts: Zod schema for patient form.

payload.ts: toCreatePayload / toUpdatePayload.

api/:

usePatients.ts, usePatient.ts, usePatientTimeline.ts.

ui/:

PatientCard, PatientGridCard, StageChip, MrnOverview, LabsOverviewCard, PatientMeds, PatientTasks, PatientNotes.

Other entities (document, task, medication, note) follow the same structure: model + api + ui.

4.3 features/ – Screens & Flows

Features compose entities + shared + app navigation to implement user flows.

Key features:

patient-list → /patients.

patient-detail → /patients/:id + zone tabs.

patient-registration → /patients/add & /patients/:id/edit.

patient-workflow → /patients/:id/admission | pre-op | ot | post-op | discharge.

patient-documents → /patients/:id/docs[..].

Each feature has:

features/<feature>/
├── ui/      # page-level components
├── model/   # local view state hooks, if needed
└── index.ts # barrel exports

4.4 app/ – Composition Root

App.tsx:

Wraps app in providers (QueryClientProvider, theme, Toaster).

Defines routes using paths.*.

Uses AppShell as layout.

navigation.ts:

Single source of truth for route paths.

providers/:

Instances for React Query, theme, etc.

guards/RequireAuth.tsx:

Protects authenticated routes.

guards/UnsavedChanges.tsx:

Attaches unsaved-changes logic around form-heavy routes.

5. Decision Tree: Where Does New Code Go?

Always follow this order:

Generic?

No HMS words (patient, MRN, discharge).

→ shared/*.

Reusable domain?

Patient, Document, Task, etc., and reused in ≥2 places.

→ entities/<domain>/model | ui | api.

Screen/flow?

Specific route or user flow (list, detail, workflow).

→ features/<feature>/ui (and optional model).

Wiring?

Router, providers, shell, guards.

→ app/*.

6. Import Rules (The Linter Mental Model)

Same as V2.0, with the 2.5 feature & workflow layers.

Features → import from entities & shared & app/navigation.

Entities → import from shared only.

Shared → import from nowhere above it (no entities, no features).

No feature-to-feature imports.

Always import from barrel files (index.ts) instead of deep internal paths.

7. Deep Dive: Patient Entity (Main Example)

This is your reference entity; others should mirror its structure.

7.1 Types (entities/patient/model/types.ts)

(Same as in your V2.0 doc – defines Patient, Stage, Pathway, etc.)

7.2 Normalization (normalize.ts)

(Same as in V2.0 – centralizes patient normalization.)

7.3 Comorbidities (comorbidities.ts)

(Same as in V2.0 – tokenization and summary building.)

7.4 Stage (stage.ts)

(Same as in V2.0 – normalization, labels, colors, options.)

7.5 Validation (validation.ts) – NEW emphasis in V2.5

Zod schema for PatientFormValues.

Provides static types for forms and adapters.

7.6 Payload (payload.ts) – NEW emphasis in V2.5

toCreatePayload(formValues: PatientFormValues) → CreatePatientPayload.

Possibly toUpdatePayload for edit flows.

Every feature that saves a patient goes through this adapter.

7.7 API Hooks (api/usePatients.ts, usePatient.ts, ...)

Wrap api.patients.* with React Query.

Always return normalizePatient() values.

7.8 UI (ui/*)

Reusable patient components.

Used by list, detail, workflow, and dashboard features.

7.9 Barrel (index.ts)

Re-export all public types, helpers, hooks, and UI.

8. Deep Dive: Features (Patient List, Detail, Workflow)
8.1 patient-list – /patients

Already designed in V2.0:

PatientsListPage:

usePatients, usePatientsFilters, filterPatients.

Pinned patients from pinnedPatients.

Navigation via paths.patientsAdd & paths.patient.

Tabs: All / My.

Filters: search, pathway, stage, urgentOnly.

View modes: list/grid.

8.2 patient-detail – /patients/:id + Case-Sheet Zones

New in 2.5:

PatientDetailPage:

Loads patient via usePatient(id).

Shows summary header (name, MRN, stage, scheme, etc.).

Renders PatientCaseSheetTabs.

PatientCaseSheetTabs:

Handles zone tabs: Red, Yellow, Blue, Green.

Can read route parameter :zone or local state.

Each zone renders different entity components:

Red: demographics, diagnosis, initial plan.

Yellow: labs (from patient or document entities).

Blue: workflows/tasks (pre-op, orders, OT, billing).

Green: discharge planning, referrals, follow-up.

8.3 patient-registration – /patients/add & /patients/:id/edit

PatientRegistrationPage:

Uses FormProvider from RHF.

Uses patientSchema as Zod validator.

For edit: loads existing patient via usePatient(id) and sets default values.

Sections in ui/sections:

PatientIdentitySection

MedicalHistorySection

ComorbiditySection (uses COMORBIDITY_OPTIONS)

ProcedureSection

SubmitBar

On submit:

Validate with patientSchema.

Use toCreatePayload or toUpdatePayload.

Call mutation (useCreatePatient / useUpdatePatient).

Show toast via use-toast.

Unsaved changes:

useUnsavedGuard(formState.isDirty) used in page.

Route guarded by UnsavedChanges.

8.4 patient-workflow – Admission → Discharge Routes

AdmissionPage:

Admission snapshot view and admission-specific fields.

PreOpPage:

Pre-op checklists, labs, consents.

OTPage:

OT scheduling & time, key intra-op notes.

PostOpPage:

Post-op checklists and early orders.

DischargePage:

Discharge summary, follow-up, medication & instructions (may use patient-discharge-summary feature for advanced templates).

Each page:

Uses usePatient(id).

Renders stepper from useWorkflowSteps, linking to paths.patient* workflow routes.

9. Document Entity & Patient Documents

Same as V2.0, but now clearly part of Version 2.5.

entities/document/model/types.ts & mapFromApi.ts.

entities/document/api/usePatientDocuments.ts.

entities/document/ui/* (DocumentGrid, Lightbox, CategoryChips, PhotoUploader).

features/patient-documents:

PatientDocumentsRootPage.

PatientDocumentsCategoryPage.

Navigation:

paths.patientDocs(id) and paths.patientDocsCategory(id, category).

10. Cross-Cutting Concerns
10.1 Layout & AppShell

AppShell defines the visual chrome.

Features never reimplement headers or bottom bars.

10.2 Forms & Unsaved Changes

All multi-step forms or complex forms:

Use RHF + Zod schema.

Use useUnsavedGuard(isDirty).

10.3 Toasts

All notifications via use-toast and Toaster.

No alert, confirm, prompt.

10.4 Security & Observability (Optional Outline)

No PHI in logs.

logger wrapper instead of raw console.

Future: Sentry integration using logger and React error boundaries.

11. Step-by-Step Migration Plan

Keep the same structure as V2.0, extended for workflow & registration:

Create base folders & aliases (no logic change).

Move shared UI/hooks/lib/types into shared/.

Build entities/patient (model/api/ui) and remove duplicated logic.

Migrate /patients to features/patient-list using pinned patients & stage filters.

Migrate /patients/:id to features/patient-detail and add case-sheet tabs.

Migrate Add/Edit patient to features/patient-registration using patientSchema + toCreatePayload.

Create features/patient-workflow and wire workflow routes (admission → discharge).

Create entities/document + features/patient-documents and migrate documents page.

Migrate dashboard & referrals to their feature folders.

Tighten tests & delete legacy code.

12. File-by-File Migration Reference

Use your existing V2.0 table as baseline and add rows for new features:

Old add/edit patient → features/patient-registration/*.

Old workflow-related pages → features/patient-workflow/*.

Old zone-specific views → features/patient-detail/PatientCaseSheetTabs.tsx.

You can literally start from the V2.0 reference table you pasted and append entries for these new features as you implement them.

13. Testing & Validation Checklist

Same as V2.0 + extra checks:

 /patients/:id detail page correctly renders and passes patient to zone tabs.

 /patients/:id/z/red|yellow|blue|green show correct content.

 /patients/:id/admission|pre-op|ot|post-op|discharge load and show workflow stepper.

 Patient registration form:

Uses patientSchema.

Uses toCreatePayload / toUpdatePayload.

Blocks accidental navigation when isDirty.

14. Troubleshooting Guide

Exactly same structure as V2.0, plus:

If zone routes break:

Check paths.patientZone* definitions.

Check Routes in App.tsx for the right path and element.

If workflow routes break:

Check paths.patientAdmission, paths.patientPreOp, etc.

Verify they are actually declared in the app routes.

15. Quick Commands Reference

Same commands as V2.0:

npm run build
npx tsc --noEmit
npm run lint

grep -r "from ['\"]@/components/ui" src/ --include="*.tsx" --include="*.ts"
grep -r "normalizeScheme" src/ --include="*.tsx" --include="*.ts"
# etc.

16. Summary

Version 2.5 is V2.0 plus:

Patient workflow routes (Admission → Discharge).

Case-sheet zones (Red/Yellow/Blue/Green) in patient detail.

Canonical Zod schema + payload adapters for patient forms.

Unsaved-changes guard for safe editing.

With:

Clear layers: shared → entities → features → app.

Single source of truth for patient domain logic.

A clean, consistent pattern for future entities (task, medication, note, etc.).

A migration plan that junior devs can follow step-by-step without guessin

# HMS Frontend Architecture Migration Playbook

> **A Complete Guide for Junior Developers**
> Clinical Canvas React Application
> **Version 2.0** – Includes fixes for pinned patients, stage filters, navigation paths, and **“My Patients”** behavior

---

## Table of Contents

1. [Quick Reference Card](#1-quick-reference-card)
2. [Big Picture: What We're Doing and Why](#2-big-picture-what-were-doing-and-why)
3. [The New High-Level Folder Structure](#3-the-new-high-level-folder-structure)
4. [Deep Dive: Each Layer Explained](#4-deep-dive-each-layer-explained)
5. [Decision Tree: Where Does New Code Go?](#5-decision-tree-where-does-new-code-go)
6. [Import Rules (The Linter Mental Model)](#6-import-rules-the-linter-mental-model)
7. [Deep Dive: Patient Entity (Main Example)](#7-deep-dive-patient-entity-main-example)
8. [Deep Dive: Features (Patient List Example)](#8-deep-dive-features-patient-list-example)
9. [Document Entity & Patient Documents](#9-document-entity--patient-documents)
10. [Cross-Cutting Concerns](#10-cross-cutting-concerns)
11. [Step-by-Step Migration Plan](#11-step-by-step-migration-plan)
12. [File-by-File Migration Reference](#12-file-by-file-migration-reference)
13. [Testing & Validation Checklist](#13-testing--validation-checklist)
14. [Troubleshooting Guide](#14-troubleshooting-guide)
15. [Quick Commands Reference](#15-quick-commands-reference)
16. [Summary](#16-summary)

---

## 1. Quick Reference Card

> **Print this and keep it next to your laptop.**

### The Golden Rules

| If it’s…                                 | Put it in…            |
| ---------------------------------------- | --------------------- |
| GENERIC UI (Button, Modal, table, utils) | `shared/`             |
| DOMAIN LOGIC reused in multiple places   | `entities/<domain>/`  |
| A SPECIFIC PAGE or USER FLOW             | `features/<feature>/` |
| ROUTING, PROVIDERS, GLOBAL SHELL         | `app/`                |

### Import Direction (NEVER VIOLATE)

```text
shared ← entities ← features ← app

✅ features can import from entities and shared  
✅ entities can import from shared  
❌ shared CANNOT import from entities or features  
❌ entities CANNOT import from features  
❌ features should NOT import from other features
```

### Path Aliases

```ts
@/*         → src/*
@app/*      → src/app/*
@shared/*   → src/shared/*
@entities/* → src/entities/*
@features/* → src/features/*
```

### Core Mental Model

* **shared** = generic pieces you could reuse in any React app
* **entities** = domain LEGO kits (patient, document, task, medication, etc.)
* **features** = complete screens/flows (`/patients`, `/patients/:id`, `/patients/:id/docs`)
* **app** = wiring (router, providers, global shell)

---

## 2. Big Picture: What We’re Doing and Why

### 2.1 Current Situation (Why V2.0 Exists)

The app is currently organized mostly by **file type**:

```text
components/
pages/
lib/
hooks/
features/  (inconsistent usage)
```

This causes problems:

* **Duplicate logic**:

  * Scheme normalization, MRN/room resolution, comorbidity parsing, etc. appear in multiple files.
* **Hard to find “the one true place”**:

  * Where is the **single source of truth** for patient normalization?
  * Who owns the `/patients` list behavior?
* **God components**:

  * `PatientRegistrationForm.tsx` is huge (800+ lines) and does:

    * UI layout
    * Validation
    * Business rules
    * Side-effects
* **Bugs and inconsistencies** (what V2.0 fixes):

  * “My Patients” tab doesn’t correctly use pinned patients.
  * Stage filters compare raw strings instead of normalized stages.
  * Some routes (like Add Patient) were hard-coded and drifted from `navigation.ts`.
  * Pinned patients behavior duplicated or hard-coded in multiple places.

### 2.2 The Target Architecture

We move to a **layered architecture by domain**:

| Layer       | Purpose                                |
| ----------- | -------------------------------------- |
| `shared/`   | Generic, app-agnostic building blocks  |
| `entities/` | Domain building blocks (Patient, Doc…) |
| `features/` | Full user-facing flows / screens       |
| `app/`      | Routing, providers, composition root   |

**V2.0 specifically ensures:**

* Pinned patients are handled centrally via `shared/lib/pinnedPatients.ts`.
* **“My Patients”** uses pinned IDs properly.
* Stage filters always use `normalizeStage()` from `entities/patient/model/stage.ts`.
* All navigation uses `paths.*` from `app/navigation.ts`.

---

## 3. The New High-Level Folder Structure

Here’s the **canonical** structure we’re migrating toward:

```text
src/
├── app/                      # App-level wiring
│   ├── App.tsx               # Main app component with routes
│   ├── main.tsx              # Entry point
│   ├── navigation.ts         # Route path builders
│   └── providers/            # QueryClientProvider, ThemeProvider, etc.
│
├── shared/                   # Generic, reusable across ANY project
│   ├── components/
│   │   ├── ui/               # shadcn components: Button, Card, Dialog, etc.
│   │   └── layout/           # Header, BottomBar, AppShell
│   ├── hooks/                # use-mobile, use-toast, useUploader
│   ├── lib/                  # api.ts, s3upload.ts, utils.ts, pinnedPatients.ts
│   └── types/                # Global API types, shared model interfaces
│
├── entities/                 # Domain building blocks
│   ├── patient/
│   │   ├── model/            # types, normalize, comorbidities, stage helpers
│   │   ├── api/              # usePatients, usePatient, usePatientTimeline
│   │   └── ui/               # PatientCard, MrnOverview, StageChip, etc.
│   ├── document/
│   │   ├── model/            # DocItem types, mappers
│   │   ├── api/              # usePatientDocuments
│   │   └── ui/               # DocumentGrid, Lightbox, CategoryChips
│   ├── task/
│   └── medication/
│
└── features/                 # End-user flows / screens
    ├── patient-list/
    ├── patient-detail/
    ├── patient-registration/
    ├── patient-discharge-summary/
    ├── patient-documents/
    ├── dashboard/
    ├── referrals/
    └── _demo/                # Temporary/demo-only flows
```

**Rule of thumb:**

* If it makes sense in any generic React app → `shared/`.
* If it knows about hospital domain (“patient”, “MRN”, “discharge”) and is reusable → `entities/`.
* If it’s a specific screen/flow → `features/`.
* If it’s routing or global wiring → `app/`.

---

## 4. Deep Dive: Each Layer Explained

### 4.1 `shared/` – Generic & Cross-Cutting

**Goal:** Keep it small, stable, boring. No hospital-specific business rules.

#### `shared/components/ui/`

* All shadcn-generated primitives:

  * `button.tsx`, `card.tsx`, `dialog.tsx`, `drawer.tsx`, `tabs.tsx`
  * `table.tsx`, `accordion.tsx`, `alert.tsx`, `alert-dialog.tsx`
  * `avatar.tsx`, `badge.tsx`, `calendar.tsx`, `checkbox.tsx`
  * `input.tsx`, `textarea.tsx`, `select.tsx`, `radio-group.tsx`
  * `toast.tsx`, `toaster.tsx`, `tooltip.tsx`, `popover.tsx`
* **Must NOT** know about “patient”, “stage”, “MRN”, etc.

#### `shared/components/layout/`

* `Header.tsx` – Top bar: title, search, profile icon, etc.
* `BottomBar.tsx` – Mobile bottom navigation.
* Optional: `AppShell.tsx` – common layout wrapper.

These can render domain components, but **shouldn’t** contain domain logic.

#### `shared/hooks/`

* `use-mobile.ts` – responsive helpers.
* `use-toast.ts` – wrapper around shadcn Toaster.
* `useUploader.ts` – cross-cutting file upload helper (can be HMS-specific internally, but used across entities/features).

#### `shared/lib/`

* `api.ts` – HTTP client / API wrapper:

  ```ts
  import axios from 'axios';
  const api = { patients: { list: …, get: … }, documents: { … } };
  export default api;
  ```
* `s3upload.ts` – generic S3/presigned-upload logic.
* `utils.ts` – `cn()`, formatting helpers.
* `image.ts` – image utilities.
* `flags.ts` – feature-flag helpers.
* `pinnedPatients.ts` – **V2.0 critical** for pinned patients:

  ```ts
  // shared/lib/pinnedPatients.ts
  export type PinnedPatient = { id: string; pinnedAt: string };

  const STORAGE_KEY = 'cc_pinned_patients_v1';

  export function getPinnedPatients(): PinnedPatient[] { /* ... */ }
  export function pinPatient(id: string) { /* ... */ }
  export function unpinPatient(id: string) { /* ... */ }
  export function isPatientPinned(id: string): boolean { /* ... */ }
  ```

#### `shared/types/`

* `api.ts` – Types matching backend contracts:

  * `Patient`, `PatientTimelineEntry`, `DocumentItem`, etc.
* `models.ts` – Cross-entity shared types if needed.

---

### 4.2 `entities/` – Domain LEGO Kits

Each entity folder:

```text
entities/<entity>/
├── model/   # types, mappers, normalization, domain helpers
├── api/     # React Query hooks for this entity
└── ui/      # Reusable UI for this entity
```

**Example entities**:

* `patient/`
* `document/`
* `task/`
* `medication/`

**Design rules:**

* Entity **UI** gets props + callbacks; **no routing** inside (no `useNavigate`).
* Entity **model** holds all **smart** logic: normalization, mapping, derived fields.
* Entity **api** hides HTTP details behind typed hooks.

---

### 4.3 `features/` – Screens & Flows

Each feature is one flow/screen:

* `patient-list` → `/patients`
* `patient-detail` → `/patients/:id`
* `patient-registration` → `/patients/add`
* `patient-discharge-summary` → discharge summary flow
* `patient-documents` → `/patients/:id/docs[..]`
* `dashboard` → home screen metrics
* `referrals` → cross-hospital referrals flow

Typical structure:

```text
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

**Features:**

* Import from `@entities/*` and `@shared/*`.
* Handle routing, query params, view-specific state.
* Compose domain UI components + generic UI.
* Own business rules like:

  * Which filters exist on `/patients`.
  * How “My Patients” is defined (→ pinned IDs; V2.0 fix).
  * Whether the view is list/grid.

---

### 4.4 `app/` – Composition Root

* `App.tsx`:

  * `BrowserRouter`, `Routes`, `Route`.
  * Mounts features on paths using `paths` helpers.
  * Sets layout (header, bottom bar, shell).
* `main.tsx`:

  * Bootstraps React with `<App />`.
* `providers/`:

  * `QueryClientProvider` for React Query.
  * Theme provider, etc.
* `navigation.ts`:

  * **V2.0: single source of truth for route paths:**

    ```ts
    // app/navigation.ts
    export const paths = {
      root: () => '/',
      patients: () => '/patients',
      patientsAdd: () => '/patients/add',
      patient: (id: string) => `/patients/${id}`,
      patientDocs: (id: string) => `/patients/${id}/docs`,
      patientDocsCategory: (id: string, category: string) =>
        `/patients/${id}/docs/${category}`,
      // others later...
    };
    ```

  Features **never** hard-code path strings: they always use `paths.*`.

---

## 5. Decision Tree: Where Does New Code Go?

Ask these **in order** every time you create a file:

1. **Is it generic UI or utility (no “patient”, no “MRN”)?**
   → `shared/components/ui` or `shared/lib` or `shared/hooks`.

2. **Is it reusable domain logic or UI for a concept (patient/document/etc.)?**
   → `entities/<domain>/model` or `entities/<domain>/ui` or `entities/<domain>/api`.

3. **Is it a full-screen or user flow (list, detail, registration, etc.)?**
   → `features/<feature>/`.

4. **Is it router setup, providers, or global shell?**
   → `app/`.

> If you’re confused, start at step 1 and stop at the **first** “yes”.

---

## 6. Import Rules (The Linter Mental Model)

Think of these as **architecture ESLint**:

### 6.1 Allowed Imports

```ts
// ✅ In a feature
import { PatientCard, usePatients } from '@entities/patient';
import { Button } from '@shared/components/ui/button';
import { useToast } from '@shared/hooks/use-toast';

// ✅ In an entity
import { Badge } from '@shared/components/ui/badge';
import { cn } from '@shared/lib/utils';
```

### 6.2 Forbidden Imports

```ts
// ❌ shared cannot depend on entities or features
// shared/lib/utils.ts
import { Patient } from '@entities/patient'; // NO!

// ❌ entities cannot depend on features
// entities/patient/model/types.ts
import { PatientsListPage } from '@features/patient-list'; // NO!

// ❌ features should not depend on other features directly
// features/patient-detail/ui/PatientDetailPage.tsx
import { PatientsListPage } from '@features/patient-list'; // NO!
```

If you need something from another feature, it probably belongs in:

* `entities/<domain>` if it’s domain-specific
* `shared/` if it’s generic UI or utility

### 6.3 Barrel Files

Prefer:

```ts
// ✅ GOOD
import { PatientCard, usePatients } from '@entities/patient';
```

Instead of:

```ts
// ❌ FRAGILE
import { PatientCard } from '@entities/patient/ui/PatientCard';
import { usePatients } from '@entities/patient/api/usePatients';
```

`index.ts` in each entity/feature exposes the **public API** of that module.

---

## 7. Deep Dive: Patient Entity (Main Example)

The patient entity shows the full pattern: `model` + `api` + `ui`.

### 7.1 `entities/patient/model/types.ts`

```ts
import type {
  Patient as ApiPatient,
  MrnHistoryEntry as ApiMrnHistoryEntry,
} from '@shared/types/api';

export type Patient = ApiPatient;
export type MrnHistoryEntry = ApiMrnHistoryEntry;

export const SCHEME_OPTIONS = ['ASP', 'NAM', 'EHS', 'PAID', 'OTHERS'] as const;
export type SchemeOption = (typeof SCHEME_OPTIONS)[number];

export const STAGES = [
  'onboarding',
  'preop',
  'intraop',
  'postop',
  'discharge-init',
  'discharge',
] as const;
export type Stage = (typeof STAGES)[number];

export const PATHWAYS = ['surgical', 'consultation', 'emergency'] as const;
export type Pathway = (typeof PATHWAYS)[number];
```

---

### 7.2 `entities/patient/model/normalize.ts`

**Single source of truth** for patient normalization:

```ts
import type { Patient, MrnHistoryEntry, SchemeOption, Pathway } from './types';
import { SCHEME_OPTIONS, PATHWAYS } from './types';

export function normalizeScheme(value?: string | null): SchemeOption {
  const raw = (value || '').trim().toUpperCase();

  if (SCHEME_OPTIONS.includes(raw as SchemeOption)) return raw as SchemeOption;

  if (['UNKNOWN', 'GENERAL', 'OTHER', 'OTHERS'].includes(raw)) return 'OTHERS';

  return 'OTHERS';
}

export function normalizePathway(value?: string | null): Pathway | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase().trim();

  if (PATHWAYS.includes(lower as Pathway)) return lower as Pathway;
  if (lower.includes('surgery') || lower.includes('surgical')) return 'surgical';
  if (lower.includes('emergency') || lower === 'er') return 'emergency';
  if (lower.includes('consult') || lower.includes('opd')) return 'consultation';

  return undefined;
}

export function coerceRoomNumber(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === 'number') return String(value);
  return undefined;
}

export function normalizeMrnHistory(
  history?: MrnHistoryEntry[]
): MrnHistoryEntry[] | undefined {
  if (!history || history.length === 0) return undefined;

  return history.map((entry) => ({
    ...entry,
    scheme: normalizeScheme(entry.scheme),
  }));
}

export function normalizePatient(raw: Patient): Patient {
  const normalizedHistory = normalizeMrnHistory(raw.mrnHistory);

  const schemeCandidates: Array<string | undefined> = [
    raw.scheme,
    normalizedHistory?.find((entry) => entry.mrn === raw.latestMrn)?.scheme,
    normalizedHistory?.[0]?.scheme,
    (raw as any).registration?.scheme,
  ];
  const resolvedScheme = normalizeScheme(schemeCandidates.find(Boolean));

  const roomCandidate = raw as any;
  const resolvedRoom = coerceRoomNumber(
    raw.roomNumber ??
      roomCandidate?.roomNumber ??
      roomCandidate?.room_number ??
      roomCandidate?.room ??
      roomCandidate?.registration?.roomNumber ??
      roomCandidate?.registration?.room_number
  );

  const procedureName =
    (raw as any).procedureName ??
    (raw as any).procedure_name ??
    undefined;

  const pathway = normalizePathway(raw.pathway);

  return {
    ...raw,
    scheme: resolvedScheme,
    roomNumber: resolvedRoom,
    mrnHistory: normalizedHistory,
    procedureName,
    pathway,
  };
}
```

All places that previously had their own `normalizeScheme`, `coerceRoomNumber`, etc., now call `normalizePatient` from here.

---

### 7.3 `entities/patient/model/comorbidities.ts`

```ts
const SEP = /\s*\+\s*|\s*,\s*/;

export const COMORBIDITY_OPTIONS = [
  'T2DM',
  'HTN',
  'CAD',
  'CVD',
  'CKD',
  'THYROID',
  'EPILEPSY',
  'BRONCHIAL ASTHMA',
  'TUBERCULOSIS',
] as const;

export const COMORBIDITY_SET = new Set(COMORBIDITY_OPTIONS);

export function tokenizeComorbidities(
  raw: string | string[] | undefined | null
): string[] {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];

  const tokens = list
    .flatMap((item) => String(item).split(SEP))
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => token.toUpperCase());

  return Array.from(new Set(tokens));
}

export function parseComorbiditiesFromList(list?: string[]) {
  const tokens = tokenizeComorbidities(list);

  const knownSelections = tokens.filter((t) => COMORBIDITY_SET.has(t as any));
  const customTokens = tokens.filter((t) => !COMORBIDITY_SET.has(t as any));

  return {
    selections: knownSelections,
    includeOther: customTokens.length > 0,
    otherValue: customTokens.join(' + '),
    summary: tokens.length > 0 ? [tokens.join(' + ')] : [],
  };
}

export function buildComorbidityResult(
  selections: string[],
  includeOther: boolean,
  otherValue: string
) {
  const base = Array.from(
    new Set(selections.map((s) => s.trim().toUpperCase()))
  );

  const tokens = [...base];
  if (includeOther && otherValue.trim()) {
    const customTokens = otherValue
      .split(SEP)
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
    tokens.push(...customTokens);
  }

  const uniqueTokens = Array.from(new Set(tokens));
  const summary = uniqueTokens.length > 0 ? [uniqueTokens.join(' + ')] : [];

  return { tokens: uniqueTokens, summary };
}
```

---

### 7.4 `entities/patient/model/stage.ts` (V2.0 Stage Fixes)

```ts
import { STAGES, type Stage } from './types';

const STAGE_LABELS: Record<Stage, string> = {
  onboarding: 'Onboarding',
  preop: 'Pre-Op',
  intraop: 'Intra-Op',
  postop: 'Post-Op',
  'discharge-init': 'Discharge Init',
  discharge: 'Discharge',
};

const STAGE_COLORS: Record<Stage, { bg: string; text: string; border: string }> = {
  onboarding: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  preop: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  intraop: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  postop: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  'discharge-init': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  discharge: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

const DEFAULT_COLORS = { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };

export function normalizeStage(value?: string | null): Stage {
  if (!value) return 'onboarding';

  const key = value.toLowerCase().trim().replace(/\s+/g, '-');

  if (STAGES.includes(key as Stage)) return key as Stage;

  if (key.includes('pre-op') || key.includes('preop')) return 'preop';
  if (key.includes('intra-op') || key.includes('intraop')) return 'intraop';
  if (key.includes('post-op') || key.includes('postop')) return 'postop';
  if (key.includes('discharge') && key.includes('init')) return 'discharge-init';
  if (key.includes('discharge')) return 'discharge';

  return 'onboarding';
}

export function stageLabel(value?: string | null): string {
  const normalized = normalizeStage(value);
  return STAGE_LABELS[normalized] ?? 'Unknown';
}

export function stageColors(value?: string | null) {
  const normalized = normalizeStage(value);
  return STAGE_COLORS[normalized] ?? DEFAULT_COLORS;
}

export function isActiveStage(value?: string | null): boolean {
  return normalizeStage(value) !== 'discharge';
}

export function getNextStage(currentStage?: string | null): Stage | null {
  const normalized = normalizeStage(currentStage);
  const idx = STAGES.indexOf(normalized);
  if (idx === -1 || idx === STAGES.length - 1) return null;
  return STAGES[idx + 1];
}

export function getStageOptions() {
  return STAGES.map((stage) => ({
    value: stage,
    label: stageLabel(stage),
  }));
}
```

**V2.0 change:** Filters and chips must always rely on `normalizeStage` and `getStageOptions` instead of magic strings.

---

### 7.5 `entities/patient/api/usePatients.ts`

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@shared/lib/api';
import { normalizePatient } from '../model/normalize';
import type { Patient } from '../model/types';

export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (department?: string) => [...patientKeys.lists(), { department }] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: string) => [...patientKeys.details(), id] as const,
};

export function usePatients(department?: string) {
  return useQuery({
    queryKey: patientKeys.list(department),
    queryFn: async (): Promise<Patient[]> => {
      const data = await api.patients.list(department);
      return data.map(normalizePatient);
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function usePatient(id: string | undefined) {
  return useQuery({
    queryKey: patientKeys.detail(id!),
    queryFn: async (): Promise<Patient> => {
      const data = await api.patients.get(id!);
      return normalizePatient(data);
    },
    enabled: !!id,
    staleTime: 2 * 60 * 1000,
  });
}
```

---

### 7.6 `entities/patient/ui/*`

Move these from `components/patient/`:

* `PatientCard.tsx`
* `PatientGridCard.tsx`
* `StageChip.tsx`
* `UpdateRing.tsx`
* `MrnOverview.tsx`
* `LabsOverviewCard.tsx`
* `PatientMeds.tsx`
* `PatientTasks.tsx`
* `PatientNotes.tsx`

They **do not** call `useNavigate` or read URL params directly; they only receive props.

---

### 7.7 `entities/patient/index.ts`

```ts
// Types & models
export * from './model/types';
export * from './model/normalize';
export * from './model/comorbidities';
export * from './model/stage';

// API hooks
export * from './api/usePatients';

// UI
export { PatientCard } from './ui/PatientCard';
export { PatientGridCard } from './ui/PatientGridCard';
export { StageChip } from './ui/StageChip';
export { UpdateRing } from './ui/UpdateRing';
export { MrnOverview } from './ui/MrnOverview';
export { LabsOverviewCard } from './ui/LabsOverviewCard';
export { PatientMeds } from './ui/PatientMeds';
export { PatientTasks } from './ui/PatientTasks';
export { default as PatientNotes } from './ui/PatientNotes';
```

---

## 8. Deep Dive: Features (Patient List Example)

This is where pinned patients, stages, and navigation come together.

### 8.1 Structure

```text
features/patient-list/
├── ui/
│   ├── PatientsListPage.tsx
│   ├── PatientsListFilters.tsx
│   ├── PatientsListTabs.tsx     (optional)
│   └── PatientsListEmpty.tsx
├── model/
│   └── usePatientsFilters.ts
└── index.ts
```

### 8.2 `model/usePatientsFilters.ts` (Filter State + Tab + ViewMode)

```ts
import { useState, useMemo, useCallback } from 'react';
import type { Patient } from '@entities/patient';
import { normalizeStage } from '@entities/patient';

export type ViewMode = 'list' | 'grid';
export type TabOption = 'all' | 'my';

export type FiltersState = {
  search: string;
  pathway: 'all' | 'surgical' | 'consultation' | 'emergency';
  stage: 'all' | string;       // uses normalizeStage in filter
  urgentOnly: boolean;
  tab: TabOption;
  viewMode: ViewMode;
};

export function usePatientsFilters(): {
  filters: FiltersState;
  setSearch(v: string): void;
  setPathway(v: FiltersState['pathway']): void;
  setStage(v: string): void;
  setUrgentOnly(v: boolean): void;
  setTab(v: TabOption): void;
  setViewMode(v: ViewMode): void;
  resetFilters(): void;
  hasActiveFilters: boolean;
} {
  const [search, setSearch] = useState('');
  const [pathway, setPathway] =
    useState<FiltersState['pathway']>('all');
  const [stage, setStage] = useState<string>('all');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [tab, setTab] = useState<TabOption>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const filters: FiltersState = {
    search,
    pathway,
    stage,
    urgentOnly,
    tab,
    viewMode,
  };

  const resetFilters = useCallback(() => {
    setSearch('');
    setPathway('all');
    setStage('all');
    setUrgentOnly(false);
  }, []);

  const hasActiveFilters = useMemo(
    () => search !== '' || pathway !== 'all' || stage !== 'all' || urgentOnly,
    [search, pathway, stage, urgentOnly]
  );

  return {
    filters,
    setSearch,
    setPathway,
    setStage,
    setUrgentOnly,
    setTab,
    setViewMode,
    resetFilters,
    hasActiveFilters,
  };
}

// V2.0: Stage filtering uses normalizeStage to avoid bugs.
export function filterPatients(
  patients: Patient[],
  filters: FiltersState,
  pinnedIds: Set<string>
): Patient[] {
  return patients.filter((patient) => {
    // Tab: "my" → only pinned
    if (filters.tab === 'my' && !pinnedIds.has(patient.id)) {
      return false;
    }

    // Search (by name, MRN, diagnosis)
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matches =
        patient.name?.toLowerCase().includes(q) ||
        patient.latestMrn?.toLowerCase().includes(q) ||
        patient.diagnosis?.toLowerCase().includes(q);
      if (!matches) return false;
    }

    // Pathway
    if (filters.pathway !== 'all') {
      if (patient.pathway !== filters.pathway) return false;
    }

    // Stage (normalized comparison)
    if (filters.stage !== 'all') {
      if (normalizeStage(patient.currentStage) !== normalizeStage(filters.stage)) {
        return false;
      }
    }

    // Urgent only
    if (filters.urgentOnly && !patient.isUrgent) {
      return false;
    }

    return true;
  });
}
```

### 8.3 `ui/PatientsListPage.tsx` (Pinned Patients + Navigation Fixes)

Key responsibilities:

* Fetch patients via `usePatients()`.
* Get pinned IDs from `shared/lib/pinnedPatients`.
* Compute filtered list via `filterPatients`.
* Use `paths.*` for navigation.
* Implement **All / My** tabs correctly.

```tsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

import { Header } from '@shared/components/layout/Header';
import { BottomBar } from '@shared/components/layout/BottomBar';
import { Button } from '@shared/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@shared/components/ui/tabs';
import { useToast } from '@shared/hooks/use-toast';

import {
  usePatients,
  PatientCard,
  PatientGridCard,
  StageChip,
} from '@entities/patient';

import {
  getPinnedPatients,
  pinPatient,
  unpinPatient,
} from '@shared/lib/pinnedPatients';

import { paths } from '@app/navigation';
import {
  usePatientsFilters,
  filterPatients,
} from '../model/usePatientsFilters';
import { PatientsListFilters } from './PatientsListFilters';
import { PatientsListEmpty } from './PatientsListEmpty';

export function PatientsListPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: patients = [], isLoading, error, refetch } = usePatients();

  // V2.0: Pinned patients correctly wired
  const initialPinned = useMemo(() => getPinnedPatients(), []);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(
    () => new Set(initialPinned.map((p) => p.id))
  );

  const {
    filters,
    setSearch,
    setPathway,
    setStage,
    setUrgentOnly,
    setTab,
    setViewMode,
    resetFilters,
    hasActiveFilters,
  } = usePatientsFilters();

  const visiblePatients = useMemo(
    () => filterPatients(patients, filters, pinnedIds),
    [patients, filters, pinnedIds]
  );

  const handleAddPatient = () => {
    navigate(paths.patientsAdd()); // V2.0: uses navigation helper
  };

  const handlePatientClick = (id: string) => {
    navigate(paths.patient(id));
  };

  const handlePinToggle = (id: string) => {
    setPinnedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        unpinPatient(id);
        toast({ description: 'Removed from My Patients' });
      } else {
        next.add(id);
        pinPatient(id);
        toast({ description: 'Added to My Patients' });
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Patients" />

      <main className="p-4 space-y-4">
        {/* All / My tab (V2.0 fix) */}
        <Tabs
          value={filters.tab}
          onValueChange={(v) => setTab(v as typeof filters.tab)}
          className="w-full"
        >
          <TabsList className="w-full">
            <TabsTrigger className="flex-1" value="all">
              All Patients
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="my">
              My Patients
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <PatientsListFilters
          filters={filters}
          setSearch={setSearch}
          setPathway={setPathway}
          setStage={setStage}
          setUrgentOnly={setUrgentOnly}
          setViewMode={setViewMode}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 rounded-full border-b-2 border-primary animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <p className="text-sm text-red-500">
              Failed to load patients. Please try again.
            </p>
            <Button size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : visiblePatients.length === 0 ? (
          <PatientsListEmpty
            hasFilters={hasActiveFilters}
            onClearFilters={resetFilters}
            onAddPatient={handleAddPatient}
          />
        ) : (
          <div
            className={
              filters.viewMode === 'grid'
                ? 'grid grid-cols-2 gap-3'
                : 'space-y-3'
            }
          >
            {visiblePatients.map((patient) =>
              filters.viewMode === 'list' ? (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  onClick={() => handlePatientClick(patient.id)}
                  isPinned={pinnedIds.has(patient.id)}
                  onPinToggle={() => handlePinToggle(patient.id)}
                />
              ) : (
                <PatientGridCard
                  key={patient.id}
                  patient={patient}
                  onClick={() => handlePatientClick(patient.id)}
                  isPinned={pinnedIds.has(patient.id)}
                  onPinToggle={() => handlePinToggle(patient.id)}
                />
              )
            )}
          </div>
        )}
      </main>

      <Button
        className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-lg"
        onClick={handleAddPatient}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <BottomBar />
    </div>
  );
}
```

**V2.0 guarantees:**

* “My Patients” = patients whose IDs are in `pinnedIds`.
* Pins stored in localStorage via `pinnedPatients.ts`.
* Navigation always uses `paths.*`.

---

### 8.4 `PatientsListEmpty.tsx`

(As in your previous version; just ensure it accepts `hasFilters`, `onClearFilters`, `onAddPatient`.)

---

## 9. Document Entity & Patient Documents

We want documents to follow the same **entities + features** pattern.

### 9.1 `entities/document/model/types.ts`

```ts
export type DocCategory =
  | 'consent'
  | 'lab'
  | 'radiology'
  | 'discharge-summary'
  | 'nursing-note'
  | 'other';

export interface DocumentItem {
  id: string;
  patientId: string;
  category: DocCategory;
  fileName: string;
  uploadedAt: string;
  uploadedBy?: string;
  url: string;
  thumbnailUrl?: string;
  contentType?: string;
  sizeBytes?: number;
}
```

### 9.2 `entities/document/model/mapFromApi.ts`

Map backend API to `DocumentItem`:

```ts
import type { ApiDocument } from '@shared/types/api';
import type { DocumentItem, DocCategory } from './types';

export function mapDocumentFromApi(apiDoc: ApiDocument): DocumentItem {
  const category = (apiDoc.category as DocCategory) ?? 'other';
  return {
    id: apiDoc.id,
    patientId: apiDoc.patientId,
    category,
    fileName: apiDoc.fileName ?? apiDoc.originalName ?? 'Document',
    uploadedAt: apiDoc.uploadedAt ?? apiDoc.createdAt,
    uploadedBy: apiDoc.uploadedBy,
    url: apiDoc.url,
    thumbnailUrl: apiDoc.thumbnailUrl,
    contentType: apiDoc.contentType,
    sizeBytes: apiDoc.sizeBytes,
  };
}
```

### 9.3 `entities/document/api/usePatientDocuments.ts`

```ts
import { useQuery } from '@tanstack/react-query';
import api from '@shared/lib/api';
import { mapDocumentFromApi } from '../model/mapFromApi';
import type { DocumentItem, DocCategory } from '../model/types';

export const documentKeys = {
  all: ['documents'] as const,
  byPatient: (patientId: string) => [...documentKeys.all, patientId] as const,
  byPatientAndCategory: (patientId: string, category: DocCategory | 'all') =>
    [...documentKeys.byPatient(patientId), { category }] as const,
};

export function usePatientDocuments(
  patientId: string | undefined,
  category: DocCategory | 'all' = 'all'
) {
  return useQuery({
    queryKey: documentKeys.byPatientAndCategory(patientId!, category),
    queryFn: async (): Promise<DocumentItem[]> => {
      const apiDocs = await api.documents.listByPatient({
        patientId: patientId!,
        category: category === 'all' ? undefined : category,
      });
      return apiDocs.map(mapDocumentFromApi);
    },
    enabled: !!patientId,
  });
}
```

### 9.4 `entities/document/ui/*`

* `DocumentGrid.tsx` – grid of document cards.
* `DocumentLightbox.tsx` – preview modal.
* `CategoryChips.tsx` – categories (labs, consent, etc.).
* `PhotoUploader.tsx` – uses `useUploader` from `shared/hooks`.

### 9.5 `features/patient-documents/`

```text
features/patient-documents/
├── ui/
│   ├── PatientDocumentsRootPage.tsx        # /patients/:id/docs
│   └── PatientDocumentsCategoryPage.tsx    # /patients/:id/docs/:category
├── model/
│   └── useDocumentsFilters.ts (optional later)
└── index.ts
```

Uses:

* `paths.patientDocs(id)` and `paths.patientDocsCategory(id, category)`.
* `usePatientDocuments(patientId, category)`.
* `DocumentGrid`, `CategoryChips`, `PhotoUploader`.

---

## 10. Cross-Cutting Concerns

### 10.1 Layout & Shell

* `Header` and `BottomBar` live in `shared/components/layout`.
* App routes wrap features in a shared shell if needed.

### 10.2 Forms & “God Component” Decomposition

`PatientRegistrationForm` becomes:

```text
features/patient-registration/ui/
├── PatientRegistrationPage.tsx      # Renders <FormProvider> + all sections
├── PatientDetailsSection.tsx
├── MedicalHistorySection.tsx
├── ComorbiditiesSection.tsx
├── DischargePlanSection.tsx
└── SubmitBar.tsx
```

Each section uses `useFormContext()` (React Hook Form) to access form state.

### 10.3 Toasts

* Use **only** shadcn toaster:

  * `shared/hooks/use-toast.ts`
  * `shared/components/ui/toast.tsx`
  * `shared/components/ui/toaster.tsx`
* Mount `<Toaster />` in `App.tsx`.
* Remove any `sonner`-based code.

---

## 11. Step-by-Step Migration Plan

Treat each step as a separate PR. Don’t mix multiple steps.

### Step 1 – Create Base Folders & Aliases

* Create `src/app`, `src/shared`, `src/entities`, `src/features`.
* Move `App.tsx`, `main.tsx`, `navigation.ts` into `src/app/`.
* Configure `tsconfig.json` and `vite.config.ts` aliases.
* Run `npm run build`.

### Step 2 – Move Shared UI, Hooks, Lib, Types

* Move:

  * `components/ui/*` → `shared/components/ui/*`
  * `components/layout/*` → `shared/components/layout/*`
  * `hooks/*` → `shared/hooks/*`
  * `lib/*` → `shared/lib/*`
  * `types/*` → `shared/types/*`
* Update imports everywhere.
* Run build + lint.

### Step 3 – Create `entities/patient` (Model + API)

* Create:

  * `entities/patient/model/types.ts`
  * `entities/patient/model/normalize.ts`
  * `entities/patient/model/comorbidities.ts`
  * `entities/patient/model/stage.ts`
  * `entities/patient/api/usePatients.ts`
  * `entities/patient/index.ts`
* Replace inline normalization in:

  * `PatientsList.tsx`
  * `PatientDetail.tsx`
  * `MrnEditor.tsx`
  * `MrnOverview.tsx`
  * `AddMrn.tsx`
  * `patient-create.adapter.ts`
* Delete duplicated logic after imports are updated.

### Step 4 – Move Patient UI into `entities/patient/ui`

* Move all `components/patient/*` into `entities/patient/ui/*`.
* Fix internal imports.
* Update `entities/patient/index.ts` exports.
* Update consumers to import from `@entities/patient`.

### Step 5 – Build `features/patient-list` (V2.0 Behavior)

* Create `features/patient-list/model/usePatientsFilters.ts`.
* Create `features/patient-list/ui/PatientsListPage.tsx`.
* Create `PatientsListFilters`, `PatientsListEmpty`.
* Integrate pinned patients via `shared/lib/pinnedPatients.ts`.
* Use `normalizeStage` for stage filters.
* Use `paths.patients()`, `paths.patientsAdd()`, `paths.patient(id)`.
* Wire route in `App.tsx`.
* Remove old `pages/PatientsList.tsx`.

### Step 6 – Migrate Patient Detail

* Create `features/patient-detail` for `/patients/:id`.
* Use `usePatient(id)` from `entities/patient/api`.
* Use UI components from `entities/patient/ui`.

### Step 7 – Migrate Registration, Discharge Summary, Documents, Dashboard, Referrals

* `features/patient-registration`: break down form into sections.
* `features/patient-discharge-summary`: move discharge-specific logic.
* `entities/document` + `features/patient-documents`: implement document flows.
* `features/dashboard`, `features/referrals`: move page logic here.

---

## 12. File-by-File Migration Reference

Use this table as a tick-list.

| Current Location                                 | New Location                                                   |
| ------------------------------------------------ | -------------------------------------------------------------- |
| `src/App.tsx`                                    | `src/app/App.tsx`                                              |
| `src/main.tsx`                                   | `src/app/main.tsx`                                             |
| `src/navigation.ts` / `src/app/navigation.ts`    | `src/app/navigation.ts` (canonical)                            |
| `src/components/ui/*`                            | `src/shared/components/ui/*`                                   |
| `src/components/layout/Header.tsx`               | `src/shared/components/layout/Header.tsx`                      |
| `src/components/layout/BottomBar.tsx`            | `src/shared/components/layout/BottomBar.tsx`                   |
| `src/hooks/*`                                    | `src/shared/hooks/*`                                           |
| `src/lib/api.ts`                                 | `src/shared/lib/api.ts`                                        |
| `src/lib/utils.ts`                               | `src/shared/lib/utils.ts`                                      |
| `src/lib/s3upload.ts`                            | `src/shared/lib/s3upload.ts`                                   |
| `src/lib/image.ts`                               | `src/shared/lib/image.ts`                                      |
| `src/lib/flags.ts`                               | `src/shared/lib/flags.ts`                                      |
| `src/lib/pinnedPatients.ts`                      | `src/shared/lib/pinnedPatients.ts`                             |
| `src/types/api.ts`                               | `src/shared/types/api.ts`                                      |
| `src/types/models.ts`                            | `src/shared/types/models.ts`                                   |
| `src/components/patient/PatientCard.tsx`         | `src/entities/patient/ui/PatientCard.tsx`                      |
| `src/components/patient/PatientGridCard.tsx`     | `src/entities/patient/ui/PatientGridCard.tsx`                  |
| `src/components/patient/StageChip.tsx`           | `src/entities/patient/ui/StageChip.tsx`                        |
| `src/components/patient/UpdateRing.tsx`          | `src/entities/patient/ui/UpdateRing.tsx`                       |
| `src/components/patient/MrnOverview.tsx`         | `src/entities/patient/ui/MrnOverview.tsx`                      |
| `src/components/patient/LabsOverviewCard.tsx`    | `src/entities/patient/ui/LabsOverviewCard.tsx`                 |
| `src/components/patient/PatientMeds.tsx`         | `src/entities/patient/ui/PatientMeds.tsx`                      |
| `src/components/patient/PatientTasks.tsx`        | `src/entities/patient/ui/PatientTasks.tsx`                     |
| `src/components/patient/PatientNotes.tsx`        | `src/entities/patient/ui/PatientNotes.tsx`                     |
| `src/pages/PatientsList.tsx`                     | `src/features/patient-list/ui/PatientsListPage.tsx`            |
| `src/pages/PatientDetail.tsx`                    | `src/features/patient-detail/ui/PatientDetailPage.tsx`         |
| `src/pages/AddPatientPage.tsx`                   | `src/features/patient-registration/ui/AddPatientPage.tsx`      |
| `src/pages/Dashboard.tsx`                        | `src/features/dashboard/ui/DashboardPage.tsx`                  |
| `src/features/discharge-summary/*`               | `src/features/patient-discharge-summary/*`                     |
| `src/features/documents/*` / `DocumentsPage.tsx` | `src/entities/document/*` + `src/features/patient-documents/*` |

---

## 13. Testing & Validation Checklist

### Build & Type Safety

* [ ] `npm run build` passes.
* [ ] `npx tsc --noEmit` passes.
* [ ] `npm run lint` passes.

### Runtime Checks (Especially for V2.0 Fixes)

* [ ] `/patients` loads without console errors.
* [ ] **All tab** shows all patients (subject to filters).
* [ ] **My tab** shows only pinned patients.
* [ ] Pinned state persists refresh (localStorage works).
* [ ] Stage filter dropdown uses options from `getStageOptions()`.
* [ ] Stage filter works regardless of backend capitalization/format.
* [ ] Navigation to `/patients/add` and `/patients/:id` uses `paths.*`.
* [ ] Patient detail, registration, and documents pages still work.

### Behavior

* [ ] Comorbidity parsing and display is consistent across screens.
* [ ] Room numbers and schemes are normalized uniformly.
* [ ] No duplicated “normalization” logic remains in features.

---

## 14. Troubleshooting Guide

### “Module not found” / path errors

* Check `tsconfig.json` `paths` section.
* Check `vite.config.ts` `alias` section.
* Make sure the file really moved.
* Restart dev server after alias changes.

### Circular dependency warnings

* Check imports:

  * `shared` importing from `entities` or `features` → **not allowed**.
  * `entities` importing from `features` → **not allowed**.
  * Features importing from each other → extract to `entities` or `shared`.

### “My Patients” tab shows nothing

* Confirm pinned logic:

  ```ts
  const initialPinned = getPinnedPatients();
  const pinnedIds = new Set(initialPinned.map((p) => p.id));
  ```

* Check `filterPatients` includes logic:

  ```ts
  if (filters.tab === 'my' && !pinnedIds.has(patient.id)) return false;
  ```

* Ensure `pinPatient` / `unpinPatient` update both `localStorage` and `pinnedIds` state.

### Stage filter not working

* Ensure you use `normalizeStage` both on patient and filter value:

  ```ts
  if (filters.stage !== 'all') {
    if (normalizeStage(patient.currentStage) !== normalizeStage(filters.stage)) return false;
  }
  ```

### Navigation bugs

* Search for hard-coded paths like `'/patients/add'` and replace with `paths.patientsAdd()`, etc.
* Verify `navigation.ts` export names match imports.

---

## 15. Quick Commands Reference

```bash
# Build (fast feedback)
npm run build

# Type check only
npx tsc --noEmit

# Lint
npm run lint

# Find old imports that need migration
grep -r "from ['\"]@/components/ui" src/ --include="*.tsx" --include="*.ts"
grep -r "from ['\"]@/components/patient" src/ --include="*.tsx" --include="*.ts"
grep -r "from ['\"]@/hooks" src/ --include="*.tsx" --include="*.ts"
grep -r "from ['\"]@/lib" src/ --include="*.tsx" --include="*.ts"

# Find duplicated normalization logic still left
grep -r "normalizeScheme" src/ --include="*.tsx" --include="*.ts"
grep -r "coerceRoomNumber" src/ --include="*.tsx" --include="*.ts"
grep -r "tokenizeComorbidities" src/ --include="*.tsx" --include="*.ts"
grep -r "parseComorbiditiesFromList" src/ --include="*.tsx" --include="*.ts"
```

---

## 16. Summary

By following this playbook you get:

* A clear layered structure: **shared → entities → features → app**.
* A **single source of truth** for patient normalization, comorbidities, and stage logic.
* A **clean Patient entity** that other entities (document, task, medication) can copy.
* A `/patients` screen that:

  * Correctly implements **All vs My Patients** using pinned IDs.
  * Uses normalized stage values for filtering.
  * Uses centralized navigation helpers (`paths.*`).
* A safe, incremental migration path, with checklists and commands.

As long as you:

1. Place each new file using the **decision tree**.
2. Respect the **import direction** (shared → entities → features → app).
3. Use the **entity helpers** instead of duplicating logic.

…you’ll keep the HMS frontend codebase understandable, testable, and ready for future features like tasks, medications, referrals, and advanced dashboards.
