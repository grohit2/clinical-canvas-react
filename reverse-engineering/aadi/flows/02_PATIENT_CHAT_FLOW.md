# Flow 02: Patient Chat System

**App:** AADI (org.nh.app.aadi) v2.35.0
**Framework:** Ionic 7 / Capacitor 5 / Angular 17+
**Source files:** `patient-chat.page.ts` (~4200 lines), `patient-chat.page.html` (~1500 lines), `chat.service.ts` (~1282 lines), `patient-msg.service.ts` (~600 lines), `file-loader.worker.js` (Web Worker for uploads)

---

## 1. Overview

The Patient Chat screen is the single most complex screen in the AADI app. It serves as the unified communication hub for a specific patient, combining real-time text/media chat between care team members with structured clinical data cards (lab results, medication orders, discharge summaries, etc.). Every action taken on a patient -- from ordering an investigation to transferring beds -- flows through this screen as a message.

**Why it is complex:** The screen simultaneously manages 16 distinct message categories (each with unique rendering), real-time message delivery via Azure Communication Services (ACS), offline-first storage in SQLite, file uploads through a Web Worker, @mention autocompletion, swipe-to-reply gestures, message filtering, pagination, and audio recording.

### 1.1 Component Dependency Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                      patient-chat.page.ts                           │
│                        (~4200 lines)                                │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────────┐     │
│  │ Template    │  │ @mentions    │  │ Gesture handlers         │     │
│  │ (.html)     │  │ (ngx-        │  │ (Hammer.js panright)     │     │
│  │ ~1500 lines │  │  mentions)   │  │                          │     │
│  └──────┬──────┘  └──────┬───────┘  └────────────┬─────────────┘     │
│         │                │                       │                   │
└─────────┼────────────────┼───────────────────────┼───────────────────┘
          │                │                       │
  ┌───────▼────────┐ ┌────▼──────────┐ ┌──────────▼──────────┐
  │ chat.service   │ │ patient-msg   │ │ patientInfo.service  │
  │ (~1282 lines)  │ │ .service      │ │                      │
  │                │ │ (~600 lines)  │ │ - sendMessageHTTPS() │
  │ - ACS client   │ │               │ │ - patient state      │
  │ - WebSocket    │ │ - SQLite CRUD │ │ - demographics       │
  │ - token mgmt   │ │ - pagination  │ │                      │
  └───────┬────────┘ │ - filtering   │ └──────────┬───────────┘
          │          └───────┬───────┘            │
          │                  │                    │
  ┌───────▼──────┐  ┌───────▼──────┐  ┌──────────▼──────────┐
  │ Azure Comm   │  │   SQLite     │  │  REST API (Spring   │
  │ Services     │  │   Database   │  │  Boot backend)      │
  │ (WebSocket)  │  │              │  │                     │
  └──────────────┘  └──────────────┘  └─────────────────────┘
                                              │
                                      ┌───────▼──────────┐
                                      │ file-loader      │
                                      │ .worker.js       │
                                      │ (Web Worker)     │
                                      │ - FormData POST  │
                                      │ - Checksum retry │
                                      └──────────────────┘
```

### 1.2 Tech Stack for This Screen

| Layer | Technology | Purpose |
|---|---|---|
| Real-time messaging | Azure Communication Services (ACS) | WebSocket-based message delivery |
| Local storage | SQLite (`@capacitor-community/sqlite`) | Offline-first message store |
| File uploads | Web Worker (`file-loader.worker.js`) | Non-blocking file upload to server |
| @Mentions | `ngx-mentions` library | Care team member autocomplete |
| Gestures | Hammer.js (via Ionic) | Swipe-to-reply on messages |
| Audio recording | `@nicemash/capacitor-voice-recorder` | In-app voice message capture |
| Image editing | Custom `ImageEditingModalPage` | Crop, rotate, multi-select |
| Video playback | Custom `VideoPlayer` component | In-chat video viewing |
| Camera | Capacitor Camera API | Take photos directly |
| Filesystem | Capacitor Filesystem API | Local file storage for attachments |

---

## 2. Screen Layout

### 2.1 ASCII Mockup

```
┌─────────────────────────────────────────────────────┐
│  [<]  Mr. Ravi Kumar    M/45y/72kg     [sync] [grp] │  ← HEADER
│  C H K L . P . S   Risk: 4/10   PAD: Dr. Sharma     │  ← Comorbidities + Risk
│  Labels: [Ventilator] [Isolation]                    │  ← Dynamic labels
├─────────────────────────────────────────────────────┤
│  [★] [PRG] [LAB] [RAD] [INV] [Vitals] [More ▾]     │  ← FILTER BAR
├─────────────────────────────────────────────────────┤
│                                                      │
│           ─── Today ───                              │  ← Date separator
│                                                      │
│  ┌──────────────────────────────┐                    │
│  │ [LT] Lab Result              │                    │  ← Clinical card
│  │ CBC - Complete Blood Count   │                    │    (left-aligned,
│  │ Hb: 12.5 g/dL  [normal]     │                    │     colored avatar)
│  │ WBC: 15,200  [HIGH]         │                    │
│  │ [View Report]               │                    │
│  │              10:30 AM  ✓✓   │                    │
│  └──────────────────────────────┘                    │
│                                                      │
│                  ┌──────────────────────────────┐    │
│                  │ Good morning, please check   │    │  ← Own chat bubble
│                  │ the latest CBC results.      │    │    (right-aligned,
│                  │              10:32 AM  ✓✓    │    │     no avatar)
│                  └──────────────────────────────┘    │
│                                                      │
│  ┌──────────────────────────────┐                    │
│  │ Dr. Mehta (Cardiology)       │                    │  ← Others' chat bubble
│  │ Will review in the evening.  │                    │    (left-aligned)
│  │              10:35 AM        │                    │
│  └──────────────────────────────┘                    │
│                                                      │
│           ─── Yesterday ───                          │  ← Date separator
│                                                      │
│  ┌──────────────────────────────┐                    │
│  │ [AM] Admission Message       │                    │  ← Admission card
│  │ P.Consultant: Dr. Sharma     │                    │
│  │ Date: 20-Apr-2026            │                    │
│  │ Category: Elective           │                    │
│  │ Location: Ward 3, Bed 12    │                    │
│  │              09:15 AM       │                    │
│  └──────────────────────────────┘                    │
│                                                      │
│  ▲ scroll up to load older messages                  │
│                                                      │
├─────────────────────────────────────────────────────┤
│  [Reply preview: "Will review in the evening."]  [x] │  ← Reply bar (conditional)
├─────────────────────────────────────────────────────┤
│  [📎] [Type a message...  @Dr.Shah ]  [🎤] [▶ Send] │  ← INPUT AREA
│  [+]                                        [⤢]     │  ← Action + Expand
└─────────────────────────────────────────────────────┘
```

### 2.2 Header Breakdown

```
Patient Name:     patientInfo.patientName
Gender/Age/Weight: patientInfo.gender / patientInfo.age / patientInfo.weight
Comorbidities:    Single-letter badges: C=Cardiac, H=Hypertension, K=Kidney,
                  L=Liver, T=Thyroid, P=Pulmonary, D=Diabetes, S=Stroke
                  Each shown as a small colored circle. Dot (.) if absent.
Risk Score:       patientInfo.riskScore (0-10 scale)
PAD/PPD:          Primary Admitting Doctor / Primary Physician on Duty
Labels:           Dynamic array of tags (e.g., "Ventilator", "Isolation")
Sync Button:      Triggers full chat history re-download
Group Info Button: Shows care team members for this patient's ACS thread
```

### 2.3 Input Area Elements

| Element | Behavior |
|---|---|
| `[📎]` Attachment button | Opens ActionSheet: Camera, Photos, Video, Cancel |
| Text input | `<textarea>` with `ngx-mentions` directive. Expands vertically up to 4 lines. |
| `[🎤]` Microphone | Tap-and-hold to record. Shows recording timer. Release to send. Cancel to discard. |
| `[▶ Send]` button | Visible only when text input is non-empty. Calls `sendMessage()`. |
| `[+]` Action button | Opens ActionSheet with 19 navigation items (see Section 12). |
| `[⤢]` Expand button | Toggles fullscreen text editor for long messages. |
| Reply preview bar | Shown only when `replyMessage` is set. Shows parent message snippet. `[x]` to cancel. |

---

## 3. Message Data Model

### 3.1 PatientMessage Interface

This is the core data object stored in SQLite and exchanged over the wire.

```typescript
interface PatientMessage {
  // Identity
  id: number;                          // SQLite auto-increment PK
  messageId: string;                   // UUID, generated client-side before send
  acsMessageId: string;                // Azure Communication Services message ID (set after ACS delivery)
  actionId: string;                    // Server-assigned ID (set after HTTP POST succeeds)

  // Patient context
  patientInfoId: number;               // FK to PatientInfo (which patient this belongs to)
  mrn: string;                         // Medical Record Number (unique patient identifier)
  patientName: string;                 // Denormalized for display without JOIN

