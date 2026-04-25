# Flow 05: Progress Notes & Discharge Summary Systems

**App:** AADI (org.nh.app.aadi) v2.35.0
**Framework:** Ionic 7 / Capacitor 5 / Angular 17+
**Source files:** `progress-notes.page.ts` (1401 lines), `progress-notes-edit.page.ts` (354 lines), `progress-notes-preview.page.ts` (453 lines), `previous-progress-notes.page.ts` (439 lines), `discharge-summary.page.ts` (~2700 lines), `discharge-comments.page.ts` (125 lines), `copy-previous-notes.page.ts` (100 lines), `ai-discharge-summary.page.ts` (518 lines)

---

## 1. Overview

Progress Notes (PN) and Discharge Summary (DS) are the two primary clinical documentation systems in AADI. Both share a common infrastructure layer -- CKEditor 5 for rich-text editing, a macro system for reusable text templates, and the ATHMA gateway for persistence -- but they diverge significantly in complexity. PN is a focused, per-encounter note-taking system with vitals, orders, and an acknowledge/unchart lifecycle. DS is a 28-section document editor with a 7-state review/signoff state machine, AI-powered voice dictation, and discharge intimation workflows.

### 1.1 Component Dependency Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                    CLINICAL DOCUMENTATION SYSTEM                                  │
│                                                                                  │
│  ┌────────────────────────────────────┐  ┌──────────────────────────────────┐    │
│  │        PROGRESS NOTES              │  │        DISCHARGE SUMMARY          │    │
│  │                                    │  │                                    │    │
│  │  progress-notes.page.ts (create)   │  │  discharge-summary.page.ts (main) │    │
│  │  progress-notes-edit.page.ts       │  │  discharge-comments.page.ts       │    │
│  │  progress-notes-preview.page.ts    │  │  copy-previous-notes.page.ts      │    │
│  │  previous-progress-notes.page.ts   │  │  ai-discharge-summary.page.ts     │    │
│  └───────────────┬────────────────────┘  └──────────────┬────────────────────┘    │
│                  │                                       │                        │
│                  ▼                                       ▼                        │
│  ┌──────────────────────────────────────────────────────────────────────┐         │
│  │                    SHARED INFRASTRUCTURE                              │         │
│  │                                                                      │         │
│  │  CKEditor 5 (rich text)  │  Macro System  │  Vitals Capture          │         │
│  │  Clipboard blocking      │  screenType    │  BP / Temp / SpO2 / HR   │         │
│  │  Paste-size limiting     │  PN / DS       │  + 16 more (DS only)     │         │
│  └────────────────────────────────────────┬─────────────────────────────┘         │
│                                           │                                       │
└───────────────────────────────────────────┼───────────────────────────────────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    ▼                       ▼                       ▼
        ┌─────────────────┐   ┌──────────────────────┐   ┌─────────────────────┐
        │ Spring Boot API │   │ ATHMA EHR Gateway     │   │ ATHMA DS Gateway    │
        │ (REST)          │   │ /api/athma-proxy      │   │ /api/athma-proxy    │
        │ - search PN     │   │ EHR_014..EHR_088      │   │ DS_001..DS_012      │
        │ - save/update   │   │ (vitals, drafts,      │   │ (summary CRUD,      │
        │ - doc numbers   │   │  orders, macros)       │   │  review, signoff)   │
        └─────────────────┘   └──────────────────────┘   └─────────────────────┘
```

### 1.2 Navigation Hierarchy

```
PatientChatPage (clinical encounter context)
  │
  ├── ProgressNotesPage (create/draft progress note)
  │     ├── CKEditor (inline rich text)
  │     ├── VitalsSection (BP, Temp, SpO2, HR)
  │     ├── CrossConsultationPage (modal)
  │     ├── MedicationOrderListPage (param: 'PN')
  │     └── InvestigationListPage (modal)
  │
  ├── ProgressNotesEditPage (edit submitted note text)
  │     └── CKEditor (pre-populated)
  │
  ├── ProgressNotesPreviewPage (read-only view)
  │     ├── Acknowledge action
  │     └── Unchart action (2-step)
  │
  ├── PreviousProgressNotesPage (history + filtering)
  │     ├── Consultant multi-select filter
  │     ├── Date range filter
  │     └── Acknowledge status filter
  │
  ├── DischargeSummaryPage (28-section editor)
  │     ├── CKEditor per section (inline inflate)
  │     ├── VitalsSection (20 types)
  │     ├── DischargeCommentsPage (modal)
  │     ├── CopyPreviousNotesPage (modal)
  │     ├── Macro popup (4 eligible sections)
  │     ├── Send for Review flow
  │     ├── SignOff flow
  │     ├── Amend flow
  │     ├── Print/PDF
  │     └── Discharge Intimation
  │
  └── AiDischargeSummaryPage (voice-to-text)
        └── Speech Recognition → AI Generation → Section Mapping
```

### 1.3 Shared Patterns

| Pattern | Progress Notes | Discharge Summary |
|---------|---------------|-------------------|
| **Rich text editor** | CKEditor 5 | CKEditor 5 |
| **Clipboard** | Blocked (paste/copy) | Blocked (paste/copy) |
| **Paste limit** | >30 chars reverted | >30 chars reverted |
| **Macros** | screenType `"PN"` | screenType `"DS"` (4 sections only) |
| **Vitals** | 4 types | ~20 types |
| **Draft support** | Full draft system | DRAFT state in state machine |
| **ATHMA proxy** | EHR_xxx endpoints | DS_xxx + EHR_xxx endpoints |
| **Unsaved changes** | Manual field tracking | `_.cloneDeep()` + `_.isEqual()` |
| **FAB button** | Hidden on editor focus | Hidden on editor focus |

---

## 2. Progress Notes -- Create/Draft Flow

### 2.1 Page Initialization

When `ProgressNotesPage` loads:

```
ionViewWillEnter()
  │
  ├── 1. Load patient info from NavController params
  │     └── Extract: mrn, encounterNumber, admissionDate, procedureDate,
  │         consultantLogin, primaryConsultant
  │
  ├── 2. Calculate PAD / PPD
  │     ├── PAD = moment().diff(admissionDate, 'days')   // Post-Admission Days
  │     └── PPD = moment().diff(procedureDate, 'days')   // Post-Procedure Days
  │
  ├── 3. Load department list
  │     ├── GET employee-category-mappings (filtered by unit)
  │     ├── Populate ng-select dropdown
  │     └── GET getUserLastSelectedDepartment() → pre-select last used
  │
  ├── 4. Check for existing draft
  │     ├── GET via EHR_034 (filter by encounterNumber + login + status=DRAFT)
  │     └── If draft found → populate all fields from draft data
  │
  └── 5. Initialize CKEditor
        ├── Toolbar: ['bold', 'italic', '|', 'bulletedList', 'numberedList']
        ├── Block clipboardInput event
        ├── Block clipboardOutput event
        ├── Monitor paste size (>30 chars → revert to previous content)
        └── Register onFocus → hide FAB, onBlur → show FAB
