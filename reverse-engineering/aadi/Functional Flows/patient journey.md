┌────────────────────────────────────────────────────────────────────┐
│              PATIENT JOURNEY — SIMPLIFIED (LEVEL 1)               │
└────────────────────────────────────────────────────────────────────┘

[Admission / Encounter Created]
              |
              v
[Patient Appears in Inpatient List]
              |
              v
[Triage / Visibility]
(filters, risk, ICU, unread, priority)
              |
              v
[Initial Assessment]
(baseline clinical capture)
              |
              v
[Active Care Loop]
  ├─ Progress Notes
  ├─ Medication / Orders
  ├─ Investigations / Results
  ├─ Cross Consultation
  ├─ Patient / Family Communication
  ├─ Care Team / Tasks / Checklists
  └─ Risk / Monitoring
              |
              v
        {Ready for Discharge?}
           |              |
          No              Yes
           |              |
           |              v
           |     [Discharge Preparation]
           |     (final diagnosis, meds, advice,
           |      discharge intimation / MFD)
           |              |
           |              v
           |     [Discharge Summary]
           |     Draft -> Review -> Sign-off -> Complete
           |              |
           |              v
           |        [Final Outcome]
           |        ├─ Discharged
           |        ├─ Dead
           |        └─ Absconded
           |              |
           |              v
           |        [Post-Care / Continuity]
           |        Follow-up / Past Records / Med History
           |
           +--------------------> back to [Active Care Loop]


Yes — let's do a **real next iteration**, with much more detail.

I'm treating **"release" as discharge / release from inpatient care**, and I'm reconstructing the **patient journey through AADI** from the feature docs you shared: patient list + assessment + progress notes + medication/orders + communication + checklist/tasks + discharge summary + follow-up/post-care.

I'm splitting it into a few connected ASCII diagrams so it stays readable.

Legend:

```text
[State / page / artifact]
{Decision / status}
(Background side effect)
==> important side effect / workflow creation
--> main flow
```

---

## 0) Login & Session Management — The Gateway

> **Source-code-level detail from `00_LOGIN_AUTH_FLOW.md`**

Before any clinical work begins, the clinician must authenticate. AADI supports three login methods targeting two geographies (India +91, Cayman Islands +1-345).

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LOGIN & SESSION FLOW                              │
│                                                                             │
│   ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐            │
│   │ Phone OTP    │  │ Email OTP    │  │ Username / Password   │            │
│   │ (default)    │  │              │  │ (admin fallback)      │            │
│   └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘            │
│          │                 │                      │                        │
│          ▼                 ▼                      ▼                        │
│   POST validate-      POST validate-        POST /api/                    │
│   user-by-mobile      user-by-email         authenticate                  │
│          │                 │                      │                        │
│          ▼                 ▼                      │                        │
│   ┌───────────────────────────────┐               │                        │
│   │ Multi-user dropdown          │               │                        │
│   │ (if phone/email has >1 user) │               │                        │
│   └──────────┬────────────────────┘               │                        │
│              ▼                                    │                        │
│      POST validate-otp                            │                        │
│      (6-digit, 5min TTL, 30s resend)              │                        │
│              │                                    │                        │
│              ▼                                    ▼                        │
│   ┌──────────────────────────────────────────────────┐                     │
│   │              { id_token, refresh_token }          │                     │
│   └──────────────────────┬───────────────────────────┘                     │
│                          │                                                 │
│                          ▼                                                 │
│   ┌──────────────────────────────────────────────────┐                     │
│   │              POST-LOGIN BOOTSTRAP                 │                     │
│   │  1. Store tokens → SecureStorage (TOKEN, REFRESH) │                     │
│   │  2. Store TOKEN_CONFIG → { expiresIn, issuedAt }  │                     │
│   │  3. GET /api/account → DOCTOR_PROFILE + roles     │                     │
│   │  4. POST /api/device-session → register FCM       │                     │
│   │  5. Init SQLite DB "aadi" (encrypted, versioned)  │                     │
│   │  6. Subscribe ACS chatClient.startRealtime()      │                     │
│   │  7. Navigate → /landing                           │                     │
│   └──────────────────────────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Login: Implementation Details

| Aspect | Detail |
|--------|--------|
| **3 login methods** | Phone OTP (POST validate-user-by-mobile), Email OTP (POST validate-user-by-email), Username/Password (POST /api/authenticate) |
| **Phone validation** | India: `^[6-9]\d{9}$` (10 digits), Cayman: `^\d{7}$` (7 digits, prefix +1-345) |
| **OTP config** | 6 digits, 300s (5min) expiry, 30s resend countdown, max 3 attempts before 15min lockout |
| **Multi-user** | If phone/email has >1 user, a dropdown lets the user choose which account to authenticate as |
| **Test bypass** | Phone `4000999889`, OTP `999889` always validates (dev/QA) |

### Token Lifecycle

| Token | Lifetime | Storage Key | Refresh Strategy |
|-------|----------|-------------|------------------|
| Access (JWT) | ~30 min | `TOKEN` | Proactive: 60s before expiry (checked every 10s) |
| Refresh (JWT) | ~30 days | `REFRESH_TOKEN` | Used to obtain new access token; if expired -> full logout |
| ATHMA (EHR gateway) | ~5 hours | managed by `medication-order.service.ts` | Auto-refresh on ATHMA 401 |
| ACS (Azure Comm) | ~24 hours | `ACS_TOKEN` | Refreshed via /api/acs-token endpoint |

**Token refresh interceptor pipeline:**

```text
Request A ──> interceptor ──> token expired? ──YES──> start refresh
                                                        │
Request B ──> interceptor ──> refresh in progress? ─YES─┤
                                                        │
Request C ──> interceptor ──> refresh in progress? ─YES─┤ (queued)
                                                        ▼
                                          refresh complete ──> retry B, C
```

### Session Security

- **Jailbreak/root detection:** On every app launch, blocks app with full-screen modal if detected
- **Multi-device logout:** ACS delivers `LOGOUT_MESSAGE` context, forcing older session out (401 on next API call)
- **Logout cleanup:** Unsubscribe ACS, unregister FCM (POST /api/unsubscribe-device-session), clear all SecureStorage keys EXCEPT `DOMAIN`, `CLIENT`, `COUNTRY` (preserved for login pre-fill), drop all SQLite user data (tables remain, rows deleted)

### Secure Storage Architecture

SecureStorageService wraps `@capacitor/preferences` with an **in-memory Map cache** (63 keys) for synchronous reads. Includes one-time migration from legacy `window.localStorage`.

### App Initialization (Every Cold Start / Resume)

```text
1. Jailbreak detection     → block if rooted
2. GET /api/app-version    → force update modal if required
3. Read TOKEN              → none? → /login; expired? → refresh; valid? → proceed
4. Open/migrate SQLite DB  → version-based sequential migrations
5. ACS subscription        → chatClient.startRealtime() + event handlers
6. FCM setup               → ensure device token registered
7. Navigate → /landing
```

### Network Monitoring

- Capacitor Network plugin: `networkStatus$` BehaviorSubject<boolean>
- Offline: requests queued, SQLite used for reads, "Offline" banner shown
- Online recovery: queued requests replayed, patient list re-synced, ACS reconnected

---

## 1) Master patient journey — from admission to discharge and aftercare

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                    AADI PATIENT JOURNEY — MASTER MAP                        │
└──────────────────────────────────────────────────────────────────────────────┘

