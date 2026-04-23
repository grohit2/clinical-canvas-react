# Flow 01: Landing Dashboard & Inpatient Home

**App:** AADI (org.nh.app.aadi) v2.35.0
**Framework:** Ionic 7 / Capacitor 5 / Angular 17+
**Source files:** `landing.page.ts`, `landing.page.html`, `home.page.ts` (~2112 lines), `home.page.html`, `patient-list.service.ts`, `dm-user-list.service.ts`, `home-filter.component.ts`

---

## 1. Overview

The Landing screen is the first screen after login. It displays a dashboard of four cards with live counts, each navigating to a distinct workflow area. The **Inpatient List** (home.page.ts at ~2112 lines) is the most-used sub-screen, showing the doctor's assigned patients with rich card metadata, a 9-filter system, pinning, sorting, add-by-search/barcode, and handover capabilities — all backed by SQLite for offline resilience.

### 1.1 Component Dependency Diagram

```
┌───────────────────────────────────────────────────────────┐
│                    landing.page.ts                         │
│  ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Inpatients │ │ Appoint-   │ │ Activity │ │ Discharged│  │
│  │ Card       │ │ ments Card │ │ Area Card│ │ Patients  │  │
│  └─────┬──────┘ └─────┬──────┘ └────┬─────┘ └─────┬────┘  │
└────────┼──────────────┼─────────────┼──────────────┼───────┘
         │              │             │              │
         ▼              ▼             ▼              ▼
  ┌──────────┐   ┌───────────┐ ┌──────────┐  ┌───────────┐
  │ home     │   │ appoint-  │ │ activity │  │ discharged│
  │ .page.ts │   │ ments     │ │ -area    │  │ -patients │
  │ (2112 ln)│   │ .page.ts  │ │ .page.ts │  │ .page.ts  │
  └────┬─────┘   └───────────┘ └──────────┘  └───────────┘
       │
  ┌────┴──────────────────────────────────────────┐
  │                                                │
  ▼                    ▼                     ▼     │
┌──────────┐   ┌──────────────┐   ┌──────────────┐│
│ patient- │   │ dm-user-list │   │ home-filter   ││
│ list     │   │ .service.ts  │   │ .component.ts ││
│ .service │   │              │   │ (9 filters)   ││
└────┬─────┘   └──────┬───────┘   └───────────────┘│
     │                │                             │
     ▼                ▼                             │
┌──────────┐   ┌──────────────┐                    │
│ SQLite   │   │ REST API     │                    │
│ Database │   │ (Spring Boot)│                    │
└──────────┘   └──────────────┘                    │
                                                   │
     ┌─────────────────────────────────────────────┘
     ▼
┌──────────────────┐
│ @capacitor-mlkit/ │
│ barcode-scanning  │
│ (add patient)     │
└──────────────────┘
```

---

## 2. Landing Dashboard Screen

### 2.1 Screen Mockup

```
┌──────────────────────────────────────────┐
│  ☰  AADI                    🔔  👤       │
│─────────────────────────────────────────│
│                                          │
│  Good Morning, Dr. Rohit                 │
│  Narayana Health — Cardiology            │
│                                          │
│  ┌──────────────────┐ ┌────────────────┐ │
│  │  🏥 Inpatients   │ │ 📅 Appointments│ │
│  │                  │ │                │ │
│  │     24           │ │      8         │ │
│  │   patients       │ │   today        │ │
│  └──────────────────┘ └────────────────┘ │
│                                          │
│  ┌──────────────────┐ ┌────────────────┐ │
│  │  📋 Activity     │ │ ✅ Discharged  │ │
│  │     Area         │ │   Patients     │ │
│  │     12           │ │      3         │ │
│  │   pending        │ │   today        │ │
│  └──────────────────┘ └────────────────┘ │
│                                          │
│─────────────────────────────────────────│
│  🏠 Home   💬 Chat   📊 Reports   ⚙️    │
└──────────────────────────────────────────┘
```