```

### 2.2 Core Data Model

```typescript
completeProgressNotes = {
  // Patient identifiers
  mrn: string,                    // Medical Record Number
  encounterNumber: string,        // Current encounter/admission
  documentNumber: string,         // Auto-generated via GET api/app-progress-notes-document-no
  pad: number,                    // Post-Admission Days
  ppd: number,                    // Post-Procedure Days

  // Clinical content
  concept: {
    progressNotes: {
      text: string,               // CKEditor HTML content
      acknowledge: {              // Present only if auto-acknowledged
        by: string,               // Primary consultant name
        byLogin: string,          // Consultant login ID
        on: string                // ISO date
      }
    },
    vitals: {},                   // Blood Pressure, Temp, SpO2, HR
    medication: [],               // Ordered medications (from modal)
    investigation: [],            // Ordered investigations (from modal)
    crossConsultation: {          // Single CC entry
      unitId: string,
      remarks: string,
      priority: "NORMAL",
      userId: string
    }
  },

  // Metadata
  status: "DONE" | "DRAFT",
  action: "ADD" | "EDIT",
  actionBy: string,               // Current user login
  submittedDate: string,           // ISO date
  updatedDate: string,             // ISO date
  createdOn: string,               // ISO date
  sourceDepartmentName: string,    // Selected department display name
  sourceDepartmentCode: string     // Selected department code
}
```

### 2.3 Auto-Acknowledgment Logic

When the current user IS the patient's primary consultant, the note is automatically acknowledged at submission time. This bypasses the manual acknowledgment step.

```
Submit triggered
  │
  ├── if (account.login === patientInfoDetails.consultantLogin)
  │     │
  │     └── Auto-acknowledge:
  │           acknowledge = {
  │             by: patientInfoDetails.primaryConsultant,
  │             byLogin: patientInfoDetails.consultantLogin,
  │             on: moment().format()   // current timestamp
  │           }
  │
  └── else (submitter is NOT the primary consultant)
        │
        └── delete concept.progressNotes.acknowledge
            // Note remains unacknowledged
            // Primary consultant must manually acknowledge later
```

### 2.4 Submit Flow (New Note)

```
User taps "Submit"
  │
  ├── 1. VALIDATE
  │     ├── Check BP consistency: if systolic filled, diastolic required (and vice versa)
  │     ├── Check at least one field has content:
  │     │     progressNotes.text OR any vital OR medication.length OR
  │     │     investigation.length OR crossConsultation populated
  │     └── If validation fails → show toast, abort
  │
  ├── 2. BUILD JSON
  │     ├── Generate documentNumber: GET api/app-progress-notes-document-no
  │     ├── Set status = "DONE"
  │     ├── Set action = "ADD"
  │     ├── Apply auto-acknowledge logic (see 2.3)
  │     └── Assemble completeProgressNotes object
  │
  ├── 3. SAVE
  │     └── POST api/progress-notes-record-action
  │           Body: completeProgressNotes
  │           Response: saved note with server-assigned ID
  │
  └── 4. POST-SAVE
        ├── Show success toast
        ├── Clear all form fields
        └── Navigate back to PatientChatPage
```

### 2.5 Draft Flow

Drafts allow clinicians to save work-in-progress and resume later. The draft system uses separate endpoints for each content type.

```
User taps "Save as Draft"
  │
  ├── IF creating new draft (no existing draft):
  │     │
  │     ├── 1. Save draft shell
  │     │     └── POST EHR_034
  │     │           Body: completeProgressNotes with status="DRAFT"
  │     │           Response: { documentNumber, ... }
  │     │
  │     ├── 2. Save draft vitals (if any)
  │     │     └── POST EHR_031
  │     │           Body: vitals object keyed by documentNumber
  │     │
  │     ├── 3. Save draft medications (each individually)
  │     │     └── FOR EACH medication:
  │     │           POST EHR_021
  │     │           Body: single medication order
  │     │
  │     ├── 4. Save draft investigations (each individually)
  │     │     └── FOR EACH investigation:
  │     │           POST EHR_087
  │     │           Body: single investigation order
  │     │
  │     └── 5. Save draft cross-consultation (if present)
  │           └── POST EHR_088
  │                 Body: cross-consultation object
  │
  └── IF updating existing draft:
        │
        ├── 1. Update draft shell
        │     └── PUT EHR_034
        │           Body: updated completeProgressNotes with status="DRAFT"
        │
        ├── 2. Update draft vitals
        │     └── PUT EHR_031 (update) or POST EHR_031 (new vitals)
        │
        ├── 3. Handle medication changes
        │     ├── DELETE removed: EHR_021 DELETE for each removed med
        │     └── POST new: EHR_021 POST for each new med
        │
        ├── 4. Handle investigation changes
        │     ├── DELETE removed: EHR_087 DELETE for each removed inv
        │     └── POST new: EHR_087 POST for each new inv
        │
        └── 5. Handle cross-consultation changes
              ├── DELETE removed: EHR_088 DELETE
              └── POST new: EHR_088 POST
```

### 2.6 Submit from Draft

When submitting a note that was previously saved as a draft, the flow combines draft update with publishing:

```
User taps "Submit" (while editing a draft)
  │
  ├── 1. Save draft vitals → EHR_031 POST/PUT
  │
  ├── 2. Publish medications → EHR_084 POST (batch)
  │
  ├── 3. Publish investigations → EHR_085 POST (batch)
  │
  ├── 4. Publish cross-consultation → EHR_086 POST
  │
  └── 5. Update draft to DONE → EHR_034 PUT
        Body: { ...draft, status: "DONE", action: "ADD" }
```

---

## 3. Progress Notes -- Vitals Entry

### 3.1 Supported Vital Types (Progress Notes)

Progress Notes supports 4 vital types with specific validation rules:

| Vital | Unit | Max Digits | Fields | Validation |
|-------|------|-----------|--------|------------|
| **Blood Pressure** | mmHg | 3 each | Systolic + Diastolic | Both must be filled if either is |
| **Temperature** | F or C (configurable) | 5 | Single value | Auto-converts C to F and vice versa |
| **SpO2** | % | 3 | Single value | Numeric only |
| **Heart Rate** | /bpm | 3 | Single value | Numeric only |

### 3.2 Temperature Conversion

The display unit (F or C) is determined by a facility-level configuration. The system stores both values and auto-converts:

```
User enters temperature
  │
  ├── If unit is Celsius:
  │     fahrenheit = celsius * 9/5 + 32
  │
  └── If unit is Fahrenheit:
        celsius = (fahrenheit - 32) * 5/9
```

### 3.3 Blood Pressure Consistency Validation

```
On submit/draft-save:
  │
  ├── If systolic is filled AND diastolic is empty:
  │     → Error: "Please enter diastolic value"
  │
  ├── If diastolic is filled AND systolic is empty:
  │     → Error: "Please enter systolic value"
  │
  └── If both filled OR both empty:
        → Valid