[Patient admitted / encounter exists]
                |
                v
[Patient info fetched from server]
                |
                v
[Stored / synced locally]
                |
                v
[Appears in Inpatient List]
    |
    +--> [Patient card shows name / MRN / age / gender / weight / consultant]
    +--> [Badges: unread, MFD, MLC, visit type, risk score, pin, ICU/ward]
    +--> [Filtering / sorting / search / triage]
    |
    v
[Clinician opens patient record / patient chat / detail context]
    |
    +---------------------------------------------------------------+
    |                                                               |
    v                                                               v
[Initial Assessment]                                        [Existing patient follow-up work]
    |                                                               |
    |--> 27 widgets / clinical sections                             |--> previous notes
    |--> structured clinical baseline                               |--> meds
    |--> submit assessment                                          |--> labs / results
    |                                                               |--> attachments / past records
    +==> (Create review task)                                       |
    |                                                               |
    +---------------------------+-----------------------------------+
                                |
                                v
                    [ACTIVE INPATIENT CARE LOOP]
                                |
                                +--> [Progress Notes]
                                |       |
                                |       +--> vitals
                                |       +--> rich text note
                                |       +--> linked meds / investigations / cross-consults
                                |       +--> draft or submit
                                |       +==> auto-ack or acknowledgment task
                                |
                                +--> [Medication Ordering / Current Medications]
                                |       |
                                |       +--> search drug
                                |       +--> configure dose/frequency/route/duration
                                |       +--> save/order
                                |       +--> administration timeline / legends / safety checks
                                |
                                +--> [Investigations / Results]
                                |       |
                                |       +--> order / review / attach to notes
                                |
                                +--> [Cross Consultation]
                                |       |
                                |       +--> search unit / doctor
                                |       +--> create request
                                |       +==> optional notify target doctor
                                |
                                +--> [Patient / Family Communication]
                                |       |
                                |       +--> send patient communication message
                                |       +--> IVR call to bystander/family
                                |
                                +--> [Care Team Management]
                                |       |
                                |       +--> primary consultant or location-based team
                                |       +--> concurrency-safe editing
                                |
                                +--> [Risk / Monitoring]
                                |       |
                                |       +--> risk score trend
                                |       +--> scorecard / vitals / CT scorecard / ECG viewer
                                |
                                +--> [Operational Workflow]
                                        |
                                        +--> checklists
                                        +--> tasks
                                        +--> handover
                                        +--> incident report
                                        +--> PAC / OT notes (specialized surgical path)

                                |
                                v
                     {Is patient ready for discharge?}
                          |                    |
                         No                    Yes
                          |                    |
                          |                    v
                          |         [Discharge Intimation / MFD path]
                          |                    |
                          |                    +--> mark for discharge
                          |                    +--> optionally revert intimation
                          |                    |
                          +--------------------+
                                               |
                                               v
                                    [Discharge Summary Work]
                                               |
                                               +--> create/get current summary
                                               +--> populate/edit 28 sections
                                               +--> sync sections from EHR widgets
                                               +--> comments / review workflow
                                               +--> sign-off
                                               +--> print PDF
                                               |
                                               v
                                 {Final patient disposition/status}
                                  |        |            |          |
                                  |        |            |          |
                                  v        v            v          v
                           [DISCHARGED] [MARK_DEAD] [ABSCONDED] [Still ACTIVE]
                                  |
                                  v
                         [Moves to Discharged Patients view]
                                  |
                                  v
                           [Post-care / continuity path]
                                  |
                                  +--> follow-up scheduling
                                  +--> past records
                                  +--> medication history / reconciliation
                                  +--> discharge PDF / archived summary
```

This overall flow is grounded in the inpatient list, initial assessment, risk score, communication, care team, discharge tracking/navigation, medication/order system, progress notes, discharge summary, addendum features, and checklist system.

---

## 2) Detailed entry + onboarding + first clinical baseline

```text
┌──────────────────────────── ENTRY / ONBOARDING ────────────────────────────┐

[Clinician logs in / lands on dashboard]
        |
        +--> [Home Dashboard]
        |       +--> Inpatients
        |       +--> Activity Area
        |       +--> Discharged Patients
        |       +--> Appointments / VC
        |
        v
[Open Inpatients]
        |
        v
[Patient list sync]
        |
        +--> GET patient list from server
        +--> add / replace into local DB
        +--> load visible patient list
        |
        v
[Patient list rendered]
        |
        +--> sort: pin first -> ward sort -> latest message activity
        +--> show risk / unread / MFD / MLC / visit type / comorbidities / ward
        +--> filters:
                - location
                - ward
                - unit
                - primary consultant
                - attending consultant
                - visit type
                - discharge intimation
                - MLC / MFD
                - dead / absconded
        |
        v
[Select patient]
        |
        v
[Open patient context]
        |
        +--> patient chat / detail
        +--> progress notes
        +--> meds
        +--> investigations
        +--> cross-consult
        +--> initial assessment
        +--> risk score
        +--> communication
        +--> gallery / attachments
        +--> vital trends
        +--> discharge summary
        |
        v
[Initial Assessment]
        |
        +--> fetch current widget data if present
        +--> clinician fills dynamic assessment widgets
        |       - allergy
        |       - comorbidities
        |       - chief complaints
        |       - social / family / medical / surgical history
        |       - vitals
        |       - general / systemic exam
        |       - provisional diagnosis
        |       - lines/tubes / implantables
        |       - communicable disease
        |       - discharge planning
        |       - MLC
        |       - etc.
        |
        +--> add / modify / delete per widget
        +--> favorite-assisted entry on some widgets
        |
        v
[Submit Initial Assessment]
        |
        +==> [Assessment status becomes submitted]
        +==> [INITIAL_ASSESSMENT_REVIEW task created]
