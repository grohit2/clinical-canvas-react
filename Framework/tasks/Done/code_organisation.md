Below is a **Final‑State Blueprint** for the Clinical Canvas frontend—the “this is what great looks like” version of the app when the refactor is complete. You can treat this as the *definition of done* for the re‑architecture and as the baseline for all future features.

---

## 1) Final Architecture (authoritative)

**Paradigm:** *Feature‑first* organization. Every domain feature is self‑contained (pages, components, hooks, api, adapters, validation, tests). Truly cross‑feature pieces live in a small, obvious common area.

```
src/
  app/
    routes.tsx              // central, lazy route map only
    navigation.ts           // typed route constants + helpers
    providers.tsx           // React Query, Toaster, Tooltip, Theme, etc.
    layout/
      PageLayout.tsx        // wraps Header + <main> + BottomBar
    guards/
      RequireAuth.tsx
      RequireRole.tsx
      UnsavedChanges.tsx    // thin wrapper around useUnsavedGuard hook

  features/
    patients/
      pages/
        PatientsListPage.tsx
        PatientDetailPage.tsx
        PatientFormPage.tsx     // add/edit by presence of :id
        AdmissionPage.tsx
        PreOpPage.tsx
        OTPage.tsx
        PostOpPage.tsx
        DischargePage.tsx       // preview/print structured document
      components/
        PatientForm.tsx
        PatientCard.tsx
        PatientWorkflowNav.tsx  // Admission → Pre‑Op → OT → Post‑Op → Discharge
        CaseSheetTabs.tsx       // Red/Yellow/Blue/Green zones
      hooks/
        usePatients.ts          // list/get
        usePatientMutations.ts  // create/update/delete
      api/
        patients.api.ts         // thin fetchers using lib/api
      adapters/
        patient-create.adapter.ts
        patient-update.adapter.ts
      validation.ts             // zod schemas
      index.ts                  // re‑exports (public surface)
    tasks/
      pages/TasksPage.tsx
      pages/TaskFormPage.tsx
      components/TaskForm.tsx
      components/TaskCard.tsx
      hooks/useTasks.ts
      hooks/useTaskMutations.ts
      api/tasks.api.ts
      validation.ts
      index.ts
    medications/
      pages/MedicationsPage.tsx
      pages/MedicationFormPage.tsx
      components/MedicationForm.tsx
      hooks/useMedications.ts
      hooks/useMedicationMutations.ts
      api/medications.api.ts
      validation.ts
      index.ts
    notes/
      pages/NotesPage.tsx
      pages/NoteFormPage.tsx
      components/NoteForm.tsx
      hooks/useNotes.ts
      hooks/useNoteMutations.ts
      api/notes.api.ts
      validation.ts
      index.ts
    documents/
      ... (documents feature refined and self‑contained)

  components/
    ui/                        // design-system primitives (shadcn/Radix/Tailwind)
      Button.tsx, Input.tsx, Form.tsx, Tabs.tsx, Dialog.tsx, …
    common/                    // cross-feature widgets only
      PrioritySelect.tsx
      DateTimeField.tsx
      ConfirmDialog.tsx
      Breadcrumbs.tsx
    layout/
      Header.tsx
      BottomBar.tsx

  lib/
    api.ts                     // base request client (auth, errors)
    query.ts                   // QueryClient + queryKey helpers
    utils.ts
    flags.ts                   // (empty or removed in final; no long-lived flags)

  hooks/
    useToast.ts
    useRouteQuery.ts
    useUnsavedGuard.ts

  types/
    api.ts                     // shared models (generated or hand-maintained)

  tests/
    setup.ts                   // RTL, MSW, axe, etc.
```

**Conventions**

* **Imports:** `@/` alias, no deep `../../..`.
* **Names:** Pages end with `Page.tsx`, Forms end with `Form.tsx`, hooks `useX.ts`.
* **Single source of truth:** exactly **one** form + schema + adapter per entity.

---

## 2) Final Navigation & Workflow (what users experience)

* **Header + BottomBar** provided by `PageLayout`, never duplicated inside pages.
* **Patients** have a first‑class workflow:

  * **Stepper**: *Admission → Pre‑Op → OT → Post‑Op → Discharge*, with gating rules (e.g., PAC complete, labs, photos, consents, pre‑auth) before advancing. This mirrors the real in‑patient journey and checklists. 
  * **Case‑sheet tabs** (within Patient Detail): **Red** (static header: demographics/diagnosis/plan), **Yellow** (labs), **Blue** (pre/post‑op checklists, orders, OT/billing), **Green** (referrals, imaging/path). Routes deep‑link to each tab (`/patients/:id/z/{red|yellow|blue|green}`). 
