# Tasks: Final Architecture V1 (Local-First Ledger System)

> Generated from `FINAL_ARCHITECTURE_V1.md`
> Assumes existing Expo app with `001_initial_schema.ts` (wards, staff, old tasks table)

## Relevant Files

- `src/domains/tasks/local-ledger/types.ts` - Task-local ledger data models (task snapshot, ops, outbox, automation runs)
- `src/domains/tasks/local-ledger/db.ts` - LocalStorage-backed task ledger state + transaction queue
- `src/domains/tasks/local-ledger/utils/ids.ts` - ULID generator wrapper for task ledger IDs
- `src/domains/tasks/local-ledger/utils/device.ts` - device/actor identity helpers + local-day derivation helpers
- `src/domains/tasks/local-ledger/services/opService.ts` - computePatch utility with undefined filtering + inverse patch generation
- `src/domains/tasks/local-ledger/internal/tasks.mutate.ts` - task insert/update mutators with atomic version checks
- `src/domains/tasks/local-ledger/internal/ops.mutate.ts` - immutable ops inserts, outbox enqueue, automation-run dedupe claim
- `src/domains/tasks/local-ledger/queries/tasks.read.ts` - task read-only selectors (task-by-id/list/ward/patient/origin-key)
- `src/domains/tasks/local-ledger/queries/ops.read.ts` - ops read-only selectors for idempotency, undo, and activity
- `src/domains/tasks/local-ledger/queries/patients.read.ts` - deferred patient-read placeholder (kept out of active write path)
- `src/domains/tasks/local-ledger/queries/locations.read.ts` - location-read placeholder for future task-location support
- `src/domains/tasks/local-ledger/services/commandService.ts` - idempotent `applyOp` write gateway + outbox + post-commit automation call
- `src/domains/tasks/local-ledger/services/undoService.ts` - compensating-op undo (`undoLastOp`, `undoOpGroup`)
- `src/domains/tasks/local-ledger/services/automationService.ts` - guarded automation entry point (patient automation deferred)
- `src/domains/tasks/local-ledger/mappers.ts` - mapper from ledger entities to task domain UI models
- `src/domains/tasks/api/useTasks.ts` - query hooks now powered by local task ledger reads
- `src/domains/tasks/api/useCreateTask.ts` - create mutation routed through `applyOp`
- `src/domains/tasks/api/useUpdateTask.ts` - update/complete/delete mutations routed through `applyOp`
- `src/domains/tasks/api/useUndo.ts` - undo mutation hook using task-ledger undo service
- `src/domains/tasks/api/useMyActivity.ts` - per-actor-day and per-task ops activity hooks
- `src/domains/tasks/index.ts` - corrected page exports + new hook exports
- `src/domains/tasks/core/sorting.ts` - lint-safe switch-case block fix for `no-case-declarations`
- `eslint.config.js` - restricted internal-mutator imports in tasks domain
- `src/domains/tasks/local-ledger/services/opService.test.ts` - computePatch behavior test
- `src/domains/tasks/local-ledger/services/commandService.test.ts` - idempotent applyOp smoke test
- `src/domains/tasks/local-ledger/services/undoService.test.ts` - undo operation behavior test (standalone undo op + state restoration)

### Notes

- Unit tests should be placed alongside code files (e.g., `commandService.ts` and `commandService.test.ts`).
- Use `npx jest [optional/path/to/test/file]` to run tests.
- The migration `002` includes a data migration that maps old `tasks` columns to new schema. Test this carefully with existing data.
- All timestamps should be ISO UTC strings. Never use SQLite `datetime('now')` at the application level.
- Every sub-task references the exact code from `FINAL_ARCHITECTURE_V1.md`. When in doubt, copy from that doc.
- This repo does not currently have the Expo SQLite foundation described in the architecture. Implementation is adapted to a task-isolated local-ledger (`localStorage`) under `src/domains/tasks/local-ledger`.
- Patient writes were intentionally deferred per request; patient-related checklist items are left unchecked or marked as deferred placeholders.
- Deferred by design for this release:
  - `3.5` patient mutators (`patients.mutate.ts`) remain out of scope while patient data is read from existing patient list/detail APIs.
  - `7.x` patient-triggered automations remain out of scope; task integration proceeds with task-only automations and guard rails.
  - `8.4` `useCreatePatient` remains out of scope for the task board integration milestone.
  - `10.5` patient automation end-to-end path remains deferred until patient ledger write support is enabled.

