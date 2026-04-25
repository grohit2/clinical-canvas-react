# 03 - Task Management

**Module:** Task queues, jBPM workflow engine integration, 13 approval types, claim/approve/reject/revert lifecycle
**Source:** Reverse-engineered from `libapp.so` string table + decompiled Dart BLoC/model/service classes + jBPM REST API calls
**BLoCs:** TaskBloc, TaskDetailBloc
**Services:** TaskService, TaskRepository
**Backend:** jBPM Service (`/api/jbpm/`), MDM Service (`/mdm/api/`), AMB Service (`/amb/api/`)

---

## Table of Contents

1. [The 13 Approval Types](#1-the-13-approval-types)
2. [Task Lifecycle State Machine](#2-task-lifecycle-state-machine)
3. [Task Queues (3)](#3-task-queues)
4. [jBPM API Endpoints (6)](#4-jbpm-api-endpoints)
5. [Process Variables by Task Type](#5-process-variables-by-task-type)
6. [TaskBloc State Machine](#6-taskbloc-state-machine)
7. [TaskDetailBloc State Machine](#7-taskdetailbloc-state-machine)
8. [Task Model (Complete Fields)](#8-task-model)
9. [Task Card UI Layout](#9-task-card-ui-layout)
10. [Approval Type Detail Screens (7 screens for 13 types)](#10-approval-type-detail-screens)
11. [Retrospect Invoice -- 2-Stage Approval](#11-retrospect-invoice-2-stage-approval)
12. [Task Filtering and Sorting](#12-task-filtering-and-sorting)
13. [Confirmation Dialogs and UI Messages](#13-confirmation-dialogs-and-ui-messages)
14. [Validation Rules (10)](#14-validation-rules)
15. [Service & Repository Layer](#15-service--repository-layer)
16. [Error Messages (12)](#16-error-messages)
17. [Screen-to-BLoC Mapping](#17-screen-to-bloc-mapping)

---

## 1. The 13 Approval Types

Every financial or clinical action requiring secondary review becomes a jBPM task. The `taskName` field in the jBPM response identifies the type.

### 1.1 Complete Task Type Registry

| # | taskName (jBPM) | Category | Trigger Source | Detail Screen |
|---|----------------|----------|----------------|---------------|
| 1 | `Invoice Generation Approval` | Invoice | Invoice created in billing system | `InvoiceDetailScreen` |
| 2 | `Discount Approval` | Invoice | Discount applied via `POST /amb/invoice/discount` | `InvoiceDetailScreen` |
| 3 | `Receipt Approval` | Receipt | Receipt recorded against an invoice | `ReceiptDetailScreen` |
| 4 | `Receipt Cancellation` | Receipt | Receipt cancel via `POST /amb/receipt/cancel` | `ReceiptDetailScreen` |
| 5 | `Refund Approval` | Refund | Refund initiated via `POST /amb/app/refund` | `RefundDetailScreen` |
| 6 | `Reversal Invoice Approval` | Invoice | Invoice reversal request | `InvoiceDetailScreen` |
| 7 | `Retrospect Invoice Initiation` | Invoice | Retrospect via `POST /amb/invoice/retrospect` (Stage 1) | `InvoiceDetailScreen` |
| 8 | `Retrospect Invoice Approval` | Invoice | Stage 1 approved, auto-created (Stage 2) | `InvoiceDetailScreen` |
| 9 | `UnBilled Invoice Approval` | Unbilled | Unbilled document via `POST /amb/app/unbilled` | `UnbilledDocumentDetailScreen` |
| 10 | `HighValue MedicationRequest Approval` | Medication | Medication cost exceeds threshold | `HighValueDetailScreen` |
| 11 | `Authorization Approval` | Authorization | Pre-authorization request for procedure/admission | `AuthorizationDetailScreen` |
| 12 | `Mandatory Brand Approval` | Medication | Brand-name medication requested over generic | `LchmDetailScreen` |
| 13 | `Invoice Cancellation` | Invoice | Invoice cancellation request | `InvoiceDetailScreen` |

### 1.2 Task Type Categorization

```
Invoice Tasks (6):
  +-- Invoice Generation Approval
  +-- Discount Approval
  +-- Reversal Invoice Approval
  +-- Retrospect Invoice Initiation
  +-- Retrospect Invoice Approval
  +-- Invoice Cancellation

Receipt Tasks (2):
  +-- Receipt Approval
  +-- Receipt Cancellation

Refund Tasks (1):
  +-- Refund Approval

Unbilled Tasks (1):
  +-- UnBilled Invoice Approval

Medication Tasks (2):
  +-- HighValue MedicationRequest Approval
  +-- Mandatory Brand Approval

Authorization Tasks (1):
  +-- Authorization Approval
```

### 1.3 Screen Reuse Summary

7 detail screens serve 13 task types:

| Screen | Task Types Served | Count |
|--------|-------------------|-------|
| `InvoiceDetailScreen` | Invoice Gen, Discount, Reversal, Retrospect Init, Retrospect Appr, Invoice Cancel | 6 |
| `ReceiptDetailScreen` | Receipt Approval, Receipt Cancellation | 2 |
| `RefundDetailScreen` | Refund Approval | 1 |
| `UnbilledDocumentDetailScreen` | UnBilled Invoice Approval | 1 |
| `HighValueDetailScreen` | HighValue MedicationRequest Approval | 1 |
| `AuthorizationDetailScreen` | Authorization Approval | 1 |
| `LchmDetailScreen` | Mandatory Brand Approval | 1 |

---

## 2. Task Lifecycle State Machine

### 2.1 State Definitions

| State | Description | Queue Visibility | Owner |
|-------|-------------|-----------------|-------|
| `OPEN` | Task created, awaiting claim | GROUP TASKS, ALL TASKS | None (unassigned) |
| `CLAIMED` | Transitional state during atomic claim-start | (transitional) | Claiming user |
| `IN_PROGRESS` | Task claimed and started, active review | MY TASKS, ALL TASKS | Assigned user |
| `DONE` | Task completed (approved or rejected) | No longer in active queues | Completed by user |
| `CLOSED` | Task archived after processing | No longer visible | System |

### 2.2 State Transition Diagram

```
                    +------------------+
                    |   TASK CREATED   |
                    |  (billing event) |
                    +--------+---------+
                             |
                             v
                    +------------------+
                    |      OPEN        |
                    |   (Group Pool)   |
                    |  Visible in      |
                    |  GROUP TASKS     |
                    +--------+---------+
                             |
                      claim-start
                      (atomic op)
                             |
                    +--------v---------+
                    |     CLAIMED      |  <-- transitional
                    +--------+---------+
                             |
                       (automatic)
                             |
                    +--------v---------+
                    |   IN_PROGRESS    |
                    |    (Claimed)     |
                    |  Visible in      |
                    |  MY TASKS        |
                    +--------+---------+
                             |
               +-------------+-------------+
               |             |             |
               v             v             v
      +--------+---+ +------+------+ +----+-------+
      |  APPROVE   | |   REJECT    | |  REVERT    |
      |  (DONE)    | |  (DONE/     | | (release)  |
      |            | |   CLOSED)   | |            |
      +------------+ +------+------+ +-----+------+
                             |              |
                             v              v
                      Task closed     Back to OPEN
                      with reason     (Group Pool)
```

### 2.3 Transition Rules

| From | To | Action | API Endpoint | Guard Conditions |
|------|----|--------|-------------|-----------------|
| `OPEN` | `IN_PROGRESS` | `claim-start` | `POST /jbpm/tasks/{id}/claim-start` | User not document creator; task not already claimed |
| `IN_PROGRESS` | `DONE` | `approve` | jBPM complete with `approved=true` | Task owned by current user |
| `IN_PROGRESS` | `DONE`/`CLOSED` | `reject` | jBPM complete with `approved=false` | Task owned by current user; remarks provided |
| `IN_PROGRESS` | `OPEN` | `release` (revert) | `POST /jbpm/tasks/{id}/release` | Task owned by current user |
| `DONE` | `CLOSED` | (automatic) | System | Post-processing complete |

### 2.4 Guard Conditions

| Guard | Error Message | HTTP Status | Recovery |
|-------|---------------|-------------|----------|
| Task already claimed by another user | `"Task has been already claimed by other user..!!"` | `409 Conflict` | Refresh list, pick another |
| Document creator attempts self-approval | `"Document creator cannot approve the document. Please revert the task."` | `403 Forbidden` | Must be approved by different user |
| Refund mode not available | `"Cannot approve document, Refund mode is not available. Please revert the task."` | `400 Bad Request` | Set refund mode before approval |

---

## 3. Task Queues

### 3.1 MY TASKS (Personal Queue)

Tasks claimed by the current authenticated user.

- **API:** `GET /jbpm/tasks/personal`
- **Filter:** `actualOwner == currentUser.userId`
- **Behavior:** Tasks appear after successful `claim-start`; leave on approve, reject, or revert
- **Default sort:** `createdOn` descending (newest first)

### 3.2 GROUP TASKS

Tasks available in the user's group(s) that have not been claimed.

- **API:** `GET /jbpm/tasks/group`
- **Filter:** `taskStatus == OPEN` AND task's potential owners include user's group(s)
- **Behavior:** Tapping a task card navigates to `TaskDetailScreen` with "Claim" prompt; reverted tasks reappear here
- **Default sort:** `createdOn` descending

### 3.3 ALL TASKS (Supervisor View)

All tasks across the facility regardless of assignment status.

- **API:** `GET /jbpm/alltasks`
- **Filter:** All statuses (OPEN, CLAIMED, IN_PROGRESS)
- **Behavior:** Displays `actualOwner` name for claimed tasks, "(unclaimed)" for open tasks; available to supervisor/admin roles
- **Default sort:** `createdOn` descending

### 3.4 Queue Tab UI

The `AppBarTaskFilter` widget provides tab-based switching:

```
+--------------------------------------------------+
|  [ MY TASKS ]   GROUP TASKS    ALL TASKS         |
|  -----------                                     |
+--------------------------------------------------+
```

Switching tabs dispatches a new `LoadModuleTask` with the corresponding queue type. The active tab is highlighted with an underline indicator.

### 3.5 Queue Behavior Summary

```
GROUP Queue:
  - Shows tasks with status OPEN
  - Any eligible group member can claim
  - Task disappears from GROUP when claimed
  - Released (reverted) tasks reappear in GROUP

MY Queue:
  - Shows tasks with status IN_PROGRESS
  - Only shows tasks owned by current user
  - Task appears after successful claim-start
  - Task disappears after approve/reject/release

ALL Queue:
  - Shows tasks across all statuses
  - Read-only visibility for monitoring
  - Supervisor must still claim before acting
  - Filterable by task name, status, date
```

---

## 4. jBPM API Endpoints

### 4.1 GET `/jbpm/alltasks`

Fetch tasks across all queues.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | int | No | 0 | Page number (zero-based) |
| `size` | int | No | 20 | Page size |
| `status` | String | No | all | Comma-separated status filter |
| `taskName` | String | No | all 13 | Comma-separated task type filter |
| `unitCode` | String | Yes | -- | Hospital unit code |
| `sortBy` | String | No | `createdOn` | Sort field |
| `sortOrder` | String | No | `desc` | Sort direction (asc/desc) |

**Task name filter value (all 13 types):**
```
taskName=Invoice Generation Approval,Discount Approval,Receipt Approval,
Receipt Cancellation,Refund Approval,Reversal Invoice Approval,
Retrospect Invoice Initiation,Retrospect Invoice Approval,
UnBilled Invoice Approval,HighValue MedicationRequest Approval,
Authorization Approval,Mandatory Brand Approval,Invoice Cancellation
```

**Response `200`:**
```json
{
  "taskSummaryList": [
    {
      "taskId": 12345,
      "taskName": "Invoice Generation Approval",
      "taskStatus": "OPEN",
      "processInstanceId": 67890,
      "containerId": "athma_1.0.0",
      "actualOwner": null,
      "createdBy": "billing_system",
      "createdOn": "2026-04-22T10:00:00Z",
      "activationTime": "2026-04-22T10:00:00Z",
      "priority": 0,
      "processId": "invoice_approval_process",
      "description": "Invoice INV-2026-5567 for patient Rajesh Kumar",
      "subject": "Invoice Approval"
    }
  ],
  "totalCount": 100
}
```

### 4.2 GET `/jbpm/tasks/group`

Fetch GROUP queue tasks. Same parameters and response format as `/jbpm/alltasks`.

### 4.3 GET `/jbpm/tasks/personal`

Fetch MY TASKS queue. Same parameters and response format as `/jbpm/alltasks`.

### 4.4 POST `/jbpm/tasks/{taskId}/claim-start`

Atomic claim-and-start operation. Moves task from OPEN to IN_PROGRESS in a single API call to prevent race conditions.

**Path Parameter:** `taskId` (int)

**Request:**
```json
{
  "userId": "string"
}
```

**Response `200`:**
```json
{
  "taskId": 12345,
  "taskStatus": "IN_PROGRESS",
  "actualOwner": "sunita.billing",
  "message": "Task claimed and started successfully"
}
```

**Error Responses:**

| Status | Body | Cause |
|--------|------|-------|
| `409` | `"Task has been already claimed by other user..!!"` | Race condition -- another user claimed first (note: two dots, two bangs) |
| `403` | `"Document creator cannot approve the document. Please revert the task."` | Self-approval prevention guard |

### 4.5 POST `/jbpm/tasks/{taskId}/release`

Release a claimed task back to the group pool (revert action).

**Path Parameter:** `taskId` (int)

**Request:**
```json
{
  "userId": "string"
}
```

**Response `200`:**
```json
{
  "taskId": 12345,
  "taskStatus": "OPEN",
  "actualOwner": null,
  "message": "Task released successfully"
}
```

### 4.6 GET `/jbpm/tasks/{taskId}/process-variable`

Fetch the document data (process variables) attached to a task. The structure of `processVariables` varies by task type.

**Path Parameter:** `taskId` (int)

**Query Parameters:**
- `variableName` (String, optional) -- fetch a specific variable only

**Response `200`:**
```json
{
  "processVariables": {
    "documentNo": "INV-2026-5567",
    "documentType": "INVOICE",
    "invoiceData": { },
    "patientId": "PAT-001",
    "uhid": "NH-2026-00451",
    "unitCode": "UNIT3",
    "additionalData": { }
  }
}
```

---

## 5. Process Variables by Task Type

Each task type stores its document data in specific process variable keys:

| Task Type | Primary Variable Key | Document Model | Secondary Keys |
|-----------|---------------------|----------------|----------------|
| Invoice Generation Approval | `invoiceData` | `Invoice` | `documentNo`, `documentType` |
| Discount Approval | `invoiceData` | `Invoice` (with discount fields) | `discountDetails` |
| Receipt Approval | `receiptData` | `Receipt` | `documentNo` |
| Receipt Cancellation | `receiptData` | `Receipt` (with cancellation fields) | `cancellationDetails` |
| Refund Approval | `refundData` | `Refund` | `documentNo`, `receiptNo` |
| Reversal Invoice Approval | `invoiceData` | `Invoice` | `reversalDetails` |
| Retrospect Invoice Initiation | `invoiceData` | `Invoice` + `retrospectData` | `retrospectStage: 1` |
| Retrospect Invoice Approval | `invoiceData` | `Invoice` + `retrospectData` | `retrospectStage: 2` |
| UnBilled Invoice Approval | `unbilledData` | `UnbilledDocument` | `lineItems` |
| HighValue MedicationRequest | `medicationData` | `MedicationRequestModel` | `isHighValue: true` |
| Authorization Approval | `authorizationData` | `AuthorizationModel` | `invoiceNo` |
| Mandatory Brand Approval | `lchmData` | `LchmModel` | `genericName`, `brandName` |
| Invoice Cancellation | `invoiceData` | `Invoice` (with cancellation reason) | `cancellationReason` |

### Document API Mapping

When `TaskDetailBloc` loads task details, it fetches the associated document from the AMB service:

| Task Type | Document API | Endpoint |
|-----------|-------------|----------|
| Invoice-related (6 types) | `GET /amb/invoicelite` | Lightweight invoice fetch |
| Receipt-related (2 types) | `GET /amb/receipts` | Receipt fetch |
| Refund Approval | `GET /amb/refunds` | Refund fetch |
| UnBilled Invoice | `GET /amb/unbilled-documents` | Unbilled document fetch |
| HighValue Medication | `GET /amb/medication-request` | Single medication request |
| Authorization Approval | `GET /amb/invoicelite` | Authorization data from invoice |
| Mandatory Brand | `GET /amb/medication-request` | LCHM medication request |

---

## 6. TaskBloc State Machine

Manages the task list screen -- fetching, filtering, and refreshing task queues.

### 6.1 Events

| Event | Payload | Description |
|-------|---------|-------------|
| `LoadModuleTask` | `queueType: String`, `page: int`, `size: int`, `filters: TaskFilter?` | Fetch tasks for a specific queue (actual binary name, not `FetchTasksEvent`) |
| `RefreshTasksEvent` | `queueType: String` | Pull-to-refresh, resets page to 0 |

### 6.2 States

| State | Carries | Description |
|-------|---------|-------------|
| `TaskInitialState` | (none) | Initial state before any fetch |
| `TaskLoadingState` | (none) | API call in progress |
| `TaskFetched` | `tasks: List<Task>`, `totalCount: int`, `queueType: String` | Tasks loaded successfully (actual binary name, not `TaskLoadedState`) |
| `TaskErrorState` | `message: String` | Fetch failed with error |

### 6.3 State Transition Diagram

```
                     LoadModuleTask
TaskInitialState --------------------------------> TaskLoadingState
                                                       |
                                             +---------+---------+
                                             |                   |
                                             v                   v
                                       TaskFetched          TaskErrorState
                                             |                   |
                                 RefreshTasksEvent       RefreshTasksEvent
                                             |                   |
                                             v                   v
                                      TaskLoadingState    TaskLoadingState
                                             |                   |
                                             +--------+----------+
                                                      |
                                            +---------+---------+
                                            |                   |
                                            v                   v
                                       TaskFetched          TaskErrorState
```

### 6.4 TaskFilter Model

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `taskName` | `String?` | all 13 types | Filter by specific task type name |
| `status` | `String?` | all statuses | Filter by task status |
| `sortBy` | `String` | `createdOn` | Sort field |
| `sortOrder` | `String` | `desc` | Sort direction (asc/desc) |
| `unitCode` | `String` | (required) | Hospital unit code |
| `searchText` | `String?` | null | Free-text search |
| `dateFrom` | `String?` | null | Created after date |
| `dateTo` | `String?` | null | Created before date |

### 6.5 TaskListModel

Wrapper for paginated task list response.

| Field | Type | Description |
|-------|------|-------------|
| `tasks` | `List<Task>` | List of task summaries |
| `totalCount` | `int` | Total task count across all pages |
| `page` | `int` | Current page number |
| `size` | `int` | Page size |

---

## 7. TaskDetailBloc State Machine

Manages individual task operations: fetch detail, claim, approve, reject, revert.

### 7.1 Events

| Event | Payload | Description |
|-------|---------|-------------|
| `LoadTaskDetail` | `taskId: int` | Fetch process variables for task (actual binary name, not `FetchTaskDetailEvent`) |
| `ClaimButtonPressed` | `taskId: int`, `userId: String` | Claim and start task (actual binary name, not `ClaimTaskEvent`) |
| `ApproveORRejectButtonPressed` | `taskId: int`, `approved: bool`, `remarks: String?` | Single combined event for both approve and reject (NOT separate events; `approved` flag distinguishes the action) |
| `RevertButtonPressed` | `taskId: int`, `userId: String` | Release task back to group |
| `ShowRevertActionDialogBox` | (none) | Triggers the revert confirmation dialog display |

### 7.2 States

Actual binary states use **generic** action states, not per-action states (no `ClaimTaskLoadingState`, `ApproveTaskLoadingState`, etc.):

| State | Carries | Description |
|-------|---------|-------------|
| `TaskDetailInitialState` | (none) | Initial state |
| `TaskDetailLoadingState` | (none) | Fetching process variables |
| `TaskDetailLoadedState` | `task: Task`, `processVariables: Map<String, dynamic>` | Detail loaded |
| `TaskDetailErrorState` | `message: String` | Detail fetch failed |
| `TaskDetailLoadingErrorState` | `message: String` | Distinct loading-phase error (separate from `TaskDetailErrorState`) |
| `TaskActionSavingState` | (none) | Generic saving state for ALL actions (claim, approve, reject) |
| `TaskActionSucessState` | `taskId: int`, `message: String` | Generic success for ALL actions (note: typo "Sucess" is in actual code) |
| `TaskActionError` | `message: String` | Generic error for ALL actions |
| `RevertActionLoading` | (none) | Revert has its own loading state |
| `RevertActionState` | `taskId: int`, `message: String` | Revert has its own success state |

### 7.3 Complete State Transition Diagram

```
LoadTaskDetail --> TaskDetailLoadingState --> TaskDetailLoadedState
                                         +-> TaskDetailErrorState
                                         +-> TaskDetailLoadingErrorState

ClaimButtonPressed --------+
ApproveORRejectButtonPressed+---> TaskActionSavingState --> TaskActionSucessState
                                                        +-> TaskActionError

RevertButtonPressed --> RevertActionLoading --> RevertActionState
                                            +-> TaskActionError
```

### 7.4 Action Flow Sequence

```
1. User taps task card in list
       |
       v
2. LoadTaskDetail(taskId)
       |
       v
3. TaskDetailLoadingState
       |
       +-- Success: GET /jbpm/tasks/{taskId}/process-variable
       |       |
       |       v
       |   TaskDetailLoadedState
       |       |
       |       +-- Task is OPEN (unclaimed)
       |       |       |
       |       |       v
       |       |   Show "Claim" button only
       |       |       |
       |       |       v (user taps Claim)
       |       |   Confirmation: "Would you like to claim the task?"
       |       |       |
       |       |       v (user confirms)
       |       |   ClaimButtonPressed -> POST /jbpm/tasks/{taskId}/claim-start
       |       |       |
       |       |       +-- TaskActionSucessState -> Show Approve/Reject/Revert
       |       |       +-- TaskActionError -> SnackBar with error
       |       |
       |       +-- Task is IN_PROGRESS (claimed by current user)
       |               |
       |               v
       |           Show Approve / Reject / Revert buttons
       |               |
       |               +-- Approve -> ApproveORRejectButtonPressed(approved=true)
       |               +-- Reject  -> Validate remarks -> ApproveORRejectButtonPressed(approved=false)
       |               +-- Revert  -> ShowRevertActionDialogBox -> RevertButtonPressed
       |
       +-- Failure
               |
               v
           TaskDetailErrorState -> SnackBar with error
```

---

## 8. Task Model

### 8.1 Task (jBPM Response Mapping)

| Field | Type | jBPM JSON Key | Description |
|-------|------|--------------|-------------|
| `taskId` | `int` | `task-id` | jBPM task identifier |
| `taskName` | `String` | `task-name` | One of 13 approval type names |
| `taskStatus` | `String` | `task-status` | OPEN / CLAIMED / IN_PROGRESS / DONE / CLOSED |
| `processInstanceId` | `int` | `task-proc-inst-id` | jBPM process instance ID |
| `containerId` | `String` | `task-container-id` | jBPM container (e.g., `athma_1.0.0`) |
| `actualOwner` | `String?` | `task-actual-owner` | User who claimed (null if unclaimed) |
| `createdBy` | `String` | `task-created-by` | System or user that created the task |
| `createdOn` | `String` | `task-created-on` | ISO-8601 creation timestamp |
| `activationTime` | `String` | `task-activation-time` | ISO-8601 activation timestamp |
| `priority` | `int` | `task-priority` | Priority level (0 = normal) |
| `processId` | `String` | `task-proc-def-id` | Process definition identifier |
| `description` | `String?` | `task-description` | Human-readable task description |
| `subject` | `String?` | `task-subject` | Task subject line |
| `documentNo` | `String?` | derived from processVariables | Linked document number |
| `patientId` | `String?` | derived from processVariables | Linked patient ID |
| `uhid` | `String?` | derived from processVariables | Patient UHID |
| `unitCode` | `String?` | derived from processVariables | Hospital unit code |
| `processVariables` | `Map<String, dynamic>?` | separate API call | Full document data payload |

### 8.2 TaskDetailModel

Extended model used in `TaskDetailLoadedState` that includes resolved process variables.

| Field | Type | Description |
|-------|------|-------------|
| `task` | `Task` | Base task summary |
| `processVariables` | `Map<String, dynamic>` | Deserialized document data |
| `invoiceData` | `Invoice?` | Parsed if task is invoice-related |
| `receiptData` | `Receipt?` | Parsed if task is receipt-related |
| `refundData` | `Refund?` | Parsed if task is refund-related |
| `unbilledData` | `UnbilledDocument?` | Parsed if task is unbilled-related |
| `medicationData` | `MedicationRequestModel?` | Parsed if task is medication-related |
| `authorizationData` | `AuthorizationModel?` | Parsed if task is authorization-related |
| `lchmData` | `LchmModel?` | Parsed if task is mandatory brand |

### 8.3 TaskLineItem

| Field | Type | Description |
|-------|------|-------------|
| `lineItemId` | `String` | Line item ID |
| `serviceCode` | `String` | Service code |
| `serviceName` | `String` | Service description |
| `quantity` | `int` | Quantity |
| `unitPrice` | `double` | Unit price |
| `amount` | `double` | Line total (quantity x unitPrice) |
| `discount` | `double?` | Applied discount amount |
| `netAmount` | `double` | Net amount after discount |
| `taxAmount` | `double?` | Tax amount |
| `departmentCode` | `String?` | Originating department |
| `remarks` | `String?` | Line-level remarks |

---

## 9. Task Card UI Layout

### 9.1 Task List Card (TaskScreen)

```
+--------------------------------------------------+
|  TASK TYPE NAME                     DD MMM YYYY  |
|  ------------------------------------------------|
|  Patient: [Full Name]                            |
|  MRN: [UHID]                                     |
|  Amount: Rs [comma-formatted amount]             |
|  Status: [OPEN / CLAIMED / IN_PROGRESS]          |
|  Claimed by: [Owner Name]  (if claimed)          |
+--------------------------------------------------+
```

Card fields vary by task type:
- Invoice tasks: show `grossAmount` or `netAmount`
- Receipt tasks: show `receiptAmount`
- Refund tasks: show `refundAmount`
- Unbilled tasks: show `unbilledAmount`
- Medication tasks: show `amount`
- Authorization tasks: show `authorizedAmount`

### 9.2 Task Detail Screen Layout

```
+--------------------------------------------------+
|  <-- Back          TASK TYPE NAME                |
+--------------------------------------------------+
|                                                  |
|  Patient Information                             |
|  +----------------------------------------------+|
|  |  Name: [Full Name]                           ||
|  |  MRN: [UHID]                                 ||
|  |  Encounter: [Encounter No]                   ||
|  +----------------------------------------------+|
|                                                  |
|  Financial Details                               |
|  +----------------------------------------------+|
|  |  [Document-specific fields rendered           ||
|  |   based on taskName -- see section 10]        ||
|  +----------------------------------------------+|
|                                                  |
|  Line Items (if applicable)                      |
|  +----------------------------------------------+|
|  |  Service         Qty   Rate    Amount         ||
|  |  -------------------------------------------  ||
|  |  [Item 1]         1   1,000    1,000          ||
|  |  [Item 2]         2     500    1,000          ||
|  +----------------------------------------------+|
|                                                  |
|  Remarks: [text field, mandatory for reject]     |
|                                                  |
|  +---------+ +---------+ +---------+            |
|  | APPROVE | |  REJECT | |  REVERT |            |
|  +---------+ +---------+ +---------+            |
+--------------------------------------------------+
```

**Button visibility rules:**
- OPEN task (unclaimed): Only "CLAIM" button shown
- IN_PROGRESS (claimed by current user): APPROVE, REJECT, REVERT buttons shown
- IN_PROGRESS (claimed by another user): No action buttons (read-only view)
- ALL TASKS queue: view only; must claim first to act

---

## 10. Approval Type Detail Screens

### 10.1 Invoice Generation Approval (InvoiceDetailScreen)

| Field Displayed | Source Field | Format |
|-----------------|-------------|--------|
| Invoice No | `invoice.invoiceNo` | Plain text |
| Invoice Date | `invoice.invoiceDate` | DD MMM YYYY |
| Gross Amount | `invoice.grossAmount` | Rs [comma-formatted] |
| Hospital Tariff | `invoice.hospitalTariff` | Rs [comma-formatted] |
| Tax Amount | `invoice.taxAmount` | Rs [comma-formatted] |
| Patient Discount | `invoice.patientDiscount` | -Rs [comma-formatted] |
| Sponsor Discount | `invoice.sponsorDiscount` | -Rs [comma-formatted] |
| Net Amount | `invoice.netAmount` | Rs [comma-formatted] |
| Patient Payable | `invoice.patientPayable` | Rs [comma-formatted] |
| Sponsor Payable | `invoice.sponsorPayable` | Rs [comma-formatted] |
| Total Amount | `invoice.totalAmount` | Rs [comma-formatted] |
| Line Items | `invoice.lineItems` | Scrollable table |

### 10.2 Discount Approval (InvoiceDetailScreen)

Additional fields beyond standard invoice view:

| Field Displayed | Source Field | Format |
|-----------------|-------------|--------|
| Original Invoice Amount | `invoice.originalInvoiceAmt` | Rs [comma-formatted] |
| Updated Invoice Amount | `invoice.updatedInvoiceAmt` | Rs [comma-formatted] |
| Discretionary Discount | `invoice.discretionaryDiscount` | Rs [comma-formatted] |
| Non-Discretionary Discount | `invoice.nonDiscretionaryDiscount` | Rs [comma-formatted] |
| Plan Discount | `invoice.planDiscountAmount` | Rs [comma-formatted] |
| Total User Discount % | `invoice.totalUserDiscountPercentage` | [value]% |
| Patient Discount With Auth | `invoice.patientDiscountWithAuth` | Rs [comma-formatted] |
| Sponsor Discount With Auth | `invoice.sponsorDiscountWithAuth` | Rs [comma-formatted] |

### 10.3 Receipt Approval / Cancellation (ReceiptDetailScreen)

| Field Displayed | Source Field | Shown For |
|-----------------|-------------|-----------|
| Receipt No | `receipt.receiptNo` | Both |
| Invoice No | `receipt.invoiceNo` | Both |
| Receipt Amount | `receipt.receiptAmount` | Both |
| Payment Mode | `receipt.paymentMode` | Both |
| Receipt Date | `receipt.receiptDate` | Both |
| Receipt Status | `receipt.receiptStatus` | Both |
| Cancellation Amount | `receipt.cancellationAmount` | Cancellation only |
| Reason for Cancellation | `receipt.reasonForCancellation` | Cancellation only |

### 10.4 Refund Approval (RefundDetailScreen)

| Field Displayed | Source Field |
|-----------------|-------------|
| Refund No | `refund.refundNo` |
| Receipt No | `refund.receiptNo` |
| Invoice No | `refund.invoiceNo` |
| Refund Amount | `refund.refundAmount` |
| Refund Mode | `refund.refundMode` |
| Refund Date | `refund.refundDate` |
| Reason for Refund | `refund.reasonForRefund` |
| Refund Status | `refund.refundStatus` |

### 10.5 UnBilled Invoice Approval (UnbilledDocumentDetailScreen)

| Field Displayed | Source Field |
|-----------------|-------------|
| Document No | `unbilled.documentNo` |
| Patient Name | `unbilled.patientName` |
| UHID | `unbilled.uhid` |
| Encounter No | `unbilled.encounterNo` |
| Unbilled Amount | `unbilled.unbilledAmount` |
| Service Date | `unbilled.serviceDate` |
| Department | `unbilled.departmentCode` |
| Status | `unbilled.status` |
| Line Items | `unbilled.lineItems` |

### 10.6 HighValue Medication (HighValueDetailScreen)

| Field Displayed | Source Field |
|-----------------|-------------|
| Request ID | `medicationData.requestId` |
| Medication Name | `medicationData.medicationName` |
| Dosage | `medicationData.dosage` |
| Unit Cost | `medicationData.amount` |
| Quantity | `medicationData.quantity` |
| Total Cost | computed: `amount * quantity` |
| Is High Value | `medicationData.isHighValue` |
| Clinical Justification | `medicationData.justification` |
| Status | `medicationData.status` |

### 10.7 Authorization Approval (AuthorizationDetailScreen)

| Field Displayed | Source Field |
|-----------------|-------------|
| Authorization ID | `authorizationData.authorizationId` |
| Requested Amount | `authorizationData.requestedAmount` |
| Authorized Amount | `authorizationData.authorizationAmount` |
| Patient Responsibility | computed: `requestedAmount - authorizationAmount` |
| Valid From | `authorizationData.validFrom` |
| Valid To | `authorizationData.validTo` |
| Status | `authorizationData.status` |
| Remarks | `authorizationData.remarks` |

**Amount recalculation:** The `AuthorizationDetailScreen` may display recalculated amounts when actual procedure costs differ from estimates. Approved authorizations trigger recalculation of all `WithAuth` fields on the linked invoice (see 04_BILLING_FINANCE.md section on authorization impact).

### 10.8 Mandatory Brand Approval (LchmDetailScreen)

LCHM = Low Cost High Margin / mandatory brand medication.

| Field Displayed | Source Field |
|-----------------|-------------|
| Generic Name | `lchmData.genericName` |
| Requested Brand | `lchmData.brandName` |
| Generic Cost | `lchmData.genericCost` |
| Brand Cost | `lchmData.brandCost` |
| Cost Difference | computed: `brandCost - genericCost` |
| Doctor's Justification | `lchmData.justification` |
| Dosage | `lchmData.dosage` |
| Status | `lchmData.status` |

---

## 11. Retrospect Invoice -- 2-Stage Approval

Retrospect invoices are post-discharge billing adjustments. They require TWO levels of approval because they modify a finalized bill.

### 11.1 Two-Stage Flow

```
Retrospect request submitted (POST /amb/invoice/retrospect)
       |
       v
Stage 1: Retrospect Invoice Initiation
       |   Assigned to: first-level reviewer group
       |
       +-- Rejected -> Terminal (no Stage 2 created)
       |
       +-- Approved
               |
               v
           Stage 2: Retrospect Invoice Approval
               |   Auto-created by jBPM
               |   Assigned to: senior reviewer group
               |
               +-- Rejected -> Terminal
               +-- Approved -> Retrospect finalized, invoice updated
```

### 11.2 Rules

| Rule | Enforcement |
|------|------------|
| Stage 1 must complete before Stage 2 exists | jBPM process definition |
| Stage 1 rejection prevents Stage 2 creation | jBPM process definition |
| Stage 1 approver cannot be Stage 2 approver | Server-side validation |
| Both stages share the same `InvoiceDetailScreen` | UI routing |
| Stage number indicated in task description | `task.description` field |

### 11.3 Process Variables

Both stages carry the same process variables:

| Variable | Stage 1 Value | Stage 2 Value |
|----------|--------------|---------------|
| `documentType` | `RETROSPECT_INITIATION` | `RETROSPECT_APPROVAL` |
| `retrospectStage` | `1` | `2` |
| `invoiceData` | Full invoice with adjustments | Same |
| `retrospectData` | Adjustment details | Same |
| `stage1ApprovedBy` | null | Stage 1 approver userId |

---

## 12. Task Filtering and Sorting

### 12.1 Filter Options

| Filter | UI Control | API Parameter | Values |
|--------|-----------|---------------|--------|
| Queue type | Tab bar (My/Group/All) | Different endpoint per queue | 3 endpoints |
| Task type | Dropdown / chip selector | `taskName` query param | Any of 13 task names |
| Status | Chip selector | `status` query param | OPEN, IN_PROGRESS |
| Date range | Date picker | `dateFrom`, `dateTo` | ISO dates |
| Free text | Search bar | `searchText` | Patient name, document no |

### 12.2 Sort Options

| Sort Field | API Value | Description |
|------------|-----------|-------------|
| Created Date | `createdOn` | Task creation timestamp (default) |
| Priority | `priority` | Task priority level |
| Task Name | `taskName` | Alphabetical by type |

Sort direction toggles between `asc` and `desc`.

### 12.3 Pagination

- **Page size:** 20 tasks per page
- **Infinite scroll:** `LoadModuleTask` dispatched with incremented `page` when user scrolls to bottom
- **Pull-to-refresh:** `RefreshTasksEvent` resets to page 0

---

## 13. Confirmation Dialogs and UI Messages

### 13.1 Claim Confirmation

```
+------------------------------------+
|                                    |
|  "Would you like to claim the      |
|   task?"                           |
|                                    |
|     [ Cancel ]    [ Claim ]        |
+------------------------------------+
```

### 13.2 Revert Confirmation

```
+------------------------------------+
|                                    |
|  "Do you want to revert task?"     |
|                                    |
|     [ Cancel ]    [ Revert ]       |
+------------------------------------+
```

### 13.3 Reject Requires Remarks

```
+------------------------------------+
|                                    |
|  Remarks:                          |
|  +------------------------------+  |
|  | [text field - mandatory]     |  |
|  |                              |  |
|  +------------------------------+  |
|                                    |
|     [ Cancel ]    [ Reject ]       |
+------------------------------------+
```

If remarks field is empty when Reject is tapped: `"Please enter remarks"` validation error shown as SnackBar.

### 13.4 Success Messages

| Action | Success Message |
|--------|----------------|
| Claim | `"Task claimed and started successfully"` |
| Approve | `"Task approved successfully"` |
| Reject | `"Task rejected successfully"` |
| Revert | `"Task has been reverted"` |

---

## 14. Validation Rules

| # | Rule | Error Message | Enforcement |
|---|------|---------------|-------------|
| 1 | Task must be claimed before approve/reject/revert | (UI: buttons hidden) | Client-side |
| 2 | Reject requires non-empty remarks | `"Please enter remarks"` | Client-side |
| 3 | Self-approval prevention | `"Document creator cannot approve the document. Please revert the task."` | Server-side (jBPM) |
| 4 | Concurrent claim prevention | `"Task has been already claimed by other user..!!"` | Server-side (jBPM) |
| 5 | Refund mode validation | `"Cannot approve document, Refund mode is not available. Please revert the task."` | Server-side |
| 6 | Invoice amounts are read-only | (UI: fields non-editable) | Client-side |
| 7 | Refund amount must not exceed original invoice | Server-side validation | Server-side |
| 8 | Discount percentage must be 0-100% | Server-side validation | Server-side |
| 9 | Retrospect Stage 2 needs different reviewer than Stage 1 | Server-side validation | Server-side |
| 10 | Supervisor can view all tasks but must claim before acting | (UI: claim-before-action enforced) | Client-side |

---

## 15. Service & Repository Layer

### 15.1 TaskService

```dart
class TaskService {
  Future<TaskListModel> fetchAllTasks(String unitCode, int page, int size,
      {String? taskName, String? status, String? sortBy, String? sortOrder});
  Future<TaskListModel> fetchGroupTasks(String unitCode, int page, int size,
      {String? taskName, String? status, String? sortBy, String? sortOrder});
  Future<TaskListModel> fetchPersonalTasks(String unitCode, int page, int size,
      {String? taskName, String? status, String? sortBy, String? sortOrder});
  Future<Map<String, dynamic>> claimAndStartTask(int taskId, String userId);
  Future<Map<String, dynamic>> releaseTask(int taskId, String userId);
  Future<Map<String, dynamic>> getProcessVariables(int taskId,
      {String? variableName});
  Future<void> approveTask(int taskId, {String? remarks});
  Future<void> rejectTask(int taskId, String remarks);
  Future<void> executeWorkflow(int taskId, Map<String, dynamic> params);
}
```

### 15.2 TaskRepository

```dart
class TaskRepository {
  final TaskService _taskService;

  Future<TaskListModel> getTasks(String queueType, String unitCode,
      int page, int size, TaskFilter? filter);
  Future<TaskDetailModel> getTaskDetail(int taskId);
  Future<void> claimTask(int taskId, String userId);
  Future<void> approveTask(int taskId, {String? remarks});
  Future<void> rejectTask(int taskId, String remarks);
  Future<void> revertTask(int taskId, String userId);
}
```

### 15.3 Error Handling Pattern

```dart
// BLoC pattern -- all task actions
try {
  final result = await repository.someOperation();
  emit(SuccessState(data: result));
} catch (e) {
  emit(ErrorState(message: e.toString()));
}

// UI consumption pattern
BlocListener<TaskDetailBloc, TaskDetailState>(
  listener: (context, state) {
    if (state is TaskActionError) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(state.message)),
      );
    }
  },
)
```

---

## 16. Error Messages

| # | Message | Trigger | HTTP Code |
|---|---------|---------|-----------|
| 1 | `"Task has been already claimed by other user..!!"` | Concurrent claim by another user (note: two dots, two bangs in actual binary) | 409 |
| 2 | `"Document creator cannot approve the document. Please revert the task."` | Self-approval attempt | 403 |
| 3 | `"Cannot approve document, Refund mode is not available. Please revert the task."` | Refund mode missing | 400 |
| 4 | `"Task not found"` | Task ID no longer valid | 404 |
| 5 | `"Failed to claim task"` | jBPM claim API failure | 5xx |
| 6 | `"Failed to approve task"` | jBPM approve API failure | 5xx |
| 7 | `"Failed to reject task"` | jBPM reject API failure | 5xx |
| 8 | `"Failed to revert task"` | jBPM revert/release API failure | 5xx |
| 9 | `"Please enter remarks"` | Reject without comments | client-side |
| 10 | `"Task has been reverted"` | Info message after successful revert | -- |
| 11 | `"Unauthorized to perform this action"` | Role-based access denied | 403 |
| 12 | `"Please select a user to reassign"` | Reassign without selecting target | client-side |

### Retry Strategy

| Error Type | Retry Behavior |
|------------|---------------|
| Claim failures (409) | Do NOT retry. Inform user and refresh task list |
| Network errors | Retry up to 3 times with exponential backoff |
| Token expiry (401) | Auto-refresh token via Dio interceptor, then retry |
| Server errors (5xx) | Show error message, allow manual retry |

---

## 17. Screen-to-BLoC Mapping

| Screen | BLoC | Events Used |
|--------|------|-------------|
| `TaskScreen` | `TaskBloc` | `LoadModuleTask`, `RefreshTasksEvent` |
| `TaskDetailScreen` | `TaskDetailBloc` | `LoadTaskDetail`, `ClaimButtonPressed`, `ApproveORRejectButtonPressed`, `RevertButtonPressed`, `ShowRevertActionDialogBox` |
| `InvoiceDetailScreen` | `TaskDetailBloc` | (rendered within TaskDetailScreen flow) |
| `ReceiptDetailScreen` | `TaskDetailBloc` | (rendered within TaskDetailScreen flow) |
| `RefundDetailScreen` | `TaskDetailBloc` | (rendered within TaskDetailScreen flow) |
| `UnbilledDocumentDetailScreen` | `TaskDetailBloc` | (rendered within TaskDetailScreen flow) |
| `HighValueDetailScreen` | `TaskDetailBloc` | (rendered within TaskDetailScreen flow) |
| `LchmDetailScreen` | `TaskDetailBloc` | (rendered within TaskDetailScreen flow) |
| `AuthorizationDetailScreen` | `TaskDetailBloc` | (rendered within TaskDetailScreen flow) |

### Widget Dependencies

| Widget | Purpose | Used In |
|--------|---------|---------|
| `AppBarTaskFilter` | Tab bar for queue switching (My/Group/All) | `TaskScreen` |
| `BadgeWidget` | Task count badge overlay | `HomeScreen`, `TaskScreen` |
| `task_detail_comment.dart` | Comment display and entry on task detail | `TaskDetailScreen` |
| `task_detail_remarks.dart` | Remarks display and entry on task detail | `TaskDetailScreen` |
| `task_detail_text.dart` | Text field display on task detail | `TaskDetailScreen` |
| `task_filter.dart` | Task filtering controls | `TaskScreen` |
| `task_line_item.dart` | Line item row rendering in task detail | `TaskDetailScreen` |

> **Note:** `ReassignWidget` does NOT belong to the task module. It is located at `package:ahamapp/screens/chat/widgets/reassign_widget.dart` and is used in the chat module for conversation reassignment.

### Comment Integration

Task detail screens support comments via the `Comment` model (`Comment.fromJson` confirmed in binary). Comments are fetched from the COM service endpoint `GET /com/api/_search/comments` and displayed in the `task_detail_comment.dart` widget.

### Workflow Method Summary

The `TaskService` exposes 7 workflow methods (not 6):

| # | Method | Purpose |
|---|--------|---------|
| 1 | `fetchAllTasks` | ALL TASKS queue |
| 2 | `fetchGroupTasks` | GROUP TASKS queue |
| 3 | `fetchPersonalTasks` | MY TASKS queue |
| 4 | `claimAndStartTask` | Atomic claim-start |
| 5 | `releaseTask` | Revert / release |
| 6 | `getProcessVariables` | Fetch document data |
| 7 | `executeWorkflow` | Generic base method for workflow execution (approve/reject dispatched through this) |

---

*End of Task Management Specification*