```

The above comes from the patient list load/filter logic, navigation tree, and initial assessment widget architecture and submit flow.

### Entry / Onboarding: Implementation Details

**Landing dashboard (landing.page.ts):**
- GET /api/my-patient-list?login={login} -> returns counts: inpatientCount, appointmentCount, activityAreaCount, dischargedCount
- Greeting: "Good Morning, Dr. {firstName}" from DOCTOR_PROFILE in SecureStorage

**Inpatient list (home.page.ts ~2112 lines):**

| API | Purpose | ATHMA Code |
|-----|---------|------------|
| GET /api/my-patient-list?login={login}&full=true | Full patient list (pull-to-refresh) | -- |
| GET /api/athma-records-with-token?searchType=IPL_003&searchValue={q} | Search patients to add | IPL_003 |
| POST /api/dm-user-list/{login}/patient/{mrn}/add | Add patient to doctor's list | -- |
| GET /api/messages/{mrn}?since={iso} | Download messages for new patient | -- |

**SQLite: patient_list table** (30 columns, 5 indexes):

```sql
ORDER BY pin_flag DESC, pin_order ASC, ward_sort ASC, last_msg_time DESC
```

**9-filter system:** OR within same filter, AND across filters. Filters saved to SecureStorage key `PATIENT_LIST_FILTERS`. Unit defaults from DOCTOR_PROFILE.unit.

**Add patient — swipe gesture thresholds:**

| Swipe % | Visual Feedback | Action |
|---------|-----------------|--------|
| 30% | Card shifts right, green hint | Preview only |
| 60% | Green background, "Add" text | Preview only |
| 100% | Full green, checkmark | **Patient added** |

Post-add: POST dm-user-list -> SQLite INSERT -> GET messages for patient.

**Pull-to-refresh sync:** GET full patient list -> diff against SQLite (INSERT new, UPDATE changed, soft DELETE removed) -> recalculate unread counts -> re-run sort + filters.

**Real-time updates via ACS BehaviorSubjects:**

| Event | Source | UI Update |
|-------|--------|-----------|
| chatMessageReceived$ | New message | Increment unread, update sort time |
| patientTransferred$ | Bed/ward change | Update ward/bed, re-sort |
| patientDischarged$ | Discharge | Remove from list |
| riskScoreUpdated$ | Risk change | Update badge color |
| flagUpdated$ | MFD/MLC change | Show/hide badge |

**Offline behavior:** Patient list works fully offline via SQLite. Filter/sort use same SQL queries. Add-patient queued and synced on reconnect.

---

## 2a) Real-Time Messaging Architecture — The Unified Communication Hub

> **Source-code-level detail from `02_PATIENT_CHAT_FLOW.md`**

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                     MESSAGE ROUTING ARCHITECTURE                         │
│                                                                          │
│   ACS WebSocket ──> chatService.chatMessageReceived$                     │
│         │                                                                │
│         ▼                                                                │
│   Parse message.context:                                                 │
│   ┌─────────────────────────────────────────────────────────────────┐    │
│   │ PATIENT_MESSAGE  → INSERT into SQLite patient_message table     │    │
│   │                    → update unread count → re-render chat       │    │
│   │                                                                 │    │
│   │ PATIENT_INFO     → update patient demographics in SQLite        │    │
│   │                    → refresh patient card badges                 │    │
│   │                                                                 │    │
│   │ CARE_TEAM        → SAVE: upsert CareTeam SQLite table          │    │
│   │                    DELETE: remove from CareTeam table            │    │
│   │                    → BehaviorSubject.next(patientInfoId)         │    │
│   │                                                                 │    │
│   │ LOGOUT_MESSAGE   → force logout (session stolen by new device)  │    │
│   │                                                                 │    │
│   │ DM_USER_INFO     → update direct message user info              │    │
│   │                                                                 │    │
│   │ DIRECT_MESSAGE   → non-patient direct message routing           │    │
│   └─────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

### 16 Message Categories with Avatar Colors

| # | Category | Avatar | Color | Key Content |
|---|----------|--------|-------|-------------|
| 1 | CHAT (TEXT) | (bubble) | N/A | Plain text, left=others, right=self |
| 2 | CHAT (IMAGE) | (bubble) | N/A | Thumbnail grid (max 8), tap to zoom |
| 3 | CHAT (AUDIO) | (bubble) | N/A | Audio player, duration display |
| 4 | CHAT (VIDEO) | (bubble) | N/A | Video thumbnail, tap to play |
| 5 | ADMISSION_MESSAGE | **AM** | #78A715 (green) | Consultant, date, category, location |
| 6 | INVESTIGATION_ORDER | **IO** | #9C8447 (gold) | Investigation names, priority flags |
| 7 | MEDICATION_ORDER | **MO** | #E56B6F (pink) | Drug, frequency, dosage, duration |
| 8 | LAB_RESULT | **LT** | lab theme | Parameters, values, abnormal flags |
| 9 | RAD_RESULT | **XR/ECG** | #9951E1 (purple) | Study name, thumbnails, AI findings |
| 10 | DISCHARGE_SUMMARY | **DS** | #25A244 (green) | Status badge, dates, location |
| 11 | PROGRESS_NOTES | **PN** | #1E71ED (blue) | Sender + dept, note body |
| 12 | CROSS_CONSULTATION | **CC** | #EC9F05 (yellow) | Priority, doctor, department |
| 13 | SYSTEM_REMINDER | Alert | #F43636 (red) | Alert label, reminder body |
| 14 | BED_TRANSFER | **TF** | #D9B309 (yellow) | From -> To ward/bed |
| 15 | KEY_VALUE_DATA | **V** | #3F5DAA (blue) | Vitals key-value pairs |
| 16 | ASSESSMENT_FORM | Dynamic | #086375 (teal) | Form name, score, severity |

### Message Send Pipeline (Optimistic Insert)

```text
User taps Send
  │
  ├── 1. Construct PatientMessage (UUID, NOT_SENT status)
  ├── 2. INSERT into SQLite (appears instantly in chat)
  ├── 3. POST via patientInfoService.sendMessageHTTPS()
  │       ├── SUCCESS: UPDATE status=SUCCESS, sentTime=server time, actionId=server ID
  │       └── FAILURE: stays NOT_SENT, retry picks up via sendNotSentDataToServer()
  │
  └── Retry: SELECT WHERE msg_status='NOT_SENT' AND sent_time < now-5s
             → re-POST each, runs on timer + network reconnect
```

### File Upload via Web Worker

```text
File selected (camera/gallery/video) → resolveFilePath() → base64 conversion
  │
  └── Web Worker (file-loader.worker.js):
        1. POST FormData to api/uploadFileData
        2. Monitor xhr.upload.onprogress → postMessage({progress})
        3. Validate checksum (response vs local)
        4. Checksum mismatch → retry up to maxRetryIntervalsForFileUpload
        5. INVALID_FILE_FORMAT → delete message from SQLite + toast error
```

### Offline Message Queue

- Messages created offline get status `NOT_SENT`
- On reconnect: ACS subscription restored, fetch messages since `lastMessageDate`, merge with SQLite
- NOT_SENT messages replayed via `sendNotSentDataToServer()`

---

## 3) Detailed active care loop — what keeps happening while patient is admitted

```text
┌──────────────────────────── ACTIVE CARE LOOP ──────────────────────────────┐

                    +--------------------------------------+
                    |  Patient remains under inpatient care|
                    +------------------+-------------------+
                                       |
                                       v

                +--------------------------------------------------+
                |  DAILY / EVENT-DRIVEN CLINICAL WORK HAPPENS      |
                +--------------------------------------------------+
                   |            |             |          |       |
                   |            |             |          |       |
                   v            v             v          v       v

        [Progress Notes] [Medication] [Investigations] [Cross-  [Patient /
                                                        Consult]  Family Comm]
                   |            |             |          |       |
                   +------------+-------------+----------+-------+
                                       |
                                       v
                            [Updated patient context]
                                       |
                                       +--> latest clinical note
                                       +--> active meds / statuses
                                       +--> pending orders / results
                                       +--> consult requests
                                       +--> patient/family communication history
                                       +--> new tasks / acknowledgments / alerts
                                       |
                                       v
                            {Need more care changes?}
                                 |             |
                                Yes            No
                                 |             |
                                 +-------------+
                                       |
                                       v
                            {Ready for discharge?}
                                 |             |
                                No             Yes
                                 |             |
                                 +-------------+
```

This loop is the heart of the app: progress notes, medication ordering, consults, communication, risk/vitals, and tasks all keep updating the patient's active-care state.

---

## 4) Progress notes — deepest subflow

```text
┌──────────────────────────── PROGRESS NOTES FLOW ───────────────────────────┐

[Clinician opens Progress Notes]
        |
        v
[Generate / fetch document number]
        |
        v
[Select source department]
        |
        v
[Enter optional vitals]
        |
        +--> heart rate
        +--> BP
        +--> temperature
        +--> SpO2
        |
        v