```

---

## 4. Progress Notes -- Orders (Medication, Investigation, Cross-Consultation)

### 4.1 Order Modals

Progress Notes can launch three order types via modal navigation. Each modal operates independently and returns results to the PN page.

```
ProgressNotesPage
  │
  ├── "Add Medication" button
  │     └── Opens MedicationOrderListPage
  │           param: context = 'PN'
  │           Returns: medication[] array
  │           Appended to: concept.medication
  │
  ├── "Add Investigation" button
  │     └── Opens InvestigationListPage
  │           modal: true
  │           Returns: investigation[] array
  │           Appended to: concept.investigation
  │
  └── "Cross Consultation" button
        └── Opens CrossConsultationPage
              modal: true
              Returns: { unitId, remarks, priority, userId }
              Set on: concept.crossConsultation
```

### 4.2 Cross-Consultation Structure

```typescript
crossConsultation = {
  unitId: string,           // Target department/unit ID
  remarks: string,          // Reason for consultation
  priority: "NORMAL",       // Always "NORMAL" from PN context
  userId: string            // Target consultant user ID
}
```

### 4.3 Draft Order Persistence

Each order type uses its own ATHMA endpoint for draft persistence:

| Order Type | Create | Delete |
|-----------|--------|--------|
| Medication | `EHR_021 POST` (per item) | `EHR_021 DELETE` (per item) |
| Investigation | `EHR_087 POST` (per item) | `EHR_087 DELETE` (per item) |
| Cross-Consultation | `EHR_088 POST` | `EHR_088 DELETE` |

When the draft is submitted (moved to DONE), orders are published via batch endpoints:

| Order Type | Publish Endpoint |
|-----------|-----------------|
| Medication | `EHR_084 POST` |
| Investigation | `EHR_085 POST` |
| Cross-Consultation | `EHR_086 POST` |

---

## 5. Progress Notes -- Edit / Preview / Acknowledge / Unchart

### 5.1 Edit Flow (ProgressNotesEditPage, 354 lines)

Edit mode is restricted to the **notes text only** -- vitals, medications, investigations, and cross-consultations cannot be modified after submission.

```
User taps "Edit" on a submitted note
  │
  ├── 1. Load existing note
  │     └── GET via EHR_034 (by documentNumber)
  │
  ├── 2. Inflate CKEditor with existing text
  │     └── concept.progressNotes.text → editor content
  │
  ├── 3. User edits text
  │
  └── 4. Save
        └── PUT api/progress-notes-record-action
              Body: { ...note, action: "EDIT", concept.progressNotes.text: updatedText }
```

### 5.2 Preview Flow (ProgressNotesPreviewPage, 453 lines)

Read-only view of a submitted note. Displays all sections (text, vitals, orders) with two conditional action buttons.

```
ProgressNotesPreviewPage loads
  │
  ├── Render note content (read-only)
  │     ├── progressNotes.text (HTML rendered)
  │     ├── Vitals table
  │     ├── Medication list
  │     ├── Investigation list
  │     └── Cross-consultation details
  │
  ├── Show "Acknowledge" button IF:
  │     ├── Note is NOT self-submitted (actionBy !== current login)
  │     └── Note is NOT already acknowledged (acknowledge field absent)
  │
  └── Show "Unchart" button IF:
        └── User has unchart permission
```

### 5.3 Acknowledge Flow

```
User taps "Acknowledge"
  │
  └── POST EHR_032
        Body: {
          documentNumber,
          acknowledge: {
            by: currentUser.displayName,
            byLogin: currentUser.login,
            on: moment().format()
          }
        }
        Response: updated note
        → Acknowledge button disappears
        → Note marked as acknowledged in list view
```

### 5.4 Unchart Flow (2-step)

Uncharting marks a note as retracted without deleting it. The text is rendered with strikethrough styling.

```
User taps "Unchart"
  │
  ├── Step 1: Fetch current note
  │     └── GET EHR_034 (by note ID / documentNumber)
  │           Response: full note object
  │
  ├── Step 2: Confirm unchart (alert dialog)
  │     └── User confirms
  │
  └── Step 3: Apply unchart
        └── PUT EHR_034
              Body: {
                ...note,
                unchart: {
                  by: currentUser.displayName,
                  byLogin: currentUser.login,
                  on: moment().format()
                }
              }
              Response: updated note
              → Note text wrapped in <s> tags (strikethrough)
              → Note visually marked as uncharted
```

### 5.5 Uncharted Text Rendering

After unchart, the note text is rendered with HTML strikethrough:

```html
<!-- Before unchart -->
<p>Patient showing improvement. Continue current medications.</p>

<!-- After unchart -->
<s><p>Patient showing improvement. Continue current medications.</p></s>
```

---

## 6. Progress Notes -- History & Filtering

### 6.1 Previous Progress Notes Page (439 lines)

`PreviousProgressNotesPage` displays a chronological list of all progress notes for the current encounter with filtering capabilities.

### 6.2 Data Loading

```
ionViewWillEnter()
  │
  ├── 1. GET api/_search/progress-notes-with-vitals
  │     Params: encounterNumber, page, size
  │     Response: paginated note list with embedded vitals
  │
  ├── 2. GET api/_search/distinct-progress-notes-consultant
  │     Params: encounterNumber
  │     Response: distinct consultant list for filter dropdown
  │
  └── 3. Render list sorted by submittedDate descending
```

### 6.3 Filter System

Three independent filters can be combined:

```
┌─────────────────────────────────────────────────────────────────┐
│  FILTERS                                                         │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  By Consultant (multi-select)                             │   │
│  │  ┌─────────┐ ┌──────────┐ ┌────────────┐                │   │
│  │  │ Dr. Rao │ │ Dr. Kumar│ │ Dr. Sharma │ ...             │   │
│  │  └─────────┘ └──────────┘ └────────────┘                │   │
│  │                                                          │   │
│  │  Constructs query: "drrao OR drkumar OR drsharma"        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  By Date Range                                            │   │
│  │  From: [2024-01-15]  To: [2024-01-20]                    │   │
│  │                                                          │   │
│  │  Constructs query: "2024-01-15 TO 2024-01-20"            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Acknowledge Filter                                       │   │
│  │  [✓] Show only unacknowledged notes                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 6.4 Consultant Filter Query Construction

```typescript
// Multi-select returns array of consultant logins
selectedConsultants = ["drrao", "drkumar", "drsharma"];

// Construct Elasticsearch-style query string
consultantQuery = selectedConsultants.join(" OR ");
// Result: "drrao OR drkumar OR drsharma"

// Passed to API:
GET api/_search/progress-notes?consultantLogin=drrao OR drkumar OR drsharma
```

### 6.5 Date Range Filter Query

```typescript
fromDate = "2024-01-15";
toDate = "2024-01-20";

dateQuery = `${fromDate} TO ${toDate}`;
// Result: "2024-01-15 TO 2024-01-20"

// Passed to API:
GET api/_search/progress-notes?submittedDate=2024-01-15 TO 2024-01-20
```

---

## 7. Discharge Summary -- 28 Sections & State Machine

