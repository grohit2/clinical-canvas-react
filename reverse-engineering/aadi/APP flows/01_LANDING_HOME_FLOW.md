# AADI App: Landing Dashboard & Inpatient Home Screen

> Implementation-level flow document for junior developers.
> Source: Decompiled from `landing.page.ts` (281 lines), `landing.page.html` (60 lines), `home.page.ts` (2112 lines), `home.page.html` (427 lines), `app-routing.module.ts` (456 lines).

---

## 1. Overview

The AADI app is a hospital communication and patient management tool for doctors. After login, the doctor lands on a **Dashboard** with four summary cards. The most important card -- **Inpatients** -- leads to the **Inpatient Home** screen, which is the most-used screen in the entire app.

**User journey covered in this document:**

```
Login ──> Landing Dashboard ──> Inpatient List (Home)
                                    ├── View patient cards
                                    ├── Search / Filter patients
                                    ├── Add patient (text search or barcode)
                                    ├── Pin/Unpin patient
                                    ├── Request handover
                                    ├── Tap patient card ──> Patient Chat
                                    └── Pull-to-refresh / real-time sync
```

**Tech stack assumptions:**

| Layer | Technology |
|---|---|
| Framework | Ionic 6+ / Angular 14+ |
| Native bridge | Capacitor |
| Local DB | SQLite (via `@capacitor-community/sqlite`) |
| Secure storage | `@capacitor/secure-storage` |
| Barcode scanning | `@capacitor-mlkit/barcode-scanning` |
| Real-time messaging | Azure Communication Services (ACS) WebSocket |
| State management | RxJS BehaviorSubjects in Angular services |

---

## 2. Landing Dashboard

### 2.1 Screen Mockup (ASCII)

```
┌─────────────────────────────────────────┐
│  [<]   AADI Dashboard      [bell] [gear]│
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────┐ ┌─────────────────┐│
│  │   INPATIENTS    │ │  APPOINTMENTS   ││
│  │                 │ │                 ││
│  │      12         │ │       3         ││
│  │                 │ │                 ││
│  └─────────────────┘ └─────────────────┘│
│                                         │
│  ┌─────────────────┐ ┌─────────────────┐│
│  │ ACTIVITY AREA   │ │   DISCHARGED    ││
│  │                 │ │    PATIENTS     ││
│  │       5         │ │       8         ││
│  │                 │ │                 ││
│  └─────────────────┘ └─────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

### 2.2 Data Loading Sequence

Triggered on `ionViewWillEnter()` (fires every time the page becomes visible, not just on first load).

```
ionViewWillEnter()
│
├── 1. Load DOCTOR_PROFILE from SecureStorage
│       Key: "DOCTOR_PROFILE"
│       Returns: { login, acsUserId, name, department, ... }
│
├── 2. GET inpatient count
│       Endpoint: GET {DOMAIN}api/my-patient-list
│       Headers: { Authorization: Bearer <token> }
│       Body/Params: { acsUserId: <doctor's ACS user ID> }
│       Response: Patient[] array
│       Count: response.length → displayed on Inpatients card
│
├── 3. GET appointment count (VC API)
│       Endpoint: GET {DOMAIN}api/vc-appointments/count
│       Response: { count: number }
│       Displayed on Appointments card
│
├── 4. GET activity area count
│       Endpoint: GET {DOMAIN}api/activity-area/count
│       Response: { count: number }
│       Displayed on Activity Area card
│
└── 5. GET discharged patient count
        Endpoint: GET {DOMAIN}api/discharged-patients/count
        Response: { count: number }
        Displayed on Discharged Patients card
```

**Implementation notes:**

- All four API calls should fire in **parallel** (use `forkJoin` or `Promise.all`). Do not chain them sequentially.
- If any single call fails, show `--` on that card instead of a number. Do not block the other cards.
- Show a loading spinner overlay while data is loading. Remove it once all calls resolve or reject.
- The doctor profile from SecureStorage is needed before any API call, so that is step 1 and the API calls are steps 2-5 in parallel.

### 2.3 Navigation

| UI Element | Action | Route |
|---|---|---|
| Inpatients card | Tap | `/home` |
| Appointments card | Tap | `/home-vc` |
| Activity Area card | Tap | `/activity-area` |
| Discharged Patients card | Tap | `/discharged-patients` |
| Settings gear icon (header) | Tap | `/settings` |
| Notification bell (header) | Tap | `/notification-preferences` |
| Hardware back button | Press | Show confirmation dialog → Logout |

**Back button behavior (critical):**

```typescript
// In landing.page.ts constructor or ionViewDidEnter
this.platform.backButton.subscribeWithPriority(10, async () => {
  const alert = await this.alertController.create({
    header: 'Confirm Logout',
    message: 'Are you sure you want to logout?',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Logout', handler: () => this.authService.logout() }
    ]
  });
  await alert.present();
});
```

The back button from the landing page must **never** navigate back to the login page (that would expose the login screen without actually logging out). It must either do nothing or prompt for logout.

---

## 3. Inpatient List (Home Screen)

### 3.1 Screen Mockup (ASCII)

```
┌──────────────────────────────────────────────┐
│  [<]   Inpatients (12)        [filter] [+]   │
├──────────────────────────────────────────────┤
│  [🔍 Search patient name or MRN...        ]  │
├──────────────────────────────────────────────┤
│  ┌────────────────────────────────────────┐   │
│  │ PIN  Ravi Kumar              2 unread  │   │
│  │      M/45Y/72kg    Dr. Sharma (PC)     │   │
│  │      ICU-B12       MRN: 2024001        │   │
│  │      [MFD] [MLC]   Risk: ███░░ 60%    │   │
│  │      C H K         Last msg: 2m ago    │   │
│  │      Labels: [Post-Op] [Critical]      │   │
│  └────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────┐   │
│  │      Priya Reddy              1 unread │   │
│  │      F/32Y/58kg    Dr. Patel (PC)      │   │
│  │      WARD3-A5      MRN: 2024002        │   │
│  │                     Risk: █░░░░ 15%    │   │
│  │      H D           Last msg: 15m ago   │   │
│  └────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────┐   │
│  │      ... more patients ...             │   │
│  └────────────────────────────────────────┘   │
│                                              │
│  ── Pull down to refresh ──                  │
└──────────────────────────────────────────────┘
```

### 3.2 Patient Card Layout (Detail)

Each card is a single `ion-item` or custom component rendering one patient. Here is every field and where it comes from:

```
┌──────────────────────────────────────────────────────┐
│ [Pin Icon]  PATIENT NAME (bold, 16px)    [Unread: 3] │
│             Gender/Age/Weight             PC: Dr.Name│
│             Ward-Bed (location)           MRN: 123456│
│ [MFD][MLC][VisitType]  Risk: ████░░░ 62%            │
│ Comorbidities: C H K L     Handover: REQUESTED      │
│ Labels: [Tag1] [Tag2]       Last msg: 5m ago         │
└──────────────────────────────────────────────────────┘
```

**Field-by-field specification:**

| Field | Source Column (SQLite) | Display Rules |
|---|---|---|
| Patient Name | `patient_name` | Bold, truncate with ellipsis at 25 chars |
| Gender/Age/Weight | `gender`, `age`, `weight` | Format: `M/45Y/72kg`. If weight is null, omit. |
| Primary Consultant | `primary_consultant` | Prefix with "PC:" or show short name |
| Location | `ward_name`, `bed_code` | Format: `WARD-BED` e.g., `ICU-B12` |
| MRN | `mrn` | Always visible |
| Unread count | `unread_msg_count` | Show badge only if > 0. Red circle with white number. |
| Risk score | `risk_score` | 0-100 integer. Color: green (0-30), yellow (31-70), red (71-100). Show as progress bar + percentage. |
| MFD badge | `mfd_flag` | Show blue badge "MFD" if flag = 1 |
| MLC badge | `mlc_flag` | Show red badge "MLC" if flag = 1 |
| Visit Type | `visit_type` | Show as grey badge |
| Labels | `labels` (JSON array) | Render as chip/tags. Max 3 visible, "+N more" if > 3. |
| Comorbidity codes | `comorbidity_codes` | Single-letter badges: **C**ardiac, **H**ypertension, **K**idney, **L**iver, **T**B, **P**ulmonary, **D**iabetes, **S**troke. Each is a small colored circle with the letter. |
| Pin indicator | `pin_flag` | Show pin icon (filled) at top-left if pinned |
| Last message time | `last_msg_time` | Relative time: "2m ago", "1h ago", "Yesterday". Use a pipe or utility function. |
| Handover status | `handover_status` | Badge: "REQUESTED" (orange), "ACCEPTED" (green), "REJECTED" (red). Hide if null. |

### 3.3 Sorting Logic

Patient list is loaded from SQLite with this ORDER BY:

```sql
SELECT * FROM patient_info
WHERE doctor_login = ?
ORDER BY
    pin_flag DESC,        -- Pinned patients first (1 before 0)
    pin_order ASC,        -- Among pinned: by their pin sequence (1, 2, 3...)
    ward_sort ASC,        -- Then by ward sort priority
    last_msg_time DESC    -- Then by most recent message (newest first)
