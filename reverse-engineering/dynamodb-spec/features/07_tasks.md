# Feature: Task & Workflow Management

> Table: `TaskWorkflowTable`
> Owners: jBPM Service, Clinical Task Services

---

## Domain Overview

Unified task table for both AADI clinical tasks (6 types) and AHAM billing approval tasks (13 types). All tasks follow the same lifecycle and queue model.

## Task Lifecycle

```
OPEN ──→ CLAIMED ──→ IN_PROGRESS ──→ DONE ──→ CLOSED
  │         │
  │         └──→ RELEASED (back to OPEN)
  │
  └──→ (stays in group queue until claimed)
```

## Three Queue Model

| Queue | GSI | Access Pattern | Description |
|-------|-----|---------------|-------------|
| ALL | GSI2 | `UNIT#{unitCode}#STATUS#ALL` | All tasks regardless of status |
| GROUP | GSI2 | `UNIT#{unitCode}#STATUS#OPEN` | Unclaimed tasks available to claim |
| MY (Personal) | GSI1 | `ASSIGNEE#{userId}` | Tasks claimed by current user |

## Task Types Registry

### AADI Clinical Tasks (6)

| Task Name | Trigger | Resolved By |
|-----------|---------|-------------|
| `PROGRESS-NOTES-ACKNOWLEDGEMENT` | Junior doctor submits progress note | Primary consultant acknowledges |
| `DISCHARGE_SUMMARY_CREATION` | Patient marked for discharge | Assigned doctor creates DS |
| `DISCHARGE_SUMMARY_SIGNOFF` | DS sent for review | Reviewing consultant signs off |
| `INITIAL_ASSESSMENT_REVIEW` | IA submitted | Assigned reviewer reviews |
| `CHECKLIST_TASK_APPROVAL` | Checklist submitted | Approver approves/rejects |
| `CROSS_CONSULTATION` | CC requested | Target specialist responds |

### AHAM Billing Tasks (13)

| Task Name | Trigger | Resolved By |
|-----------|---------|-------------|
| `Invoice Generation Approval` | Invoice generated | Finance approver |
| `Discount Approval` | Discount applied to invoice | Finance manager |
| `Receipt Approval` | Receipt collected | Finance approver |
| `Receipt Cancellation` | Receipt cancelled | Finance manager |
| `Refund Approval` | Refund initiated | Finance manager |
| `Reversal Invoice Approval` | Invoice reversed | Finance director |
| `Retrospect Invoice Initiation` | Retrospective adjustment | Finance team |
| `Retrospect Invoice Approval` | Retrospect initiated (stage 2) | Finance director |
| `UnBilled Invoice Approval` | Unbilled doc processed | Finance approver |
| `HighValue MedicationRequest Approval` | High-value med ordered | Medical director |
| `Authorization Approval` | Authorization requested | Authorized approver |
| `Mandatory Brand Approval` | LCHM brand requested | Pharmacy head |
| `Invoice Cancellation` | Invoice cancelled | Finance director |

## Key Design

### PK: `TASK#{taskId}`

Each task gets its own partition. This is optimal because:
- Tasks are accessed individually (claim, release, complete)
- Task detail view loads one task at a time
- No need to query "all tasks for a specific encounter" (that's done via ClinicalDocumentTable GSI1)

### GSI1: My Tasks

```
GSI1PK = ASSIGNEE#staff-user-01
GSI1SK = STATUS#IN_PROGRESS#CREATED#2026-04-23T10:00:00Z

→ Personal queue sorted by status then creation date
→ When task is released: GSI1PK removed (sparse) → disappears from personal queue
→ When task is claimed: GSI1PK set to ASSIGNEE#{userId}
```

### GSI2: Tasks by Unit/Status/Type

```
GSI2PK = UNIT#NH-BLR-01#STATUS#OPEN
GSI2SK = TYPE#Invoice Generation Approval#CREATED#2026-04-23T10:00:00Z

→ Group queue: all unclaimed tasks for a unit, sorted by type then date
→ Filter by task name: SK begins_with TYPE#Invoice Generation Approval
→ Count by type: Query with Select = COUNT
```

### Process Variables (VARS item)

Task process variables (document data) stored as a separate item:

```json
{
  "PK": "TASK#12345",
  "SK": "VARS",
  "documentNo": "INV-2026-001",
  "documentType": "INVOICE",
  "invoiceData": { ... },
  "patientId": "P-100234",
  "uhid": "UHID-001",
  "unitCode": "NH-BLR-01"
}
```

**Rationale**: Process variables can be large (full invoice data). Separating from METADATA allows loading the task list quickly without fetching variable data.

### Comments (COMMENT items)

```json
{
  "PK": "TASK#12345",
  "SK": "COMMENT#2026-04-23T10:30:00Z",
  "commentedBy": "staff-user-01",
  "commentedByName": "Priya K.",
  "comment": "Verified discount amount with finance head"
}
```

## Concurrency Control

### Optimistic Locking for Task Claims

```
UpdateItem:
  PK = TASK#12345, SK = METADATA
  SET taskStatus = IN_PROGRESS, actualOwner = #{userId}
  CONDITION: taskStatus = OPEN AND attribute_not_exists(actualOwner)
```

If another user claims first, the condition fails → return "Task has been already claimed by other user..!!"

### Self-Approval Guard

```
Before claim-start:
  GetItem TASK#12345 → check createdBy
  If createdBy == currentUser → reject: "Document creator cannot approve the document"
```

## Capacity Estimates

| Operation | Peak RCU | Peak WCU | Notes |
|-----------|----------|----------|-------|
| Task list (GSI1/GSI2) | 50 | 0 | Task queue refresh |
| Task claim | 0 | 10 | Interactive claims |
| Task completion | 0 | 10 | Approval actions |
| Process variables | 20 | 10 | Detail view |
| Task count | 10 | 0 | Badge counts |

## TTL

- Completed tasks (DONE/CLOSED): 1-year TTL
- Open/in-progress tasks: No TTL
- Rationale: Completed tasks are historical, only needed for audit