### 7.1 The 28 Default Summary Sections

The Discharge Summary is composed of 28 predefined widget sections. Each section can be independently toggled on/off, edited with CKEditor, and may contain both free-text notes and structured records synced from the EHR.

```
┌────────────────────────────────────────────────────────────────────────┐
│  DISCHARGE SUMMARY SECTIONS                                            │
│                                                                        │
│  ── HISTORY ──────────────────────────────────────────────────────     │
│  1.  admission-reason                                                  │
│  2.  chief-complaint                                                   │
│  3.  medical-history                                                   │
│  4.  surgical-history                                                  │
│  5.  family-history                                                    │
│  6.  social-history                                                    │
│  7.  past-medication-history                                           │
│  8.  comorbidities                                                     │
│                                                                        │
│  ── EXAMINATION ──────────────────────────────────────────────────     │
│  9.  vital-sign                                                        │
│  10. allergy                                                           │
│  11. general-examination                                               │
│  12. systemic-examination                                              │
│                                                                        │
│  ── DIAGNOSIS & INVESTIGATION ────────────────────────────────────    │
│  13. investigation-results                                             │
│  14. provisional-diagnosis                                             │
│  15. final-diagnosis                                                   │
│  16. diagnosis                                                         │
│                                                                        │
│  ── TREATMENT ────────────────────────────────────────────────────    │
│  17. medication-at-discharge                                           │
│  18. active-medication                                                 │
│  19. cross-consultation                                                │
│  20. operation-and-procedure                                           │
│  21. urgent-care                                                       │
│  22. discharge-summary-emergency-management                            │
│                                                                        │
│  ── DISCHARGE ────────────────────────────────────────────────────    │
│  23. condition-at-discharge                                            │
│  24. discharge-advice                                                  │
│  25. dietary-advice                                                    │
│  26. therapy-advice                                                    │
│  27. follow-up                                                         │
│  28. cause-of-death                                                    │
└────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Section Operations

Each section supports three operations:

```
inflateNotes(id, key, widgetName)
  │
  └── Opens inline CKEditor for a specific section
        ├── id: section element ID for scroll positioning
        ├── key: data key in summary object
        └── widgetName: section identifier string

toggleWidget(widgetName, status)
  │
  └── Toggles entire widget section on/off
        ├── status: true = visible, false = hidden
        └── Hidden widgets excluded from validation and print

inflateRecordItems(index, widgetName, status)
  │
  └── Toggles individual records within a widget
        ├── index: record position in array
        ├── status: true = included, false = excluded
        └── Granular control over synced EHR records
```

### 7.3 State Machine (7 States)

The Discharge Summary follows a strict 7-state lifecycle. Each state determines which UI controls are enabled.

```
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

### 7.4 State-to-Flag Mapping

| Status | editMode | draftFlag | sendForReviewFlag | signOffFlag | reviewFlag | amendFlag |
|--------|----------|-----------|-------------------|-------------|------------|-----------|
| **NEW** | `false` | `false` | `false` | `false` | `false` | `false` |
| **DRAFT** | `true` | `true` | `true` | `false` | `false` | `false` |
| **PENDING_REVIEW** (reviewer) | `true` | `false` | `false` | `true` | `true` | `false` |
| **PENDING_REVIEW** (other) | `false` | `false` | `false` | `false` | `false` | `false` |
| **REVIEWED** | `true` | `false` | taskId ? `true` : `false` | `false` | `false` | `false` |
| **PUBLISHED** | `false` | `false` | `false` | `false` | `false` | `true` |
| **AMENDED** | `false` | `false` | `false` | `false` | `false` | `true` |

Key observations:
- **editMode** controls whether CKEditor sections are editable
- **PENDING_REVIEW** has two sub-states: only the assigned reviewer can edit and sign off
- **REVIEWED** conditionally shows sendForReviewFlag based on whether a taskId exists
- **PUBLISHED** and **AMENDED** only allow the amend action

### 7.5 Unsaved Changes Detection

```typescript
// On page load, deep clone the initial state
originalSummary = _.cloneDeep(dischargeSummary);

// Before navigation away or status change
hasUnsavedChanges(): boolean {
  return !_.isEqual(originalSummary, dischargeSummary);
}

// If unsaved changes detected → show confirmation dialog
// "You have unsaved changes. Discard?"
```

---

## 8. Discharge Summary -- Review/SignOff Workflow

### 8.1 Send for Review

```
User taps "Send for Review" (from DRAFT or AMENDED state)
  │
  ├── 1. Show reviewer selection dialog
  │     ├── Pre-selects primaryConsultant as default reviewer
  │     └── User can change to another consultant
  │
  ├── 2. Save current summary state
  │     └── PUT DS endpoint with current section data
  │
  └── 3. Submit for review
        └── POST sendForReview endpoint
              Body: { reviewerId, encounterNumber, ... }
              → Status changes to PENDING_REVIEW
              → Reviewer receives notification/task
```

### 8.2 Review (Reviewer Action)

```
Reviewer opens DS in PENDING_REVIEW state
  │
  ├── Can edit any section (editMode = true)
  ├── Can add comments (see Section 9)
  │
  └── Taps "Review Complete"
        └── POST review endpoint
              → Status changes to REVIEWED
              → Submitter can now sign off
```

### 8.3 Sign Off

```
User taps "Sign Off" (from REVIEWED state)
  │
  ├── 1. Validate mandatory widgets
  │     └── validateMandatoryWidgets():
  │           FOR EACH widget marked as mandatory:
  │             Check widget has notes OR records (dbrecord=true)
  │             If missing → collect widget names for error message
  │
  ├── 2. Validate all BP values
  │     └── validateAllBPValues():
  │           Check BP consistency across all vital entries
  │
  ├── 3. Validate summary completeness
  │     └── validateSummary():
  │           At least ONE widget must have dbrecord=true
  │           (prevents empty discharge summaries)
  │
  ├── 4. If validation passes:
  │     └── POST signOff endpoint
  │           Body: { signOffBy: currentUser, ... }
  │           → Status changes to PUBLISHED
  │           → Summary becomes read-only
  │           → PDF generation available
  │
  └── 5. If validation fails:
        └── Show error listing missing mandatory widgets
```

### 8.4 Amend

```
User taps "Amend" (from PUBLISHED or AMENDED state)
  │
  ├── 1. Enable editing
  │     └── editMode = true
  │
  ├── 2. Push new amend detail
  │     └── amendDetails.push({
  │           amendedBy: currentUser,
  │           amendedOn: moment().format(),
  │           reason: "" // filled before saving
  │         })
  │
  └── 3. After editing, user can:
        ├── Save as draft → AMENDED state
        └── Send for review → PENDING_REVIEW state (cycle repeats)
```

---

## 9. Discharge Summary -- Comments System

### 9.1 Comment Structure

```typescript
comment = {
  commentedBy: {
    id: string,
    login: string,
    displayName: string,
    // ...additional user fields
  },
  commentedOn: string,       // ISO timestamp
  comment: string            // Free text
}
```