```

**What this means visually:**

```
── PINNED SECTION ──────────────
  Pin #1: Patient A  (pinned first)
  Pin #2: Patient B  (pinned second)

── UNPINNED SECTION ─────────────
  ICU patients (ward_sort = 1)
    Patient C (last msg: 2 min ago)
    Patient D (last msg: 1 hour ago)
  General Ward patients (ward_sort = 2)
    Patient E (last msg: 5 min ago)
    Patient F (last msg: 3 hours ago)
```

### 3.4 Real-time Updates

The app maintains a persistent WebSocket connection via ACS (Azure Communication Services).

```
ACS WebSocket
│
├── Incoming message
│   └── ChatService.onMessageReceived(message)
│       │
│       ├── Check message.metadata.context
│       │
│       ├── If context == "CHAT_MESSAGE"
│       │   ├── Find patient in local list by threadId
│       │   ├── Increment unread_msg_count in SQLite
│       │   ├── Update last_msg_time in SQLite
│       │   └── Emit updated list via patientInfoService.patientInfoList$.next()
│       │
│       ├── If context == "PATIENT_INFO"
│       │   ├── Parse patient demographics from message
│       │   ├── Update patient_info row in SQLite
│       │   └── Emit updated list
│       │
│       ├── If context == "CARE_TEAM"
│       │   ├── Update care team info in SQLite
│       │   └── Emit updated list
│       │
│       └── If context == "LOGOUT_MESSAGE"
│           └── Force logout: clear storage, navigate to login
│
└── Connection lost
    ├── Show "Reconnecting..." banner
    └── Auto-reconnect with exponential backoff
