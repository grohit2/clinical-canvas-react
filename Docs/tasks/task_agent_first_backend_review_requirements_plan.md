# Task-Based Clinical Workflow API — Review, Requirements, Use Cases, and Implementation Plan

**Project context:** HMS / Clinical Canvas backend expansion
**Focus:** Junior-doctor task workflow, AI-agent-first API, UI-first approval, checkpoint sync, and server-generated context/copy formats
**Date:** 2026-06-10

---

## 0. Executive Summary

We are expanding the current backend from a generic task CRUD module into a **clinical task workflow engine**.

The goal is not just to store tasks. The goal is to support the real junior-doctor workflow:

> “What should I do now, for which patient, what information should I update, and who needs to know?”

The architecture we settled on is:

```txt
UI shows current server truth
  ↓
UI can copy structured agent context with IDs + checkpoints
  ↓
Local AI reads that context and decides what to do
  ↓
AI creates a backend proposal, not a direct mutation
  ↓
UI / AI shows the proposal to the user for approval
  ↓
User edits or approves
  ↓
Backend commits the approved proposal through one shared task write path
  ↓
Task, audit event, timeline, duty board, sync streams, copy text are updated
```

Key decisions:

1. **Backend is a deterministic tool API.** The local AI does the judgment and interpretation. The backend exposes the world, validates payloads, creates proposals, commits approved changes, and writes audit/sync projections.
2. **UI is the primary context-delivery mechanism.** The user is already looking at a patient or duty screen. A copy button should export that exact screen state in a structured `HMS-CONTEXT` format with IDs, task versions, and checkpoints. This avoids unnecessary AI calls to fetch large amounts of data.
3. **AI never directly mutates clinical task state by default.** It creates a proposal. The proposal is shown to the user. The user can edit and approve. Only approved proposals are committed.
4. **Every task mutation creates a time-indexed change event.** This supports checkpoint-based incremental sync by patient, assignee, doctor, and combinations.
5. **The task update is the core clinical event.** The task stores current state. Append-only update/change rows store what happened.
6. **UID-first storage is mandatory.** Routes may accept UID or MRN, but task storage must use `PK=PATIENT#<uid>`.
7. **Server generates both human copy and agent copy.** Human copy is for WhatsApp/status updates. Agent copy is for local AI context.

---

## 1. Review of the Current Backend and Claude’s Plan

### 1.1 What the current backend already has

The current backend already has a strong modular base:

```txt
HMSdevmrnchange/
  patients.mjs
  doctors.mjs
  notes.mjs
  meds.mjs
  tasks.mjs
  timeline.mjs
  files.mjs
  documents.mjs
  discharge.mjs
  router.mjs
  ids.mjs
```

Important existing strengths:

- `router.mjs` mounts feature modules cleanly through `mountXRoutes(router, ctx)`.
- `ids.mjs` resolves either patient UID or MRN through `resolveAnyPatientId`.
- `patients.mjs` is already UID-first for patient identity.
- `notes.mjs`, `meds.mjs`, `documents.mjs`, and `files.mjs` already use UID-first patient storage and S3 paths.
- `doctors.mjs` stores doctors/staff as `USER#<userId>` profiles.
- `files.mjs` supports direct S3 upload/download through presigned URLs.
- `documents.mjs` stores structured document categories.
- `timeline.mjs` reads patient timeline rows under `PK=PATIENT#<uid>`.

### 1.2 Main problem with the current task module

The current `tasks.mjs` is still too generic and MRN-first.

Current task storage pattern:

```js
PK: `PATIENT#${mrn}`
SK: `TASK#${taskId}`
```

Current task types are generic:

```txt
lab
medication
procedure
assessment
discharge
```

Current statuses are generic:

```txt
open
in-progress
done
cancelled
```

This is not enough for the target clinical workflow because junior doctors need structured task types such as investigation follow-up, wound photo upload, medication confirmation, vitals logging, discharge preparation, PAC clearance, consent, blood arrangement, and recurring daily duties.

### 1.3 Review of Claude’s initial plan

Claude’s plan was directionally strong. It correctly proposed:

- Converting tasks from CRUD into a clinical workflow engine.
- UID-first task storage.
- A task type registry.
- Append-only `TASK_UPDATE` records.
- Timeline events for every task update.
- Duty-board projections for “My Duty Today.”
- Backend-generated copy text.
- AI draft → confirm → commit flow.
- One shared write path for UI and AI.

### 1.4 Required corrections we added

We added several important corrections:

1. **Idempotency on every write.**
   Every write accepts `clientMutationId` so double-taps or network retries do not create duplicate clinical events.

2. **Optimistic concurrency.**
   Every task has `version`. Writes that modify an existing task should send `expectedVersion` to prevent stale overwrites.

3. **Checkpointable time-indexed sync.**
   Every mutation emits `TASKSYNC` rows that can be queried after a checkpoint.

4. **Doctor-only sync stream.**
   Add `TASKSYNC#DOCTOR#<doctorId>` now, because seniors/PGs will need “everything under me across patients.”

5. **Proposal approval layer.**
   AI should not directly mutate clinical state. It should create proposals that can be edited and approved by the user.

6. **UI-first context copy.**
   The user will often already be looking at the right screen. The UI should copy a structured agent context block from the server, so AI starts pre-grounded and avoids unnecessary API calls.

7. **Agent API is a tool API, not the decision-maker.**
   The local AI performs interpretation, entity matching, and decision-making. Backend exposes context, manifests, schemas, proposals, and write tools.

---

## 2. Core Product Requirement

For a junior doctor, the app should answer:

> “What should I do now, for which patient, what information should I update, and who needs to know?”

The junior should feel like they are using a simple duty sheet, not a complex hospital system.

The backend must support:

- Fast task discovery.
- One-tap updates.
- Typed clinical data capture.
- Evidence upload.
- Blockers and follow-up reminders.
- Senior review/verification.
- Patient timeline.
- WhatsApp-ready copy.
- AI-assisted proposals.
- Incremental sync.
- Audit trail.

---

## 3. Requirements

### 3.1 Junior Doctor Home Screen Requirements

The first screen should be:

```txt
My Duty Today
```

It should group tasks by real clinical workflow:

1. **Urgent / High Alert**
   - Patient deterioration review.
   - Abnormal lab value update.
   - Blood reserve pending before OT.
   - Consent pending before surgery.

2. **Due Now**
   - Send CBC sample by 8 AM.
   - Collect PAC clearance by 10 AM.
   - Upload wound photo before rounds.

