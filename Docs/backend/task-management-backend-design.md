# Clinical Task Management Backend Design

> **Date:** 2026-04-11
> **Scope:** DynamoDB table design (multiple GSIs), separate Lambda, audit trail, templates with checklists, caching/sync
> **Status:** Design Document

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [DynamoDB Table Design & GSIs](#2-dynamodb-table-design--gsis)
3. [Lambda Architecture](#3-lambda-architecture)
4. [Audit Trail System](#4-audit-trail-system)
5. [Template & Checklist System](#5-template--checklist-system)
6. [Caching & Checkpoint-Based Sync](#6-caching--checkpoint-based-sync)
7. [API Endpoints](#7-api-endpoints)
8. [Medical Compliance Considerations](#8-medical-compliance-considerations)
9. [Implementation Phases](#9-implementation-phases)

---

## 1. Current State Analysis

### What Exists Today

**Frontend (Local-First Architecture):**
- Sophisticated event-sourced task management in `src/domains/tasks/`
- Local SQLite ledger (sql.js for web, expo-sqlite for native) with `applyOp()` as the single write gateway
- Immutable ops table for audit trail, outbox queue for sync, undo via compensating ops
- 59 files: screens, components, hooks, models, local-ledger services, tests
- Multi-view board (ward/patient/doctor/place/day/priority/type), filtering, sorting
- TanStack React Query v5 for data fetching, React Hook Form + Zod for validation
- Shadcn/ui + Tailwind CSS + Framer Motion for UI

**Backend (Existing):**
- Single DynamoDB table: `HMS-HYD` (dev) / `HMS` (prod), PAY_PER_REQUEST, Streams enabled (NEW_AND_OLD_IMAGES)
- Single Lambda `HMSdevmrnchange` (Node.js 22.x ESM, 256MB, 30s timeout) with modular router
- Existing `tasks.mjs` module with patient-scoped CRUD + department dashboard query
- SAM template at `backend/dev/template.yaml`
- S3 + CloudFront for file storage
- Lambda Function URL (no API Gateway, no auth)

**Existing GSIs on HMS table:**
| GSI | Key | Purpose |
|-----|-----|---------|
| GSI1PK-index | `GSI1PK` | Query patients by department + status |
| GSI2PK-GSI2SK-index | `GSI2PK`, `GSI2SK` | Task dashboard by status/dept/assignee |

**Existing LSI:**
| LSI | Key | Purpose |
|-----|-----|---------|
| LSI_CUR_MRN-index | `LSI_CUR_MRN` | Patient lookup by current MRN |

### Key Gaps

| Gap | Impact |
|-----|--------|
| No `updatedAt` GSI | Cannot do checkpoint-based sync / incremental fetch |
| No `actor_id` on task writes | DynamoDB Streams can't determine WHO made changes |
| No separate audit table | Audit records mixed with operational data |
| No template/checklist data model | Templates are hardcoded in frontend only |
| No granular checklist completion tracking | Only `checklist_in_done`/`checklist_out_done` arrays |
| No auth (Lambda Function URL is public) | HIPAA non-compliant |
| Local-first ledger not syncing to backend | Outbox pattern ready but not wired |

---

## 2. DynamoDB Table Design & GSIs

### 2.1 Tasks Table (New Dedicated Table)

**Table Name:** `HMS-Tasks` (dev: `HMS-Tasks-HYD`)

**Why a separate table:**
- Independent scaling from patient data (tasks are high-write)
- Independent GSI budget (20 per table)
- Cleaner IAM isolation
- Separate DynamoDB Streams for task-specific audit processing

**Primary Key:**

| Attribute | Type | Format | Example |
|-----------|------|--------|---------|
| `PK` | String | `TASK#<taskId>` | `TASK#01J7M4X8Q4ABC` |
| `SK` | String | `METADATA` or `CHECKLIST#<itemId>` or `COMMENT#<commentId>` | `METADATA` |

### 2.2 GSI Design (5 GSIs)

#### GSI1: Tasks by Assignee + Due Date

```
GSI1PK: assigneeId       (e.g., "USER#dr-rao")
GSI1SK: dueDate           (e.g., "2026-04-15")
```

**Query:** "All tasks assigned to Dr. Rao, ordered by due date"
```
GSI1PK = "USER#dr-rao" AND GSI1SK BETWEEN "2026-04-01" AND "2026-04-30"
```

#### GSI2: Tasks by Patient + UpdatedAt

```
GSI2PK: patientId         (e.g., "PATIENT#01J7M4X8Q4...")
GSI2SK: updatedAt          (e.g., "2026-04-11T14:30:00Z")
```

**Query:** "All tasks for patient X, most recently updated first"
```
GSI2PK = "PATIENT#01J7M4..." AND GSI2SK > "2026-04-01T00:00:00Z"
```

#### GSI3: Tasks by Status + Due Date (Sparse)

```
GSI3PK: status             (e.g., "OPEN")
GSI3SK: dueDate            (e.g., "2026-04-15")
```

**Query:** "All overdue open tasks"
```
GSI3PK = "OPEN" AND GSI3SK < "2026-04-11"
```

> **Hot partition risk:** Status has low cardinality (4 values). If volume grows, shard by department: `GSI3PK = "DEPT#CARDIO#OPEN"`.

#### GSI4: Checkpoint Sync (Sharded updatedAt) -- THE KEY GSI

```
GSI4PK: updatedShard       (e.g., "SHARD#7")
GSI4SK: updatedAt           (e.g., "2026-04-11T14:30:00Z")
```

**How `updatedShard` is computed:**
```javascript
const NUM_SHARDS = 10;
const updatedShard = `SHARD#${hash(taskId) % NUM_SHARDS}`;
```

**Sync query (scatter-gather):**
```javascript
// Issue 10 parallel queries, one per shard
const promises = Array.from({ length: NUM_SHARDS }, (_, i) =>
  docClient.send(new QueryCommand({
    TableName: 'HMS-Tasks',
    IndexName: 'GSI4-sync-index',
    KeyConditionExpression: 'updatedShard = :shard AND updatedAt > :since',
    ExpressionAttributeValues: {
      ':shard': `SHARD#${i}`,
      ':since': lastSyncTimestamp,
    },
  }))
);
const results = await Promise.all(promises);
const merged = results.flatMap(r => r.Items);
```

**Why sharding:** A naive GSI with a fixed PK and `updatedAt` SK creates a hot partition (all recent writes go to the same partition). Sharding distributes writes across N partitions while still enabling time-range queries.

#### GSI5: Tasks by Department + Due Date

```
GSI5PK: departmentId       (e.g., "DEPT#CARDIO")
GSI5SK: dueDate             (e.g., "2026-04-15")
```

**Query:** "All tasks in Cardiology due this week" (department dashboard)

### 2.3 Task Item Schema

```typescript
interface TaskItem {
  // Keys
  PK: string;                    // TASK#<taskId>
  SK: string;                    // METADATA

  // Core fields
  taskId: string;                // ULID
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  taskType: string;              // lab, medication, procedure, assessment, discharge, custom

  // Relationships
  patientId: string;
  patientName: string;           // Denormalized for display
  assigneeId: string;
  assigneeName: string;          // Denormalized
  departmentId: string;
  doctorName?: string;
  nurseName?: string;

  // Scheduling
  dueDate?: string;              // ISO 8601
  scheduleTime?: string;
  scheduleDay?: string;
  recurrence?: string;           // none, daily, q4h, q6h, q8h, bid, tid, weekly, prn
  recurrenceEndDate?: string;

  // Template tracking
  templateId?: string;           // Which template created this
  templateVersion?: number;      // Which version of the template

  // Checklist summary (denormalized for fast reads)
  checklistTotal: number;
  checklistCompleted: number;
  checklistRequiredTotal: number;
  checklistRequiredCompleted: number;

  // Location
  placeText?: string;            // Room 101, ICU Bay 2, etc.
  wardId?: string;

  // Metadata
  createdAt: string;             // ISO 8601
  updatedAt: string;             // ISO 8601 -- UPDATED ON EVERY WRITE
  completedAt?: string;
  deletedAt?: string;            // Soft delete (null = active)
  version: number;               // Optimistic concurrency
  actorId: string;               // WHO made the last change (CRITICAL for audit)
  actorRole: string;             // Role at time of action

  // Sync
  updatedShard: string;          // SHARD#<hash(taskId) % 10> for GSI4

  // Custom fields (template-defined)
  customFields?: Record<string, any>;

  // GSI keys (denormalized)
  GSI1PK?: string;               // assigneeId
  GSI1SK?: string;               // dueDate
  GSI2PK?: string;               // patientId
  GSI2SK?: string;               // updatedAt
  GSI3PK?: string;               // status (sparse -- removed when cancelled)
  GSI3SK?: string;               // dueDate
  GSI4PK?: string;               // updatedShard
  GSI4SK?: string;               // updatedAt
  GSI5PK?: string;               // departmentId
  GSI5SK?: string;               // dueDate
}
```

### 2.4 Checklist Item (Same Table, Item Collection)

```typescript
interface ChecklistItemRecord {
  PK: string;                    // TASK#<taskId> (same as parent task)
  SK: string;                    // CHECKLIST#<sortOrder>#<itemId>

  itemId: string;                // ULID
  parentItemId?: string;         // null = top-level, else nested under parent
  sectionId?: string;            // Grouping section
  sectionTitle?: string;
  title: string;
  description?: string;
  required: boolean;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;          // userId
  completedByRole?: string;      // role at time of completion
  assigneeId?: string;           // Individual item assignment
  sortOrder: number;
  depth: number;                 // 0 = top level, 1-4 = nested (max 5 levels like ClickUp)

  // Custom field values (template-defined)
  fieldValues?: Record<string, any>;

  // Metadata
  createdAt: string;
  updatedAt: string;
  actorId: string;
}
```

**Benefits of same PK:** A single `Query` on `PK = TASK#<taskId>` returns the task metadata AND all checklist items in one round-trip.

---

## 3. Lambda Architecture

### 3.1 Separate Lambda Function

**Function Name:** `HMS-Tasks-API`
**Runtime:** Node.js 22.x (ESM), ARM64 (Graviton2)
**Memory:** 256 MB
**Timeout:** 30 seconds

**Why separate from existing HMS Lambda:**
- Independent scaling and concurrency limits
- Independent IAM policy (only tasks table + audit table access)
- Independent deployment lifecycle
- Isolates task write-heavy workload from patient read-heavy workload
- Can add API Gateway + Cognito auth without affecting existing Lambda Function URL

### 3.2 Lambda Project Structure

```
backend/dev/tasks-lambda/
├── handler.mjs                    # Entry point with router
├── operations/
│   ├── create-task.mjs
│   ├── get-task.mjs
│   ├── list-tasks.mjs
│   ├── update-task.mjs
│   ├── delete-task.mjs
│   ├── bulk-status.mjs
│   └── sync-delta.mjs            # Checkpoint sync endpoint
├── checklists/
│   ├── update-checklist-item.mjs
│   ├── reorder-checklist.mjs
│   └── apply-template.mjs
├── templates/
│   ├── create-template.mjs
│   ├── list-templates.mjs
│   ├── get-template.mjs
│   ├── update-template.mjs
│   ├── publish-template.mjs
│   └── archive-template.mjs
├── shared/
│   ├── dynamo-client.mjs         # Singleton DocumentClient
│   ├── response.mjs              # Standard response builder
│   ├── validate.mjs              # Input validation (Zod)
│   ├── pagination.mjs            # Cursor encode/decode
│   ├── shard.mjs                 # updatedShard computation
│   └── audit-embed.mjs           # Embed actorId/actorRole in items
└── package.json
```

### 3.3 Audit Stream Processor (Second Lambda)

**Function Name:** `HMS-Tasks-AuditProcessor`
**Runtime:** Node.js 22.x (ESM), ARM64
**Memory:** 128 MB
**Timeout:** 60 seconds
**Trigger:** DynamoDB Streams on `HMS-Tasks` table

```
HMS-Tasks Table
  --> DynamoDB Stream (NEW_AND_OLD_IMAGES)
    --> HMS-Tasks-AuditProcessor Lambda
      --> HMS-Audit Table (append-only)
      --> (future) Kinesis Firehose --> S3 Archive
```

**Stream processor logic:**
1. Receive batch of stream records
2. For each MODIFY event: compute diff between `OldImage` and `NewImage`
3. Extract `actorId`, `actorRole`, `patientId` from the item itself (embedded at write time)
4. Write audit record to `HMS-Audit` table with `ConditionExpression: attribute_not_exists(PK)` (idempotent)
5. On failure: records go to S3 on-failure destination for replay

### 3.4 SAM Template Addition

```yaml
# Add to backend/dev/template.yaml (or new tasks-template.yaml)

TasksTable:
  Type: AWS::DynamoDB::Table
  Properties:
    TableName: !Sub "HMS-Tasks-${StackEnvironment}"
    BillingMode: PAY_PER_REQUEST
    StreamSpecification:
      StreamViewType: NEW_AND_OLD_IMAGES
    PointInTimeRecoverySpecification:
      PointInTimeRecoveryEnabled: true
    SSESpecification:
      SSEEnabled: true
    KeySchema:
      - AttributeName: PK
        KeyType: HASH
      - AttributeName: SK
        KeyType: RANGE
    AttributeDefinitions:
      - { AttributeName: PK, AttributeType: S }
      - { AttributeName: SK, AttributeType: S }
      - { AttributeName: GSI1PK, AttributeType: S }
      - { AttributeName: GSI1SK, AttributeType: S }
      - { AttributeName: GSI2PK, AttributeType: S }
      - { AttributeName: GSI2SK, AttributeType: S }
      - { AttributeName: GSI3PK, AttributeType: S }
      - { AttributeName: GSI3SK, AttributeType: S }
      - { AttributeName: GSI4PK, AttributeType: S }
      - { AttributeName: GSI4SK, AttributeType: S }
      - { AttributeName: GSI5PK, AttributeType: S }
      - { AttributeName: GSI5SK, AttributeType: S }
    GlobalSecondaryIndexes:
      - IndexName: GSI1-assignee-duedate
        KeySchema:
          - { AttributeName: GSI1PK, KeyType: HASH }
          - { AttributeName: GSI1SK, KeyType: RANGE }
        Projection: { ProjectionType: ALL }
      - IndexName: GSI2-patient-updated
        KeySchema:
          - { AttributeName: GSI2PK, KeyType: HASH }
          - { AttributeName: GSI2SK, KeyType: RANGE }
        Projection: { ProjectionType: ALL }
      - IndexName: GSI3-status-duedate
        KeySchema:
          - { AttributeName: GSI3PK, KeyType: HASH }
          - { AttributeName: GSI3SK, KeyType: RANGE }
        Projection: { ProjectionType: ALL }
      - IndexName: GSI4-sync-index
        KeySchema:
          - { AttributeName: GSI4PK, KeyType: HASH }
          - { AttributeName: GSI4SK, KeyType: RANGE }
        Projection: { ProjectionType: ALL }
      - IndexName: GSI5-dept-duedate
        KeySchema:
          - { AttributeName: GSI5PK, KeyType: HASH }
          - { AttributeName: GSI5SK, KeyType: RANGE }
        Projection: { ProjectionType: ALL }
```

---

## 4. Audit Trail System

### 4.1 Audit Table

**Table Name:** `HMS-Audit` (dev: `HMS-Audit-HYD`)

**Key Schema:**
```
PK: AUDIT#<resourceType>#<resourceId>   (e.g., AUDIT#TASK#01J7M4ABC)
SK: <ISO-timestamp>#<auditId>            (e.g., 2026-04-11T14:30:00.000Z#01J7M5XYZ)
```

**GSIs:**

| GSI | PK | SK | Purpose |
|-----|----|----|---------|
| GSI1 | `USER#<userId>` | `<timestamp>#<auditId>` | "What did Dr. Rao do today?" |
| GSI2 | `PATIENT#<patientUid>` | `<timestamp>#<auditId>` | "Full access history for patient X" |
| GSI3 | `DATE#<YYYY-MM-DD>` | `<timestamp>#<resourceType>#<auditId>` | "All events today" (admin dashboard) |

### 4.2 Audit Record Schema

```typescript
interface AuditRecord {
  // Keys
  PK: string;               // AUDIT#TASK#<taskId> or AUDIT#CHECKLIST#<taskId>#<itemId>
  SK: string;               // <timestamp>#<auditId>

  // Core fields
  auditId: string;           // ULID
  timestamp: string;         // ISO 8601 UTC
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' |
          'CHECKLIST_COMPLETE' | 'CHECKLIST_UNCOMPLETE' |
          'TEMPLATE_APPLIED' | 'ASSIGNMENT_CHANGE' | 'PRIORITY_CHANGE';

  // Actor
  actorId: string;
  actorRole: string;         // Role at time of action
  sessionId?: string;
  sourceIp?: string;
  deviceId?: string;

  // Resource
  resourceType: 'TASK' | 'CHECKLIST_ITEM' | 'TEMPLATE';
  resourceId: string;
  patientId?: string;        // For patient-scoped queries
  patientMrn?: string;       // For cross-reference

  // Change data
  oldValues?: Record<string, any>;   // Only changed fields
  newValues?: Record<string, any>;   // Only changed fields
  changeReason?: string;

  // Context
  departmentId?: string;
  templateId?: string;
  templateVersion?: number;

  // Compliance
  outcome: 'SUCCESS' | 'FAILURE';
  phiAccessed: boolean;

  // GSI keys
  GSI1PK: string;           // USER#<actorId>
  GSI1SK: string;           // <timestamp>#<auditId>
  GSI2PK?: string;          // PATIENT#<patientUid> (sparse -- only if patient-related)
  GSI2SK?: string;          // <timestamp>#<auditId>
  GSI3PK: string;           // DATE#<YYYY-MM-DD>
  GSI3SK: string;           // <timestamp>#<resourceType>#<auditId>
}
```

### 4.3 IAM Protection (Immutability)

```yaml
AuditWriterPolicy:
  Type: AWS::IAM::Policy
  Properties:
    PolicyDocument:
      Statement:
        - Effect: Allow
          Action:
            - dynamodb:PutItem      # Write new audit records
            - dynamodb:Query        # Read audit records
            - dynamodb:GetItem
            - dynamodb:BatchGetItem
          Resource: !GetAtt AuditTable.Arn
        # EXPLICITLY NO UpdateItem, DeleteItem, BatchWriteItem (delete)
```

### 4.4 Checklist Completion Audit (Granular)

Each checklist item toggle generates an audit record:

```json
{
  "PK": "AUDIT#CHECKLIST#01J7M4ABC#pre-op-3",
  "SK": "2026-04-11T14:30:00.000Z#01J7M5XYZ",
  "action": "CHECKLIST_COMPLETE",
  "actorId": "nurse_priya",
  "actorRole": "nurse",
  "patientId": "PATIENT#01J7M4X8Q4...",
  "resourceType": "CHECKLIST_ITEM",
  "resourceId": "pre-op-3",
  "oldValues": { "completed": false },
  "newValues": { "completed": true },
  "departmentId": "CARDIO",
  "outcome": "SUCCESS",
  "phiAccessed": true
}
```

### 4.5 Retention Strategy

| Tier | Duration | Storage | Cost |
|------|----------|---------|------|
| Hot | 0-90 days | DynamoDB `HMS-Audit` | Highest |
| Warm | 90 days - 2 years | S3 Standard-IA | Medium |
| Cold | 2-7 years | S3 Glacier Instant Retrieval | Low |

- DynamoDB TTL on `ttlEpoch` (90 days) auto-deletes hot records
- Stream on TTL delete --> Lambda --> Kinesis Firehose --> S3 archive bucket
- S3 Object Lock (Compliance mode) for legally immutable 7-year retention
- Athena for ad-hoc queries on archived audit data

---

## 5. Template & Checklist System

### 5.1 Templates Table

**Stored in:** `HMS-Tasks` table (same table, different PK prefix)

```
PK: TEMPLATE#<templateId>
SK: VERSION#<version>          (e.g., VERSION#3)
```

### 5.2 Template Schema

```typescript
interface TaskTemplate {
  PK: string;                    // TEMPLATE#<templateId>
  SK: string;                    // VERSION#<version>

  templateId: string;            // Stable across versions
  version: number;               // 1, 2, 3...
  status: 'draft' | 'published' | 'archived';

  // Metadata
  name: string;
  description: string;
  category: 'admission' | 'pre-op' | 'ot-safety' | 'post-op' | 'discharge' |
             'lab-followup' | 'medication' | 'referral' | 'care-coordination' | 'custom';
  tags: string[];
  scope: 'personal' | 'department' | 'organization';
  departmentId?: string;

  // Template content
  taskDefaults: {
    priority: string;
    taskType: string;
    recurrence?: string;
    assigneeRole?: string;       // Role-based assignment (not specific person)
    relativeDueDate?: string;    // e.g., "+2d" (2 days after application)
  };

  // Checklist items (nested JSON for template definition)
  sections: TemplateSection[];

  // Custom field definitions
  customFieldDefs: TemplateCustomFieldDef[];

  // Versioning
  publishedAt?: string;
  publishedBy?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

interface TemplateSection {
  id: string;
  title: string;
  sortOrder: number;
  items: TemplateChecklistItem[];
}

interface TemplateChecklistItem {
  id: string;
  title: string;
  description?: string;
  required: boolean;
  assigneeRole?: string;         // nurse, physician, lab-tech, etc.
  children: TemplateChecklistItem[];  // Up to 5 levels deep
  fieldDefs?: string[];          // References to customFieldDefs
  sortOrder: number;
}

interface TemplateCustomFieldDef {
  id: string;
  name: string;
  fieldType: 'text' | 'textarea' | 'number' | 'date' | 'dropdown' |
             'checkbox' | 'people' | 'file' | 'rating' | 'vitals';
  required: boolean;
  defaultValue?: any;
  options?: string[];            // For dropdown type
  validationRules?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  sortOrder: number;
}
```

### 5.3 Template Versioning Rules

```
Draft --> Published (v1) --> Archived
              |
          Edit creates Draft --> Published (v2) --> Archived
```

1. **Published templates are immutable.** Content cannot change once published.
2. **Editing a published template creates a new Draft version.** Old published version stays.
3. **When applying, system records `templateId + version`** on the created task.
4. **Existing tasks are never retroactively updated.** New applications use latest published version.
5. **Diff view between versions** for clinical governance.

### 5.4 Medical Template Categories

| Category | Example Templates | Items Count |
|----------|-------------------|-------------|
| **Admission** | Standard Admission, Emergency Admission, Pediatric Admission | 15-20 |
| **Pre-Op** | General Pre-Op, Cardiac Pre-Op, Orthopedic Pre-Op | 12-18 |
| **OT Safety** | WHO Surgical Safety (Sign-In, Time-Out, Sign-Out) | 17 (3 sections) |
| **Post-Op** | PACU Recovery, Ward Post-Op Day 1, ICU Post-Op | 10-15 |
| **Discharge** | Standard Discharge, Surgical Discharge, AMA Discharge | 15-25 |
| **Lab Follow-up** | Routine Labs, Critical Labs, Pre-Op Labs | 5-8 |
| **Medication** | 5-Rights Administration, High-Alert Med, Antibiotic Stewardship | 6-10 |
| **Referral** | Outbound Referral (9-step closed-loop) | 9 |
| **Care Coordination** | Multidisciplinary Care Plan, SBAR Handoff | 8-15 |

### 5.5 Template Application Flow

```
User selects template --> Preview with customization options
  --> "Apply" creates:
    1. Task record (PK: TASK#<newId>, SK: METADATA)
       with templateId + version recorded
    2. N checklist item records (PK: TASK#<newId>, SK: CHECKLIST#<sort>#<itemId>)
       instantiated from template sections/items
    3. Audit record (action: TEMPLATE_APPLIED)
  --> All in a single TransactWriteCommand (atomic)
```

### 5.6 Checklist UI Features

| Feature | Implementation |
|---------|---------------|
| **Nested items** | Up to 5 levels, `depth` field + `parentItemId` |
| **Drag-to-reorder** | @dnd-kit/sortable, update `sortOrder` via `applyOp()` |
| **Inline editing** | Click-to-edit titles, auto-save on blur/Enter |
| **Item assignment** | Inline avatar picker per checklist item |
| **Progress bar** | `completedCount / totalCount`, separate bar for required items |
| **Section grouping** | Collapsible sections with headers |
| **Check/uncheck** | Single click toggle, strikethrough animation (Framer Motion) |
| **Bulk actions** | "Check All", "Uncheck All" per section |

---

## 6. Caching & Checkpoint-Based Sync

### 6.1 Checkpoint Sync Protocol

```
Client                              API (Lambda)                     DynamoDB
  |                                    |                                |
  |-- GET /tasks/sync                  |                                |
  |   ?updatedSince=<timestamp>        |                                |
  |   &limit=500                       |                                |
  |                                    |-- 10 parallel queries          |
  |                                    |   on GSI4 (one per shard)      |
  |                                    |   WHERE updatedAt > timestamp  |
  |                                    |                                |
  |                                    |<-- Merged results              |
  |<-- { items, serverTimestamp }      |                                |
  |                                    |                                |
  | Store serverTimestamp locally       |                                |
  | Merge items into local cache       |                                |
```

**API response:**
```typescript
interface SyncResponse {
  items: TaskItem[];              // Changed tasks (including soft-deleted)
  serverTimestamp: string;        // Use as next `updatedSince` value
  nextCursor?: string;            // For pagination if > limit items changed
  fullSyncRequired: boolean;      // True if client was offline too long
}
```

### 6.2 Client-Side Caching

**React Query configuration per entity type:**

| Query | `staleTime` | `gcTime` | `refetchInterval` |
|-------|-------------|----------|-------------------|
| Task list | 30s | 5 min | 15s (task board) |
| Task detail | 60s | 10 min | -- |
| Templates (published) | 5 min | 30 min | -- |
| Audit log | 0 (always fresh) | 2 min | -- |
| Reference data (doctors, departments) | 5 min | 30 min | -- |

**IndexedDB for offline persistence:**
- Use TanStack Query v5 `experimental_createPersister` with `idb-keyval` adapter
- Each query is lazily restored when first accessed, persisted after each `queryFn`
- Existing SQLite task ledger continues to manage local-first task state

### 6.3 Sync Edge Cases

| Scenario | Solution |
|----------|----------|
| **First sync** (no checkpoint) | Full query of all active tasks for user's department |
| **Soft deletes** | `deletedAt` field set + `updatedAt` bumped so sync picks it up |
| **Offline too long** (checkpoint older than TTL/archive window) | Server returns `fullSyncRequired: true`, client does full re-sync |
| **Clock skew** | Always use `serverTimestamp` from response, never client clock |
| **Concurrent edits** | Optimistic concurrency via `version` field + conditional writes |
| **Conflict (409)** | Client fetches latest, shows merge UI or auto-merges non-overlapping fields |

### 6.4 ETag Support (Optional Enhancement)

```
Request:  GET /tasks?department=CARDIO
          If-None-Match: "abc123"

Response: 304 Not Modified (if nothing changed)
    OR:   200 OK
          ETag: "def456"
          Body: { items: [...] }
```

Lambda computes ETag as hash of max `updatedAt` in result set. Avoids transferring unchanged data.

---

## 7. API Endpoints

### 7.1 Task CRUD

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/tasks` | Create task (optionally from template) |
| `GET` | `/tasks` | List tasks (filters: status, priority, assignee, dept, patient, updatedSince) |
| `GET` | `/tasks/:taskId` | Get task with checklist items |
| `PATCH` | `/tasks/:taskId` | Update task (partial) |
| `DELETE` | `/tasks/:taskId` | Soft-delete task |
| `POST` | `/tasks/bulk-status` | Bulk status update |
| `GET` | `/tasks/sync` | Checkpoint sync endpoint |

### 7.2 Checklist Operations

| Method | Path | Description |
|--------|------|-------------|
| `PATCH` | `/tasks/:taskId/checklist/:itemId` | Toggle/update checklist item |
| `POST` | `/tasks/:taskId/checklist` | Add new checklist item |
| `DELETE` | `/tasks/:taskId/checklist/:itemId` | Remove checklist item |
| `PATCH` | `/tasks/:taskId/checklist/reorder` | Reorder checklist items |

### 7.3 Template Management

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/templates` | List templates (filters: category, scope, status) |
| `GET` | `/templates/:templateId` | Get latest published version |
| `GET` | `/templates/:templateId/versions` | List all versions |
| `GET` | `/templates/:templateId/versions/:version` | Get specific version |
| `POST` | `/templates` | Create new template (draft) |
| `PATCH` | `/templates/:templateId/versions/:version` | Update draft version |
| `POST` | `/templates/:templateId/versions/:version/publish` | Publish draft |
| `POST` | `/templates/:templateId/versions/:version/archive` | Archive version |
| `POST` | `/tasks/:taskId/apply-template` | Apply template to existing task |

### 7.4 Audit Trail (Read-Only)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/audit/task/:taskId` | Audit history for a task |
| `GET` | `/audit/patient/:patientId` | All task audit events for a patient |
| `GET` | `/audit/user/:userId` | Actions by a specific user |
| `GET` | `/audit/daily/:date` | All events for a given date |

### 7.5 Query Parameters

```
# Pagination (cursor-based)
?cursor=<base64-encoded-LastEvaluatedKey>&limit=25

# Filtering
?status=open,in_progress
&priority=urgent,high
&assigneeId=USER#dr-rao
&departmentId=DEPT#CARDIO
&patientId=PATIENT#01J7M4...
&taskType=lab,medication
&dueDateFrom=2026-04-11
&dueDateTo=2026-04-18

# Checkpoint sync
?updatedSince=2026-04-11T08:00:00Z

# Sorting
?sortBy=dueDate&sortOrder=asc
```

---

## 8. Medical Compliance Considerations

### 8.1 HIPAA Requirements Met

| Requirement | Implementation |
|-------------|---------------|
| **Audit controls** (164.312(b)) | HMS-Audit table with full CRUD logging |
| **Access controls** (164.312(a)) | Cognito + Lambda Authorizer + RBAC (future) |
| **Integrity controls** (164.312(c)) | Optimistic concurrency, immutable audit log |
| **Transmission security** (164.312(e)) | TLS 1.2+ on all API calls |
| **Encryption at rest** | DynamoDB SSE enabled, S3 SSE |
| **Minimum necessary** | Role-based data filtering, department scoping |
| **Retention** | 7-year audit archive with S3 Object Lock |

### 8.2 Clinical Safety

| Concern | Mitigation |
|---------|------------|
| **Lost checklist completion** | Atomic TransactWrite for task + checklist + audit |
| **Concurrent edits** | Optimistic locking with `version` field |
| **Soft deletes only** | Clinical records never hard-deleted |
| **Role-based checklist items** | Items require specific role to complete |
| **Template immutability** | Published templates frozen, version tracked on tasks |
| **Granular checklist audit** | Every check/uncheck logged with who/when |

### 8.3 Actor Identity Gap (MUST FIX)

**Current:** `tasks.mjs` does not capture `actor_id` on writes.
**Required:** Every write to `HMS-Tasks` MUST include `actorId` and `actorRole` in the item. The DynamoDB Stream processor relies on these fields to generate meaningful audit records. Without them, audit records only show WHAT changed, not WHO changed it.

**Fix:** The Lambda authorizer (or request context) must inject the authenticated user's ID and role, and every operation must embed it in the DynamoDB item.

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Create `HMS-Tasks` DynamoDB table with 5 GSIs
- [ ] Create `HMS-Audit` DynamoDB table with 3 GSIs
- [ ] Create `HMS-Tasks-API` Lambda with basic CRUD
- [ ] Add `actorId` / `actorRole` to all task writes
- [ ] Create `HMS-Tasks-AuditProcessor` stream Lambda
- [ ] Update SAM template
- [ ] Wire frontend API client to new task endpoints

### Phase 2: Checkpoint Sync (Week 2-3)
- [ ] Implement `updatedShard` computation on all writes
- [ ] Implement `/tasks/sync` endpoint with scatter-gather
- [ ] Add `updatedSince` support to list endpoints
- [ ] Client-side sync logic (store checkpoint, merge deltas)
- [ ] Soft delete handling in sync

### Phase 3: Templates & Checklists (Week 3-5)
- [ ] Template CRUD endpoints
- [ ] Template versioning (draft/publish/archive)
- [ ] Template application (atomic TransactWrite)
- [ ] Checklist item CRUD (toggle, reorder, nested items)
- [ ] Granular checklist completion audit
- [ ] Seed default medical templates (WHO checklist, admission, discharge, etc.)

### Phase 4: Template UI (Week 5-7)
- [ ] Template gallery/library screen
- [ ] Template preview & apply flow
- [ ] Template editor (create/edit draft)
- [ ] Checklist UI with @dnd-kit drag-reorder
- [ ] Inline editing, progress bars, section grouping
- [ ] Custom fields rendering

### Phase 5: Auth & Compliance (Week 7-8)
- [ ] Cognito User Pool setup
- [ ] Lambda Authorizer with RBAC
- [ ] Role-based checklist item completion enforcement
- [ ] Audit trail viewer UI
- [ ] S3 archive pipeline (TTL -> Stream -> Firehose -> S3 Glacier)

---

## Architecture Diagram

```
                          +-----------------------+
                          |   React / React Native|
                          |   (TanStack Query +   |
                          |    Local SQLite Ledger)|
                          +----------+------------+
                                     |
                            REST API (HTTPS)
                                     |
                          +----------v------------+
                          |    API Gateway         |
                          |  + Lambda Authorizer   |
                          |  (Cognito JWT check)   |
                          +----------+------------+
                                     |
                    +----------------+----------------+
                    |                                 |
          +---------v---------+            +----------v---------+
          | HMS-Tasks-API     |            | HMS (existing)     |
          | Lambda            |            | Lambda             |
          | (tasks, checklists|            | (patients, notes,  |
          |  templates, sync) |            |  meds, doctors,    |
          +--------+----------+            |  discharge, files) |
                   |                       +--------------------+
          +--------v----------+
          | HMS-Tasks Table   |
          | (DynamoDB)        |
          | 5 GSIs            |
          | - Assignee+Due    |
          | - Patient+Updated |
          | - Status+Due      |
          | - Sync Shard      |
          | - Dept+Due        |
          +--------+----------+
                   |
          DynamoDB Stream
          (NEW_AND_OLD_IMAGES)
                   |
          +--------v-----------------+
          | HMS-Tasks-AuditProcessor |
          | Lambda                   |
          +--------+-----------------+
                   |
          +--------v----------+       +------------------+
          | HMS-Audit Table   |------>| S3 Archive       |
          | (DynamoDB)        | TTL   | (Glacier, 7-year |
          | 3 GSIs            |       |  Object Lock)    |
          +-------------------+       +------------------+
```

---

## Key Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Separate table for tasks | Yes | Independent scaling, GSI budget, IAM isolation |
| Number of GSIs | 5 | Covers all access patterns without over-indexing |
| Sync mechanism | Sharded updatedAt GSI (scatter-gather) | Works with existing REST API, no AppSync dependency |
| Audit storage | Separate append-only table | IAM-enforced immutability, independent retention |
| Template versioning | Immutable published versions | Medical compliance requires knowing which version was used |
| Checklist storage | Same table as tasks (item collection) | Single query retrieves task + all checklist items |
| Lambda organization | Separate Lambda per domain | Independent scaling and deployment |
| Auth (future) | Cognito + Lambda Authorizer | HIPAA-compliant, role-based access control |