[Write rich text progress note]
        |
        +--> CKEditor-style note body
        +--> macros/templates
        +--> full-screen editor option
        |
        v
[Optionally add linked orders]
        |
        +--> medication orders
        +--> investigation orders
        +--> cross-consultations
        |
        v
{Save as draft or submit?}
     |                  |
    Draft              Submit
     |                  |
     v                  v
[Store draft artifacts]  [Publish note]
     |                  |
     |                  +--> publish linked meds/investigations/cross-consults
     |                  +--> create patient message integration payload
     |                  |
     |                  v
     |         {Is submitter primary consultant?}
     |               |                    |
     |              Yes                   No
     |               |                    |
     |               v                    v
     |      [Auto-acknowledge]   [Pending acknowledgment]
     |                                   |
     |                                   +==> create acknowledgment task
     |
     v
[Later reopen / edit / resubmit]
```

Progress notes support draft and submit flows, optional vitals, linked orders, macro usage, auto-acknowledgment for the primary consultant, and task-driven acknowledgment otherwise.

### Progress Notes: Implementation Details

**Status values:** `"DONE"` (not "SUBMITTED" — this is the actual code value), `"DRAFT"`

**API endpoints:**

| Operation | Endpoint | ATHMA Code |
|-----------|----------|------------|
| Generate doc number | GET api/app-progress-notes-document-no | -- |
| Load department list | GET employee-category-mappings (filtered by unit) | -- |
| Remember last department | GET/SET getUserLastSelectedDepartment() (ng-select) | -- |
| Check for existing draft | GET via EHR_034 (filter: encounterNumber + login + status=DRAFT) | EHR_034 |
| Submit new note | POST api/progress-notes-record-action | -- |
| Edit submitted note text | PUT api/progress-notes-record-action (action: "EDIT") | -- |
| Acknowledge note | POST EHR_032 (documentNumber + acknowledge object) | EHR_032 |

**Draft artifact endpoints (per content type):**

| Artifact | Create/Update | Delete | Publish |
|----------|---------------|--------|---------|
| Note shell | POST/PUT EHR_034 | -- | EHR_034 PUT (status=DONE) |
| Vitals | POST/PUT EHR_031 | -- | EHR_031 |
| Medications (each) | POST EHR_021 | DELETE EHR_021 | EHR_084 POST (batch) |
| Investigations (each) | POST EHR_087 | DELETE EHR_087 | EHR_085 POST (batch) |
| Cross-consultation | POST EHR_088 | DELETE EHR_088 | EHR_086 POST |

**Unchart flow (2-step):**

```text
1. GET EHR_034 by note ID → full note object
2. User confirms via alert dialog
3. PUT EHR_034 with unchart = { by, byLogin, on }
4. Note text rendered with <s> strikethrough in chat
```

**Validation gates before submit:**
- BP consistency: if systolic filled, diastolic required (and vice versa)
- At least one field must have content: progressNotes.text OR any vital OR medication.length > 0 OR investigation.length > 0 OR crossConsultation populated
- If validation fails -> toast, abort

**Auto-acknowledge logic:**

```text
if (account.login === patientInfoDetails.consultantLogin)
  → acknowledge = { by: primaryConsultant, byLogin: consultantLogin, on: now }
else
  → delete concept.progressNotes.acknowledge (manual ack required)
```

**CKEditor config:** Bold, Italic, BulletedList, NumberedList. Clipboard blocked (paste/copy events stopped). Large paste guard: >30 chars single change -> revert to previous content.

---

## 5) Medication system — deepest subflow

```text
┌──────────────────────────── MEDICATION FLOW ───────────────────────────────┐

[Enter medication ordering]
        |
        +--> context can be:
        |      - inpatient medication list
        |      - discharge summary medications
        |      - progress notes medications
        |
        v
[Load medication reference data]
        |
        +--> frequencies
        +--> route list
        +--> food instructions
        +--> duration units
        +--> prefixes / favorites
        |
        v
[Search medication]
        |
        +--> min 3 chars
        +--> brand or generic
        +--> hsc-aware search
        |
        v
[Select drug]
        |
        v
[Configure dosage]
        |
        +--> dose amount
        +--> morning / afternoon / evening / night
        +--> frequency
        +--> duration + unit
        +--> route
        +--> food instruction
        +--> instructions / patient instructions
        +--> quantity calculation
        |
        v
[Add medication to order list]
        |
        +--> duplicate validation
        +--> discharge checks
        +--> network / token checks
        |
        v
[Submit / order]
        |
        v
{Medication lifecycle status}
        |
        +--> ADDED
        +--> ORDERED
        +--> PENDING
        +--> DISPENSED / PARTIALLY_DISPENSED
        +--> ISSUED / PARTIALLY_ISSUED
        +--> CLOSED / PARTIALLY_CLOSED
        +--> CANCELLED / REJECTCED
        |
        +--> ACTIVE actions:
        |      - stop
        |      - hold
        |      - unhold
        |
        +--> card/timeline view:
        |      - slot states
        |      - overdue / refused / vomited / allergy / modified / stopped
        |
        +--> safety:
               - drug monograph
               - drug interaction check
               - LASA warning
```

The medication flow and status lifecycle come directly from the medication & orders system doc, including draft/order context, dosage construction, validations, lifecycle states, timeline/slot views, and safety features.

### Medication: Implementation Details

**3 ordering contexts:**

| Context Code | Full Name | Used In |
|---|---|---|
| `ML` | Medication List | Inpatient medication ordering |
| `DS` | Discharge Summary | Discharge medication ordering |
| `PN` | Progress Notes | Ordering from within progress notes |

**5 medication categories:** Regular, SOS (PRN), Infusion, Narcotic, STAT

**Key API endpoints:**

| Operation | ATHMA Code | Method |
|-----------|------------|--------|
| Search medications | EHR_020 | GET /medications/search?searchTerm={q}&searchType={BRAND\|GENERIC} |
| Frequency reference | EHR_023 | GET /medications/drug-frequencies |
| Route/unit reference | EHR_025 | GET (concept: route, durationUnit) |
| Favorites CRUD | EHR_024 | GET/POST/DELETE |
| Submit order | EHR_021 | POST /medications/orders |
| Current meds by date | EHR_056 | GET /medications/current?date={date}&encounterId={id} |
| Card timings | EHR_168 | GET /medications/card-timings |
| Patient vitals | EHR_169 | GET /patients/{id}/vitals |

**Dosage formula:**

```text
frequency = morning + afternoon + evening + night
daysConversion = duration x unitMultiplier (DAYS=1, WEEKS=7, MONTHS=30)
quantity = Math.ceil(frequency x daysConversion)
```

**Day-wise permutations (auto-generated):**

| Frequency | Non-zero Slots | Example Permutations (dose=1) |
|---|---|---|
| Once Daily (OID) | 1 of 4 | [1,0,0,0] [0,1,0,0] [0,0,1,0] [0,0,0,1] |
| Twice Daily (BID) | 2 of 4 | [1,0,0,1] [1,0,1,0] [0,1,0,1] [1,1,0,0] etc. |
| Thrice Daily (TID) | 3 of 4 | [1,1,0,1] [1,1,1,0] [1,0,1,1] [0,1,1,1] |
| Four times (QID) | 4 of 4 | [1,1,1,1] |

**Fractional doses (MedicationOrderCustomDosagePage):**
- Each slot independently tappable, cycling: 1/4 -> 1/2 -> 0 -> 1 -> 2 -> 3 -> ... -> 1/4 (wraps)
- Internal: 0.25, 0.50, 0, 1, 2, etc.

**Drug form to unit mapping:**

| Drug Form | Default Unit |
|---|---|
| TABLET | tablet |
| CAPSULE | capsule |
| SYRUP | ml |
| INHALER | puff |
| INJECTION | ml |
| DROPS | drop |
| OINTMENT | application |

**Swipe-to-order gesture:**

| Swipe % | Visual | Haptic | Action |
|---|---|---|---|
| 0-29% | Default (white) | None | None |
| 30-59% | Light green gradient, "Swipe to order" | None | None |
| 60-100% | Solid green, "Confirmed!" | Short vibration | **SUBMIT** |
| Release <60% | Snap-back animation | None | Reset |

**24-hour timeline dashboard (CurrentMedicationDashboardPage):**
- 5 category tabs: Regular, SOS, Infusion, Narcotic, STAT (+ Stopped)
- `IntersectionObserver` (threshold 0.3) auto-highlights visible category
- Current time: vertical red line, auto-scrolls to center
- Per-slot status colors: OVERDUE (#FCCFCF), PENDING (#F1F1F1), ADMINISTERED (#2FB7B1), WITHHELD (#FFF3CD), STOPPED (#DC3545)

**Infusion progress calculation:**

```text
mlPerMinute = ratePerHour / 60
completedPercent = (givenTillNow / totalVolume) x 100%
remainingMinutes = (totalVolume - givenTillNow) / mlPerMinute
```

---

## 5a) Lab Results & Investigation System

> **Source-code-level detail from `04_LAB_RESULTS_FLOW.md`**

```text
┌──────────────────────────── LAB RESULTS PIPELINE ──────────────────────────┐