* **Discharge** gets a dedicated route with **Preview/Print** rendering a standardized document (History, Physical Exam, Hospital Course, Lab Table, Diagnostics, Treatment, Follow‑up, Authentication) to match medical documentation standards. 
* **URL = state** for lists: `?q=&tab=&view=&sort=&status=`. Back/forward restores scroll & filters.

**Authoritative Route Constants** (`src/app/navigation.ts`):

```ts
export const routes = {
  home: '/',
  patients: {
    root: '/patients',
    add: '/patients/add',
    detail: (id: string) => `/patients/${id}`,
    edit:  (id: string) => `/patients/${id}/edit`,
    admission: (id: string) => `/patients/${id}/admission`,
    preop:     (id: string) => `/patients/${id}/pre-op`,
    ot:        (id: string) => `/patients/${id}/ot`,
    postop:    (id: string) => `/patients/${id}/post-op`,
    discharge: (id: string) => `/patients/${id}/discharge`,
    zone: {
      red:    (id: string) => `/patients/${id}/z/red`,
      yellow: (id: string) => `/patients/${id}/z/yellow`,
      blue:   (id: string) => `/patients/${id}/z/blue`,
      green:  (id: string) => `/patients/${id}/z/green`,
    },
  },
  tasks: { root: '/tasks', form: (id?: string) => (id ? `/tasks/${id}/edit` : '/tasks/new') },
  medications: { root: '/medications', form: (id?: string) => (id ? `/medications/${id}/edit` : '/medications/new') },
  notes: { root: '/notes', form: (id?: string) => (id ? `/notes/${id}/edit` : '/notes/new') },
  documents: { root: '/documents' },
  profile: '/profile',
  notFound: '*',
};
```

---

## 3) Final Data Layer (consistent, testable)

* **React Query everywhere** for server state. Hooks per feature:

  * `useX()` (list), `useX(id)` (detail), `useCreateX()`, `useUpdateX()`, `useDeleteX()`.
* **Thin API clients** per feature call `lib/api.ts`.
* **Adapters** in each feature map form values ⇄ API payloads (no inline mapping in components).
* **Query keys** centralized in `lib/query.ts` (and imported by all hooks).
* **Mutations** update cached data (`setQueryData`) or invalidate keys on success.

---

## 4) Final Forms & Validation (single pattern)

* **One form** per entity (patients, tasks, medications, notes), reused for add **and** edit.
* **Stack:** React Hook Form + Zod. Schemas live in `features/<x>/validation.ts`; adapters consume schema types so values are typed end‑to‑end.
* **Shared field widgets** in `components/common`:

  * `PrioritySelect`, `DateTimeField`, `ConfirmDialog` (leave‑page / delete confirmation).
* **Unsaved changes guard** on all forms via `useUnsavedGuard(isDirty)`; integrated with router and `beforeunload`.

---

## 5) Final UI System & Accessibility

* **Design system:** `components/ui` (shadcn/Radix + Tailwind tokens); no domain logic here.
* **PageLayout** standardizes chrome; pages only define their inner content.
* **A11y:** labeled controls, `aria-describedby` for errors, keyboard navigable, high contrast, visible focus rings. Axe/lighthouse checks part of CI.

---

## 6) Final Performance Profile

* **Route‑level code splitting** (lazy + Suspense) for every page.
* **Prefetch** patient detail on list hover.
* **Virtualized lists** (when N grows).
* Stable keys, `useMemo`/`useCallback` for heavy rows; no expensive work in render.
* Bundle analyzed and kept within the team’s agreed budget.

---

## 7) Final Security & Compliance

* **No PHI in logs** (including toasts and error messages).
* **HTTPS only**, secure cookies, CSP, minimal third‑party scripts.
* **Role‑based guards** on protected clinical/financial steps (e.g., ASP pre‑auth upload). 
* **Audit trail hooks** around mutations (who, when, what).
* Local caches purged on logout.

---

## 8) Final Observability

* **Sentry (or equivalent)** for error & performance traces.
* Structured client logs (redacted), mutation lifecycle breadcrumbs.
* React Query Devtools in dev; traces surfaced in prod dashboards.

---

## 9) Final Testing Strategy (what exists in the repo)

* **Unit**: adapters, helpers, hooks (Vitest).
* **Component**: forms/cards (RTL + user‑event; MSW for API).
* **E2E**: Playwright—happy paths for add/edit, workflow step gating, unsaved guard, discharge preview.
* **A11y**: jest‑axe or Playwright Axe on key pages.
* **Coverage gates** on forms, adapters, and route containers.

**Examples expected in final tree**

```
features/patients/__tests__/PatientForm.test.tsx
features/patients/__tests__/usePatients.test.ts
features/patients/e2e/patient-flows.spec.ts
```

---

## 10) Final CI/CD & Repo Hygiene

