# AHAM Flow Documentation — Progress Log

> Tracking detailed flow documentation for junior developer implementation.
> Target: Every user flow documented with exact API calls, state changes, error handling, and edge cases.

---

## Iteration 1 — 2026-04-22

**Mode:** SETUP + LOGIN/AUTH
**Files Created:**
- `PROGRESS.md` (this file)
- `README.md` (index of all flows)
- `00_LOGIN_AUTH_FLOW.md` (login, token management, multi-facility, logout)

**Source Files Read:**
- `specs/07_AUTH_SETTINGS.md`, `specs/08_SCREENS_NAVIGATION.md`
- `specs/02_API_LAYER.md`, `specs/01_DATA_MODELS.md`
- `specs/09_LOCAL_STORAGE.md`
- `product-docs/04_PLATFORM_SETTINGS.md`
- `FlutterAcsPlugin.java`, `ACSCommunication.java` (native plugin layer)
- `AndroidManifest.xml`, `strings.xml`
- `GeneratedPluginRegistrant.java` (17 plugins)

**Decisions:**
- Flow docs organized as numbered files (00_, 01_, ...) in reading order
- Each flow doc includes: User Journey, Screen-by-Screen walkthrough, API calls, BLoC state machines, Error handling, Edge cases
- AHAM is Flutter/Dart — Dart source is in binary (libapp.so), so flows are reconstructed from specs + Java plugin layer + binary analysis

---

## Iteration 2 — 2026-04-22

**Mode:** TASK MANAGEMENT (13 approval types)
**Files Created:**
- `01_TASK_MANAGEMENT_FLOW.md` (850+ lines — 13 approval types, jBPM, BLoC architecture)

**Source Files Read:**
- `specs/03_TASK_MANAGEMENT.md` (1118 lines), `product-docs/01_TASK_MANAGEMENT.md` (761 lines)
- `specs/01_DATA_MODELS.md` (933 lines), `specs/02_API_LAYER.md` (1400 lines)
- `specs/08_SCREENS_NAVIGATION.md` (497 lines), `specs/10_ERROR_SECURITY.md` (559 lines)
- `specs/04_BILLING_FINANCE.md` (1379 lines)

**Key Details Documented:**
- All 13 approval types with unique fields, validation rules, and screens
- Task lifecycle: OPEN → CLAIMED → IN_PROGRESS → DONE → CLOSED
- BLoC architecture: TaskBloc (list) + TaskDetailBloc (actions)
- 3 task queues: My Tasks, Group Tasks, All Tasks
- jBPM integration with process variables per task type
- Invoice amount calculation formula
- Guard conditions (409 concurrent claim, 403 self-approval, 400 refund mode)
- Complete API reference with request/response JSON

---

## Iteration 3 — 2026-04-22

**Mode:** CHAT & MESSAGING
**Files Created:**
- `02_CHAT_MESSAGING_FLOW.md` (2,044 lines — ACS integration, BLoC, conversations, delegation)

**Source Files Read:**
- `specs/05_CHAT_SYSTEM.md`, `product-docs/02_CHAT_CONVERSATIONS.md`
- `specs/01_DATA_MODELS.md` (chat models), `specs/02_API_LAYER.md` (chat endpoints)
- `specs/08_SCREENS_NAVIGATION.md`, `specs/09_LOCAL_STORAGE.md`
- All 11 Java files in flutter_acs/ native plugin

**Key Details Documented:**
- 3-layer architecture: Flutter BLoC → Native Java Plugin → ACS SDK
- 8 BLoC events, 16 states with diagrams
- ACS native plugin: 5 method channel methods, 2 event handlers (of 8 possible)
- 11 PRM API endpoints + DMS file management
- ObjectBox StoreChatDataModel schema with 7 CRUD operations
- 4-layer caching (MemoryCache, ImageCache, ObjectBox, Filesystem)
- 8 message types with detection waterfall
- Conversation lifecycle: UNASSIGNED → ACTIVE → CLOSED
- 3 assignment types: ASSIGN, DELEGATE, REASSIGN
- Real-time pipeline: ACS event → native parse → event channel → BLoC → ObjectBox → UI
- File attachment upload/download with caching
- Offline behavior (read-only, sync on reconnect)
- FCM notification integration with deep linking

---

## Iteration 4 — 2026-04-22

**Mode:** OUTREACH HEALTH CAMPS
**Files Created:**
- `03_OUTREACH_CAMPS_FLOW.md` (1,919 lines — camp lifecycle, patient registration, Aadhaar KYC, coordinators)