  // Message classification
  category: MessageCategory;           // One of 16 types (see enum below)
  subCategory: MessageSubCategory;     // AUDIO, TEXT, VIDEO, IMAGE, PDF, DOC, OTHERS
  contentType: ContentType;            // MIME-like type for rendering decisions

  // Payload
  content: any;                        // JSON string or plain text. Structure varies by category.

  // Sender
  senderLogin: string;                 // Username of sender (e.g., "dr.sharma")
  senderName: string;                  // Display name (e.g., "Dr. Sharma")

  // Timestamps
  sentTime: string;                    // ISO 8601, set by client, updated by server on success
  receivedTime: string;                // ISO 8601, set when message received via ACS

  // Status & flags
  messageStatus: MessageStatus;        // NOT_SENT → IN_PROGRESS → SUCCESS | FAILURE
  msgDeleted: boolean;                 // Soft delete flag
  msgStarred: string | null;           // Null = not starred. Non-null = starred (stores star metadata)
  read: boolean;                       // Whether current user has seen this message

  // Reply threading
  parentMessageId: string | null;      // messageId of the message being replied to
  parentMessageDTO: string | null;     // JSON-serialized copy of parent message (for preview rendering)
}
```

### 3.2 MessageCategory Enum (16 values)

```typescript
enum MessageCategory {
  CHAT                  = 'CHAT',                  // Free-text conversation
  LAB_RESULT            = 'LAB_RESULT',            // Laboratory test results
  RAD_RESULT            = 'RAD_RESULT',            // Radiology results (X-ray, ECG, MRI, etc.)
  DISCHARGE_SUMMARY     = 'DISCHARGE_SUMMARY',     // Discharge status updates
  INVESTIGATION_ORDER   = 'INVESTIGATION_ORDER',   // Doctor orders an investigation
  MEDICATION_ORDER      = 'MEDICATION_ORDER',       // Doctor orders medication
  ADMISSION_MESSAGE     = 'ADMISSION_MESSAGE',      // Patient admission notification
  PROGRESS_NOTES        = 'PROGRESS_NOTES',         // Clinical progress notes
  CROSS_CONSULTATION    = 'CROSS_CONSULTATION',     // Request for consultation from another dept
  SYSTEM_REMINDER       = 'SYSTEM_REMINDER',        // System-generated alert
  INVESTIGATION_REPORT  = 'INVESTIGATION_REPORT',   // Investigation report (different from order)
  BED_TRANSFER          = 'BED_TRANSFER',           // Patient moved between beds/wards
  KEY_VALUE_DATA        = 'KEY_VALUE_DATA',          // Vitals (BP, temp, SpO2, etc.)
  ASSESSMENT_FORM       = 'ASSESSMENT_FORM',         // Scored clinical assessment
  DISCHARGE_INTIMATION  = 'DISCHARGE_INTIMATION',   // Pre-discharge notification
  INITIAL_ASSESSMENT    = 'INITIAL_ASSESSMENT',      // Initial patient assessment
}
```

### 3.3 Supporting Enums

```typescript
enum MessageSubCategory {
  TEXT   = 'TEXT',
  AUDIO  = 'AUDIO',
  VIDEO  = 'VIDEO',
  IMAGE  = 'IMAGE',
  PDF    = 'PDF',
  DOC    = 'DOC',
  OTHERS = 'OTHERS',
}

enum MessageStatus {
  NOT_SENT    = 'NOT_SENT',     // Created locally, not yet sent
  IN_PROGRESS = 'IN_PROGRESS',  // Upload/send in progress
  SUCCESS     = 'SUCCESS',      // Confirmed delivered
  FAILURE     = 'FAILURE',      // Send failed permanently
}

enum MessageAction {
  SAVE                     = 'SAVE',
  DELETE                   = 'DELETE',
  PUBLISH                  = 'PUBLISH',
  PATIENT_INFO_ATTRIBUTE   = 'PATIENT_INFO_ATTRIBUTE',
  LOGOUT                   = 'LOGOUT',
}

enum MessageContext {
  PATIENT_INFO      = 'PATIENT_INFO',       // Patient demographic update
  PATIENT_MESSAGE   = 'PATIENT_MESSAGE',     // Normal chat/clinical message
  CARE_TEAM         = 'CARE_TEAM',           // Care team roster change
  DM_USER_INFO      = 'DM_USER_INFO',        // Direct message user info
  DIRECT_MESSAGE    = 'DIRECT_MESSAGE',       // Direct (non-patient) message
  LOGOUT_MESSAGE    = 'LOGOUT_MESSAGE',       // Force logout from another device
}
```

### 3.4 FileToUpload Interface

```typescript
interface FileToUpload {
  path: string;        // Local filesystem path (e.g., file:///data/.../photo.jpg)
  name: string;        // Display filename (e.g., "IMG_20260422_103045.jpg")
  base64Data: string;  // Base64-encoded file content (without data URI prefix)
}
```

### 3.5 SQLite Schema

```sql
CREATE TABLE IF NOT EXISTS patient_message (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_name        TEXT,
  patient_info_id     INTEGER NOT NULL,
  mrn                 TEXT NOT NULL,
  category            TEXT NOT NULL,         -- MessageCategory enum value
  sub_category        TEXT,                  -- MessageSubCategory enum value
  content_type        TEXT,
  content             TEXT,                  -- JSON string (structure varies by category)
  sender_login        TEXT NOT NULL,
  sender_name         TEXT,
  sent_time           TEXT NOT NULL,         -- ISO 8601 string
  action_id           TEXT,                  -- Server-assigned, NULL until server confirms
  msg_status          TEXT NOT NULL,         -- MessageStatus enum value
  msg_delete          INTEGER DEFAULT 0,     -- 0 = active, 1 = deleted
  acs_message_id      TEXT,                  -- Set after ACS delivery
  message_id          TEXT,                  -- Client-generated UUID
  parent_message_id   TEXT,                  -- For reply threading
  parent_message_dto  TEXT,                  -- JSON copy of parent message
  msg_starred         TEXT,                  -- NULL = not starred
  read                INTEGER DEFAULT 0,     -- 0 = unread, 1 = read
  received_time       TEXT                   -- ISO 8601 string
);

-- Key indexes (not explicitly in source, but necessary for performance)
CREATE INDEX idx_pm_patient_info_id ON patient_message(patient_info_id);
CREATE INDEX idx_pm_mrn ON patient_message(mrn);
CREATE INDEX idx_pm_action_id ON patient_message(action_id);
CREATE INDEX idx_pm_msg_status ON patient_message(msg_status);
CREATE INDEX idx_pm_sent_time ON patient_message(sent_time);
CREATE INDEX idx_pm_category ON patient_message(category);
```

**Key SQL queries used:**

```sql
-- 1. Paginated message load (newest first)
SELECT * FROM patient_message
WHERE patient_info_id = ?
ORDER BY sent_time DESC
LIMIT ? OFFSET ?;

-- 2. Filtered by category (e.g., LAB_RESULT + RAD_RESULT)
SELECT * FROM patient_message
WHERE patient_info_id = ?
  AND category IN ('LAB_RESULT', 'RAD_RESULT')
ORDER BY sent_time DESC
LIMIT ? OFFSET ?;

-- 3. Starred messages only
SELECT * FROM patient_message
WHERE patient_info_id = ?
  AND msg_starred IS NOT NULL
ORDER BY sent_time DESC
LIMIT ? OFFSET ?;

-- 4. Find by action_id (for dedup on receive)
SELECT * FROM patient_message
WHERE action_id = ? AND patient_info_id = ?;

-- 5. Find NOT_SENT messages older than 5 seconds (for retry queue)
SELECT * FROM patient_message
WHERE msg_status = 'NOT_SENT'
  AND sent_time < datetime('now', '-5 seconds');

-- 6. Update status to SUCCESS after send
UPDATE patient_message
SET msg_status = 'SUCCESS', sent_time = ?, action_id = ?, acs_message_id = ?
WHERE id = ?;

-- 7. Star/unstar a message
UPDATE patient_message
SET msg_starred = ?
WHERE id = ?;