```

**UI subscription (in home.page.ts):**

```typescript
// In ngOnInit or ionViewWillEnter
this.patientInfoService.patientInfoList$.subscribe(patients => {
  this.patientList = patients;
  // Re-apply current filters and search
  this.applyFiltersAndSearch();
});
```

The `patientInfoList$` is a `BehaviorSubject<PatientInfo[]>`. Every time it emits, the UI re-renders the list. This is the single source of truth for the patient list display.

---

## 4. Filtering System

### 4.1 The 9 Filter Dimensions

The filter panel slides in from the right (or shows as a modal). It has 9 independent filter groups:

| # | Filter Name | Column(s) in SQLite | Example Values |
|---|---|---|---|
| 1 | Unit | `unit` | "CARDIOLOGY", "GENERAL MEDICINE", "ORTHOPEDICS" |
| 2 | P.Consultant | `primary_consultant` | "Dr. Sharma", "Dr. Patel" |
| 3 | Visit Type | `visit_type` | "EMERGENCY", "ELECTIVE", "DAYCARE" |
| 4 | Ward | `ward_name` | "ICU", "WARD-3", "NICU" |
| 5 | Location | `bed_code` | "ICU-B12", "W3-A5" |
| 6 | MLC/MFD | `mlc_flag`, `mfd_flag` | "MLC", "MFD" |
| 7 | A.Consultant | `attending_consultant` | "Dr. Rao", "Dr. Singh" |
| 8 | Discharge Intimation | `discharge_intimation` | "INTIMATED", "NOT_INTIMATED" |
| 9 | Dead/Absconded | `ip_activity_action` | "MARK_DEAD", "ABSCONDED" (from IPActivityAction enum) |

### 4.2 Filter Values Loading

When the filter panel opens, load available values for each filter from the **local SQLite database**:

```sql
-- For each filter dimension, get distinct values
SELECT DISTINCT unit FROM patient_info WHERE doctor_login = ?;
SELECT DISTINCT primary_consultant FROM patient_info WHERE doctor_login = ?;
SELECT DISTINCT visit_type FROM patient_info WHERE doctor_login = ?;
-- ... and so on for all 9 filters
```

This means filters only show values that exist in the doctor's current patient list. If no patient has `mlc_flag = 1`, the MLC option will not appear.

### 4.3 Selection Logic: AND/OR

```
WITHIN a single filter group → OR logic
ACROSS different filter groups → AND logic
```

**Example:** Doctor selects:
- Ward: "ICU" OR "NICU"
- P.Consultant: "Dr. Sharma"

Resulting SQL:

```sql
SELECT * FROM patient_info
WHERE doctor_login = ?
  AND (ward_name = 'ICU' OR ward_name = 'NICU')
  AND (primary_consultant = 'Dr. Sharma')
ORDER BY pin_flag DESC, pin_order ASC, ward_sort ASC, last_msg_time DESC
```

### 4.4 Dynamic WHERE Clause Builder

`patientInfoService.getPatientInfoBasedOnFilterData()` builds the query:

```typescript
buildFilterQuery(filters: FilterSelection): string {
  let whereClauses: string[] = ['doctor_login = ?'];
  let params: any[] = [this.doctorLogin];

  // For each filter dimension that has selections
  for (const [filterKey, selectedValues] of Object.entries(filters)) {
    if (selectedValues.length === 0) continue;

    const column = FILTER_COLUMN_MAP[filterKey]; // maps filter name to SQL column
    const placeholders = selectedValues.map(() => '?').join(', ');
    whereClauses.push(`${column} IN (${placeholders})`);
    params.push(...selectedValues);
  }

  const whereStr = whereClauses.join(' AND ');
  const query = `SELECT * FROM patient_info WHERE ${whereStr}
                 ORDER BY pin_flag DESC, pin_order ASC, ward_sort ASC, last_msg_time DESC`;

  return { query, params };
}
```

**Special case: MLC/MFD filter.** This maps to two separate boolean columns, not one. If user selects "MLC", add `mlc_flag = 1`. If "MFD", add `mfd_flag = 1`. If both, `(mlc_flag = 1 OR mfd_flag = 1)`.

### 4.5 Filter + Search Combination

When both filters and search text are active:

```
1. Apply filter SQL query → filtered patient list
2. Apply text search on filtered results → final display list
```

Search is done in-memory on the already-filtered list (or as an additional WHERE clause):

```sql
AND (patient_name LIKE '%searchText%' OR mrn LIKE '%searchText%')
```

Case-insensitive: use `LOWER()` or `COLLATE NOCASE`.

### 4.6 Filter Persistence

- Filter selections persist **in memory only** during the current session.
- Stored in a service-level variable (not in SQLite, not in SecureStorage).
- When the app is killed or the user logs out, filters reset.
- When navigating away from home and back, filters remain applied.

### 4.7 Filter UI Mockup

```
┌──────────────────────────────────────┐
│  Filters                     [Reset] │
├──────────────────────────────────────┤
│                                      │
│  Unit                          [v]   │
│  ┌──────────────────────────────┐    │
│  │ [x] CARDIOLOGY              │    │
│  │ [ ] GENERAL MEDICINE        │    │
│  │ [ ] ORTHOPEDICS             │    │
│  └──────────────────────────────┘    │
│                                      │
│  P.Consultant                  [v]   │
│  ┌──────────────────────────────┐    │
│  │ [x] Dr. Sharma              │    │
│  │ [x] Dr. Patel               │    │
│  └──────────────────────────────┘    │
│                                      │
│  Ward                          [>]   │
│  Visit Type                    [>]   │
│  Location                      [>]   │
│  MLC/MFD                       [>]   │
│  A.Consultant                  [>]   │
│  Discharge Intimation          [>]   │
│  Dead/Absconded                [>]   │
│                                      │
│        [Apply Filters]               │
└──────────────────────────────────────┘
```

---

## 5. Add Patient Flow

### 5.1 Flow Diagram

```
Tap [+] button on Home screen
│
└── Modal opens with two tabs:
    │
    ├── Tab 1: TEXT SEARCH
    │   │
    │   ├── User types patient name or MRN (min 3 chars)
    │   │
    │   ├── API call (debounced 300ms):
    │   │   GET {DOMAIN}api/athma/_search/athma-records-with-token
    │   │       ?code=IPL_003
    │   │       &queryString={searchText}
    │   │
    │   ├── Display results as swipeable cards
    │   │
    │   └── User swipes card to add (see 5.3)
    │
    └── Tab 2: QR/BARCODE SCAN
        │
        ├── Camera opens with barcode overlay
        │   Uses: @capacitor-mlkit/barcode-scanning
        │
        ├── Scans MRN barcode from patient wristband
        │
        ├── API call with scanned MRN:
        │   GET {DOMAIN}api/athma/_search/athma-records-with-token
        │       ?code=IPL_003
        │       &queryString={scannedMRN}
        │
        ├── If exactly 1 result → show swipeable card
        │
        └── If 0 results → toast "Patient not found"
