# AHAM - Engineering Specs Index

**Package:** `org.nh.prod.aham` (Narayana Health)
**Framework:** Flutter (Dart) | **State:** BLoC pattern | **Local DB:** ObjectBox
**Source:** Reverse-engineered from `libapp.so` binary (46K strings) + 11 Java native plugin files
**Chat:** Azure Communication Services (custom `flutter_acs` plugin)

---

## Spec Files

| # | File | Coverage |
|---|------|----------|
| 01 | [01_DATA_MODELS.md](./01_DATA_MODELS.md) | 67 data models with fields: Patient, Camp, Chat, Task, Invoice, Receipt, Refund, Address hierarchy, ACS native models |
| 02 | [02_API_LAYER.md](./02_API_LAYER.md) | 44 endpoints across 7 microservices: Gateway, MDM, jBPM, AMB, MPI, PRM, Registry |
| 03 | [03_TASK_MANAGEMENT.md](./03_TASK_MANAGEMENT.md) | 13 approval workflows, jBPM integration, claim/approve/reject/revert, 3 task queues |
| 04 | [04_BILLING_FINANCE.md](./04_BILLING_FINANCE.md) | Invoice/Receipt/Refund/Unbilled/Discount/Authorization models, 6 workflow methods, screen layouts |
| 05 | [05_CHAT_SYSTEM.md](./05_CHAT_SYSTEM.md) | ACS native plugin (8 event types), method/event channels, ObjectBox caching, 11 API endpoints, BLoC architecture |
| 06 | [06_OUTREACH_CAMPS.md](./06_OUTREACH_CAMPS.md) | Camp lifecycle, patient registration, Aadhaar KYC (Veri5), address hierarchy, coordinator/doctor management |
| 07 | [07_AUTH_SETTINGS.md](./07_AUTH_SETTINGS.md) | Login, JWT refresh, multi-facility, preferences, user profile, FAQ, privacy, FCM, remote config |
| 08 | [08_SCREENS_NAVIGATION.md](./08_SCREENS_NAVIGATION.md) | 32 screens, route map, BLoC state machines, custom widgets, menu structure |
| 09 | [09_LOCAL_STORAGE.md](./09_LOCAL_STORAGE.md) | ObjectBox schema, ChatHistoryDbManager CRUD, SharedPreferences, caching strategy, offline support |
| 10 | [10_ERROR_SECURITY.md](./10_ERROR_SECURITY.md) | 599 error messages, 12 BLoC error states, validation rules, privacy policy, encryption, audit logging |

---

## Architecture Overview

```
AHAM Flutter App
|
|-- BLoC Layer (12 BLoCs)
|   |-- LoginBloc, AuthenticationBloc
|   |-- TaskBloc, TaskDetailBloc
|   |-- ChatAssistantBloc
|   |-- OutreachCampsBloc, PatientRegistrationBloc
|   |-- ClientSetupBloc, PreferenceBloc, UserProfileBloc
|   |-- FAQBloc, AadharBloc
|
|-- Repository Layer
|   |-- LoginRepository, TaskRepository, ChatAssistantRepository
|   |-- ClientRepository, UserRepository, PreferenceRepository
|   |-- OutreachCampsRepo
|
|-- Service Layer
|   |-- TaskService, ChatAssistantService, OutreachCampsService
|   |-- UserService, PrefernceService, AppUtilityService
|
|-- Native Plugin Layer
|   |-- flutter_acs (Azure Communication Services)
|       |-- FlutterAcsPlugin.java (method + event channels)
|       |-- ACSCommunication.java (SDK integration)
|       |-- ChatMessageDTO, ChatMessageReceived, ChatMessageDeleted
|       |-- ChatParticipantsModel, ChatThreadDeletedModel
|       |-- CustomChatMessageType (8 event types)
|
|-- Local Storage
|   |-- ObjectBox (StoreChatDataModel, ChatHistoryDbManager)
|   |-- SharedPreferences (tokens, session, preferences)
|
|-- Backend Microservices (7)
    |-- Gateway (/gateway-api-v1/) - Auth
    |-- MDM (/mdm/api/) - Master Data, Users, Tasks
    |-- AMB (/amb/api/) - Billing, Invoices, Receipts, Refunds
    |-- MPI (/mpi/api/) - Master Patient Index
    |-- PRM (/prm/api/) - Chat, Outreach Camps
    |-- Registry (/api/registry/) - Domain config
    |-- jBPM (/api/jbpm/) - Workflow engine
```

---

## Feature Map

```
AHAM App
|
|-- TASK MANAGEMENT (Core)
|   |-- 13 approval types (invoices, receipts, refunds, discounts, meds, auth)
|   |-- 3 queues: MY TASKS / GROUP TASKS / ALL TASKS
|   |-- jBPM workflow: Claim → Approve/Reject/Revert
|
|-- CHAT CONVERSATIONS
|   |-- Azure Communication Services (real-time)
|   |-- Assign / Delegate / Reassign conversations
|   |-- Text, attachments, audio, PDF messages
|   |-- ObjectBox local caching
|
|-- OUTREACH HEALTH CAMPS
|   |-- Camp lifecycle (NOT_STARTED → IN_PROGRESS → DONE)
|   |-- Patient registration with MPI search
|   |-- Aadhaar KYC (Veri5 Digital)
|   |-- Doctor & coordinator management
|
|-- BILLING & FINANCE
|   |-- Invoice, Receipt, Refund, Unbilled documents
|   |-- 5 discount types (discretionary, non-disc, sponsor, patient, plan)
|   |-- Authorization with amount recalculation
|   |-- Retrospect invoice (2-stage approval)
|
|-- PLATFORM
    |-- JWT auth + token refresh
    |-- Multi-facility support
    |-- Push notifications (FCM)
    |-- Offline support (ObjectBox)
    |-- 8 languages (en, bn, gu, hi, kn, mr, ta, te)
```

---

## Complete ATHMA/Backend Code Reference

| Service | Prefix | Key Endpoints |
|---------|--------|---------------|
| Gateway | `/gateway-api-v1/` | auth/login |
| MDM | `/mdm/api/` | users, organizations, jbpm tasks |
| AMB | `/amb/api/` | invoices, receipts, refunds, medications, appointments |
| MPI | `/mpi/api/` | patient search |
| PRM | `/prm/api/` | chat, outreach camps, patients |
| jBPM | `/api/jbpm/` | task claim/start, release, process variables |
| Registry | `/api/registry/` | domain fetch |
| UAA | `/uaa/api/` | account, preferences |
| COM | `/com/api/` | comments, FCM tokens |
| DMS | `/dms/api/` | document upload/download |