---

## Tasks

- [x] 1.0 Database Foundation — Migration 002 + PRAGMA setup + module structure
  - [x] 1.1 Create the folder structure: `src/database/queries/`, `src/database/internal/`, `src/database/migrations/`. These three directories enforce the module boundary. `queries/` is read-only (safe for UI/hooks). `internal/` is mutators (only imported by `commandService.ts`).
  - [x] 1.2 Open `src/database/db.ts` and verify (or add) that `PRAGMA journal_mode = WAL;` and `PRAGMA foreign_keys = ON;` run on every database connection open. These must execute before any queries. WAL enables concurrent reads during writes. Foreign keys enforce referential integrity.
  - [x] 1.3 Create `src/database/migrations/002_local_ops_patients.ts`. Copy the full SQL from the architecture plan section 3. This single migration creates: `patients` table, `locations` table, `ops` table (with CHECK constraints on `entity_type` and `op_type`), `outbox_ops` table, `automation_runs` table (with unique dedup index), `tasks_new` table (with CHECK constraints on `workflow_status`, `priority`, `day`, `recurrence`, and `origin`), data migration from old `tasks` → `tasks_new`, drop old `tasks`, rename `tasks_new` → `tasks`, and all indexes including the partial unique index on `origin_key`.
  - [x] 1.4 In the data migration INSERT, verify the column mappings: `doctor_id` → `requester_id`, `nurse_id` → `owner_id`, `place` → `place_text` (with `COALESCE(place, '')`), and the `CASE status` → `workflow_status` mapping where `'Urgent'` maps to `'ready'` (urgency is a business concept, not workflow).
  - [x] 1.5 Register migration `002` in the migrations array inside `db.ts`. Ensure it runs after `001`. Test by launching the app on a fresh install AND on an install with existing task data to confirm the data migration preserves all rows correctly.
  - [x] 1.6 After running the migration, verify using a SQLite browser or `SELECT sql FROM sqlite_master WHERE type='table'` that: all CHECK constraints are present, the `idx_tasks_origin_key_unique` partial unique index exists, and the `idx_automation_runs_dedup` unique index exists.

- [x] 2.0 Utility Layer — IDs, device identity, patch computation
  - [x] 2.1 Install the `ulid` package: `npm install ulid`. Verify it's added to `package.json` dependencies.
  - [x] 2.2 Create `src/utils/ids.ts` with a single export: `export const ulid = () => _ulid();` where `_ulid` is imported from the `ulid` package. This is the only ID generator used in the entire app — every `opId`, `entityId`, `opGroupId`, `automationRunId` uses this.
  - [x] 2.3 Create `src/utils/device.ts` with three exports. First: `getDeviceId()` — generates a ULID once, stores it in MMKV under key `'device_id'`, and returns it on all subsequent calls. The format is `device_${ulid()}`. Do NOT use `Date.now()`, do NOT use `getIosIdForVendorAsync`, do NOT use any platform API. Second: `getActiveActorId()` — reads `'active_actor_id'` from MMKV and returns it (or `null`). Third: `getLocalDay()` — returns `YYYY-MM-DD` for the current moment by calling `getLocalDayFromIso(new Date().toISOString())`.
  - [x] 2.4 In the same `device.ts`, export `getLocalDayFromIso(iso: string): string`. This takes an ISO timestamp string, creates a `Date` from it, and returns `YYYY-MM-DD` using `getFullYear()`, `getMonth()+1`, `getDate()` with zero-padding. This function is critical — `applyOp` uses it to derive `createdDayLocal` from the op's `createdAt`, NOT from the current wall clock time.
  - [x] 2.5 Create `src/services/opService.ts` with a single export: `computePatch(current, updates)`. It iterates over `Object.entries(updates)`, SKIPS any entry where the value is `undefined` (this prevents SQLite binding issues), compares each value to the current state using `JSON.stringify`, and builds `patch` (new values) and `inversePatch` (old values, using `?? null` to ensure no `undefined` leaks). Returns `{ patch, inversePatch }`.
  - [x] 2.6 Test `computePatch` manually: given `current = { name: 'A', priority: 'Low', notes: '' }` and `updates = { name: 'B', priority: undefined, notes: '' }`, the result should be `patch = { name: 'B' }` and `inversePatch = { name: 'A' }`. `priority` is skipped (undefined). `notes` is skipped (unchanged).