-- 8. Mark as read
UPDATE patient_message
SET read = 1
WHERE patient_info_id = ? AND read = 0;
```

---

## 4. Message Rendering -- All 16 Categories

Every message in the chat is rendered through a single `*ngFor` loop over the paginated message array. A chain of `*ngIf` / `[ngSwitch]` directives selects the correct card template based on `message.category` and `message.subCategory`.

### 4.1 Rendering Decision Tree

```
message.msgDeleted?
  ├── YES → render DELETED card (strikethrough icon + "This message was deleted")
  └── NO
       │
       message.parentMessageId?
       ├── YES → render reply-chat-box (parent preview) ABOVE the message card
       └── NO  → (skip reply box)
       │
       message.category?
       ├── CHAT → check message.subCategory
       │   ├── TEXT  → text bubble (left for others, right for self)
       │   ├── IMAGE → image grid bubble
       │   ├── AUDIO → audio player bubble
       │   ├── VIDEO → video thumbnail bubble
       │   ├── PDF   → PDF attachment bubble
       │   └── DOC   → document attachment bubble
       │
       ├── LAB_RESULT           → Lab Result card
       ├── RAD_RESULT           → Radiology Result card
       ├── DISCHARGE_SUMMARY    → Discharge Summary card
       ├── INVESTIGATION_ORDER  → Investigation Order card
       ├── MEDICATION_ORDER     → Medication Order card
       ├── ADMISSION_MESSAGE    → Admission Message card
       ├── PROGRESS_NOTES       → Progress Notes card
       ├── CROSS_CONSULTATION   → Cross Consultation card
       ├── SYSTEM_REMINDER      → System Reminder card
       ├── INVESTIGATION_REPORT → Investigation Report card
       ├── BED_TRANSFER         → Bed Transfer card
       ├── KEY_VALUE_DATA       → Vitals card
       ├── ASSESSMENT_FORM      → Assessment Form card
       ├── DISCHARGE_INTIMATION → Discharge Intimation card
       └── INITIAL_ASSESSMENT   → Initial Assessment card
```

### 4.2 Card Design Reference Table

Each clinical message type (non-CHAT) renders as a card with a colored circular avatar containing 2-letter initials.

| # | Category | Avatar Text | Avatar Color | Key Content Fields |
|---|---|---|---|---|
| 1 | `CHAT` (TEXT) | None | N/A (bubble) | Plain text via `[innerHTML]`. Left=others, right=self. Sender name above for others. |
| 2 | `CHAT` (IMAGE) | None | N/A (bubble) | Thumbnail grid (max 8 images). Tap opens `ImageModalPage` with zoom/swipe. |
| 3 | `CHAT` (AUDIO) | None | N/A (bubble) | Audio icon. Tap to play/pause. Duration shown. |
| 4 | `CHAT` (VIDEO) | None | N/A (bubble) | Video thumbnail frame. Tap opens `VideoPlayer` component. |
| 5 | `ADMISSION_MESSAGE` | **AM** | `#78A715` (green) | P.Consultant, Admission Date, Admission Number, Category (Emergency/Elective), Reason, Tariff Plan, Location (Ward/Bed) |
| 6 | `INVESTIGATION_ORDER` | **IO** | `#9C8447` (gold) | List of investigation names. Priority flags shown as colored badges (STAT = red, Routine = gray). |
| 7 | `MEDICATION_ORDER` | **MO** | `#E56B6F` (pink) | Drug name (bold), Frequency (e.g., "TDS"), Dosage, Duration, Quantity. Multiple drugs stacked vertically. |
| 8 | `LAB_RESULT` | **LT** | Lab theme color | Investigation name (header), Date, Individual test results as rows: Parameter, Value, Unit, Normal Range. **Abnormal values** rendered in red/bold. `[View Report]` link opens PDF. |
| 9 | `RAD_RESULT` | **XR** or **ECG** | `#9951E1` (purple) | Study name, Date, Thumbnail images (tap to view full). AI Findings section with heat map overlay (if available). Avatar text varies: "XR" for X-ray, "ECG" for ECG, etc. |
| 10 | `DISCHARGE_SUMMARY` | **DS** | `#25A244` (green) | Status badge (color-coded: Approved=green, Pending=yellow, Draft=gray), Admitted On date, Location, Sent To. |
| 11 | `PROGRESS_NOTES` | **PN** | `#1E71ED` (blue) | Sender name + department, Notes text body. **Uncharted** (voided) notes shown with `text-decoration: line-through`. |
| 12 | `CROSS_CONSULTATION` | **CC** | `#EC9F05` (yellow) | Priority label (Urgent/Routine), Requesting doctor name, Consulting department. |
| 13 | `SYSTEM_REMINDER` | Alert icon | `#F43636` (red) | Alert label (bold), Reminder message body. No sender name (system-generated). |
| 14 | `BED_TRANSFER` | **TF** | `#D9B309` (yellow) | **From:** Ward X, Bed Y → **To:** Ward A, Bed B. Arrow between locations. |
| 15 | `KEY_VALUE_DATA` (Vitals) | **V** | `#3F5DAA` (blue) | Key-value pairs rendered as a mini table: BP: 120/80, Temp: 98.6F, SpO2: 97%, HR: 72. |
| 16 | `ASSESSMENT_FORM` | Dynamic (form initials) | `#086375` (teal) | Form name, Assessment date, Score with severity coloring (green=mild, yellow=moderate, red=severe). Avatar text is derived from the form name initials. |
| 17 | `INVESTIGATION_REPORT` | **IR** | `#662C9F` (purple) | Service name, Report date, `[View Report]` link opens PDF viewer. |
| 18 | `INITIAL_ASSESSMENT` | **IS** | `#48D0CA` (teal) | Updated By (name), Updated On (date/time). |
| 19 | `DISCHARGE_INTIMATION` | **DI** | `#69BEEB` (light blue) | Submitted By, Submitted On, Intimated By, Expected Discharge On. |

### 4.3 Common Card Structure (Template)

Every clinical card follows this structure:

```html
<!-- Clinical message card -->
<div class="message-card" [ngClass]="{'deleted': message.msgDeleted}">

  <!-- Reply preview (only if this is a reply) -->
  <div class="reply-chat-box" *ngIf="message.parentMessageId">
    <div class="reply-sender">{{ parentMessage.senderName }}</div>
    <div class="reply-content">{{ parentMessage.content | truncate:80 }}</div>
  </div>

  <!-- Card body -->
  <div class="card-row">
    <!-- Avatar circle -->
    <div class="avatar-circle" [style.background-color]="avatarColor">
      <span class="avatar-text">{{ avatarInitials }}</span>
    </div>

    <!-- Content area -->
    <div class="card-content">
      <div class="card-title">{{ categoryTitle }}</div>
      <!-- Category-specific fields here -->
      <div class="card-footer">
        <span class="timestamp">{{ message.sentTime | date:'h:mm a' }}</span>
        <span class="star-icon" *ngIf="message.msgStarred">★</span>
        <span class="status-icon" *ngIf="isSelf">
          <!-- ✓ = sent, ✓✓ = delivered, clock = pending -->
        </span>
      </div>
    </div>
  </div>
</div>
```

### 4.4 Deleted Message Rendering

When `message.msgDeleted === true`:

```
┌──────────────────────────────────┐
│  🚫 This message was deleted     │
│                     10:30 AM     │
└──────────────────────────────────┘
```

The entire content area is replaced. The original content is not shown. The strikethrough icon and italic text are the only indicators.

### 4.5 Date Separators

Between messages from different days, a date separator is rendered:

```typescript
isDifferentDay(messageIndex: number): boolean {
  if (messageIndex === 0) return true;
  const current = messages[messageIndex].sentTime;
  const previous = messages[messageIndex - 1].sentTime;
  return !isSameDay(parseISO(current), parseISO(previous));
}
```

Display logic:
- If the date is today: render `"Today"`
- If the date is yesterday: render `"Yesterday"`
- Otherwise: render formatted date (e.g., `"20 Apr 2026"`)

---

## 5. Send Message Flow (Text)

### 5.1 Step-by-Step Sequence

```
User types text in <textarea>
         │
         ▼
User taps [Send] button
         │
         ▼
┌─────────────────────────────────────────────────────┐
│ 1. CONSTRUCT MESSAGE OBJECT                         │
│                                                      │
│    const msg: PatientMessage = {                     │
│      messageId: UUID.generate(),                     │
│      patientInfoId: currentPatient.id,               │
│      mrn: currentPatient.mrn,                        │
│      patientName: currentPatient.patientName,        │
│      category: MessageCategory.CHAT,                 │
│      subCategory: MessageSubCategory.TEXT,            │
│      content: textareaValue,  // plain text string   │
│      senderLogin: loggedInUser.login,                │
│      senderName: loggedInUser.name,                  │
│      sentTime: new Date().toISOString(),             │
│      messageStatus: MessageStatus.NOT_SENT,          │
│      msgDeleted: false,                              │
│      read: true,                                     │
│      parentMessageId: replyMessage?.messageId,       │
│      parentMessageDTO: JSON.stringify(replyMessage), │
│    };                                                │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ 2. SAVE TO SQLite (OPTIMISTIC INSERT)               │
│                                                      │
│    patientMsgService.addPatientMessage(msg)          │
│    → INSERT INTO patient_message (...)               │
│    → Message appears in chat list immediately        │
│    → Status indicator shows clock icon (NOT_SENT)    │
│    → Clear textarea, clear replyMessage              │
│    → Scroll to bottom of chat                        │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ 3. SEND VIA HTTP                                    │
│                                                      │
│    chatService.sendMessage(msg)                      │
│    → patientInfoService.sendMessageHTTPS(msg)        │
│    → POST to server endpoint                         │
│    → Server saves, broadcasts via ACS to care team   │
└──────────────────────┬──────────────────────────────┘
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
┌──────────────────┐  ┌──────────────────────────┐
│ 4a. SUCCESS      │  │ 4b. FAILURE              │
│                  │  │                          │
│ Update SQLite:   │  │ Message stays NOT_SENT   │
│ - status=SUCCESS │  │ in SQLite.               │
│ - sentTime =     │  │                          │
│   server time    │  │ Retry mechanism picks    │
│ - actionId =     │  │ it up later via          │
│   server ID      │  │ sendNotSentDataToServer()│
│                  │  │ (runs on a timer).       │
│ UI: clock → ✓    │  │                          │
└──────────────────┘  └──────────────────────────┘
```