```

### 5.2 Search Results Card

```
┌───────────────────────────────────────────────────────────┐
│  ←←← SWIPE TO ADD →→→                                    │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Ravi Kumar                                         │  │
│  │  M/45Y    MRN: 2024001                              │  │
│  │  Ward: ICU    Bed: B12                              │  │
│  │  Admitted: 2024-01-15                               │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

### 5.3 Swipe-to-Add Gesture (Implementation Detail)

This is a custom gesture, not a standard Ionic swipe. Build it using Hammer.js or Ionic Gesture API.

```
Swipe Progress:
  0%  ─────── 30% ──────── 60% ──────── 100%
  [Idle]      [Swipe      [Confirmed!]  [Submit]
               to add]

Visual feedback:
  0-29%:   Card stays in place, slight resistance
  30-59%:  Background turns light green, text "Swipe to add" appears
  60-99%:  Background turns green, text changes to "Confirmed!"
  100%:    Card slides off screen, API call fires
```

**Gesture implementation pseudocode:**

```typescript
const gesture = this.gestureCtrl.create({
  el: cardElement,
  gestureName: 'swipe-to-add',
  direction: 'x',
  onMove: (detail) => {
    const percent = (detail.deltaX / cardWidth) * 100;
    if (percent >= 30 && percent < 60) {
      this.swipeText = 'Swipe to add';
      this.bgColor = 'light-green';
    } else if (percent >= 60) {
      this.swipeText = 'Confirmed!';
      this.bgColor = 'green';
    }
    // Move card with finger
    cardElement.style.transform = `translateX(${detail.deltaX}px)`;
  },
  onEnd: (detail) => {
    const percent = (detail.deltaX / cardWidth) * 100;
    if (percent >= 100) {
      this.addPatient(patient);
    } else {
      // Snap back to original position
      cardElement.style.transform = 'translateX(0)';
    }
  }
});
gesture.enable(true);
```

### 5.4 Add Patient API Call

```
POST {DOMAIN}api/dm-user-list/{login}/patient/{mrn}/add
Headers: { Authorization: Bearer <token> }
Body: {} (empty or minimal)

Success Response: 200 OK
  {
    "status": "SUCCESS",
    "patientInfo": { ... full patient object ... }
  }

Error Responses:
  409: Patient already in your list
  404: Patient not found
  500: Server error
```

### 5.5 Post-Add Sequence

```
API returns success
│
├── 1. Insert patient into local SQLite patient_info table
│
├── 2. Start background message download for this patient
│   └── PatientInfoService.getPastMsgForPatientInfoFromServer(mrn)
│       ├── GET all historical messages for this patient's chat thread
│       ├── Store each message in SQLite messages table
│       └── Show progress bar in modal
│
├── 3. Emit updated list via patientInfoList$.next()
│
├── 4. Close the add-patient modal
│
└── 5. Patient appears in the list (position determined by sort order)
```

---

## 6. Handover Flow

### 6.1 What is Handover?

When a doctor needs another doctor to take over a patient's care (e.g., shift change, going on leave), they initiate a handover request.

### 6.2 Flow

```
Home screen → Long press patient card (or tap handover icon)
│
└── Handover Modal opens
    │
    ├── Target Doctor Search
    │   ├── Text input: search doctor name
    │   ├── API: GET {DOMAIN}api/doctors/search?name={searchText}
    │   └── Select target doctor from results
    │
    ├── Remarks (optional text field)
    │
    └── Submit
        │
        ├── API: POST {DOMAIN}api/handover/request
        │   Body: {
        │     patientMrn: "2024001",
        │     fromDoctor: "current_login",
        │     toDoctor: "target_login",
        │     remarks: "Going on leave"
        │   }
        │
        └── Response: 200 OK
            │
            ├── Update handover_status in SQLite → "REQUESTED"
            ├── Show orange "REQUESTED" badge on patient card
            └── Toast: "Handover request sent"
```

### 6.3 Handover State Machine

```
    ┌───────────┐
    │   NULL     │ (no handover)
    └─────┬─────┘
          │ Doctor initiates
          v
    ┌───────────┐
    │ REQUESTED │ (orange badge)
    └─────┬─────┘
          │ Target doctor responds
          ├──────────────────┐
          v                  v
    ┌───────────┐     ┌───────────┐
    │ ACCEPTED  │     │ REJECTED  │
    │ (green)   │     │ (red)     │
    └───────────┘     └───────────┘
          │
          v
    Patient removed from
    original doctor's list
    (or reassigned)
```

---

## 7. Pin/Unpin

### 7.1 User Interaction