**Source Files Read:**
- `specs/06_OUTREACH_CAMPS.md`, `product-docs/03_OUTREACH_CAMPS.md`
- `specs/01_DATA_MODELS.md` (camp models), `specs/02_API_LAYER.md` (camp endpoints)
- `specs/08_SCREENS_NAVIGATION.md`, `specs/10_ERROR_SECURITY.md`

**Key Details Documented:**
- Camp lifecycle: NOT_STARTED → IN_PROGRESS → DONE/CANCELLED
- 8-step patient registration flow with MPI search
- Aadhaar KYC via Veri5 Digital (feature-flagged)
- Coordinator management (min 1, ADD/REMOVE actions)
- 3 BLoCs: OutreachCampsBloc (3 events), PatientRegistrationBloc (9 events), AadharBloc (1 event)
- 8 data models with full field tables
- Address cascading (Country→State→District→City→Pincode)
- 14 API endpoints across PRM, MPI, MDM, AMB, DMS + external Veri5
- 7 screens with navigation flow
- Validation rules (patient, camp, Aadhaar)
- 32 error messages + 10 BLoC error states
- Offline support analysis (confirmed vs inferred)

---

## Iteration 5 — 2026-04-22

**Mode:** BILLING, FINANCE, SETTINGS & NOTIFICATIONS (combined)
**Files Created:**
- `04_BILLING_SETTINGS_FLOW.md` (~1,900 lines — billing hierarchy, 7 detail screens, multi-facility, FCM, localization, security)

**Source Files Read:**
- `specs/04_BILLING_FINANCE.md` (1379 lines), `specs/07_AUTH_SETTINGS.md` (500 lines)
- `specs/08_SCREENS_NAVIGATION.md` (497 lines), `specs/09_LOCAL_STORAGE.md` (467 lines)
- `specs/10_ERROR_SECURITY.md` (559 lines)
- `product-docs/04_PLATFORM_SETTINGS.md` (900+ lines)

**Key Details Documented:**
- Invoice model (40+ fields, 6 groups) with complete amount formula
- Receipt lifecycle: CREATED → ACTIVE → CANCELLATION_PENDING → CANCELLED
- Refund lifecycle with validation rules (amount, mode, reason)
- 5 discount types with calculation order
- Authorization model with invoice WithAuth field recalculation
- Retrospect Invoice 2-stage approval (Stage 1 approver ≠ Stage 2 approver)
- 6 additional models: HighValue, LCHM, Reversal, Unbilled, MedicationRequest, InvoiceDiscount
- 11 billing API endpoints with full request/response JSON
- 7 detail screens sharing TaskDetailBloc with routing logic
- 7 workflow execution methods + encounter number polling
- Multi-facility switching (organization + unit/HSC levels)
- FCM notification system (6 types, 3 app states, token lifecycle)
- Remote config / feature flags (enable_aadhaar_registration, 4 flavors)
- 8 language localization (en, bn, gu, hi, kn, mr, ta, te)
- Privacy policy (Cayman Islands, DPA 2021)
- Security architecture (TLS, JWT, ObjectBox AES-256, Android KeyStore, 10 permissions)
- 4-layer caching (MemoryCache, ImageCache, ObjectBox, Filesystem)
- SharedPreferences (10 keys with logout cleanup)
- 17 billing + 5 settings error messages
- 12 billing + 10 settings edge cases
- 11-phase implementation checklist

**Decision:**
- Combined Billing/Finance and Settings/Notifications into a single doc (04_) instead of separate 04_ and 05_ as originally planned in README.md, because facility switching and notifications are deeply intertwined with billing data scope.

---

## Iteration 7 — 2026-04-22

**Mode:** FUNCTIONAL FLOW + CONSOLIDATION
**Files Created:**
- `Functional Flows/staff journey.md` (1,678 lines — master workflow, all status machines, 44 API registry, 10 BLoCs, screen inventory)

---

## Iteration 8 — 2026-04-22

**Mode:** CONSOLIDATION — README update, status alignment
**Files Updated:**
- `README.md` — All 5 flows marked DONE, line counts, key numbers, functional flow link

**Status: ALL AHAM FLOWS COMPLETE**
- 5 flow documents: 10,705 lines
- 1 functional flow: 1,678 lines
- Total: 12,383 lines of implementation-level documentation

---