### 2.2 Data Loading (ionViewWillEnter)

When the landing page enters the view, the following data is loaded:

```
ionViewWillEnter()
       │
       ├──▶ Load DOCTOR_PROFILE from SecureStorage
       │    └── Display greeting: "Good Morning, Dr. {firstName}"
       │    └── Display unit: "{unit} — {department}"
       │
       ├──▶ GET /api/my-patient-list
       │    └── Returns patient counts per category
       │    └── Update card counts
       │
       └──▶ Check for pending notifications
            └── Update bell badge count
```

**GET /api/my-patient-list:**

```
GET /api/my-patient-list?login=rohit.g
Authorization: Bearer <token>
```

**Response:**

```json
{
  "inpatientCount": 24,
  "appointmentCount": 8,
  "activityAreaCount": 12,
  "dischargedCount": 3,
  "lastUpdated": "2026-04-22T09:30:00Z"
}
```

### 2.3 Navigation from Cards

| Card                 | Route                      | Description                           |
|----------------------|----------------------------|---------------------------------------|
| Inpatients           | `/home`                    | Inpatient list (home.page.ts)         |
| Appointments         | `/appointments`            | Today's appointments list             |
| Activity Area        | `/activity-area`           | Pending tasks & checklists            |
| Discharged Patients  | `/discharged-patients`     | Recently discharged patients          |

---

## 3. Inpatient List (home.page.ts)

This is the primary work screen for doctors and nurses — a scrollable list of assigned patients with rich metadata cards.

### 3.1 Screen Mockup — Inpatient List

```
┌──────────────────────────────────────────┐
│  ←  My Patients (24)      🔍  ⊕  🔽     │
│─────────────────────────────────────────│
│                                          │
│  📌 ┌────────────────────────────────┐   │
│     │ Rajesh Kumar             M/45  │   │
│     │ 72.5 kg                        │   │
│     │ 👨‍⚕️ Dr. Rohit G. (Cardiology)  │   │
│     │ 📍 Ward 5B, Bed 12            │   │
│     │ MRN: MRN0012345               │   │
│     │ 💬 3 unread                    │   │
│     │ ⚠️ Risk: HIGH  🏷️ MFD MLC     │   │
│     │ DM, HTN, CKD                   │   │
│     │ Labels: [Post-op] [Critical]   │   │
│     └────────────────────────────────┘   │
│                                          │
│  📌 ┌────────────────────────────────┐   │
│     │ Priya Sharma             F/32  │   │
│     │ 58.0 kg                        │   │
│     │ 👨‍⚕️ Dr. Meena S. (OB-GYN)     │   │
│     │ 📍 Ward 3A, Bed 7             │   │
│     │ MRN: MRN0098765               │   │
│     │ 💬 0 unread                    │   │
│     │ ⚠️ Risk: MODERATE             │   │
│     └────────────────────────────────┘   │
│                                          │
│     ┌────────────────────────────────┐   │
│     │ Ahmed Khan               M/67  │   │
│     │ 81.2 kg                        │   │
│     │ 👨‍⚕️ Dr. Rohit G. (Cardiology)  │   │
│     │ 📍 ICU-2, Bed 3               │   │
│     │ MRN: MRN0056789               │   │
│     │ 💬 1 unread                    │   │
│     │ ⚠️ Risk: CRITICAL             │   │
│     │ DM, AF, CHF                    │   │
│     └────────────────────────────────┘   │
│                                          │
│─────────────────────────────────────────│
│  🏠 Home   💬 Chat   📊 Reports   ⚙️    │
└──────────────────────────────────────────┘
```

### 3.2 Patient Card — Data Fields

Each patient card displays the following information:

| Field           | Source Column              | Example                    | Notes                             |
|-----------------|----------------------------|----------------------------|-----------------------------------|
| Name            | `patient_name`             | Rajesh Kumar               | Full name                         |
| Gender / Age    | `gender`, `age`            | M / 45                     | Single letter gender + years      |
| Weight          | `weight`                   | 72.5 kg                    | In kilograms                      |
| Consultant      | `consultant_name`          | Dr. Rohit G.               | Primary consultant                |
| Department      | `department`               | Cardiology                 | Consultant's department           |
| Location        | `ward_name`, `bed_no`      | Ward 5B, Bed 12            | Ward and bed number               |
| MRN             | `mrn`                      | MRN0012345                 | Medical Record Number             |
| Unread Count    | `unread_count`             | 3                          | Unread chat messages              |
| Risk Score      | `risk_score`               | HIGH                       | LOW / MODERATE / HIGH / CRITICAL  |
| MFD Badge       | `mfd_flag`                 | MFD                        | Medically Fit for Discharge       |
| MLC Badge       | `mlc_flag`                 | MLC                        | Medico-Legal Case                 |
| Comorbidities   | `comorbidities`            | DM, HTN, CKD               | Comma-separated                   |
| Labels          | `labels`                   | [Post-op] [Critical]       | Custom labels (color-coded)       |
| Pin indicator   | `pin_flag`                 | 📌                         | Pinned patients shown first       |

---

## 4. Sorting

The inpatient list is sorted by the following SQL `ORDER BY` clause:

```sql
ORDER BY
  pin_flag DESC,         -- Pinned patients first (1 before 0)
  pin_order ASC,         -- Among pinned: maintain manual order
  ward_sort ASC,         -- Then by ward (alphabetical)
  last_msg_time DESC     -- Within same ward: most recent message first
```

### 4.1 Sort Priority Diagram

```
┌────────────────────────────────────┐
│         SORT PRIORITY              │
│                                    │
│  1. 📌 Pinned (pin_flag = 1)      │
│     └── Ordered by pin_order      │
│                                    │
│  2. 📍 Unpinned, by Ward          │
│     └── Ward 3A                   │
│         └── by last_msg_time DESC │
│     └── Ward 5B                   │
│         └── by last_msg_time DESC │
│     └── ICU-2                     │
│         └── by last_msg_time DESC │
└────────────────────────────────────┘
```

---

## 5. 9-Filter System

### 5.1 Filter Panel Mockup

```
┌──────────────────────────────────────────┐
│  Filters                        ✕ Clear  │
│─────────────────────────────────────────│
│                                          │
│  Unit:          [RGNHH ▼]               │
│  P.Consultant:  [All ▼]                 │
│  Visit Type:    [All ▼]                 │
│  Ward:          [All ▼]                 │
│  Location:      [All ▼]                 │
│  MLC/MFD:       [All ▼]                 │
│  A.Consultant:  [All ▼]                 │
│  Discharge Int: [All ▼]                 │
│  Dead/Absconded:[All ▼]                 │
│                                          │
│  ┌──────────────┐  ┌──────────────────┐  │
│  │    RESET      │  │   APPLY (24)     │  │
│  └──────────────┘  └──────────────────┘  │
└──────────────────────────────────────────┘
```

### 5.2 Filter Definitions

| #  | Filter Name          | Column                  | Type        | Values Example                                |
|----|----------------------|-------------------------|-------------|-----------------------------------------------|
| 1  | Unit                 | `unit_code`             | Single      | RGNHH, MHCH, SRCC, ...                       |
| 2  | P.Consultant         | `primary_consultant`    | Multi       | Dr. Rohit G., Dr. Meena S., ...               |
| 3  | Visit Type           | `visit_type`            | Multi       | IP, ER, DayCare                               |
| 4  | Ward                 | `ward_name`             | Multi       | Ward 3A, Ward 5B, ICU-2, ...                  |
| 5  | Location             | `location`              | Multi       | Bed 1, Bed 2, ...                             |
| 6  | MLC/MFD              | `mlc_flag`, `mfd_flag`  | Multi       | MLC, MFD, Both, Neither                       |
| 7  | A.Consultant         | `attending_consultant`  | Multi       | Dr. Rohit G., Dr. Meena S., ...               |
| 8  | Discharge Intimation | `discharge_intimation`  | Multi       | Yes, No                                       |
| 9  | Dead/Absconded       | `status`                | Multi       | Dead, Absconded                               |