[Investigation Order placed]
        |
        +--> Entry A: InvestigationListPage (inpatient modal)
        |      API: EHR_105 (favorites), EHR_104 (search, min 3 chars)
        |      Submit: POST api/investigation-order-record-action
        |              action='ADD_AND_ORDER', priority=NORMAL|URGENT
        |
        +--> Entry B: InvestigationOrdersPage (previous orders history)
        |      API: GET api/_search/investigation-order-records
        |
        +--> Entry C: FollowupInvestigationsPage (discharge follow-up)
               3 tabs: Favorites (EHR_024), Order Sets (MDM_003), Search (MDM_004)
        |
        v
[Raw results arrive from lab]
        |
        v
[LabResultProcesserUtil — 5-step pipeline]
        |
        ├── Step 1: Extract display name (investigationDisplayName || name)
        ├── Step 2: Check report hold (reportHoldStatus==='Y' → RETURN, do not show)
        ├── Step 3: Check report availability (report[].length > 0 → showReport=true)
        ├── Step 4: Process services tree (recursive, up to 3 levels)
        │           Level 1 services REVERSED (backend ordering fix)
        │           Each leaf → getJSONLabItem() → normalized LabItem
        └── Step 5: Post-process (if inline values exist → showReport=false)
        |
        v
[Result presentation]
        |
        ├── Result Matrix: 2D table (parameters x dates)
        │   Current column highlighted: #FFFDE7 (light yellow)
        │   Normal text: #717171 (gray), Abnormal text: #E35241 (red)
        │   Auto-scroll to current result column
        │
        └── D3.js Trend Graph: scaleTime X, scaleLinear Y
            4px circles, 50px/point minimum, auto-scroll right
            Normal: #7dc9b8 (green), Abnormal: #F43636 (red)
            Y-axis in separate fixed SVG during horizontal scroll
```

**7 abnormal flags:**

| Flag | Name | Color (trend) | Color (matrix) |
|---|---|---|---|
| N | Normal | #7dc9b8 (green) | #717171 (gray) |
| H | High | #F43636 (red) | #E35241 (red) |
| L | Low | #F43636 (red) | #E35241 (red) |
| PH | Panic High | #F43636 (red) | #E35241 (red) |
| PL | Panic Low | #F43636 (red) | #E35241 (red) |
| AH | Alert High | #F43636 (red) | #E35241 (red) |
| AL | Alert Low | #F43636 (red) | #E35241 (red) |

**6 report types:** ATTACHMENT_REPORT, DIAGNOSTIC_REPORT, EXTERNAL_REPORT, OUTSOURCE_REPORT, LIS_REPORT, SRM_REPORT

**Investigation order status badges:**

| Status | Color | Note |
|---|---|---|
| ORDERED | Gray | Placed, not started |
| INPROGRESS | Blue | Sample collected |
| REPORT_READY | Green | Results available |
| CANCELLED | Strikethrough+gray | -- |
| REJECTCED | Red | Known backend typo — do NOT fix |
| APPROVAL_REQUIRED | Orange | Needs supervisor |

---

## 6) Cross-consultation + communication + care team

```text
┌──────────────────────── CONSULT / COMMUNICATION ───────────────────────────┐

[A. Cross Consultation]
    |
    v
[Search unit]
    |
    v
[Search doctor in selected unit]
    |
    v
[Validate not consulting self]
    |
    v
[Generate cross-consult document number]
    |
    v
[Create cross-consult request]
    |
    +--> doctor
    +--> unit / department
    +--> remarks
    +--> priority NORMAL / URGENT
    |
    +==> [Optional notify target doctor]
    |
    v
[List / review prior cross-consults]


[B. Patient / Family Communication]
    |
    v
[Load communication history]
    |
    +--> get bystanders/family
    +--> compose message (char-limited)
    +--> confirm send
    +--> send message
    +--> auto-refresh history
    |
    +==> [Optional IVR call to family/bystander]


[C. Care Team]
    |
    v
[Open care team config]
    |
    +--> mode = PRIMARY_CONSULTANT or HSC/location-based
    +--> role = doctor / nurse / paramedics
    +--> add/edit members
    +--> concurrency check using modifiedOn
    |
    v
[Save team template / patient team context]
```

These are separate but parallel collaboration channels inside active care: specialist coordination, family communication, and team ownership.

### Care Team: Implementation Details

> **Source-code-level detail from `06_CARE_TEAM_VIDEO_CONSULTATION_FLOW.md`**

**Two layers:**

| Layer | Scope | Storage | API Count |
|-------|-------|---------|-----------|
| Template (admin) | Organizational blueprints | Server only | 14 endpoints (CareTeamManagementService) |
| Patient (clinical) | Per-patient active team | SQLite + WebSocket sync | 7 endpoints (CareTeamService) |

**Template modes:**
- `PRIMARY_CONSULTANT`: organized by doctor (Unit -> Primary Consultant -> Team Members)
- `HSC`: organized by physical ward location (Unit -> HSC/Location -> Team Members)

**Member role detection algorithm:**

```text
1. Check userObj.group.code → DOCTOR / NURSE / PARAMEDICS
2. Fallback: check userObj.group.parent.code → DOCTOR / NURSE / PARAMEDICS
```

**SQLite CareTeam table (11 columns):**

```sql
CREATE TABLE CareTeam (
  id, patientInfoId, memberLogin, memberDisplayName, memberRole,
  isPrimary, unitCode, unitName, hscCode, hscName, syncStatus
);
-- Upsert: REPLACE INTO for WebSocket-driven updates
```

**WebSocket care team sync:**

```text
Message context = CARE_TEAM
  ├── Action: SAVE → upsert in SQLite (check exists by patientInfoId+memberLogin)
  ├── Action: DELETE → DELETE FROM CareTeam WHERE id = {payload.id}
  └── Post-processing: BehaviorSubject.next(patientInfoId)
       → all subscribers (PatientChatPage etc.) reload care team