### 9.2 Access Rules

- Comments can only be added during **PENDING_REVIEW** state
- Only the **assigned reviewer** can add comments
- Comments are read-only for all other users and states

### 9.3 Comment Flow

```
Reviewer taps "Add Comment" (DischargeCommentsPage, 125 lines)
  │
  ├── 1. Display existing comments
  │     └── Sorted by commentedOn descending (newest first)
  │
  ├── 2. Reviewer types comment text
  │
  ├── 3. Save comment
  │     └── POST comment endpoint
  │           Body: { comment, commentedBy: currentUserObject, commentedOn: now }
  │
  └── 4. Cache comments in SecureStorage
        └── Key: encounterNumber + '_ds_comments'
              Purpose: offline availability + faster reload
```

---

## 10. Discharge Summary -- Vitals (20 Types)

### 10.1 Complete Vital Type Reference

The Discharge Summary supports a significantly expanded vitals set compared to Progress Notes (4 types).

| # | Vital | Unit | Fields | Notes |
|---|-------|------|--------|-------|
| 1 | **Blood Pressure (Standard)** | mmHg | Systolic + Diastolic | Same validation as PN |
| 2 | **Blood Pressure (Lying)** | mmHg | Systolic + Diastolic | Position-specific |
| 3 | **Blood Pressure (Standing)** | mmHg | Systolic + Diastolic | Position-specific |
| 4 | **Blood Pressure (Sitting)** | mmHg | Systolic + Diastolic | Position-specific |
| 5 | **Heart Rate** | /bpm | Single value | Max 3 digits |
| 6 | **Temperature** | F or C | Single value | Auto-convert C<>F |
| 7 | **SpO2** | % | Single value | Max 3 digits |
| 8 | **SpO2 (O2 Support)** | % | Single value | With supplemental O2 |
| 9 | **SpO2 (Room Air)** | % | Single value | Without supplemental O2 |
| 10 | **Respiratory Rate** | /min | Single value | -- |
| 11 | **Conscious Level** | -- | Selection | GCS or similar scale |
| 12 | **MEWS Score** | -- | Calculated | Modified Early Warning Score |
| 13 | **Height** | cm or in | Single value | Configurable unit |
| 14 | **Weight** | kg or lb | Single value | Configurable unit |
| 15 | **BMI** | kg/m2 | Calculated | Auto from height + weight |
| 16 | **BSA** | m2 | Calculated | Body Surface Area |
| 17 | **Head Circumference** | cm | Single value | Pediatric |
| 18 | **Waist** | cm | Single value | -- |
| 19 | **Hip** | cm | Single value | -- |
| 20 | **WHR** | ratio | Calculated | Waist-to-Hip Ratio |
| 21 | **Fall Score** | -- | Score value | Fall risk assessment |
| 22 | **Pain Score** | 0-10 | Score value | Pain scale |

### 10.2 BP Position Variants

```
Blood Pressure Section
  │
  ├── Standard BP
  │     Systolic: [___] / Diastolic: [___] mmHg
  │
  ├── Lying BP
  │     Systolic: [___] / Diastolic: [___] mmHg
  │
  ├── Standing BP
  │     Systolic: [___] / Diastolic: [___] mmHg
  │
  └── Sitting BP
        Systolic: [___] / Diastolic: [___] mmHg
```

Each BP variant follows the same consistency validation (both systolic and diastolic required if either is entered).

---

## 11. Discharge Summary -- Copy Previous / Regenerate / Sync

### 11.1 Copy Previous Admission (CopyPreviousNotesPage, 100 lines)

Copies the entire discharge summary from a previous admission of the same patient.

```
User taps "Copy Previous"
  │
  ├── 1. Search previous admissions
  │     └── GET DS_005
  │           Params: mrn (excluding current encounterNumber)
  │           Response: list of previous admission summaries
  │
  ├── 2. User selects a previous admission
  │     └── Displays: admission date, discharge date, consultant
  │
  └── 3. Copy
        └── PUT DS_006
              Body: { sourceEncounterNumber, targetEncounterNumber }
              → Server-side copy: replaces ENTIRE current summary
              → All 28 sections overwritten
              → User warned: "This will replace your current summary"
```

### 11.2 Regenerate from Scratch

```
User taps "Regenerate"
  │
  ├── 1. Show warning dialog
  │     └── "Your changes will be lost. Continue?"
  │
  ├── 2. User confirms
  │
  └── 3. Regenerate
        └── GET DS_004
              Params: admissionNumber
              Response: fresh summary built from current EHR data
              → Replaces all sections with regenerated content
              → Discards all manual edits
```

### 11.3 Sync from EHR (Per Section)

Unlike Copy Previous and Regenerate which replace the entire summary, Sync updates individual sections from the live EHR data while preserving free-text notes.

```
User taps "Sync" on a specific section
  │
  └── POST DS_011
        Body: {
          encounterNumber,
          widgetType: "investigation-results"  // or any section name
        }
        Response: latest EHR records for that section
        │
        └── Merge behavior:
              ├── Records: REPLACED with latest from EHR
              └── Notes (free text): PRESERVED (not overwritten)
```

---

## 12. Discharge Summary -- Discharge Intimation

### 12.1 Intimate (Schedule Discharge)

```
User taps "Intimate Discharge"
  │
  ├── 1. Fill required fields:
  │     ├── Consultant (required)
  │     ├── Department (required)
  │     ├── Planned discharge date (required, must be future)
  │     └── Planned discharge time (required)
  │
  └── 2. Submit
        └── PUT DS_012
              Body: {
                encounterNumber,
                consultant,
                department,
                plannedDischargeDate,
                plannedDischargeTime
              }
              → Creates discharge intimation record
              → ADT team notified
```

### 12.2 Revert Intimation

```
User taps "Revert Intimation"
  │
  ├── 1. Fill required fields:
  │     ├── Consultant (required)
  │     ├── Department (required)
  │     └── Remarks / reason for reverting (required)
  │
  └── 2. Submit
        └── PUT ADT_002
              Body: {
                encounterNumber,
                consultant,
                department,
                remarks,
                reverted: true
              }
              → Cancels discharge intimation
              → Patient remains admitted
```

---

## 13. Discharge Summary -- Print/PDF

### 13.1 PDF Generation Flow

```
User taps "Print / Download PDF"
  │
  ├── 1. Request PDF
  │     └── GET DS_007
  │           Params: encounterNumber
  │           Response: PDF blob (application/pdf)
  │
  ├── 2. Write to filesystem
  │     └── Capacitor Filesystem.writeFile()
  │           Path: /Documents/DS_{encounterNumber}.pdf
  │
  └── 3. Open PDF viewer
        └── Navigate to PdfsummaryPage
              Params: { filePath, title: "Discharge Summary" }
              → Rendered in in-app PDF viewer
```

---

## 14. AI Discharge Summary (Voice-to-Text, Auto-Generate)

### 14.1 Technology Stack