### 5.3 Filter SQL Logic

Filters use **OR within the same filter** and **AND across different filters**:

```sql
SELECT * FROM patient_list
WHERE unit_code = 'RGNHH'                           -- Filter 1 (always single)
  AND (primary_consultant IN ('rohit.g', 'meena.s')) -- Filter 2 (OR within)
  AND (ward_name IN ('Ward 5B', 'ICU-2'))            -- Filter 4 (OR within)
  AND (mlc_flag = 1 OR mfd_flag = 1)                 -- Filter 6 (OR within)
ORDER BY pin_flag DESC, pin_order ASC, ward_sort ASC, last_msg_time DESC
```

**Logic rule:** Multiple selections within a single filter are combined with `OR`. Selections across different filters are combined with `AND`.

### 5.4 Filter Persistence

Selected filters are saved to `SecureStorage` under key `PATIENT_LIST_FILTERS` and restored on next visit. The Unit filter defaults to the user's assigned unit from `DOCTOR_PROFILE.unit`.

---

## 6. Add Patient

### 6.1 Two Methods to Add a Patient

```
┌──────────────────────────────────────────────────┐
│                 ADD PATIENT                       │
│                                                  │
│  Method 1: Text Search                           │
│  ┌────────────────────────────────────────────┐  │
│  │ 🔍 Search by name, MRN, or phone...       │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Method 2: Barcode Scan                          │
│  ┌────────────────────────────────────────────┐  │
│  │ 📷 Scan patient wristband barcode          │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### 6.2 Text Search

**Request:**

```
GET /api/athma-records-with-token?searchType=IPL_003&searchValue=rajesh
Authorization: Bearer <token>
```

**Response:**

```json
[
  {
    "mrn": "MRN0012345",
    "patientName": "Rajesh Kumar",
    "gender": "M",
    "age": 45,
    "ward": "Ward 5B",
    "bed": "12",
    "consultant": "Dr. Rohit G.",
    "admissionDate": "2026-04-18",
    "visitType": "IP"
  },
  {
    "mrn": "MRN0012399",
    "patientName": "Rajesh Verma",
    "gender": "M",
    "age": 52,
    "ward": "Ward 2A",
    "bed": "3",
    "consultant": "Dr. Singh P.",
    "admissionDate": "2026-04-20",
    "visitType": "IP"
  }
]
```

### 6.3 Barcode Scan

Uses `@capacitor-mlkit/barcode-scanning` to scan the patient wristband:

```
1. Open camera with barcode scanner overlay
2. Detect barcode (Code128 / QR)
3. Extract MRN from barcode data
4. Search patient by MRN (same API as text search)
5. Show patient card for confirmation
```

### 6.4 Swipe-to-Add Gesture

The search results support a **swipe-right gesture** to add a patient to the doctor's list:

| Swipe Threshold | Visual Feedback                       | Action                   |
|-----------------|----------------------------------------|--------------------------|
| 30%             | Card shifts right, green hint appears  | No action (preview only) |
| 60%             | Green background with "Add" text       | No action (still preview)|
| 100%            | Full green, checkmark icon             | **Patient added**        |

### 6.5 Post-Add Sequence

```
Swipe completes (100%)
       │
       ├──▶ POST /api/dm-user-list/{login}/patient/{mrn}/add
       │    └── Registers patient under doctor's list on server
       │
       ├──▶ SQLite INSERT into patient_list
       │    └── Adds patient to local DB for offline access
       │
       └──▶ Download messages for this patient
            └── GET /api/messages/{mrn}?since=...
            └── INSERT messages into SQLite