3. **Patient-wise Tasks**
   - Group tasks under each patient with bed number, IP/MRN, diagnosis, consultant.

4. **Recurring Tasks**
   - Daily wound photo.
   - Daily CBC follow-up.
   - Vitals every 6 hours.
   - Report follow-up until received.

5. **Completed Today**
   - Completed tasks remain visible so the junior can report confidently.

6. **Waiting On / Blocked**
   - Pending from lab.
   - Pending from nurse/sister.
   - Pending from patient/attender.
   - Pending from consultant.
   - Department not responding.
   - Payment/billing pending.
   - Sample rejected.
   - Need senior decision.

7. **Reports Awaited**
   - CBC report pending.
   - Culture pending.
   - Biopsy pending.
   - CXR report pending.

### 3.2 Task Card Requirements

Each task card should show:

```txt
Patient: Bed 12 / IP2345
Task: Collect biopsy report
Priority: Important
Due: Today 4 PM
Assigned by: Second-year doctor
Status: Pending
Last update: Lab said report tomorrow 4 PM
```

Primary inline actions:

```txt
Start
Mark Done
Pending
Blocked
Add Update
Upload File / Photo
Set Reminder
Copy Status
```

Most updates should happen directly from the card or an inline expanded state, not through many screens.

### 3.3 Typed Task Update Requirements

Different task types require different structured data.

#### Investigation Task

Example:

```txt
Send CBC and update report.
```

Fields:

- Sample sent? yes/no
- Sent time
- Report received? yes/no
- Report value
- Abnormal? yes/no
- Report file/photo/PDF
- Comment
- Next follow-up time

#### Report Follow-up Task

Fields:

- Report status: pending / received / delayed
- Expected date/time
- Lab/contact comment
- Upload report if received
- Need senior review? yes/no
- Reminder required? yes/no

#### Photo Upload Task

Fields:

- Photo upload
- Body site/wound location
- Comment
- Progress: improved / same / worse
- Pain/discharge/swelling present?
- Need senior review? yes/no

#### Medication Task

Fields:

- Medicine name
- Dose
- Route
- Time given
- Given / missed / delayed
- Reason if missed
- Nurse informed? yes/no
- Comment

#### Vitals Task

Fields:

- Temperature
- Pulse
- BP
- Respiratory rate
- SpO2
- RBS if needed
- Pain score
- Abnormal flag
- Comment

Vitals should support automatic abnormal flagging.

#### Clearance / Approval Task

Fields:

- Clearance status: pending / done / not fit / needs review
- Department contacted
- Doctor contacted
- Reason pending
- Document upload
- Next action
- Reminder

#### Discharge Task

Fields:

- Summary started? yes/no
- Diagnosis entered
- Procedure entered
- Course of stay entered
- Discharge medicines entered
- Follow-up advice entered
- Consultant approval pending/done
- PDF generated? yes/no

### 3.4 Timeline Requirements

Every task mutation should create a timeline entry.

Examples:

```txt
10:15 AM — Arun updated biopsy task
Status: Pending
Comment: Lab said report tomorrow 4 PM
Reminder: Tomorrow 4 PM
```

```txt
11:30 AM — Arun uploaded wound photo
Comment: Wound healthy, no discharge
```

Timeline must support multiple kinds:

```txt
state_transition
task_update
```

The timeline mapper should branch by `kind` so task updates do not break existing stage transition rows.

### 3.5 Patient Mini Dashboard Requirements

When the junior opens a patient, the screen should show:

- Patient name
- Bed number
- IP/MRN
- Diagnosis
- Consultant
- Current stage: pre-op / post-op / discharge pending
- Assigned tasks
- Pending reports
- Uploaded files
- Recent updates
- Important warnings
- Human copy button
- Agent context copy button

The junior should be able to update:

- Task status
- Investigation status
- Report values
- Photos
- Medication given/missed
- Vitals
- Notes
- Blockers
- Next reminder

### 3.6 WhatsApp Copy Requirements

Backend should generate WhatsApp copy. Frontend should not compose it manually.

Required formats:

1. Task-level copy.
2. Patient-level copy.
3. Daily duty copy.

Example task-level copy:

```txt
Bed 12 / IP2345
Task: CBC report
Status: Sample sent
Update: Sample sent at 8:20 AM. Report pending. Lab said report by 12 PM.
Next reminder: 12 PM.
```

Example patient-level copy:

```txt
Bed 12 / IP2345
Diagnosis: Appendicular abscess

Updates:
✅ CBC sample sent, report pending
✅ Wound photo uploaded
⏳ Biopsy report pending, expected tomorrow 4 PM
⚠️ Discharge summary medicines pending confirmation
```

Example daily duty copy:

```txt
Junior duty update:

Completed:
✅ Bed 12 - CBC sample sent
✅ Bed 8 - Wound photo uploaded
✅ Bed 5 - PAC form submitted

Pending:
⏳ Bed 15 - Culture report pending
⏳ Bed 9 - CXR report not ready

Blocked:
⚠️ Bed 6 - Consent pending from attender
```

### 3.7 Agent Context Copy Requirements

In addition to human WhatsApp copy, every major screen should support **agent copy**.

The user will often not ask the agent from scratch. They will:

1. Open the UI.
2. Look at patient/duty/task data.
3. Press copy agent context.
4. Paste/send that organized context to the local AI.
5. The AI acts using IDs and checkpoints from that copied context.

This avoids unnecessary calls such as loading all patients or all tasks.

Server should generate the context block. The frontend should not compose it.

The context block should include:

- Format version.
- Screen kind.
- `asOf` timestamp.
- Scope checkpoint.
- Patient IDs and MRNs.
- Bed number.
- Doctor/consultant IDs.
- Staff IDs.
- Task IDs.
- Task versions.
- Latest task cursors.
- Compact task summaries.
- Allowed next actions if useful.

Example:

```yaml
=== HMS-CONTEXT v1 ===
kind: patient_dashboard
asOf: 2026-06-10T10:42:11+05:30
checkpoint: 2026-06-10T10:41:58.120Z#01JXX9
scope: patient:01JABC

patient:
  id: 01JABC
  mrn: IP2345
  bed: S1-12
  name: Ravi Kumar
  dx: Appendicular abscess
  state: post-op
  consultant: { id: dr_x, name: Dr. X }
  doctor: { id: pg_456, name: Priya }

tasks:
  - id: task_01J
    type: investigation/cbc
    status: pending
    due: 12:00
    assignee: { id: jr_123, name: Arun }
    version: 8
    last: Sample sent 8:20 AM, report pending

staff_seen:
  - { id: jr_123, name: Arun, role: junior_doctor }
  - { id: pg_456, name: Priya, role: resident }
=== END ===
```