```

### Handover: Implementation Details

- Task definition code: `"IP-CONSULTANT-HANDOVER"` (fixed constant)
- Accept: POST accept -> UPDATE SQLite patient record with new consultant info -> remove from pending list
- Reject: POST reject -> remove from pending list
- Auto-dismiss modal when `pendingRequests.length === 0`

### Cross-Consultation: APIs

| # | Endpoint | Purpose |
|---|----------|---------|
| 1 | GET /api/cross-consultations/search-doctors (filter: unit) | Find consultants |
| 2 | POST /api/cross-consultations | Submit CC request |
| 3 | GET /api/cross-consultations (filter: patient) | CC history |
| 4 | GET /api/cross-consultations/{id} | Single CC detail |
| 5 | PUT /api/cross-consultations | Update CC status |

**Two submission paths:** Direct submit (standalone) vs Return to Progress Notes (from PN context, CC persisted when note saved).

**Validation gates:** Cannot consult self, cannot consult patient's primary consultant, unit required, doctor required, network connectivity check.

---

## 6a) Video Consultation Journey

> **Source-code-level detail from `06_CARE_TEAM_VIDEO_CONSULTATION_FLOW.md`**

```text
┌──────────────────────────── VIDEO CONSULTATION ────────────────────────────┐

[Appointment Dashboard (HomeVcPage)]
        |
        +--> Date navigation: [< Previous] [Calendar] [Next >]
        +--> 3-chip filter: Unit / Type / Status
        +--> Header counts: Pending (BOOKED+SCHEDULED+ARRIVED), Total
        +--> Auto-refresh: setInterval 50 min (3,000,000ms)
        |
        v
[Appointment Card — status determines actions]
        |
        +--> BOOKED/SCHEDULED/ARRIVED → Start VC, Cancel
        +--> IN_PROGRESS              → Rejoin VC, OPD Notes, AI Chart
        +--> DONE/COMPLETED           → OPD Notes, Summary PDF, Past Records
        +--> CANCELLED_BY_*           → View only
        +--> NO_SHOW                  → Cancel, Reschedule
        |
        v
[Start/Rejoin Video Call]
        |
        ├── Provider Selection (server config):
        │   ├── AGORA (primary): AgoraRTC.createClient({mode:"rtc", codec:"vp8"})
        │   │   Join: client.join(appId, channelName, token, uid)
        │   │   Publish: client.publish([localAudioTrack, localVideoTrack])
        │   │   App ID: fetched dynamically via ATHMA AMB_008
        │   │
        │   └── OPENTOK (legacy): OT.initSession(apiKey, sessionId)
        │       Publisher: 320x240, 7fps, insertMode:'append'
        │       Connect: session.connect(token) → session.publish(publisher)
        |
        ├── In-Call Controls: Mute, Camera, Flip, Chat, IVR, End
        │   IVR fallback: POST EHR_074 → server calls patient's phone
        │
        ├── Audit Trail: vcAuditStart (EHR_076), vcAuditStop (EHR_077)
        │   Client info: POST EHR_075
        │
        ├── KeepAwake.keepAwake() during call
        │
        └── STOMP-over-SockJS In-Call Chat:
              Connection: new SockJS("{DOMAIN}websocket/connect?access_token={token}")
              Subscribe: /consultation-topic/{appointmentNumber}
              Message ID: "{appointmentNumber}-AADI-{timestamp}"
              5 quick replies: Rejoin, IVR Call, Prescription, Admission, Noise
              Auto-reconnect: setTimeout 5s on disconnect
        |
        v
[Post-Consultation]
        |
        ├── OPD Notes: camera/gallery (max 5, 1250x800)/PDF upload
        │   Upload: base64FileDataWithChecksum → PUT consultation-documents
        │   Mark DONE: sendStatusUpdate via EHR_069
        │
        ├── Cancel Appointment modal
        ├── Chat History (read-only)
        ├── Past Prescriptions (OP/IP history)
        └── AI Chart (summary PDF)
```

**10 appointment statuses:**

| Status | Color | Available Actions |
|--------|-------|-------------------|
| BOOKED | Blue | Start VC, Cancel |
| SCHEDULED | Blue | Start VC, Cancel |
| ARRIVED | Green | Start VC, Cancel |
| IN_PROGRESS | Green | Rejoin VC, OPD Notes, AI Chart |
| DONE | Gray | OPD Notes, Summary PDF, Past Records |
| COMPLETED | Gray | OPD Notes, Summary PDF, Past Records |
| CANCELLED_BY_DOCTOR | Red | View only |
| CANCELLED_BY_PATIENT | Red | View only |
| REJECTED | Red | View only |
| NO_SHOW | Orange | Cancel, Reschedule |

---

## 7) Operational control layer — checklists, tasks, handover, specialized side paths

```text
┌────────────────────────── OPERATIONAL CONTROL ─────────────────────────────┐

[Checklist path]
    |
    v
[Load checklist template]
    |
    +--> response type = yes/no or tick
    +--> sequential or non-sequential
    +--> witness = mandatory / optional / none
    |
    v
[Fill checklist]
    |
    +--> validate mandatory answers
    +--> validate correct/default response when required
    +--> assign witness if required
    |
    v
{Save draft or submit?}
    |                 |
   Draft             Submit
    |                 |
    v                 v
 [DRAFT]       {reviewRequired?}
                     |         |
                    Yes        No
                     |         |
                     v         v
             [PENDING_APPROVAL] [COMPLETED]
                     |
                     v
               {Witness decision}
                  |         |
                 Approve    Reject
                  |         |
                  v         v
             [COMPLETED] [REJECTED]
                               |
                               v
                        [Re-edit -> Draft -> Resubmit]


[Task path]
    |
    +--> progress note acknowledgment tasks
    +--> initial assessment review tasks
    +--> discharge summary creation/signoff tasks
    +--> nursing capture notes tasks
    |
    v
[Assignee works task from Activity Area]


[Handover path]
    |
    v
[Consultant handover request]
    |
    +--> REQUESTED
    +--> ACCEPTED / REJECTED


[Specialized side journeys]
    |
    +--> OT Notes
    +--> PAC (pre-anesthesia checkup)
    +--> incident reports
    +--> CT scorecard
    +--> ECG viewer
```

Checklist lifecycle, task integration, handover, PAC/OT, incident reports, CT scorecard, and other specialized flows are from the checklist and addendum docs.

---

## 8) Discharge path — the release/discharge journey in detail

```text
┌──────────────────────────── DISCHARGE PATH ────────────────────────────────┐

