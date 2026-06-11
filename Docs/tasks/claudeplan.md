# HMS Clinical Task Engine — Requirements & Implementation Plan

**Project:** Clinical Canvas / HMS Backend — Task Workflow Engine
**Date:** 2026-06-10
**Status:** Approved direction, pre-implementation
**Scope:** Evolution of `backend/dev/HMSdevmrnchange/tasks.mjs` into a `tasks/` module suite. All other backend modules (patients, notes, meds, files, documents, discharge, timeline, doctors) remain as-is, except for two small touchpoints noted in this document (timeline mapper branching, bed field on registration).

---

## 1. Background & Problem

The current backend is a single Node.js 22 Lambda (regex router, modular `mountXRoutes` pattern) over one DynamoDB single table plus a private S3 bucket for files. Patients are UID-first (stable ULID `patient_uid`) with MRN episodes that change on scheme switches (ASP → NAM → Paid), resolved via MRN pointer items.

Problems with the current task module:

1. **Stale identity model.** `tasks.mjs` still keys tasks by `PK=PATIENT#<mrn>` and treats the path param as an MRN. Every newer module (notes, meds, discharge, files) resolves UID-or-MRN via `resolveAnyPatientId` and stores under `PK=PATIENT#<uid>`. Tasks created by MRN land in a different partition than the rest of the patient's data, and the existence check fails when a UID is passed.
2. **Generic CRUD, not clinical workflow.** Types (`lab, medication, procedure, assessment, discharge`) and statuses (`open, in-progress, done, cancelled`) cannot express the junior-doctor workflow: typed clinical data capture, blockers ("waiting on lab"), senior verification, reports awaited, recurrence occurrences, escalation, handover.
3. **No change history.** Updates overwrite the task. There is no record of what happened, when, by whom — unacceptable for clinical audit and useless for sync.
4. **Not time-indexed.** The task GSI (`GSI2PK = TASK#<STATUS>#DEPT#<dept>`) answers dashboard-by-status queries but cannot answer "what changed after my last checkpoint" — time is not a leading sort key anywhere.
5. **Not agent-usable.** An AI agent cannot discover what a task type needs, cannot resolve "bed 12" or "Arun" to IDs, and has no contract for incomplete input.

The product context: junior doctors run their day from a duty list, update tasks in seconds (often by telling a local AI agent in natural language), copy clean status text to WhatsApp, and seniors need to see what changed without asking. The backend must serve **both** a fast UI and **local AI agents** (Claude Code / Cortex-class models running on-site) as first-class clients.

---

## 2. Design Posture (settled across discussion)

These are the agreed, load-bearing principles. Everything in this document follows from them.

1. **The backend is a pure tool API; judgment lives in the local AI.** The backend never calls an LLM. It exposes the world (directory), describes itself (schemas, manifest), and executes deterministically (validate → default → write → stream). Any model can drive it; no model is welded in.
2. **A task update is the core clinical event.** The task item is just the materialized current state. Every mutation writes an append-only update/event record. Nothing is ever silently overwritten or lost.
3. **Time-indexed first.** Every task mutation produces a time-ordered change event, and every important read scope (patient, assignee, doctor, and their combinations) has a checkpointable stream. Clients (UI and agents) sync incrementally: "give me everything after cursor X," and can probe "did anything change?" with a single cheap query.
4. **One write path for everyone.** The UI's Done button, a typed form submit, an agent commit, and a senior verification all flow through the same internal service (`applyTaskUpdate`). There are no AI-only side doors.
5. **Reads are pre-computed projections, never scans.** "My Duty Today" is one query on a projection partition, already bucketed and sorted.
6. **The UI is the context-delivery mechanism for agents.** Every screen's server data is exportable via a copy button in a structured, ID-complete, checkpoint-stamped agent format (HMS-CONTEXT block). The agent starts pre-grounded from pasted context and makes API calls only when necessary (small directory lookups, freshness probes, deltas, writes) — never bulk re-pulls of data the UI already had.
7. **The server generates all copy text** — both human (WhatsApp) and agent (HMS-CONTEXT) formats. The frontend never composes either.
8. **Incomplete input is a first-class case.** The user says eight words ("add CBC for bed 12, assign to Arun"); the type registry supplies clinical defaults, the directory supplies identity, and ambiguity comes back as a structured question — never a guess on identity, never a bare 400 on recoverable gaps.

---

## 3. Requirements

### 3.1 Functional — Junior doctor workflow (the product surface the API must power)