- [ ] 3.0 Internal Mutators — Atomic version-checked write functions for tasks and patients
  - [x] 3.1 Create `src/database/internal/tasks.mutate.ts`. This file exports `insertTask(db, t)` and `updateTask(db, params)`. It must NEVER be imported outside of `commandService.ts`.
  - [x] 3.2 Implement `insertTask(db, t)`: runs a single `INSERT INTO tasks (...)` with 25 columns. All nullable fields use `?? null`. `origin` defaults to `'manual'`, `workflowStatus` to `'ready'`, `businessStatus` to `'Scheduled'`. The function receives `createdAt` and `updatedAt` from the caller (not generated internally).
  - [x] 3.3 Implement `updateTask(db, params)` with the atomic version check pattern. The params are `{ id, baseVersion, patch, actorId, updatedAt }`. Build the SET clause from `patch` entries using `TASK_COL_MAP` (a `Record<string, string>` mapping camelCase → snake_case). The WHERE clause MUST be `WHERE id = ? AND version = ? AND deleted_at IS NULL`. After running, check `result.changes === 1`. If 0 → throw `"Version conflict or task not found"`. This is the critical difference from the old pattern that did a separate SELECT then UPDATE.
  - [x] 3.4 Define the `TASK_COL_MAP` constant: `{ wardId: 'ward_id', patientId: 'patient_id', requesterId: 'requester_id', ownerId: 'owner_id', workflowStatus: 'workflow_status', businessStatus: 'business_status', name: 'name', priority: 'priority', time: 'time', day: 'day', recurrence: 'recurrence', locationId: 'location_id', placeText: 'place_text', type: 'type', notes: 'notes', completedAt: 'completed_at', sortOrder: 'sort_order', origin: 'origin', originKey: 'origin_key', version: 'version', updatedBy: 'updated_by', deletedAt: 'deleted_at', updatedAt: 'updated_at' }`.
  - [ ] 3.5 Create `src/database/internal/patients.mutate.ts`. Same pattern: `insertPatient(db, p)` and `updatePatient(db, params)`. The atomic version check uses `WHERE id = ? AND version = ? AND deleted_at IS NULL` with `result.changes === 1`. The `PATIENT_COL_MAP` maps: `{ wardId: 'ward_id', name: 'name', stage: 'stage', isActive: 'is_active', version: 'version', updatedBy: 'updated_by', deletedAt: 'deleted_at', updatedAt: 'updated_at' }`. For `isActive`, convert boolean to integer: `v ? 1 : 0`.
  - [x] 3.6 Create `src/database/internal/ops.mutate.ts`. Three exports: `insertOp(db, row)` — inserts into the `ops` table with 16 columns. `enqueueOutbox(db, opId)` — `INSERT OR IGNORE INTO outbox_ops (op_id, status) VALUES (?, 'pending')`. `tryInsertAutomationRun(db, run)` — uses `INSERT OR IGNORE` and returns `result.changes === 1` (true = first run, false = already existed). This is the "claim first" pattern that eliminates the automation dedupe race condition.