### 3.8 Local AI / Agent-First Requirements

The backend should be an agent-friendly tool API, but it should not be responsible for all reasoning.

The local AI will:

- Read copied UI context.
- Understand user instruction.
- Resolve entities if already present in context.
- Make small targeted calls only if needed.
- Create a proposal.
- Ask user for approval using the proposal preview.
- Commit only after approval.

The backend will:

- Expose directory/context endpoints.
- Expose a machine-readable manifest.
- Expose task type schemas and defaults.
- Validate IDs.
- Fill safe defaults.
- Generate proposal diffs and previews.
- Store proposal state.
- Commit approved proposals idempotently.
- Emit audit/change events.

Important rule:

```txt
AI may propose.
User must approve.
Backend commits.
```

### 3.9 Proposal and Approval Requirements

Every AI-assisted mutation should have an intermediate proposal state.

The proposal must show:

- What will be created or changed.
- Before values.
- After values.
- Assumptions.
- Warnings.
- Missing required fields.
- Ambiguities.
- Editable fields.
- Confirmation text.

The UI can render a custom editor from this structure.

The AI can repurpose the same proposal into a human-readable yes/no confirmation.

Only approved proposals are committed.

### 3.10 Incremental Sync Requirements

The system should support:

- Fetch all records by patient.
- Fetch all tasks/changes by assignee.
- Fetch tasks/changes by assignee + patient.
- Fetch tasks/changes by doctor.
- Fetch tasks/changes by doctor + patient.
- Fetch tasks/changes by assignee + doctor + patient.
- Fetch only changes after a checkpoint.
- Quickly check whether anything changed after a checkpoint.

This requires time-indexed change streams.

### 3.11 Safety and Accountability Requirements

Every clinical mutation should store:

- Who proposed it.
- Original text or UI source.
- What assumptions were made.
- Who approved it.
- When it was approved.
- What final values were committed.
- Who updated it.
- When it was updated.
- What changed.
- Uploaded file/photo evidence.
- Whether senior review/verification is needed.
- Whether the update produced an alert.

High-priority or clinically important tasks may require senior verification.

### 3.12 Performance Requirements

- “My Duty Today” should be a single fast query from projections.
- UI context copy should require zero extra calls when included in the view response.
- AI should prefer copied context over cold API calls.
- Incremental sync should use checkpoint streams instead of re-fetching the world.
- Directory calls should be compact and paginated.

---

## 4. Use Cases

### Use Case 1 — Junior Opens My Duty Today

**Actor:** Junior doctor
**Goal:** Know what to do now.

Flow:

1. Junior opens app.
2. UI calls `/me/duty?userId=jr_123&date=2026-06-10`.
3. Backend returns duty sections:
   - Urgent / High Alert
   - Due Now
   - Patient-wise
   - Waiting On
   - Reports Awaited
   - Recurring
   - Completed Today
4. UI renders compact task cards.
5. If requested, response includes `agentContext` for the duty screen.

### Use Case 2 — Junior Updates CBC Task

Instruction:

```txt
CBC sent for Bed 12 at 8:20, report pending.
```

Flow:

1. UI or AI creates a proposal/update.
2. Backend validates against `investigation` task schema.
3. Backend previews:
   - Sample sent: yes
   - Sent time: 8:20 AM
   - Report received: no
   - Status: pending
4. User approves.
5. Backend commits through `applyTaskUpdate`.
6. It writes:
   - Task current state.
   - Task update event.
   - Timeline event.
   - TASKSYNC rows.
   - Duty projection update.
   - Reminder if needed.
7. Backend returns copy text.

### Use Case 3 — User Adds a Task From UI With AI Help

User is on patient dashboard and copies agent context.

User tells AI:

```txt
Add CBC task and assign it to Arun.
```

Flow:

1. AI uses pasted `HMS-CONTEXT` to resolve:
   - Patient: Bed 12 → `patient_uid=01J...`
   - Arun → `assignee_id=jr_123`
   - CBC → `type=investigation`, `subtype=cbc`
2. AI calls `POST /tasks/proposals` with exact IDs.
3. Backend fills defaults:
   - Title: Send CBC and update report
   - Priority: important
   - Status: todo
   - Due time based on defaults
4. Backend returns proposal preview.
5. AI asks user:
   - “I will create a CBC task for Bed 12 / IP2345 assigned to Arun, due today 10 AM. Approve?”
6. User says yes.
7. AI calls proposal commit.
8. Backend creates task and emits sync/timeline/duty events.

### Use Case 4 — UI Proposal Editor

Flow:

1. User types quick-add in UI.
2. UI calls `POST /tasks/proposals`.
3. Backend returns editable proposal.
4. UI shows fields:
   - Task title
   - Assignee
   - Priority
   - Due time
   - Doctor/senior
5. User changes due time from 10 AM to 12 PM.
6. UI calls `PATCH /tasks/proposals/:id`.
7. Backend revalidates and increments proposal version.
8. User clicks Approve.
9. UI calls `POST /tasks/proposals/:id/commit`.

### Use Case 5 — Blocked Task

Task:

```txt
Culture report follow-up.
```

Junior marks blocked:

```txt
Lab says sample not processed yet. Follow tomorrow 10 AM.
```

Backend stores:

```js
status: "blocked"
waiting_on: "lab"
blocker: {
  reason: "report_not_ready",
  comment: "Lab says sample not processed yet",
  next_action: "Follow tomorrow 10 AM",
  next_followup_at: "2026-06-11T10:00:00+05:30",
  escalate_to: "pg_456"
}
```

Task appears under Waiting On.

### Use Case 6 — Senior Verifies High-Risk Task

Task:

```txt
Blood reserve arranged before OT.
```

Flow:

1. Junior marks done.
2. Task has `requires_verification=true`.
3. Task status becomes done, but `verify_status=needs_senior_review`.
4. Senior reviews and calls `/verify`.
5. Backend writes verification update and timeline event.

### Use Case 7 — Photo Upload Task

Task:

```txt
Upload daily wound photo.
```

Flow:

1. User uploads photo through S3 presigned upload.
2. User attaches file in task update.
3. Backend stores file at both:
   - `task.files` aggregate.
   - `task_update.files` specific to this update.
4. Timeline shows exactly which photo belongs to which update.

### Use Case 8 — Vitals Alert

Task:

```txt
Update vitals every 6 hours.
```