| ID | Requirement |
|----|-------------|
| F-01 | **Duty board.** A junior sees one screen, "My Duty Today," grouped into buckets: Urgent/High-Alert, Due Now, Reports Awaited, Waiting On (blocked, labelled by who), Recurring (today's occurrences), Patient-wise grouping, and Completed Today (kept visible for confident reporting). Served by one query. |
| F-02 | **Task cards with typed data.** Each task carries clinical type-specific fields (see registry, F-10). Updates capture real work: sample sent time, report value, vitals readings, medication given/missed, clearance status, discharge checklist progress, wound photo + progress status. |
| F-03 | **One-tap actions.** Start / Done / Pending / Blocked as single calls; quick actions per type (e.g. `sample_sent`, `report_received`, `given`, `log_vitals`) that expand server-side into status + data patches with auto-written summaries. Most updates take < 30 seconds; one-tap writes need no typing. |
| F-04 | **Structured blockers.** Blocked is not a comment. Enumerated reasons (`pending_from_lab, pending_from_nurse, pending_from_patient, pending_from_attender, pending_from_consultant, report_not_ready, department_not_responding, payment_or_billing_pending, sample_rejected, patient_unavailable, need_senior_decision, other`) plus `waiting_on`, `next_action`, `next_followup_at`, `escalate_to`. Powers the Waiting On view and chase/escalation. |
| F-05 | **Every update creates a patient timeline entry** so seniors see what happened without asking on WhatsApp. |
| F-06 | **Senior verification.** Tasks can require verification (by request or by type policy). Junior marks done → `needs_senior_review`; senior verifies/rejects via a role-checked endpoint; verification itself is an audited event. |
| F-07 | **Reminders.** Updates can set `next_followup_at` / create reminders; reminders are queryable by date+user ("what fires today"); clearing/setting are change events. Automatic firing via scheduler is a later add — manual/poll endpoints must work first. |
| F-08 | **Recurrence as occurrences.** A recurrence definition (e.g. "daily wound photo at 08:00 until discharge") generates one concrete task per day. Completing today's occurrence rolls over tomorrow's. Juniors see today's duty plus per-day history (done/missed), never one endless task. |
| F-09 | **Copy generation (human).** Server-generated WhatsApp text at three levels: per-task, per-patient (all updates grouped with ✅/⏳/⚠️), and full duty/handover (Completed / Pending / Blocked / Reports awaited, grouped by bed). Returned inline from update calls so "Save and copy" is one round trip. |
| F-10 | **Clinical task type registry.** Types: `investigation, report_followup, photo_upload, medication, vitals, clearance, discharge, consent, blood_arrangement, preop_checklist, postop_review, round_order, generic`. Statuses: `todo, in_progress, pending, blocked, done, cancelled`. Verification states: `not_required, needs_senior_review, verified, rejected`. Priorities: `routine, important, urgent, critical`. Each type defines: update fields (key/type/label/enum), required-fields-by-action (e.g. investigation `done` requires `reportReceived`), quick actions, whether it feeds Reports Awaited, whether a file is required (photo tasks), auto-flag rules, **clinical defaults** (priority, due offset, title template, recurrence default), **aliases/keywords** (cbc, lft, culture → investigation subtypes), and **verification policy** (e.g. `blood_arrangement`, `consent` auto-require senior review). |
| F-11 | **Alerts as structured objects**, not booleans: `alert: { level: none|watch|urgent|critical, reason, created_at, acknowledged_by, acknowledged_at }`. Vitals updates auto-evaluate against normal ranges → abnormal flags → alert + senior notification flag. Acknowledgement is itself a change event. |
| F-12 | **Mandatory task source** for audit: `source: { kind: round_order|manual|recurrence|agent|checklist|system, source_id, original_text }`. |
| F-13 | **Files at two levels.** `task.files[]` = aggregate (existing attach/detach pattern preserved); `task_update.files[]` = files belonging to that specific update, so the timeline can show "11:30 — wound photo uploaded [file]". |
| F-14 | **Bed-first identity on screens.** Bed number is a first-class field (`bed_no`, `ward`) on the registration, snapshotted onto tasks, sync rows, and projections — for juniors, bed matters more than name. Bed → patient resolution via pointer items (see D-3). |
| F-15 | **Patient mini-dashboard.** `GET /patients/:id/task-dashboard`: patient snapshot, assigned tasks, pending reports, recent updates, warnings, copy text — one call. |

### 3.2 Functional — Time-indexed change layer (sync)

| ID | Requirement |
|----|-------------|
| S-01 | **Every task mutation emits a time-indexed change event** (create, update, status change, block/unblock, done, cancel, verify/reject, file attach/detach, reminder set/clear, occurrence created, alert acknowledged). |
| S-02 | **Checkpoint = composite cursor** `<changedAt ISO ms>#<eventId>`, with event IDs as ULIDs (time-sortable, breaks same-millisecond ties). Cursors are opaque to clients; `after` is exclusive — resending a checkpoint never re-delivers. |
| S-03 | **Required query scopes, each its own keyed stream (no post-query filtering):** (1) patient; (2) assignee; (3) assignee+patient; (4) doctor+patient; (5) assignee+doctor+patient; (6) doctor-only (all the doctor's patients — included by default per discussion). |
| S-04 | **Latest-only probe:** `GET /tasks/changes/latest?<scope>` → `{ latestCursor, latestChangedAt, hasChangesAfter }` via a `Limit=1` descending query — the cheap "did anything change?" check. |
| S-05 | **Change rows embed a compact task snapshot** (title, type, priority, status, due, flags/alert, latest summary, bed/mrn) so one sync pull renders cards without N follow-up GETs. |
| S-06 | **Tasks carry latest-change fields**: `version`, `latest_change_at`, `latest_change_id`, `latest_cursor` — "Last updated 9:15 AM" with zero extra reads, and `expectedVersion` support. |
| S-07 | **Role clarity on every task and event:** `assignee_id` (who must do it), `assigned_by_id` (who created it), `doctor_id` (responsible senior — drives doctor streams), `consultant_id`. |
| S-08 | **Per-task history** is its own time-ordered key (`TASKUPDATE_BY_TASK#<taskId>#<ts>#<updId>`) — task detail page in one `begins_with` query. Patient-wide time-ordered reads come from the sync stream, not from update items. |
| S-09 | **Retention & resync.** Sync rows carry a DynamoDB TTL (default 60 days). A checkpoint older than retention returns `resyncRequired: true`; client falls back to snapshot reads + fresh checkpoint from `/changes/latest`. `TASK_UPDATE` items (system of record) are kept forever. |
| S-10 | **Unsupported scope combinations return 400 naming supported scopes** — never a silent scan or in-memory filter. |

### 3.3 Functional — Agent-first layer

| ID | Requirement |
|----|-------------|
| A-01 | **Directory endpoints (the agent's eyes).** The agent's only blind spot is identity. Small, paginated, ID-first lookups: `GET /directory/patients?department=&ward=&bed=&q=`, `GET /directory/staff?role=&q=`, `GET /directory/beds?ward=`, `GET /task-types[/:type]`. Every response pairs every name with its ID — any output is valid input for the agent's next call. `fields=minimal` mode for context-window economy. |
| A-02 | **One-shot grounding (fallback path):** `GET /agents/context?department=&userId=` → compact world snapshot (patients with IDs/beds/diagnoses/consultants/open-task counts/alert levels, staff with roles, task types with aliases+defaults) **plus starting checkpoints per scope** so the agent immediately switches to incremental sync. Used only when no UI context block was provided. Default scoping: department-wide. |
| A-03 | **Self-description:** `GET /agents/manifest` — machine-readable description of every endpoint (method, path, params, body schema per task type, which directory call grounds which field), the HMS-CONTEXT block spec, and the call-economy rules (A-06). Generated from the route table + type registry. |
| A-04 | **HMS-CONTEXT blocks (primary grounding path).** Every screen's data is exportable in an organized agent format: versioned header (`HMS-CONTEXT v1`), `kind`, `asOf`, scope **checkpoint**, every entity with ID+name, task `v`ersions, compact YAML-flavored structured text (~40% fewer tokens than JSON; strict JSON remains available from the normal API). Delivered two ways: (a) embedded in view responses via `?include=agentContext` (duty board, patient dashboard) so the UI copy button costs **zero extra API calls**; (b) standalone via `?format=agent` on all copy endpoints. |
| A-05 | **Compose = stateless dry-run completer.** `POST /tasks/compose`: partial intent in → `{ ready, completedTask, assumptions[], ambiguities[], confidence, confirmationText }` out. Pure function, no server-side draft state (the conversation is the draft). Registry defaults fill unstated fields; every inferred value is listed in `assumptions` (visible, correctable); identity gaps come back as structured `ambiguities` with candidates (e.g. two Aruns), never guesses. Commit is just the normal create/update endpoint with the completed payload. Agents may skip compose entirely and POST directly. |
| A-06 | **Call economy (encoded in the manifest):** (1) prefer pasted HMS-CONTEXT over fetching; block IDs are authoritative. (2) Before writing from a block older than ~10 min, probe `/tasks/changes/latest` with the block's checkpoint; pull the delta if stale — never re-fetch the world. (3) Allowed cold calls: directory lookups, task-types, changes. Avoid `/agents/context` unless no block exists. (4) All writes carry exact IDs + `clientMutationId` + `expectedVersion` when acting on a task seen in a block. |
| A-07 | **Agent provenance on writes:** updates/creates accept `agent: { used, confidence, original_text }`; stored on the update item and the task source for audit. |

### 3.4 Data integrity, safety, audit

| ID | Requirement |
|----|-------------|
| I-01 | **Idempotency on every write command** via `clientMutationId`. `update_id`/`event_id` derive from it; replays hit a conditional-write conflict and return the original result; **no duplicate change events** from double-taps, mobile retries, or agent resubmits. |
| I-02 | **Optimistic concurrency.** Tasks carry `version`; writers may send `expectedVersion`; mismatch → 409 with current version (tells an agent its context block is stale rather than silently last-write-wins). |
| I-03 | **Two durability tiers.** Tier 1 (one transaction, can never diverge): task state patch + TASK_UPDATE item + **master patient sync row**. Tier 2 (best-effort, rebuildable from Tier 1): scoped sync fan-outs, timeline event, duty projection, reminder projection. Tier 2 failure marks `projection_status: "stale"`. |
| I-04 | **Repair endpoints:** `POST /tasks/projections/rebuild?userId=&date=` (duty board) and `POST /tasks/sync/rebuild?patientId=&from=` (scoped streams) — replay from the master stream. |
| I-05 | **Append-only audit.** Every update stores actor (id+name), timestamp, structured data, human summary, original text, files, agent metadata. Nothing is destructively edited; deletes are soft (cancel). |
| I-06 | **Actor abstraction.** `getActor(event, body)` — body-sourced for dev only, single swap point for JWT later; business logic never reads `actorId` from the body directly. Verification endpoints check role (senior/consultant) even in dev. Acknowledged risk: Function URL currently has no auth — same posture as the rest of the backend; do not deepen the dependency. |
| I-07 | **Verification by policy, not memory.** Type registry auto-sets `requires_verification` for safety-critical types and abnormal-flagged updates — terse agent-mediated creation must not lose safety properties because nobody asked for them. |
| I-08 | **Legacy compatibility.** Old routes (`POST/GET/PATCH/DELETE /patients/:id/tasks`, `GET /tasks?department=`) keep working; legacy types map (`lab→investigation`, `procedure/assessment→generic`, others keep names); legacy statuses map (`open→todo`, `in-progress→in_progress`); UI mapper returns both new and legacy status names; one-time migration script re-keys existing MRN-partitioned tasks to UID. |

### 3.5 Non-functional

| ID | Requirement |
|----|-------------|
| N-01 | Every read path is a keyed Query — no Scans, no in-memory cross-partition filtering. |
| N-02 | Duty board, dashboards, and sync pulls are each one query (plus pagination). Update round trip returns task + update + timeline entry + copyText together. |
| N-03 | Agent payloads are compact (token-budget aware): minimal field modes, abbreviated context blocks, pagination everywhere. |
| N-04 | No new tables or GSIs for v1 — only new item key patterns in the existing table + one TTL attribute. Optional EventBridge/scheduled Lambda later for reminder firing and recurrence generation; manual endpoints work without it. |
| N-05 | Same code conventions as the existing backend: Node 22 ESM, `mountXRoutes(router, ctx)`, `resolveAnyPatientId`, snake_case storage / camelCase UI mappers, regex routes. |
| N-06 | IST (+05:30) for date bucketing (Hyderabad deployment). |

---

## 4. Use Cases

**UC-1 — Terse agent-mediated task creation (primary flow).**
User to local AI: *"Add CBC for bed 12, assign to Arun."* Agent already holds a pasted HMS-CONTEXT block from the duty screen → grounds locally (bed 12 → `01JABC…`, Arun → `jr_123`, cbc → `investigation/cbc`) → optionally `POST /tasks/compose` to fill defaults (due +2h, priority important, title template) and get `confirmationText` → shows "Bed 12 (Ravi Kumar, IP2345) · Send CBC · Arun · due 10 AM. Create?" → on yes, `POST /patients/01JABC…/tasks` with `clientMutationId` + `source: {kind: agent, original_text}`. Task appears in Arun's duty board and every relevant change stream.

**UC-2 — Ambiguous input.** Same as UC-1 but two staff named Arun. Compose returns `ready: false, ambiguities: [{field: assigneeId, question, candidates: [{id, name, role}×2]}]`. Agent asks one question, fills the answer, proceeds. No guessing on identity, ever.

**UC-3 — Natural-language task update.** Junior tells agent: *"CBC sent for bed 12 at 8:20, report pending, lab said 12 PM."* Agent maps to the open CBC task from its context block → `POST /patients/:id/tasks/:taskId/update` with `status: pending`, typed data (`sampleSent, sentTime, nextFollowupAt`), `originalText`, `expectedVersion`, `clientMutationId`, `createReminder: true`. Response includes the regenerated copyText. One write → task patched, update item appended, timeline entry, all sync streams, duty projection moved, reminder projected.

**UC-4 — One-tap from the UI.** Junior taps **Done** on a task card → `POST …/done` with `clientMutationId`. Server writes auto-summary ("CBC done 10:42 AM"). If the type's policy requires verification, status lands in `needs_senior_review` and the senior's streams carry the event.

**UC-5 — Blocked with structured reason.** Junior taps **Blocked** → reason chip `pending_from_lab`, next action "follow tomorrow 10 AM", escalate to PG → `POST …/block`. Task appears in Waiting On bucket labelled "Lab," reminder created, PG's doctor-scoped stream gets the event.

**UC-6 — Senior catches up via checkpoint.** PG opens app at 2 PM, last checkpoint from 9 AM → `GET /tasks/changes?doctorId=pg_456&after=<ckpt>` → every event across their patients since morning, each with embedded task snapshot — rendered without per-task fetches. Stores `nextCheckpoint`.

**UC-7 — "Anything new?" poll.** UI/agent polls `GET /tasks/changes/latest?assigneeId=jr_123` every minute. `hasChangesAfter: false` → done, one cheap query. Otherwise pull the delta from the stored checkpoint.

**UC-8 — Copy to WhatsApp.** End of shift: junior taps "Copy duty update" → UI already holds the server-generated handover (Completed/Pending/Blocked/Reports awaited by bed) from the duty response → pastes to WhatsApp. Zero composition in the frontend.

**UC-9 — Copy to agent (UI as context source).** Junior taps the agent-copy button on the patient dashboard → clipboard gets the HMS-CONTEXT v1 block (IDs, versions, checkpoint) that came embedded in the dashboard response → pastes into local AI → "push the biopsy follow-up to tomorrow 4 pm and remind me" → agent writes directly with exact IDs, probing freshness only if the block is old. No duplicate world-fetch calls.

**UC-10 — Senior verification.** Junior marks "Blood reserve arranged" done → auto `needs_senior_review` (type policy) → PG sees it in stream/duty → `POST …/verify {verified: true}` (role-checked) → verification event in all streams; task card shows "Verified by Priya 1:05 PM."

**UC-11 — Recurring wound photo.** Definition: daily 08:00 until discharge. Each morning's run (manual endpoint now, scheduler later) creates today's occurrence task. Junior uploads photo (presign → attach → update with `progressStatus`) → occurrence done → tomorrow's occurrence created on roll-over; missed days visible in history.

**UC-12 — Vitals auto-flag.** Junior logs vitals via the mini-grid quick action → server evaluates ranges → SpO2 91% → `abnormal` + `alert: {level: urgent, reason: "SpO2 91%"}` + `needs_senior_review`, event fans out to senior streams. Acknowledgement by the senior is its own audited event.

**UC-13 — Duplicate tap / retry storm.** Junior double-taps Done on a flaky network; client retries with the same `clientMutationId` → exactly one update item, one change event per stream; replays return the original result.

**UC-14 — Stale-screen conflict.** Junior A marks blocked from a screen loaded at 9 AM (`expectedVersion: 5`); meanwhile junior B already updated (version 7) → 409 with current version + latest state → client/agent refreshes and re-applies intentionally. No silent lost update.

**UC-15 — Projection drift repair.** Duty write fails after the Tier-1 transaction → task flagged `projection_status: stale` → `POST /tasks/projections/rebuild?userId=&date=` replays from the master stream → board consistent.

**UC-16 — Offline client resync.** Mobile client returns after 90 days; checkpoint exceeds 60-day sync TTL → `resyncRequired: true` → client snapshot-reads current tasks, takes a fresh checkpoint from `/changes/latest`, resumes incremental sync.

**UC-17 — Cold-start agent (no block pasted).** User opens a bare agent session: *"what's pending for my patients?"* → agent has nothing pasted → `GET /agents/context?userId=…` (fallback grounding) → answers from snapshot, then stays current via checkpoints.

---

## 5. Architecture Decisions (one-way doors — options considered & rationale)

| # | Decision | Options considered | Chosen & why |
|---|----------|--------------------|--------------|
| D-1 | Where intelligence lives | (a) deterministic parser in backend; (b) backend calls an LLM; (c) backend = deterministic tool layer, LLM outside | **(c).** (a) can't handle clinical speech; (b) welds one model in, non-deterministic API, PHI through an extra hop. (c) keeps the API model-agnostic and improves it for humans too. |
| D-2 | Draft state | server-side drafts w/ TTL vs stateless compose | **Stateless.** The conversation is the draft; audit lives on the task/update (original_text, assumptions). Drafts can be added later; removing them later is the painful direction. |
| D-3 | Bed → patient | (a) scan/filter; (b) search duty projections; (c) bed pointer items (`PK=BED#<ward>#<bed>`), same pattern as MRN pointers | **(c).** (a) dead end; (b) fails on the *first* task for a patient — exactly the create case. Bed occupancy is identity-critical; guessing is a patient-safety bug. Requires Phase 0 (bed on REG, pointer writes, `PATCH /patients/:id/bed`); self-builds during transition via compose ambiguity ("bed 12 not mapped — give MRN once, bind it"). |
| D-4 | Assignee resolution | exact-ID only vs name lookup with candidates | Name lookup via doctors module; collisions return candidates as structured ambiguity. Optional `DUTY_ROSTER#DATE#<date>` item shape reserved now (cheap) for future "junior on call" resolution. |
| D-5 | Key schemas (irreversible) | — | Locked: TASKSYNC streams (master + 5 scoped incl. doctor-only), `CHG#<iso>#<ulid>` SKs, opaque exclusive cursors, `TASKUPDATE_BY_TASK#…`, duty/reminder projections, bed pointers, ULIDs everywhere, embedded snapshots in sync rows, 60-day sync TTL. |
| D-6 | Defaults: code vs data | hardcoded; pure DB config; hybrid | **Registry in code shaped as data + optional `CONFIG#TASK_DEFAULTS` DynamoDB overlay** merged at read. Ward-level tuning without redeploys, no day-one overengineering. All inferred values surfaced as `assumptions`. |
| D-7 | Verification policy | per-request flag vs registry-owned | **Registry-owned** (plus per-request opt-in). Terse input means nobody asks for it; safety must not depend on memory. |
| D-8 | Sync write durability | all-transactional fan-out vs two tiers | **Two tiers.** Full transaction ≈ 10 writes per mutation — cost + coupling. Master stream inside the Tier-1 transaction guarantees no event is ever lost; everything else is derivable + rebuildable (I-04). |
| D-9 | Agent grounding source | API-first (`/agents/context` opening move) vs **UI-first (HMS-CONTEXT copy)** | **UI-first.** The user is already looking at server truth; copying it costs zero API calls and avoids slow bulk pulls. `/agents/context` demoted to fallback. |
| D-10 | Context block format | strict JSON vs YAML-flavored structured text | **YAML-flavored** (~40% fewer tokens, friendlier to small local models, trivially parseable, versioned header). Strict JSON always available from normal endpoints. |
| D-11 | Doctor-only stream | omit vs include | **Include now.** Primary senior read ("everything across my patients"); unbackfillable later. |
| D-12 | Checkpoint semantics | timestamp-only vs composite cursor | **Composite `<iso>#<ulid>`**, exclusive. Timestamps collide within a millisecond; ULIDs break ties deterministically. |

---

## 6. Data Model (new/changed items, existing single table)

| Item | PK | SK | Notes |
|------|----|----|-------|
| Task (current state) | `PATIENT#<uid>` | `TASK#<taskId>` | UID-first. Denormalized `patient_snapshot` (bed, mrn, name, dx, consultant, state); `assignee_id/assigned_by_id/doctor_id/consultant_id`; `version`, `latest_cursor/_at/_id`; `clinical_data`, `latest_update`, `flags`, `alert`, `blocker`, `verify_status`, `source` (mandatory), `recurrence_id?`, `files[]`, `reminders[]`, `duty_sk`, `projection_status`; legacy GSI2 keys preserved. |
| Task update (append-only) | `PATIENT#<uid>` | `TASKUPDATE_BY_TASK#<taskId>#<changedAt>#<updId>` | System of record: `status_after`, `structured_data`, `human_summary`, `original_text`, `files[]` (update-level), actor id+name, `agent{used, confidence}`, `client_mutation_id`. Kept forever. |
| Sync — master | `TASKSYNC#PATIENT#<uid>` | `CHG#<at>#<eventId>` | In the Tier-1 transaction. Carries change metadata + compact `task_snapshot` + `cursor`. TTL 60d. |
| Sync — scoped ×5 | `TASKSYNC#ASSIGNEE#<a>` · `TASKSYNC#ASSIGNEE#<a>#PATIENT#<p>` · `TASKSYNC#DOCTOR#<d>` · `TASKSYNC#DOCTOR#<d>#PATIENT#<p>` · `TASKSYNC#ASSIGNEE#<a>#DOCTOR#<d>#PATIENT#<p>` | `CHG#<at>#<eventId>` | Tier-2 fan-out, rebuildable, TTL 60d. |
| Timeline event | `PATIENT#<uid>` | `TL#<at>#TASK#<taskId>#<updId>` | `kind: task_update`; `timeline.mjs` mapper branches by kind (existing stage rows = `state_transition`). |
| Duty projection | `DUTY#USER#<userId>#DATE#<yyyy-mm-dd>` | `BUCKET#<n>-<NAME>#DUE#<dueAt>#TASK#<id>` | Buckets: 1-URGENT, 2-DUE, 3-REPORTS, 4-WAITING, 5-RECURRING, 6-DONE. One query = whole board. |
| Reminder projection | `REMINDER#DATE#<date>` | `TIME#<hh:mm>#USER#<id>#TASK#<id>` | Escalation metadata; set/clear emit change events. |
| Recurrence definition | `PATIENT#<uid>` | `TASKRECURRENCE#<recId>` | frequency, time_of_day, until_event/date, assignee, active. Occurrences are normal TASK items (`recurrence_id`, `occurrence_date`). |
| Bed pointer (Phase 0) | `BED#<ward>#<bedNo>` | `BED` | `{patient_uid, mrn, occupied_since}`; written on admission/transfer/`PATCH /patients/:id/bed`, cleared on discharge. |
| Idempotency record | inside TASK_UPDATE (`client_mutation_id`) + conditional writes | — | Replay returns original result; no second event. |
| Config overlay (optional) | `CONFIG#TASK_DEFAULTS` | `<scope>` | Ward/department default overrides merged over the code registry. |

---

## 7. API Surface (complete)

```
# Discovery & self-description
GET  /task-types                GET  /task-types/:type
GET  /agents/manifest           GET  /agents/context?department=&userId=   # fallback grounding

# Directory (the agent's eyes — small, paginated, ID-first)
GET  /directory/patients?department=&ward=&bed=&q=&fields=
GET  /directory/staff?role=&q=
GET  /directory/beds?ward=

# Beds (Phase 0)
PATCH /patients/:id/bed

# Tasks (UID or MRN in :id; legacy routes preserved)
POST   /patients/:id/tasks
GET    /patients/:id/tasks?status=&type=&limit=
GET    /patients/:id/tasks/:taskId?updates=1
PATCH  /patients/:id/tasks/:taskId            # metadata only
DELETE /patients/:id/tasks/:taskId            # soft cancel
POST   /patients/:id/tasks/:taskId/files/attach | /files/detach
GET    /tasks?department=&status=&assigneeId=  # legacy GSI dashboard

# The core clinical event
POST /patients/:id/tasks/:taskId/update
POST /patients/:id/tasks/:taskId/start | /done | /pending | /block
POST /patients/:id/tasks/:taskId/verify        # role-checked
POST /patients/:id/tasks/:taskId/alerts/ack

# Compose (stateless dry-run)
POST /tasks/compose             POST /tasks/resolve   # thin convenience

# Change streams (checkpointable; scope by params; unsupported combos → 400)
GET /tasks/changes?patientId=&after=&limit=
GET /tasks/changes?assigneeId=[&patientId=]&after=
GET /tasks/changes?doctorId=[&patientId=]&after=
GET /tasks/changes?assigneeId=&doctorId=&patientId=&after=
GET /tasks/changes/latest?<same scope params>
GET /patients/:id/tasks/changes?after=         # alias
GET /assignees/:id/tasks/changes?after=        # alias

# Views (duty board & dashboard; ?include=agentContext embeds the HMS-CONTEXT block)
GET /me/duty?userId=&date=[&include=agentContext]
GET /patients/:id/task-dashboard[?include=agentContext]

# Copy (server-generated; format=human|agent)
GET /patients/:id/tasks/:taskId/copy?format=
GET /patients/:id/copy-update?format=
GET /me/duty/copy?userId=&date=&format=

# Reminders & recurrence
GET  /reminders?date=&userId=
POST /patients/:id/tasks/:taskId/reminders
POST /patients/:id/tasks/:taskId/reminders/:reminderId/clear
POST /patients/:id/tasks/recurrences
GET  /patients/:id/tasks/recurrences
POST /tasks/recurrences/run?date=

# Repair
POST /tasks/projections/rebuild?userId=&date=
POST /tasks/sync/rebuild?patientId=&from=
```

**Change-stream response contract:**

```js
{ scope, checkpointUsed, nextCheckpoint, hasMore, resyncRequired,
  items: [{ eventId, cursor, changedAt, changeType, taskId, patientId,
            assigneeId, doctorId, version, statusAfter, summary, taskSnapshot }] }
```

**Write-command envelope (all mutations):** `clientMutationId` (required), `expectedVersion` (recommended when acting on seen state), `actor` (dev: body; later: JWT — single swap point), optional `agent{used, confidence, original_text}`.

---

## 8. Implementation Plan

Module layout (replaces `tasks.mjs`; `router.mjs` changes one import line):

```
HMSdevmrnchange/tasks/
  index.mjs            task_types.mjs       task_mapper.mjs      task_store.mjs
  task_crud.mjs        task_updates.mjs     task_events.mjs      task_sync.mjs
  task_alerts.mjs      task_projection.mjs  task_views.mjs       task_copy.mjs
  task_compose.mjs     task_directory.mjs   task_recurrence.mjs  task_reminders.mjs
  task_agents.mjs      (manifest + context fallback)
```

### Phase 0 — Bed infrastructure (small; everything snapshots beds)
`bed_no`/`ward` on REG + UI mapper · bed pointer writes on admission/transfer · `PATCH /patients/:id/bed` · `GET /directory/beds`.
**Accept:** bed→patient resolves via one Get; transfers move the pointer; discharge clears it.

### Phase 1 — Task engine + change streams + agent contract (the big one)
`task_types` (registry: fields, required-by-action, quick actions, defaults, aliases, verification policy, blocker reasons, config overlay) · `task_mapper` (legacy compat) · `task_store` (**`createTask`/`applyTaskUpdate` — the single write path**: validate → defaults → alerts → summary → Tier-1 transaction [task+version ∥ update item ∥ master sync row] → Tier-2 fan-out → return `{task, update, timelineEntry, copyText}`) · `task_events` · `task_sync` (streams, cursors, `/changes`, `/changes/latest`, rebuild) · `task_crud` · `task_updates` (typed update, one-taps, block, verify, ack) · `task_copy` (human + agent task-level) · `task_directory` · `/task-types` discovery · `/agents/manifest` · timeline mapper branching in `timeline.mjs` · migration script (MRN→UID re-key) outline.
**Accept:** UC-1..6, 10, 12, 13, 14 pass; idempotent replays produce one event; 409 on version conflict; checkpoint pagination never re-delivers; legacy routes still serve.

### Phase 2 — Duty board & dashboards
`task_projection` (buckets, `duty_sk` movement) · `task_views` (`/me/duty`, `/patients/:id/task-dashboard`, `include=agentContext`) · `POST /tasks/projections/rebuild`.
**Accept:** UC-7 (board path), UC-15; board = one query; stale flag + rebuild works.

### Phase 3 — Patient & duty copy (human + agent formats)
`/patients/:id/copy-update`, `/me/duty/copy`, `format=agent` everywhere; HMS-CONTEXT v1 spec finalized in manifest.
**Accept:** UC-8, UC-9; agent block round-trips (paste → agent writes with exact IDs + expectedVersion).

### Phase 4 — Reminders
`task_reminders`: set/clear endpoints + date-keyed projection + change events + `GET /reminders`.
**Accept:** UC-3 reminder leg, UC-5 chase reminder; reminders queryable by date+user.

### Phase 5 — Recurrence
`task_recurrence`: definitions, `run?date=`, roll-over on completion (`occurrence_created` events), per-day history.
**Accept:** UC-11; double `run` is idempotent.

### Phase 6 — Agent conveniences
`task_compose` (+ `/tasks/resolve`), `/agents/context` fallback grounding with starting checkpoints.
**Accept:** UC-1 (compose leg), UC-2, UC-17.

**Out of scope for v1:** real push notifications (WhatsApp copy is the delivery mechanism), automatic scheduler (EventBridge added later; manual endpoints suffice), JWT auth (abstraction in place, enforcement later), LLM-anything server-side.

### Defaults locked unless overridden
Doctor-only stream: **in** · Sync TTL: **60 days** · Compose: **stateless** · Context blocks: **YAML-flavored, v1** · `/agents/context` scope: **department-wide** · Timezone: **IST** · Recurrence/reminder firing: **manual endpoints first**.