```
┌─────────────────────────────────────────────────────┐
│  AI DISCHARGE SUMMARY                                │
│                                                      │
│  @capacitor-community/speech-recognition             │
│  └── Native speech-to-text engine                    │
│                                                      │
│  @capacitor-community/keep-awake                     │
│  └── Prevents screen sleep during dictation          │
│                                                      │
│  AI EMR Backend                                      │
│  └── Transcript → structured clinical data           │
└─────────────────────────────────────────────────────┘
```

### 14.2 Voice Dictation Flow

```
AiDischargeSummaryPage (518 lines)
  │
  ├── 1. Request Permission
  │     └── SpeechRecognition.requestPermission()
  │           → Microphone access prompt
  │
  ├── 2. Start Listening
  │     └── SpeechRecognition.start({
  │           language: 'en-US',
  │           partialResults: true,     // Real-time partial transcript
  │           popup: false,             // No native speech UI
  │           allowForSilence: 10000    // 10 second silence tolerance
  │         })
  │
  ├── 3. Real-time Transcript Display
  │     ├── Partial results → update transcript area in real time
  │     └── Final results → append to accumulated transcript
  │
  ├── 4. Inactivity Monitor
  │     ├── Timer checks if transcript unchanged for 10 seconds
  │     └── If unchanged → auto-restart speech recognition
  │           (handles speech engine timeouts / silences)
  │
  ├── 5. Voice Command Detection
  │     └── Monitor transcript for termination phrases:
  │           ├── "EMR done"
  │           ├── "E M R done"
  │           └── "EMI done"         // common misrecognition
  │           → Automatically triggers generation step
  │
  └── 6. Keep Awake
        └── KeepAwake.keepAwake()
              → Screen stays on during entire dictation session
```

### 14.3 Sentence Merging

Speech recognition often produces overlapping segments. The `mergeOverlappingSentences()` function deduplicates these.

```
Input segments:
  "Patient presents with fever and cough"
  "fever and cough for three days"
  "for three days with body pain"

After mergeOverlappingSentences():
  "Patient presents with fever and cough for three days with body pain"
```

The algorithm detects overlapping suffixes/prefixes and merges them into a continuous transcript.

### 14.4 AI Generation Flow

```
User taps "Generate" (or voice command detected)
  │
  ├── 1. Stop speech recognition
  │     └── SpeechRecognition.stop()
  │
  ├── 2. Prepare transcript
  │     └── mergeOverlappingSentences() → clean transcript
  │
  ├── 3. Send to AI
  │     └── POST AI EMR endpoint
  │           Body: { transcript, encounterNumber, ... }
  │           Response: {
  │             widgets: {
  │               "chief-complaint": { notes: "...", records: [...] },
  │               "medical-history": { notes: "...", records: [...] },
  │               ... (up to 28 sections)
  │             }
  │           }
  │
  ├── 4. Map AI response to 28 sections
  │     └── FOR EACH section in AI response:
  │           Map to corresponding DS widget
  │           Merge notes and records
  │
  ├── 5. Staff Review Screen
  │     ├── Display all AI-populated sections
  │     ├── Staff can edit any section
  │     ├── Staff can remove individual items
  │     └── Staff can add missing information
  │
  └── 6. Save
        └── POST to EHR endpoint
              Body: { ...summary, finishConsultation: true }
              → Creates/updates discharge summary with AI content
```

---

## 15. CKEditor & Macro System (Shared)

### 15.1 CKEditor Configuration

Both Progress Notes and Discharge Summary use identical CKEditor 5 configuration:

```typescript
editorConfig = {
  toolbar: {
    items: ['bold', 'italic', '|', 'bulletedList', 'numberedList']
  }
}
```

Features intentionally limited to:
- **Bold** and **Italic** text formatting
- **Bulleted** and **Numbered** lists
- No headings, links, images, tables, or other rich elements

### 15.2 Clipboard Blocking

```typescript
// On editor ready:
editor.plugins.get('ClipboardPipeline').on('clipboardInput', (evt) => {
  evt.stop();   // Block paste from external sources
});

editor.plugins.get('ClipboardPipeline').on('clipboardOutput', (evt) => {
  evt.stop();   // Block copy to clipboard
});
```

Purpose: prevents PHI (Protected Health Information) leakage via copy/paste.

### 15.3 Large Paste Detection

Even though clipboard is blocked, some input methods may bypass the event. A secondary guard catches large pastes:

```
Editor content changes
  │
  ├── Calculate content length delta
  │
  ├── If delta > 30 characters (single change):
  │     └── REVERT: restore previous editor content
  │         → Effectively blocks bulk paste attempts
  │
  └── If delta <= 30 characters:
        └── Accept change (normal typing)
```

### 15.4 FAB Button Behavior

```
CKEditor gains focus
  └── Hide floating action button (FAB)
        → Prevents FAB from overlapping keyboard/editor

CKEditor loses focus
  └── Show floating action button (FAB)
```

### 15.5 Macro System

Macros are reusable text templates that clinicians can save and apply to speed up documentation.

#### Macro Context Mapping

| System | screenType | Eligible Sections |
|--------|-----------|-------------------|
| **Progress Notes** | `"PN"` | Progress Notes text (all) |
| **Discharge Summary** | `"DS"` | therapy-advice, dietary-advice, urgent-care, discharge-advice (4 sections only) |

#### Save Macro Flow

```
User taps "Save as Macro"
  │
  ├── Progress Notes:
  │     └── POST macro save endpoint
  │           Body: {
  │             widgetName: 'Progress Notes',
  │             widgetType: 'progress-notes',
  │             screenType: 'PN',
  │             content: editorContent,
  │             macroName: userProvidedName
  │           }
  │
  └── Discharge Summary:
        └── POST EHR_141
              Body: {
                widgetName: sectionDisplayName,    // e.g., "Therapy Advice"
                widgetType: sectionKey,            // e.g., "therapy-advice"
                screenType: 'DS',
                content: editorContent,
                macroName: userProvidedName
              }
```

#### DS Widget-to-Macro Mapping

| Widget Key | Widget Display Name | Macro Eligible |
|-----------|-------------------|----------------|
| `therapy-advice` | Therapy Advice | Yes |
| `dietary-advice` | Dietary Advice | Yes |
| `urgent-care` | Urgent Care | Yes |
| `discharge-advice` | Discharge Advice | Yes |
| All other 24 sections | -- | No |

#### Apply Macro Flow

```
User taps "Macros" button
  │
  ├── 1. Open macros popup
  │     └── Params: { screenType: "PN" or "DS" }
  │
  ├── 2. Load saved macros
  │     └── GET macros by screenType + widgetType
  │           Response: list of { macroName, content }
  │
  ├── 3. User selects macro
  │
  └── 4. Apply to editor
        └── Replace or append editor content with macro content
```

---

## 16. Complete API Reference