Junior enters:

```txt
SpO2 91%, RR 24.
```

Backend:

1. Applies vitals alert rules.
2. Sets `alert.level=urgent` or `critical`.
3. Marks `needs_senior_review` if required.
4. Emits high-alert change.
5. Duty board shows this under Urgent / High Alert.

### Use Case 9 — Agent Uses Pasted Context and Avoids API Calls

Flow:

1. User copies patient agent context from UI.
2. User gives instruction to local AI.
3. AI resolves IDs from pasted context.
4. AI only calls proposal endpoint.
5. Before write, if context is stale, AI checks `/tasks/changes/latest` with checkpoint.
6. If no changes, AI proceeds.
7. If changes exist, AI pulls deltas only.

### Use Case 10 — Stale Proposal Conflict

Flow:

1. UI loads task version 8.
2. AI creates proposal based on version 8.
3. Another user updates task to version 9.
4. User approves old proposal.
5. Commit sends `expectedVersion=8`.
6. Backend returns 409 conflict with current version/task.
7. UI/AI must refresh and create/patch proposal again.

### Use Case 11 — Incremental Sync by Doctor

Senior doctor opens dashboard.

Flow:

1. UI stores latest checkpoint for `doctor:pg_456`.
2. Later calls:

```txt
GET /tasks/changes?doctorId=pg_456&after=<checkpoint>
```

3. Backend returns only changed task events.
4. UI updates screen without full reload.

### Use Case 12 — Recurring Task Occurrence

Task:

```txt
Daily wound photo until discharge.
```

Flow:

1. Recurrence definition exists.
2. Today’s occurrence appears as a normal task.
3. Junior completes today’s task.
4. Tomorrow’s occurrence is generated by recurrence runner.
5. Past history shows completed/missed occurrences.

---

## 5. Target Architecture

### 5.1 Layered Architecture

```txt
Frontend UI
  - Duty screen
  - Patient dashboard
  - Task cards
  - Proposal editor
  - Human copy buttons
  - Agent context copy buttons

Local AI Agent
  - Reads pasted HMS-CONTEXT blocks
  - Uses manifest and schemas
  - Makes judgment locally
  - Calls proposal/write APIs as tools

Backend Tool API
  - Directory/context endpoints
  - Manifest endpoint
  - Task type registry
  - Proposal layer
  - Task workflow engine
  - Sync/change streams
  - Copy generation

DynamoDB Single Table
  - Patient metadata
  - Staff profiles
  - Task current state
  - Task updates
  - Task proposals
  - TASKSYNC rows
  - Duty/reminder projections
  - Timeline events

S3
  - Task update photos/reports
  - Patient documents
  - Notes/med attachments
```

### 5.2 Backend Module Layout

Replace current `tasks.mjs` with a folder:

```txt
HMSdevmrnchange/tasks/
  index.mjs
  task_types.mjs
  task_mapper.mjs
  task_store.mjs
  task_crud.mjs
  task_updates.mjs
  task_events.mjs
  task_sync.mjs
  task_alerts.mjs
  task_projection.mjs
  task_views.mjs
  task_copy.mjs
  task_proposals.mjs
  task_recurrence.mjs
  task_reminders.mjs
  task_agents.mjs
```

Router change:

```js
import { mountTaskRoutes } from "./tasks/index.mjs";
```

### 5.3 Supporting Modules

Add or expand:

```txt
directory.mjs
agents_manifest.mjs
beds.mjs or patient bed fields in patients.mjs
```

Possible endpoints:

```txt
GET /agents/manifest
GET /agents/context
GET /directory/patients
GET /directory/staff
GET /directory/beds
GET /task-types
GET /task-types/:type
```

---

## 6. Data Model

### 6.1 Task Item — Current State

```js
{
  PK: "PATIENT#<uid>",
  SK: "TASK#<taskId>",

  entity: "TASK",
  task_id: "task_123",

  patient_uid: "01J...",
  mrn: "IP2345",
  scheme: "NAM",
  bed_no: "12",
  ward: "S1",

  title: "Send CBC and update report",
  type: "investigation",
  subtype: "cbc",

  status: "todo",
  priority: "important",

  assignee_id: "jr_123",
  assignee_name: "Arun",
  assignee_role: "junior_doctor",

  assigned_by_id: "pg_456",
  assigned_by_name: "Dr. Priya",

  doctor_id: "pg_456",
  consultant_id: "dr_x",
  consultant_name: "Dr. X",

  due_at: "2026-06-10T10:00:00+05:30",
  due_date: "2026-06-10",

  source: {
    kind: "agent",
    original_text: "Add CBC task for bed 12 and assign to Arun"
  },

  clinical_data: {
    sample_sent: false,
    report_received: false
  },

  blocker: null,

  alert: {
    level: "none",
    reason: null,
    acknowledged_by: null,
    acknowledged_at: null
  },

  requires_verification: false,
  verify_status: "not_required",

  latest_update: null,

  files: [],

  version: 1,
  latest_change_at: "2026-06-10T09:15:22.120Z",
  latest_change_id: "01JXX...",
  latest_cursor: "2026-06-10T09:15:22.120Z#01JXX...",

  duty_sk: null,
  projection_status: "ok",
  projection_updated_at: "...",

  created_at: "...",
  updated_at: "...",

  GSI2PK: "TASK#TODO#DEPT#Surgery",
  GSI2SK: "ASSIGNEE#jr_123#DUE#2026-06-10T10:00:00+05:30#TASK#task_123"
}
```

### 6.2 Task Update Item — Append-Only Clinical Event

```js
{
  PK: "PATIENT#<uid>",
  SK: "TASKUPDATE_BY_TASK#<taskId>#<changedAt>#<updateId>",

  entity: "TASK_UPDATE",
  update_id: "upd_123",
  event_id: "01JXX...",
  task_id: "task_123",
  patient_uid: "01J...",

  change_type: "task_updated",
  status_after: "pending",

  structured_data: {
    sample_sent: true,
    sent_time: "2026-06-10T08:20:00+05:30",
    report_received: false,
    comment: "Lab said report by 12 PM"
  },

  human_summary: "CBC sample sent at 8:20 AM. Report pending. Lab said report by 12 PM.",
  original_text: "CBC sent for bed 12 at 8:20, report pending, lab said 12 PM",

  files: [],

  actor_id: "jr_123",
  actor_name: "Arun",
  actor_role: "junior_doctor",

  proposal: {
    proposal_id: "proposal_123",
    proposal_version: 2,
    approved_by: "pg_456",
    approved_at: "2026-06-10T09:10:00+05:30"
  },

  created_at: "..."
}
```