```
Long press on patient card
│
└── Context menu / action sheet appears
    │
    ├── "Pin to top"     (if currently unpinned)
    │   ├── API: POST {DOMAIN}api/patient/{mrn}/pin
    │   │   Body: { pin_flag: 1, pin_order: <next_available> }
    │   ├── SQLite: UPDATE patient_info
    │   │   SET pin_flag = 1, pin_order = (SELECT MAX(pin_order) + 1)
    │   │   WHERE mrn = ?
    │   └── Patient moves to top section of list
    │
    └── "Unpin"          (if currently pinned)
        ├── API: POST {DOMAIN}api/patient/{mrn}/pin
        │   Body: { pin_flag: 0, pin_order: null }
        ├── SQLite: UPDATE patient_info
        │   SET pin_flag = 0, pin_order = NULL
        │   WHERE mrn = ?
        ├── Re-sequence remaining pinned patients:
        │   UPDATE patient_info SET pin_order = <new_sequence>
        │   WHERE pin_flag = 1 ORDER BY pin_order ASC
        └── Patient moves to normal sort position
```

### 7.2 Pin Order Management

Pin order is a sequential integer (1, 2, 3, ...). When a patient is unpinned, remaining pins must be re-sequenced to avoid gaps.

```
Before unpin:
  Pin 1: Patient A
  Pin 2: Patient B  ← unpin this
  Pin 3: Patient C

After unpin:
  Pin 1: Patient A
  Pin 2: Patient C  ← re-sequenced from 3 to 2
  (Patient B now in normal section)
```

---

## 8. Message Download & Sync

### 8.1 Initial Load (App Start / Login)

```
Login success
│
└── Navigate to Landing
    │
    └── Navigate to Home (Inpatients)
        │
        └── ionViewWillEnter()
            │
            ├── 1. Load patient list from SQLite (instant, offline-capable)
            │   └── Display patient cards immediately
            │
            ├── 2. Sync patient list from server (background)
            │   GET {DOMAIN}api/my-patient-list
            │   ├── New patients found → insert into SQLite
            │   ├── Removed patients → delete from SQLite
            │   └── Updated info → update SQLite rows
            │
            └── 3. Download messages for all patients (background)
                │
                └── For each patient in list:
                    │
                    ├── GET historical messages from ACS
                    ├── Store in SQLite messages table
                    └── Update unread_msg_count

                Progress Modal:
                ┌────────────────────────────────┐
                │  Downloading messages...       │
                │  ████████░░░░░░  8/12 patients │
                │                                │
                │  [Cancel]                      │
                └────────────────────────────────┘
```

### 8.2 `getPastMsgForPatientInfoFromServer()` Detail

```typescript
async getPastMsgForPatientInfoFromServer(mrn: string): Promise<void> {
  // 1. Get the ACS chat thread ID for this patient
  const threadId = await this.getThreadIdForPatient(mrn);

  // 2. Fetch messages from ACS
  //    ACS SDK: chatThreadClient.listMessages()
  //    Returns paginated messages (newest first)
  const messages = await this.chatThreadClient.listMessages({ maxPageSize: 200 });

  // 3. For each message:
  for (const msg of messages) {
    // Check if already exists in SQLite (by message ID)
    const exists = await this.messageExists(msg.id);
    if (!exists) {
      await this.insertMessage({
        message_id: msg.id,
        thread_id: threadId,
        mrn: mrn,
        sender_id: msg.sender.communicationUserId,
        sender_name: msg.senderDisplayName,
        content: msg.content.message,
        timestamp: msg.createdOn,
        type: msg.type, // 'text', 'html', 'topicUpdated', etc.
        metadata: JSON.stringify(msg.metadata),
        read_status: 0 // unread
      });
    }
  }

  // 4. Update unread count for this patient
  const unreadCount = await this.getUnreadCount(mrn);
  await this.updatePatientUnreadCount(mrn, unreadCount);
}
```

### 8.3 Pull-to-Refresh

```
User pulls down on patient list
│
├── ion-refresher triggers
│
├── 1. GET {DOMAIN}api/my-patient-list
│   Body: { acsUserId: <doctor's ACS user ID> }
│
├── 2. Diff server list vs local SQLite:
│   ├── New patients (in server, not in local) → INSERT into SQLite
│   ├── Removed patients (in local, not in server) → DELETE from SQLite
│   └── Existing patients → UPDATE any changed fields
│
├── 3. Emit updated patientInfoList$
│
├── 4. Dismiss refresher
│
└── 5. For newly added patients → start background message download
```

### 8.4 Offline Behavior

```
┌─────────────────────────────────────────────────────────┐
│ ONLINE                              │ OFFLINE           │
├─────────────────────────────────────┼───────────────────┤
│ Patient list from server + SQLite   │ SQLite only       │
│ Real-time message updates           │ No new messages   │
│ Send messages immediately           │ Queue as NOT_SENT │
│ Add patient works                   │ Add patient fails │
│ Filters work                        │ Filters work      │
│ Search works                        │ Search works      │
│ Pin/unpin syncs to server           │ Pin/unpin local   │
└─────────────────────────────────────┴───────────────────┘

On network restore:
  1. Sync pending messages (status = NOT_SENT) → send to server
  2. Refresh patient list from server
  3. Download any missed messages
  4. Update unread counts
```

**Network status indicator (optional, controlled by `SHOW_NETWORK_STATUS` feature flag):**

```
┌──────────────────────────────────────┐
│ ⚠ No internet connection            │  ← Red banner at top
├──────────────────────────────────────┤
│  ... patient list ...               │
```

---

## 9. Complete API Reference