- [x] 4.0 Read-Only Query Modules — All SELECT queries split into queries/* namespace
  - [x] 4.1 Create `src/database/queries/tasks.read.ts`. Define the `TASK_SELECT` constant with a LEFT JOIN to patients for `patientNameSnapshot`. All column aliases use camelCase (e.g., `t.ward_id AS wardId`). Export three functions: `getTaskById(db, id)` — includes `WHERE t.deleted_at IS NULL`. `getTasksByWard(db, wardId)` — includes `WHERE t.deleted_at IS NULL ORDER BY t.sort_order, t.time`. `findTaskByOriginKey(db, originKey)` — returns `{ id: string }` or null, includes `WHERE deleted_at IS NULL`.
  - [x] 4.2 Create `src/database/queries/patients.read.ts`. Define `PATIENT_SELECT` with camelCase aliases (`is_active AS isActive`). Export: `getPatientById(db, id)` with `WHERE deleted_at IS NULL`. `getPatientsByWard(db, wardId)` with `WHERE deleted_at IS NULL AND is_active = 1 ORDER BY name`.
  - [x] 4.3 Create `src/database/queries/ops.read.ts`. Define `OP_SELECT` with 16 camelCase aliases. Export: `getOpById(db, opId)` — used by applyOp for idempotency check. `getOpsForEntity(db, entityType, entityId, limit=200)` — ordered by `created_at DESC`. `getOpsForActorDay(db, actorId, dayLocal)` — limit 500. `countOpsForActorDay(db, actorId, dayLocal)` — returns number. `getLastUndoableOp(db, actorId?)` — WHERE clause excludes `op_type NOT IN ('undo', 'automation')`, ordered by `created_at DESC LIMIT 1`. `getOpsByGroupId(db, opGroupId)` — ordered by `created_at ASC` (chronological, important for group undo reversal). `hasAutomationRun(db, ruleId, triggerOpId)` — returns boolean.
  - [x] 4.4 Create `src/database/queries/locations.read.ts`. Export: `getLocationById(db, id)` and `getLocationsByParent(db, parentId)`. These are placeholder queries for V1 (locations are seeded/read-only) but the read module should exist so UI can display location data.
  - [x] 4.5 Verify that NONE of the files in `queries/` export any INSERT, UPDATE, or DELETE function. They must be pure read-only. This is the enforced module boundary.

- [x] 5.0 Command Pipeline — applyOp() with idempotency, effectivePatch, and outbox
  - [x] 5.1 Create `src/services/commandService.ts`. Define the `OpInput` type with all fields from the architecture plan. Note that `entityType` uses `MutableEntityType` (only `'task' | 'patient'` in V1), not the full `EntityType`. This gives you compile-time safety against accidentally passing `'ward'`.
  - [x] 5.2 Implement the idempotency check at the TOP of `applyOp()`, BEFORE the transaction. Call `getOpById(db, op.opId)`. If it returns a row, immediately return `{ resultVersion: existingOp.resultVersion }`. This makes the entire function safe to call twice with the same `opId` — critical for V2 sync and crash recovery.
  - [x] 5.3 Implement the effectivePatch computation BEFORE the transaction. Start with `let effectivePatch = { ...op.patch }` and `let effectiveInverse = { ...op.inversePatch }`. For `opType === 'delete'`: task deletes add `deletedAt: createdAt` to effectivePatch and `deletedAt: null` to effectiveInverse. Patient deletes also add `isActive: false` / `isActive: true`. For `opType === 'create'` or `opType === 'automation'`: add `deletedAt: null` to effectivePatch (and `isActive: true` for patients). This ensures undo-of-undo (redo) can cleanly restore rows.
  - [x] 5.4 Compute `createdAt` and `createdDayLocal` BEFORE the transaction. `createdAt = op.createdAt ?? new Date().toISOString()`. `createdDayLocal = getLocalDayFromIso(createdAt)`. Do NOT use `getLocalDay()` here — the day must be derived from the op's timestamp, not the current wall clock.
  - [x] 5.5 Implement the transaction body. `await db.execAsync('BEGIN;')` then try/catch with `ROLLBACK` in catch. Inside the transaction: (a) Apply snapshot mutation by branching on `entityType` and `opType`. For creates, call `insertTask`/`insertPatient` from `internal/*.mutate.ts`. For updates/undos, call `updateTask`/`updatePatient`. For deletes, call `updateTask`/`updatePatient` with the effectivePatch (which includes `deletedAt`). (b) Write audit ledger row via `insertOp` using `effectivePatch` and `effectiveInverse` (NOT the raw `op.patch`). (c) Enqueue outbox via `enqueueOutbox`. Then `COMMIT`.
  - [x] 5.6 AFTER the COMMIT (outside the transaction), call `runAutomationForOp({ ...op, resultVersion, createdAt })`. Automation runs on committed state only. If automation fails, the original op is already safely committed.
  - [x] 5.7 Optionally export `applyOpsBatch(ops[])` for future atomic group undo. In V1, this can simply loop over `applyOp()` sequentially — each call is idempotent, so partial failure is recoverable on retry.
  - [x] 5.8 Test the full pipeline manually: create a task via `applyOp`, verify the `tasks` row exists, verify the `ops` row exists with correct `patch_json`/`inverse_patch_json`, verify the `outbox_ops` row exists with status `'pending'`. Then call `applyOp` again with the same `opId` and verify it returns the cached result without inserting a duplicate.

- [ ] 6.0 Undo Service — Single op undo + group undo with compensating ops
  - [x] 6.1 Create `src/services/undoService.ts`. Import ONLY from `queries/*.read.ts` (for reading current state) and from `commandService.ts` (for `applyOp`). Do NOT import from `internal/*`.
  - [x] 6.2 Implement `undoLastOp({ actorId, deviceId })`. Call `getLastUndoableOp(db, actorId)` to find the most recent non-undo, non-automation op by this actor. If none found, throw `'Nothing to undo'`.
  - [x] 6.3 Read the current entity version: call `getTaskById` or `getPatientById` depending on `entityType`. This gives the current `version` for the optimistic concurrency check. If entity not found, throw `'Cannot undo: entity not found'`.
  - [x] 6.4 Construct the undo op: swap `inversePatchJson` → `patch` and `patchJson` → `inversePatch`. Set `opType: 'undo'`, `revertsOpId: last.opId`, and a human-readable `reason`. Call `applyOp()` with this.
  - [x] 6.5 Implement `undoOpGroup({ opGroupId, actorId, deviceId })`. Fetch all ops in the group via `getOpsByGroupId`, then REVERSE them (undo last op first). For each op: read current entity version, construct the undo op with a shared `undoGroupId`, and call `applyOp()`. Skip entities that no longer exist (already deleted). Each undo op is individually idempotent.
  - [ ] 6.6 Test: create a patient (which triggers automation creating 3 tasks via group). Then call `undoOpGroup` with the group ID. Verify all 3 auto-created tasks are soft-deleted and the patient is soft-deleted.

- [ ] 7.0 Automation Service — Rule engine with undo/delete guard and dedupe-first pattern
  - [ ] 7.1 Create `src/services/automationService.ts`. Define the `AutomationRule` type and the `RULES` constant array. For V1, seed one rule: `admission_starter_tasks` with trigger `'patient.created'` and 3 actions (Admission vitals, Medication reconciliation, Consent forms).
  - [x] 7.2 Implement `runAutomationForOp(op)` — the entry point called by `commandService.ts` after commit. The FIRST line must be the guard: `if (op.opType === 'automation' || op.opType === 'undo' || op.opType === 'delete') return;`. This prevents: infinite loops (automation triggering automation), undo operations re-triggering workflows (e.g., undo changes `stage` back, which would re-fire `patient.stageChanged`), and delete operations spawning new tasks.
  - [ ] 7.3 Add trigger routing: if `entityType === 'patient' && opType === 'create'` → call `handlePatientCreated`. If `entityType === 'patient' && opType === 'update' && op.patch.stage` → call `handlePatientStageChanged`. More triggers can be added later.
  - [ ] 7.4 Implement `handlePatientCreated(triggerOp)`. First, load the patient via `getPatientById` to get `wardId` reliably. Then loop over `RULES` filtering for `trigger === 'patient.created'` and `enabled === true`.
  - [ ] 7.5 For each matching rule, use the "claim first" dedupe pattern: call `tryInsertAutomationRun(db, { id: ulid(), ruleId, triggerOpId, status: 'completed', opsCreated: 0 })`. If it returns `false`, the rule already ran for this trigger → skip entirely. This eliminates the race condition from the old check-then-insert pattern.
  - [ ] 7.6 For each action in the rule, compute the deterministic `originKey`: `patient:${patientId}:rule:${ruleId}:tpl:${templateId}`. Check if a task already exists with this key via `findTaskByOriginKey`. If exists → skip (hard idempotency via the unique index). If not → call `applyOp` with `opType: 'automation'`, `actorId: 'system'`, `origin: 'automation'`, and the `originKey`. Use the same `opGroupId` as the trigger op so group undo can revert everything together.
  - [ ] 7.7 After all actions, update the `automation_runs` row with the actual `opsCreated` count: `UPDATE automation_runs SET ops_created = ? WHERE id = ?`.
  - [ ] 7.8 Implement `handlePatientStageChanged(triggerOp)` as a placeholder. Add a comment: "e.g., Discharge stage → create discharge tasks. Follow the same claim-first pattern."
  - [ ] 7.9 Test: create a patient via `applyOp`. Verify 3 tasks were auto-created with `origin = 'automation'`, correct `origin_key`, and `caused_by_op_id` pointing to the patient create op. Then create the same patient op again (simulate replay) — verify no duplicate tasks were created.

- [ ] 8.0 TanStack Query Hooks — All CRUD + undo mutation hooks wired through applyOp
  - [x] 8.1 Create `src/hooks/useUpdateTask.ts`. Import from `queries/tasks.read.ts` (for `getTaskById`) and `services/commandService.ts` (for `applyOp`). Do NOT import from `internal/*`. In the `mutationFn`: read current task, call `computePatch(current, updates)`, check if patch is empty (no-op), then call `applyOp` with `opType: 'update'`. On success, invalidate `['tasks']` query key.
  - [x] 8.2 Create `src/hooks/useCreateTask.ts`. Generate `taskId = ulid()` inside the `mutationFn`. Call `applyOp` with `opType: 'create'`, `baseVersion: 0`, the full task patch (with defaults for missing fields), and `inversePatch: { deletedAt: new Date().toISOString() }`. On success, invalidate `['tasks']`.
  - [x] 8.3 Create `src/hooks/useDeleteTask.ts`. Read current task to get `version`. Call `applyOp` with `opType: 'delete'`, `patch: {}` (empty — applyOp adds `deletedAt` via effectivePatch), `inversePatch: {}` (applyOp adds `deletedAt: null`). On success, invalidate `['tasks']`.
  - [ ] 8.4 Create `src/hooks/useCreatePatient.ts`. Generate `patientId = ulid()` and `opGroupId = ulid()`. The `opGroupId` links the patient creation with any automation-created tasks so they can be undone together. Patch includes `isActive: true`. InversePatch includes `deletedAt: now, isActive: false`. On success, invalidate both `['patients']` and `['tasks']` (automation may have created tasks).
  - [x] 8.5 Create `src/hooks/useUndo.ts`. Calls `undoLastOp({ actorId, deviceId })`. On success, invalidate `['tasks']`, `['patients']`, and `['ops']`.
  - [x] 8.6 Verify that ALL hooks import reads from `queries/*.read.ts` and writes from `services/commandService.ts`. None should import from `database/internal/*`. This is the module boundary in practice.

- [x] 9.0 Activity Log — Per-user per-day ops queries and hooks
  - [x] 9.1 Create `src/hooks/useMyActivity.ts` with three hooks. `useMyActionsToday(actorId)` — calls `getOpsForActorDay(db, actorId, getLocalDay())` with `staleTime: 5_000`. Query key: `['ops', 'actor', actorId, today]`. `useMyActionCountToday(actorId)` — calls `countOpsForActorDay` with same pattern. `useTaskActivity(entityId)` — calls `getOpsForEntity(db, 'task', entityId)`.
  - [x] 9.2 Document the fields available in each op row for the UI team: `createdAt` (timestamp), `entityType + entityId` (link to entity), `opType` (badge: created/updated/undo/automation), `patchJson` (which fields changed — this is the effectivePatch), `causedByOpId` (show "triggered by X"), `reason` (human-readable), `actorId` (who did it, or "system" for automation).
  - [x] 9.3 Test: perform 5 operations (2 creates, 2 updates, 1 delete) as the same actor. Query `useMyActionsToday`. Verify count is 5 and all ops appear in reverse chronological order.

- [ ] 10.0 Module Boundary Enforcement — ESLint rule + final validation
  - [x] 10.1 Add the `no-restricted-imports` rule to `.eslintrc.js` (or equivalent config). Pattern: `"**/database/internal/*"` with message `"Internal mutators can only be imported by commandService.ts. Use applyOp() instead."`. Add an override for `src/services/commandService.ts` that disables this rule.
  - [ ] 10.2 Run `npx eslint src/` and verify that any file outside `commandService.ts` that tries to import from `database/internal/*` gets an error. Fix any violations.
  - [x] 10.3 Do a final grep: `grep -r "insertTask\|updateTask\|insertPatient\|updatePatient" src/hooks/ src/screens/ src/components/`. The result should be EMPTY. Only `commandService.ts` and `internal/*.mutate.ts` should reference these functions.
  - [x] 10.4 Do a final grep: `grep -r "from.*internal/" src/`. The ONLY file that should appear is `src/services/commandService.ts` and `src/services/automationService.ts` (which imports `tryInsertAutomationRun` from `ops.mutate.ts`). If any hooks or screens appear, fix the imports.
  - [ ] 10.5 Run the full app. Create a task, update it, undo it, create a patient (verify automation fires), undo the patient group (verify all auto-tasks are soft-deleted). Check the ops table has a complete audit trail with correct effectivePatch values. This is the end-to-end smoke test.