### 5.2 NOT_SENT Retry Mechanism

A background process periodically scans for messages stuck in `NOT_SENT` status:

```typescript
// Triggered on interval and on network reconnect
async sendNotSentDataToServer() {
  const notSentMessages = await patientMsgService.getNotSentMessages();
  // Query: SELECT * FROM patient_message
  //        WHERE msg_status = 'NOT_SENT'
  //          AND sent_time < datetime('now', '-5 seconds')

  for (const msg of notSentMessages) {
    try {
      await chatService.sendMessage(msg);
      // Update status to SUCCESS on success
    } catch (err) {
      // Leave as NOT_SENT, will retry next cycle
    }
  }
}
```

The 5-second delay prevents retrying messages that are still in their initial send attempt.

---

## 6. File Attachment Flow

### 6.1 Attachment Type Selection

When the user taps the `[📎]` attachment button:

```
┌─────────────────────────────┐
│        Attach File          │
├─────────────────────────────┤
│  📷  Camera                 │  → Opens device camera
│  🖼️  Photos                 │  → Opens ImageEditingModalPage
│  🎬  Video                  │  → Opens native file picker (video only)
│  ─────────────────────────  │
│  ✕  Cancel                  │
└─────────────────────────────┘
```

### 6.2 Camera Flow

```
User selects "Camera"
         │
         ▼
Capacitor Camera.getPhoto({
  quality: 50,
  resultType: CameraResultType.Uri,
  source: CameraSource.Camera
})
         │
         ▼
Photo URI returned (e.g., file:///tmp/photo_12345.jpg)
         │
         ▼
Copy to permanent path: {appDir}/{mrn}/IMAGE/{filename}
         │
         ▼
Create PatientMessage (see step 6.5)
```

### 6.3 Photos (Gallery) Flow

```
User selects "Photos"
         │
         ▼
Open ImageEditingModalPage as modal
  - User selects up to 8 images from gallery
  - For each image: crop, rotate, adjust
  - Quality compressed to 50%
  - Modal returns: ImageResult[] (array of {path, name, base64Data})
         │
         ▼
For EACH selected image:
  │
  ├── Save to: {appDir}/{mrn}/IMAGE/{filename}
  ├── Create PatientMessage with subCategory=IMAGE
  └── Trigger upload (see step 6.5)
```

**Constraint:** Maximum 8 images per selection. Each image is sent as a separate message.

### 6.4 Video Flow

```
User selects "Video"
         │
         ▼
Native file picker (video MIME filter)
         │
         ▼
Selected video file URI
         │
         ▼
Copy to: {appDir}/{mrn}/VIDEO/{filename}
         │
         ▼
Create PatientMessage with subCategory=VIDEO
         │
         ▼
Upload shows progress bar in UI (via Web Worker progress events)
```

### 6.5 File Upload Pipeline (All Attachment Types)

This is the core upload pipeline used by all file types (images, video, audio, documents):

```
PatientMessage created with status=NOT_SENT
         │
         ▼
Save to SQLite → message appears in chat with upload indicator
         │
         ▼
┌─────────────────────────────────────────────────────┐
│ resolveFilePath(message)                            │
│                                                      │
│ Read file from local filesystem                      │
│ Convert to Base64                                    │
│ Create FileToUpload: { path, name, base64Data }     │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ processUpload(fileToUpload, message)                │
│                                                      │
│ 1. Create FormData:                                  │
│    formData.append('file', blob, filename)           │
│    formData.append('patientInfoId', id)              │
│    formData.append('mrn', mrn)                       │
│    formData.append('subCategory', subCategory)       │
│                                                      │
│ 2. Create Web Worker instance:                       │
│    worker = new Worker('file-loader.worker.js')      │
│                                                      │
│ 3. Post to worker:                                   │
│    worker.postMessage({                              │
│      formData, uploadUrl, authToken                  │
│    })                                                │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ file-loader.worker.js (runs in background thread)   │
│                                                      │
│ 1. POST formData to api/uploadFileData               │
│    Headers: { Authorization: Bearer <token> }        │
│                                                      │
│ 2. Monitor upload progress:                          │
│    xhr.upload.onprogress → postMessage({progress})   │
│                                                      │
│ 3. On response:                                      │
│    - Validate checksum (response.checksum vs local)  │
│    - postMessage({result: serverFilePath})            │
│                                                      │
│ 4. On checksum mismatch:                             │
│    - Retry up to maxRetryIntervalsForFileUpload      │
│    - Re-read file, re-POST                           │
│                                                      │
│ 5. On final failure:                                 │
│    - postMessage({error: 'UPLOAD_FAILED'})           │
└──────────────────────┬──────────────────────────────┘
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
┌──────────────────┐  ┌──────────────────────────┐
│ SUCCESS          │  │ FAILURE                  │
│                  │  │                          │
│ 1. Update msg    │  │ Message stays NOT_SENT.  │
│    content with  │  │ File remains local.      │
│    server path   │  │ Retry on next cycle or   │
│                  │  │ network reconnect.       │
│ 2. Call          │  │                          │
│    sendAttached  │  │ INVALID_FILE_FORMAT:     │
│    FileMessage() │  │ → Delete message from    │
│    (same as text │  │   SQLite                 │
│    send flow)    │  │ → Show toast error       │
│                  │  │ → Clean up local file    │
│ 3. Status →      │  │                          │
│    SUCCESS       │  │                          │
└──────────────────┘  └──────────────────────────┘
```

### 6.6 Audio Recording Flow

```
User taps and HOLDS [🎤] microphone button
         │
         ▼
┌─────────────────────────────────────────────────────┐
│ startAudioRecord()                                  │
│                                                      │
│ 1. VoiceRecorder.startRecording()                   │
│ 2. Show recording indicator in UI:                   │
│    ┌──────────────────────────────────────────────┐  │
│    │  🔴 Recording...  0:03   [Cancel]            │  │
│    └──────────────────────────────────────────────┘  │
│ 3. Start timer (increments every second)             │
└──────────────────────┬──────────────────────────────┘
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
┌──────────────────┐  ┌──────────────────────────┐
│ User RELEASES    │  │ User taps [Cancel]       │
│ (finger up)      │  │                          │
│                  │  │ cancelAudioRecording()   │
│ stopAudioRecord()│  │                          │
│                  │  │ 1. VoiceRecorder.stop()  │
│ 1. VoiceRecorder │  │ 2. Discard data          │
│    .stopRec()    │  │ 3. Hide recording UI     │
│ 2. Get base64    │  │ 4. No message created    │
│    audio data    │  │                          │
│ 3. Save as .mp3  │  └──────────────────────────┘
│    to {mrn}/     │
│    AUDIO/        │
│ 4. Create msg    │
│    subCat=AUDIO  │
│ 5. Upload via    │
│    pipeline 6.5  │
└──────────────────┘
```

---

## 7. Receive Message Flow

### 7.1 Real-Time via ACS (Azure Communication Services)