### 6.3 Task Proposal Item

```js
{
  PK: "TASKPROPOSAL#proposal_123",
  SK: "META",

  entity: "TASK_PROPOSAL",
  proposal_id: "proposal_123",

  status: "ready",
  intent: "create_task",

  source: {
    kind: "agent",
    original_text: "Add CBC task for bed 12 and assign to Arun",
    screen: "patient_dashboard",
    context_kind: "HMS-CONTEXT v1"
  },

  actor: {
    user_id: "pg_456",
    name: "Dr. Priya",
    role: "resident"
  },

  operations: [
    {
      op_id: "op_1",
      action: "create_task",
      target: {
        patient_uid: "01J...",
        mrn: "IP2345",
        bed_no: "12"
      },
      before: null,
      after: {
        title: "Send CBC and update report",
        type: "investigation",
        subtype: "cbc",
        status: "todo",
        priority: "important",
        assignee_id: "jr_123",
        doctor_id: "pg_456",
        due_at: "2026-06-10T10:00:00+05:30"
      },
      diff: [
        { field: "task", from: null, to: "Create new CBC investigation task" },
        { field: "assignee_id", from: null, to: "jr_123" },
        { field: "due_at", from: null, to: "2026-06-10T10:00:00+05:30" }
      ],
      editable_fields: ["title", "priority", "due_at", "assignee_id", "doctor_id"]
    }
  ],

  validation: {
    ready: true,
    errors: [],
    warnings: [],
    assumptions: [
      "Bed 12 matched patient IP2345.",
      "Arun matched assignee jr_123.",
      "CBC matched investigation subtype cbc."
    ]
  },

  preview: {
    title: "Create CBC task",
    summary: "Create CBC investigation task for Bed 12 / IP2345, assigned to Arun, due today 10:00 AM.",
    confirmation_text: "I will create a CBC task for Bed 12 / IP2345 and assign it to Arun, due today 10:00 AM. Approve?"
  },

  version: 1,
  expires_at: 1781100000,
  created_at: "...",
  updated_at: "..."
}
```

### 6.4 TASKSYNC Row

Every mutation produces time-indexed sync rows.

Cursor:

```txt
<changedAt>#<eventId>
```

Example:

```js
{
  PK: "TASKSYNC#PATIENT#01J...",
  SK: "CHG#2026-06-10T09:15:22.120Z#01JXX...",

  entity: "TASK_CHANGE",
  event_id: "01JXX...",
  cursor: "2026-06-10T09:15:22.120Z#01JXX...",
  change_type: "task_updated",
  changed_at: "2026-06-10T09:15:22.120Z",
  changed_by: "jr_123",

  task_id: "task_123",
  patient_uid: "01J...",
  mrn: "IP2345",
  bed_no: "12",

  assignee_id: "jr_123",
  assigned_by_id: "pg_456",
  doctor_id: "pg_456",
  consultant_id: "dr_x",

  task_version: 8,
  status_after: "pending",
  update_id: "upd_123",
  summary: "CBC sample sent at 8:20 AM. Report pending.",

  task_snapshot: {
    title: "Send CBC and update report",
    type: "investigation",
    subtype: "cbc",
    priority: "important",
    status: "pending",
    due_at: "2026-06-10T12:00:00+05:30",
    alert: { level: "none" },
    latest_summary: "CBC sample sent at 8:20 AM. Report pending."
  }
}
```

### 6.5 TASKSYNC Streams

Required streams:

```txt
TASKSYNC#PATIENT#<uid>
TASKSYNC#ASSIGNEE#<assigneeId>
TASKSYNC#ASSIGNEE#<assigneeId>#PATIENT#<uid>
TASKSYNC#DOCTOR#<doctorId>
TASKSYNC#DOCTOR#<doctorId>#PATIENT#<uid>
TASKSYNC#ASSIGNEE#<assigneeId>#DOCTOR#<doctorId>#PATIENT#<uid>
```

### 6.6 Duty Projection Row

```js
{
  PK: "DUTY#USER#jr_123#DATE#2026-06-10",
  SK: "BUCKET#2-DUE#DUE#2026-06-10T10:00:00+05:30#TASK#task_123",

  entity: "DUTY_TASK",
  task_id: "task_123",
  patient_uid: "01J...",
  mrn: "IP2345",
  bed_no: "12",

  title: "Send CBC and update report",
  type: "investigation",
  subtype: "cbc",
  priority: "important",
  status: "todo",
  due_at: "2026-06-10T10:00:00+05:30",

  patient_snapshot: {
    name: "Ravi Kumar",
    diagnosis: "Appendicular abscess",
    consultant: "Dr. X",
    current_state: "post-op"
  },

  latest_update_summary: null,
  updated_at: "..."
}
```

---

## 7. Task Type Registry

The task registry powers:

- Frontend dynamic forms.
- Local AI understanding.
- Proposal validation.
- Default values.
- Quick actions.
- Required fields by action.
- Alert rules.
- Copy generation.

### 7.1 Supported Task Types

```txt
investigation
report_followup
photo_upload
medication
vitals
clearance
discharge
consent
blood_arrangement
preop_checklist
postop_review
round_order
generic
```

### 7.2 Statuses

```txt
todo
in_progress
pending
blocked
done
cancelled
```

### 7.3 Priority

```txt
routine
important
urgent
critical
```

### 7.4 Verification Status

```txt
not_required
needs_senior_review
verified
rejected
```

### 7.5 Example Registry Definition

```js
export const TASK_TYPE_DEFS = {
  investigation: {
    displayName: "Investigation",
    aliases: ["cbc", "hb", "tlc", "rft", "lft", "culture", "biopsy"],
    createDefaults: {
      status: "todo",
      priority: "important",
      duePolicy: "same_day",
      titleTemplate: "Send {subtypeLabel} and update report",
      requiresVerification: false,
      createsReportAwaited: true
    },
    subtypes: {
      cbc: {
        label: "CBC",
        titleTemplate: "Send CBC and update report",
        defaultDueTime: "08:00",
        defaultPriority: "important"
      },
      biopsy: {
        label: "Biopsy report",
        titleTemplate: "Follow biopsy report",
        defaultDuePolicy: "next_working_day",
        defaultPriority: "important"
      }
    },
    updateFields: [
      { key: "sampleSent", type: "boolean", label: "Sample sent?" },
      { key: "sentTime", type: "datetime", label: "Sent time" },
      { key: "reportReceived", type: "boolean", label: "Report received?" },
      { key: "reportValue", type: "string", label: "Report value" },
      { key: "abnormal", type: "boolean", label: "Abnormal?" },
      { key: "nextFollowupAt", type: "datetime", label: "Next follow-up time" }
    ],
    quickActions: {
      sample_sent: {
        status: "pending",
        data: { sampleSent: true, sentTime: "$now", reportReceived: false }
      },
      report_received: {
        status: "done",
        requiredFields: ["reportReceived"]
      }
    }
  }
};
```