```

**Add Patient API:**

```
POST /api/dm-user-list/rohit.g/patient/MRN0012345/add
Authorization: Bearer <token>
```

**Response:**

```json
{
  "status": "SUCCESS",
  "message": "Patient added to your list",
  "patient": {
    "mrn": "MRN0012345",
    "patientName": "Rajesh Kumar",
    "addedAt": "2026-04-22T10:15:00Z"
  }
}
```

---

## 7. Handover

### 7.1 Handover Flow

A doctor can hand over a patient to another doctor. This creates a request that the receiving doctor must accept or reject.

```
┌──────────────────────────────────────────────────────┐
│                   HANDOVER FLOW                      │
│                                                      │
│  Dr. A (sender)              Dr. B (receiver)        │
│       │                           │                  │
│       ├── Open handover modal     │                  │
│       ├── Search for Dr. B        │                  │
│       ├── Select patient(s)       │                  │
│       ├── POST handover-request ──▶│                  │
│       │   State: REQUESTED        │                  │
│       │                           │                  │
│       │                    ┌──────┤                  │
│       │                    │ Push notification       │
│       │                    │ "Dr. A wants to         │
│       │                    │  hand over Rajesh K."   │
│       │                    └──────┤                  │
│       │                           │                  │
│       │              Accept ◄─────┤                  │
│       │   State: ACCEPTED         │                  │
│       │   Patient moves to        │                  │
│       │   Dr. B's list            │                  │
│       │                           │                  │
│       │         ── OR ──          │                  │
│       │                           │                  │
│       │              Reject ◄─────┤                  │
│       │   State: REJECTED         │                  │
│       │   Patient stays with      │                  │
│       │   Dr. A                   │                  │
└──────────────────────────────────────────────────────┘
```

### 7.2 Handover Request Modal

```
┌──────────────────────────────────────────┐
│  Handover Patient                    ✕   │
│─────────────────────────────────────────│
│                                          │
│  Patient: Rajesh Kumar (MRN0012345)      │
│                                          │
│  Hand over to:                           │
│  ┌────────────────────────────────────┐  │
│  │ 🔍 Search doctor by name...       │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Search results:                         │
│  ┌────────────────────────────────────┐  │
│  │ Dr. Meena S. — OB-GYN            │  │
│  │ Dr. Singh P. — General Medicine   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Reason (optional):                      │
│  ┌────────────────────────────────────┐  │
│  │ Shift change                      │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │         SEND REQUEST               │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### 7.3 Handover States

| State      | Sender View                  | Receiver View                   |
|------------|------------------------------|---------------------------------|
| REQUESTED  | "Handover pending..."        | Accept / Reject buttons         |
| ACCEPTED   | "Handover accepted" (removed)| Patient appears in their list   |
| REJECTED   | "Handover rejected" (kept)   | Notification dismissed          |

---

## 8. Pin / Unpin Patients

### 8.1 Interaction

- **Pin:** Long-press on a patient card → context menu → "Pin patient"
- **Unpin:** Long-press on a pinned patient → context menu → "Unpin patient"

### 8.2 Pin Ordering

Pinned patients receive a **sequential `pin_order`** value:

```
Pin Patient A → pin_order = 1
Pin Patient B → pin_order = 2
Pin Patient C → pin_order = 3

Unpin Patient A → Patient B.pin_order = 1, Patient C.pin_order = 2
```

### 8.3 SQLite Update