### 16.1 Progress Notes -- Direct REST Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `api/_search/progress-notes` | Search previous progress notes (with filters) |
| `GET` | `api/_search/progress-notes-with-vitals` | Search PN with embedded vitals data |
| `POST` | `api/progress-notes-record-action` | Save new progress note / update existing |
| `GET` | `api/app-progress-notes-document-no` | Generate unique document number |
| `GET` | `api/_search/progress-notes-medication-order-records` | Fetch PN medication orders |
| `GET` | `api/_search/progress-notes-investigation-order-records` | Fetch PN investigation orders |
| `GET` | `api/_search/ehr-cross-consultation-records` | Fetch cross-consultation records |
| `GET` | `api/_search/distinct-progress-notes-consultant` | Get distinct consultants for filter |
| `POST` | `api/_search/latest-progress-notes-by-login` | Get latest PN by specific login |

### 16.2 Progress Notes -- ATHMA Endpoints

| Code | Method | Purpose |
|------|--------|---------|
| `EHR_014` | -- | Employee category mappings (department list) |
| `EHR_019` | -- | User's last selected department |
| `EHR_021` | `POST` | Save draft medication order (individual) |
| `EHR_021` | `DELETE` | Delete draft medication order (individual) |
| `EHR_030` | -- | Vitals configuration (units, ranges) |
| `EHR_031` | `POST` | Save draft vitals |
| `EHR_031` | `PUT` | Update draft vitals |
| `EHR_032` | `POST` | Acknowledge progress note |
| `EHR_034` | `POST` | Create draft progress note |
| `EHR_034` | `PUT` | Update draft / unchart progress note |
| `EHR_034` | `GET` | Fetch progress note by ID/documentNumber |
| `EHR_083` | -- | Progress notes lookup/search |
| `EHR_084` | `POST` | Publish draft medications (batch) |
| `EHR_085` | `POST` | Publish draft investigations (batch) |
| `EHR_086` | `POST` | Publish draft cross-consultation |
| `EHR_087` | `POST` | Save draft investigation order (individual) |
| `EHR_087` | `DELETE` | Delete draft investigation order (individual) |
| `EHR_088` | `POST` | Save draft cross-consultation |
| `EHR_088` | `DELETE` | Delete draft cross-consultation |
| `ADT_001` | -- | Patient admission details (MRN, encounter, dates) |

### 16.3 Discharge Summary -- ATHMA Endpoints

| Code | Method | Purpose |
|------|--------|---------|
| `DS_001` | -- | Load discharge summary (main) |
| `DS_002` | -- | Save discharge summary draft |
| `DS_003` | -- | Send for review |
| `DS_004` | `GET` | Regenerate summary from scratch |
| `DS_005` | `GET` | Search previous admissions (for copy) |
| `DS_006` | `PUT` | Copy previous admission summary |
| `DS_007` | `GET` | Download PDF blob |
| `DS_008` | -- | Review complete |
| `DS_009` | -- | Sign off summary |
| `DS_010` | -- | Amend published summary |
| `DS_011` | `POST` | Sync single section from EHR |
| `DS_012` | `PUT` | Create discharge intimation |
| `ADT_001` | -- | Patient admission details |
| `ADT_002` | `PUT` | Revert discharge intimation |
| `ADT_005` | -- | ADT configuration/lookup |
| `EHR_029` | -- | Vitals data for DS |
| `EHR_141` | `POST` | Save macro (DS context) |
| `MDM_001` | -- | Master data lookup |
| `AMB_004` | -- | Ambulatory / outpatient data |

### 16.4 AI Discharge Summary Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | AI EMR endpoint | Send transcript, receive structured widget data |
| `POST` | EHR save endpoint | Save AI-generated summary with `finishConsultation: true` |

---

## 17. Error Handling

### 17.1 Progress Notes Errors

| Scenario | Handling |
|----------|---------|
| BP consistency failure | Toast: "Please enter both systolic and diastolic values" |
| Empty note submission | Toast: "Please enter at least one field" |
| Draft save failure | Toast with ATHMA error, form state preserved |
| Submit failure | Toast with error, data not cleared (can retry) |
| Network error during acknowledge | Toast, note remains unacknowledged |
| Unchart fetch failure (Step 1) | Toast, unchart aborted |
| Document number generation failure | Submit blocked, toast error |
| Draft load failure on page init | Page loads empty (new note mode) |

### 17.2 Discharge Summary Errors

| Scenario | Handling |
|----------|---------|
| Mandatory widget missing at sign-off | Error listing all missing widget names |
| BP consistency failure | Validation error, sign-off blocked |
| Empty summary at sign-off | Error: "At least one section must have content" |
| Copy previous failure | Toast, current summary unchanged |
| Regenerate failure | Toast, current summary unchanged |
| Sync failure (DS_011) | Toast, section unchanged |
| PDF generation failure | Toast, no file written |
| Review submit failure | Toast, status unchanged |
| Sign-off failure | Toast, status remains REVIEWED |
| Unsaved changes on navigate away | Confirmation dialog, user can cancel navigation |
| Speech recognition permission denied | Toast, dictation unavailable |
| AI generation failure | Toast, transcript preserved for retry |
| AI response mapping failure | Partial section population, unmapped data logged |

### 17.3 CKEditor Errors

| Scenario | Handling |
|----------|---------|
| Large paste detected (>30 chars) | Silent revert to previous content |
| Clipboard event blocked | Silent prevention (no user notification) |
| Editor initialization failure | Fallback to plain textarea (graceful degradation) |

---

## 18. Edge Cases

### 18.1 Progress Notes Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| **User is both submitter and primary consultant** | Auto-acknowledged, no acknowledge button shown on preview |
| **Draft exists when creating new note** | Existing draft loaded automatically, cannot have multiple drafts per encounter |
| **Unchart an already-uncharted note** | Prevented (unchart button not shown if unchart field exists) |
| **Edit after acknowledge** | Edit only changes text, acknowledge status preserved |
| **PAD/PPD when no admissionDate/procedureDate** | Calculated as 0 or omitted |
| **Temperature entered in wrong unit** | Auto-converts based on facility config, stores both C and F |
| **Cross-consultation with self** | Not explicitly prevented in UI but may be rejected by backend |
| **Draft with orders then delete all orders** | Draft shell remains with empty medication/investigation arrays |
| **Multiple rapid submits** | Loading spinner blocks duplicate submissions |
| **Consultant filter with special characters in login** | Passed as-is in OR query; may need encoding |

### 18.2 Discharge Summary Edge Cases

| Edge Case | Behavior |
|-----------|----------|
| **Non-reviewer opens PENDING_REVIEW summary** | Read-only mode (editMode=false, all action flags false) |
| **Reviewer is same as submitter** | Allowed; self-review is possible |
| **Amend a summary, then amend again** | Each amend pushes to amendDetails array; full audit trail |
| **Copy previous overwrites unsaved edits** | Warning shown; copy replaces everything server-side |
| **Regenerate after extensive manual editing** | Warning shown: "Your changes will be lost" |
| **Sync section that has no EHR data** | Section records cleared, notes preserved |
| **PDF requested for incomplete summary** | PDF generated with available data (no sign-off required for PDF) |
| **Discharge intimation with past date** | Validation prevents; date must be future |
| **Revert intimation when none exists** | Button not shown if no active intimation |
| **28th section (cause-of-death) visibility** | Likely conditional on discharge type (death vs. alive) |
| **AI transcript is empty** | Generate button disabled or shows error |
| **Speech recognition restarts endlessly** | 10-second inactivity check prevents infinite restart loops |
| **Voice command misrecognized** | "EMI done" accepted as alias for "EMR done" |
| **Two users editing same DS concurrently** | Last save wins; no real-time collaboration/locking |
| **SecureStorage full for comments cache** | Graceful fallback to server fetch only |
| **All 28 sections toggled off** | validateSummary() fails at sign-off: "at least one widget required" |