```
ACS WebSocket connection (established at app startup)
         │
         ▼
chatMessageReceived event fires
         │
         ▼
┌─────────────────────────────────────────────────────┐
│ chatService.saveMessagetoDBFromACS(event)           │
│                                                      │
│ 1. Parse event.message (JSON string)                 │
│ 2. Extract metadata:                                 │
│    - context: MessageContext enum                     │
│    - action: MessageAction enum                      │
│    - senderLogin: who sent it                        │
│    - partial: boolean (is message truncated?)        │
│                                                      │
│ 3. Route by context:                                 │
└──────────────────────┬──────────────────────────────┘
                       │
         ┌─────────────┼─────────────┬────────────────┐
         │             │             │                │
         ▼             ▼             ▼                ▼
┌──────────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────┐
│ PATIENT_     │ │ PATIENT_ │ │ CARE_TEAM │ │ LOGOUT_      │
│ MESSAGE      │ │ INFO     │ │           │ │ MESSAGE      │
│              │ │          │ │ Update    │ │              │
│ Normal msg   │ │ Patient  │ │ care team │ │ Force logout │
│ flow below   │ │ demo-    │ │ roster   │ │ current      │
│              │ │ graphics │ │ locally   │ │ session.     │
│              │ │ update   │ │           │ │ Navigate to  │
│              │ │          │ │           │ │ login page.  │
└──────┬───────┘ └──────────┘ └───────────┘ └──────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────┐
│ PATIENT_MESSAGE Processing                          │
│                                                      │
│ 1. Check action:                                     │
│    - DELETE → mark existing msg as deleted in SQLite │
│    - SAVE/PUBLISH → process as new/updated message   │
│                                                      │
│ 2. Check partial flag:                               │
│    - If partial=true → message exceeds ACS size limit│
│      → Fetch full content: GET api/messages/{id}     │
│                                                      │
│ 3. Deduplication:                                    │
│    - Query SQLite by actionId + patientInfoId        │
│    - If found: UPDATE existing row                   │
│    - If not found: INSERT new row                    │
│                                                      │
│ 4. Download attachments (if file message):           │
│    - GET api/downloadFile?filePath=...               │
│    - Save to local filesystem                        │
│    - Update content with local path                  │
│                                                      │
│ 5. Emit via BehaviorSubject:                         │
│    patientMsgService.newMessage$.next(message)       │
└──────────────────────┬──────────────────────────────┘
                       │
              ┌────────┴────────┐
              │                 │
              ▼                 ▼
┌──────────────────────┐  ┌──────────────────────────┐
│ User is viewing THIS │  │ User is on a DIFFERENT   │
│ patient's chat       │  │ screen                   │
│                      │  │                          │
│ 1. Append message    │  │ 1. Increment unread      │
│    to displayed list │  │    count badge on         │
│ 2. Scroll to bottom  │  │    patient card           │
│ 3. Mark as read      │  │ 2. If on Home screen:    │
│                      │  │    update patient card   │
│                      │  │ 3. Play notification     │
│                      │  │    sound (if enabled)    │
└──────────────────────┘  └──────────────────────────┘
```

### 7.2 Bulk Message Handling (Partial Flag)

When a message is too large for ACS (which has a size limit on message content), the server sets a `partial` flag in the ACS metadata. The client then fetches the full content separately:

```
ACS message received with metadata.partial = true
         │
         ▼
Extract messageId from ACS metadata
         │
         ▼
GET api/messages/{messageId}
         │
         ▼
Server returns full PatientMessage JSON
         │
         ▼
Process as normal (step 3 onward in 7.1)
```

### 7.3 Offline Recovery (App Resume)

When the app comes back from background or reconnects after network loss:

```
App resumes / network reconnects
         │
         ▼
Check ACS token validity
  ├── Expired → POST api/refresh/acs-Token → get new token → reinitialize ACS client
  └── Valid → continue
         │
         ▼
Fetch missed messages:
POST api/offline-patient-messages?page=0&size=1000
         │
         ▼
Response includes x-total-count header for pagination
         │
         ▼
If total > 1000: loop through pages (page=1, page=2, ...) until all fetched
         │
         ▼
For each message: run same processing as 7.1 (dedup, save, notify)
```

---

## 8. Message Actions

### 8.1 Long Press Menu

When a user long-presses on a message, a context menu appears with available actions:

```
┌─────────────────────────┐
│  ★  Star Message        │  ← Available for all messages (with restrictions)
│  ↩  Reply               │  ← Available for all non-deleted messages
│  🗑  Delete Message     │  ← Only own messages, within 1 hour
└─────────────────────────┘
```

### 8.2 Star / Unstar

**Who can star:** Only the message sender OR the primary consultant for the patient.

```
User long-presses message → selects "Star"
         │
         ▼
┌─────────────────────────────────────────────────────┐
│ 1. Check permission:                                 │
│    if (msg.senderLogin !== currentUser.login          │
│        && currentUser.login !== primaryConsultant)    │
│      → ignore (do nothing)                           │
│                                                      │
│ 2. Toggle locally:                                   │
│    msg.msgStarred = msg.msgStarred ? null : starData │
│                                                      │
│ 3. Update SQLite:                                    │
│    UPDATE patient_message SET msg_starred = ?        │
│    WHERE id = ?                                      │
│                                                      │
│ 4. Sync to server:                                   │
│    POST api/_search/message-by-action-id             │
│    Body: { actionId, starred: true/false }           │
│                                                      │
│ 5. UI: ★ icon appears/disappears on message card     │
└─────────────────────────────────────────────────────┘
```

### 8.3 Reply

```
User long-presses message → selects "Reply"
  (OR swipes right on message, see 8.5)
         │
         ▼
┌─────────────────────────────────────────────────────┐
│ 1. Set replyMessage = selectedMessage                │
│                                                      │
│ 2. Show reply preview bar above input area:          │
│    ┌──────────────────────────────────────────────┐  │
│    │ ↩ Dr. Mehta                                  │  │
│    │ "Will review in the evening."          [x]   │  │
│    └──────────────────────────────────────────────┘  │
│                                                      │
│ 3. Focus textarea (keyboard opens)                   │
│                                                      │
│ 4. User types reply text → taps Send                 │
│                                                      │
│ 5. Message is sent with:                             │
│    parentMessageId = replyMessage.messageId           │
│    parentMessageDTO = JSON.stringify(replyMessage)    │
│                                                      │
│ 6. Clear replyMessage, hide reply preview bar        │
└─────────────────────────────────────────────────────┘
```

### 8.4 Delete

**Restrictions:**
- Only the message sender can delete
- Only within `deleteMessageTime` (default: 1 hour) of `sentTime`
- Delete is a soft delete (content hidden, not removed from DB)

```
User long-presses OWN message → selects "Delete"
         │
         ▼
┌─────────────────────────────────────────────────────┐
│ 1. Confirm: "Delete this message?"                   │
│                                                      │
│ 2. Validate time window:                             │
│    if (now - msg.sentTime > deleteMessageTime)       │
│      → show toast "Cannot delete after 1 hour"      │
│      → abort                                         │
│                                                      │
│ 3. Soft delete via ACS:                              │
│    chatClient.deleteChatMessage(threadId, acsId)     │
│                                                      │
│ 4. Update local SQLite:                              │
│    UPDATE patient_message SET msg_delete = 1         │
│    WHERE id = ?                                      │
│                                                      │
│ 5. Clean up local files (if attachment):             │
│    Delete file from {mrn}/{subCategory}/             │
│                                                      │
│ 6. UI: message card replaced with                    │
│    "This message was deleted" styling                │
│                                                      │
│ 7. Other users receive DELETE action via ACS         │
│    → their local DB also updated                     │
└─────────────────────────────────────────────────────┘
```

### 8.5 Swipe-to-Reply Gesture

```
User places finger on message card and swipes RIGHT (panright)
         │
         ▼
┌─────────────────────────────────────────────────────┐
│ Hammer.js panright event handler                     │
│                                                      │
│ 1. swipeRightEvent(event, message)                   │
│                                                      │
│ 2. During swipe:                                     │
│    - Message card translates right                   │
│    - Reply icon (↩) fades in on the left             │
│    - Haptic feedback at threshold                    │
│                                                      │
│ 3. On release (panend):                              │
│    - If swipe distance > threshold:                  │
│      → Same as "Reply" action (set replyMessage)     │
│    - If swipe distance < threshold:                  │
│      → Snap back, no action                          │
│                                                      │
│ 4. Message card animates back to original position   │
└─────────────────────────────────────────────────────┘
```

---

## 9. Filtering & Pagination

### 9.1 Filter Bar

The filter bar sits between the header and the message list. It provides quick-access filter chips and a "More" button for all categories.

```
┌─────────────────────────────────────────────────────┐
│  [★] [PRG] [LAB] [RAD] [INV] [Vitals] [More ▾]     │
└─────────────────────────────────────────────────────┘
```

| Chip | Filter Applied |
|---|---|
| ★ (Star) | `WHERE msg_starred IS NOT NULL` |
| PRG | `WHERE category = 'PROGRESS_NOTES'` |
| LAB | `WHERE category = 'LAB_RESULT'` |
| RAD | `WHERE category = 'RAD_RESULT'` |
| INV | `WHERE category = 'INVESTIGATION_REPORT'` |
| Vitals | `WHERE category = 'KEY_VALUE_DATA'` |
| More ▾ | Opens popover with all 16 categories as checkboxes |

### 9.2 Filter Logic

```typescript
// Active filters stored as array
activeFilters: MessageCategory[] = [];
isStarFilter: boolean = false;

// Build WHERE clause
buildFilterQuery(): string {
  let where = `WHERE patient_info_id = ${patientInfoId}`;

  if (isStarFilter) {
    where += ` AND msg_starred IS NOT NULL`;
  }

  if (activeFilters.length > 0) {
    const categories = activeFilters.map(f => `'${f}'`).join(', ');
    where += ` AND category IN (${categories})`;
  }

  return where;
}
```

**Multiple filters are OR-combined within categories.** For example, selecting both LAB and RAD shows messages where `category IN ('LAB_RESULT', 'RAD_RESULT')`.

**Star filter combines with category filters via AND.** Selecting Star + LAB shows only starred lab results.