```sql
-- Pin
UPDATE patient_list
SET pin_flag = 1, pin_order = (SELECT COALESCE(MAX(pin_order), 0) + 1 FROM patient_list WHERE pin_flag = 1)
WHERE mrn = 'MRN0012345';

-- Unpin
UPDATE patient_list SET pin_flag = 0, pin_order = NULL WHERE mrn = 'MRN0012345';
-- Re-order remaining pinned patients
UPDATE patient_list SET pin_order = (
  SELECT COUNT(*) FROM patient_list p2
  WHERE p2.pin_flag = 1 AND p2.pin_order <= patient_list.pin_order
) WHERE pin_flag = 1;
```

---

## 9. Pull-to-Refresh

When the user pulls down on the patient list:

```
Pull-to-refresh triggered
       │
       ├──▶ GET /api/my-patient-list?login=rohit.g&full=true
       │    └── Returns full patient list from server
       │
       ├──▶ Diff against local SQLite
       │    ├── New patients → INSERT
       │    ├── Updated patients → UPDATE
       │    └── Removed patients → DELETE (soft)
       │
       ├──▶ Update unread counts
       │    └── Recalculate from messages table
       │
       └──▶ Refresh UI
            └── Re-run sort + active filters
```

---

## 10. Real-Time Updates

The inpatient list subscribes to real-time updates via Azure Communication Services (ACS) `BehaviorSubject` streams:

| Event                      | Source                          | UI Update                                |
|----------------------------|---------------------------------|------------------------------------------|
| New message received       | `chatMessageReceived$`          | Increment unread count, update sort time |
| Patient transferred        | `patientTransferred$`           | Update ward/bed, re-sort                 |
| Patient discharged         | `patientDischarged$`            | Remove from list (or move to Discharged) |
| Risk score changed         | `riskScoreUpdated$`             | Update risk badge color                  |
| MFD/MLC flag changed       | `flagUpdated$`                  | Show/hide MFD/MLC badge                  |

```
ACS WebSocket ──▶ chatService ──▶ BehaviorSubject ──▶ home.page.ts
                                                           │
                                                    ┌──────┤
                                                    │ Update SQLite
                                                    │ Re-render list
                                                    └──────┘
```

---

## 11. Offline Mode

### 11.1 Offline Behavior

The inpatient list works fully offline using SQLite as the source of truth:

| Feature              | Online                              | Offline                              |
|----------------------|--------------------------------------|--------------------------------------|
| Patient list         | Server + SQLite sync                 | SQLite only                          |
| Unread counts        | Real-time via ACS                    | Last known from SQLite               |
| Add patient          | API call + SQLite insert             | Queued, synced when online           |
| Filter/sort          | SQLite query (same)                  | SQLite query (same)                  |
| Pull-to-refresh      | Syncs with server                    | Shows "Offline" toast, no-op         |
| Navigation to chat   | Works (chat has its own offline)     | Works (chat uses SQLite messages)    |

---

## 12. Navigation to Patient Chat

Tapping a patient card navigates to the patient chat screen:

```
User taps patient card
       │
       ├──▶ Save current scroll position
       ├──▶ Save current filter state → SecureStorage
       └──▶ Navigate to /patient-chat/{mrn}
            └── e.g., /patient-chat/MRN0012345
```

---

## 13. SQLite Schema

### 13.1 patient_list Table