| # | Method | Endpoint | Purpose | Request | Response |
|---|---|---|---|---|---|
| 1 | GET | `{DOMAIN}api/my-patient-list` | Get doctor's patient list | `{ acsUserId }` | `PatientInfo[]` |
| 2 | GET | `{DOMAIN}api/vc-appointments/count` | VC appointment count | `{ doctorLogin }` | `{ count }` |
| 3 | GET | `{DOMAIN}api/activity-area/count` | Pending task count | `{ doctorLogin }` | `{ count }` |
| 4 | GET | `{DOMAIN}api/discharged-patients/count` | Discharged patient count | `{ doctorLogin }` | `{ count }` |
| 5 | GET | `{DOMAIN}api/athma/_search/athma-records-with-token?code=IPL_003&queryString={q}` | Search patients (add flow) | query param | `PatientSearchResult[]` |
| 6 | POST | `{DOMAIN}api/dm-user-list/{login}/patient/{mrn}/add` | Add patient to doctor's list | `{}` | `{ status, patientInfo }` |
| 7 | POST | `{DOMAIN}api/handover/request` | Request patient handover | `{ patientMrn, fromDoctor, toDoctor, remarks }` | `{ status }` |
| 8 | POST | `{DOMAIN}api/patient/{mrn}/pin` | Pin/unpin patient | `{ pin_flag, pin_order }` | `{ status }` |
| 9 | GET | `{DOMAIN}api/doctors/search?name={q}` | Search doctors (handover) | query param | `Doctor[]` |

**Common headers for all API calls:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-App-Version: <app_version>
```

---

## 10. SQLite Schema

### 10.1 `patient_info` Table

```sql
CREATE TABLE IF NOT EXISTS patient_info (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    mrn                   TEXT NOT NULL UNIQUE,
    patient_name          TEXT NOT NULL,
    gender                TEXT,              -- 'M', 'F', 'O'
    age                   TEXT,              -- '45Y', '2M' (years or months)
    weight                TEXT,              -- '72kg'
    primary_consultant    TEXT,
    attending_consultant  TEXT,
    ward_name             TEXT,
    bed_code              TEXT,
    unit                  TEXT,
    visit_type            TEXT,
    risk_score            INTEGER DEFAULT 0, -- 0-100
    mfd_flag              INTEGER DEFAULT 0, -- 0 or 1
    mlc_flag              INTEGER DEFAULT 0, -- 0 or 1
    labels                TEXT,              -- JSON array: '["Post-Op","Critical"]'
    comorbidity_codes     TEXT,              -- Comma-separated: 'C,H,K'
    pin_flag              INTEGER DEFAULT 0, -- 0 or 1
    pin_order             INTEGER,           -- Sequential: 1, 2, 3...
    ward_sort             INTEGER DEFAULT 0, -- Ward display priority
    unread_msg_count      INTEGER DEFAULT 0,
    last_msg_time         TEXT,              -- ISO 8601 timestamp
    thread_id             TEXT,              -- ACS chat thread ID
    doctor_login          TEXT NOT NULL,      -- FK to logged-in doctor
    handover_status       TEXT,              -- NULL, 'REQUESTED', 'ACCEPTED', 'REJECTED'
    discharge_intimation  TEXT,              -- 'INTIMATED', 'NOT_INTIMATED', NULL
    ip_activity_action    TEXT,              -- 'MARK_DEAD', 'ABSCONDED', NULL
    created_at            TEXT DEFAULT (datetime('now')),
    updated_at            TEXT DEFAULT (datetime('now'))
);
```

### 10.2 Indexes (Critical for Performance)

```sql
-- Primary lookup: doctor's patient list sorted correctly
CREATE INDEX idx_patient_doctor_sort
ON patient_info (doctor_login, pin_flag DESC, pin_order ASC, ward_sort ASC, last_msg_time DESC);

-- Search by MRN (used in add patient, barcode scan)
CREATE UNIQUE INDEX idx_patient_mrn ON patient_info (mrn);

-- Search by name (used in text search)
CREATE INDEX idx_patient_name ON patient_info (patient_name COLLATE NOCASE);