---

## 8. API Surface

### 8.1 Directory and Context APIs

```txt
GET /agents/manifest
GET /agents/context?department=&userId=&scope=
GET /directory/patients?department=&ward=&bed=&q=&fields=minimal
GET /directory/staff?role=&department=&q=&fields=minimal
GET /directory/beds?ward=
GET /task-types
GET /task-types/:type
```

`/agents/context` is fallback grounding. The preferred flow is pasted `HMS-CONTEXT` from UI.

### 8.2 Copy APIs

Human format:

```txt
GET /patients/:id/tasks/:taskId/copy?format=human
GET /patients/:id/copy-update?format=human
GET /me/duty/copy?userId=&date=&format=human
```

Agent format:

```txt
GET /patients/:id/tasks/:taskId/copy?format=agent
GET /patients/:id/copy-update?format=agent
GET /me/duty/copy?userId=&date=&format=agent
```

View responses may include context directly:

```txt
GET /me/duty?userId=&date=&include=agentContext
GET /patients/:id/task-dashboard?include=agentContext
```

### 8.3 Proposal APIs

```txt
POST  /tasks/proposals
GET   /tasks/proposals/:proposalId
PATCH /tasks/proposals/:proposalId
POST  /tasks/proposals/:proposalId/commit
POST  /tasks/proposals/:proposalId/reject
GET   /tasks/proposals?actorId=&patientId=&status=
```

Agent aliases:

```txt
POST /agents/tasks/draft   -> calls /tasks/proposals
POST /agents/tasks/commit  -> calls /tasks/proposals/:id/commit
```

### 8.4 Task APIs

```txt
POST   /patients/:id/tasks
GET    /patients/:id/tasks?status=&type=&limit=
GET    /patients/:id/tasks/:taskId?updates=1
PATCH  /patients/:id/tasks/:taskId
DELETE /patients/:id/tasks/:taskId

POST /patients/:id/tasks/:taskId/update
POST /patients/:id/tasks/:taskId/start
POST /patients/:id/tasks/:taskId/done
POST /patients/:id/tasks/:taskId/pending
POST /patients/:id/tasks/:taskId/block
POST /patients/:id/tasks/:taskId/verify

POST /patients/:id/tasks/:taskId/files/attach
POST /patients/:id/tasks/:taskId/files/detach
```

### 8.5 Sync APIs

```txt
GET /tasks/changes?patientId=&after=&limit=
GET /tasks/changes?assigneeId=&after=&limit=
GET /tasks/changes?assigneeId=&patientId=&after=&limit=
GET /tasks/changes?doctorId=&after=&limit=
GET /tasks/changes?doctorId=&patientId=&after=&limit=
GET /tasks/changes?assigneeId=&doctorId=&patientId=&after=&limit=

GET /tasks/changes/latest?<same scope params>&after=

GET /patients/:id/tasks/changes?after=
GET /assignees/:id/tasks/changes?after=
GET /doctors/:id/tasks/changes?after=
```

Response:

```js
{
  scope: "assignee_patient",
  checkpointUsed: "2026-06-10T08:00:00.000Z#01JW...",
  nextCheckpoint: "2026-06-10T09:15:22.120Z#01JXX...",
  hasMore: false,
  resyncRequired: false,
  items: [
    {
      eventId: "01JXX...",
      cursor: "2026-06-10T09:15:22.120Z#01JXX...",
      changedAt: "2026-06-10T09:15:22.120Z",
      changeType: "task_updated",
      taskId: "task_123",
      patientId: "01J...",
      assigneeId: "jr_123",
      doctorId: "pg_456",
      version: 8,
      statusAfter: "pending",
      summary: "CBC sample sent at 8:20 AM. Report pending.",
      taskSnapshot: {}
    }
  ]
}
```

### 8.6 Duty APIs

```txt
GET /me/duty?userId=&date=
GET /patients/:id/task-dashboard
POST /tasks/projections/rebuild?userId=&date=
POST /tasks/projections/rebuild-patient?patientId=
POST /tasks/sync/rebuild?patientId=&from=
```

### 8.7 Reminder APIs

```txt
GET /reminders?date=&userId=
POST /patients/:id/tasks/:taskId/reminders
POST /patients/:id/tasks/:taskId/reminders/:reminderId/clear
```

### 8.8 Recurrence APIs

```txt
POST /patients/:id/tasks/recurrences
GET  /patients/:id/tasks/recurrences
POST /tasks/recurrences/run?date=
```

---

## 9. Key Flows

### 9.1 Agent Context Copy Flow

```txt
1. UI loads patient dashboard from server.
2. Server response includes normal JSON and optionally agentContext.
3. User clicks "Copy for AI".
4. UI copies server-generated HMS-CONTEXT block.
5. User pastes it to local AI.
6. AI acts from copied IDs and checkpoint.
7. AI only calls small APIs if context is missing or stale.
```

### 9.2 Proposal Creation Flow

```txt
1. Local AI receives user instruction.
2. AI resolves IDs from HMS-CONTEXT.
3. AI calls POST /tasks/proposals.
4. Backend validates and fills defaults.
5. Backend returns preview, diff, editable fields, assumptions.
6. UI/AI shows proposal to user.
```

### 9.3 Proposal Edit Flow

```txt
1. User edits proposal in UI or through AI.
2. Client calls PATCH /tasks/proposals/:proposalId.
3. Backend applies edits to proposal only.
4. Backend revalidates.
5. Proposal version increments.
6. Updated preview is returned.
```

### 9.4 Proposal Commit Flow

```txt
1. User approves.
2. Client calls POST /tasks/proposals/:proposalId/commit.
3. Backend validates proposal version and idempotency key.
4. Backend commits through task_store.
5. Backend writes task/update/sync/timeline/projections.
6. Backend marks proposal committed.
7. Backend returns results and copy text.
```

### 9.5 Incremental Sync Flow