* **Pipelines**: typecheck, lint, unit, component, e2e, build, bundle‑report.
* **Husky + lint‑staged**: format & lint on commit.
* **Codeowners**: each `features/*` has explicit owners.
* **Conventional Commits** + automated changelog (Changesets/semantic‑release).
* **Preview deployments** per PR; canary before prod.
* **Dependencies pruned** (no unused libs), lockfile maintained.

---

## 11) Final Documentation Set (checked into repo)

* `README.md`: how the app is organized (feature‑first).
* `CONTRIBUTING.md`: step‑by‑step for adding a new feature (scaffold → pages → form → hooks → routes → tests → docs).
* **ADRs** (`docs/adr/`): feature‑first layout, React Query adoption, routing structure.
* **Feature READMEs**: per folder, mapping UI to clinical workflow (e.g., stepper gates, case‑sheet zones). The clinical mapping explicitly mirrors the in‑patient admission → pre‑op clearances → OT → post‑op → discharge process, with ASP pre‑auth, PAC, labs, consents, photos, OT list, and billing captured as actionable tasks. 
* **Discharge template doc** close to `DischargePage.tsx`, reflecting the standardized medical summary sections and table formats used for labs and treatment, ensuring the printed document is complete and professional. 

---

## 12) Final Quality Gates (org‑wide Definition of Done)

A feature is “**Done**” when:

1. **Structure**: lives entirely in its `features/<x>` folder with pages/components/hooks/api/adapters/validation and `index.ts` exports.
2. **Navigation**: routes added via `app/routes.tsx` & `app/navigation.ts`; deep‑links work; `PageLayout` used.
3. **Form**: single reusable form (add & edit), Zod schema enforced, unsaved‑changes guard active.
4. **Data**: React Query hooks used; mutations update cache or invalidate keys; no ad‑hoc `useEffect` fetches.
5. **States**: Loading, Error, Empty, and Retry are explicit; skeletons render.
6. **Tests**: unit + component + e2e + a11y checks pass; coverage meets threshold.
7. **Security**: role/auth guards applied; no PHI in logs; audit events emitted.
8. **Performance**: lazy‑loaded; no obvious re‑render hotspots; bundle within budget.
9. **Docs**: feature README updated; ADR added/updated if the approach changed.
10. **Hygiene**: lint/typecheck/CI green; no dead files or duplicate paths left behind.

---

## 13) Final Deliverables by Feature (what exists on day‑zero after refactor)

**Patients**

* Pages: List, Detail (with Red/Yellow/Blue/Green tabs), Form (Add/Edit), Admission, Pre‑Op, OT, Post‑Op, Discharge (Preview/Print).
* Components: PatientForm, PatientCard, PatientWorkflowNav, CaseSheetTabs.
* Hooks: usePatients, usePatientMutations.
* API: patients.api.ts.
* Adapters: patient‑create/update.adapter.ts.
* Validation: patient schemas.
* Tests: unit (adapters/hooks), component (forms/cards), e2e (end‑to‑end admission→discharge happy path).
* Docs: README mapping tabs & steps to clinical workflow; discharge structure doc colocated.  

**Tasks / Medications / Notes** (each mirrors this pattern)

* Single **FormPage** handling add/edit via `:id`.
* Shared widgets used (`PrioritySelect`, `DateTimeField`).
* Hooks + API + adapters + validation + tests.

**Documents**

* Self‑contained feature (list, viewer, uploader), using the same data/form/testing patterns.

---

## 14) Final “No‑Regrets” Lists (things that must be gone)

* No duplicate **Add vs Edit** pages—**one** form per entity.
* No legacy **V1/V2** code paths behind flags.
* No direct `api.*.get()` called in pages via `useEffect`.
* No header/footer chrome inside pages (use `PageLayout`).
* No unused dependencies; no orphan test files; no “patinet_form” typos or shadow folders.

---

## 15) Example: Final Discharge Page contract (preview/print)

* **Inputs**: Patient core data, hospital course narrative, Zod‑validated lab table (multi‑date, multi‑category), diagnostics summaries, treatments (hospital + discharge meds), follow‑up plan, authentication block.
* **Layout**: Sectioned exactly per the standardized template; lab data rendered as a multi‑column progression table; treatment lists in numbered format; clear typography & headings—ready for print/PDF. 
* **Actions**: Save draft, Validate (schema + required sections), Preview, Print/Export.
* **Audit**: mutation logs + document version tagging.
* **Access**: visible from `/patients/:id/discharge`, and as a step in the workflow stepper.

---

### That’s the end‑state.

If you’d like, I can convert this blueprint into **issue tickets** (one per section/feature) with file paths, estimates, and acceptance tests so your team (or code assistants) can execute in parallel with confidence.
