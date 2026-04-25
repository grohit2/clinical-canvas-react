# Flow 06: Care Team Management & Video Consultation Systems

**App:** AADI (org.nh.app.aadi) v2.35.0
**Framework:** Ionic 7 / Capacitor 5 / Angular 17+
**Source files:** `care-team-management.service.ts`, `care-team.service.ts`, `cross-consultation.service.ts`, `handover-request.service.ts`, `admin-care-team.page.ts`, `self-care-team.page.ts`, `add-care-team.page.ts`, `primary-consultant.page.ts`, `location-wise.page.ts`, `cross-consultation.page.ts`, `cross-consultation-list.page.ts`, `handover-request.page.ts`, `home-vc.page.ts`, `consultation.service.ts`, `video-consultation.service.ts`, `opdnotesservice.service.ts`, `global.service.ts`

---

## 1. Overview

Care Team Management and Video Consultation are two functionally distinct but organizationally linked systems in AADI. Care teams define **who** is responsible for a patient; video consultation defines **how** remote clinical encounters happen. Both systems converge at the appointment level -- a patient's care team determines which consultants appear in scheduling, and video consultations are the real-time execution of those scheduled appointments.

The Care Team system operates on **two layers**: a **template layer** (organizational blueprints managed by admins) and a **patient layer** (per-patient active teams synced via WebSocket). The Video Consultation system supports **two providers**: **Agora RTC** (primary, VP8 codec) and **OpenTok/TokBox** (legacy, session-based), sharing a common STOMP-over-SockJS chat layer.

### 1.1 Component Dependency Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                         CARE TEAM & VIDEO CONSULTATION SYSTEM                         │
│                                                                                      │
│  ┌──────────────────────────────────┐   ┌───────────────────────────────────────────┐ │
│  │      CARE TEAM MANAGEMENT        │   │           VIDEO CONSULTATION (VC-APP)      │ │
│  │                                  │   │                                           │ │
│  │  ┌─────────────────────────────┐ │   │  ┌──────────────────────────────────────┐ │ │
│  │  │  TEMPLATE LAYER (Admin)     │ │   │  │  HomeVcPage (Appointment Dashboard)  │ │ │
│  │  │  CareTeamManagementService  │ │   │  │  - Date navigation                  │ │ │
│  │  │  14 API endpoints           │ │   │  │  - 3-chip filter system              │ │ │
│  │  │  User Wise / Location Wise  │ │   │  │  - Status-based card rendering       │ │ │
│  │  └─────────────┬───────────────┘ │   │  └──────────────┬───────────────────────┘ │ │
│  │                │                 │   │                 │                         │ │
│  │  ┌─────────────▼───────────────┐ │   │  ┌──────────────▼───────────────────────┐ │ │
│  │  │  PATIENT LAYER              │ │   │  │  Video Call (dual provider)          │ │ │
│  │  │  CareTeamService            │ │   │  │  ┌─────────────┐ ┌────────────────┐  │ │ │
│  │  │  SQLite + WebSocket sync    │ │   │  │  │ Agora RTC   │ │ OpenTok/TokBox │  │ │ │
│  │  │  7 API endpoints            │ │   │  │  │ (primary)   │ │ (legacy)       │  │ │ │
│  │  └─────────────┬───────────────┘ │   │  │  │ VP8, "rtc"  │ │ 320x240, 7fps │  │ │ │
│  │                │                 │   │  │  └──────┬──────┘ └───────┬────────┘  │ │ │
│  │  ┌─────────────▼───────────────┐ │   │  │         │                │           │ │ │
│  │  │  Cross-Consultation         │ │   │  │         └───────┬────────┘           │ │ │
│  │  │  CrossConsultationService   │ │   │  │                 │                    │ │ │
│  │  │  5 API endpoints            │ │   │  │  ┌──────────────▼───────────────┐    │ │ │
│  │  └─────────────┬───────────────┘ │   │  │  │  STOMP Chat (shared layer)   │    │ │ │
│  │                │                 │   │  │  │  SockJS + WebSocket           │    │ │ │
│  │  ┌─────────────▼───────────────┐ │   │  │  │  Quick replies (5 presets)   │    │ │ │
│  │  │  Handover Request           │ │   │  │  └──────────────────────────────┘    │ │ │
│  │  │  HandoverRequestService     │ │   │  └──────────────────────────────────────┘ │ │
│  │  │  3 methods                  │ │   │                                           │ │
│  │  └─────────────────────────────┘ │   │  ┌──────────────────────────────────────┐ │ │
│  │                                  │   │  │  Post-Consultation                   │ │ │
│  │  4 Admin Pages:                  │   │  │  OPD Notes (file upload, DONE)       │ │ │
│  │  AdminCareTeamPage               │   │  │  Cancel Appointment                  │ │ │
│  │  SelfCareTeamPage                │   │  │  Chat History / Past Records         │ │ │
│  │  AddCareTeamPage                 │   │  │  Past Prescriptions                  │ │ │
│  │  PrimaryConsultantPage           │   │  └──────────────────────────────────────┘ │ │
│  │  LocationWisePage                │   │                                           │ │
│  └──────────────────────────────────┘   └───────────────────────────────────────────┘ │
│                                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐ │
│  │                          SHARED INFRASTRUCTURE                                    │ │
│  │                                                                                  │ │
│  │  SQLite (CareTeam table)  │  WebSocket (care team sync)  │  ATHMA Proxy          │ │
│  │  BehaviorSubject events   │  STOMP/SockJS (VC chat)      │  40+ endpoints        │ │
│  │  GlobalService (VC state) │  KeepAwake (during call)     │  Audit trail           │ │
│  └──────────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Navigation Hierarchy

```
AdminCareTeamPage (admin landing)
  ├── User Wise ─── SelfCareTeamPage (user-wise template view)
  │                   ├── AddCareTeamPage (mode: User Wise)
  │                   └── PrimaryConsultantPage (edit existing)
  │
  └── Location Wise ─── SelfCareTeamPage (location-wise template view)
                          ├── AddCareTeamPage (mode: Location Wise)
                          └── LocationWisePage (edit existing)

PatientChatPage (clinical encounter context)
  ├── CrossConsultationPage (create new cross-consultation)
  ├── CrossConsultationListPage (history of cross-consultations)
  └── HandoverRequestPage (modal — pending handover requests)

HomeVcPage (VC appointment dashboard)
  ├── Video Call Page (Agora or OpenTok — based on config)
  │     └── In-Call STOMP Chat
  ├── OPD Notes Page (post-consultation documentation)
  ├── Cancel Appointment (modal)
  ├── ConsultationChatPage (read-only chat history)
  ├── PastUploadsPage (patient attachments by appointment)
  ├── PastPrescriptionsPage (OP/IP prescription history)
  └── AI Chart (summary PDF)
```

### 1.3 System Comparison

| Aspect | Care Team | Video Consultation |
|--------|-----------|-------------------|
| **Primary purpose** | Define patient care responsibilities | Execute remote clinical encounters |
| **Data layer** | SQLite + REST + WebSocket sync | In-memory (GlobalService) + REST |
| **Real-time** | WebSocket (care team updates) | Agora RTC / OpenTok + STOMP chat |
| **Offline support** | Full (SQLite patient layer) | None (requires active connection) |
| **Admin vs clinical** | Both (template = admin, patient = clinical) | Clinical only |
| **API gateway** | ATHMA EHR + Spring Boot | ATHMA EHR + AMB + AI endpoints |

---

## 2. Care Team Templates (Admin Layer)

The template layer allows administrators to pre-configure care team blueprints that can be applied to patients. Templates come in two modes: **User Wise** (organized by Primary Consultant) and **Location Wise** (organized by HSC/ward location).

### 2.1 Template Modes