```txt
1. UI/agent stores checkpoint from view or context block.
2. Before acting, it checks /tasks/changes/latest with after=checkpoint.
3. If no changes, proceed.
4. If changed, pull /tasks/changes?after=checkpoint.
5. Apply deltas.
6. Continue using new nextCheckpoint.
```

---

## 10. Manifest and Agent Tool Rules

`GET /agents/manifest` should describe:

- API version.
- Available endpoints.
- Required params.
- Request body schemas.
- Task type schemas.
- Proposal flow.
- Context block format.
- Call economy rules.

### 10.1 Agent Call Economy Rules

Manifest should instruct local AI:

```txt
1. Prefer pasted HMS-CONTEXT blocks over fetching.
2. IDs in HMS-CONTEXT blocks are authoritative for that block.
3. If block age > configured threshold, probe latest changes before write.
4. If changes exist, pull deltas, not full world.
5. Allowed cold calls are compact directory endpoints and task-types.
6. Avoid /agents/context unless no context block was provided.
7. All writes require exact IDs, clientMutationId, and expectedVersion where applicable.
8. AI must create a proposal and get user approval before commit.
```

---

## 11. Implementation Plan

### Phase 0 — Grounding and Bed Fields

Purpose: make IDs and patient/staff grounding reliable.

Build:

```txt
directory.mjs
agents_manifest.mjs
bed field support in patients.mjs or beds.mjs
```

Endpoints:

```txt
GET /agents/manifest
GET /agents/context
GET /directory/patients
GET /directory/staff
GET /directory/beds
GET /task-types
GET /task-types/:type
```

Tasks:

- Define `bed_no` clearly.
- Map `bed_no` from `room_number` if needed.
- Ensure patient directory returns patient UID + MRN + bed + diagnosis + doctor/consultant IDs.
- Ensure staff directory returns user ID + name + role + department.
- Add compact `fields=minimal` modes.
- Add manifest with context-copy rules.

### Phase 1 — Task Foundation + Proposals + TASKSYNC

Purpose: build the safe clinical mutation core.

Modules:

```txt
tasks/index.mjs
tasks/task_types.mjs
tasks/task_mapper.mjs
tasks/task_store.mjs
tasks/task_events.mjs
tasks/task_sync.mjs
tasks/task_crud.mjs
tasks/task_updates.mjs
tasks/task_proposals.mjs
tasks/task_copy.mjs
```

Build:

- UID-first task storage.
- Legacy type/status mapping.
- Typed create/update.
- `createTask` and `applyTaskUpdate` shared services.
- `TASK_UPDATE` append-only event.
- `TASKSYNC` streams.
- Doctor-only stream.
- Idempotency with `clientMutationId`.
- Optimistic concurrency with `version` and `expectedVersion`.
- Proposal create/edit/commit/reject.
- Task-level human copy.
- Task-level agent copy.
- Timeline task update event.
- Update-level files.
- Alert object.
- Mandatory source object.

Endpoints:

```txt
POST /tasks/proposals
GET /tasks/proposals/:proposalId
PATCH /tasks/proposals/:proposalId
POST /tasks/proposals/:proposalId/commit
POST /tasks/proposals/:proposalId/reject

POST /patients/:id/tasks
GET /patients/:id/tasks
GET /patients/:id/tasks/:taskId?updates=1
PATCH /patients/:id/tasks/:taskId
DELETE /patients/:id/tasks/:taskId

POST /patients/:id/tasks/:taskId/update
POST /patients/:id/tasks/:taskId/start
POST /patients/:id/tasks/:taskId/done
POST /patients/:id/tasks/:taskId/pending
POST /patients/:id/tasks/:taskId/block
POST /patients/:id/tasks/:taskId/verify

GET /tasks/changes
GET /tasks/changes/latest
GET /patients/:id/tasks/:taskId/copy?format=human|agent
```

### Phase 2 — Duty Board and Patient Task Dashboard

Purpose: power the one-screen junior workflow.

Modules:

```txt
tasks/task_projection.mjs
tasks/task_views.mjs
```

Build:

- Duty projection rows.
- Bucket assignment.
- Projection cleanup/rebuild.
- Patient task dashboard.
- `include=agentContext` for duty and patient dashboard.

Endpoints:

```txt
GET /me/duty?userId=&date=&include=agentContext
GET /patients/:id/task-dashboard?include=agentContext
POST /tasks/projections/rebuild?userId=&date=
POST /tasks/projections/rebuild-patient?patientId=
```

### Phase 3 — Patient and Duty Copy

Purpose: support WhatsApp and agent workflows from full screens.

Build:

- Patient human copy.
- Duty human copy.
- Patient agent context copy.
- Duty agent context copy.

Endpoints:

```txt
GET /patients/:id/copy-update?format=human|agent
GET /me/duty/copy?userId=&date=&format=human|agent
```

### Phase 4 — Reminders

Purpose: make pending/follow-up work actionable.

Modules:

```txt
tasks/task_reminders.mjs
```

Build:

- Reminder projection rows.
- Set/clear reminders.
- Reminder change events.
- Manual reminder query endpoint.

Endpoints:

```txt
GET /reminders?date=&userId=
POST /patients/:id/tasks/:taskId/reminders
POST /patients/:id/tasks/:taskId/reminders/:reminderId/clear
```

### Phase 5 — Recurrence

Purpose: recurring duties as daily occurrences.

Modules:

```txt
tasks/task_recurrence.mjs
```

Build:

- Recurrence definitions.
- Occurrence generation.
- Occurrence completion rollover.
- Missed occurrence history.

Endpoints:

```txt
POST /patients/:id/tasks/recurrences
GET /patients/:id/tasks/recurrences
POST /tasks/recurrences/run?date=
```

### Phase 6 — Optional Agent Convenience Layer

Purpose: optional helpers for agents when context is missing.

Modules:

```txt
tasks/task_agents.mjs
```

Build:

- `/agents/tasks/draft` as alias of proposals.
- `/agents/tasks/commit` as alias of proposal commit.
- Optional deterministic parsing helpers.

Important: this layer should remain thin. The primary flow is UI context copy + proposal API.

---

## 12. Durability and Write Strategy

### 12.1 Transactional Tier

For every commit/update, write transactionally:

```txt
1. TASK current-state patch/create
2. TASK_UPDATE append-only item
3. TASKSYNC#PATIENT master stream row
4. Proposal status update if commit came from proposal
```

### 12.2 Rebuildable Projection Tier

Best-effort but rebuildable:

```txt
1. Scoped TASKSYNC rows
2. Doctor-only TASKSYNC row
3. Timeline event
4. Duty projection
5. Reminder projection
6. Recurrence occurrence creation
```