**Filters persist during the session** (while the user stays on this page). They reset when the user navigates away (`ionViewWillLeave`).

### 9.3 "More" Popover

Tapping "More ▾" opens an `ion-popover` with checkboxes for all 16 categories:

```
┌──────────────────────────┐
│  ☐ Chat                  │
│  ☐ Lab Result            │
│  ☐ Radiology Result      │
│  ☐ Discharge Summary     │
│  ☐ Investigation Order   │
│  ☐ Medication Order      │
│  ☐ Admission Message     │
│  ☐ Progress Notes        │
│  ☐ Cross Consultation    │
│  ☐ System Reminder       │
│  ☐ Investigation Report  │
│  ☐ Bed Transfer          │
│  ☐ Vitals                │
│  ☐ Assessment Form       │
│  ☐ Discharge Intimation  │
│  ☐ Initial Assessment    │
│  ─────────────────────── │
│  [Apply]   [Clear All]   │
└──────────────────────────┘
```

### 9.4 Pagination from SQLite

Messages are loaded in pages from SQLite, not from the server. The server only provides messages for sync; all display reads come from the local DB.

```typescript
// Configuration
pageSize: number;  // Loaded from DB settings (typically 20-50)
currentPage: number = 0;

// Initial load (when page opens)
async loadInitialMessages() {
  this.messages = await patientMsgService
    .loadPatientMessageListWithPage(
      patientInfoId,
      this.pageSize,
      0,                      // offset = 0 for first page
      this.buildFilterQuery()
    );
  this.currentPage = 0;
  this.processMessages(this.messages);
  this.scrollToBottom();
}

// Load next page (triggered by scrolling to top)
async loadOnScroll() {
  this.currentPage++;
  const offset = this.currentPage * this.pageSize;
  const olderMessages = await patientMsgService
    .loadPatientMessageListWithPage(
      patientInfoId,
      this.pageSize,
      offset,
      this.buildFilterQuery()
    );

  if (olderMessages.length === 0) {
    // No more messages, disable further loading
    this.hasMoreMessages = false;
    return;
  }

  // Prepend older messages to the top of the list
  this.messages = [...olderMessages, ...this.messages];
  this.processMessages(olderMessages);
  // Maintain scroll position (don't jump to top)
}
```

**`processMessages()` does post-processing on each message:**
1. Parse `content` from JSON string to object (for clinical cards)
2. Parse `parentMessageDTO` from JSON string (for reply previews)
3. Check if attachments need downloading (if file path is remote, not local)
4. Resolve local file paths for already-downloaded attachments
5. Set rendering metadata (avatar color, initials, etc.)

### 9.5 Scroll Behavior

| Event | Scroll Action |
|---|---|
| Initial page load | Scroll to bottom (newest message) |
| New message sent | Scroll to bottom |
| New message received (user at bottom) | Scroll to bottom |
| New message received (user scrolled up) | Show "New message" indicator, do NOT auto-scroll |
| Load older page (scroll to top) | Maintain current scroll position |
| Filter applied | Scroll to bottom of filtered results |

---

## 10. @Mentions System

### 10.1 Overview

The chat input uses the `ngx-mentions` library to provide @mention autocomplete for care team members. When a user types `@`, a dropdown appears with matching team members.

### 10.2 Flow

```
User types "@" in textarea
         │
         ▼
ngx-mentions triggers searchTerm callback
         │
         ▼
┌─────────────────────────────────────────────────────┐
│ loadChoices(searchTerm: string)                     │
│                                                      │
│ 1. If searchTerm is empty:                           │
│    → Show full care team list (cached locally)       │
│                                                      │
│ 2. If searchTerm has characters (e.g., "sha"):       │
│    → Filter care team list by name.includes(term)    │
│    → Also fetch from server if local results < 5     │
│                                                      │
│ 3. Return filtered list as dropdown options           │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│  Dropdown appears above textarea:                     │
│  ┌────────────────────────────────────┐               │
│  │  Dr. Sharma (Cardiology)           │               │
│  │  Dr. Shastri (Neurology)           │               │
│  │  Dr. Shah (Orthopedics)            │               │
│  └────────────────────────────────────┘               │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
User taps a name (e.g., "Dr. Sharma")
         │
         ▼
┌─────────────────────────────────────────────────────┐
│ 1. Name inserted into textarea with mention markup   │
│    Display: "@Dr. Sharma" (highlighted/styled)       │
│                                                      │
│ 2. Mention object added to mentions[] array:         │
│    { login: "dr.sharma", name: "Dr. Sharma" }       │
│                                                      │
│ 3. When message is sent:                             │
│    mentions[] embedded in message content/metadata    │
│    Server can use this for push notifications        │
└─────────────────────────────────────────────────────┘
```

### 10.3 Display in Chat

Mentioned names appear with highlight styling in the rendered message (typically a different text color or background, matching the mention chip style).

---

## 11. Chat Sync (Full History Download)

### 11.1 When Is Sync Needed?

- First login on a new device (no local SQLite data)
- After clearing app data
- If messages seem missing (user manually triggers via sync button)
- After prolonged offline period where ACS buffer overflowed

### 11.2 Sync Button Flow

```
User taps [sync] button in header
         │
         ▼
┌─────────────────────────────────────────────────────┐
│ showChatHistorySync()                               │
│                                                      │
│ Confirmation dialog:                                 │
│ "Download full chat history for this patient?        │
│  This may take a few minutes."                       │
│ [Cancel]  [Download]                                 │
└──────────────────────┬──────────────────────────────┘
                       │ User confirms
                       ▼
┌─────────────────────────────────────────────────────┐
│ initiateChatHistorySync()                           │
│                                                      │
│ Show progress dialog:                                │
│ ┌────────────────────────────────────────────┐       │
│ │  Downloading chat history...               │       │
│ │  ████████████░░░░░░░░  60%                 │       │
│ │  Page 3 of 5                               │       │
│ └────────────────────────────────────────────┘       │
│                                                      │
│ Progress tracked via BehaviorSubjects                │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
              Two approaches available:
         ┌─────────────┴─────────────┐
         │                           │
         ▼                           ▼
┌──────────────────┐  ┌──────────────────────────────┐
│ APPROACH A:      │  │ APPROACH B:                  │
│ ACS Thread       │  │ Server-side API              │
│ Iteration        │  │ (preferred)                  │
│                  │  │                              │
│ 1. getALLChat    │  │ 1. POST api/offline-         │
│    ThreadIds()   │  │    patient-messages           │
│                  │  │    ?page=0&size=1000         │
│ 2. For each      │  │                              │
│    thread:       │  │ 2. Read x-total-count        │
│    listMessages  │  │    header for total msgs     │
│    (max 300/pg)  │  │                              │
│                  │  │ 3. Loop pages:               │
│ 3. Parse & save  │  │    page=1, page=2, ...       │
│    each message  │  │    until all fetched         │
│                  │  │                              │
│ 4. Slower, more  │  │ 4. Parse & save each         │
│    API calls     │  │    message to SQLite         │
│                  │  │                              │
│                  │  │ 5. Faster, fewer calls       │
└──────────────────┘  └──────────────────────────────┘
                       │
                       ▼
              For each message received:
┌─────────────────────────────────────────────────────┐
│ 1. Dedup check: query SQLite by actionId            │
│    - Exists → UPDATE                                │
│    - Not exists → INSERT                            │
│                                                      │
│ 2. Download file attachments (if any)                │
│                                                      │
│ 3. Update progress BehaviorSubject                   │
│    (drives UI progress bar)                          │
│                                                      │
│ 4. After all pages complete:                         │
│    → Dismiss progress dialog                         │
│    → Reload message list from SQLite                 │
│    → Show toast "Sync complete"                      │
└─────────────────────────────────────────────────────┘
```

---

## 12. Navigation Actions (19 Action Sheet Items)

When the user taps the `[+]` button, an `ion-action-sheet` opens with 19 items. Each navigates to a dedicated screen for creating structured clinical content. Upon completion, that screen creates a message in the chat.

```
┌──────────────────────────────────┐
│        Patient Actions           │
├──────────────────────────────────┤
│  📋  Investigation Order         │  → InvestigationOrderPage
│  💊  Medication Order            │  → MedicationOrderPage
│  🔄  Cross Consultation          │  → CrossConsultationPage
│  📝  Progress Notes              │  → ProgressNotesPage
│  📄  Discharge Summary           │  → DischargeSummaryPage
│  📊  Initial Assessment          │  → InitialAssessmentPage
│  ⚠️  Risk Scorecard              │  → RiskScorecardPage
│  🏥  Discharge Intimation        │  → DischargeIntimationPage
│  👨‍👩‍👧  Family Communication       │  → FamilyCommunicationPage
│  📈  Results                     │  → ResultsPage
│  📉  Vital Trends                │  → VitalTrendsPage
│  ✅  Checklist                   │  → ChecklistPage
│  📁  Past Records                │  → PastRecordsPage
│  🔪  OT Notes                    │  → OTNotesPage
│  📌  Tasks                       │  → TasksPage
│  🚨  Incident Reporting          │  → IncidentReportingPage
│  💉  PAC                         │  → PACPage
│  📡  Live Monitoring (PMS only)  │  → LiveMonitoringPage
│  💳  Medicine Card               │  → MedicineCardPage
│  ─────────────────────────────── │
│  ✕  Cancel                       │
└──────────────────────────────────┘
```