```sql
CREATE TABLE IF NOT EXISTS patient_list (
  mrn                   TEXT PRIMARY KEY,
  patient_name          TEXT NOT NULL,
  gender                TEXT,           -- 'M', 'F', 'O'
  age                   INTEGER,
  weight                REAL,           -- in kg
  primary_consultant    TEXT,
  consultant_name       TEXT,
  department            TEXT,
  attending_consultant  TEXT,
  unit_code             TEXT,
  ward_name             TEXT,
  ward_sort             TEXT,           -- sortable ward identifier
  bed_no                TEXT,
  location              TEXT,
  visit_type            TEXT,           -- 'IP', 'ER', 'DayCare'
  admission_date        TEXT,           -- ISO date
  unread_count          INTEGER DEFAULT 0,
  risk_score            TEXT,           -- 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'
  mfd_flag              INTEGER DEFAULT 0,
  mlc_flag              INTEGER DEFAULT 0,
  comorbidities         TEXT,           -- comma-separated
  labels                TEXT,           -- JSON array of {text, color}
  pin_flag              INTEGER DEFAULT 0,
  pin_order             INTEGER,
  last_msg_time         TEXT,           -- ISO datetime
  discharge_intimation  INTEGER DEFAULT 0,
  status                TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'DEAD', 'ABSCONDED'
  synced                INTEGER DEFAULT 1,
  created_at            TEXT DEFAULT (datetime('now')),
  updated_at            TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_patient_list_unit ON patient_list(unit_code);
CREATE INDEX idx_patient_list_ward ON patient_list(ward_name);
CREATE INDEX idx_patient_list_consultant ON patient_list(primary_consultant);
CREATE INDEX idx_patient_list_pin ON patient_list(pin_flag, pin_order);
CREATE INDEX idx_patient_list_sort ON patient_list(pin_flag DESC, pin_order ASC, ward_sort ASC, last_msg_time DESC);
```

### 13.2 handover_requests Table

```sql
CREATE TABLE IF NOT EXISTS handover_requests (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  mrn                   TEXT NOT NULL,
  from_login            TEXT NOT NULL,
  to_login              TEXT NOT NULL,
  reason                TEXT,
  status                TEXT DEFAULT 'REQUESTED', -- 'REQUESTED', 'ACCEPTED', 'REJECTED'
  requested_at          TEXT DEFAULT (datetime('now')),
  responded_at          TEXT,
  FOREIGN KEY (mrn) REFERENCES patient_list(mrn)
);
```

---

## 14. API Reference

| Method | Endpoint                                           | Description                          | Auth     |
|--------|-----------------------------------------------------|--------------------------------------|----------|
| GET    | `/api/my-patient-list`                              | Get patient list with counts         | Bearer   |
| GET    | `/api/my-patient-list?login={login}&full=true`      | Full patient list (pull-to-refresh)  | Bearer   |
| GET    | `/api/athma-records-with-token?searchType=IPL_003&searchValue={q}` | Search patients to add  | Bearer   |
| POST   | `/api/dm-user-list/{login}/patient/{mrn}/add`       | Add patient to doctor's list         | Bearer   |
| POST   | `/api/dm-user-list/{login}/patient/{mrn}/remove`    | Remove patient from list             | Bearer   |
| POST   | `/api/handover-request`                             | Create handover request              | Bearer   |
| PUT    | `/api/handover-request/{id}/accept`                 | Accept handover                      | Bearer   |
| PUT    | `/api/handover-request/{id}/reject`                 | Reject handover                      | Bearer   |
| GET    | `/api/messages/{mrn}?since={iso}`                   | Download messages for patient        | Bearer   |

---

## 15. Error Handling Matrix

| Scenario                            | HTTP Code | UI Behavior                                  | Recovery                           |
|-------------------------------------|-----------|----------------------------------------------|------------------------------------|
| Patient list load fails             | 500       | Show cached SQLite data, error toast         | Pull-to-refresh to retry           |
| Add patient — already in list       | 409       | Toast: "Patient already in your list"        | No action needed                   |
| Add patient — MRN not found         | 404       | Toast: "Patient not found"                   | User retries search                |
| Add patient — network error         | —         | Queue action, toast: "Will add when online"  | Auto-retry on reconnect            |
| Barcode scan — invalid barcode      | —         | Toast: "Could not read barcode"              | User rescans                       |
| Barcode scan — camera permission    | —         | Show permission dialog                       | User grants permission             |
| Handover — target doctor not found  | 404       | Toast: "Doctor not found"                    | User searches again                |
| Handover — already pending          | 409       | Toast: "Handover already requested"          | Wait for response                  |
| Filter produces 0 results           | —         | Empty state: "No patients match filters"     | Adjust or clear filters            |
| Pull-to-refresh while offline       | —         | Toast: "Offline — showing cached data"       | Retry when online                  |
| SQLite query error                  | —         | Fall back to unfiltered list, log error      | Restart app if persists            |