If projection writes fail:

```js
projection_status: "stale"
```

Repair endpoints rebuild from master events.

---

## 13. TTL and Retention

Recommended:

```txt
TASK_UPDATE rows: no TTL / permanent clinical audit
Task proposal rows: TTL after reasonable time, e.g. 24–72 hours for non-committed proposals
Agent drafts if separate: 1 hour TTL
TASKSYNC#PATIENT master stream: no TTL initially, or at least 180 days
Scoped TASKSYNC fan-outs: 60–90 days TTL
Duty projections: date-bound cleanup
Reminder projections: cleanup after due/resolved
```

Reason:

- `TASK_UPDATE` is the clinical audit system of record.
- Scoped sync rows are read models and can expire.
- Master patient stream should remain long enough to support repair/replay.

---

## 14. Security and Actor Model

Development mode can accept actor from request body:

```js
actorId: "pg_456"
```

But all services should use an actor abstraction:

```js
const actor = getActor(event, body);
```

Later this can switch to JWT/session identity without changing task_store.

Verification must check role:

```txt
senior_resident
consultant
admin
```

Local AI should never be trusted as the actor. It acts on behalf of a user, and the approved mutation should store the approving user.

---

## 15. UI Requirements

### 15.1 Screens

Required screens:

- My Duty Today.
- Patient mini dashboard.
- Task card expanded editor.
- Proposal editor.
- Pending proposals list.
- Patient timeline.
- Copy modal or copy buttons.

### 15.2 Copy Buttons

Each screen should have:

```txt
Copy WhatsApp Update
Copy for AI
```

The server generates both formats.

### 15.3 Proposal Editor

The proposal editor should render from backend-provided fields:

- Operation summary.
- Diff list.
- Editable fields.
- Warnings.
- Assumptions.
- Missing fields.
- Ambiguity options.
- Approve / Reject buttons.

### 15.4 UI Should Not Compose Critical Text

The frontend should not manually compose:

- WhatsApp copy.
- Agent context.
- Proposal summary.
- Clinical update summary.

Those should come from backend renderers.

---

## 16. Acceptance Criteria

### 16.1 Phase 1 Acceptance

- Tasks are stored under `PATIENT#<uid>`.
- Existing MRN routes still work by resolving to UID.
- Creating a task emits task current state, task update, and patient TASKSYNC master event.
- Updating a task uses idempotency and optimistic concurrency.
- Task update history can be fetched per task.
- Task copy text is generated by backend.
- Proposal create/edit/commit/reject works.
- Committed proposal links back to final task/update.
- Task sync query after checkpoint works.
- Doctor-only stream works.

### 16.2 Phase 2 Acceptance

- `/me/duty` returns bucketed tasks quickly.
- `/patients/:id/task-dashboard` returns assigned tasks, pending reports, uploaded files, recent updates, warnings, and optional agent context.
- Projection rebuild endpoint works.

### 16.3 Agent Context Acceptance

- Patient dashboard can return `agentContext` in server-generated format.
- Duty dashboard can return `agentContext`.
- Agent context includes IDs, versions, and checkpoint.
- Local AI can use copied context to create a proposal without additional patient/staff lookups.

### 16.4 Proposal Acceptance

- Proposal shows exact before/after.
- User can edit proposal before commit.
- Commit requires latest proposal version.
- Commit is idempotent.
- Reject does not mutate task state.
- Ambiguous proposals cannot commit until fixed.

---

## 17. Open Decisions and Defaults

### 17.1 Context Scope

Default:

```txt
Department-wide for duty/context endpoints when user needs ward awareness.
Screen-specific for copied HMS-CONTEXT blocks.
```

For copy buttons, scope should be exactly the current UI screen:

- Patient dashboard → one patient.
- Task card → one task.
- Duty screen → current user/day.

### 17.2 Bed Number

Default:

```txt
bed_no = room_number initially
```

But we should add first-class fields:

```txt
ward
bed_no
room_number
unit
```

### 17.3 Doctor Identity

Use explicit fields:

```txt
assignee_id    = person who must do the task
assigned_by_id = person who assigned/created it
doctor_id      = responsible senior/PG for escalation and doctor stream
consultant_id  = consultant of record
```

### 17.4 Sync TTL

Default:

```txt
Scoped sync rows: 60–90 days
Master patient sync: no TTL initially or 180+ days
Task updates: no TTL
```

### 17.5 Agent Context Format

Default:

```txt
Structured text / YAML-flavored HMS-CONTEXT v1
```

Reason:

- More compact than JSON.
- Easier for local models.
- Still parseable.
- Normal JSON remains available through APIs.

---

## 18. Final Architecture Statement

The final architecture is:

```txt
UI shows current server truth.
UI can export that truth as human copy or agent context.
Local AI uses copied context first and makes small tool calls only when needed.
AI creates proposals, not direct clinical writes.
User can review, edit, approve, or reject proposals.
Backend commits approved proposals through one shared task service.
Every commit writes audit events, timeline events, sync streams, duty projections, and copy text.
```

This gives the system:

- Junior-doctor-first workflow.
- AI-agent-first API design.
- UI-first safety and approval.
- Minimal unnecessary AI/API calls.
- Structured clinical data.
- Auditability.
- Checkpoint-based sync.
- WhatsApp transition support.
- Future flexibility for local AI, Claude Code, Cortex, or other on-site agents.

---

## 19. Implementation Summary Checklist

```txt
[ ] Convert tasks to UID-first storage
[ ] Add clinical task type registry with create defaults and update schemas
[ ] Add task proposal layer
[ ] Add proposal editor response format
[ ] Add proposal commit/reject with idempotency
[ ] Add task versioning and expectedVersion checks
[ ] Add TASK_UPDATE append-only rows
[ ] Add TASKSYNC patient, assignee, doctor, and compound streams
[ ] Add doctor-only stream
[ ] Add latest-change fields to task item
[ ] Add task-level and update-level files
[ ] Add alert object
[ ] Add mandatory source object
[ ] Extend timeline mapper for task_update rows
[ ] Add duty board projection
[ ] Add projection rebuild endpoints
[ ] Add human copy endpoints
[ ] Add agent context copy endpoints
[ ] Add include=agentContext to duty and patient dashboard
[ ] Add /agents/manifest
[ ] Add /directory/patients
[ ] Add /directory/staff
[ ] Add /directory/beds
[ ] Add reminders
[ ] Add recurrence occurrences
[ ] Keep optional /agents/tasks/draft as alias, not core dependency
```
