## Relevant Files

- `package.json` — Husky/lint-staged/TS/ESLint scripts; add DX scripts and fix MRN grep rule.
- `.github/workflows/ci.yml` — Align CI with lint + typecheck + build; remove brittle grep step.
- `.husky/*` — Pre-commit/pre-push hooks aligning with lint-staged.
- `tsconfig.json` — Add/verify path aliases (`@/*`), strictness (`exactOptionalPropertyTypes`, etc.).
- `vite.config.ts` — Ensure alias for `@` → `src/`, and PROD-only SW registration if relevant.
- `src/app/App.tsx` — Route wiring; remove dead imports.
- `src/app/router/routes.tsx` — Centralize route objects, lazy imports.
- `src/app/main.tsx` — Guard service worker registration.
- `src/shared/config/env.ts` — New: `VITE_LIS_BASE_URL`, `buildLisUrl(mrn)` helper.
- `src/shared/lib/cn.ts` — Classname util (if missing).
- `src/shared/lib/date.ts` — New: `formatDate`, `toISODate`, `nowUtc`.
- `src/shared/lib/logger.ts` — New: wrapper around `console` with env guards.
- `src/shared/ui/TogglePillGroup.tsx` — New: reusable pill/toggle group UI.
- `src/shared/api/http.ts` — Typed HTTP client (fetch/axios) with interceptors.
- `src/shared/api/generated/*` — (Optional) OpenAPI-generated types/clients.
- `src/entities/patient/model/invariants.ts` — **New** canonical types & normalizers for scheme/sex/pathway.
- `src/entities/patient/utils/comorbidities.ts` — **New** normalize/summarize comorbidities.
- `src/entities/patient/utils/registration.ts` — **New** MRN history helpers.
- `src/entities/patient/payload.ts` — **New** `toCreatePayload()` adapter (moved/renamed).
- `src/features/patient/registration/ui/PatientRegistrationForm.tsx` — Convert to RHF + Zod.
- `src/features/patient/registration/model/patient-create.adapter.ts` — **Delete/move** to `entities/patient/payload.ts`.
- `src/features/patient/mrn-switch/ui/MrnOverview.tsx` — Import invariants/utils; remove duplicates & console logs.
- `src/features/patient/card/PatientCard.tsx` — Use `buildLisUrl`, comorbidity utils.
- `src/features/patient/card/PatientGridCard.tsx` — As above.
- `src/features/documents/browse/ui/DocumentsRoot.tsx` — Route target for documents.
- `src/features/documents/browse/ui/DocumentsFolder.tsx` — Route target for documents.
- `src/features/documents/browse/ui/Lightbox.tsx` — (If present) verify imports.
- `src/pages/DocumentsPage.tsx` — **Legacy**; retire or park under `legacy/`.
- `src/components/ImageUploader.tsx` — Ensure present or replace; used by documents feature.
- `src/types/api.ts` — **Consolidate** with models; become DTO-only or delete if generated.
- `src/types/models.ts` — **Move pieces** into `entities/patient/model/*`.
- `test/setup.ts` — Vitest/Jest setup.
- `src/entities/patient/model/invariants.test.ts` — Unit tests for canonical normalizers.
- `src/entities/patient/utils/comorbidities.test.ts` — Unit tests for parsing/summarizing.
- `src/entities/patient/utils/registration.test.ts` — Unit tests for MRN helpers.
- `src/entities/patient/payload.test.ts` — Unit tests for `toCreatePayload()`.
- `src/features/patient/registration/ui/PatientRegistrationForm.test.tsx` — Component tests for RHF form.
- `src/features/patient/mrn-switch/ui/MrnOverview.test.tsx` — Component tests for MRN switching & LIS link.
- `src/features/documents/browse/ui/DocumentsRoot.test.tsx` — Component tests for folder navigation.
- `src/features/documents/browse/ui/DocumentsFolder.test.tsx` — Component tests for listing/opening docs.

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` (or `vitest`) to run tests. Running without a path executes all tests found by the configuration.
- Prefer colocated `index.ts` barrels in `entities/*` and `features/*` to simplify imports.
- Keep all business rules (normalization/mapping) in `entities/*` (pure TypeScript, no React).

## Tasks

- [ ] 1.0 Stabilize CI, pre‑commit, and Developer Experience
  - [ ] 1.1 Remove/Scope the brittle “MRN” grep rule  
        **Action:** Delete `rg '\bmrn\b'` checks from `lint-staged` and CI, or scope to UI string literals only.  
        **Acceptance:** Commits with identifiers like `mrn`, `latestMrn` no longer fail; UI copy still reviewed in PR.
  - [ ] 1.2 Align Husky + lint‑staged for speed and safety  
        **Action:** In `package.json`:  
        - Add `"lint": "eslint --cache --max-warnings=0 ."`  
        - Add `"typecheck": "tsc --noEmit"`  
        - Add `"test": "vitest run --reporter=dot"` (or Jest equivalent)  
        - `lint-staged`: `eslint --cache --fix`, `tsc -p tsconfig.json --noEmit` (optional), `vitest related` (fast).  
        **Acceptance:** Pre-commit runs in <10s on typical change sets; fails on lint/type violations.
  - [ ] 1.3 ESLint/TS rules for consistency  
        **Action:** Enable `no-alert`, `no-restricted-globals` (`confirm`, `prompt`), `@typescript-eslint/consistent-type-imports`, `import/order`, `no-console` (warn in dev; error in prod builds via logger).  
        **Acceptance:** Lint catches alerts, inconsistent imports, accidental `console` in prod paths.
  - [ ] 1.4 Service worker registration guard  
        **Action:** In `src/app/main.tsx`, wrap SW registration in `if (import.meta.env.PROD && 'serviceWorker' in navigator) { ... }`.  
        **Acceptance:** No 404 on `/sw-share.js` in dev; only registers in prod.
  - [ ] 1.5 Node/PNPM/NPM versions pinned  
        **Action:** `.nvmrc`/`.node-version` and CI matrix updated; lockfile committed.  
        **Acceptance:** Reproducible installs locally/CI.
  - [ ] 1.6 Editor & formatting  
        **Action:** Add `.editorconfig` (LF, UTF‑8, 2 spaces), Prettier config; run one-time `prettier --write .`.  
        **Acceptance:** Unified formatting; reduced noise in PRs.
  - [ ] 1.7 PR hygiene  
        **Action:** Add `.github/PULL_REQUEST_TEMPLATE.md` with checklist (tests updated, no alerts, no hardcoded URLs).  
        **Acceptance:** PRs follow template; reviewer friction reduced.

- [ ] 2.0 Establish a Canonical Patient Domain Layer (deduplicate & centralize)
  - [ ] 2.1 Add `entities/patient/model/invariants.ts`  
        **Action:** Define `SCHEME_OPTIONS`, `SchemeOption`, `Sex`, `Pathway` and `normalizeScheme`, `normalizeSex`, `normalizePathway`.  
        **Acceptance:** All call sites import from here; no duplicate constants.
  - [ ] 2.2 Add `entities/patient/utils/comorbidities.ts`  
        **Action:** Implement `normalizeComorbidityTokens(input)`, `summarize(tokens)` (unique, uppercased, “ + ” join).  
        **Acceptance:** One source of truth; used by form preview/cards/adapters.
  - [ ] 2.3 Add `entities/patient/utils/registration.ts`  
        **Action:** Implement `normalizeHistory(raw)`, `sortDescByDate(history)`, `pickLatest({ history, preferred })`.  
        **Acceptance:** MRN/current scheme selection logic centralized.
  - [ ] 2.4 Move adapter: `toCreatePayload()` → `entities/patient/payload.ts`  
        **Action:** Port and refactor to use invariants & utils; export types for payloads.  
        **Acceptance:** Both forms (legacy/new) call this single adapter.
  - [ ] 2.5 Replace duplicates across components  
        **Action:** Update `MrnOverview.tsx`, `PatientCard.tsx`, `PatientGridCard.tsx`, form(s) to import from `entities/*`. Delete local copies.  
        **Acceptance:** `git grep -n "normalizeScheme\\|SCHEME_OPTIONS"` only matches `entities/*`.
  - [ ] 2.6 Unit tests for domain layer  
        **Action:** Add tests: edge cases (unknown/other schemes, empty/dirty comorbidity strings, irregular dates).  
        **Acceptance:** ≥95% coverage on `entities/patient/*`.

- [ ] 3.0 Unify Patient Creation Flows (RHF + Zod + single adapter)
  - [ ] 3.1 Choose/standardize on RHF + Zod  
        **Action:** Keep `PatientRegistrationForm` as the canonical form; convert to `react-hook-form` with `zodResolver`.  
        **Acceptance:** No manual nested state object; all fields managed by RHF.
  - [ ] 3.2 Schema definition  
        **Action:** Zod schema for required fields (name, age int, sex enum, one MRN entry with scheme, department). Optional fields with `.optional()` and correct coercions (`z.coerce.number()`).  
        **Acceptance:** Validation messages shown inline; submit disabled until valid.
  - [ ] 3.3 MRN history with `useFieldArray`  
        **Action:** Add/remove MRN rows; each with `{ mrn, scheme, date }`. Default new row date = `toISODate(nowUtc())`.  
        **Acceptance:** Adding/removing rows updates state and validation correctly.
  - [ ] 3.4 Comorbidities UX  
        **Action:** Use checkboxes + “Other” input; build preview using `normalizeComorbidityTokens` + `summarize`.  
        **Acceptance:** Preview always reflects current selections; tokens de‑duplicated and uppercased.
  - [ ] 3.5 Replace `alert()` with toasts  
        **Action:** Use app’s toaster (e.g., shadcn) for success/error/import JSON actions.  
        **Acceptance:** No `alert`, `confirm`, `prompt` in codebase.
  - [ ] 3.6 Doctor assignment correctness  
        **Action:** Store and submit **IDs** in `assignedDoctorId`; show labels as doctor names.  
        **Acceptance:** Network payload includes `assignedDoctorId` (not display name).
  - [ ] 3.7 Fix schema mismatch (`procedureName`)  
        **Action:** Ensure field exists in schema and is submitted via adapter.  
        **Acceptance:** No TS errors in strict mode; payload contains procedureName when set.
  - [ ] 3.8 Submit via adapter  
        **Action:** Call `toCreatePayload(formValuesMapped)`; handle errors with toast; close on success.  
        **Acceptance:** API receives a validated, normalized payload; adapter unit tests green.
  - [ ] 3.9 Accessibility & keyboard  
        **Action:** Ensure all controls have labels/`aria-*`; keyboard nav on pill groups; focus rings visible.  
        **Acceptance:** Basic axe checks pass; tab order logical.
  - [ ] 3.10 Deprecate legacy `AddPatientForm`  
        **Action:** Either delete or mark as `legacy/` and route away; if kept for a time, also call `toCreatePayload()`.  
        **Acceptance:** Only one live create‑patient path in routes.

- [ ] 4.0 Documents Feature Cutover
  - [ ] 4.1 Route switch  
        **Action:** In `routes.tsx`, mount `DocumentsRoot` and `DocumentsFolder`; remove references to legacy `DocumentsPage`.  
        **Acceptance:** Visiting `/patients/:id/docs` loads new UI.
  - [ ] 4.2 Verify dependencies  
        **Action:** Confirm `ImageUploader` exists or replace with `MobileGalleryPicker`/equivalent; fix import to `@/shared/ui/*` if moved.  
        **Acceptance:** No unresolved imports at build time.
  - [ ] 4.3 LIS/document link building  
        **Action:** Replace all hardcoded LIS URLs with `buildLisUrl(mrn)` from `env.ts`.  
        **Acceptance:** Single source of truth; configurable per environment.
  - [ ] 4.4 Empty/error states  
        **Action:** Show helpful empty folders; retry/inline errors for network failures.  
        **Acceptance:** UX resilient in poor network conditions.
  - [ ] 4.5 Tests for navigation & open  
        **Action:** Component tests for folder list, pagination (if any), opening a document/lightbox.  
        **Acceptance:** Green tests, including edge cases (no docs, non-image).

- [ ] 5.0 Feature‑Sliced Architecture & Shared UI
  - [ ] 5.1 Move to `src/app`, `src/shared`, `src/entities`, `src/features`, `src/pages`  
        **Action:** `git mv` + update imports; add `index.ts` barrels per folder.  
        **Acceptance:** No deep relative imports (`../../..`); imports start with `@/`.
  - [ ] 5.2 TogglePillGroup  
        **Action:** Implement `src/shared/ui/TogglePillGroup.tsx`; replace bespoke `ButtonGroup`s.  
        **Acceptance:** One reusable component; consistent styling/behavior.
  - [ ] 5.3 Logger & date utilities  
        **Action:** Introduce `logger` that no-ops in prod console, and `date.ts` helpers.  
        **Acceptance:** No raw `new Date(...).toLocale*` in components; use helpers.
  - [ ] 5.4 Aliases & tsconfig  
        **Action:** Add `"paths": { "@/*": ["src/*"] }`; ensure IDE picks up.  
        **Acceptance:** Build and editor resolve aliases correctly.
  - [ ] 5.5 Remove dead code  
        **Action:** Delete unused imports (e.g., `DocumentsRoot`/`DocumentsFolder` in `App.tsx` if not used), stray logs, `patinet_form` typo folder.  
        **Acceptance:** `ts-prune` (optional) reports minimal unused symbols.

- [ ] 6.0 Types & API Surface Consolidation
  - [ ] 6.1 Flatten types  
        **Action:** Move canonical domain types to `entities/patient/model`; keep API DTOs separately (or generate).  
        **Acceptance:** No drift between `api.ts` and `models.ts`.
  - [ ] 6.2 Optional codegen  
        **Action:** If OpenAPI available, add `openapi-typescript` and script: `"codegen": "openapi-typescript schema.json -o src/shared/api/generated/types.ts"`.  
        **Acceptance:** API types re-generated on schema changes.
  - [ ] 6.3 Thin mappers  
        **Action:** Add `mapApiToDomain()` and `mapDomainToApi()` where DTOs differ; keep pure and tested.  
        **Acceptance:** Mapper tests cover nullable/optional fields and enums.
  - [ ] 6.4 TypeScript strictness  
        **Action:** Turn on `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`; fix fallout.  
        **Acceptance:** `tsc --noEmit` passes under stricter rules.
  - [ ] 6.5 HTTP client  
        **Action:** Create `shared/api/http.ts` with base URL, JSON interceptors, narrow error type; avoid throwing strings.  
        **Acceptance:** Network errors surface as typed results; UI shows friendly messages.

- [ ] 7.0 Test Suite Realignment & Coverage
  - [ ] 7.1 Update smoke tests for new form  
        **Action:** Remove pathway clicks if no pathway UI; expect default `"consultation"` or add pathway control and test it.  
        **Acceptance:** Smoke test reflects actual UI; green locally and in CI.
  - [ ] 7.2 Adapter tests  
        **Action:** Comprehensive `toCreatePayload()` tests (age coercion, scheme selection precedence, comorbidity summary, empty fields).  
        **Acceptance:** Edge cases pass with clear assertions.
  - [ ] 7.3 Domain utils tests  
        **Action:** Tests for `normalizeScheme`, `normalizeSex`, `normalizePathway`, comorbidity parsing (commas/plus signs/mixed case), MRN sorting/pickLatest.  
        **Acceptance:** >95% coverage for `entities/patient/*`.
  - [ ] 7.4 Component tests  
        **Action:**  
        - `PatientRegistrationForm`: add/remove MRNs; validation; submit payload shape via spy on API.  
        - `MrnOverview`: switching MRN updates selection and LIS link via `buildLisUrl`.  
        - Documents pages: navigation/open/error states.  
        **Acceptance:** Deterministic tests with RTL; no flaky timers.
  - [ ] 7.5 Test utilities  
        **Action:** `test/setup.ts` for RTL config, MSW (mock service worker) for API mocking, `vi.spyOn`(or Jest) helpers.  
        **Acceptance:** Tests isolate network side‑effects; quick to run locally.

- [ ] 8.0 Cleanup & Quality Hardening
  - [ ] 8.1 Naming & typos  
        **Action:** Rename `patinet_form` → `patient/registration`; fix inconsistent “MRN” vs `registrationNumber` in UI labels vs identifiers.  
        **Acceptance:** Grep shows no lingering misspellings; UI labels consistent.
  - [ ] 8.2 Env & secrets  
        **Action:** Add `.env.example` with `VITE_LIS_BASE_URL`. Never hardcode IPs/hosts in components.  
        **Acceptance:** All LIS/report links use `buildLisUrl`.
  - [ ] 8.3 Error boundaries  
        **Action:** Add React error boundary at `app/` with “Try again” and diagnostics (non‑PHI).  
        **Acceptance:** Uncaught UI errors don’t white‑screen.
  - [ ] 8.4 Performance polish  
        **Action:** Lazy‑load route chunks, memoize heavy components, avoid inline functions in hot lists.  
        **Acceptance:** Lighthouse/React profiler show reduced re‑renders where relevant.
  - [ ] 8.5 Accessibility quick pass  
        **Action:** Run axe (or eslint-plugin-jsx-a11y), ensure color contrast, aria‑labels on icon buttons.  
        **Acceptance:** No critical a11y violations.
  - [ ] 8.6 Observability  
        **Action:** Centralize error logging via `logger`; add breadcrumb (optional Sentry) for clinical flows.  
        **Acceptance:** Errors are captured with minimal PII/PHI and no console leaks in prod.