---

## 16. Edge Cases

1. **Empty patient list:** New doctors with no assigned patients see an empty state with a prominent "Add Patient" button and a brief tutorial prompt.

2. **Large patient lists:** Some nurses may have 100+ patients. The list uses Ionic virtual scroll (`ion-virtual-scroll`) for performance — only visible cards are rendered in the DOM.

3. **Concurrent add/remove:** If Dr. A adds a patient that Dr. B simultaneously removes (via handover), the next pull-to-refresh reconciles the conflict using server state as the source of truth.

4. **Stale unread counts:** Unread counts are stored locally and may drift from server state if ACS messages are missed (e.g., during extended offline periods). Pull-to-refresh recalculates from the server.

5. **Ward transfer during filter:** If a patient is transferred to a different ward while the user has a ward filter active, the patient disappears from the filtered view. A toast notifies: "Patient {name} transferred to {new ward}."

6. **Pin limit:** There is no hard limit on pinned patients, but pinning more than ~10 makes the feature less useful. No UI enforcement, just UX guidance.

7. **Barcode encoding:** Wristband barcodes can be Code128 (linear) or QR codes. The barcode scanner handles both. Some older wristbands have OCR-only text — these are not supported by the scanner.

8. **Handover timeout:** If a handover request is not responded to within 24 hours, it auto-expires to state `EXPIRED`. The sender is notified and can resend.

---

## 17. Implementation Checklist

- [ ] Landing dashboard with 4 cards (Inpatients, Appointments, Activity Area, Discharged)
- [ ] Load DOCTOR_PROFILE from SecureStorage for greeting
- [ ] GET /api/my-patient-list for card counts
- [ ] Navigation from each card to sub-screen
- [ ] Inpatient list (home.page.ts) with patient cards
- [ ] Patient card: name, gender/age/weight, consultant, location, MRN, unread count
- [ ] Patient card: risk score badge (color-coded)
- [ ] Patient card: MFD/MLC badges
- [ ] Patient card: comorbidities display
- [ ] Patient card: custom labels (color-coded)
- [ ] Patient card: pin indicator
- [ ] Sort: pin_flag DESC, pin_order ASC, ward_sort ASC, last_msg_time DESC
- [ ] 9-filter system: Unit, P.Consultant, Visit Type, Ward, Location, MLC/MFD, A.Consultant, Discharge Intimation, Dead/Absconded
- [ ] Filter logic: OR within same filter, AND across filters
- [ ] Filter persistence in SecureStorage
- [ ] Add patient: text search (GET athma-records-with-token IPL_003)
- [ ] Add patient: barcode scan (@capacitor-mlkit/barcode-scanning)
- [ ] Add patient: swipe-to-add gesture (30%/60%/100% thresholds)
- [ ] Post-add: POST dm-user-list/{login}/patient/{mrn}/add
- [ ] Post-add: SQLite insert + message download
- [ ] Handover: request modal with doctor search
- [ ] Handover: POST handover-request
- [ ] Handover: accept/reject flow with state transitions
- [ ] Pin/unpin: long-press context menu
- [ ] Pin ordering: sequential pin_order
- [ ] Pull-to-refresh: sync patient list from server
- [ ] Real-time updates: ACS BehaviorSubjects for messages, transfers, discharges
- [ ] Offline mode: SQLite-based patient list
- [ ] Navigation to /patient-chat/{mrn}
- [ ] SQLite schema: patient_list table with indexes
- [ ] SQLite schema: handover_requests table
- [ ] Error handling for all failure scenarios
- [ ] Empty state for no patients
- [ ] Virtual scroll for large lists