---

## 19. Implementation Checklist

### 19.1 Shared Infrastructure

- [ ] CKEditor 5 integration with restricted toolbar (bold, italic, lists)
- [ ] Clipboard blocking (clipboardInput + clipboardOutput events)
- [ ] Large paste detection and revert (>30 char threshold)
- [ ] FAB hide/show on editor focus/blur
- [ ] Macro system -- save and apply with screenType routing
- [ ] ATHMA proxy integration with token management

### 19.2 Progress Notes -- Create/Draft

- [ ] Page initialization with patient context (MRN, encounter, dates)
- [ ] PAD/PPD calculation from admission/procedure dates
- [ ] Department selection (ng-select, employee-category-mappings, last-selected memory)
- [ ] CKEditor for notes text
- [ ] Vitals capture: Blood Pressure (systolic + diastolic, consistency validation)
- [ ] Vitals capture: Temperature (C/F auto-conversion)
- [ ] Vitals capture: SpO2 (%, max 3 digits)
- [ ] Vitals capture: Heart Rate (/bpm, max 3 digits)
- [ ] Auto-acknowledgment logic (self vs. other)
- [ ] Submit flow with validation
- [ ] Draft create flow (EHR_034 POST + EHR_031 + individual orders)
- [ ] Draft update flow (EHR_034 PUT + delta management)
- [ ] Submit-from-draft flow (publish orders via EHR_084/085/086)
- [ ] Document number generation (api/app-progress-notes-document-no)
- [ ] Loading state and duplicate submission prevention

### 19.3 Progress Notes -- Orders

- [ ] Cross-Consultation modal integration (CrossConsultationPage)
- [ ] Medication Orders modal integration (MedicationOrderListPage, param 'PN')
- [ ] Investigation Orders modal integration (InvestigationListPage)
- [ ] Draft order persistence (EHR_021, EHR_087, EHR_088 CRUD)
- [ ] Order publish on submit (EHR_084, EHR_085, EHR_086 batch)

### 19.4 Progress Notes -- Edit/Preview/History

- [ ] Edit page: load note, CKEditor pre-population, text-only update (action="EDIT")
- [ ] Preview page: read-only rendering of all sections
- [ ] Acknowledge button (conditional: not self-submitted, not yet acknowledged)
- [ ] Acknowledge action (EHR_032 POST)
- [ ] Unchart flow: 2-step (fetch → confirm → apply unchart with EHR_034 PUT)
- [ ] Uncharted text rendering with `<s>` strikethrough
- [ ] Previous PN list with pagination
- [ ] Consultant multi-select filter (OR query construction)
- [ ] Date range filter (YYYY-MM-DD TO YYYY-MM-DD query)
- [ ] Acknowledge status filter toggle
- [ ] Distinct consultant list loading for filter dropdown

### 19.5 Discharge Summary -- Core

- [ ] 28-section widget framework
- [ ] Section inflate (inline CKEditor per section)
- [ ] Section toggle (widget on/off)
- [ ] Record item toggle (individual record include/exclude)
- [ ] 7-state machine implementation with flag mapping
- [ ] State-dependent UI controls (editMode, action buttons)
- [ ] Unsaved changes detection (lodash cloneDeep + isEqual)
- [ ] Mandatory widget validation
- [ ] BP consistency validation (across all BP variants)
- [ ] Summary completeness validation (at least one dbrecord=true)

### 19.6 Discharge Summary -- Review/SignOff

- [ ] Send for Review: reviewer selection (pre-select primaryConsultant)
- [ ] PENDING_REVIEW: reviewer vs. non-reviewer sub-states
- [ ] Review Complete action
- [ ] Sign Off with mandatory widget validation gate
- [ ] Amend: enable editing, push amendDetail entry
- [ ] Amend → re-submit for review cycle

### 19.7 Discharge Summary -- Comments

- [ ] DischargeCommentsPage (125 lines)
- [ ] Add comment (PENDING_REVIEW + reviewer only)
- [ ] Comment list sorted by commentedOn descending
- [ ] SecureStorage caching for comments

### 19.8 Discharge Summary -- Vitals

- [ ] Standard BP + 3 positional variants (Lying, Standing, Sitting)
- [ ] Heart Rate, Temperature (C/F), SpO2 (standard + O2 Support + Room Air)
- [ ] Respiratory Rate, Conscious Level, MEWS Score
- [ ] Height (cm/in), Weight (kg/lb), BMI (calculated), BSA (calculated)
- [ ] Head Circumference, Waist, Hip, WHR (calculated)
- [ ] Fall Score, Pain Score

### 19.9 Discharge Summary -- Data Operations

- [ ] Copy Previous: search (DS_005) + copy (DS_006) with warning
- [ ] Regenerate: DS_004 GET with "changes will be lost" warning
- [ ] Sync from EHR: DS_011 POST per section (records replaced, notes preserved)
- [ ] Discharge Intimation: DS_012 PUT (future date validation)
- [ ] Revert Intimation: ADT_002 PUT with reverted=true
- [ ] Print/PDF: DS_007 GET → filesystem write → PdfsummaryPage

### 19.10 AI Discharge Summary

- [ ] Speech permission request
- [ ] Speech recognition start (en-US, partialResults, 10s silence tolerance)
- [ ] Real-time transcript display
- [ ] Inactivity monitor (10s unchanged → restart)
- [ ] Voice command detection ("EMR done" / "E M R done" / "EMI done")
- [ ] Keep Awake during dictation
- [ ] mergeOverlappingSentences() deduplication
- [ ] AI generation POST (transcript → structured widgets)
- [ ] Response mapping to 28 sections
- [ ] Staff review/edit screen
- [ ] Save with finishConsultation=true

### 19.11 Macro System

- [ ] PN macros: screenType="PN", widgetName="Progress Notes", widgetType="progress-notes"
- [ ] DS macros: screenType="DS", limited to 4 sections (therapy/dietary/urgent/discharge advice)
- [ ] Macro save (EHR_141 POST for DS)
- [ ] Macro load by screenType + widgetType
- [ ] Macro apply (replace/append editor content)

---

*Document generated from static analysis of: progress-notes.page.ts, progress-notes-edit.page.ts, progress-notes-preview.page.ts, previous-progress-notes.page.ts, discharge-summary.page.ts, discharge-comments.page.ts, copy-previous-notes.page.ts, ai-discharge-summary.page.ts*
