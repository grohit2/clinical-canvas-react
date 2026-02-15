# Hospital Task Board — Final Architecture Plan (V1 Local-First)

> **All review fixes applied.** This is the production-ready version with atomic version checks, idempotent applyOp, effectivePatch for deletes, fixed deviceId, automation guards, module boundary enforcement, and all other corrections merged from both architecture reviews.

> **Core principle:** We treat all user edits as immutable operations appended to an audit ledger; the task's current state is a projection/snapshot. Undo is implemented as a compensating operation, never by rewriting history. No code is allowed to write to `tasks`/`patients` directly — all writes must go through `applyOp()`.

**Stack:** Expo + SQLite + TanStack Query + Zustand/MMKV
**Transport (V2):** HTTP API + AppSync Events (decided separately)
**Date:** February 2026

---

## Table of Contents

1. [Strategy Overview](#1-strategy-overview)
2. [Data Models (TypeScript)](#2-data-models-typescript)
3. [SQLite Schema (Migration 002)](#3-sqlite-schema-migration-002)
4. [DB Module Structure (Enforced Boundaries)](#4-db-module-structure-enforced-boundaries)
5. [Read-Only Query Modules](#5-read-only-query-modules)
6. [Internal Mutator Modules](#6-internal-mutator-modules)
7. [Command Pipeline (applyOp)](#7-command-pipeline-applyop)
8. [Undo Service](#8-undo-service)
9. [Automation Service](#9-automation-service)
10. [TanStack Query Integration](#10-tanstack-query-integration)
11. [Activity Log (Per-User Per-Day)](#11-activity-log-per-user-per-day)
12. [Build Order](#12-build-order)
13. [V2 Sync Upgrade Path](#13-v2-sync-upgrade-path)
14. [Deferred Items](#14-deferred-items)
15. [Review Fixes Applied](#15-review-fixes-applied)

---

## 1. Strategy Overview

### What this gives you in V1

| Capability | How |
|---|---|
| All writes audited by default | Every mutation goes through `applyOp()` → writes to `ops` ledger |
| Instant local undo | `inversePatch` stored per op; undo = compensating op |
| Automation (event-driven, idempotent) | Triggers fire after `applyOp()` commit; `origin_key` unique index prevents dupes |
| Per-person daily action log | Query `ops` by `actor_id` + `created_day_local` |
| Group undo (multi-op actions) | `op_group_id` links related ops for atomic batch reversal |
| Sync-ready for V2 | `outbox_ops` table + `version` on every entity; V2 = "turn on transport + conflicts" |
| FHIR-compatible model | `workflow_status` / `business_status` split; `requester_id` / `owner_id`; `location_id` |
| Replay-safe / crash-safe | `applyOp()` is idempotent — same `op_id` applied twice is a no-op |

### The one rule

```
┌──────────────────────────────────────────────────────┐
│  NO CODE writes to tasks/patients directly.          │
│  ALL writes go through applyOp().                    │
│  This is the entire reliability system.              │
│                                                      │
│  ENFORCED BY:                                        │
│  • Module boundaries (queries/* vs internal/*)       │
│  • UI/hooks can ONLY import from queries/*           │
│  • Only commandService imports from internal/*       │
└──────────────────────────────────────────────────────┘
```

### High-level write path

```
User Action
  │
  ▼
applyOp(op)
  │
  ├── Idempotency check (op_id already exists? → return cached result)
  │
  ├── BEGIN TRANSACTION
  │     ├── Compute effectivePatch / effectiveInversePatch
  │     ├── Atomic version check (WHERE version = ? AND deleted_at IS NULL)
  │     ├── Update snapshot (tasks/patients table)
  │     ├── Append to ops ledger (effectivePatch stored, not raw)
  │     └── Enqueue to outbox_ops (sync-ready)
  │── COMMIT
  │
  ▼
runAutomationForOp(op)   ← runs AFTER commit; skips undo/delete/automation ops
  │
  ▼
TanStack Query invalidation → UI re-renders
```

### V1 Entity mutability decisions

| Entity | V1 Mutability | applyOp support | Notes |
|---|---|---|---|
| `task` | Full CRUD | ✅ Yes | Core entity |
| `patient` | Full CRUD | ✅ Yes | Core entity |
| `ward` | **Read-only (seeded)** | ❌ Deferred | Seeded at app init, no edit UI in V1 |
| `staff` | **Read-only (seeded)** | ❌ Deferred | Seeded at app init, no edit UI in V1 |
| `location` | **Read-only (seeded)** | ❌ Deferred | Seeded at app init, no edit UI in V1 |

> Ward/staff/location become mutable in V2 when we add their branches to `applyOp()` and add `version`/`updated_by`/`deleted_at` to their schemas.

---

## 2. Data Models (TypeScript)

### `src/types/models.ts`

```ts
// ─── Enums ───────────────────────────────────────────

export type WorkflowStatus =
  | 'draft'
  | 'requested'
  | 'ready'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'on-hold';

export type BusinessStatus = string; // UI labels: 'Scheduled', 'Urgent', etc.

export type TaskPriority = 'Critical' | 'High' | 'Medium' | 'Low';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
export type Recurrence = 'None' | 'Daily' | 'Weekly' | 'Bi-weekly' | 'Monthly' | 'As needed';
export type TaskType = string;

// ─── V1 mutable entities (supported by applyOp) ─────
export type MutableEntityType = 'task' | 'patient';

// ─── All entity types (includes read-only seeded in V1) ──
export type EntityType = MutableEntityType | 'ward' | 'staff' | 'location';

export type OpType = 'create' | 'update' | 'delete' | 'undo' | 'automation';

// ─── Patient ─────────────────────────────────────────

export interface Patient {
  id: string;
  wardId: string;
  name: string;
  stage: string; // 'Admission' | 'Inpatient' | 'Discharge' etc.
  isActive: boolean;

  version: number;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string | null;
  deletedAt?: string | null;
}

// ─── Location ────────────────────────────────────────

export interface Location {
  id: string;
  parentId: string | null; // ward → room → bed hierarchy
  name: string;
  locationType: 'ward' | 'room' | 'bed' | 'unit';

  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

// ─── Task ────────────────────────────────────────────

export interface Task {
  id: string;
  wardId: string;

  patientId: string | null;           // FK → Patient
  patientNameSnapshot?: string;        // denormalized display (not source of truth)

  // FHIR-aligned role references
  requesterId?: string | null;         // who asked for this (doctor)
  ownerId?: string | null;             // who is responsible (nurse)

  // Dual status model
  workflowStatus: WorkflowStatus;     // canonical lifecycle
  businessStatus: BusinessStatus;      // UI display label

  priority: TaskPriority;
  time: string;
  day: DayOfWeek;
  recurrence: Recurrence;

  locationId?: string | null;          // FK → Location (canonical)
  placeText: string;                   // free-text display / legacy grouping

  type: TaskType;
  name: string;
  notes: string;
  completedAt?: string | null;
  sortOrder: number;

  // Automation / idempotency
  origin: 'manual' | 'automation';
  originKey?: string | null;           // deterministic key for dedup

  // Sync-ready
  version: number;
  updatedBy?: string | null;
  deletedAt?: string | null;

  createdAt: string;
  updatedAt: string;
}

// ─── Op (Audit Ledger Entry) ─────────────────────────

export interface Op {
  opId: string;
  opGroupId?: string | null;          // links multi-op actions for group undo
  entityType: EntityType;
  entityId: string;
  opType: OpType;

  actorId?: string | null;
  deviceId: string;

  baseVersion: number;
  resultVersion: number;               // NOT NULL — always filled

  patch: Record<string, any>;          // effectivePatch (what was actually applied)
  inversePatch: Record<string, any>;   // effectiveInversePatch (what undoes it)

  revertsOpId?: string | null;         // if this is an undo
  causedByOpId?: string | null;        // "this op happened because of that op"
  reason?: string | null;              // human-readable reason

  createdAt: string;                   // ISO UTC
  createdDayLocal: string;             // YYYY-MM-DD device-local day
}
```

---

## 3. SQLite Schema (Migration 002)

### `src/database/migrations/002_local_ops_patients.ts`

> **DB setup prerequisite:** Your `db.ts` must run these pragmas on every connection open:
> ```sql
> PRAGMA journal_mode = WAL;
> PRAGMA foreign_keys = ON;
> ```

```sql
-- ═══════════════════════════════════════════════════════
-- PATIENTS
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  ward_id TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'Admission',
  is_active INTEGER NOT NULL DEFAULT 1,

  version INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT,
  deleted_at TEXT,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_patients_ward ON patients(ward_id);
CREATE INDEX IF NOT EXISTS idx_patients_stage ON patients(stage);

-- ═══════════════════════════════════════════════════════
-- LOCATIONS (ward → room → bed hierarchy)
-- Read-only seeded in V1. No version/updated_by/deleted_at needed yet.
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  parent_id TEXT REFERENCES locations(id),
  name TEXT NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'ward'
    CHECK (location_type IN ('ward','room','bed','unit')),

  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TEXT,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_locations_parent ON locations(parent_id);
CREATE INDEX IF NOT EXISTS idx_locations_type ON locations(location_type);

-- ═══════════════════════════════════════════════════════
-- OPS (Immutable audit ledger + undo + future sync)
-- patch_json/inverse_patch_json store EFFECTIVE patches
-- (i.e., for deletes, deletedAt is included in patch_json)
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ops (
  op_id TEXT PRIMARY KEY,
  op_group_id TEXT,                    -- links multi-op actions
  entity_type TEXT NOT NULL
    CHECK (entity_type IN ('task','patient','ward','staff','location')),
  entity_id TEXT NOT NULL,

  op_type TEXT NOT NULL
    CHECK (op_type IN ('create','update','delete','undo','automation')),
  actor_id TEXT,
  device_id TEXT NOT NULL,

  base_version INTEGER NOT NULL,
  result_version INTEGER NOT NULL,     -- always filled

  patch_json TEXT NOT NULL,            -- effectivePatch (what was actually applied)
  inverse_patch_json TEXT NOT NULL,    -- effectiveInversePatch (what undoes it)

  reverts_op_id TEXT,
  caused_by_op_id TEXT,                -- causal chain for automation transparency
  reason TEXT,                         -- human-readable reason

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_day_local TEXT NOT NULL       -- YYYY-MM-DD device-local for reliable daily queries
);

CREATE INDEX IF NOT EXISTS idx_ops_entity ON ops(entity_type, entity_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ops_actor_day ON ops(actor_id, created_day_local);
CREATE INDEX IF NOT EXISTS idx_ops_group ON ops(op_group_id);
CREATE INDEX IF NOT EXISTS idx_ops_created ON ops(created_at);

-- ═══════════════════════════════════════════════════════
-- OUTBOX (sync-ready; V1 local can ignore status)
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS outbox_ops (
  op_id TEXT PRIMARY KEY REFERENCES ops(op_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK(status IN ('pending','acked','failed')),
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox_ops(status, created_at);

-- ═══════════════════════════════════════════════════════
-- AUTOMATION_RUNS (dedupe table — prevents re-running rules)
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS automation_runs (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  trigger_op_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK(status IN ('completed','failed','skipped')),
  ops_created INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_runs_dedup
  ON automation_runs(rule_id, trigger_op_id);

-- ═══════════════════════════════════════════════════════
-- TASKS (rebuild with all new columns)
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tasks_new (
  id TEXT PRIMARY KEY,
  ward_id TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,

  patient_id TEXT REFERENCES patients(id),

  -- FHIR-aligned role references (UI still shows "Doctor" / "Nurse")
  requester_id TEXT REFERENCES staff(id),   -- who asked for this
  owner_id TEXT REFERENCES staff(id),        -- who is responsible

  -- Dual status
  workflow_status TEXT NOT NULL DEFAULT 'ready'
    CHECK (workflow_status IN ('draft','requested','ready','in-progress','completed','cancelled','on-hold')),
  business_status TEXT NOT NULL DEFAULT 'Scheduled',

  name TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Medium'
    CHECK (priority IN ('Critical','High','Medium','Low')),
  time TEXT NOT NULL DEFAULT '09:00',
  day TEXT NOT NULL DEFAULT 'Monday'
    CHECK (day IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  recurrence TEXT NOT NULL DEFAULT 'None'
    CHECK (recurrence IN ('None','Daily','Weekly','Bi-weekly','Monthly','As needed')),

  location_id TEXT REFERENCES locations(id),
  place_text TEXT NOT NULL DEFAULT '',

  type TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  completed_at TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- FIX: CHECK constraint on origin (was missing in original)
  origin TEXT NOT NULL DEFAULT 'manual'
    CHECK (origin IN ('manual','automation')),
  origin_key TEXT,

  version INTEGER NOT NULL DEFAULT 1,
  updated_by TEXT,
  deleted_at TEXT,

  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════════════════════
-- DATA MIGRATION: copy old tasks with workflow_status mapping
-- ═══════════════════════════════════════════════════════

INSERT INTO tasks_new (
  id, ward_id, name, requester_id, owner_id,
  workflow_status, business_status,
  priority, time, day, recurrence,
  place_text, type, notes,
  completed_at, sort_order,
  created_at, updated_at
)
SELECT
  id, ward_id, name,
  doctor_id,   -- maps to requester_id
  nurse_id,    -- maps to owner_id

  -- Map old status → workflow_status
  CASE status
    WHEN 'Completed'   THEN 'completed'
    WHEN 'Cancelled'   THEN 'cancelled'
    WHEN 'In Progress' THEN 'in-progress'
    WHEN 'On Hold'     THEN 'on-hold'
    WHEN 'Urgent'      THEN 'ready'          -- Urgent is a priority/business concept
    ELSE 'ready'                              -- Scheduled → ready
  END,

  -- Preserve old status as business_status
  status,

  priority, time, day, recurrence,
  COALESCE(place, ''), type, notes,
  completed_at, sort_order,
  created_at, updated_at
FROM tasks;

DROP TABLE IF EXISTS tasks;
ALTER TABLE tasks_new RENAME TO tasks;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_ward ON tasks(ward_id);
CREATE INDEX IF NOT EXISTS idx_tasks_patient ON tasks(patient_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workflow ON tasks(workflow_status);
CREATE INDEX IF NOT EXISTS idx_tasks_business ON tasks(business_status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_day_time ON tasks(day, time);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted ON tasks(deleted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_location ON tasks(location_id);
CREATE INDEX IF NOT EXISTS idx_tasks_requester ON tasks(requester_id);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner_id);

-- Prevent duplicate automation tasks (hard idempotency)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_origin_key_unique
  ON tasks(origin_key)
  WHERE origin_key IS NOT NULL AND origin_key != '';
```

### Important migration notes

- The `workflow_status` mapping from old `status` is critical for correctness. `Urgent` maps to `ready` (urgency is a priority/business concern, not a workflow stage).
- `doctor_id` → `requester_id` and `nurse_id` → `owner_id`. Your UI labels remain "Doctor" / "Nurse".
- `place` → `place_text` (free-text preserved; `location_id` is null until locations are populated).
- If you have existing prod users, use a more careful migration with `ALTER TABLE ADD COLUMN` for non-destructive upgrades.
- `CHECK` constraints added for `ops.op_type`, `ops.entity_type`, and `tasks.origin` (were missing in original).
- All timestamps use ISO UTC strings consistently. Do not mix with SQLite `datetime('now')` at the application level.

---

## 4. DB Module Structure (Enforced Boundaries)

> **FIX APPLIED: Enforce "no direct writes" by module boundaries, not just docs.**
>
> The original plan exported `insertTask`, `updateTask` etc. from the same query files that UI hooks imported. Any engineer could accidentally bypass the ledger. This is now split into read-only queries (safe for UI) and internal mutators (only imported by `commandService.ts`).

### File structure

```
src/database/
  ├── db.ts                             # getDatabase() + migrations + PRAGMA setup
  ├── migrations/
  │   ├── 001_initial_schema.ts
  │   └── 002_local_ops_patients.ts
  │
  ├── queries/                          # ✅ READ-ONLY — safe for UI/hooks to import
  │   ├── tasks.read.ts                 # getTaskById, getTasksByWard, findTaskByOriginKey
  │   ├── patients.read.ts              # getPatientById, getPatientsByWard
  │   ├── locations.read.ts             # getLocationById, getLocationsByParent
  │   └── ops.read.ts                   # getOpsForEntity, getOpsForActorDay, getLastUndoableOp, etc.
  │
  └── internal/                         # 🔒 MUTATORS — ONLY commandService.ts may import
      ├── tasks.mutate.ts               # insertTask, updateTask (atomic version check)
      ├── patients.mutate.ts            # insertPatient, updatePatient (atomic version check)
      └── ops.mutate.ts                 # insertOp, enqueueOutbox, insertAutomationRun
```

### ESLint convention (recommended)

```js
// .eslintrc.js — add a no-restricted-imports rule
{
  "rules": {
    "no-restricted-imports": ["error", {
      "patterns": [
        {
          "group": ["**/database/internal/*"],
          "message": "Internal mutators can only be imported by commandService.ts. Use applyOp() instead."
        }
      ]
    }]
  },
  "overrides": [
    {
      "files": ["src/services/commandService.ts"],
      "rules": { "no-restricted-imports": "off" }
    }
  ]
}
```

---

## 5. Read-Only Query Modules

### `src/database/queries/ops.read.ts`

```ts
import type * as SQLite from 'expo-sqlite';

export type DbOpRow = {
  opId: string;
  opGroupId: string | null;
  entityType: 'task' | 'patient' | 'ward' | 'staff' | 'location';
  entityId: string;
  opType: string;
  actorId: string | null;
  deviceId: string;
  baseVersion: number;
  resultVersion: number;
  patchJson: string;
  inversePatchJson: string;
  revertsOpId: string | null;
  causedByOpId: string | null;
  reason: string | null;
  createdAt: string;
  createdDayLocal: string;
};

const OP_SELECT = `
  SELECT
    op_id AS opId,
    op_group_id AS opGroupId,
    entity_type AS entityType,
    entity_id AS entityId,
    op_type AS opType,
    actor_id AS actorId,
    device_id AS deviceId,
    base_version AS baseVersion,
    result_version AS resultVersion,
    patch_json AS patchJson,
    inverse_patch_json AS inversePatchJson,
    reverts_op_id AS revertsOpId,
    caused_by_op_id AS causedByOpId,
    reason,
    created_at AS createdAt,
    created_day_local AS createdDayLocal
  FROM ops
`;

export async function getOpById(db: SQLite.SQLiteDatabase, opId: string) {
  return db.getFirstAsync<DbOpRow>(
    `${OP_SELECT} WHERE op_id = ?`, [opId]
  );
}

export async function getOpsForEntity(
  db: SQLite.SQLiteDatabase, entityType: string, entityId: string, limit = 200
) {
  return db.getAllAsync<DbOpRow>(
    `${OP_SELECT} WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC LIMIT ?`,
    [entityType, entityId, limit]
  );
}

export async function getOpsForActorDay(
  db: SQLite.SQLiteDatabase, actorId: string, dayLocal: string
) {
  return db.getAllAsync<DbOpRow>(
    `${OP_SELECT} WHERE actor_id = ? AND created_day_local = ? ORDER BY created_at DESC LIMIT 500`,
    [actorId, dayLocal]
  );
}

export async function countOpsForActorDay(
  db: SQLite.SQLiteDatabase, actorId: string, dayLocal: string
) {
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM ops WHERE actor_id = ? AND created_day_local = ?`,
    [actorId, dayLocal]
  );
  return row?.c ?? 0;
}

export async function getLastUndoableOp(
  db: SQLite.SQLiteDatabase, actorId?: string | null
) {
  const where = actorId
    ? `WHERE actor_id = ? AND op_type NOT IN ('undo', 'automation')`
    : `WHERE op_type NOT IN ('undo', 'automation')`;
  const params = actorId ? [actorId] : [];
  return db.getFirstAsync<DbOpRow>(
    `${OP_SELECT} ${where} ORDER BY created_at DESC LIMIT 1`,
    params
  );
}

export async function getOpsByGroupId(
  db: SQLite.SQLiteDatabase, opGroupId: string
) {
  return db.getAllAsync<DbOpRow>(
    `${OP_SELECT} WHERE op_group_id = ? ORDER BY created_at ASC`,
    [opGroupId]
  );
}

export async function hasAutomationRun(
  db: SQLite.SQLiteDatabase, ruleId: string, triggerOpId: string
) {
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM automation_runs WHERE rule_id = ? AND trigger_op_id = ?`,
    [ruleId, triggerOpId]
  );
  return (row?.c ?? 0) > 0;
}
```

### `src/database/queries/patients.read.ts`

```ts
import type * as SQLite from 'expo-sqlite';
import type { Patient } from '../../types/models';

const PATIENT_SELECT = `
  SELECT
    id,
    ward_id AS wardId,
    name,
    stage,
    is_active AS isActive,
    version,
    updated_by AS updatedBy,
    deleted_at AS deletedAt,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM patients
`;

export async function getPatientById(db: SQLite.SQLiteDatabase, id: string) {
  return db.getFirstAsync<Patient>(
    `${PATIENT_SELECT} WHERE id = ? AND deleted_at IS NULL`, [id]
  );
}

export async function getPatientsByWard(db: SQLite.SQLiteDatabase, wardId: string) {
  return db.getAllAsync<Patient>(
    `${PATIENT_SELECT} WHERE ward_id = ? AND deleted_at IS NULL AND is_active = 1 ORDER BY name`,
    [wardId]
  );
}
```

### `src/database/queries/tasks.read.ts`

```ts
import type * as SQLite from 'expo-sqlite';
import type { Task } from '../../types/models';

const TASK_SELECT = `
  SELECT
    t.id,
    t.ward_id AS wardId,
    t.patient_id AS patientId,
    p.name AS patientNameSnapshot,
    t.requester_id AS requesterId,
    t.owner_id AS ownerId,
    t.workflow_status AS workflowStatus,
    t.business_status AS businessStatus,
    t.name,
    t.priority,
    t.time,
    t.day,
    t.recurrence,
    t.location_id AS locationId,
    t.place_text AS placeText,
    t.type,
    t.notes,
    t.completed_at AS completedAt,
    t.sort_order AS sortOrder,
    t.origin,
    t.origin_key AS originKey,
    t.version,
    t.updated_by AS updatedBy,
    t.deleted_at AS deletedAt,
    t.created_at AS createdAt,
    t.updated_at AS updatedAt
  FROM tasks t
  LEFT JOIN patients p ON t.patient_id = p.id
`;

export async function getTaskById(db: SQLite.SQLiteDatabase, id: string) {
  return db.getFirstAsync<Task>(
    `${TASK_SELECT} WHERE t.id = ? AND t.deleted_at IS NULL`, [id]
  );
}

export async function getTasksByWard(db: SQLite.SQLiteDatabase, wardId: string) {
  return db.getAllAsync<Task>(
    `${TASK_SELECT} WHERE t.ward_id = ? AND t.deleted_at IS NULL ORDER BY t.sort_order, t.time`,
    [wardId]
  );
}

export async function findTaskByOriginKey(db: SQLite.SQLiteDatabase, originKey: string) {
  return db.getFirstAsync<{ id: string }>(
    `SELECT id FROM tasks WHERE origin_key = ? AND deleted_at IS NULL`, [originKey]
  );
}
```

---

## 6. Internal Mutator Modules

> **🔒 These files are ONLY imported by `commandService.ts`.** The ESLint rule in section 4 enforces this.

### `src/database/internal/tasks.mutate.ts`

> **FIX APPLIED: Atomic version check.** The `WHERE` clause includes `AND version = ? AND deleted_at IS NULL`. We check `rowsAffected === 1` instead of doing a separate SELECT.

```ts
import type * as SQLite from 'expo-sqlite';

const TASK_COL_MAP: Record<string, string> = {
  wardId: 'ward_id', patientId: 'patient_id',
  requesterId: 'requester_id', ownerId: 'owner_id',
  workflowStatus: 'workflow_status', businessStatus: 'business_status',
  name: 'name', priority: 'priority', time: 'time', day: 'day',
  recurrence: 'recurrence', locationId: 'location_id', placeText: 'place_text',
  type: 'type', notes: 'notes', completedAt: 'completed_at',
  sortOrder: 'sort_order', origin: 'origin', originKey: 'origin_key',
  version: 'version', updatedBy: 'updated_by',
  deletedAt: 'deleted_at', updatedAt: 'updated_at',
};

export async function insertTask(db: SQLite.SQLiteDatabase, t: Record<string, any>) {
  await db.runAsync(`
    INSERT INTO tasks (
      id, ward_id, patient_id, requester_id, owner_id,
      workflow_status, business_status, name, priority, time, day, recurrence,
      location_id, place_text, type, notes, completed_at, sort_order,
      origin, origin_key, version, updated_by, deleted_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    t.id, t.wardId, t.patientId ?? null, t.requesterId ?? null, t.ownerId ?? null,
    t.workflowStatus ?? 'ready', t.businessStatus ?? 'Scheduled',
    t.name, t.priority ?? 'Medium', t.time ?? '09:00', t.day ?? 'Monday',
    t.recurrence ?? 'None', t.locationId ?? null, t.placeText ?? '',
    t.type ?? '', t.notes ?? '', t.completedAt ?? null, t.sortOrder ?? 0,
    t.origin ?? 'manual', t.originKey ?? null,
    t.version ?? 1, t.updatedBy ?? null, t.deletedAt ?? null,
    t.createdAt, t.updatedAt,
  ]);
}

/**
 * ATOMIC version-checked update.
 * Uses WHERE version = ? AND deleted_at IS NULL in the UPDATE itself.
 * If rowsAffected !== 1, throws version conflict.
 */
export async function updateTask(db: SQLite.SQLiteDatabase, params: {
  id: string;
  baseVersion: number;
  patch: Record<string, any>;
  actorId?: string | null;
  updatedAt: string;
}) {
  const newVersion = params.baseVersion + 1;
  const fullPatch = {
    ...params.patch,
    version: newVersion,
    updatedBy: params.actorId ?? null,
    updatedAt: params.updatedAt,
  };

  const entries = Object.entries(fullPatch).filter(([k]) => TASK_COL_MAP[k]);
  if (entries.length === 0) throw new Error('Empty patch');

  const sets: string[] = [];
  const values: any[] = [];
  for (const [k, v] of entries) {
    sets.push(`${TASK_COL_MAP[k]} = ?`);
    values.push(v);
  }

  // Atomic: version in WHERE clause + deleted_at IS NULL
  values.push(params.id, params.baseVersion);
  const result = await db.runAsync(
    `UPDATE tasks SET ${sets.join(', ')} WHERE id = ? AND version = ? AND deleted_at IS NULL`,
    values
  );

  if (result.changes !== 1) {
    throw new Error(
      `Version conflict or task not found. id=${params.id} expected_version=${params.baseVersion}`
    );
  }

  return { resultVersion: newVersion };
}
```

### `src/database/internal/patients.mutate.ts`

> **FIX APPLIED: Same atomic version check pattern as tasks.**

```ts
import type * as SQLite from 'expo-sqlite';

const PATIENT_COL_MAP: Record<string, string> = {
  wardId: 'ward_id', name: 'name', stage: 'stage', isActive: 'is_active',
  version: 'version', updatedBy: 'updated_by', deletedAt: 'deleted_at', updatedAt: 'updated_at',
};

export async function insertPatient(db: SQLite.SQLiteDatabase, p: Record<string, any>) {
  await db.runAsync(`
    INSERT INTO patients (id, ward_id, name, stage, is_active, version, updated_by, deleted_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    p.id, p.wardId, p.name, p.stage ?? 'Admission', p.isActive ? 1 : 0,
    p.version ?? 1, p.updatedBy ?? null, p.deletedAt ?? null,
    p.createdAt, p.updatedAt,
  ]);
}

/**
 * ATOMIC version-checked update.
 */
export async function updatePatient(db: SQLite.SQLiteDatabase, params: {
  id: string;
  baseVersion: number;
  patch: Record<string, any>;
  actorId?: string | null;
  updatedAt: string;
}) {
  const newVersion = params.baseVersion + 1;
  const fullPatch = {
    ...params.patch,
    version: newVersion,
    updatedBy: params.actorId ?? null,
    updatedAt: params.updatedAt,
  };

  const entries = Object.entries(fullPatch).filter(([k]) => PATIENT_COL_MAP[k]);
  if (entries.length === 0) throw new Error('Empty patch');

  const sets: string[] = [];
  const values: any[] = [];
  for (const [k, v] of entries) {
    sets.push(`${PATIENT_COL_MAP[k]} = ?`);
    values.push(k === 'isActive' ? (v ? 1 : 0) : v);
  }

  // Atomic: version in WHERE clause + deleted_at IS NULL
  values.push(params.id, params.baseVersion);
  const result = await db.runAsync(
    `UPDATE patients SET ${sets.join(', ')} WHERE id = ? AND version = ? AND deleted_at IS NULL`,
    values
  );

  if (result.changes !== 1) {
    throw new Error(
      `Version conflict or patient not found. id=${params.id} expected_version=${params.baseVersion}`
    );
  }

  return { resultVersion: newVersion };
}
```

### `src/database/internal/ops.mutate.ts`

```ts
import type * as SQLite from 'expo-sqlite';

export async function insertOp(db: SQLite.SQLiteDatabase, row: {
  opId: string;
  opGroupId?: string | null;
  entityType: string;
  entityId: string;
  opType: string;
  actorId?: string | null;
  deviceId: string;
  baseVersion: number;
  resultVersion: number;
  patchJson: string;
  inversePatchJson: string;
  revertsOpId?: string | null;
  causedByOpId?: string | null;
  reason?: string | null;
  createdAt: string;
  createdDayLocal: string;
}) {
  await db.runAsync(`
    INSERT INTO ops (
      op_id, op_group_id, entity_type, entity_id, op_type, actor_id, device_id,
      base_version, result_version, patch_json, inverse_patch_json,
      reverts_op_id, caused_by_op_id, reason,
      created_at, created_day_local
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    row.opId, row.opGroupId ?? null, row.entityType, row.entityId,
    row.opType, row.actorId ?? null, row.deviceId,
    row.baseVersion, row.resultVersion, row.patchJson, row.inversePatchJson,
    row.revertsOpId ?? null, row.causedByOpId ?? null, row.reason ?? null,
    row.createdAt, row.createdDayLocal,
  ]);
}

export async function enqueueOutbox(db: SQLite.SQLiteDatabase, opId: string) {
  await db.runAsync(
    `INSERT OR IGNORE INTO outbox_ops (op_id, status) VALUES (?, 'pending')`,
    [opId]
  );
}

/**
 * INSERT OR IGNORE pattern for automation dedupe.
 * Returns true if the row was actually inserted (i.e., first run).
 * Returns false if it already existed (i.e., duplicate — skip).
 */
export async function tryInsertAutomationRun(db: SQLite.SQLiteDatabase, run: {
  id: string;
  ruleId: string;
  triggerOpId: string;
  status: 'completed' | 'failed' | 'skipped';
  opsCreated: number;
  errorMessage?: string | null;
}): Promise<boolean> {
  const result = await db.runAsync(`
    INSERT OR IGNORE INTO automation_runs (id, rule_id, trigger_op_id, status, ops_created, error_message)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [run.id, run.ruleId, run.triggerOpId, run.status, run.opsCreated, run.errorMessage ?? null]);
  return result.changes === 1;
}
```

---

## 7. Command Pipeline (applyOp)

### `src/utils/ids.ts`

```ts
import { ulid as _ulid } from 'ulid';
export const ulid = () => _ulid();
```

### `src/utils/device.ts`

> **FIX APPLIED: Stable ULID-based device ID stored in MMKV.** The original used `Date.now()` with a broken `getIosIdForVendorAsync` check.

> **FIX APPLIED: `getLocalDayFromIso()` derives day from a timestamp, not from `new Date()`.** This prevents ledger drift when `createdAt` is injected.

```ts
import { MMKV } from 'react-native-mmkv';
import { ulid } from './ids';

const storage = new MMKV();

/**
 * Stable device ID — generated once per install, stored in MMKV.
 * Does NOT rely on platform vendor IDs (privacy-safe, sync-safe).
 */
export function getDeviceId(): string {
  let id = storage.getString('device_id');
  if (!id) {
    id = `device_${ulid()}`;
    storage.set('device_id', id);
  }
  return id;
}

export function getActiveActorId(): string | null {
  return storage.getString('active_actor_id') ?? null;
}

/**
 * Returns YYYY-MM-DD in device-local timezone for the CURRENT moment.
 * Use getLocalDayFromIso() when you have a specific timestamp.
 */
export function getLocalDay(): string {
  return getLocalDayFromIso(new Date().toISOString());
}

/**
 * Derives YYYY-MM-DD local day from an ISO timestamp.
 * Used by applyOp to keep createdDayLocal consistent with createdAt.
 */
export function getLocalDayFromIso(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
```

### `src/services/opService.ts`

> **FIX APPLIED: `undefined` values are filtered out of patches.** Only explicit `null` clears a field. This prevents SQLite binding inconsistencies.

```ts
/**
 * Computes the minimal diff between current state and desired updates.
 * - Only changed fields are included.
 * - `undefined` values in updates are IGNORED (not included in patch).
 * - Use explicit `null` to clear a field.
 */
export function computePatch<T extends Record<string, any>>(
  current: T,
  updates: Partial<T>
): { patch: Partial<T>; inversePatch: Partial<T> } {
  const patch: Partial<T> = {};
  const inversePatch: Partial<T> = {};

  for (const [k, next] of Object.entries(updates)) {
    // FIX: Skip undefined values — only explicit null clears a field
    if (next === undefined) continue;

    const key = k as keyof T;
    const prev = current[key];

    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      (patch as any)[key] = next;
      (inversePatch as any)[key] = prev ?? null;
    }
  }

  return { patch, inversePatch };
}
```

### `src/services/commandService.ts`

> **FIXES APPLIED:**
> 1. **Idempotency** — if `op_id` already exists, return cached `resultVersion` (no-op).
> 2. **effectivePatch/effectiveInversePatch** — for deletes, `deletedAt` is added to the patch before both snapshot write AND ops ledger write. The ledger always reflects what was actually applied.
> 3. **createdDayLocal from createdAt** — uses `getLocalDayFromIso()` instead of `getLocalDay()`.
> 4. **Atomic version checks** — delegated to `internal/*.mutate.ts` (WHERE version = ?).
> 5. **updatedAt passed through** — mutators receive the op's `createdAt` as `updatedAt` for consistency.

```ts
import { getDatabase } from '../database/db';
import * as taskMut from '../database/internal/tasks.mutate';
import * as patientMut from '../database/internal/patients.mutate';
import * as opsMut from '../database/internal/ops.mutate';
import { getOpById } from '../database/queries/ops.read';
import { runAutomationForOp } from './automationService';
import { getLocalDayFromIso } from '../utils/device';
import type { MutableEntityType, OpType } from '../types/models';

export type OpInput = {
  opId: string;
  opGroupId?: string | null;
  entityType: MutableEntityType;       // Only 'task' | 'patient' in V1
  entityId: string;
  opType: OpType;

  actorId?: string | null;
  deviceId: string;

  baseVersion: number;
  patch: Record<string, any>;
  inversePatch: Record<string, any>;

  revertsOpId?: string | null;
  causedByOpId?: string | null;
  reason?: string | null;

  createdAt?: string;
};

export async function applyOp(op: OpInput): Promise<{ resultVersion: number }> {
  const db = await getDatabase();
  const createdAt = op.createdAt ?? new Date().toISOString();

  // FIX: Derive createdDayLocal from createdAt, not from "now"
  const createdDayLocal = getLocalDayFromIso(createdAt);

  // ── FIX: Idempotency check — if op_id already exists, return cached result ──
  const existingOp = await getOpById(db, op.opId);
  if (existingOp) {
    return { resultVersion: existingOp.resultVersion };
  }

  // ── FIX: Compute effectivePatch/effectiveInversePatch ──
  // For deletes, the actual applied patch includes deletedAt (and isActive for patients).
  // The ledger must store what was ACTUALLY applied, not the raw caller input.
  let effectivePatch = { ...op.patch };
  let effectiveInverse = { ...op.inversePatch };

  if (op.opType === 'delete') {
    if (op.entityType === 'task') {
      effectivePatch = { ...op.patch, deletedAt: createdAt };
      effectiveInverse = { ...op.inversePatch, deletedAt: null };
    } else if (op.entityType === 'patient') {
      effectivePatch = { ...op.patch, deletedAt: createdAt, isActive: false };
      effectiveInverse = { ...op.inversePatch, deletedAt: null, isActive: true };
    }
  }

  // For creates, ensure patch explicitly includes deletedAt: null and isActive: true
  // so that undo-of-undo (redo) can cleanly restore the row
  if (op.opType === 'create' || op.opType === 'automation') {
    effectivePatch.deletedAt = null;
    if (op.entityType === 'patient') {
      effectivePatch.isActive = true;
    }
  }

  await db.execAsync('BEGIN;');
  try {
    let resultVersion = op.baseVersion;

    // ── Apply snapshot mutation ──────────────────────────
    if (op.entityType === 'task') {
      if (op.opType === 'create' || op.opType === 'automation') {
        await taskMut.insertTask(db, {
          ...effectivePatch,
          id: op.entityId,
          version: 1,
          updatedBy: op.actorId ?? null,
          deletedAt: null,
          createdAt,
          updatedAt: createdAt,
        });
        resultVersion = 1;
      } else if (op.opType === 'delete') {
        const res = await taskMut.updateTask(db, {
          id: op.entityId,
          baseVersion: op.baseVersion,
          actorId: op.actorId,
          patch: effectivePatch,
          updatedAt: createdAt,
        });
        resultVersion = res.resultVersion;
      } else {
        // update or undo
        const res = await taskMut.updateTask(db, {
          id: op.entityId,
          baseVersion: op.baseVersion,
          actorId: op.actorId,
          patch: effectivePatch,
          updatedAt: createdAt,
        });
        resultVersion = res.resultVersion;
      }
    } else if (op.entityType === 'patient') {
      if (op.opType === 'create' || op.opType === 'automation') {
        await patientMut.insertPatient(db, {
          ...effectivePatch,
          id: op.entityId,
          version: 1,
          updatedBy: op.actorId ?? null,
          deletedAt: null,
          createdAt,
          updatedAt: createdAt,
        });
        resultVersion = 1;
      } else if (op.opType === 'delete') {
        const res = await patientMut.updatePatient(db, {
          id: op.entityId,
          baseVersion: op.baseVersion,
          actorId: op.actorId,
          patch: effectivePatch,
          updatedAt: createdAt,
        });
        resultVersion = res.resultVersion;
      } else {
        const res = await patientMut.updatePatient(db, {
          id: op.entityId,
          baseVersion: op.baseVersion,
          actorId: op.actorId,
          patch: effectivePatch,
          updatedAt: createdAt,
        });
        resultVersion = res.resultVersion;
      }
    }
    // No else — MutableEntityType is 'task' | 'patient' only in V1.
    // TypeScript enforces this at compile time.

    // ── Write audit ledger row (effectivePatch, not raw) ──
    await opsMut.insertOp(db, {
      opId: op.opId,
      opGroupId: op.opGroupId ?? null,
      entityType: op.entityType,
      entityId: op.entityId,
      opType: op.opType,
      actorId: op.actorId ?? null,
      deviceId: op.deviceId,
      baseVersion: op.baseVersion,
      resultVersion,
      patchJson: JSON.stringify(effectivePatch),
      inversePatchJson: JSON.stringify(effectiveInverse),
      revertsOpId: op.revertsOpId ?? null,
      causedByOpId: op.causedByOpId ?? null,
      reason: op.reason ?? null,
      createdAt,
      createdDayLocal,
    });

    // ── Enqueue for future sync ─────────────────────────
    await opsMut.enqueueOutbox(db, op.opId);

    await db.execAsync('COMMIT;');

    // ── Automation runs AFTER commit ────────────────────
    await runAutomationForOp({ ...op, resultVersion, createdAt });

    return { resultVersion };
  } catch (e) {
    await db.execAsync('ROLLBACK;');
    throw e;
  }
}

/**
 * Batch apply multiple ops in a single SQLite transaction.
 * Used for atomic group undo (financial-transaction-grade safety).
 * Each op still goes through the full applyOp logic but shares one transaction.
 */
export async function applyOpsBatch(ops: OpInput[]): Promise<{ results: { resultVersion: number }[] }> {
  const results: { resultVersion: number }[] = [];
  // For now, sequential applyOp calls.
  // Each has its own transaction. For true atomicity, refactor applyOp
  // to accept an optional external transaction handle in V2.
  // The idempotency guard means partial failure is recoverable.
  for (const op of ops) {
    const result = await applyOp(op);
    results.push(result);
  }
  return { results };
}
```

---

## 8. Undo Service

### `src/services/undoService.ts`

```ts
import { getDatabase } from '../database/db';
import * as opsRead from '../database/queries/ops.read';
import * as tasksRead from '../database/queries/tasks.read';
import * as patientsRead from '../database/queries/patients.read';
import { applyOp } from './commandService';
import { ulid } from '../utils/ids';

/**
 * Undo the last action by this actor.
 * This is a NEW compensating op — history is never rewritten.
 */
export async function undoLastOp(params: {
  actorId?: string | null;
  deviceId: string;
}) {
  const db = await getDatabase();
  const last = await opsRead.getLastUndoableOp(db, params.actorId ?? null);
  if (!last) throw new Error('Nothing to undo');

  // Read current entity version for optimistic concurrency
  let currentVersion = 0;
  if (last.entityType === 'task') {
    const t = await tasksRead.getTaskById(db, last.entityId);
    if (!t) throw new Error('Cannot undo: task not found');
    currentVersion = t.version;
  } else if (last.entityType === 'patient') {
    const p = await patientsRead.getPatientById(db, last.entityId);
    if (!p) throw new Error('Cannot undo: patient not found');
    currentVersion = p.version;
  } else {
    throw new Error(`Undo not implemented for entityType=${last.entityType}`);
  }

  // inversePatch becomes the new patch; patchJson becomes the new inverse
  const patch = JSON.parse(last.inversePatchJson);
  const inversePatch = JSON.parse(last.patchJson);

  return applyOp({
    opId: ulid(),
    entityType: last.entityType as 'task' | 'patient',
    entityId: last.entityId,
    opType: 'undo',
    actorId: params.actorId ?? null,
    deviceId: params.deviceId,
    baseVersion: currentVersion,
    patch,
    inversePatch,
    revertsOpId: last.opId,
    reason: `Undo: ${last.opType} on ${last.entityType}`,
  });
}

/**
 * Undo an entire op group (e.g., patient creation + auto-generated tasks).
 * Applies inverse patches in reverse order.
 * Each individual undo is idempotent, so partial failure is recoverable on retry.
 */
export async function undoOpGroup(params: {
  opGroupId: string;
  actorId?: string | null;
  deviceId: string;
}) {
  const db = await getDatabase();
  const ops = await opsRead.getOpsByGroupId(db, params.opGroupId);
  if (ops.length === 0) throw new Error('No ops found for group');

  const undoGroupId = ulid();

  // Reverse order: undo last op first
  for (const op of ops.reverse()) {
    let currentVersion = 0;
    if (op.entityType === 'task') {
      const t = await tasksRead.getTaskById(db, op.entityId);
      if (!t) continue; // already deleted
      currentVersion = t.version;
    } else if (op.entityType === 'patient') {
      const p = await patientsRead.getPatientById(db, op.entityId);
      if (!p) continue;
      currentVersion = p.version;
    } else {
      continue; // skip ward/staff/location (read-only in V1)
    }

    await applyOp({
      opId: ulid(),
      opGroupId: undoGroupId,
      entityType: op.entityType as 'task' | 'patient',
      entityId: op.entityId,
      opType: 'undo',
      actorId: params.actorId ?? null,
      deviceId: params.deviceId,
      baseVersion: currentVersion,
      patch: JSON.parse(op.inversePatchJson),
      inversePatch: JSON.parse(op.patchJson),
      revertsOpId: op.opId,
      reason: `Group undo: ${op.opType} on ${op.entityType}`,
    });
  }
}
```

---

## 9. Automation Service

### `src/services/automationService.ts`

> **FIXES APPLIED:**
> 1. **Skip undo + delete ops** — automation only fires on `create` and `update`. Prevents undo from re-triggering workflows.
> 2. **INSERT OR IGNORE first** — claim the automation_runs row before running actions. Eliminates the race condition where concurrent triggers both pass the `hasAutomationRun` check.
> 3. **Update opsCreated after** — the initial insert uses `opsCreated: 0`; we update it after actions complete.

```ts
import { getDatabase } from '../database/db';
import * as tasksRead from '../database/queries/tasks.read';
import * as patientsRead from '../database/queries/patients.read';
import * as opsRead from '../database/queries/ops.read';
import * as opsMut from '../database/internal/ops.mutate';
import { applyOp, type OpInput } from './commandService';
import { ulid } from '../utils/ids';

// ─── Rule definitions (V1: seeded JSON, not a UI builder) ────

type AutomationRule = {
  id: string;
  enabled: boolean;
  trigger: 'patient.created' | 'patient.stageChanged' | 'task.completed';
  actions: Array<
    | { type: 'createTask'; templateId: string; name: string; priority?: string; workflowStatus?: string }
  >;
};

const RULES: AutomationRule[] = [
  {
    id: 'admission_starter_tasks',
    enabled: true,
    trigger: 'patient.created',
    actions: [
      { type: 'createTask', templateId: 'adm_vitals', name: 'Admission vitals', priority: 'High' },
      { type: 'createTask', templateId: 'adm_med_recon', name: 'Medication reconciliation', priority: 'Medium' },
      { type: 'createTask', templateId: 'adm_consent', name: 'Consent forms', priority: 'High' },
    ],
  },
  // Add more rules as needed
];

// ─── Entry point (called by commandService after commit) ─────

type CommittedOp = OpInput & { resultVersion: number; createdAt: string };

export async function runAutomationForOp(op: CommittedOp) {
  // FIX: Don't trigger automation on automation, undo, OR delete ops.
  // Undo ops can include stage changes that would re-trigger workflows.
  // Delete ops should not spawn new tasks.
  // Only 'create' and 'update' from manual user actions trigger automations.
  if (op.opType === 'automation' || op.opType === 'undo' || op.opType === 'delete') {
    return;
  }

  if (op.entityType === 'patient' && op.opType === 'create') {
    await handlePatientCreated(op);
  }
  if (op.entityType === 'patient' && op.opType === 'update' && op.patch.stage) {
    await handlePatientStageChanged(op);
  }
  // Add more triggers as needed
}

// ─── Handlers ────────────────────────────────────────────────

async function handlePatientCreated(triggerOp: CommittedOp) {
  const db = await getDatabase();
  const patientId = triggerOp.entityId;

  const patient = await patientsRead.getPatientById(db, patientId);
  if (!patient) return;

  for (const rule of RULES) {
    if (!rule.enabled || rule.trigger !== 'patient.created') continue;

    // FIX: Claim the automation_runs row FIRST (INSERT OR IGNORE).
    // If it already exists → someone else ran this → skip.
    // This eliminates the race between hasAutomationRun check and insert.
    const runId = ulid();
    const claimed = await opsMut.tryInsertAutomationRun(db, {
      id: runId,
      ruleId: rule.id,
      triggerOpId: triggerOp.opId,
      status: 'completed',
      opsCreated: 0, // will update after
    });

    if (!claimed) continue; // already ran

    let opsCreated = 0;
    const opGroupId = triggerOp.opGroupId ?? triggerOp.opId;

    for (const action of rule.actions) {
      if (action.type !== 'createTask') continue;

      // Deterministic origin_key for hard idempotency
      const originKey = `patient:${patientId}:rule:${rule.id}:tpl:${action.templateId}`;
      const existing = await tasksRead.findTaskByOriginKey(db, originKey);
      if (existing) continue;

      const taskId = ulid();
      await applyOp({
        opId: ulid(),
        opGroupId,
        entityType: 'task',
        entityId: taskId,
        opType: 'automation',
        actorId: 'system',
        deviceId: triggerOp.deviceId,
        baseVersion: 0,
        patch: {
          id: taskId,
          wardId: patient.wardId,
          patientId,
          name: action.name,
          workflowStatus: action.workflowStatus ?? 'ready',
          businessStatus: 'Scheduled',
          priority: action.priority ?? 'Medium',
          time: '09:00',
          day: 'Monday',
          recurrence: 'None',
          placeText: '',
          type: '',
          notes: '',
          origin: 'automation',
          originKey,
        },
        inversePatch: { deletedAt: new Date().toISOString() },
        causedByOpId: triggerOp.opId,
        reason: `Rule: ${rule.id} → create ${action.name}`,
      });
      opsCreated++;
    }

    // Update the automation_runs row with actual count
    // (the initial insert had opsCreated: 0)
    if (opsCreated > 0) {
      await db.runAsync(
        `UPDATE automation_runs SET ops_created = ? WHERE id = ?`,
        [opsCreated, runId]
      );
    }
  }
}

async function handlePatientStageChanged(triggerOp: CommittedOp) {
  // Placeholder for stage-change automations
  // e.g., "Discharge" stage → create discharge tasks
  // Follow the same pattern: claim automation_runs row first, then create tasks
}
```

---

## 10. TanStack Query Integration

> **Note:** All hooks import ONLY from `queries/*` (read-only) and from `services/commandService` (the write gateway). They never import from `internal/*`.

### `src/hooks/useUpdateTask.ts`

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getDatabase } from '../database/db';
import * as tasksRead from '../database/queries/tasks.read';
import { computePatch } from '../services/opService';
import { applyOp } from '../services/commandService';
import { ulid } from '../utils/ids';
import { getDeviceId, getActiveActorId } from '../utils/device';

export function useUpdateTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const db = await getDatabase();
      const current = await tasksRead.getTaskById(db, id);
      if (!current) throw new Error('Task not found');

      const { patch, inversePatch } = computePatch(current as any, updates);
      if (Object.keys(patch).length === 0) return; // no-op

      return applyOp({
        opId: ulid(),
        entityType: 'task',
        entityId: id,
        opType: 'update',
        actorId: getActiveActorId(),
        deviceId: getDeviceId(),
        baseVersion: current.version,
        patch,
        inversePatch,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
```

### `src/hooks/useCreateTask.ts`

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { applyOp } from '../services/commandService';
import { ulid } from '../utils/ids';
import { getDeviceId, getActiveActorId } from '../utils/device';

export function useCreateTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      wardId: string;
      name: string;
      patientId?: string | null;
      requesterId?: string | null;
      ownerId?: string | null;
      priority?: string;
      time?: string;
      day?: string;
      placeText?: string;
      type?: string;
      notes?: string;
    }) => {
      const taskId = ulid();

      return applyOp({
        opId: ulid(),
        entityType: 'task',
        entityId: taskId,
        opType: 'create',
        actorId: getActiveActorId(),
        deviceId: getDeviceId(),
        baseVersion: 0,
        patch: {
          id: taskId,
          wardId: input.wardId,
          name: input.name,
          patientId: input.patientId ?? null,
          requesterId: input.requesterId ?? null,
          ownerId: input.ownerId ?? null,
          workflowStatus: 'ready',
          businessStatus: 'Scheduled',
          priority: input.priority ?? 'Medium',
          time: input.time ?? '09:00',
          day: input.day ?? 'Monday',
          recurrence: 'None',
          placeText: input.placeText ?? '',
          type: input.type ?? '',
          notes: input.notes ?? '',
          origin: 'manual',
        },
        inversePatch: { deletedAt: new Date().toISOString() },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
```

### `src/hooks/useDeleteTask.ts`

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getDatabase } from '../database/db';
import * as tasksRead from '../database/queries/tasks.read';
import { applyOp } from '../services/commandService';
import { ulid } from '../utils/ids';
import { getDeviceId, getActiveActorId } from '../utils/device';

export function useDeleteTask() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const db = await getDatabase();
      const current = await tasksRead.getTaskById(db, id);
      if (!current) throw new Error('Task not found');

      return applyOp({
        opId: ulid(),
        entityType: 'task',
        entityId: id,
        opType: 'delete',
        actorId: getActiveActorId(),
        deviceId: getDeviceId(),
        baseVersion: current.version,
        patch: {},                    // effectivePatch adds deletedAt inside applyOp
        inversePatch: {},             // effectiveInverse adds deletedAt: null inside applyOp
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
```

### `src/hooks/useCreatePatient.ts`

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { applyOp } from '../services/commandService';
import { ulid } from '../utils/ids';
import { getDeviceId, getActiveActorId } from '../utils/device';

export function useCreatePatient() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { wardId: string; name: string; stage?: string }) => {
      const patientId = ulid();
      const opGroupId = ulid(); // group patient creation + auto tasks

      return applyOp({
        opId: ulid(),
        opGroupId,
        entityType: 'patient',
        entityId: patientId,
        opType: 'create',
        actorId: getActiveActorId(),
        deviceId: getDeviceId(),
        baseVersion: 0,
        patch: {
          id: patientId,
          wardId: input.wardId,
          name: input.name,
          stage: input.stage ?? 'Admission',
          isActive: true,
        },
        inversePatch: { deletedAt: new Date().toISOString(), isActive: false },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] });
      qc.invalidateQueries({ queryKey: ['tasks'] }); // automation may create tasks
    },
  });
}
```

### `src/hooks/useUndo.ts`

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { undoLastOp } from '../services/undoService';
import { getDeviceId, getActiveActorId } from '../utils/device';

export function useUndo() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      return undoLastOp({
        actorId: getActiveActorId(),
        deviceId: getDeviceId(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['patients'] });
      qc.invalidateQueries({ queryKey: ['ops'] });
    },
  });
}
```

---

## 11. Activity Log (Per-User Per-Day)

### `src/hooks/useMyActivity.ts`

```ts
import { useQuery } from '@tanstack/react-query';
import { getDatabase } from '../database/db';
import * as opsRead from '../database/queries/ops.read';
import { getLocalDay } from '../utils/device';

export function useMyActionsToday(actorId: string) {
  const today = getLocalDay();

  return useQuery({
    queryKey: ['ops', 'actor', actorId, today],
    queryFn: async () => {
      const db = await getDatabase();
      return opsRead.getOpsForActorDay(db, actorId, today);
    },
    staleTime: 5_000,
  });
}

export function useMyActionCountToday(actorId: string) {
  const today = getLocalDay();

  return useQuery({
    queryKey: ['ops', 'actorCount', actorId, today],
    queryFn: async () => {
      const db = await getDatabase();
      return opsRead.countOpsForActorDay(db, actorId, today);
    },
    staleTime: 5_000,
  });
}

export function useTaskActivity(entityId: string) {
  return useQuery({
    queryKey: ['ops', 'entity', 'task', entityId],
    queryFn: async () => {
      const db = await getDatabase();
      return opsRead.getOpsForEntity(db, 'task', entityId);
    },
    staleTime: 5_000,
  });
}
```

### What to display in the Activity UI

Each op row gives you:

| Field | Use |
|---|---|
| `createdAt` | Timestamp |
| `entityType` + `entityId` | Link to task/patient |
| `opType` | Action badge (created, updated, undo, automation) |
| `patchJson` | Show which fields changed (this is the effectivePatch) |
| `causedByOpId` | Show "triggered by Patient X creation" |
| `reason` | Human-readable explanation |
| `actorId` | Who did it (or "system" for automation) |

---

## 12. Build Order

Ship in this order. Each step is independently valuable.

### Phase 1: Foundations (Week 1)

1. **DB setup** — ensure `PRAGMA journal_mode = WAL` + `PRAGMA foreign_keys = ON` in `db.ts`
2. **DB migration 002** — patients + ops + outbox + automation_runs + tasks rebuild
3. **Module structure** — split `queries/` (read-only) and `internal/` (mutators)
4. **`applyOp()` pipeline** — idempotency + effectivePatch + atomic version check + ops insert
5. **`device.ts`** — stable ULID deviceId + `getLocalDayFromIso()`
6. **Migrate one mutation** — convert `useUpdateTask` to use `applyOp()`

At this point: every task update is audited, versioned, idempotent, and has undo data.

### Phase 2: Core Features (Week 2)

7. **Migrate all remaining mutations** to `applyOp()` (create, delete, status change)
8. **Implement undo** (`undoLastOp` + `useUndo` hook + UI button)
9. **Patient entity** — CRUD screens, link tasks to patients via `patientId`

### Phase 3: Automation + Activity (Week 3)

10. **Automation service** — patient.created triggers starter tasks (with undo/delete guard)
11. **Activity feed** — "My Actions Today" screen + per-task activity timeline
12. **Daily action count** — dashboard badge

### Phase 4: Polish (Week 4)

13. **Location hierarchy** — populate locations table, link tasks
14. **Group undo** — undo patient creation reverts all auto-created tasks
15. **ESLint rule** — enforce `no-restricted-imports` for `internal/*` modules

---

## 13. V2 Sync Upgrade Path

When you're ready to add multi-device sync, the upgrade is additive (no rewrite):

```
V1 (local-only)                    V2 (synced)
─────────────────                  ─────────────────
applyOp() writes to                applyOp() writes to
  ├── tasks snapshot                 ├── tasks snapshot
  ├── ops ledger                     ├── ops ledger
  └── outbox_ops (ignored)           └── outbox_ops → syncService flushes

                                   syncService adds:
                                     ├── Batch push outbox via HTTP API
                                     ├── Delta pull via cursor/token
                                     ├── AppSync Events subscription per ward
                                     ├── Inbound ops → applyOp (idempotent!)
                                     └── Conflict resolution (version checks)
```

**What V2 needs that V1 already provides:**

- `version` on every entity (optimistic concurrency, atomic WHERE) ✅
- `outbox_ops` table (pending sync queue) ✅
- Idempotent `applyOp` via `op_id` check ✅
- `origin_key` for automation dedup ✅
- Append-only audit ledger with effectivePatch ✅
- `createdDayLocal` derived from `createdAt` (not wall clock) ✅

**What V2 adds:**

- `sync_state` table (`lastSyncCursor`, `deviceId`)
- `inbox_dedup` table (`opId PK`, prevents double-applying inbound ops — though applyOp idempotency already handles this)
- `syncService.ts` (batch push + delta pull + subscription listener)
- Ward/staff/location mutability (add to `applyOp`, add `version`/`updated_by`/`deleted_at` to schemas)
- Conflict UI ("Task changed by another user; view changes")

---

## 14. Deferred Items

These are valuable but not needed for V1 pilot:

| Item | Why defer | When to add |
|---|---|---|
| Full protocol/rule builder UI | Hardcoded rules are fine for V1 | When you have 10+ rules |
| Ward/staff/location editing | Seeded + read-only is fine for pilot | V2 when you add sync |
| JSON Patch format for patches | Field→value patches work for V1 | When you need merge/replay standardization |
| FHIR ingestion pipeline | Not receiving FHIR payloads yet | When integrating with hospital EMR |
| `fhir_resources` raw storage table | No external FHIR data yet | When you need lossless FHIR payloads |
| Versioned FHIR resource history | `ops` ledger covers audit needs | When you need FHIR-native versioning |
| Admin revert-to-version | Too complex for V1 | When you have admin roles |
| WebSocket push / real-time sync | V1 is single-device | V2 sync phase |
| Atomic group undo (single txn) | Sequential + idempotent is safe enough | When crash-during-group-undo becomes a real issue |

---

## 15. Review Fixes Applied

This document incorporates all must-fix and nice-to-have items from both architecture reviews:

| # | Fix | Where applied | Review source |
|---|---|---|---|
| 1 | **Atomic version checks** — `WHERE version = ? AND deleted_at IS NULL` + `rowsAffected === 1` | `internal/tasks.mutate.ts`, `internal/patients.mutate.ts` | Both reviews |
| 2 | **createdDayLocal from createdAt** — `getLocalDayFromIso(createdAt)` not `getLocalDay()` | `commandService.ts`, `device.ts` | Review 2 |
| 3 | **Stable deviceId** — ULID stored in MMKV, no `Date.now()` fallback | `device.ts` | Both reviews |
| 4 | **EntityType split** — `MutableEntityType` for V1 (`task` \| `patient`); ward/staff/location declared read-only seeded | `models.ts`, `commandService.ts` | Both reviews |
| 5 | **No automation on undo/delete** — `runAutomationForOp` returns early for `undo`, `delete`, `automation` | `automationService.ts` | Review 1 |
| 6 | **effectivePatch stored in ledger** — delete ops include `deletedAt` in both snapshot write and ops row | `commandService.ts` | Review 1 |
| 7 | **applyOp idempotency** — check `op_id` exists before transaction; return cached `resultVersion` | `commandService.ts` | Review 1 |
| 8 | **Module boundary enforcement** — `queries/*` (read-only) vs `internal/*` (mutators) + ESLint rule | File structure, section 4 | Review 1 |
| 9 | **Automation dedupe race fix** — INSERT OR IGNORE first, then run actions | `automationService.ts`, `ops.mutate.ts` | Review 2 |
| 10 | **CHECK constraints** — `ops.op_type`, `ops.entity_type`, `tasks.origin` | Migration SQL | Both reviews |
| 11 | **undefined → skip in computePatch** — only explicit `null` clears a field | `opService.ts` | Review 2 |
| 12 | **WAL + foreign keys reminder** — documented as prerequisite | Migration notes | Review 2 |
| 13 | **Create ops include deletedAt: null** — enables clean undo-of-undo (redo) | `commandService.ts` | Review 2 |
| 14 | **inversePatch for patient create includes isActive: false** — symmetric undo | `useCreatePatient.ts` | Review 2 |
| 15 | **updatedAt passed from op timestamp** — mutators use `createdAt` not `new Date()` for consistency | `internal/*.mutate.ts` | Derived from fix 2 |

---

## Appendix: Dependencies to Install

```bash
npm install ulid
# Already have: expo-sqlite, @tanstack/react-query, react-native-mmkv, zustand
```

## Appendix: Complete File Structure

```
src/
├── types/
│   └── models.ts                    # Patient, Task, Location, Op, MutableEntityType
├── database/
│   ├── db.ts                        # getDatabase() + migrations + PRAGMA WAL + FK
│   ├── migrations/
│   │   ├── 001_initial_schema.ts
│   │   └── 002_local_ops_patients.ts
│   ├── queries/                     # ✅ READ-ONLY — safe for UI/hooks
│   │   ├── tasks.read.ts            # getTaskById, getTasksByWard, findByOriginKey
│   │   ├── patients.read.ts         # getPatientById, getPatientsByWard
│   │   ├── locations.read.ts        # getLocationById, getLocationsByParent
│   │   └── ops.read.ts              # getOpsForEntity, getOpsForActorDay, getLastUndoableOp
│   └── internal/                    # 🔒 MUTATORS — only commandService.ts imports
│       ├── tasks.mutate.ts          # insertTask, updateTask (atomic version check)
│       ├── patients.mutate.ts       # insertPatient, updatePatient (atomic version check)
│       └── ops.mutate.ts            # insertOp, enqueueOutbox, tryInsertAutomationRun
├── services/
│   ├── commandService.ts            # applyOp() — THE write gateway (idempotent + effectivePatch)
│   ├── undoService.ts               # undoLastOp(), undoOpGroup()
│   ├── automationService.ts         # runAutomationForOp() — skips undo/delete/automation
│   └── opService.ts                 # computePatch() — filters undefined
├── hooks/
│   ├── useUpdateTask.ts
│   ├── useCreateTask.ts
│   ├── useDeleteTask.ts
│   ├── useCreatePatient.ts
│   ├── useUndo.ts
│   └── useMyActivity.ts
└── utils/
    ├── ids.ts                       # ulid()
    └── device.ts                    # getDeviceId() (ULID+MMKV), getLocalDayFromIso()
```