[Patient still ACTIVE under inpatient care]
        |
        v
{Clinically preparing for discharge?}
        |                     |
       No                    Yes
        |                     |
        |                     v
        |            [Discharge Intimation]
        |                     |
        |                     +--> mark ready for discharge
        |                     +--> dischargeIntimation flag/badge visible
        |                     +--> later can revert if needed
        |                     |
        +---------------------+
                              |
                              v
                    [Start / continue Discharge Summary]
                              |
                              +--> get existing summary by admission
                              +--> or create new summary draft
                              |
                              v
                    [Populate / edit clinical sections]
                              |
                              +--> admission reason
                              +--> chief complaint
                              +--> history sections
                              +--> vitals
                              +--> allergy
                              +--> exams
                              +--> investigation results
                              +--> diagnosis
                              +--> medication at discharge
                              +--> consult summary
                              +--> urgent care
                              +--> condition at discharge
                              +--> discharge advice
                              +--> dietary / therapy advice
                              +--> procedures
                              +--> follow-up
                              +--> cause of death (if applicable)
                              +--> comorbidities
                              |
                              +--> sync specific widget sections from EHR
                              +--> copy previous admission summary if needed
                              +--> regenerate from current data if needed
                              +--> macro support on some sections
                              |
                              v
                    {Discharge summary workflow state}
                              |
          +-------------------+-------------------+-------------------+
          |                   |                   |                   |
          v                   v                   v                   v
       [NEW]               [DRAFT]      [SENT_FOR_REVIEW]     [UNDER_REVIEW]
                                                   |                   |
                                                   |                   +--> comments
                                                   |                   +--> amendments
                                                   |                   +--> revert review
                                                   |                   |
                                                   +-------------------+
                                                                   |
                                                                   v
                                                              [SIGN_OFF]
                                                                   |
                                                                   v
                                                              [COMPLETE]
                                                                   |
                                                                   +--> PDF print/download
                                                                   +--> archived/read-only
                                                                   |
                                                                   v
                                                      [Patient disposition finalized]
                                                                   |
                     +----------------------------+-----------------+--------------------+
                     |                            |                                      |
                     v                            v                                      v
               [DISCHARGED]                [MARK_DEAD]                            [ABSCONDED]
                     |
                     v
         [Shown in discharged patients / recent discharge list]
                     |
                     v
         [Post-discharge continuity: follow-up / past records / meds]
```

This is the closest reconstruction of the discharge/release journey from the docs: discharge intimation, summary drafting and review, comments/amendments, sign-off, PDF generation, final disposition, and post-discharge continuity.

### Discharge Summary: Implementation Details

> **Source-code-level detail from `05_PROGRESS_NOTES_DISCHARGE_FLOW.md`**

**Actual 7 states (corrected from simplified diagram):**

```text
                    ┌─────────┐
                    │   NEW   │
                    └────┬────┘
                         │ save as draft
                         ▼
                    ┌─────────┐
              ┌─────│  DRAFT  │
              │     └────┬────┘
              │          │ sendForReview()
              │          ▼
              │  ┌────────────────┐
              │  │ PENDING_REVIEW │◄────────────────┐
              │  └───────┬────────┘                  │
              │          │ review()                   │
              │          ▼                            │
              │    ┌──────────┐                       │
              │    │ REVIEWED │                       │
              │    └────┬─────┘                       │
              │         │ signOff()                    │
              │         ▼                              │
              │   ┌───────────┐                        │
              │   │ PUBLISHED │                        │
              │   └─────┬─────┘                        │
              │         │ amend()                      │
              │         ▼                              │
              │    ┌─────────┐                         │
              │    │ AMENDED │─── sendForReview() ─────┘
              │    └─────────┘
              │
              └── (can continue editing draft)
```

**State-to-flag mapping (determines which UI controls are enabled):**

| Status | editMode | sendForReview | signOff | review | amend |
|--------|----------|---------------|---------|--------|-------|
| NEW | false | false | false | false | false |
| DRAFT | true | true | false | false | false |
| PENDING_REVIEW (reviewer) | true | false | true | true | false |
| PENDING_REVIEW (other) | false | false | false | false | false |
| REVIEWED | true | conditional | false | false | false |
| PUBLISHED | false | false | false | false | true |
| AMENDED | false | false | false | false | true |

**Revert from PENDING_REVIEW back to DRAFT:** DS_009 PUT

**Comments:** Only during PENDING_REVIEW by assigned reviewer. Stored per encounter key: `{encounterNumber}_ds_comments` in SecureStorage for offline access.

**Key DS API endpoints:**

| Operation | Code | Method |
|-----------|------|--------|
| Get/create summary | DS_001..DS_003 | GET/POST |
| Regenerate from EHR | DS_004 | GET |
| Search previous admissions (copy) | DS_005 | GET |
| Copy previous (server-side) | DS_006 | PUT |
| Generate PDF | DS_007 | GET |
| Revert review | DS_009 | PUT |
| Section sync from EHR | DS_011 | POST |
| Discharge intimation | DS_012 | PUT |
| Revert intimation | ADT_002 | PUT |

**Sync behavior (DS_011 POST per section):**
- Records: REPLACED with latest from EHR
- Notes (free text): PRESERVED (not overwritten)

**Copy previous:** DS_005 GET (search by MRN, excluding current encounter) + DS_006 PUT (server-side copy, replaces ENTIRE summary including all 28 sections). User warned: "This will replace your current summary."

**AI voice-to-text (AiDischargeSummaryPage, 518 lines):**

```text
1. SpeechRecognition.start({ language:'en-US', partialResults:true, allowForSilence:10000 })
2. Real-time transcript display (partial + final results)
3. Inactivity monitor: 10s silence → auto-restart recognition
4. Voice command detection: "EMR done" / "E M R done" / "EMI done" → auto-trigger generation
5. mergeOverlappingSentences() → clean overlapping speech segments
6. POST to AI EMR endpoint → response maps to up to 28 sections
7. Staff review screen → edit/remove/add → POST to EHR (finishConsultation: true)
8. KeepAwake.keepAwake() during entire dictation session
```

**Unsaved changes detection:** `_.cloneDeep()` on page load, `_.isEqual()` before navigation — confirmation dialog if changes detected.

**Validation gates before sign-off:**
1. validateMandatoryWidgets(): FOR EACH mandatory widget, check has notes OR records
2. validateAllBPValues(): BP consistency across all vital entries
3. validateSummary(): at least ONE widget must have dbrecord=true (prevents empty summaries)

**28 sections organized by category:**
History (8): admission-reason, chief-complaint, medical/surgical/family/social-history, past-medication-history, comorbidities
Examination (4): vital-sign, allergy, general/systemic-examination
Diagnosis (4): investigation-results, provisional/final-diagnosis, diagnosis
Treatment (6): medication-at-discharge, active-medication, cross-consultation, operation-and-procedure, urgent-care, emergency-management
Discharge (6): condition-at-discharge, discharge-advice, dietary/therapy-advice, follow-up, cause-of-death

**Macro system:** Eligible only for 4 DS sections: therapy-advice, dietary-advice, urgent-care, discharge-advice (screenType "DS"). Progress Notes uses screenType "PN" for all text sections.

---

## 9) Status machines — the compact way to "see" the system

### Patient/inpatient status

```text
ACTIVE
  |
  +--> MARK_FOR_DISCHARGE
  |        |
  |        +--> DISCHARGED
  |
  +--> MARK_DEAD
  |
  +--> ABSCONDED
```

Patient status/badges and discharge tracking states come from the patient list/discharge tracking docs.

### Progress note status

```text
CREATE
  |
  +--> DRAFT
  |
  +--> DONE (actual code value, not "SUBMITTED")
          |
          +--> ACKNOWLEDGED
```

With the special rule:

```text
If submitter == primary consultant  --> auto-acknowledge
Else                                --> acknowledgment task / later review
```

That logic comes from the progress notes system.

### Medication status

```text
ADDED --> ORDERED --> PENDING --> DISPENSED --> ISSUED --> CLOSED