```
┌─────────────────────────────────────────────────────────────────┐
│                     TEMPLATE MODES                               │
│                                                                 │
│  ┌─────────────────────────────┐  ┌───────────────────────────┐ │
│  │  USER WISE                  │  │  LOCATION WISE             │ │
│  │  (PRIMARY_CONSULTANT mode)  │  │  (HSC mode)                │ │
│  │                             │  │                            │ │
│  │  Unit                       │  │  Unit                      │ │
│  │    └── Primary Consultant   │  │    └── HSC / Location      │ │
│  │          └── Team Members   │  │          └── Team Members  │ │
│  │                             │  │                            │ │
│  │  Key: Organized around the  │  │  Key: Organized around the │ │
│  │  doctor who leads the team  │  │  physical ward location    │ │
│  └─────────────────────────────┘  └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 CareTeamManagementService (14 API Endpoints)

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | `getCareTeamTemplateByPCAndUnit()` | `GET /api/care-team-templates` (filter: PC + unit) | Fetch user-wise template |
| 2 | `getCareTeamTemplateByHSCAndUnit()` | `GET /api/care-team-templates` (filter: HSC + unit) | Fetch location-wise template |
| 3 | `getCareTeamTemplateById()` | `GET /api/care-team-templates/{id}` | Fetch single template |
| 4 | `createCareTeamTemplate()` | `POST /api/care-team-templates` | Create new template |
| 5 | `updateCareTeamTemplate()` | `PUT /api/care-team-templates` | Update existing template |
| 6 | `deleteCareTeamTemplate()` | `DELETE /api/care-team-templates/{id}` | Delete template |
| 7 | `getCareTeamTemplatesByUnit()` | `GET /api/care-team-templates` (filter: unit only) | List all templates for unit |
| 8 | `getCareTeamTemplatesByPC()` | `GET /api/care-team-templates` (filter: PC only) | List templates for consultant |
| 9 | `getUnits()` | `GET /api/units` | Dropdown: available units |
| 10 | `getConsultantsByUnit()` | `GET /api/consultants` (filter: unit) | Dropdown: consultants in unit |
| 11 | `getLocationsByUnit()` | `GET /api/locations` (filter: unit) | Dropdown: HSC locations |
| 12 | `searchUsers()` | `GET /api/users/search` | Search users for member add |
| 13 | `getUsersByGroup()` | `GET /api/users` (filter: group code) | Get users by role group |
| 14 | `getMembersByTemplate()` | `GET /api/care-team-template-members` (filter: template ID) | List members of template |

### 2.3 Admin Pages

#### 2.3.1 AdminCareTeamPage (Landing)

```
┌───────────────────────────────────────┐
│  [<]  Care Team Management            │
├───────────────────────────────────────┤
│                                       │
│  ┌─────────────────────────────────┐  │
│  │  👤  User Wise                  │  │  ← Navigate to SelfCareTeamPage
│  │      Manage teams by doctor     │  │     with mode = PRIMARY_CONSULTANT
│  └─────────────────────────────────┘  │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │  📍  Location Wise              │  │  ← Navigate to SelfCareTeamPage
│  │      Manage teams by ward/HSC   │  │     with mode = HSC
│  └─────────────────────────────────┘  │
│                                       │
└───────────────────────────────────────┘
```

The page is a simple navigation hub with two ion-card buttons. No data loading occurs here. The selected mode is passed via `NavController.navigateForward()` params.

#### 2.3.2 SelfCareTeamPage (Template List View)

This page renders care team templates as **3 accordion lists** using `ion-accordion-group`:

```
┌───────────────────────────────────────────┐
│  [<]  My Care Teams                       │
│  [+ Add]                                  │
├───────────────────────────────────────────┤
│                                           │
│  ▼ Primary Consultant Team                │  ← Accordion 1
│  ┌─────────────────────────────────────┐  │
│  │  Unit: Cardiology                   │  │
│  │  PC: Dr. Sharma                     │  │
│  │  Members:                           │  │
│  │    • Dr. Patel (DOCTOR)             │  │
│  │    • Nurse Priya (NURSE)            │  │
│  │    • Tech Raj (PARAMEDICS)          │  │
│  │  [Edit]                             │  │
│  └─────────────────────────────────────┘  │
│                                           │
│  ▼ Other Team Members                     │  ← Accordion 2
│  ┌─────────────────────────────────────┐  │
│  │  (Templates where logged-in user    │  │
│  │   is a team member, not PC)         │  │
│  └─────────────────────────────────────┘  │
│                                           │
│  ▼ Location-wise Teams                    │  ← Accordion 3
│  ┌─────────────────────────────────────┐  │
│  │  Unit: ICU                          │  │
│  │  Location: Ward 3A                  │  │
│  │  Members:                           │  │
│  │    • Dr. Kumar (DOCTOR)             │  │
│  │    • Nurse Anita (NURSE)            │  │
│  │  [Edit]                             │  │
│  └─────────────────────────────────────┘  │
│                                           │
│  ── Admin Mode (if user is admin) ──      │
│  [Search other users' teams]              │
│  ┌─────────────────────────────────────┐  │
│  │  Search: [___________________]      │  │
│  │  (min 3 chars, search by name)      │  │
│  └─────────────────────────────────────┘  │
└───────────────────────────────────────────┘
```

**Initialization flow:**

```
ionViewWillEnter()
  │
  ├── 1. Read mode from navParams (PRIMARY_CONSULTANT or HSC)
  │
  ├── 2. Load self templates
  │     ├── GET templates where PC = current user login
  │     ├── GET templates where current user is a member
  │     └── GET templates where HSC matches user's locations
  │
  ├── 3. Categorize into 3 accordion lists
  │     ├── primaryConsultantList: user is PC
  │     ├── otherTeamList: user is member but not PC
  │     └── locationWiseList: location-based templates
  │
  └── 4. If admin mode → show user search bar
        └── Search triggers: load selected user's templates
```

**Admin mode user search:**
- Only visible when the logged-in user has admin privileges
- Minimum 3 characters to trigger search
- Selecting a user reloads all 3 accordion lists for that user
- Enables admins to view and edit any user's care team templates

#### 2.3.3 AddCareTeamPage (Create Template)

This page operates in **two modes** controlled by a segment UI:

```
┌───────────────────────────────────────────┐
│  [<]  Add Care Team                       │
├───────────────────────────────────────────┤
│  ┌─────────────┬─────────────────────┐    │
│  │  User Wise  │   Location Wise     │    │  ← ion-segment
│  └─────────────┴─────────────────────┘    │
│                                           │
│  ── User Wise Mode ──                     │
│                                           │
│  Unit: [Select Unit ▾]                    │  ← Step 1: required first
│                                           │
│  Primary Consultant: [Search... ▾]        │  ← Step 2: enabled after unit
│  (min 3 chars, filtered by unit)          │
│                                           │
│  Team Members:                            │  ← Step 3: add members
│  [Search member... ]                      │
│  ┌─────────────────────────────────────┐  │
│  │  • Dr. Patel (DOCTOR)      [✕]     │  │
│  │  • Nurse Priya (NURSE)     [✕]     │  │
│  └─────────────────────────────────────┘  │
│                                           │
│  ── Location Wise Mode ──                 │
│                                           │
│  Unit: [Select Unit ▾]                    │  ← Step 1: required first
│                                           │
│  Location (HSC): [Select Location ▾]      │  ← Step 2: enabled after unit
│  (filtered by unit)                       │
│                                           │
│  Team Members:                            │  ← Step 3: add members
│  [Search member... ]                      │
│  ┌─────────────────────────────────────┐  │
│  │  • Dr. Kumar (DOCTOR)      [✕]     │  │
│  └─────────────────────────────────────┘  │
│                                           │
│  [Save Template]                          │
└───────────────────────────────────────────┘
```

**Validation rules:**

```
Validate before save:
  │
  ├── 1. Unit must be selected
  │     └── Error: "Please select a unit"
  │
  ├── 2. (User Wise) Primary Consultant must be selected
  │     └── Error: "Please select a primary consultant"
  │
  ├── 2. (Location Wise) Location must be selected
  │     └── Error: "Please select a location"
  │
  ├── 3. At least 1 team member
  │     └── Error: "Please add at least one team member"
  │
  ├── 4. Duplicate member check (by user.login)
  │     └── Error: "Member already added"
  │
  ├── 5. PC cannot be added as team member
  │     └── Error: "Primary consultant cannot be added as a team member"
  │
  └── 6. Deduplication: check if template already exists
        ├── (User Wise) GET template by PC + unit → if exists, block creation
        ├── (Location Wise) GET template by HSC + unit → if exists, block creation
        └── Error: "Care team template already exists for this combination"
```

**Save flow:**

```
onSave()
  │
  ├── 1. Run all validation rules
  │
  ├── 2. Construct template object
  │     {
  │       unit: { id, name, code },
  │       primaryConsultant: { login, displayName } | null,    // User Wise
  │       hsc: { id, name, code } | null,                     // Location Wise
  │       mode: "PRIMARY_CONSULTANT" | "HSC",
  │       members: [
  │         { user: { login, displayName }, role: "DOCTOR"|"NURSE"|"PARAMEDICS" }
  │       ]
  │     }
  │
  ├── 3. POST /api/care-team-templates
  │
  └── 4. On success → navigate back to SelfCareTeamPage
        └── Toast: "Care team template created successfully"
```

#### 2.3.4 PrimaryConsultantPage & LocationWisePage (Edit Templates)

These are edit variants of AddCareTeamPage:
- **PrimaryConsultantPage**: Pre-populated with existing User Wise template. Unit and PC fields are read-only. Only member list is editable.
- **LocationWisePage**: Pre-populated with existing Location Wise template. Unit and Location fields are read-only. Only member list is editable.

Both use `PUT /api/care-team-templates` on save.

### 2.4 Member Role Detection

The system categorizes care team members into three roles based on their user group hierarchy:

```typescript
// Role detection algorithm
detectMemberRole(userObj):
  │
  ├── 1. Check userObj.group.code
  │     ├── If matches DOCTOR codes → return "DOCTOR"
  │     ├── If matches NURSE codes  → return "NURSE"
  │     └── If matches PARAMEDIC codes → return "PARAMEDICS"
  │
  └── 2. Fallback: check userObj.group.parent.code
        ├── Parent code DOCTOR → return "DOCTOR"
        ├── Parent code NURSE  → return "NURSE"
        └── Parent code PARAMEDIC → return "PARAMEDICS"
```

**Role usage:** Roles determine display grouping in the template list and influence which users can be assigned as Primary Consultant (DOCTOR role only).

---

## 3. Patient Care Teams (Per-Patient Layer)

The patient layer manages the **active care team** for each admitted patient. Unlike templates (which are organizational blueprints), patient care teams are live data that directly affect who can see and interact with a patient's records.

### 3.1 SQLite Schema -- CareTeam Table

```sql
CREATE TABLE IF NOT EXISTS CareTeam (
  id                INTEGER PRIMARY KEY,
  patientInfoId     TEXT,           -- FK: links to patient record
  memberLogin       TEXT,           -- user login of team member
  memberDisplayName TEXT,           -- display name
  memberRole        TEXT,           -- DOCTOR | NURSE | PARAMEDICS
  isPrimary         INTEGER,        -- 1 = primary consultant, 0 = member
  unitCode          TEXT,           -- department/unit code
  unitName          TEXT,           -- department/unit display name
  hscCode           TEXT,           -- ward/location code (nullable)
  hscName           TEXT,           -- ward/location display name (nullable)
  syncStatus        TEXT            -- SYNCED | PENDING | CONFLICT
);

-- 11 columns total
```

### 3.2 CareTeamService (7 API Endpoints + SQLite CRUD)

**API Endpoints:**

| # | Method | Endpoint / Code | Purpose |
|---|--------|----------------|---------|
| 1 | `getCareTeamForPatient()` | `GET /api/care-teams` (filter: patientInfoId) | Fetch care team from server |
| 2 | `saveCareTeamMember()` | `POST /api/care-teams` | Add member to patient's team |
| 3 | `updateCareTeamMember()` | `PUT /api/care-teams` | Update member details |
| 4 | `deleteCareTeamMember()` | `DELETE /api/care-teams/{id}` | Remove member |
| 5 | `syncCareTeamToEHR()` | ATHMA proxy `EHR_124` | Sync care team to EHR system |
| 6 | `getCareTeamFromEHR()` | ATHMA proxy (EHR endpoint) | Pull care team from EHR |
| 7 | `applyCareTeamTemplate()` | `POST /api/care-teams/apply-template` | Apply admin template to patient |

**SQLite CRUD Operations:**

```
CareTeamService SQLite methods:
  │
  ├── insertCareTeamMember(member)
  │     INSERT INTO CareTeam VALUES (...)
  │
  ├── getCareTeamByPatient(patientInfoId)
  │     SELECT * FROM CareTeam WHERE patientInfoId = ?
  │
  ├── updateCareTeamMember(member)
  │     UPDATE CareTeam SET ... WHERE id = ?
  │
  ├── deleteCareTeamMember(id)
  │     DELETE FROM CareTeam WHERE id = ?
  │
  ├── deleteAllCareTeamForPatient(patientInfoId)
  │     DELETE FROM CareTeam WHERE patientInfoId = ?
  │
  └── upsertCareTeamMember(member)
        SELECT → if exists → UPDATE, else → INSERT
```

### 3.3 WebSocket Sync (Real-Time Care Team Updates)

Care team changes from other devices or users are received via WebSocket messages and applied to the local SQLite database:

```
WebSocket Message Processing:
  │
  ├── Message Type: CARE_TEAM_UPDATE
  │
  ├── Action: SAVE
  │     └── Upsert logic:
  │           ├── Check if member exists in SQLite (by patientInfoId + memberLogin)
  │           ├── If exists → UPDATE with new data
  │           └── If not → INSERT new record
  │
  ├── Action: DELETE
  │     └── DELETE FROM CareTeam WHERE id = {messagePayload.id}
  │
  └── Post-processing:
        └── BehaviorSubject.next(patientInfoId)
              └── gotUpdateCareTeamForPatientInfoID
                    └── All subscribers (e.g., PatientChatPage) reload care team display
```

**BehaviorSubject: `gotUpdateCareTeamForPatientInfoID`**

This is the central event bus for care team changes. Any component that needs to react to care team updates subscribes to this subject:

```typescript
// Subscription pattern
this.careTeamService.gotUpdateCareTeamForPatientInfoID.subscribe(patientInfoId => {
  if (patientInfoId === this.currentPatientInfoId) {
    this.reloadCareTeam();
  }
});
```

### 3.4 Server Sync Flow

```
Full sync lifecycle:
  │
  ├── 1. App loads patient → getCareTeamByPatient() from SQLite (local-first)
  │
  ├── 2. Background: getCareTeamForPatient() from server
  │     └── Compare server vs local
  │           ├── New members on server → INSERT locally
  │           ├── Updated members → UPDATE locally
  │           └── Deleted on server → DELETE locally
  │
  ├── 3. EHR sync (bidirectional)
  │     ├── syncCareTeamToEHR() → push local team to EHR (EHR_124)
  │     └── getCareTeamFromEHR() → pull EHR team to local
  │
  └── 4. Real-time updates via WebSocket (see 3.3)
```

---

## 4. Cross-Consultation

Cross-consultation allows a patient's treating doctor to request a consultation from a specialist in a different department. The workflow integrates with both the care team system (to identify available consultants) and the Progress Notes system (when initiated from a PN context).

### 4.1 CrossConsultationService (5 API Endpoints)

| # | Method | Endpoint | Purpose |
|---|--------|----------|---------|
| 1 | `searchDoctorsByUnit()` | `GET /api/cross-consultations/search-doctors` (filter: unit) | Find consultants for CC |
| 2 | `createCrossConsultation()` | `POST /api/cross-consultations` | Submit new CC request |
| 3 | `getCrossConsultationsByPatient()` | `GET /api/cross-consultations` (filter: patient) | List CC history |
| 4 | `getCrossConsultationById()` | `GET /api/cross-consultations/{id}` | Get single CC detail |
| 5 | `updateCrossConsultation()` | `PUT /api/cross-consultations` | Update CC status |

### 4.2 CrossConsultationPage (Create New CC)

```
┌───────────────────────────────────────────┐
│  [<]  Cross Consultation                  │
├───────────────────────────────────────────┤
│                                           │
│  Patient: Mr. Ravi Kumar (MRN: 12345)     │
│  Current Unit: Cardiology                 │
│                                           │
│  ── Consultation Details ──               │
│                                           │
│  Requesting Unit: [Select Unit ▾]         │  ← Step 1
│                                           │
│  Consulting Doctor: [Search... ▾]         │  ← Step 2 (after unit)
│  (min 3 chars, filtered by unit)          │
│                                           │
│  Priority:                                │
│  ┌────────────┐ ┌────────────────┐        │
│  │  ● NORMAL  │ │  ○ Urgent      │        │  ← Radio buttons
│  └────────────┘ └────────────────┘        │
│                                           │
│  Reason / Notes:                          │
│  ┌─────────────────────────────────────┐  │
│  │                                     │  │  ← Free text
│  │                                     │  │
│  └─────────────────────────────────────┘  │
│                                           │
│  [Submit Cross Consultation]              │
└───────────────────────────────────────────┘
```

### 4.3 Validation Rules

```
Cross-consultation validation:
  │
  ├── 1. Cannot consult self
  │     └── Error: "Cannot create cross consultation with yourself"
  │
  ├── 2. Cannot consult patient's Primary Consultant
  │     └── Error: "Cannot consult the patient's primary consultant"
  │
  ├── 3. Unit must be selected
  │     └── Error: "Please select a unit"
  │
  ├── 4. Doctor must be selected
  │     └── Error: "Please select a consulting doctor"
  │
  └── 5. Network connectivity check
        └── If offline → Error: "No network connection. Please try again later."
```

### 4.4 Two Submission Paths

Cross-consultation can be initiated from two contexts, each with a different post-submission behavior:

```
Path 1: Direct Submit (standalone)
  │
  ├── POST /api/cross-consultations
  │     {
  │       patientInfoId, encounterNumber,
  │       requestingUnit, consultingDoctor,
  │       priority: "NORMAL" | "Urgent",
  │       reason: string,
  │       requestedBy: currentUser
  │     }
  │
  └── On success → Toast + navigate back to patient context

Path 2: Return to Progress Notes (from PN context)
  │
  ├── Page opened with navParam: fromProgressNotes = true
  │
  ├── User fills CC details
  │
  ├── On submit → do NOT call API directly
  │     └── Instead: return CC data to ProgressNotesPage via NavController
  │           └── PN page embeds CC reference in the progress note
  │
  └── CC is persisted when the progress note is saved
```

### 4.5 CrossConsultationListPage (History View)

```
┌───────────────────────────────────────────┐
│  [<]  Cross Consultation History          │
├───────────────────────────────────────────┤
│                                           │
│  ── 22 Apr 2026 ──                        │  ← Grouped by date
│                                           │
│  ┌─────────────────────────────────────┐  │
│  │  Requested: Neurology               │  │
│  │  Doctor: Dr. Verma                  │  │
│  │  Priority: Urgent                   │  │
│  │  Reason: Evaluate seizure episodes  │  │
│  │  Status: PENDING                    │  │
│  │  Requested by: Dr. Sharma           │  │
│  │  Time: 10:30 AM                     │  │
│  └─────────────────────────────────────┘  │
│                                           │
│  ── 21 Apr 2026 ──                        │
│  ┌─────────────────────────────────────┐  │
│  │  Requested: Pulmonology             │  │
│  │  Doctor: Dr. Reddy                  │  │
│  │  Priority: NORMAL                   │  │
│  │  Status: COMPLETED                  │  │
│  └─────────────────────────────────────┘  │
│                                           │
└───────────────────────────────────────────┘
```

Records are fetched via `getCrossConsultationsByPatient()` and grouped by date using moment.js date formatting.

---

## 5. Handover Requests

Handover manages the transfer of primary consultant responsibility for a patient from one doctor to another. It follows a request-approve workflow with local SQLite updates on acceptance.

### 5.1 HandoverRequestService (3 Methods)

| # | Method | Purpose |
|---|--------|---------|
| 1 | `getHandoverRequestCount()` | Get count of pending handover requests for current user |
| 2 | `submitAcceptReject()` | Accept or reject a pending handover request |
| 3 | `submitHandoverRequest()` | Create a new handover request |

### 5.2 HandoverRequestPage (Modal)

```
┌───────────────────────────────────────────┐
│  Handover Requests (3 pending)            │
├───────────────────────────────────────────┤
│                                           │
│  ┌─────────────────────────────────────┐  │
│  │  Patient: Mrs. Lakshmi             │  │
│  │  From: Dr. Sharma (Cardiology)     │  │
│  │  Reason: On leave from 23 Apr      │  │
│  │                                     │  │
│  │  [Accept]          [Reject]         │  │
│  └─────────────────────────────────────┘  │
│                                           │
│  ┌─────────────────────────────────────┐  │
│  │  Patient: Mr. Kumar                │  │
│  │  From: Dr. Patel (Orthopedics)     │  │
│  │                                     │  │
│  │  [Accept]          [Reject]         │  │
│  └─────────────────────────────────────┘  │
│                                           │
└───────────────────────────────────────────┘
```

### 5.3 Accept/Reject Lifecycle

```
Handover decision flow:
  │
  ├── Accept:
  │     │
  │     ├── 1. Build accept JSON
  │     │     {
  │     │       taskDefinition: { code: "IP-CONSULTANT-HANDOVER" },
  │     │       action: "ACCEPT",
  │     │       handoverRequestId: id,
  │     │       acceptedBy: currentUser
  │     │     }
  │     │
  │     ├── 2. POST accept to server
  │     │
  │     ├── 3. Update local SQLite
  │     │     └── UPDATE patient record with new consultant info
  │     │           ├── primaryConsultant = currentUser
  │     │           └── consultantDisplayName = currentUser.displayName
  │     │
  │     ├── 4. Remove request from pending list
  │     │
  │     └── 5. If pending list is now empty → auto-dismiss modal
  │
  └── Reject:
        │
        ├── 1. Build reject JSON
        │     {
        │       taskDefinition: { code: "IP-CONSULTANT-HANDOVER" },
        │       action: "REJECT",
        │       handoverRequestId: id,
        │       rejectedBy: currentUser
        │     }
        │
        ├── 2. POST reject to server
        │
        ├── 3. Remove request from pending list
        │
        └── 4. If pending list is now empty → auto-dismiss modal
```

**Key implementation detail:** The `taskDefinition.code` value `"IP-CONSULTANT-HANDOVER"` is a fixed constant. This code identifies the workflow type in the backend task management system. The value must match exactly or the server will reject the request.

**Auto-dismiss behavior:** The modal monitors the pending request list length. When `pendingRequests.length === 0` after an accept or reject action, the modal automatically closes via `this.modalCtrl.dismiss()`. This prevents the user from seeing an empty modal.

---

## 6. Appointment Dashboard (HomeVcPage)

HomeVcPage is the primary landing screen for the Video Consultation module. It displays all scheduled appointments for the logged-in doctor, with rich filtering, date navigation, and per-appointment action menus.

### 6.1 Screen Layout

```
┌───────────────────────────────────────────────────────────────┐
│  [<]  Video Consultation       Pending: 5  │  Total: 12      │
├───────────────────────────────────────────────────────────────┤
│  [◀]  22 Apr 2026  [▶]  [📅]                                 │  ← Date nav
├───────────────────────────────────────────────────────────────┤
│  Filters:                                                     │
│  ┌──────────┐ ┌──────────────┐ ┌────────────────┐            │
│  │ Unit  ▾  │ │ Type  ▾      │ │ Status  ▾      │            │  ← 3-chip filter
│  └──────────┘ └──────────────┘ └────────────────┘            │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  09:00 AM  │  Mr. Ravi Kumar  │  M/45y                 │  │
│  │  Unit: Cardiology             │  Type: Follow-up       │  │
│  │  Status: [SCHEDULED]                                    │  │
│  │  ┌──────┐ ┌──────────┐ ┌────────┐ ┌────────┐          │  │
│  │  │Start │ │OPD Notes │ │Summary │ │Cancel  │          │  │
│  │  │VC    │ │          │ │PDF     │ │        │          │  │
│  │  └──────┘ └──────────┘ └────────┘ └────────┘          │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  09:30 AM  │  Mrs. Lakshmi    │  F/38y                 │  │
│  │  Unit: General Medicine       │  Type: New Consultation│  │
│  │  Status: [IN_PROGRESS]  🟢                              │  │
│  │  ┌──────┐ ┌──────────┐ ┌────────┐ ┌────────┐          │  │
│  │  │Rejoin│ │OPD Notes │ │AI Chart│ │Attachm.│          │  │
│  │  │VC    │ │          │ │        │ │        │          │  │
│  │  └──────┘ └──────────┘ └────────┘ └────────┘          │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  10:00 AM  │  Mr. Anand       │  M/62y                 │  │
│  │  Unit: Orthopedics            │  Type: Follow-up       │  │
│  │  Status: [DONE] ✓                                       │  │
│  │  ┌──────────┐ ┌────────┐ ┌─────────────┐              │  │
│  │  │OPD Notes │ │Summary │ │Past Records │              │  │
│  │  │          │ │PDF     │ │             │              │  │
│  │  └──────────┘ └────────┘ └─────────────┘              │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### 6.2 Consultation Status Map

The system defines 10 consultation statuses, each with distinct visual treatment and available actions:

```
┌────────────────────────┬──────────┬───────────────────────────────────────────┐
│ Status                 │ Color    │ Available Actions                         │
├────────────────────────┼──────────┼───────────────────────────────────────────┤
│ BOOKED                 │ Blue     │ Start VC, Cancel                          │
│ SCHEDULED              │ Blue     │ Start VC, Cancel                          │
│ ARRIVED                │ Green    │ Start VC, Cancel                          │
│ IN_PROGRESS            │ Green    │ Rejoin VC, OPD Notes, AI Chart            │
│ DONE                   │ Gray     │ OPD Notes, Summary PDF, Past Records      │
│ COMPLETED              │ Gray     │ OPD Notes, Summary PDF, Past Records      │
│ CANCELLED_BY_DOCTOR    │ Red      │ View only (no actions)                    │
│ CANCELLED_BY_PATIENT   │ Red      │ View only (no actions)                    │
│ REJECTED               │ Red      │ View only (no actions)                    │
│ NO_SHOW                │ Orange   │ Cancel, Reschedule                        │
└────────────────────────┴──────────┴───────────────────────────────────────────┘
```

### 6.3 Date Navigation

```
Date navigation flow:
  │
  ├── Left arrow [◀]: selectedDate = moment(selectedDate).subtract(1, 'day')
  │     └── Reload appointments for new date
  │
  ├── Right arrow [▶]: selectedDate = moment(selectedDate).add(1, 'day')
  │     └── Reload appointments for new date
  │
  └── Calendar icon [📅]: open ion-modal with ion-datetime
        └── On date select → selectedDate = selected
              └── Reload appointments for new date
```

### 6.4 3-Chip Filter System

Filters operate combinatorially, producing 14+ distinct query branches:

```
Filter architecture:
  │
  ├── Chip 1: Unit (department)
  │     ├── Values: loaded from user's assigned units
  │     └── Default: ALL
  │
  ├── Chip 2: Type (consultation type)
  │     ├── Values: New, Follow-up, Video Follow-up, etc.
  │     └── Default: ALL
  │
  └── Chip 3: Status
        ├── Values: All statuses from status map (6.2)
        └── Default: ALL

Combinatorial filter logic:
  │
  ├── No filters → fetch all for date
  ├── Unit only → filter by unit
  ├── Type only → filter by type
  ├── Status only → filter by status
  ├── Unit + Type → filter by both
  ├── Unit + Status → filter by both
  ├── Type + Status → filter by both
  ├── Unit + Type + Status → filter by all three
  └── ... (14+ branches including special status groupings like
       DONE+COMPLETED treated as equivalent)
```

### 6.5 Counts and Auto-Refresh

```
Header counts:
  ├── Pending: count of BOOKED + SCHEDULED + ARRIVED for selected date
  └── Total: count of ALL appointments for selected date

Auto-refresh:
  └── setInterval(() => refreshAppointments(), 50 * 60 * 1000)
        └── Every 50 minutes, silently reload appointment list
        └── Cleared on ionViewWillLeave()
```

### 6.6 Per-Appointment Actions

Each appointment card displays a set of action buttons determined by the consultation status:

| Action | Description | Condition |
|--------|-------------|-----------|
| **Start VC** | Open video call page | Status: BOOKED, SCHEDULED, ARRIVED |
| **Rejoin VC** | Rejoin active call | Status: IN_PROGRESS |
| **OPD Notes** | Open post-consultation notes | Status: IN_PROGRESS, DONE, COMPLETED |
| **Summary PDF** | Download consultation summary | Status: DONE, COMPLETED |
| **AI Chart** | Open AI-generated chart | Status: IN_PROGRESS, DONE |
| **Cancel** | Cancel appointment | Status: BOOKED, SCHEDULED, ARRIVED, NO_SHOW |
| **View Attachments** | Open PastUploadsPage | Status: any with attachments |
| **Past Records** | Open PastPrescriptionsPage | Status: DONE, COMPLETED |

---

## 7. Video Call -- Agora (Primary Provider)

Agora is the primary video consultation provider, using the Agora Web SDK for real-time communication with VP8 video codec.

### 7.1 Agora Client Setup

```
Agora initialization:
  │
  ├── 1. Create client
  │     AgoraRTC.createClient({ mode: "rtc", codec: "vp8" })
  │
  ├── 2. Fetch dynamic app ID from server
  │     GET via ATHMA proxy AMB_008
  │     └── Returns: { appId: "xxxxxxxx" }
  │
  ├── 3. Permission checks (pre-join)
  │     ├── Camera permission: Capacitor Camera API
  │     └── Microphone permission: Capacitor Microphone API
  │     └── If either denied → show permission dialog → block join
  │
  └── 4. Register event handlers (see 7.3)
```

### 7.2 Join / Leave Flow

```
Join call:
  │
  ├── 1. client.join(appId, channelName, token, uid)
  │     ├── channelName: typically the appointmentNumber
  │     ├── token: fetched from server alongside appId
  │     └── uid: current user's numeric ID or null (auto-assign)
  │
  ├── 2. Create local tracks
  │     ├── localAudioTrack = AgoraRTC.createMicrophoneAudioTrack()
  │     └── localVideoTrack = AgoraRTC.createCameraVideoTrack()
  │
  ├── 3. Play local video
  │     └── localVideoTrack.play("local-video-container")
  │
  ├── 4. Publish tracks
  │     └── client.publish([localAudioTrack, localVideoTrack])
  │
  ├── 5. Enable screen keep-awake
  │     └── KeepAwake.keepAwake()
  │
  └── 6. Start audit trail
        └── vcAuditStart() via EHR_076

Leave call:
  │
  ├── 1. Unpublish tracks
  │     └── client.unpublish([localAudioTrack, localVideoTrack])
  │
  ├── 2. Close local tracks
  │     ├── localAudioTrack.close()
  │     └── localVideoTrack.close()
  │
  ├── 3. Leave channel
  │     └── client.leave()
  │
  ├── 4. Disable screen keep-awake
  │     └── KeepAwake.allowSleep()
  │
  ├── 5. Stop audit trail
  │     └── vcAuditStop() via EHR_077
  │
  └── 6. Report client info
        └── POST client info (OS, browser) via EHR_075
```

### 7.3 Event Handlers

```
Agora client events:
  │
  ├── "connection-state-change"
  │     ├── CONNECTED → show "Connected" indicator
  │     ├── DISCONNECTED → show "Disconnected" warning
  │     ├── CONNECTING → show spinner
  │     └── RECONNECTING → show "Reconnecting..." toast
  │
  ├── "user-joined"
  │     └── Remote user entered channel
  │           └── Update UI: show remote participant indicator
  │
  ├── "user-left"
  │     └── Remote user left channel
  │           ├── Remove remote video element
  │           └── If no remote users remain → show "Waiting for patient" UI
  │
  ├── "user-published"
  │     └── Remote user started sharing audio/video
  │           ├── client.subscribe(remoteUser, mediaType)
  │           ├── If mediaType === "video":
  │           │     └── remoteUser.videoTrack.play("remote-video-container")
  │           └── If mediaType === "audio":
  │                 └── remoteUser.audioTrack.play()
  │
  └── "user-unpublished"
        └── Remote user stopped sharing audio/video
              ├── If mediaType === "video":
              │     └── Remove remote video element, show placeholder
              └── If mediaType === "audio":
                    └── Show "Muted" indicator
```

### 7.4 In-Call Controls

```
┌───────────────────────────────────────────────────────────┐
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                                                     │  │
│  │               REMOTE VIDEO                          │  │
│  │               (full screen)                         │  │
│  │                                                     │  │
│  │         ┌───────────────┐                           │  │
│  │         │  LOCAL VIDEO  │                           │  │
│  │         │  (PiP corner) │                           │  │
│  │         └───────────────┘                           │  │
│  │                                                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐          │
│  │ 🔇   │ │ 📷   │ │ 🔄   │ │ 💬   │ │ 📞   │          │
│  │ Mute │ │ Cam  │ │ Flip │ │ Chat │ │ IVR  │          │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘          │
│                                                           │
│                    ┌──────┐                               │
│                    │ 🔴   │                               │
│                    │ End  │                               │
│                    └──────┘                               │
└───────────────────────────────────────────────────────────┘
```

**Control actions:**

| Control | Action | Implementation |
|---------|--------|----------------|
| **Mute/Unmute** | Toggle microphone | `localAudioTrack.setEnabled(!currentState)` |
| **Camera On/Off** | Toggle camera | `localVideoTrack.setEnabled(!currentState)` |
| **Flip Camera** | Switch front/back camera | `localVideoTrack.setDevice(nextDeviceId)` — cycles through `AgoraRTC.getCameras()` |
| **Chat** | Open STOMP chat panel | Slide-up panel (see Section 9) |
| **IVR Call** | Initiate IVR call | `startIVRCall(encounterNumber)` via EHR_074 |
| **End Call** | Leave channel + cleanup | Full leave flow (see 7.2) |

### 7.5 IVR Call

IVR (Interactive Voice Response) provides a fallback phone call when video quality is poor:

```
startIVRCall(encounterNumber):
  │
  ├── POST via ATHMA proxy EHR_074
  │     { encounterNumber: string }
  │
  ├── Server triggers IVR system to call the patient's registered phone
  │
  └── Doctor hears patient via phone audio while maintaining video
```

---

## 8. Video Call -- OpenTok/TokBox (Legacy Provider)

OpenTok is the legacy video provider retained for backward compatibility. It uses a session-based model rather than Agora's channel-based model.

### 8.1 Configuration

```
OpenTok constants:
  │
  ├── Publisher settings:
  │     {
  │       insertMode: 'append',
  │       width: '200px',
  │       height: '140px',
  │       resolution: '320x240',
  │       frameRate: 7
  │     }
  │
  ├── Session settings:
  │     └── sessionId + token fetched from server
  │
  └── Error handling:
        └── Error code 1004 → "Video session expired"
              └── Show alert: "Session has expired. Please rejoin."
```

### 8.2 OpenTok Flow

```
OpenTok lifecycle:
  │
  ├── 1. Initialize session
  │     └── OT.initSession(apiKey, sessionId)
  │
  ├── 2. Connect to session
  │     └── session.connect(token, callback)
  │
  ├── 3. Create publisher
  │     └── OT.initPublisher('publisher-container', publisherSettings)
  │
  ├── 4. Publish to session
  │     └── session.publish(publisher)
  │
  ├── 5. Handle stream events
  │     ├── "streamCreated" → session.subscribe(event.stream, 'subscriber-container')
  │     └── "streamDestroyed" → remove subscriber element
  │
  ├── 6. Controls
  │     ├── Audio toggle: publisher.publishAudio(true/false)
  │     ├── Video toggle: publisher.publishVideo(true/false)
  │     └── Camera cycle: publisher.cycleVideo()
  │
  └── 7. Disconnect
        └── session.disconnect()
```

### 8.3 Provider Selection Logic

The app determines which provider to use based on server configuration:

```
Provider selection:
  │
  ├── Fetch configuration from server (during app init or VC module load)
  │
  ├── If config.videoProvider === "AGORA" (or default)
  │     └── Use Agora flow (Section 7)
  │
  └── If config.videoProvider === "OPENTOK"
        └── Use OpenTok flow (Section 8)
```

---

## 9. In-Call Chat (STOMP WebSocket)

Both Agora and OpenTok video calls share the same in-call chat system built on STOMP messaging over SockJS. This provides text communication alongside the video stream.

### 9.1 Connection Setup

```
STOMP connection:
  │
  ├── 1. Create SockJS connection
  │     └── new SockJS("{DOMAIN}websocket/connect?access_token={token}")
  │
  ├── 2. Initialize STOMP client
  │     └── Stomp.over(sockjs)
  │
  ├── 3. Connect
  │     └── stompClient.connect({}, onConnected, onError)
  │
  ├── 4. Subscribe to consultation topic
  │     └── stompClient.subscribe(
  │           "/consultation-topic/{appointmentNumber}",
  │           onMessageReceived
  │         )
  │
  └── 5. Auto-reconnect on disconnect
        └── setTimeout(() => reconnect(), 5000)  // 5-second delay
```

### 9.2 Message Format

```typescript
// Outgoing message structure
{
  id: number,                                    // auto-increment
  appointmentNumber: string,                     // consultation identifier
  messageId: "{appointmentNumber}-AADI-{timestamp}",  // dedup key
  content: string,                               // message text
  userType: "DOCTOR",                            // fixed for AADI app
  applicationType: "AADI",                       // app identifier
  sender: {                                      // current user info
    login: string,
    displayName: string
  }
}
```

### 9.3 Send / Receive

```
Send message:
  │
  ├── 1. Construct message object (see 9.2)
  │
  ├── 2. Publish via STOMP
  │     └── stompClient.send(
  │           "/consultation-topic/send-message",
  │           {},
  │           JSON.stringify(message)
  │         )
  │
  └── 3. Add to local message list (optimistic)

Receive message:
  │
  ├── 1. onMessageReceived callback fires
  │
  ├── 2. Parse message JSON
  │
  ├── 3. Deduplication check
  │     └── If messageId already exists in local list → discard
  │
  ├── 4. Add to message list
  │
  └── 5. Scroll to bottom of chat view
```

### 9.4 Quick Replies

Five pre-configured quick reply buttons for common in-call scenarios:

```
┌─────────────────────────────────────────────────────┐
│  Chat                                    [✕ close]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  (message list here)                                │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Quick:                                             │
│  ┌────────┐ ┌──────┐ ┌──────────────┐ ┌─────────┐ │
│  │ Rejoin │ │ IVR  │ │ Prescription │ │Admission│ │
│  │        │ │ Call │ │              │ │         │ │
│  └────────┘ └──────┘ └──────────────┘ └─────────┘ │
│  ┌────────┐                                        │
│  │ Noise  │                                        │
│  └────────┘                                        │
│                                                     │
│  [Type message...]              [Send]              │
└─────────────────────────────────────────────────────┘
```

| Quick Reply | Sent Text | Purpose |
|-------------|-----------|---------|
| **Rejoin** | Pre-defined rejoin message | Ask patient to rejoin video call |
| **IVR Call** | Pre-defined IVR message | Notify patient about incoming IVR call |
| **Prescription** | Pre-defined prescription message | Inform about prescription availability |
| **Admission** | Pre-defined admission message | Inform about admission requirement |
| **Noise** | Pre-defined noise message | Request patient to reduce background noise |

Each quick reply sends the pre-configured text as a regular STOMP message. The text content is hardcoded in the app constants.

---

## 10. OPD Notes (Post-Consultation Documentation)

OPD Notes is the post-consultation documentation system where doctors record findings, upload files, and mark the consultation as complete.

### 10.1 File Sources

```
File upload sources:
  │
  ├── 1. Camera
  │     └── Capacitor Camera API
  │           ├── Quality: 50 (JPEG compression)
  │           ├── Returns: base64 encoded image
  │           └── Single photo capture
  │
  ├── 2. Gallery
  │     └── Capacitor Camera API (gallery mode)
  │           ├── Limit: 5 images per selection
  │           ├── Max resolution: 1250 x 800
  │           └── Returns: array of base64 encoded images
  │
  └── 3. File Picker
        └── Native file picker
              ├── Allowed types: PDF only
              └── Returns: file path / base64 data
```

### 10.2 Upload Pipeline

```
File upload pipeline (for each file):
  │
  ├── 1. Convert to base64
  │     └── If camera/gallery → already base64
  │     └── If file picker → read file → convert to base64
  │
  ├── 2. Build FormData
  │     {
  │       file: base64Data,
  │       checksum: computed checksum,
  │       fileName: original name or generated,
  │       contentType: "image/jpeg" | "application/pdf"
  │     }
  │
  ├── 3. Upload single file
  │     └── POST base64FileDataWithChecksum
  │           └── Returns: { filePath: "/path/to/uploaded/file" }
  │
  ├── 4. Collect all file paths
  │     └── uploadedPaths.push(response.filePath)
  │
  └── 5. Associate files with consultation
        └── PUT consultation-documents
              {
                encounterNumber: string,
                documents: uploadedPaths[]
              }
```

### 10.3 Mark Consultation as DONE

```
Mark DONE flow:
  │
  ├── 1. Validate: all required fields filled
  │
  ├── 2. Send status update
  │     └── sendStatusUpdate(encounterNumber) via ATHMA proxy EHR_069
  │           { status: "DONE", encounterNumber }
  │
  ├── 3. Update local appointment card status
  │     └── appointment.status = "DONE"
  │
  └── 4. Navigate back to HomeVcPage
        └── Appointment card now shows DONE status
```

### 10.4 Existing Prescriptions

```
Prescription management:
  │
  ├── Load existing prescriptions
  │     └── GET via ATHMA proxy EHR_072
  │           └── Returns: list of prescription documents
  │
  ├── Delete prescription
  │     └── DELETE via ATHMA proxy EHR_073
  │           └── { prescriptionId }
  │
  └── Display: list with file name, date, download link
```

### 10.5 Follow-Up Options

After completing OPD Notes, the doctor can set follow-up actions. Six options are available:

```
Follow-up options (multi-select):
  │
  ├── 1. Investigation     → Order lab/diagnostic tests
  ├── 2. Video Follow-up   → Schedule next video consultation
  ├── 3. Physical Follow-up → Schedule in-person visit
  ├── 4. Surgery           → Recommend surgical procedure
  ├── 5. Medications       → Prescribe medications
  └── 6. Others            → Free-text follow-up notes
```

### 10.6 OpdnotesserviceService (6 Endpoints)

| # | Method | Purpose |
|---|--------|---------|
| 1 | `uploadFile()` | POST base64FileDataWithChecksum |
| 2 | `associateDocuments()` | PUT consultation-documents |
| 3 | `sendStatusUpdate()` | Via EHR_069 -- mark DONE |
| 4 | `getExistingPrescriptions()` | Via EHR_072 -- load prescriptions |
| 5 | `deletePrescription()` | Via EHR_073 -- remove prescription |
| 6 | `setFollowUp()` | Save follow-up selections |

---

## 11. Cancel Appointment

### 11.1 Cancellation Reasons

Two pre-set reason templates are available:

```
Cancel reasons:
  ├── Template 1: "Doctor not available" (or similar pre-defined text)
  └── Template 2: "Patient requested cancellation" (or similar pre-defined text)

Additional: free-text reason field (optional)
```

### 11.2 Two Cancellation Paths

```
Path 1: With appointment object (primary path)
  │
  ├── Precondition: appointment object is available in the page context
  │
  ├── POST cancel via ATHMA proxy AMB_004
  │     {
  │       appointmentNumber: string,
  │       reason: string,
  │       cancelledBy: "DOCTOR"
  │     }
  │
  └── On success:
        ├── Update local appointment status → CANCELLED_BY_DOCTOR
        └── Remove action buttons from card

Path 2: Without appointment object (fallback)
  │
  ├── Precondition: appointment object is NOT available
  │     └── This can happen when navigating to cancel from a notification
  │
  ├── Constraint: only today's appointments can be cancelled via this path
  │     └── If not today → Error: "Can only cancel today's appointments"
  │
  ├── Fetch appointment details first
  │     └── GET appointment by encounterNumber
  │
  ├── Then proceed with cancellation (same as Path 1)
  │
  └── On success → same as Path 1
```

---

## 12. Chat History / Past Records / Past Prescriptions

### 12.1 ConsultationChatPage (Read-Only Chat History)

```
ConsultationChatPage:
  │
  ├── Purpose: View past in-call chat messages for a specific consultation
  │
  ├── Data source: GET via ATHMA proxy EHR_071
  │     └── { appointmentNumber } → returns message list
  │
  ├── Display: chronological message list
  │     ├── Each message shows: sender, content, timestamp
  │     ├── Doctor messages: right-aligned
  │     └── Patient messages: left-aligned
  │
  └── Read-only: no send capability
```

### 12.2 PastUploadsPage (Patient Attachments by Appointment)

```
PastUploadsPage:
  │
  ├── Purpose: View all files uploaded across consultations for a patient
  │
  ├── Data source: DMS (Document Management Service)
  │     └── Fetches all attachments grouped by appointment
  │
  ├── Display:
  │     ├── Grouped by appointment date/number
  │     ├── Each file: name, type icon, date, download button
  │     └── Supports: images, PDFs
  │
  └── Actions: download / preview
```

### 12.3 PastPrescriptionsPage (OP / IP Prescription History)

```
PastPrescriptionsPage:
  │
  ├── Purpose: View prescription history across consultations
  │
  ├── Filter: only DONE or IN_PROGRESS consultations shown
  │
  ├── Two prescription types:
  │     ├── OP (Outpatient) prescriptions
  │     │     └── GET via ATHMA proxy EHR_072
  │     │
  │     └── IP (Inpatient) prescriptions
  │           └── GET via ATHMA proxy EHR_064
  │
  ├── Display:
  │     ├── List of prescriptions with date, doctor name, consultation type
  │     └── Each item expandable to show medication details
  │
  └── Actions: download prescription PDF
```

---

## 13. Complete API Reference

### 13.1 Care Team APIs

| # | Code | Method | Endpoint | Service | Purpose |
|---|------|--------|----------|---------|---------|
| 1 | -- | GET | `/api/care-team-templates` (PC+unit) | CareTeamManagementService | Fetch user-wise template |
| 2 | -- | GET | `/api/care-team-templates` (HSC+unit) | CareTeamManagementService | Fetch location-wise template |
| 3 | -- | GET | `/api/care-team-templates/{id}` | CareTeamManagementService | Get single template |
| 4 | -- | POST | `/api/care-team-templates` | CareTeamManagementService | Create template |
| 5 | -- | PUT | `/api/care-team-templates` | CareTeamManagementService | Update template |
| 6 | -- | DELETE | `/api/care-team-templates/{id}` | CareTeamManagementService | Delete template |
| 7 | -- | GET | `/api/care-team-templates` (unit) | CareTeamManagementService | List templates by unit |
| 8 | -- | GET | `/api/care-team-templates` (PC) | CareTeamManagementService | List templates by PC |
| 9 | -- | GET | `/api/units` | CareTeamManagementService | Get available units |
| 10 | -- | GET | `/api/consultants` | CareTeamManagementService | Get consultants by unit |
| 11 | -- | GET | `/api/locations` | CareTeamManagementService | Get HSC locations by unit |
| 12 | -- | GET | `/api/users/search` | CareTeamManagementService | Search users |
| 13 | -- | GET | `/api/users` (group) | CareTeamManagementService | Get users by role group |
| 14 | -- | GET | `/api/care-team-template-members` | CareTeamManagementService | Get template members |
| 15 | -- | GET | `/api/care-teams` | CareTeamService | Get patient care team |
| 16 | -- | POST | `/api/care-teams` | CareTeamService | Add member to patient team |
| 17 | -- | PUT | `/api/care-teams` | CareTeamService | Update patient team member |
| 18 | -- | DELETE | `/api/care-teams/{id}` | CareTeamService | Remove patient team member |
| 19 | EHR_124 | POST | ATHMA proxy | CareTeamService | Sync care team to EHR |
| 20 | -- | GET | ATHMA proxy | CareTeamService | Get care team from EHR |
| 21 | -- | POST | `/api/care-teams/apply-template` | CareTeamService | Apply template to patient |

### 13.2 Cross-Consultation APIs

| # | Code | Method | Endpoint | Service | Purpose |
|---|------|--------|----------|---------|---------|
| 22 | -- | GET | `/api/cross-consultations/search-doctors` | CrossConsultationService | Search doctors by unit |
| 23 | -- | POST | `/api/cross-consultations` | CrossConsultationService | Create cross-consultation |
| 24 | -- | GET | `/api/cross-consultations` (patient) | CrossConsultationService | List CC history |
| 25 | -- | GET | `/api/cross-consultations/{id}` | CrossConsultationService | Get single CC |
| 26 | -- | PUT | `/api/cross-consultations` | CrossConsultationService | Update CC status |

### 13.3 Handover APIs

| # | Code | Method | Endpoint | Service | Purpose |
|---|------|--------|----------|---------|---------|
| 27 | -- | GET | `/api/handover-requests/count` | HandoverRequestService | Pending handover count |
| 28 | -- | POST | `/api/handover-requests/accept-reject` | HandoverRequestService | Accept or reject |
| 29 | -- | POST | `/api/handover-requests` | HandoverRequestService | Submit handover request |

### 13.4 Video Consultation APIs

| # | Code | Method | Endpoint | Service | Purpose |
|---|------|--------|----------|---------|---------|
| 30 | EHR_038 | GET | ATHMA proxy | ConsultationService | Get consultation details |
| 31 | EHR_069 | POST | ATHMA proxy | ConsultationService | Send status update (DONE) |
| 32 | EHR_070 | GET | ATHMA proxy | ConsultationService | Get consultation status |
| 33 | EHR_071 | GET | ATHMA proxy | ConsultationService | Get chat history |
| 34 | EHR_072 | GET | ATHMA proxy | ConsultationService | Get OP prescriptions |
| 35 | EHR_073 | DELETE | ATHMA proxy | ConsultationService | Delete prescription |
| 36 | EHR_074 | POST | ATHMA proxy | VideoConsultationService | Start IVR call |
| 37 | EHR_075 | POST | ATHMA proxy | VideoConsultationService | Report client info |
| 38 | EHR_076 | POST | ATHMA proxy | VideoConsultationService | VC audit start |
| 39 | EHR_077 | POST | ATHMA proxy | VideoConsultationService | VC audit stop |
| 40 | AMB_008 | GET | ATHMA proxy | VideoConsultationService | Get Agora app ID + token |
| 41 | AI_001 | POST | ATHMA proxy | ConsultationService | AI chart generation |
| 42 | AI_002 | GET | ATHMA proxy | ConsultationService | AI chart status |
| 43 | AI_003 | GET | ATHMA proxy | ConsultationService | AI chart result |
| 44 | EHR_064 | GET | ATHMA proxy | ConsultationService | Get IP prescriptions |
| 45 | AMB_004 | POST | ATHMA proxy | ConsultationService | Cancel appointment |

### 13.5 OPD Notes APIs

| # | Code | Method | Endpoint | Service | Purpose |
|---|------|--------|----------|---------|---------|
| 46 | -- | POST | `/api/upload/base64FileDataWithChecksum` | OpdnotesserviceService | Upload file |
| 47 | -- | PUT | `/api/consultation-documents` | OpdnotesserviceService | Associate docs |
| 48 | -- | GET | ATHMA proxy (DMS) | OpdnotesserviceService | Get past uploads |
| 49 | -- | POST | `/api/follow-up` | OpdnotesserviceService | Save follow-up |

### 13.6 WebSocket Endpoints

| # | Protocol | Endpoint | Purpose |
|---|----------|----------|---------|
| 50 | SockJS | `{DOMAIN}websocket/connect?access_token={token}` | STOMP connection |
| 51 | STOMP Subscribe | `/consultation-topic/{appointmentNumber}` | Receive chat messages |
| 52 | STOMP Send | `/consultation-topic/send-message` | Send chat message |
| 53 | WebSocket | Care team update channel | Receive care team changes |

---

## 14. Error Handling

### 14.1 Care Team Errors

| Error Scenario | Handling |
|----------------|----------|
| Template already exists (duplicate PC+unit or HSC+unit) | Block save, show alert |
| User search returns empty | Show "No users found" message |
| Member already in team (duplicate login) | Block add, show toast |
| PC added as team member | Block add, show alert |
| WebSocket care team message parse failure | Log error, skip message |
| SQLite write failure | Log error, retry on next sync |
| Network error on template save | Show "No network" alert, retain form data |

### 14.2 Video Consultation Errors

| Error Scenario | Handling |
|----------------|----------|
| Camera permission denied | Show permission dialog with instructions |
| Microphone permission denied | Show permission dialog with instructions |
| Agora join failure | Show alert: "Unable to join video call. Please try again." |
| Agora connection state: DISCONNECTED | Show reconnecting indicator, auto-retry |
| OpenTok error 1004 | Show alert: "Video session expired" -- user must rejoin |
| STOMP connection failure | Auto-reconnect after 5 seconds |
| STOMP message dedup collision | Silently discard duplicate |
| IVR call failure | Show toast: "Unable to initiate IVR call" |
| File upload failure (OPD Notes) | Show retry option, retain file in queue |
| AMB_008 (Agora config) fetch failure | Block join, show "Service unavailable" |
| Cancel appointment failure | Show error alert with server message |
| Status update (mark DONE) failure | Show retry alert |

### 14.3 Cross-Consultation Errors

| Error Scenario | Handling |
|----------------|----------|
| Self-consultation attempt | Block submit, show alert |
| PC consultation attempt | Block submit, show alert |
| No network on CC submit | Show "No network" alert |
| Unit not selected | Validation error on form |
| Doctor not selected | Validation error on form |

---

## 15. Edge Cases

### 15.1 Care Team Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| **Patient transferred to new ward** | Location-wise care team auto-updates via WebSocket; old HSC team may persist until manually removed |
| **Primary consultant goes on leave** | Handover request must be initiated; care team remains unchanged until handover is accepted |
| **Handover rejected by all candidates** | Original PC remains assigned; admin may need to manually intervene |
| **Concurrent template edits** | Last-write-wins on server; no optimistic locking -- second save overwrites first |
| **Member exists in both user-wise and location-wise teams** | Allowed; member appears in both accordion sections on SelfCareTeamPage |
| **Admin views own teams vs other user's teams** | Search bar only appears for admins; selecting self in search shows same view as default |
| **Empty care team template saved** | Blocked by validation (min 1 member required) |
| **WebSocket disconnection during care team update** | Changes queued locally with syncStatus = PENDING; re-synced on reconnection |

### 15.2 Video Consultation Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| **Patient joins before doctor** | Doctor sees "Patient waiting" on join; remote video appears immediately |
| **Doctor rejoins after disconnect** | Agora auto-assigns same UID; remote user sees re-join event |
| **Both camera and mic denied** | Video call opens in audio/video-off mode; user sees black screen + mute indicator |
| **Multiple tabs/devices** | Not prevented; Agora handles multiple publishers in same channel (may cause echo) |
| **OpenTok session expires mid-call** | Error 1004 fires; user must rejoin with fresh session from server |
| **STOMP disconnects during chat** | 5-second auto-reconnect; messages during disconnect are lost (no offline queue for STOMP) |
| **50-minute auto-refresh fires during active call** | Appointment list reloads in background; active call is NOT interrupted |
| **Cancel today's appointment without object** | Fallback path fetches appointment first, then cancels (Path 2 in Section 11) |
| **Cancel non-today appointment without object** | Blocked with error message |
| **Upload 5 gallery images + 1 camera + 1 PDF simultaneously** | Each uploaded sequentially in pipeline; paths collected, then bulk-associated |
| **KeepAwake fails on certain devices** | Screen may dim/lock during call; no fallback mechanism |
| **Quick reply sent with no patient connected** | Message is sent to STOMP topic; patient sees it upon (re)connection |
| **Chat messageId collision** | Timestamp-based messageId ({apt}-AADI-{timestamp}) -- collision possible only with sub-millisecond sends; dedup silently drops |

---

## 16. Implementation Checklist

### Phase 1: Care Team Foundation

- [ ] **SQLite schema**: Create CareTeam table with 11 columns (Section 3.1)
- [ ] **CareTeamService**: Implement SQLite CRUD operations (insert, get, update, delete, upsert)
- [ ] **CareTeamService API layer**: Wire 7 REST endpoints including EHR_124 proxy
- [ ] **BehaviorSubject**: Set up `gotUpdateCareTeamForPatientInfoID` event bus
- [ ] **WebSocket handler**: Process CARE_TEAM_UPDATE messages (SAVE → upsert, DELETE → remove)
- [ ] **Server sync**: Implement full sync lifecycle (local-first load, background server pull, EHR bidirectional sync)

### Phase 2: Care Team Admin UI

- [ ] **AdminCareTeamPage**: Two-card navigation hub (User Wise / Location Wise)
- [ ] **SelfCareTeamPage**: 3 accordion lists (Primary Consultant, Other Team, Location-wise)
- [ ] **SelfCareTeamPage admin mode**: User search bar (min 3 chars, reload on select)
- [ ] **AddCareTeamPage**: Segment UI for User Wise / Location Wise modes
- [ ] **AddCareTeamPage validation**: All 6 validation rules (Section 2.3.3)
- [ ] **Member role detection**: Group code → parent code fallback (DOCTOR/NURSE/PARAMEDICS)
- [ ] **PrimaryConsultantPage**: Edit mode for user-wise templates (read-only unit + PC)
- [ ] **LocationWisePage**: Edit mode for location-wise templates (read-only unit + HSC)
- [ ] **CareTeamManagementService**: Wire 14 API endpoints

### Phase 3: Cross-Consultation

- [ ] **CrossConsultationService**: Wire 5 API endpoints
- [ ] **CrossConsultationPage**: Unit → doctor search → priority → reason form
- [ ] **Validation**: Self-check, PC-check, network check
- [ ] **Two submission paths**: Direct submit vs return-to-PN
- [ ] **CrossConsultationListPage**: History view grouped by date

### Phase 4: Handover Requests

- [ ] **HandoverRequestService**: 3 methods (count, accept/reject, submit)
- [ ] **HandoverRequestPage**: Modal with pending request list
- [ ] **Accept flow**: POST accept → update SQLite with new consultant → remove from list
- [ ] **Reject flow**: POST reject → remove from list
- [ ] **Auto-dismiss**: Modal closes when pending list is empty
- [ ] **taskDefinition code**: Ensure `IP-CONSULTANT-HANDOVER` constant

### Phase 5: Appointment Dashboard (HomeVcPage)

- [ ] **HomeVcPage layout**: Appointment card list with status-based rendering
- [ ] **Date navigation**: Day-by-day arrows + calendar modal
- [ ] **3-chip filter system**: Unit, Type, Status with combinatorial query logic
- [ ] **Counts**: Pending (BOOKED+SCHEDULED+ARRIVED) and Total in header
- [ ] **Auto-refresh**: 50-minute interval with cleanup on leave
- [ ] **Status map**: 10 statuses with color coding and action button rules
- [ ] **Per-appointment actions**: Start VC, OPD Notes, Summary PDF, AI Chart, Cancel, Attachments

### Phase 6: Agora Video Call (Primary Provider)

- [ ] **Agora SDK integration**: createClient({mode:"rtc", codec:"vp8"})
- [ ] **Dynamic app ID**: Fetch from server via AMB_008
- [ ] **Permission checks**: Camera + Microphone (block join if denied)
- [ ] **Join flow**: join channel → create tracks → play local → publish
- [ ] **Leave flow**: unpublish → close tracks → leave → cleanup
- [ ] **Event handlers**: connection-state-change, user-joined/left, user-published/unpublished
- [ ] **Controls**: mute/unmute, camera on/off, flip camera (cycle devices)
- [ ] **IVR call**: startIVRCall via EHR_074
- [ ] **Screen keep-awake**: KeepAwake.keepAwake() on join, allowSleep() on leave
- [ ] **Audit trail**: vcAuditStart (EHR_076) on join, vcAuditStop (EHR_077) on leave
- [ ] **Client info**: Report OS/browser via EHR_075

### Phase 7: OpenTok Video Call (Legacy)

- [ ] **OpenTok SDK integration**: OT.initSession, session.connect
- [ ] **Publisher config**: 200x140px, 320x240 resolution, 7fps
- [ ] **Session error handling**: Code 1004 → "Video session expired"
- [ ] **Controls**: audio/video toggle, camera cycle
- [ ] **Provider selection**: Config-driven switch between Agora and OpenTok

### Phase 8: In-Call STOMP Chat

- [ ] **SockJS + STOMP connection**: Connect with access token
- [ ] **Subscribe**: /consultation-topic/{appointmentNumber}
- [ ] **Send**: /consultation-topic/send-message with message format (Section 9.2)
- [ ] **Message deduplication**: Check messageId before adding to list
- [ ] **Auto-reconnect**: 5-second delay on disconnect
- [ ] **Quick replies**: 5 preset buttons (Rejoin, IVR, Prescription, Admission, Noise)
- [ ] **Chat panel UI**: Slide-up panel within video call screen

### Phase 9: OPD Notes (Post-Consultation)

- [ ] **File sources**: Camera (quality 50), Gallery (limit 5, 1250x800), File Picker (PDF only)
- [ ] **Upload pipeline**: base64 → FormData → POST with checksum → collect paths → PUT association
- [ ] **Mark DONE**: sendStatusUpdate via EHR_069
- [ ] **Existing prescriptions**: Load (EHR_072) + delete (EHR_073)
- [ ] **Follow-up options**: 6 selections (Investigation, Video Follow-up, Physical Follow-up, Surgery, Medications, Others)
- [ ] **OpdnotesserviceService**: Wire 6 endpoints

### Phase 10: Cancel + History Pages

- [ ] **Cancel appointment**: Two paths (with/without appointment object)
- [ ] **Cancel reasons**: 2 pre-set templates + free text
- [ ] **Today-only constraint**: Validate date for Path 2
- [ ] **ConsultationChatPage**: Read-only chat history via EHR_071
- [ ] **PastUploadsPage**: Attachments grouped by appointment via DMS
- [ ] **PastPrescriptionsPage**: OP (EHR_072) vs IP (EHR_064) split view

### Phase 11: Integration Testing

- [ ] **Care team → Patient chat**: Verify BehaviorSubject triggers reload on WebSocket update
- [ ] **Cross-consultation → Progress Notes**: Verify CC data returns correctly to PN page
- [ ] **Handover → SQLite**: Verify local patient record updated with new consultant on accept
- [ ] **Video call → Audit**: Verify EHR_076/077 called on join/leave
- [ ] **Video call → Chat**: Verify STOMP chat works during both Agora and OpenTok calls
- [ ] **OPD Notes → HomeVcPage**: Verify appointment status updates to DONE after mark-complete
- [ ] **Cancel → HomeVcPage**: Verify appointment card updates to CANCELLED_BY_DOCTOR
- [ ] **Filter + counts**: Verify 3-chip filter produces correct results and counts update
- [ ] **Auto-refresh**: Verify 50-minute refresh does not interrupt active video call
- [ ] **Offline → Online**: Verify care team sync resumes after network reconnection