-- Filter queries
CREATE INDEX idx_patient_unit ON patient_info (doctor_login, unit);
CREATE INDEX idx_patient_ward ON patient_info (doctor_login, ward_name);
CREATE INDEX idx_patient_pc ON patient_info (doctor_login, primary_consultant);
```

### 10.3 `messages` Table (Referenced for Unread Counts)

```sql
CREATE TABLE IF NOT EXISTS messages (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id      TEXT NOT NULL UNIQUE,  -- ACS message ID
    thread_id       TEXT NOT NULL,
    mrn             TEXT NOT NULL,
    sender_id       TEXT,
    sender_name     TEXT,
    content         TEXT,
    timestamp       TEXT NOT NULL,         -- ISO 8601
    type            TEXT,                  -- 'text', 'html', etc.
    metadata        TEXT,                  -- JSON string
    read_status     INTEGER DEFAULT 0,     -- 0=unread, 1=read
    send_status     TEXT DEFAULT 'SENT',   -- 'SENT', 'NOT_SENT', 'FAILED'
    created_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_messages_thread ON messages (thread_id, timestamp DESC);
CREATE INDEX idx_messages_mrn ON messages (mrn, read_status);
```

---

## 11. Error Handling Matrix

| Scenario | Detection | User Feedback | Recovery |
|---|---|---|---|
| Network failure on patient add | HTTP error / timeout | Toast: "Failed to add patient. Check your connection." | User retries manually |
| Barcode scan failure | MLKit scan error | Toast: "Unable to scan. Please try again or search manually." | Offer text search tab |
| Patient already in list | HTTP 409 from add API | Toast: "Patient already in your list" | Dismiss modal, no action needed |
| Patient MRN scanned but not found | Search API returns empty array | Toast: "Patient not found" | User tries different scan / manual entry |
| Message download failure | HTTP error during download | Show retry button in progress modal | Tap retry → re-attempt download |
| Server timeout (any API) | HTTP timeout (30s default) | Toast: "Server not responding. Please try again." | User retries; app works offline with cached data |
| ACS WebSocket disconnect | Connection event handler | Banner: "Reconnecting..." | Auto-reconnect with exponential backoff (1s, 2s, 4s, 8s, max 30s) |
| SQLite write failure | SQLite error callback | Silent log to crash analytics | Retry once; if still fails, log and continue |
| SecureStorage read failure | Storage error | Force logout → navigate to login | User logs in again, storage re-initialized |
| Token expired | HTTP 401 | Silent refresh attempt; if fails, navigate to login | Refresh token flow; fallback: re-login |

---

## 12. Edge Cases

| # | Edge Case | Expected Behavior |
|---|---|---|
| 1 | Patient discharged while doctor is viewing the list | Patient card shows discharge badge but remains in the list. Card does NOT disappear. Doctor can still tap into chat. |
| 2 | Another doctor adds the same patient | No conflict. Multiple doctors can have the same patient in their lists. Each doctor has independent unread counts and pin state. |
| 3 | Network drops during message download | Partial download is saved in SQLite. On reconnect, download resumes from where it left off (checks existing message IDs). |
| 4 | Patient MRN scanned but not found in hospital system | Toast "Patient not found". Camera stays open for another scan. |
| 5 | 100+ patients in list | No pagination. Entire list loaded from SQLite into memory. Performance is acceptable because SQLite read with proper indexes is <50ms for 100 rows. Use `trackBy: mrn` in `*ngFor` to minimize DOM updates. |
| 6 | Filter + search combined | Filters apply first (SQL WHERE), then text search filters within that result set. Both are reflected in the displayed count in the header: "Inpatients (5/12)" where 5 = filtered count, 12 = total. |
| 7 | Doctor logs in on a new device | Fresh SQLite database. Full sync: download patient list, then download all messages for all patients. Show full progress modal. |
| 8 | Two doctors simultaneously request handover for same patient | Server handles conflict. Second request gets error: "Handover already requested." |
| 9 | App killed during message download | On next app open, detect incomplete download (check last sync timestamp per patient). Resume download for incomplete patients. |
| 10 | Patient card tapped while messages are still downloading | Navigate to chat immediately. Show whatever messages are already in SQLite. Continue downloading remaining messages in background. New messages appear at the bottom as they are inserted. |

---

## 13. Implementation Checklist

Use this as a sprint-level task breakdown. Each checkbox is roughly 0.5-2 days of work for a junior developer.

### Phase 1: Landing Dashboard
- [ ] Create `LandingPage` component with Ionic page scaffold
- [ ] Implement `ionViewWillEnter()` lifecycle hook
- [ ] Read `DOCTOR_PROFILE` from SecureStorage
- [ ] Build 4 dashboard card components (reusable card component)
- [ ] Wire up parallel API calls (`forkJoin`) for all 4 counts
- [ ] Handle loading state (spinner) and error state (`--` fallback)
- [ ] Implement card tap navigation to 4 routes
- [ ] Implement hardware back button → logout confirmation dialog
- [ ] Add settings gear and notification bell icons with navigation
- [ ] Write unit tests for data loading and navigation

### Phase 2: Inpatient List — Basic Display
- [ ] Create `HomePage` component with Ionic page scaffold
- [ ] Define `PatientInfo` TypeScript interface (all fields from section 3.2)
- [ ] Create `PatientCardComponent` (standalone component for one patient)
- [ ] Implement patient card layout with all fields (name, age, location, risk, badges, etc.)
- [ ] Implement risk score color coding (green/yellow/red)
- [ ] Implement comorbidity code badges (C, H, K, L, T, P, D, S)
- [ ] Implement label chips display
- [ ] Implement relative time pipe for `last_msg_time`
- [ ] Implement unread count badge

### Phase 3: SQLite Integration
- [ ] Set up `@capacitor-community/sqlite` plugin
- [ ] Create `patient_info` table with schema from section 10.1
- [ ] Create `messages` table with schema from section 10.3
- [ ] Create all indexes from section 10.2
- [ ] Implement `PatientInfoService` with `BehaviorSubject<PatientInfo[]>`
- [ ] Implement `loadPatientListFromSQLite()` with correct ORDER BY
- [ ] Implement `insertPatient()`, `updatePatient()`, `deletePatient()`
- [ ] Implement `getUnreadCount(mrn)` query

### Phase 4: Sorting & Search
- [ ] Implement sort order: `pin_flag DESC, pin_order ASC, ward_sort ASC, last_msg_time DESC`
- [ ] Implement search bar with debounce (300ms)
- [ ] Implement case-insensitive search on `patient_name` and `mrn`
- [ ] Display result count in header: "Inpatients (5)" or "Inpatients (5/12)"

### Phase 5: Filtering System
- [ ] Create `FilterComponent` (slide-in panel or modal)
- [ ] Implement 9 filter dimension sections (accordion/expandable)
- [ ] Load filter values from SQLite (`SELECT DISTINCT ...`)
- [ ] Implement multi-select within each filter (checkbox list)
- [ ] Implement `buildFilterQuery()` — dynamic WHERE clause builder
- [ ] Implement AND/OR logic (OR within group, AND across groups)
- [ ] Handle MLC/MFD special case (two boolean columns)
- [ ] Implement "Reset" button to clear all filters
- [ ] Implement "Apply" button to execute filter query
- [ ] Store filter selections in service memory (session-only persistence)
- [ ] Combine filters with search text
- [ ] Write unit tests for query builder with various filter combinations

### Phase 6: Add Patient Flow
- [ ] Create `AddPatientModalComponent`
- [ ] Implement tab layout: Text Search / QR Scan
- [ ] Implement text search with debounced API call (300ms, min 3 chars)
- [ ] Display search results as cards
- [ ] Integrate `@capacitor-mlkit/barcode-scanning` for QR/barcode scan
- [ ] Handle scan result → API lookup
- [ ] Implement swipe-to-add gesture (Ionic Gesture API)
- [ ] Implement swipe visual feedback (30%, 60%, 100% thresholds)
- [ ] Wire up POST add patient API
- [ ] Handle success: insert into SQLite, trigger background message download
- [ ] Handle errors: already-in-list (409), not-found (404), network error

### Phase 7: Message Download & Sync
- [ ] Implement `getPastMsgForPatientInfoFromServer(mrn)`
- [ ] Implement progress modal ("Downloading messages... X/Y patients")
- [ ] Implement ACS chat thread message fetching (paginated)
- [ ] Store messages in SQLite with deduplication (by `message_id`)
- [ ] Implement pull-to-refresh (`ion-refresher`)
- [ ] Implement server-to-local diff sync (add/remove/update patients)
- [ ] Update unread counts after message download

### Phase 8: Real-time Updates
- [ ] Set up ACS WebSocket connection in `ChatService`
- [ ] Handle incoming `CHAT_MESSAGE` → update unread count + last_msg_time
- [ ] Handle incoming `PATIENT_INFO` → update patient demographics
- [ ] Handle incoming `CARE_TEAM` → update care team info
- [ ] Handle `LOGOUT_MESSAGE` → force logout
- [ ] Handle WebSocket disconnect → show banner, auto-reconnect
- [ ] Emit `patientInfoList$.next()` on every update to refresh UI

### Phase 9: Pin/Unpin & Handover
- [ ] Implement long press gesture on patient card
- [ ] Show action sheet: Pin/Unpin option
- [ ] Implement pin API call + SQLite update
- [ ] Implement pin_order re-sequencing on unpin
- [ ] Implement handover modal (doctor search + remarks)
- [ ] Implement handover request API call
- [ ] Display handover status badge on patient card

### Phase 10: Offline Support
- [ ] Detect network status changes (Capacitor Network plugin)
- [ ] Queue outgoing messages with `send_status = 'NOT_SENT'`
- [ ] On reconnect: flush message queue to server
- [ ] On reconnect: re-sync patient list and download missed messages
- [ ] Show/hide network status banner (controlled by `SHOW_NETWORK_STATUS` flag)

### Phase 11: Navigation & Integration
- [ ] Implement patient card tap → navigate to `/patient-chat/{mrn}`
- [ ] Pass patient MRN and patientInfo as route params
- [ ] Mark messages as read when entering patient chat
- [ ] Set up tab navigation (if using Ionic tabs)
- [ ] Implement route guards (auth guard on all routes)
- [ ] Implement lazy loading for all feature modules

### Phase 12: Error Handling & Polish
- [ ] Implement all error toasts from error handling matrix (section 11)
- [ ] Implement retry mechanisms where applicable
- [ ] Add crash analytics logging for silent failures
- [ ] Handle token expiry → refresh or re-login
- [ ] Test all edge cases from section 12
- [ ] Performance test with 100+ patients
- [ ] Add `trackBy` functions to all `*ngFor` loops
- [ ] UI polish: loading skeletons, empty states, smooth animations

---

## Appendix A: Key TypeScript Interfaces

```typescript
interface PatientInfo {
  mrn: string;
  patientName: string;
  gender: 'M' | 'F' | 'O';
  age: string;                    // "45Y" or "2M"
  weight: string | null;          // "72kg"
  primaryConsultant: string;
  attendingConsultant: string;
  wardName: string;
  bedCode: string;
  unit: string;
  visitType: string;
  riskScore: number;              // 0-100
  mfdFlag: boolean;
  mlcFlag: boolean;
  labels: string[];               // ["Post-Op", "Critical"]
  comorbidityCodes: string[];     // ["C", "H", "K"]
  pinFlag: boolean;
  pinOrder: number | null;
  wardSort: number;
  unreadMsgCount: number;
  lastMsgTime: string;            // ISO 8601
  threadId: string;               // ACS thread ID
  doctorLogin: string;
  handoverStatus: 'REQUESTED' | 'ACCEPTED' | 'REJECTED' | null;
  dischargeIntimation: 'INTIMATED' | 'NOT_INTIMATED' | null;
  ipActivityAction: 'MARK_DEAD' | 'ABSCONDED' | null;
}

enum IPActivityAction {
  MARK_DEAD = 'MARK_DEAD',
  ABSCONDED = 'ABSCONDED'
}

interface FilterSelection {
  unit: string[];
  primaryConsultant: string[];
  visitType: string[];
  wardName: string[];
  bedCode: string[];
  mlcMfd: string[];               // ["MLC", "MFD"]
  attendingConsultant: string[];
  dischargeIntimation: string[];
  ipActivityAction: string[];
}

interface DoctorProfile {
  login: string;
  acsUserId: string;
  name: string;
  department: string;
  designation: string;
  token: string;
}
```

## Appendix B: IPActivityAction Enum Values

From the decompiled source, the `IPActivityAction` enum includes at minimum:

| Value | Meaning | Filter Context |
|---|---|---|
| `MARK_DEAD` | Patient has been marked as deceased | Dead/Absconded filter |
| `ABSCONDED` | Patient left without authorization | Dead/Absconded filter |

These are used in filter dimension #9 and displayed as special status on patient cards.

## Appendix C: Comorbidity Code Reference

| Code | Meaning | Badge Color (suggested) |
|---|---|---|
| C | Cardiac | Red |
| H | Hypertension | Orange |
| K | Kidney disease | Purple |
| L | Liver disease | Brown |
| T | Tuberculosis | Dark Yellow |
| P | Pulmonary disease | Blue |
| D | Diabetes | Teal |
| S | Stroke | Dark Red |

---

*Document generated from decompiled source analysis. Last updated: 2026-04-22.*