**"PMS only"** means the Live Monitoring option is only visible when the patient's monitoring system is PMS (Patient Monitoring System). This is a conditional `*ngIf` on the action sheet button.

**Pattern for all 19:** Each page receives the current patient context (patientInfoId, mrn, etc.) as navigation params. When the user completes the form/action on that page, it creates a PatientMessage of the corresponding category and returns to the chat, where the new message appears.

---

## 13. Complete API Reference

| # | Method | Endpoint | Purpose | Request Body / Params | Response |
|---|---|---|---|---|---|
| 1 | POST | `api/uploadFileData` | Upload file attachment | `FormData` with file blob, patientInfoId, mrn, subCategory | `{ filePath, checksum }` |
| 2 | POST | `api/refresh/acs-Token` | Refresh ACS chat token | (uses existing auth) | `{ token, expiresOn }` |
| 3 | POST | `api/offline-patient-messages?page=N&size=1000` | Fetch offline messages (paginated) | Patient context in body | `PatientMessage[]` + `x-total-count` header |
| 4 | GET | `api/messages/{messageId}` | Fetch single message by ID | Path param: messageId | `PatientMessage` |
| 5 | POST | `api/_search/message-by-action-id` | Fetch or update message by actionId | `{ actionId, ... }` | `PatientMessage` |
| 6 | POST | `api/fetch/patient-info-by-acs-group-id` | Fetch patient info by ACS group thread ID | `{ acsGroupId }` | `PatientInfo` |
| 7 | GET | `api/downloadFile?filePath=&name=&contentType=` | Download file attachment | Query params: filePath, name, contentType | Binary file data |
| 8 | GET | `api/media/download?filePath=&name=` | Download radiology image | Query params: filePath, name | Binary image data |

**Authentication:** All endpoints require `Authorization: Bearer <accessToken>` header. The Web Worker receives the token as a parameter since it runs in a separate thread without access to the Angular HTTP interceptor.

**File upload endpoint (api/uploadFileData)** is called from the Web Worker, not from the main thread. This prevents large file uploads from blocking the UI.

---

## 14. Error Handling Matrix

