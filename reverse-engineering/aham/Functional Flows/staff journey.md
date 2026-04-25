# AHAM Staff Journey -- Complete Functional Flow Map

> **App:** AHAM (org.nh.prod.aham) v2.6.1 (Build 10513)
> **Client:** Narayana Health -- Internal Hospital Administration Staff
> **Stack:** Flutter/Dart, BLoC pattern, jBPM workflow engine, ACS chat, Firebase
> **Reconstructed from:** Binary analysis of libapp.so, Java plugin layer, AndroidManifest, Firebase config
> **Last updated:** 2026-04-22

---

## Table of Contents

1. [Master Journey -- Staff Daily Workflow](#1-master-journey)
2. [Task Approval Journey](#2-task-approval-journey)
3. [Chat Conversation Journey](#3-chat-conversation-journey)
4. [Outreach Camp Journey](#4-outreach-camp-journey)
5. [Billing Document Hierarchy](#5-billing-document-hierarchy)
6. [Status Machines -- All Entity Lifecycles](#6-status-machines)
7. [Data Flow Architecture](#7-data-flow-architecture)
8. [Cross-Cutting Concerns](#8-cross-cutting-concerns)
9. [Complete BLoC Registry](#9-complete-bloc-registry)
10. [Complete API Registry](#10-complete-api-registry)
11. [Screen Inventory](#11-screen-inventory)

---

## 1. Master Journey

The complete lifecycle of a staff member's daily interaction with AHAM, from cold launch to productive work.

### 1.1 App Launch Decision Tree

```
App Opens (cold start)
    |
    +-- Is client_baseUrl in SharedPreferences?
    |       |
    |       +-- NO --> CLIENT SETUP SCREEN
    |       |           |
    |       |           +-- User enters org code (e.g., "NH")
    |       |           +-- Event: FetchDomain(orgCode)
    |       |           +-- API: GET /api/registry/_fetch-domain?org=NH
    |       |           +-- Store client_baseUrl --> LOGIN SCREEN
    |       |
    |       +-- YES
    |             |
    |             +-- Is access_token in SharedPreferences?
    |             |       |
    |             |       +-- NO --> LOGIN SCREEN
    |             |       |
    |             |       +-- YES
    |             |             |
    |             |             +-- Is token still valid (exp > now + 60s)?
    |             |             |       |
    |             |             |       +-- YES --> POST-LOGIN SETUP --> HOME
    |             |             |       |
    |             |             |       +-- NO
    |             |             |             |
    |             |             |             +-- Try refresh via POST /api/reload/token
    |             |             |             |       |
    |             |             |             |       +-- SUCCESS --> HOME
    |             |             |             |       |
    |             |             |             |       +-- FAIL --> LOGIN SCREEN
```

### 1.2 Full Staff Daily Workflow

```
+===========================================================================+
||                     AHAM STAFF DAILY WORKFLOW                            ||
+===========================================================================+
|                                                                           |
|  PHASE 1: AUTHENTICATION                                                  |
|  ┌──────────┐    ┌──────────┐    ┌──────────────┐    ┌───────────────┐   |
|  │  CLIENT   │    │          │    │  POST-LOGIN  │    │  FACILITY     │   |
|  │  SETUP    │--->│  LOGIN   │--->│    SETUP     │--->│  SELECTION    │   |
|  │ (1-time)  │    │          │    │  (implicit)  │    │  (if multi)   │   |
|  └──────────┘    └──────────┘    └──────────────┘    └───────┬───────┘   |
|       |                |               |                     |            |
|  org code +        username +      1. Store tokens       1 org? skip     |
|  fetch domain      password        2. Register FCM       >1 org? pick    |
|  (persists         (POST login)    3. Init ACS chat                      |
|   forever)                         4. Fetch facilities                   |
|                                                                           |
|  PHASE 2: HOME DASHBOARD                                                  |
|  ┌────────────────────────────────────────────────────────────────────┐   |
|  │                        HOME SCREEN                                 │   |
|  │                                                                    │   |
|  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   |
|  │   │   TASKS      │  │    CHAT     │  │   OUTREACH  │              │   |
|  │   │  (pending    │  │  (unread    │  │   CAMPS     │              │   |
|  │   │   approvals) │  │   messages) │  │  (active)   │              │   |
|  │   └──────┬───────┘  └──────┬──────┘  └──────┬──────┘              │   |
|  │          |                 |                 |                      │   |
|  │          v                 v                 v                      │   |
|  │   13 approval        NH Care           Field medical               │   |
|  │   types from         Assistant         camp operations             │   |
|  │   jBPM workflow      (ACS chat)        (patient reg)               │   |
|  │                                                                    │   |
|  │   Side Menu:                                                       │   |
|  │   ├── Preferences (language, facility switch)                      │   |
|  │   ├── Notifications (OS-level controls only)                       │   |
|  │   ├── Privacy Policy (WebView)                                     │   |
|  │   ├── FAQ / About Us                                               │   |
|  │   └── Logout                                                       │   |
|  └────────────────────────────────────────────────────────────────────┘   |
|                                                                           |
+===========================================================================+
```

### 1.3 Post-Login Setup Sequence

```
Login API returns 200
    |
    v
1. Store tokens in SharedPreferences          --> MUST succeed
   ├── access_token
   ├── refresh_token
   ├── logged-in-id
   ├── logged-in-login
   ├── logged-in-name
   └── logged-in-user (JSON)
    |
    v
2. Register FCM device session (parallel)     --> CAN fail silently
   POST /api/device-session
   Body: { login, deviceId, fcmToken, appId: "AHAM", osType: "ANDROID" }
    |
3. Initialize ACS chat connection (parallel)  --> CAN fail silently
   Method Channel: initACS(endPoint, accessToken, threadId)
    |
    v
4. Fetch user facilities                      --> MUST succeed
   GET /mdm/api/logged-in/organizations
    |
    +-- 1 organization --> Skip selection, go to Home
    |
    +-- >1 organizations --> Show facility selection screen
            |
            v
        User taps a facility
            |
            v
        Store in SharedPreferences (logged-in-unit)
            |
            v
        Home screen loads
```

### 1.4 Logout Sequence

```
User taps Logout
    |
    v
1. SharedPreferences._purge()
   Removes: access_token, refresh_token, logged-in-id,
            logged-in-login, logged-in-name, logged-in-unit,
            logged-in-user, fcm_token
   PRESERVES: client_baseUrl (so org setup is not repeated)
    |
    v
2. ACS disconnect (closes WebSocket)
    |
    v
3. DELETE /api/device-session/{deviceId} (deregister FCM)
    |
    v
4. Navigate to LoginScreen
   pushNamedAndRemoveUntil('/', (route) => false)
    |
    v
5. ObjectBox data retained (chat history preserved for next login)
```

---

## 2. Task Approval Journey

### 2.1 Overview

Tasks are approval requests generated by hospital back-office systems (billing, pharmacy, finance). Every financial document requires human sign-off via jBPM workflow before it becomes final. The AHAM app is the mobile front-end for these approvers.

### 2.2 The 13 Approval Types

```
TASK TYPE REGISTRY
==================

 #  | taskName (exact string from API)         | Category      | Detail Screen
----+------------------------------------------+---------------+------------------------------
  1 | Invoice Generation Approval              | Invoice       | InvoiceDetailScreen
  2 | Discount Approval                        | Invoice       | InvoiceDetailScreen
  3 | Receipt Approval                         | Receipt       | ReceiptDetailScreen
  4 | Receipt Cancellation                     | Receipt       | ReceiptDetailScreen
  5 | Refund Approval                          | Refund        | RefundDetailScreen
  6 | Reversal Invoice Approval                | Invoice       | InvoiceDetailScreen
  7 | Retrospect Invoice Initiation            | Invoice       | InvoiceDetailScreen
  8 | Retrospect Invoice Approval              | Invoice       | InvoiceDetailScreen
  9 | UnBilled Invoice Approval                | Unbilled      | UnbilledDocumentDetailScreen
 10 | HighValue MedicationRequest Approval     | Medication    | HighValueDetailScreen
 11 | Authorization Approval                   | Authorization | AuthorizationDetailScreen
 12 | Mandatory Brand Approval                 | Medication    | LchmDetailScreen
 13 | Invoice Cancellation                     | Invoice       | InvoiceDetailScreen

Key: 6 of 13 types share InvoiceDetailScreen (adapts layout by taskName).
     "HighValue MedicationRequest  Approval" has a double space in the binary.
```

### 2.3 Three Task Queues

```
+----------------------------------------------------------+
|                    TASK QUEUES                             |
+----------------------------------------------------------+
|                                                           |
|  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐   |
|  │  My Tasks     │  │  Group Tasks  │  │  All Tasks   │   |
|  │  (PERSONAL)   │  │  (GROUP)      │  │  (ALL)       │   |
|  ├──────────────┤  ├───────────────┤  ├──────────────┤   |
|  │ Tasks I have  │  │ Tasks my role │  │ Everything   │   |
|  │ claimed       │  │ group can     │  │ across all   │   |
|  │               │  │ claim         │  │ queues       │   |
|  │ Status:       │  │ Status:       │  │ Status:      │   |
|  │ IN_PROGRESS   │  │ OPEN          │  │ ALL          │   |
|  └──────────────┘  └───────────────┘  └──────────────┘   |
|                                                           |
|  API Endpoints:                                           |
|  PERSONAL: GET /mdm/api/jbpm/tasks/personal               |
|  GROUP:    GET /mdm/api/jbpm/tasks/group                   |
|  ALL:      GET /mdm/api/jbpm/tasks/all                     |
|                                                           |
|  All paginated: ?page=0&size=20&unitCode=HYD01            |
|  BLoC Event: LoadModuleTask(queueType, page, size)        |
+----------------------------------------------------------+
```

### 2.4 Happy Path: Claim and Approve

```
Step 1: Open Task Management
         Event: LoadModuleTask(queueType: "GROUP", page: 0, size: 20)
         BLoC:  TaskBloc --> TaskLoadingState --> TaskFetched(tasks, totalCount)
         API:   GET /mdm/api/jbpm/tasks/group?page=0&size=20&unitCode=HYD01
              |
              v
Step 2: Tap a task card (e.g., "Invoice Generation Approval - INV-2026-001")
         Event: LoadTaskDetail(taskId: 12345)
         BLoC:  TaskDetailBloc --> TaskDetailLoadingState
         APIs:  (parallel)
           a) GET /api/jbpm/tasks/12345/process-variable
           b) GET /amb/invoicelite?documentNo=INV-2026-001
         BLoC:  --> TaskDetailLoadedState(task, processVariables)
              |
              v
Step 3: Task is OPEN -- "Claim" button visible
         User taps "Claim"
         Dialog: "Would you like to claim the task?" [Cancel] [Claim]
         Event: ClaimButtonPressed(taskId: 12345, userId: "rohit.g")
         BLoC:  --> TaskActionSavingState
         API:   POST /api/jbpm/tasks/12345/claim-start { "userId": "rohit.g" }
         BLoC:  --> TaskActionSucessState (sic -- typo preserved from source)
         UI:    Claim disappears, [Approve] [Reject] [Revert] appear
              |
              v
Step 4: Review document details (amounts, line items, patient info)
              |
              v
Step 5: Tap "Approve" (NO confirmation dialog -- direct action)
         Event: ApproveORRejectButtonPressed(taskId: 12345, approved: true)
         BLoC:  --> TaskActionSavingState
         API:   executeWorkflow with approved=true
         jBPM:  Task status --> DONE --> CLOSED (automatic)
         BLoC:  --> TaskActionSucessState("Task approved successfully")
         Nav:   Back to task list + RefreshTasksEvent
```

### 2.5 Reject Path (Remarks Required)

```
Step 5-alt: Tap "Reject"
         --> Remarks bottom sheet slides up
         --> User MUST type remarks (field mandatory)
         --> Empty submit --> "Please enter remarks" (client-side, no API call)
         --> User types "Incorrect amount on line item 3"
         Event: ApproveORRejectButtonPressed(
                  taskId: 12345, approved: false,
                  remarks: "Incorrect amount on line item 3"
                )
         API:   executeWorkflow(approved=false, remarks)
         BLoC:  --> TaskActionSucessState("Task rejected")
         Nav:   Back to list + refresh
```

### 2.6 Revert Path (Unclaim)

```
Step 5-alt2: Tap "Revert"
         Dialog: "Do you want to revert task?" [Cancel] [Revert]
         Event: RevertButtonPressed(taskId: 12345, userId: "rohit.g")
         BLoC:  --> RevertActionLoading
         API:   POST /amb/api/jbpm/tasks/12345/release { "userId": "rohit.g" }
         BLoC:  --> RevertActionState("Task has been reverted")
         Nav:   Back to list; task reappears in Group Tasks (OPEN)
```

### 2.7 Error Paths

```
Concurrent Claim (409):
  Two users claim same task simultaneously
  --> Second user gets HTTP 409
  --> Error: "Task has been already claimed by other user..!!"
  --> No retry. Navigate back. Task gone from Group queue.

Self-Approval (403):
  Document creator tries to approve own document
  --> Error: "Document creator cannot approve the document. Please revert the task."
  --> User must tap "Revert" to release.

Refund Mode Missing (400):
  Refund task where payment mode was not set in source system
  --> Error: "Cannot approve document, Refund mode not available"
  --> User must reject or revert.

Retrospect Stage Conflict:
  Stage 1 approver tries to claim Stage 2 (server-enforced, 403)
  --> User must revert so a different approver can handle it.
```

### 2.8 Task Approval Full Flow Diagram

```
+===========================================================================+
||                   TASK APPROVAL LIFECYCLE                                ||
+===========================================================================+
|                                                                           |
|  BACK-OFFICE SYSTEM                         AHAM MOBILE APP               |
|  ────────────────────                       ─────────────────             |
|                                                                           |
|  Billing event occurs                                                     |
|  (invoice, refund, etc.)                                                  |
|         |                                                                 |
|         v                                                                 |
|  jBPM workflow engine                                                     |
|  creates approval task                                                    |
|         |                                                                 |
|         v                                                                 |
|  Task appears in                  Staff opens Task Management             |
|  Group Tasks queue <------------- LoadModuleTask(GROUP) ----+             |
|         |                                                    |            |
|         v                                                    |            |
|  Staff taps task card             LoadTaskDetail(taskId)     |            |
|         |                         GET process-variable       |            |
|         |                         GET document detail        |            |
|         v                                                    |            |
|  ┌─────────────────┐                                         |            |
|  │    OPEN          │  ── Claim ──> POST /claim-start        |            |
|  │   (unclaimed)    │                    |                    |            |
|  └─────────────────┘                    v                    |            |
|         |                   ┌──────────────────────┐         |            |
|         |                   │    IN_PROGRESS        │         |            |
|         |                   │   (claimed by staff)  │         |            |
|         |                   └──────────┬───────────┘         |            |
|         |                              |                     |            |
|         |              ┌───────────────┼───────────────┐     |            |
|         |              |               |               |     |            |
|         |          Approve          Reject          Revert   |            |
|         |          (no dialog)     (remarks req)   (dialog)  |            |
|         |              |               |               |     |            |
|         |              v               v               |     |            |
|         |         ┌────────┐     ┌─────────┐           |     |            |
|         |         │  DONE  │     │  DONE   │           |     |            |
|         |         └───┬────┘     └────┬────┘           |     |            |
|         |             |               |                |     |            |
|         |             v               v                |     |            |
|         |         ┌────────────────────────┐            |     |            |
|         |         │       CLOSED           │            |     |            |
|         |         │    (terminal state)    │            |     |            |
|         |         └────────────────────────┘            |     |            |
|         |                                               |     |            |
|         +<──────────── Returns to OPEN ─────────────────+     |            |
|                                                               |            |
|  Workflow complete                    RefreshTasksEvent -------+            |
|  Invoice/Receipt/Refund                                                    |
|  status updated server-side                                                |
|                                                                           |
+===========================================================================+
```

---

## 3. Chat Conversation Journey

### 3.1 Overview

NH Care Assistant is a real-time messaging module enabling hospital staff to chat with patients. Patients message via their own portal. Staff see messages in a shared queue, claim conversations, respond, delegate to colleagues, and close them.

Three architectural layers exist because ACS has no Dart SDK:
- Layer 1: Flutter UI (Dart) -- ChatAssistantBloc, screens
- Layer 2: Native Plugin (Java/Kotlin) -- flutter_acs (11 files)
- Layer 3: Azure Communication Services (cloud)

### 3.2 Conversation Lifecycle

```
                    Patient sends
                    first message
                         |
                         v
               +------------------+
               |    UNASSIGNED     |
               |                  |
               |  Visible: ALL    |
               |  Text input: OFF |
               |  Action: Assign  |
               +--------+---------+
                        |
                Staff taps "Assign to Self"
                Event: AssignChatConversation(assignType: ASSIGN)
                API: POST /prm/_assign
                        |
                        v
               +------------------+
               |     ACTIVE        |<----- DELEGATE / REASSIGN -----+
               |                  |       POST /prm/_delegate        |
               |  Visible: ALL+MY |       POST /prm/_reassign       |
               |  Text input: ON  |       (moves to new owner's     |
               |  Actions:        |        MY queue; stays ACTIVE)   |
               |   Send, Delegate,|                                  |
               |   Close          +---------------------------------+
               +--------+---------+
                        |
                Staff taps "Close"
                Event: CloseChatConversation
                API: POST /prm/_close
                        |
                        v
               +------------------+
               |     CLOSED        |
               |                  |
               |  Visible: ALL    |
               |  Text input: OFF |
               |  Read-only       |
               +--------+---------+
                        |
                Patient sends new message
                (after conversation closed)
                        |
                        v
               +------------------+
               | NEW UNASSIGNED   |  (brand new conversationId,
               | CONVERSATION     |   may reuse ACS threadId)
               +------------------+
```

### 3.3 Send Message Flow

```
Staff types message in text field
    |
    v
Tap Send button
    |
    v
Event: SendChatMessage(threadId, content, metadata)
BLoC:  --> SendMessageLoadingState
    |
    v
Layer 1 (Dart): Format message payload
    |
    v
Layer 2 (Native): ChatThreadAsyncClient.sendMessage(content)
    |
    v
Layer 3 (ACS Cloud): Delivers to patient portal in real-time
    |
    v
PRM Backend: Message also stored via REST
POST /prm/api/chat-messages
    |
    v
BLoC: --> SendMessageSuccessState(messageId)
    |
    v
UI: Clear text field, message appears in chat via ACS real-time event
```

### 3.4 Receive Message Flow

```
Patient sends message via their portal
    |
    v
ACS Cloud delivers to native layer
    |
    v
Layer 2 (Native):
  ChatAsyncClient event handler fires (CHAT_MESSAGE_RECEIVED)
  --> Extract: messageId, content, type, createdOn, senderId, senderDisplayName
  --> Filter: only TEXT or HTML type (skip system messages)
  --> Wrap in ChatMessageDTO(eventType: "CHAT_MESSAGE_RECEIVED", chatType: "ACTIVE")
  --> Serialize to JSON via Gson
  --> Post to main thread: eventSink.success(json)
    |
    v
Layer 1 (Dart):
  Event Channel "flutter_acs_event_channel_stream" receives JSON
  --> Parse ChatMessageDTO
  --> Save to ObjectBox (StoreChatDataModel)
  --> BLoC emits updated conversation state
  --> UI: New bubble appears at bottom of chat
    |
    v
If app in background:
  FCM push notification fires
  --> System tray notification with message preview
  --> Tap --> Deep link to ChatScreen for that conversation
```

### 3.5 Delegation Flow

```
Staff on active conversation taps "Delegate"
    |
    v
Delegate Dialog opens
    |
    v
Search staff member by name
Event: (search via PRM staff search API)
    |
    v
Select target user + optional reason text
    |
    v
Event: AssignChatConversation(
         conversationId, threadId,
         targetUserId: "dr.meena",
         assignType: DELEGATE,
         reason: "Patient needs specialist opinion"
       )
BLoC: --> DelegateLoadingState
API:  POST /prm/_delegate
    |
    v
BLoC: --> DelegateSuccessState
    |
    v
System message injected: "Conversation delegated to Dr. Meena"
Conversation moves to Dr. Meena's MY queue
Status remains ACTIVE
Original staff no longer sees it in their MY queue
```

### 3.6 Two Tabs: ALL vs MY

```
+------------------------------------------------------+
| ALL tab                     | MY tab                  |
+-----------------------------+-------------------------+
| Shows ALL conversations:    | Shows only conversations|
|  UNASSIGNED + ACTIVE +      | assigned to current     |
|  CLOSED                     | user                    |
|                             |                         |
| API: POST /prm/_search/     | API: GET /prm/chat-     |
|   user/all-chat-conversation|   conversations/user/   |
|                             |   chats                 |
|                             |                         |
| BLoC Event:                 | BLoC Event:             |
|   FetchAllConversation      |   FetchMyConversation   |
+-----------------------------+-------------------------+
```

---

## 4. Outreach Camp Journey

### 4.1 Overview

Hospital-run free or subsidized medical camps in underserved communities. Coordinators use AHAM to manage camp lifecycle, register patients on-site, verify identity via Aadhaar, assign doctors, and generate temp IDs.

### 4.2 Camp Lifecycle

```
                    +------------------+
                    |   NOT_STARTED    |
                    |    (PLANNED)     |
                    +--------+---------+
                             |
                +-----------++-----------+
                |                        |
                v                        v
       +----------------+       +----------------+
       |  IN_PROGRESS   |       |   CANCELLED    |
       |   (ACTIVE)     |       |  (terminal)    |
       +--------+-------+       +----------------+
                |
                v
       +----------------+
       |     DONE       |
       |  (COMPLETED)   |
       |  (terminal)    |
       +----------------+

Transitions:
  NOT_STARTED --> IN_PROGRESS  : StartCampEvent (min 1 coordinator)
  NOT_STARTED --> CANCELLED    : Admin action (backend only, 0 patients)
  IN_PROGRESS --> DONE         : Complete action
  Forward-only. No backward transitions.
```

### 4.3 Patient Registration Flow (8 Steps)

```
+===========================================================================+
||                   PATIENT REGISTRATION FLOW                             ||
+===========================================================================+
|                                                                           |
|  Step 1: MPI Search                                                       |
|  Event: SearchPatientEvent(query, searchType: name|phone|mrn|aadhaar)     |
|  API:   POST /mpi/api/search/patients                                     |
|         |                                                                 |
|         +---------- Found ----------+---------- Not Found --------+       |
|         |                           |                              |       |
|         v                           v                              |       |
|  Step 2a: Select existing    Step 2b: "Register New Patient"      |       |
|         |                           |                              |       |
|         v                           v                              |       |
|  Step 3a: Eligibility        Step 3b: Fill form                   |       |
|  ├─ BLOCKED --> Error        (name, gender, DOB,                  |       |
|  ├─ DECEASED --> Error        phone, address)                     |       |
|  ├─ MERGED --> Error                |                              |       |
|  └─ ACTIVE --> Proceed              |                              |       |
|         |                           |                              |       |
|         +---------------------------+                              |       |
|                    |                                                       |
|                    v                                                       |
|  Step 4: Duplicate Prevention (client-side check)                          |
|  Check: Is this patient already registered in THIS camp?                   |
|  Match by patientId OR phone number against fetched patient list           |
|  If duplicate --> "Patient already registered in this camp" error          |
|                    |                                                       |
|                    v                                                       |
|  Step 5: Consultant Assignment (MANDATORY)                                 |
|  Event: FetchConsultants(campId)                                           |
|  User MUST select a doctor. Registration fails without one.                |
|                    |                                                       |
|                    v                                                       |
|  Step 6: Camp Assignment                                                   |
|  Link patient to campId + campScheduleId                                   |
|  Final server-side duplicate check                                         |
|                    |                                                       |
|                    v                                                       |
|  Step 7: Aadhaar KYC (OPTIONAL, feature-flagged)                           |
|  Flag: enable_aadhaar_registration (Firebase Remote Config, default: false)|
|  If true:                                                                  |
|    Navigate to AadharAuthScreen                                            |
|    ├─ Enter 12-digit Aadhaar number                                        |
|    ├─ Capture front image (camera or gallery, JPG/PNG, max 5MB)            |
|    ├─ Capture back image (front-before-back rule)                          |
|    ├─ Event: AuthenticateAadhar(frontImage, backImage, aadhaarNumber)      |
|    ├─ API: POST https://sandbox.veri5digital.com/.../docInfoExtract        |
|    ├─ Success --> auto-fill name, DOB, gender, address                     |
|    └─ Failure --> manual entry fallback (non-blocking)                     |
|  If false: Skip entirely                                                   |
|                    |                                                       |
|                    v                                                       |
|  Step 8: Submit Registration (up to 3 sequential API calls)                |
|  Call 1: POST /prm/api/outreach/patients (register patient)                |
|  Call 2: POST /prm/api/outreach/temp-numbers (NEW patients only)           |
|  Call 3: POST /dms/api/document-records/upload (Aadhaar docs if captured)  |
|  Success --> Back to patient list + success snackbar + refresh             |
|  Failure --> Show error, keep form data intact for retry                    |
|                                                                           |
+===========================================================================+
```

### 4.4 Coordinator Management

```
Add Coordinator:
  1. Open ManageCoordinatorsSheet (bottom sheet)
  2. Search staff: Event: SearchCoOrdinatorEvent(query)
  3. Tap "+" on result
  4. Event: UpdateCoOrdinatorEvent(action: "ADD")
  5. API: PUT /prm/api/outreach-camp/update/coordinators
  6. Refresh list

Remove Coordinator:
  1. Tap "x" next to coordinator name
  2. Guard: if currentCoordinators.length <= 1 --> "Cannot remove last coordinator"
  3. Event: UpdateCoOrdinatorEvent(action: "REMOVE")
  4. API: PUT /prm/api/outreach-camp/update/coordinators
  5. Refresh list
```

### 4.5 Address Cascading

```
Country --> State --> District --> City --> Pincode

Each selection loads the next level:
  API: GET /mdm/api/_search/zipcodes?level=<next>&parent=<selected>
  Event: SearchZipCodesEvent(level, parent)

Reset rule: Changing upstream clears all downstream values.
  Country change --> State, District, City, Pincode all reset to null
  State change   --> District, City, Pincode reset to null
  District change--> City, Pincode reset to null
  City change    --> Pincode resets to null
```

---

## 5. Billing Document Hierarchy

### 5.1 Document Generation and Approval Chain

```
Service Delivery
       |
       v
Invoice Generation -----------> Invoice Generation Approval (jBPM)
       |
       +-- Discount Applied -----> Discount Approval (jBPM)
       |
       v
Receipt Collection -----------> Receipt Approval (jBPM)
       |
       +-- Cancel Receipt -------> Receipt Cancellation (jBPM)
       |
       +-- Refund Initiated -----> Refund Approval (jBPM)
       |
       +-- Retrospective Adj ----> Retrospect Invoice Initiation (jBPM)
       |                                |
       |                                v
       |                         Retrospect Invoice Approval (jBPM, auto-created)
       |
       +-- Reversal -------------> Reversal Invoice Approval (jBPM)
       |
       +-- Cancellation ----------> Invoice Cancellation (jBPM)

Unbilled Services ----------------> UnBilled Invoice Approval (jBPM)
High-Value Medications -----------> HighValue MedicationRequest Approval (jBPM)
Authorization Requests -----------> Authorization Approval (jBPM)
Mandatory Brand (LCHM) -----------> Mandatory Brand Approval (jBPM)
```

### 5.2 Document Relationships

```
Invoice --+-- Receipt --+-- Refund
           |
           +-- UnbilledDocument
           |
           +-- Authorization
           |
           +-- InvoiceDiscountModel
           |
           +-- RetrospectInvoiceModel
           |
           +-- ReversalInvoiceModel

MedicationRequestModel (standalone)
LchmModel (standalone)
HighValueModel (standalone)
```

### 5.3 Invoice Amount Formula

```
netAmount = grossAmount
          - patientDiscount
          - sponsorDiscount
          - discretionaryDiscount
          - nonDiscretionaryDiscount
          - planDiscountAmount
          + taxAmount

patientPayable = netAmount - sponsorAmount
sponsorPayable = sponsorAmount
totalAmount    = patientPayable + sponsorPayable  (== netAmount)

totalUserDiscountPercentage =
  ((patientDiscount + discretionaryDiscount + nonDiscretionaryDiscount
    + planDiscountAmount) / grossAmount) * 100
```

### 5.4 Five Discount Types

```
 # | Type              | Invoice Field               | Requires Approval | Applied By
---+-------------------+-----------------------------+-------------------+------------
 1 | Non-Discretionary | nonDiscretionaryDiscount     | No                | System
 2 | Plan              | planDiscountAmount           | No                | System
 3 | Discretionary     | discretionaryDiscount        | ALWAYS            | User (manual)
 4 | Sponsor           | sponsorDiscount              | Depends           | System/User
 5 | Patient           | patientDiscount              | Depends           | System/User

Discount Calculation Order:
  1. Apply non-discretionary (policy-based)
  2. Apply plan discount (insurance/scheme)
  3. Apply discretionary (manual --> triggers Discount Approval)
  4. Calculate totalUserDiscountPercentage
  5. Split between patient and sponsor portions
  6. Recalculate patientPayable and sponsorPayable
```

### 5.5 Retrospect Invoice (2-Stage Approval)

```
Retrospect request submitted (post-discharge invoice modification)
    |
    v
Stage 1: Retrospect Invoice Initiation
    |   taskName: "Retrospect Invoice Initiation"
    |   Assigned to: first-level reviewer group
    |
    +-- Rejected --> Terminal. No Stage 2.
    |
    +-- Approved
            |
            v
        Stage 2: Retrospect Invoice Approval
            |   taskName: "Retrospect Invoice Approval"
            |   Auto-created by jBPM process
            |   Assigned to: senior reviewer group
            |
            +-- Rejected --> Terminal. Invoice unchanged.
            +-- Approved --> Invoice updated.

HARD CONSTRAINT: Stage 1 approver CANNOT be Stage 2 approver.
  Server returns 403 if same user attempts both stages.
```

### 5.6 Seven Workflow Execution Methods

```
 # | Method                            | Trigger                  | Task Type Created
---+-----------------------------------+--------------------------+-----------------------------------
 1 | executeWorkflow                   | Generic base             | (varies by document type)
 2 | executeReceiptWorkflow            | Receipt generated        | Receipt Approval
 3 | executeRefundWorkflow             | Refund initiated         | Refund Approval
 4 | executeWorkflowForRetrospect      | Retrospective adjustment | Retrospect Invoice Init/Approval
 5 | executeWorkflowForUnbilled        | Unbilled doc processing  | UnBilled Invoice Approval
 6 | executeWorkflowForHighValue       | High-value medication    | HighValue MedicationRequest Appr.
 7 | executeWorkflowForLchm            | Mandatory brand med      | Mandatory Brand Approval
```

---

## 6. Status Machines

### 6.1 Task Lifecycle

```
                      claim-start (POST)
             +------------------------------+
             |                              |
             v                              |
+--------+       +-----------+       +-------------+
|  OPEN  | ----> |  CLAIMED  | ----> | IN_PROGRESS |
+--------+       | (transit- |       +-------------+
    ^            |  ional)   |            |
    |            +-----------+            |
    |                                     |
    |         release (POST)              |
    +-------------------------------------+
                                          |
                      approve/reject      |
                      (executeWorkflow)   |
                                          v
                                     +--------+
                                     |  DONE  |
                                     +--------+
                                          |
                                          | (automatic by jBPM)
                                          v
                                     +--------+
                                     | CLOSED |
                                     +--------+

CLAIMED is transitional -- claim-start is atomic. App never sees CLAIMED.
Button visibility:
  OPEN          --> [Claim]
  IN_PROGRESS   --> [Approve] [Reject] [Revert]
  DONE/CLOSED   --> (no buttons, read-only)
```

### 6.2 Conversation Lifecycle

```
+------------------+
|    UNASSIGNED     |  Patient sends first message
+--------+---------+
         |
    Assign to Self (POST /prm/_assign)
         |
         v
+------------------+
|     ACTIVE        |<--+  Delegate / Reassign (stays ACTIVE,
+--------+---------+   |  changes owner)
         |              |
    Close (POST)   -----+
         |
         v
+------------------+
|     CLOSED        |  Patient new message --> NEW conversation
+------------------+

Status rules:
  UNASSIGNED --> Visible in ALL only, text input OFF
  ACTIVE     --> Visible in ALL + MY, text input ON, can delegate/close
  CLOSED     --> Visible in ALL only, text input OFF, read-only
```

### 6.3 Camp Lifecycle

```
+------------------+
|   NOT_STARTED    |
|    (PLANNED)     |
+--------+---------+
         |
    +----+----+
    |         |
    v         v
+----------+ +----------+
|IN_PROGRESS| |CANCELLED |
| (ACTIVE)  | |(terminal)|
+-----+----+ +----------+
      |
      v
+----------+
|   DONE   |
|(terminal)|
+----------+

Constraints:
  - Forward-only transitions
  - Start requires min 1 coordinator
  - Patient registration only when IN_PROGRESS
  - Completion only when IN_PROGRESS
```

### 6.4 Receipt Lifecycle

```
CREATED --> Receipt Approval task (jBPM)
    |
    +-- Approved --> ACTIVE
    |                  |
    |                  +-- Cancel requested --> CANCELLATION_PENDING
    |                  |                           |
    |                  |                   +-------+-------+
    |                  |                   |               |
    |                  |                   v               v
    |                  |            CANCELLED     CANCELLATION_REJECTED
    |                  |                           (stays ACTIVE)
    |                  |
    |                  +-- Refund initiated --> (see Refund lifecycle)
    |
    +-- Rejected --> Stays CREATED
```

### 6.5 Refund Lifecycle

```
INITIATED (PENDING)
    |
    v
APPROVAL_PENDING (Refund Approval task created)
    |
    +-- Approved --> APPROVED (refund processed, money returned)
    |
    +-- Rejected --> REJECTED (terminal)
```

### 6.6 Authorization Lifecycle

```
PENDING (authorization request created)
    |
    v
Authorization Approval task (jBPM)
    |
    +-- Approved --> APPROVED --> Invoice WithAuth fields recalculated
    |
    +-- Rejected --> REJECTED (patient bears full cost)
    |
    +-- (time passes beyond validTo) --> EXPIRED
    |
    +-- User cancels --> CANCELLED
```

### 6.7 Camp Patient Registration Status

```
Patient registered at camp:
  REGISTERED --> COMPLETED / CANCELLED

Patient IDs:
  Existing patient --> has UHID (hospital MRN), no temp ID
  New patient      --> has temp ID (e.g., "Temp-042-001"), no UHID
  Display logic:   patient.uhid ?? patient.tempId ?? "N/A"

Temp ID lifecycle:
  ACTIVE (generated at camp) --> CONVERTED (MRN assigned at hospital)
```

---

## 7. Data Flow Architecture

### 7.1 Three-Layer Architecture

```
+==========================================================================+
||                    AHAM DATA FLOW ARCHITECTURE                         ||
+==========================================================================+
|                                                                          |
|  LAYER 1: Flutter UI (Dart)                                              |
|  +--------------------------------------------------------------------+  |
|  |  BLoC Pattern (6 BLoCs)                                            |  |
|  |  ┌──────────┐ ┌─────────────┐ ┌──────────────┐ ┌──────────────┐   |  |
|  |  │LoginBloc  │ │TaskBloc     │ │ChatAssistant │ │OutreachCamps │   |  |
|  |  │ClientSetup│ │TaskDetail   │ │    Bloc      │ │    Bloc      │   |  |
|  |  │   Bloc    │ │    Bloc     │ │ (8 events,   │ │PatientReg    │   |  |
|  |  └──────────┘ └─────────────┘ │  16 states)  │ │    Bloc      │   |  |
|  |                                └──────────────┘ │AadharBloc    │   |  |
|  |  ┌──────────────┐ ┌────────────────┐            └──────────────┘   |  |
|  |  │PreferenceBloc│ │FcmBloc         │                               |  |
|  |  └──────────────┘ └────────────────┘                               |  |
|  +-------------------------------+------------------------------------+  |
|                                  |                                       |
|                         Method Channel +                                 |
|                         Event Channel                                    |
|                                  |                                       |
|  LAYER 2: Native Plugin (Java/Kotlin)                                    |
|  +-------------------------------+------------------------------------+  |
|  |  flutter_acs plugin (11 Java/Kotlin files)                         |  |
|  |  ┌──────────────────────┐  ┌──────────────────────────────────┐    |  |
|  |  │ ACSCommunication     │  │  Data Models (Kotlin)            │    |  |
|  |  │ - ChatAsyncClient    │  │  - ChatMessageDTO                │    |  |
|  |  │ - ChatThreadClient   │  │  - ChatMessageReceived           │    |  |
|  |  │ - Event handlers     │  │  - ChatMessageDeleted            │    |  |
|  |  │ (2 of 8 registered:  │  │  - ChatParticipantsModel         │    |  |
|  |  │  MSG_RECEIVED,       │  │  - CustomChatMessageType (enum)  │    |  |
|  |  │  MSG_DELETED)        │  │                                  │    |  |
|  |  └──────────────────────┘  └──────────────────────────────────┘    |  |
|  +-------------------------------+------------------------------------+  |
|                                  |                                       |
|                            ACS SDK (native)                              |
|                                  |                                       |
|  LAYER 3: Cloud Services                                                 |
|  +--------------------------------------------------------------------+  |
|  |  ┌────────────────────────────────────────────────────────────┐     |  |
|  |  │  Azure Communication Services (ACS)                        │     |  |
|  |  │  - Thread management    - Real-time message delivery       │     |  |
|  |  │  - Participant mgmt     - Push notification relay          │     |  |
|  |  └────────────────────────────────────────────────────────────┘     |  |
|  |                                                                     |  |
|  |  ┌────────────────────────────────────────────────────────────┐     |  |
|  |  │  Backend REST APIs (7 services)                            │     |  |
|  |  │  UAA  - authentication, preferences                        │     |  |
|  |  │  MDM  - master data, facilities, jBPM tasks                │     |  |
|  |  │  AMB  - billing (invoices, receipts, refunds, medications) │     |  |
|  |  │  PRM  - patient relationship, chat conversations, camps    │     |  |
|  |  │  MPI  - master patient index (patient search)              │     |  |
|  |  │  DMS  - document management (upload/download)              │     |  |
|  |  │  Registry - domain/org resolution (pre-auth)               │     |  |
|  |  └────────────────────────────────────────────────────────────┘     |  |
|  |                                                                     |  |
|  |  ┌────────────────────────────────────────────────────────────┐     |  |
|  |  │  Firebase                                                  │     |  |
|  |  │  - FCM (push notifications)                                │     |  |
|  |  │  - Remote Config (feature flags)                           │     |  |
|  |  │  - Analytics                                               │     |  |
|  |  └────────────────────────────────────────────────────────────┘     |  |
|  |                                                                     |  |
|  |  ┌────────────────────────────────────────────────────────────┐     |  |
|  |  │  External: Veri5 Digital (Aadhaar KYC extraction)          │     |  |
|  |  └────────────────────────────────────────────────────────────┘     |  |
|  +--------------------------------------------------------------------+  |
|                                                                          |
+==========================================================================+
```

### 7.2 Four-Layer Caching Strategy

```
+---------------------------------------------------------------------+
| L0: MemoryCache (package:memory_cache)                               |
|   Layer:    RAM                                                      |
|   Scope:    Current app session only                                 |
|   Content:  API responses, computed results, frequently used data    |
|   Eviction: TTL-based (per cache item)                               |
|   API:      MemoryCache.instance.put(key, value, expiry)             |
|             MemoryCache.instance.read<T>(key)                        |
|   Cleared:  On app termination                                       |
+---------------------------------------------------------------------+
| L1: In-Memory ImageCache (Flutter built-in)                          |
|   Layer:    RAM                                                      |
|   Scope:    Current app session only                                 |
|   Content:  Decoded image data (profile avatars, thumbnails)         |
|   Eviction: LRU, 100 images / 100 MB                                |
|   Cleared:  On app termination                                       |
+---------------------------------------------------------------------+
| L2: ObjectBox Persistent Cache                                       |
|   Layer:    Disk (ObjectBox database file)                           |
|   Scope:    Persists across app sessions                             |
|   Content:  StoreChatDataModel entities (chat messages)              |
|   Eviction: Manual via deleteOldMessages()                           |
|   Encrypted: AES-256 (key in Android KeyStore)                       |
+---------------------------------------------------------------------+
| L3: Attachment Filesystem Cache                                      |
|   Layer:    Disk (app-specific directory)                            |
|   Scope:    Persists across app sessions                             |
|   Content:  Downloaded attachments (images, PDFs, audio)             |
|   Path:     attachmentLocalPath in StoreChatDataModel                |
|   Eviction: Manual cleanup with deleteOldMessages() (cascading)      |
+---------------------------------------------------------------------+
```

### 7.3 Token Lifecycle

```
+-----------------------------------------------------------------+
| TOKEN LIFECYCLE                                                  |
+-----------------------------------------------------------------+
|                                                                  |
|  ACCESS TOKEN                                                    |
|  ├── Created: POST /gateway-api-v1/auth/login                   |
|  ├── Lifetime: ~30 minutes (expires_in: 1800)                    |
|  ├── Storage: SharedPreferences ("access_token")                 |
|  ├── Usage: Authorization: Bearer <token> on every API request   |
|  ├── Refresh: Automatic via Dio interceptor on 401 response      |
|  │            POST /api/reload/token (using refresh_token)       |
|  ├── Proactive: Refresh when exp < now + 60 seconds              |
|  └── Expiry: SessionExpired event --> forced logout              |
|                                                                  |
|  REFRESH TOKEN                                                   |
|  ├── Created: POST /gateway-api-v1/auth/login                   |
|  ├── Lifetime: ~30 days                                          |
|  ├── Storage: SharedPreferences ("refresh_token")                |
|  ├── Usage: Only for POST /api/reload/token                      |
|  └── Expiry: Forced logout to login screen                       |
|                                                                  |
|  ACS TOKEN                                                       |
|  ├── Created: From backend after login                           |
|  ├── Lifetime: ~24 hours                                         |
|  ├── Usage: ACS chat initialization (CommunicationTokenCredential)|
|  ├── Refresh: resubscribeToACS(endPoint, newToken, threadId)     |
|  └── Expiry: Chat degraded until re-authentication               |
|                                                                  |
|  RACE CONDITION GUARD:                                           |
|  ├── Completer<AuthTokenResponse>? _refreshCompleter             |
|  ├── If refresh already in-flight --> wait for same Future       |
|  └── Prevents multiple parallel refresh calls                    |
|                                                                  |
+-----------------------------------------------------------------+
```

### 7.4 Dio Interceptor Chain

```
Request Interceptor:
  1. Add Authorization: Bearer <access_token>
  2. Add Content-Type header
  3. Add facility/organization context headers (X-Unit-Code, etc.)

Response Interceptor:
  1. Check for 401 Unauthorized
  2. If 401: attempt token refresh
     a. Success: retry original request with new token
     b. Failure: clear session, redirect to LoginScreen

Error Interceptor:
  1. Parse error response into ErrorResponseModel
     { errorCode, errorMessage, statusCode, timestamp, path }
  2. Emit appropriate error state in calling BLoC
```

---

## 8. Cross-Cutting Concerns

### 8.1 Multi-Facility Switching

```
TWO LEVELS OF SWITCHING
========================

Level 1: Organization (e.g., NH Bangalore --> NH Mysuru)
  API: GET /mdm/api/logged-in/organizations
  When: After login if user has >1 organization
  Does NOT require logout

Level 2: Unit/HSC (e.g., Cardiology --> Oncology within same facility)
  API: GET /mdm/api/logged-in/all-unit-hscs
  When: User taps "Switch Unit" in Preferences
  Does NOT require logout

What refreshes on switch:
  +-- Tasks: LoadModuleTask with new unitCode
  +-- Chats: FetchAllConversation with new context
  +-- Camps: FetchOutreachCamps with new unitCode
  +-- Billing: All invoice/receipt/refund queries scoped to new unit
  +-- UI header: Updated with new unit name
```

### 8.2 Language & Localization (8 Languages)

```
 # | Language  | Code | Script      | Primary Region
---+-----------+------+-------------+--------------------------
 1 | English   | en   | Latin       | All facilities (default)
 2 | Bengali   | bn   | Bengali     | Eastern India (Kolkata)
 3 | Gujarati  | gu   | Gujarati    | Western India (Ahmedabad)
 4 | Hindi     | hi   | Devanagari  | North India
 5 | Kannada   | kn   | Kannada     | Karnataka (Bangalore HQ)
 6 | Marathi   | mr   | Devanagari  | Maharashtra (Mumbai, Pune)
 7 | Tamil     | ta   | Tamil       | Tamil Nadu (Chennai)
 8 | Telugu    | te   | Telugu      | Andhra Pradesh & Telangana

BLoC: PreferenceBloc
Events: LoadPreferences, PreferenceSave
API: GET/POST /uaa/api/account/preferences
Persistence: Device (SharedPreferences) + Server (syncs across devices)

Translated: Menu items, button text, error messages, FAQ
NOT translated: Patient names, financial amounts, chat messages
```

### 8.3 FCM Push Notifications

```
NOTIFICATION TYPES
===================
  - New task available:          "New Invoice Approval - Rs 45,200"
  - Task assigned to you:        "Invoice task assigned to you by Dr. Anita"
  - Chat message received:       "Rajesh Kumar: When will my reports be ready?"
  - New unassigned chat:         "New unassigned conversation from Meena Devi"
  - Camp reminder:               "Anantapur Health Camp starts tomorrow"
  - System alert:                "Scheduled maintenance tonight 11 PM - 2 AM"

DELIVERY BY APP STATE
======================
  Foreground:  In-app banner/toast at top of screen
               Handler: onMessage (RemoteMessage.fromMap)
  Background:  System notification tray
               Handler: Background handler (top-level Dart function)
  Terminated:  System notification tray
               Handler: getInitialMessage on app launch (deep link)

NO in-app notification settings screen.
All controls deferred to OS: Device Settings > Apps > AHAM > Notifications

TOKEN LIFECYCLE
================
  Login --> Firebase generates FCM token --> Register with backend
  Token change --> Auto-update via backend registration
  Logout --> Clear from SharedPreferences + deregister from backend
```

### 8.4 Offline Behavior

```
OFFLINE CAPABILITY
===================
  READ:   Cached data from ObjectBox (chat messages + attachments)
          Cached data from MemoryCache (API responses, TTL-based)
  WRITE:  NO offline writes. No message queueing.
          Send button disabled or fails immediately when offline.
          All task actions (claim/approve/reject) require network.
          Patient registration requires network.

SYNC:
  On reconnect: Pull-based refresh (no automatic sync)
  User must pull-to-refresh or navigate to trigger data reload
```

### 8.5 Security Architecture

```
+-------------------------------------------------------------+
|                    SECURITY BOUNDARY                          |
+-------------------------------------------------------------+
|                                                               |
|  AUTHENTICATION                                               |
|  ├── Bearer JWT on every API request                          |
|  ├── Access token: ~30min, refresh token: ~30d                |
|  ├── Automatic refresh via Dio interceptor on 401             |
|  ├── Proactive refresh when exp < now + 60s                   |
|  └── Session expired --> forced logout                        |
|                                                               |
|  TRANSPORT                                                    |
|  ├── TLS/SSL (HTTPS only)                                     |
|  ├── Platform default: TLS 1.2+                               |
|  ├── Custom certificate validation may be present             |
|  │   (_registerBadCertificateCallback in binary)              |
|  └── Certificate pinning evidence in binary                   |
|                                                               |
|  LOCAL STORAGE                                                |
|  ├── SharedPreferences: JWT tokens, session data, FCM token   |
|  ├── ObjectBox: AES-256 encryption at rest                    |
|  ├── Android KeyStore: encryption key storage                 |
|  └── Logout: SharedPreferences.clear() but preserves baseUrl  |
|                                                               |
|  AUTHORIZATION                                                |
|  ├── Self-approval prevention (server-enforced, 403)          |
|  ├── Retrospect 2-stage: different approvers required         |
|  ├── Concurrent claim guard (server-enforced, 409)            |
|  ├── Task group membership required for claim                 |
|  └── Facility-scoped data access                              |
|                                                               |
|  AUDIT LOGGING (server-side)                                  |
|  ├── Login / logout                                           |
|  ├── Task claim / approve / reject / revert                   |
|  ├── Patient registration                                     |
|  ├── Camp start / completion                                  |
|  ├── Chat assign / delegate / close                           |
|  └── Document upload / download                               |
|                                                               |
|  PERMISSIONS (10 Android)                                     |
|  ├── INTERNET, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE        |
|  ├── CAMERA (Aadhaar capture, attachments)                    |
|  ├── READ/WRITE_EXTERNAL_STORAGE (pre-Android 13)             |
|  ├── READ_MEDIA_IMAGES (Android 13+)                          |
|  ├── POST_NOTIFICATIONS (Android 13+)                         |
|  ├── WAKE_LOCK (background processing)                        |
|  └── c2dm.permission.RECEIVE (GCM/FCM)                       |
|                                                               |
+-------------------------------------------------------------+
```

### 8.6 Feature Flags (Firebase Remote Config)

```
Known flags:
  enable_aadhaar_registration  (bool, default: false)
    Controls Aadhaar KYC section in patient registration

App config flavors:
  prod:  aham_appconfig
  dev:   aham_appconfig_dev
  sqa:   aham_appconfig_sqa
  uat:   aham_appconfig_uat

Fetch flow:
  App launch --> Firebase.initializeApp() --> Remote Config fetch (non-blocking)
  Success --> AppRemoteConfigModel populated, cached locally
  Failure --> Use cached values, then compile-time defaults
```

### 8.7 Privacy Policy

```
Jurisdiction:    Cayman Islands
Governing Law:   Data Protection Act 2021
DPO Contact:     dpo@healthcity.ky
WebView Route:   /privacyPolicy
Content URL:     /privacy-policy.html
```

---

## 9. Complete BLoC Registry

```
+===========================================================================+
||                       BLOC REGISTRY (10 BLoCs)                          ||
+===========================================================================+
|                                                                           |
|  AUTH & SETUP                                                             |
|  ┌────────────────────────────────────────────────────────────────────┐   |
|  │ 1. ClientSetupBloc                                                 │   |
|  │    Events: FetchDomain(orgCode)                                    │   |
|  │    States: Initial --> Loading --> Success(baseUrl) / Error         │   |
|  ├────────────────────────────────────────────────────────────────────┤   |
|  │ 2. LoginBloc                                                       │   |
|  │    Events: LoginSubmitted(username, password)                      │   |
|  │    States: Initial --> Loading --> Success(tokens) / Failure(code)  │   |
|  └────────────────────────────────────────────────────────────────────┘   |
|                                                                           |
|  TASK MANAGEMENT                                                          |
|  ┌────────────────────────────────────────────────────────────────────┐   |
|  │ 3. TaskBloc (list screen)                                          │   |
|  │    Events: LoadModuleTask(queueType, page, size, filters?)         │   |
|  │            RefreshTasksEvent(queueType)                            │   |
|  │    States: Initial --> Loading --> TaskFetched(tasks) / Error       │   |
|  ├────────────────────────────────────────────────────────────────────┤   |
|  │ 4. TaskDetailBloc (detail + actions)                               │   |
|  │    Events: LoadTaskDetail(taskId)                                  │   |
|  │            ClaimButtonPressed(taskId, userId)                      │   |
|  │            ApproveORRejectButtonPressed(taskId, approved, remarks?) │   |
|  │            RevertButtonPressed(taskId, userId)                     │   |
|  │            ShowRevertActionDialogBox                                │   |
|  │    States: Initial --> Loading --> Loaded(task, processVars) / Err  │   |
|  │            TaskActionSavingState --> SucessState / Error            │   |
|  │            RevertActionLoading --> RevertActionState / Error        │   |
|  │    Note: "Sucess" typo preserved from source                       │   |
|  └────────────────────────────────────────────────────────────────────┘   |
|                                                                           |
|  CHAT                                                                     |
|  ┌────────────────────────────────────────────────────────────────────┐   |
|  │ 5. ChatAssistantBloc (single BLoC, entire chat system)             │   |
|  │    Events (8):                                                     │   |
|  │      FetchAllConversation(page, size, searchText?, status?)        │   |
|  │      FetchMyConversation(page, size)                               │   |
|  │      FetchChatDataToView(threadId, conversationId)                 │   |
|  │      FetchUserChatConversationSummary(userId)                      │   |
|  │      SendChatMessage(threadId, content, metadata)                  │   |
|  │      DeleteChatMessage(messageId, threadId)                        │   |
|  │      AssignChatConversation(convId, threadId, targetUserId,        │   |
|  │        assignType: ASSIGN|DELEGATE|REASSIGN, reason?)              │   |
|  │      CloseChatConversation(conversationId, threadId)               │   |
|  │    States (16):                                                    │   |
|  │      ChatAssistantInitial                                          │   |
|  │      ConversationsLoadingState/LoadedState/ErrorState              │   |
|  │      AssignLoadingState/SuccessState/ErrorState                    │   |
|  │      DelegateLoadingState/SuccessState/ErrorState (shared w/       │   |
|  │        REASSIGN)                                                   │   |
|  │      CloseLoadingState/SuccessState/ErrorState                     │   |
|  │      SendMessageLoadingState/SuccessState/ErrorState               │   |
|  └────────────────────────────────────────────────────────────────────┘   |
|                                                                           |
|  OUTREACH CAMPS                                                           |
|  ┌────────────────────────────────────────────────────────────────────┐   |
|  │ 6. OutreachCampsBloc (camp list + lifecycle)                       │   |
|  │    Events: FetchOutreachCamps                                      │   |
|  │            StartCampEvent(campId, campScheduleId)                  │   |
|  │            FetchCampPatientsEvent(campId)                          │   |
|  │    States: OutreachCampsLoading --> Loaded(camps) / Error          │   |
|  │            StartCampStateLoading --> Success / Error4              │   |
|  │            FetchCampPatientsStateLoading --> Success / Error       │   |
|  ├────────────────────────────────────────────────────────────────────┤   |
|  │ 7. PatientRegistrationBloc (9 events -- largest BLoC by events)    │   |
|  │    Events: SearchPatientEvent(query, searchType)                   │   |
|  │            RegisterPatientEvent(request)                           │   |
|  │            FetchConsultants(campId)                                │   |
|  │            SearchCoOrdinatorEvent(query)                           │   |
|  │            UpdateCoOrdinatorEvent(request)                         │   |
|  │            SearchZipCodesEvent(query, level)                       │   |
|  │            FetchOverBookingSlotsEvent(resourceCalendarId)          │   |
|  │            FileDownloadEvent(documentId)                           │   |
|  │            FileUploadEvent(file, metadata)                         │   |
|  │    Shared across: PatientRegistrationScreen + ManageCoordinators   │   |
|  ├────────────────────────────────────────────────────────────────────┤   |
|  │ 8. AadharBloc (single-purpose, created/disposed with screen)       │   |
|  │    Events: AuthenticateAadhar(frontImage, backImage, aadhaarNumber) │   |
|  │    States: Initial --> Loading --> Success(AadhaarResultModel) / Err │   |
|  └────────────────────────────────────────────────────────────────────┘   |
|                                                                           |
|  SETTINGS & NOTIFICATIONS                                                 |
|  ┌────────────────────────────────────────────────────────────────────┐   |
|  │ 9. PreferenceBloc                                                  │   |
|  │    Events: LoadPreferences, PreferenceSave                         │   |
|  │    States: PreferenceIntialState (sic) --> Loaded / Saving /       │   |
|  │            Saved / Failed                                          │   |
|  ├────────────────────────────────────────────────────────────────────┤   |
|  │ 10. FcmBloc                                                        │   |
|  │    Events: FetchFcmUserInfo                                        │   |
|  │    States: Initial --> Loading --> Fetched / FetchFailure           │   |
|  └────────────────────────────────────────────────────────────────────┘   |
|                                                                           |
+===========================================================================+
```

---

## 10. Complete API Registry

### 10.1 Authentication APIs

```
 # | Method | Endpoint                                      | Auth     | Purpose
---+--------+-----------------------------------------------+----------+----------------------------------
 1 | GET    | /api/registry/_fetch-domain?org={code}         | None     | Resolve org code to base URL
 2 | POST   | {base}gateway-api-v1/auth/login                | None     | Login (username + password)
 3 | POST   | {base}api/reload/token                         | Refresh  | Token refresh
 4 | POST   | {base}api/device-session                       | Bearer   | Register FCM token
 5 | DELETE | {base}api/device-session/{deviceId}             | Bearer   | Deregister FCM (logout)
```

### 10.2 Task Management APIs

```
 # | Method | Endpoint                                      | Purpose
---+--------+-----------------------------------------------+----------------------------------
 6 | GET    | /mdm/api/jbpm/tasks/personal                   | My Tasks queue
 7 | GET    | /mdm/api/jbpm/tasks/group                      | Group Tasks queue
 8 | GET    | /mdm/api/jbpm/tasks/all                        | All Tasks queue
 9 | GET    | /api/jbpm/tasks/{id}/process-variable           | Task process variables
10 | POST   | /api/jbpm/tasks/{id}/claim-start                | Claim + start task
11 | POST   | /amb/api/jbpm/tasks/{id}/release                | Revert (release) task
```

### 10.3 Billing APIs

```
 # | Method | Endpoint                                      | Purpose
---+--------+-----------------------------------------------+----------------------------------
12 | GET    | /amb/invoicelite                                | Fetch invoice details
13 | POST   | /amb/invoice/discount                           | Apply discount (triggers workflow)
14 | POST   | /amb/invoice/retrospect                         | Retrospective adjustment
15 | GET    | /amb/receipts                                   | Fetch receipt details
16 | POST   | /amb/receipt/cancel                             | Cancel receipt (triggers workflow)
17 | GET    | /amb/refunds                                    | Fetch refund details
18 | POST   | /amb/app/refund                                 | Initiate refund (triggers workflow)
19 | GET    | /amb/unbilled-documents                         | Fetch unbilled documents
20 | POST   | /amb/app/unbilled                               | Process unbilled doc
21 | GET    | /amb/medication-request                          | Fetch single medication request
22 | GET    | /amb/medication-requests                         | Fetch medication request list
```

### 10.4 Chat APIs

```
 # | Method | Endpoint                                      | Purpose
---+--------+-----------------------------------------------+----------------------------------
23 | POST   | /prm/_search/user/all-chat-conversation         | ALL conversations (paginated)
24 | GET    | /prm/chat-conversations/user/chats              | MY conversations
25 | POST   | /prm/_assign                                    | Assign conversation to self
26 | POST   | /prm/_delegate                                  | Delegate to another staff member
27 | POST   | /prm/_reassign                                  | Reassign conversation
28 | POST   | /prm/_close                                     | Close conversation
29 | POST   | /prm/api/chat-messages                          | Store message in PRM backend
```

### 10.5 Outreach Camp APIs (PRM: 7 + MPI: 1 + MDM: 1 + AMB: 2 + DMS: 2 + Veri5: 1)

```
 # | Method | Endpoint                                      | Purpose
---+--------+-----------------------------------------------+----------------------------------
30 | GET    | /prm/api/outreach-health-camps                  | Fetch camp list
31 | GET    | /prm/api/outreach/patients                      | Fetch camp patients
32 | POST   | /prm/api/outreach/patients                      | Register patient at camp
33 | POST   | /prm/api/outreach/temp-numbers                  | Generate temp ID (new patients)
34 | PUT    | /prm/api/outreach-camp/update/coordinators       | Add/remove coordinators
35 | POST   | /mpi/api/search/patients                        | MPI patient search
36 | GET    | /mdm/api/_search/zipcodes                       | Address cascading lookup
37 | GET    | /amb/api/resource-calendars/over-booking         | Overbooking slots
38 | POST   | /dms/api/document-records/upload                | Upload documents (Aadhaar)
39 | GET    | /dms/api/document-records/download              | Download documents
40 | POST   | https://sandbox.veri5digital.com/.../docInfoExtract | Aadhaar KYC extraction
```

### 10.6 Settings APIs

```
 # | Method | Endpoint                                      | Purpose
---+--------+-----------------------------------------------+----------------------------------
41 | GET    | /mdm/api/logged-in/organizations                | Fetch user's organizations
42 | GET    | /mdm/api/logged-in/all-unit-hscs                | Fetch units within org
43 | GET    | /uaa/api/account/preferences                    | Fetch user preferences
44 | POST   | /uaa/api/account/preferences                    | Save user preferences
```

---

## 11. Screen Inventory

```
MODULE                   | SCREEN                          | ENTRY POINT
─────────────────────────+─────────────────────────────────+────────────────────────────
Auth (3)                 | ClientSetupScreen               | App cold start (first time)
                         | LoginScreen                     | No valid token
                         | FacilitySelectionScreen         | Post-login (>1 org)

Home (1)                 | HomeScreen                      | Post-login setup complete

Task Management (3)      | TaskListScreen                  | Home > Tasks
                         | TaskDetailScreen                | Task card tap
                         | RejectRemarksSheet              | Reject action (bottom sheet)

Task Detail (7)          | InvoiceDetailScreen             | 6 task types route here
                         | ReceiptDetailScreen             | Receipt Approval/Cancellation
                         | RefundDetailScreen              | Refund Approval
                         | UnbilledDocumentDetailScreen    | UnBilled Invoice Approval
                         | HighValueDetailScreen           | HighValue Medication Approval
                         | AuthorizationDetailScreen       | Authorization Approval
                         | LchmDetailScreen                | Mandatory Brand Approval

Chat (3)                 | ConversationListScreen (2 tabs) | Home > Chat
                         | ChatScreen                      | Conversation card tap
                         | DelegateDialog                  | Delegate action (dialog)

Outreach Camps (6)       | OutreachHealthCampsScreen       | Home > Outreach
                         | CampDetailScreen                | Camp card tap
                         | OutreachPatientsScreen          | Camp > View Patients
                         | PatientRegistrationScreen       | Patients > + Add
                         | ManageCoordinatorsSheet         | Camp Detail > Manage (sheet)
                         | AadharAuthScreen                | Registration > Verify Aadhaar

Settings (4)             | PreferencesScreen               | Side menu > Preferences
                         | LanguageSelectionScreen         | Preferences > Language
                         | OrganizationSelectionScreen     | Preferences > Switch Facility
                         | UnitSelectionScreen             | Preferences > Switch Unit

Privacy (1)              | PrivacyPolicyScreen (WebView)   | Side menu > Privacy Policy

TOTAL: ~28 screens (+ bottom sheets and dialogs)
```

---

## 12. SharedPreferences Key Registry

```
 # | Key                     | Type          | Set When              | Cleared On
---+-------------------------+---------------+-----------------------+------------------
 1 | client_baseUrl          | String        | Client setup success  | NEVER (survives
   |                         |               |                       |  logout)
 2 | access_token            | String        | Login, token refresh  | Logout
 3 | refresh_token           | String        | Login, token refresh  | Logout
 4 | logged-in-id            | String        | Login success         | Logout
 5 | logged-in-login         | String        | Login success         | Logout
 6 | logged-in-name          | String        | Login success         | Logout
 7 | logged-in-unit          | String        | Login, unit switch    | Logout
 8 | logged-in-user          | String (JSON) | Login success         | Logout
 9 | fcm_token               | String        | FCM token received    | Logout
10 | appSharedPreferences    | String (JSON) | Preference save       | Logout
```

---

## 13. Build Configuration

```
FOUR BUILD FLAVORS
===================
 Flavor | Login Endpoint Prefix              | Config Name         | Purpose
--------+------------------------------------+---------------------+-------------------
 prod   | gateway-api-v1/auth/login          | aham_appconfig      | Production
 dev    | dev/gateway-api-v1/auth/login       | aham_appconfig_dev  | Development
 sqa    | sqa/gateway-api-v1/auth/login       | aham_appconfig_sqa  | QA Testing
 uat    | uat/gateway-api-v1/auth/login       | aham_appconfig_uat  | User Acceptance

FIREBASE CONFIG
================
 Package: org.nh.prod.aham
 Project: narayana-health
 google_app_id: 1:xxxxx:android:xxxxx
 Services: FCM, Remote Config, Analytics
```

---

## Quick Reference Card

```
+===========================================================================+
||                       AHAM AT A GLANCE                                  ||
+===========================================================================+
|                                                                           |
|  WHAT:    Hospital admin app for Narayana Health staff                     |
|  WHO:     Billing approvers, care coordinators, camp operators             |
|  STACK:   Flutter/Dart + BLoC + jBPM + ACS + Firebase                     |
|  VERSION: 2.6.1 (Build 10513)                                             |
|  PACKAGE: org.nh.prod.aham                                                |
|                                                                           |
|  MODULES:   4 (Tasks, Chat, Camps, Settings)                              |
|  BLoCs:    10                                                             |
|  SCREENS:  ~28                                                            |
|  APIs:     44 endpoints across 7 backend services + 1 external            |
|  TASK TYPES: 13 approval types across 7 detail screens                    |
|  LANGUAGES: 8 (en, bn, gu, hi, kn, mr, ta, te)                           |
|  CACHE:    4 layers (Memory, Image, ObjectBox, Filesystem)                |
|  TOKENS:   3 types (access ~30m, refresh ~30d, ACS ~24h)                  |
|  OFFLINE:  Read-only (cached data), no offline writes                     |
|  SECURITY: JWT + ObjectBox AES-256 + TLS + Android KeyStore               |
|  PRIVACY:  Cayman Islands / Data Protection Act 2021                      |
|                                                                           |
+===========================================================================+
```