ORDERED --> CANCELLED / REJECTCED
ACTIVE  --> HOLD / UNHOLD / STOP actions
```

This comes from medication lifecycle and actions.

### Discharge summary status

```text
NEW --> DRAFT --> PENDING_REVIEW --> REVIEWED --> PUBLISHED
                  ^                    |              |
                  |                    +--> COMMENTS  |
                  |                                   v
                  +--- sendForReview() -------- AMENDED
```

This comes from the discharge summary workflow state machine.

### Checklist status

```text
PENDING --> DRAFT --> PENDING_APPROVAL --> COMPLETED
                              |
                              +--> REJECTED --> DRAFT --> PENDING_APPROVAL
```

Checklist status and witness flow come from the checklist system.

### Investigation order status

```text
ADDED --> ORDERED --> INPROGRESS --> REPORT_READY
                 |
                 +--> CANCELLED / REJECTCED / APPROVAL_REQUIRED
```

---

## 10) Data Sync Architecture — Cross-Cutting Concerns

> **Synthesized from all flow documents**

```text
┌──────────────────────────── DATA SYNC ARCHITECTURE ────────────────────────┐

[SQLite Encrypted Database "aadi"]
        |
        +--> @capacitor-community/sqlite, encryption key derived from device
        +--> Seed script: assets/database/aadi.sql (CREATE IF NOT EXISTS)
        +--> Version-based sequential migrations
        +--> 15+ indexes across tables
        |
        +--> Key tables:
        |      patient_list (30 columns, 5 indexes)
        |      patient_message (20 columns, 7 indexes)
        |      CareTeam (11 columns)
        |      handover_requests
        |      filters, checklists, medications, etc.
        |
        v
[SecureStorage (63 keys)]
        |
        +--> In-memory Map cache for synchronous reads
        +--> Capacitor Preferences (disk) for persistence
        +--> Migration from legacy localStorage (one-time)
        +--> Key keys: TOKEN, REFRESH_TOKEN, TOKEN_CONFIG,
        |    DOCTOR_PROFILE, USER_AUTHORITIES, ACS_TOKEN,
        |    ACS_USER_ID, SELECTED_UNIT, PATIENT_LIST_FILTERS,
        |    LAST_SYNC_TIME, DB_VERSION, + 47 feature-specific
        |
        v
[Sync Intervals]
        |
        +--> Online patient list sync: on ionViewWillEnter + pull-to-refresh
        +--> ACS offline recovery: fetch messages from lastMessageDate on reconnect
        +--> Token refresh: 60s before expiry (checked every 10s via setInterval)
        +--> VC appointment refresh: setInterval 50 min (3,000,000ms)
        +--> NOT_SENT message retry: on timer + on network reconnect
        |
        v
[Pull-to-Refresh Flow]
        |
        +--> GET full patient list from server
        +--> Diff against local SQLite:
        |      New patients → INSERT
        |      Updated → UPDATE
        |      Removed → DELETE (soft)
        +--> Recalculate unread counts from messages table
        +--> Re-run sort + active filters
        |
        v
[ACS WebSocket Event Pipeline]
        |
        +--> chatClient.startRealtime() on login/app-init
        +--> Events routed by message.context:
        |      PATIENT_MESSAGE → SQLite insert, unread++
        |      PATIENT_INFO → update demographics
        |      CARE_TEAM → upsert/delete CareTeam table, BehaviorSubject notify
        |      LOGOUT_MESSAGE → force logout (multi-device)
        |      DM_USER_INFO / DIRECT_MESSAGE → direct messaging routing
        |
        v
[Offline Resilience Summary]
        ┌────────────────────────┬───────────────────────┬──────────────────────┐
        │ Feature                │ Online                │ Offline              │
        ├────────────────────────┼───────────────────────┼──────────────────────┤
        │ Patient list           │ Server + SQLite sync  │ SQLite only          │
        │ Chat messages          │ Real-time ACS         │ SQLite (last known)  │
        │ Send message           │ POST + ACS broadcast  │ SQLite NOT_SENT queue│
        │ Filter/sort            │ SQLite query          │ SQLite query (same)  │
        │ Add patient            │ API + SQLite          │ Queued, sync later   │
        │ Care team              │ Server + WebSocket    │ SQLite (last known)  │
        │ Video consultation     │ Agora/OpenTok RTC     │ NOT available        │
        │ Medication ordering    │ ATHMA API required    │ NOT available        │
        │ Lab results            │ ATHMA API required    │ NOT available        │
        │ Progress notes (read)  │ API fetch             │ NOT available        │
        │ Pull-to-refresh        │ Syncs with server     │ Toast "Offline"      │
        └────────────────────────┴───────────────────────┴──────────────────────┘
```

---

## 11) Best mental model to hold in your head

```text
PATIENT
  |
  +--> has encounter / admission
  |
  +--> generates clinical artifacts
  |       - initial assessment
  |       - progress notes
  |       - meds
  |       - investigations
  |       - cross-consults
  |       - discharge summary
  |
  +--> generates workflow artifacts
  |       - tasks
  |       - checklists
  |       - handovers
  |
  +--> generates communication artifacts
  |       - patient/family messages
  |       - IVR calls
  |       - system messages
  |
  +--> moves through lifecycle states
          ACTIVE -> MFD -> DISCHARGED / other final outcomes
```

That is the cleanest "one-frame" understanding of the system reconstructed from your docs.

---

## 12) API Gateway Architecture — ATHMA Proxy

All clinical operations route through the **ATHMA EHR Gateway** (`/api/athma-proxy`), which provides a unified proxy layer over multiple backend systems.

**ATHMA token management:**
- Separate from the main JWT auth token
- ~5 hour TTL
- Managed by `medication-order.service.ts` with auto-refresh on 401
- Token stored and refreshed independently of main session

**Key ATHMA code families:**

| Prefix | Domain | Example Codes |
|--------|--------|---------------|
| EHR_0xx | Progress Notes, Vitals, Acknowledge | EHR_014..EHR_088 |
| EHR_1xx | Investigations, Favorites, Care Team | EHR_104, EHR_105, EHR_124 |
| EHR_0xx | Medications, Orders, Dashboard | EHR_019..EHR_025, EHR_056 |
| EHR_1xx | Medication timings, vitals | EHR_168, EHR_169 |
| EHR_0xx | Video consultation audit | EHR_069, EHR_074..EHR_077 |
| DS_0xx | Discharge Summary CRUD | DS_001..DS_012 |
| MDM_0xx | Master Data Management | MDM_001..MDM_004 |
| AMB_0xx | Appointment/Scheduling | AMB_001..AMB_008 |
| ADT_0xx | Admission/Discharge/Transfer | ADT_002 |
| AI_0xx | AI-powered features | AI_002 (voice-to-text DS) |
| IPL_0xx | Inpatient List | IPL_003 (patient search) |

---

## 13) What is still a little inferred

A few things above are **reconstructed from multiple feature docs rather than one official single BPMN flow**:

* the exact moment-to-moment handoff between all modules,
* how often clinicians bounce between patient chat vs note pages vs medication pages,
* and the exact real-time notification orchestration between modules.

But the overall structure is solidly supported by the feature/system docs you uploaded.

---

Next useful iteration would be either **a swimlane diagram by actor** (`patient / clinician / consultant / pharmacy / system`) or **a backend event-flow version** (`API -> DB -> task -> notification -> UI refresh`).