| # | Error Scenario | Detection | Handling | User Feedback |
|---|---|---|---|---|
| 1 | **Network offline** | `networkService.isOnline()` check before action | Block send, queue for retry | Toast: "No internet connection" |
| 2 | **File upload checksum mismatch** | Compare server-returned checksum with local | Retry upload up to `maxRetryIntervalsForFileUpload` times | Progress indicator stays, silent retry |
| 3 | **File upload final failure** | All retries exhausted | Message stays as NOT_SENT in SQLite | Toast: "File upload failed" |
| 4 | **Invalid file format** | Server returns INVALID_FILE_FORMAT error | Delete unsent message from SQLite, clean up local file | Toast: "File format not supported" |
| 5 | **ACS token expired** | Token expiry check before ACS operations | POST `api/refresh/acs-Token`, reinitialize ACS client | Silent (background refresh) |
| 6 | **JWT access token expired** | 401 response from any API call | `auth-expired.interceptor.ts` triggers token refresh flow | Silent if refresh succeeds; logout if refresh token also expired |
| 7 | **PatientInfo not found** (for incoming msg) | Lookup by patientInfoId returns null | Delay 5 seconds, retry. If still not found, fetch from server. | Silent |
| 8 | **JSON parse error** (parentMessageDTO) | try/catch around `JSON.parse()` | Set parentMessageDTO to null (reply preview won't show) | Silent (message still displays, just no reply preview) |
| 9 | **ACS message too large** (partial flag) | `metadata.partial === true` on incoming ACS message | Fetch full content via `GET api/messages/{id}` | Silent |
| 10 | **PATIENT_DELETE error** | Server signals patient was deleted | Delete patient from local SQLite, navigate back to home | Toast: "Patient record removed" |
| 11 | **Force logout** (LOGOUT_MESSAGE) | ACS message with context=LOGOUT_MESSAGE | Clear all local state, navigate to login page | Alert: "Session ended. You have been logged out." |
| 12 | **Duplicate message** (dedup) | Query SQLite by actionId finds existing row | UPDATE existing row instead of INSERT | Silent (no visible change) |
| 13 | **Send message failure** (HTTP error) | Non-2xx response from sendMessageHTTPS | Message stays NOT_SENT, retry mechanism picks it up | Clock icon remains on message (no tick) |
| 14 | **Large file upload interrupted** (app killed/crash) | Web Worker terminated mid-upload | On next app launch, NOT_SENT scan finds the message, re-triggers upload | Message shows upload indicator on reload |

---

## 15. Edge Cases & Race Conditions

### 15.1 Message Arrives While App is in Background

**Scenario:** User locks phone or switches to another app. ACS WebSocket may disconnect or messages may buffer.

**Handling:**
- On app resume (`appStateChange` event), the app checks for missed messages
- Calls `api/offline-patient-messages` to fetch anything missed
- Dedup ensures no duplicates if ACS also delivers the same messages on reconnect

### 15.2 Large File Upload Interrupted

**Scenario:** User starts uploading a video, then loses network or kills the app.

**Handling:**
- Web Worker handles upload independently from main thread
- If Worker is terminated, message remains NOT_SENT in SQLite
- On next app launch, `sendNotSentDataToServer()` finds the message
- File is re-read from local storage (it was saved before upload started)
- Upload restarts from scratch (no resume/chunking)

### 15.3 Two Devices Logged In Simultaneously

**Scenario:** Doctor logs in on a second device.

**Handling:**
- Server sends LOGOUT_MESSAGE via ACS to the first device
- First device receives it, clears local state, navigates to login
- Only one active session per user is allowed

### 15.4 Deleted Message Has File Attachment

**Scenario:** User deletes a message that contained an image/video/audio file.

**Handling:**
- Message is soft-deleted in SQLite (`msg_delete = 1`)
- Local file is deleted from filesystem
- Other users receiving the DELETE action also clean up their local copies
- Card renders as "This message was deleted"

### 15.5 Bulk Message Exceeds ACS Size Limit

**Scenario:** A clinical message (e.g., detailed lab result with 50 parameters) exceeds ACS's message size limit.

**Handling:**
- Server sets `partial: true` in ACS message metadata
- ACS message body contains only a stub/identifier
- Client detects partial flag, fetches full content via `GET api/messages/{id}`
- Full message processed normally after fetch

### 15.6 AI Interpretation on Lab Results

**Scenario:** Lab result messages may include an AI-generated interpretation section.

**Handling:**
- AI interpretation is enabled by default
- User can disable it per-message via `disableAIInterpretation()` toggle
- When disabled, the AI section is hidden but data is not deleted
- Can be re-enabled (toggle is reversible)

### 15.7 Reply to a Deleted Message

**Scenario:** User A replies to a message. Later, the original message is deleted by its sender.

**Handling:**
- The reply message's `parentMessageDTO` is a frozen copy (JSON snapshot at reply time)
- The reply preview still shows the original content from the snapshot
- BUT: if the parent is deleted, the parent preview renders as "This message was deleted"
- The parent lookup checks `msgDeleted` on the live parent record, not the snapshot

### 15.8 Star Message by Non-Authorized User

**Scenario:** A care team member who is neither the sender nor the primary consultant tries to star a message.

**Handling:**
- The star action is silently ignored (no API call, no SQLite update)
- No error toast (the long-press menu still shows "Star" but it has no effect)
- This is a client-side check; server also validates

### 15.9 Race Condition: Send + Receive Same Message

**Scenario:** User sends a message. Before the HTTP response returns, the ACS WebSocket delivers the same message back (from the server broadcast).

**Handling:**
- The sent message has a client-generated `messageId`
- The ACS-received copy has the same `actionId` (set by server)
- Dedup query: `SELECT * FROM patient_message WHERE action_id = ? AND patient_info_id = ?`
- First write wins (INSERT), second write deduplicates (UPDATE)
- No visible duplication in the UI

### 15.10 Pagination + New Message Arrival

**Scenario:** User has scrolled up to view older messages (page 2+). A new message arrives.

**Handling:**
- New message is appended to the bottom of the `messages[]` array
- If user is scrolled up: a "New message" indicator appears at the bottom
- User can tap the indicator to scroll to the newest message
- Pagination state (`currentPage`, `offset`) is not affected

---

## 16. Implementation Checklist

Use this checklist to track progress when building the Patient Chat system from scratch.

### Phase 1: Foundation

- [ ] **SQLite setup** -- Create `patient_message` table with all columns and indexes (Section 3.5)
- [ ] **Data models** -- Define TypeScript interfaces: `PatientMessage`, `FileToUpload` (Section 3.1, 3.4)
- [ ] **Enums** -- Define all enums: `MessageCategory`, `MessageSubCategory`, `MessageStatus`, `MessageAction`, `MessageContext` (Section 3.2, 3.3)
- [ ] **patient-msg.service.ts** -- Implement SQLite CRUD operations: insert, update, query with pagination, filter queries (Section 3.5)
- [ ] **Basic page scaffold** -- Create `patient-chat.page.ts` with Ionic lifecycle hooks (`ionViewWillEnter`, `ionViewWillLeave`)

### Phase 2: Message Display

- [ ] **Message list** -- Implement `*ngFor` loop with paginated message loading from SQLite (Section 9.4)
- [ ] **CHAT/TEXT rendering** -- Left/right bubbles with sender name, timestamp, status icon (Section 4.2, row 1)
- [ ] **Date separators** -- `isDifferentDay()` logic with Today/Yesterday/date labels (Section 4.5)
- [ ] **Pagination** -- Scroll-to-top triggers `loadOnScroll()` for older messages (Section 9.4)
- [ ] **Scroll behavior** -- Auto-scroll to bottom on load and new messages; maintain position on page load (Section 9.5)
- [ ] **Deleted message rendering** -- Strikethrough + "This message was deleted" card (Section 4.4)

### Phase 3: Send Messages

- [ ] **Text input area** -- Textarea with dynamic height, Send button visibility toggle (Section 2.3)
- [ ] **sendMessage()** -- Construct PatientMessage, save to SQLite, send via HTTP, update status (Section 5.1)
- [ ] **NOT_SENT retry** -- Background scan for stuck messages, retry after 5-second delay (Section 5.2)
- [ ] **Optimistic UI** -- Message appears immediately with clock icon, updates to tick on success (Section 5.1)

### Phase 4: File Attachments

- [ ] **Attachment ActionSheet** -- Camera/Photos/Video/Cancel options (Section 6.1)
- [ ] **Camera integration** -- Capacitor Camera API, save to local filesystem (Section 6.2)
- [ ] **Gallery/ImageEditing** -- ImageEditingModalPage with crop/rotate, max 8 images (Section 6.3)
- [ ] **Video selection** -- Native file picker, save locally (Section 6.4)
- [ ] **Web Worker upload** -- `file-loader.worker.js` with FormData POST, progress events, checksum retry (Section 6.5)
- [ ] **CHAT/IMAGE rendering** -- Thumbnail grid, tap to open ImageModalPage (Section 4.2, row 2)
- [ ] **CHAT/AUDIO rendering** -- Audio icon, tap to play/pause (Section 4.2, row 3)
- [ ] **CHAT/VIDEO rendering** -- Video thumbnail, tap to open VideoPlayer (Section 4.2, row 4)

### Phase 5: Audio Recording

- [ ] **Tap-and-hold microphone** -- `startAudioRecord()` with VoiceRecorder (Section 6.6)
- [ ] **Recording UI** -- Red dot, timer, Cancel button (Section 6.6)
- [ ] **Stop and send** -- `stopAudioRecord()`, save as .mp3, trigger upload (Section 6.6)
- [ ] **Cancel recording** -- `cancelAudioRecording()`, discard, hide UI (Section 6.6)

### Phase 6: Receive Messages (Real-time)

- [ ] **ACS client setup** -- Initialize ChatClient with ACS token from `chat.service.ts` (Section 7.1)
- [ ] **chatMessageReceived handler** -- Parse event, route by MessageContext (Section 7.1)
- [ ] **PATIENT_MESSAGE processing** -- Dedup, save to SQLite, download attachments (Section 7.1)
- [ ] **Partial message handling** -- Detect partial flag, fetch full content via API (Section 7.2)
- [ ] **UI refresh** -- BehaviorSubject subscription, append to list or increment badge (Section 7.1)
- [ ] **Offline recovery** -- On resume, fetch missed messages via `api/offline-patient-messages` (Section 7.3)
- [ ] **LOGOUT_MESSAGE handling** -- Force logout on receiving context=LOGOUT_MESSAGE (Section 7.1)

### Phase 7: Clinical Message Cards (16 categories)

- [ ] **ADMISSION_MESSAGE card** -- Green "AM" avatar, consultant/date/number/category/reason fields (Section 4.2, row 5)
- [ ] **INVESTIGATION_ORDER card** -- Gold "IO" avatar, investigation names with priority flags (Section 4.2, row 6)
- [ ] **MEDICATION_ORDER card** -- Pink "MO" avatar, drug/frequency/dosage/duration fields (Section 4.2, row 7)
- [ ] **LAB_RESULT card** -- "LT" avatar, result rows with normal/abnormal coloring, View Report link (Section 4.2, row 8)
- [ ] **RAD_RESULT card** -- Purple "XR"/"ECG" avatar, thumbnails, AI findings with heat map (Section 4.2, row 9)
- [ ] **DISCHARGE_SUMMARY card** -- Green "DS" avatar, color-coded status badge (Section 4.2, row 10)
- [ ] **PROGRESS_NOTES card** -- Blue "PN" avatar, notes with strikethrough for uncharted (Section 4.2, row 11)
- [ ] **CROSS_CONSULTATION card** -- Yellow "CC" avatar, priority label (Section 4.2, row 12)
- [ ] **SYSTEM_REMINDER card** -- Red alert icon, alert label (Section 4.2, row 13)
- [ ] **BED_TRANSFER card** -- Yellow "TF" avatar, from/to locations (Section 4.2, row 14)
- [ ] **KEY_VALUE_DATA (Vitals) card** -- Blue "V" avatar, key-value table (Section 4.2, row 15)
- [ ] **ASSESSMENT_FORM card** -- Teal dynamic avatar, score with severity coloring (Section 4.2, row 16)
- [ ] **INVESTIGATION_REPORT card** -- Purple "IR" avatar, View Report link (Section 4.2, row 17)
- [ ] **INITIAL_ASSESSMENT card** -- Teal "IS" avatar (Section 4.2, row 18)
- [ ] **DISCHARGE_INTIMATION card** -- Light blue "DI" avatar (Section 4.2, row 19)

### Phase 8: Message Actions

- [ ] **Long press handler** -- Show context menu with Star/Reply/Delete options (Section 8.1)
- [ ] **Star/Unstar** -- Permission check, SQLite update, API sync (Section 8.2)
- [ ] **Reply** -- Set replyMessage, show preview bar, include parentMessageId on send (Section 8.3)
- [ ] **Delete** -- Time window check, ACS delete, SQLite soft delete, file cleanup (Section 8.4)
- [ ] **Swipe-to-reply gesture** -- Hammer.js panright, threshold detection, reply trigger (Section 8.5)

### Phase 9: Filtering & Search

- [ ] **Filter bar UI** -- Star/PRG/LAB/RAD/INV/Vitals chips (Section 9.1)
- [ ] **Filter logic** -- Build SQL WHERE clause from active filters (Section 9.2)
- [ ] **More popover** -- All 16 categories with checkboxes (Section 9.3)
- [ ] **Filter state management** -- Persist during session, reset on leave (Section 9.2)

### Phase 10: @Mentions

- [ ] **ngx-mentions integration** -- Configure in textarea (Section 10.1)
- [ ] **loadChoices()** -- Filter care team by search term (Section 10.2)
- [ ] **Mention display** -- Highlighted styling in rendered messages (Section 10.3)
- [ ] **Mention in send payload** -- Embed mentions array in message content (Section 10.2)

### Phase 11: Chat Sync

- [ ] **Sync button** -- Confirmation dialog in header (Section 11.2)
- [ ] **Server-side sync** -- Paginated fetch from `api/offline-patient-messages` (Section 11.2, Approach B)
- [ ] **Progress tracking** -- BehaviorSubject-driven progress bar UI (Section 11.2)
- [ ] **Dedup on bulk insert** -- Check actionId before insert/update (Section 11.2)

### Phase 12: Navigation & Polish

- [ ] **Action sheet (19 items)** -- All navigation items with conditional visibility (Section 12)
- [ ] **Header** -- Patient demographics, comorbidity badges, risk score (Section 2.2)
- [ ] **Error handling** -- Implement all 14 error scenarios from the matrix (Section 14)
- [ ] **Edge cases** -- Handle all 10 edge cases documented (Section 15)

### Phase 13: Testing

- [ ] **Unit tests** -- SQLite CRUD operations, filter query building, date separator logic
- [ ] **Integration tests** -- Send message flow (optimistic insert → HTTP → status update)
- [ ] **E2E tests** -- Full chat interaction: send text, send image, receive message, filter, star, reply, delete
- [ ] **Edge case tests** -- Offline send+receive, partial messages, dedup, force logout
- [ ] **Performance tests** -- Pagination with 10,000+ messages, rapid message send/receive
