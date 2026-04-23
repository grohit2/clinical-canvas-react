# AADI App - Progress Notes System

**Source:** `aadi_src/src/app/pages/progress-notes*/` and `services/progress-notes/`

---

## 1. Progress Note Data Model

```typescript
interface ProgressNote {
    id: number;
    documentNumber: string;             // Auto-generated unique ID
    concept: {
        progressNotes: {
            text: string;               // Rich text (HTML from CKEditor5)
            sourceDepartment: {
                name: string;           // Department name
                code: string;           // Department code
            };
            acknowledge: {
                by: string;             // Consultant name
                byLogin: string;        // Consultant login
                on: string;             // ISO datetime
            };
        };
        vitals: Vital[];               // Associated vital signs
        medication: MedicationOrder[];  // Linked medication orders
        investigation: InvestigationOrder[];  // Linked investigation orders
        crossConsultation: CrossConsultation[];  // Linked cross-consults
    };
    pad: number;                        // Post-Admission Days
    ppd: number;                        // Previous Progress Days
    submittedBy: string;                // Creator login
    submittedDate: string;              // ISO datetime
    status: 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED';
    createdOn: string;                  // ISO datetime
}

interface Vital {
    id: number;
    concept: {
        vitalSign: {
            name: string;               // "Heart Rate", "SPO2", "Temperature", "BP"
            value: string;              // "72", "98.6", "120/80"
            unit: string;               // "bpm", "°C"/"°F", "%", "mmHg"
            location?: string;          // For pain score: body location
        };
    };
    createdOn: string;
}

interface CrossConsultation {
    id: number;
    concept: {
        crossConsultation: {
            consultant: { id: number; displayName: string; login: string; };
            reason: string;             // Clinical reason
            requestedDate: string;      // ISO datetime
            priority: 'NORMAL' | 'URGENT';
        };
    };
    remarks: string;
    doctorName: string;
    commentedOn: string;
}
```

---

## 2. Note Format

**Type:** Free-form rich text (NOT rigid SOAP format)

**Editor:** CKEditor5 Classic Build
```typescript
ckConfigs = {
    toolbar: { items: ['bold', 'italic', '|', 'bulletedList', 'numberedList'] },
    placeholder: "Write notes.."
}
```

**Security features:**
- Clipboard input/output events blocked (paste prevention)
- Large paste detection: >30 chars triggers buffer reset
- `disableCopyPaste` flag for enforcement

---

## 3. Creation Workflow

```
Step 1: GENERATE DOCUMENT NUMBER
  → GET api/app-progress-notes-document-no?encounterNumber={enc}
  → Returns unique document number

Step 2: SELECT DEPARTMENT
  → Multi-department support
  → Last-used department fetched via:
    POST api/_search/latest-progress-notes-by-login
    Body: { query: "createdBy.login:{login} AND encounter.unit.id:{unitId} AND active:true", size: 1 }

Step 3: ENTER VITALS (optional)
  Heart Rate     → max 3 digits, unit: bpm
  BP Systolic    → max 3 digits, unit: mmHg
  BP Diastolic   → max 3 digits, unit: mmHg
  Temperature    → max 5 digits, unit: °C or °F (configurable)
  SpO2           → max 3 digits, unit: %

Step 4: WRITE NOTES
  → CKEditor5 with bold, italic, bulleted/numbered lists
  → Macro integration (insert from templates)
  → Full-screen editor option (text-editor.page.ts)

Step 5: ADD ASSOCIATED ORDERS (optional, via modals)
  → Investigation Orders (multi-select with priority + instructions)
  → Medication Orders (dosage, frequency, route configuration)
  → Cross-Consultations (target doctor, remarks, priority)

Step 6: DRAFT or SUBMIT
```

---

## 4. Status Workflow

```
CREATE → DRAFT ────→ (save for later)
   │
   └──→ SUBMIT ──→ if submitter == primaryConsultant:
                      → AUTO-ACKNOWLEDGED (immediate)
                   if submitter != primaryConsultant:
                      → PENDING ACKNOWLEDGMENT
                         → Consultant reviews → ACKNOWLEDGED

EDIT FLOW:
  Fetch note → Edit text → DRAFT or SUBMIT → ACKNOWLEDGED
```

### Acknowledgment

```typescript
// API: ATHMA EHR_032 POST
acknowledgeProgressNotes(id) {
    const content = `?id=${id}`;
    return athmaUrlUtility.generateAthmaURLWithPostMethod(
        {"key":"abc"}, "EHR_032", encodeURIComponent(content)
    );
}
```

Auto-acknowledge logic:
```typescript
if (currentUserLogin === primaryConsultantLogin) {
    progressNote.concept.progressNotes.acknowledge = {
        by: consultantName,
        byLogin: consultantLogin,
        on: moment().format('YYYY-MM-DDTHH:mm:ss.SSS')
    };
}
```

---

## 5. Draft Operations (ATHMA Proxy)

### Draft Vitals
```
Save:   EHR_031 POST (draftVitals object)
Update: EHR_031 PUT  (draftVitals object)
```

### Draft Medications
```
Save:   EHR_021 POST (draftMedication object)
Delete: EHR_021 DELETE (/{draftMedicationID})
```

### Draft Investigations
```
Save:   EHR_087 POST (draftInvestigation object)
Delete: EHR_087 DELETE (/{draftInvestigationID})
```

### Draft Cross-Consultations
```
Save:   EHR_088 POST (draftCC object)
Delete: EHR_088 DELETE (/{draftCCID})
```

### Draft Progress Notes
```
Create: EHR_034 POST (data object)
Update: EHR_034 PUT  (data object)
Get:    EHR_034 GET  (/{id})
Unchart: EHR_034 PUT (postData with unchart flag)
```

---

## 6. Publish Operations

When a note is submitted, linked orders are published:

```
Publish Medications:     EHR_084 PUT (publishMed object)
Publish Investigations:  EHR_085 PUT (publishInv object)
Publish Cross-Consult:   EHR_086 POST (publishCC object)
```

---

## 7. Previous Notes & Filtering

### List Endpoint

```
GET api/_search/progress-notes-with-vitals
  ?mrn={mrn}
  &encounterNumber={enc}
  &createdOn={date}                    // optional date filter
  &referenceNumber={docNum}            // optional specific document
  &createdBy={login}                   // optional creator filter
  &acknowledgeFilter={true/false}      // filter by ack status
  &filterByConsultant={loginIds}       // comma-separated consultant logins
  &size=50
  &sort=id,desc
```

### Filter Page (progress-notes-filter.page.ts)

| Filter | Type |
|--------|------|
| Date range | From date / To date (SimplePicker) |
| Consultant | Multi-select from `getProgressNotesCreatorsList(encounterNumber)` |
| Acknowledgment | Boolean toggle |

### Creators List

```
GET api/_search/distinct-progress-notes-consultant?encounterNumber={enc}
→ Returns distinct consultant logins who created notes for this encounter
```

---

## 8. Preview Page

**Page:** `progress-notes-preview.page.ts`

### Async Data Loading (parallel)

```
1. Notes text + vitals → api/_search/progress-notes-with-vitals
2. Medications → api/_search/progress-notes-medication-order-records?encounterNumber={enc}&referenceNumber={docNum}&size=100
3. Investigations → api/_search/progress-notes-investigation-order-records?encounterNumber={enc}&referenceNumber={docNum}&size=100
4. Cross-consultations → api/_search/ehr-cross-consultation-records?mrn={mrn}&encounterNumber={enc}&referenceNumber={docNum}
```

### Display Sections

1. Patient demographics (name, MRN, age, gender)
2. Consultant info (primary consultant, PAD, PPD)
3. Vitals (read-only)
4. Notes text (formatted HTML)
5. Investigation orders (with status badges)
6. Medication orders (with dosage breakdown: M-A-E-N)
7. Cross-consultations (with priority indicators)

### Edit Permission

```typescript
allowEdit = (currentUserLogin === submittedByLogin);
```

---

## 9. Macros (Templates)

### Macro Model

```typescript
interface NotesTemplate {
    id?: number;
    title: string;                      // Template name (unique per user)
    notes: string;                      // Template content (HTML)
    widgetType: 'progress-notes' | 'discharge-summary';
    widgetName: string;                 // 'Progress Notes'
    user: { id?: number; login: string; };
}
```

### Macro Operations

```
Get macros:    ATHMA EHR_140 GET
  query: widgetType.raw:progress-notes AND user.login.raw:{login}
         AND (title:(*) OR notes:(*))
  size=50, sort=title.sort,asc

Search macros: ATHMA EHR_140 GET (same + searchPrompt in title/notes)

Save macro:    ATHMA EHR_141 POST (NotesTemplate object)
```

### Macro Integration Points

- "Save Macro" button below editor (visible when notes have content)
- Name validation: must be non-empty and unique
- Replace confirmation: "The existing content shall be replaced with the selected macro. Are you sure?"
- Available in both progress notes and discharge summary editors

---

## 10. Message Integration

When a progress note is submitted, a PatientMessage is created:

```typescript
{
    patientInfoId: string,
    mrn: string,
    senderLogin: string,
    senderName: string,
    patientName: string,
    contentType: 'JSON',
    content: JSON.stringify(progressNoteData),
    category: 'PROGRESS_NOTES',
    subCategory: 'TEXT',
    actionId: `${login}-PATIENT_MESSAGE-${timestamp}`,
    messageStatus: 'NOT_SENT',
    sentTime: moment().format('YYYY-MM-DDTHH:mm:ss.SSS'),
    msgDeleted: false
}
```

---

## 11. API Endpoints Summary

### Direct REST

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `api/_search/progress-notes` | List notes (no vitals) |
| GET | `api/_search/progress-notes-with-vitals` | List notes with vitals |
| POST | `api/progress-notes-record-action` | Create/update notes |
| GET | `api/app-progress-notes-document-no` | Generate doc number |
| GET | `api/_search/progress-notes-reference-no` | Notes by reference |
| GET | `api/_search/progress-notes-medication-order-records` | Medications for note |
| GET | `api/_search/progress-notes-investigation-order-records` | Investigations for note |
| GET | `api/_search/ehr-cross-consultation-records` | Cross-consults for note |
| GET | `api/_search/distinct-progress-notes-consultant` | Note creators list |
| POST | `api/_search/latest-progress-notes-by-login` | Last department used |

### ATHMA Proxy

| Code | Method | Purpose |
|------|--------|---------|
| EHR_019 | GET | Draft medications by document |
| EHR_014 | GET | Draft investigations by document |
| EHR_021 | POST/DELETE | Draft medication CRUD |
| EHR_030 | GET | Vitals by document number |
| EHR_031 | POST/PUT | Save/update draft vitals |
| EHR_032 | POST | Acknowledge progress notes |
| EHR_034 | POST/PUT/GET | Progress notes CRUD + unchart |
| EHR_083 | GET | Cross-consultation by document |
| EHR_084 | PUT | Publish medications |
| EHR_085 | PUT | Publish investigations |
| EHR_086 | POST | Publish cross-consultation |
| EHR_087 | POST/DELETE | Draft investigations CRUD |
| EHR_088 | POST/DELETE | Draft cross-consultations CRUD |
| EHR_140 | GET | Get/search macros |
| EHR_141 | POST | Save macro |
| ADT_001 | GET | Inpatient details |

---

## 12. Task Integration

Progress notes create tasks in the activity system:

```
Task category: PROGRESS-NOTES-ACKNOWLEDGEMENT
Task definition code: PROGRESS_NOTES_ACKNOWLEDGEMENT

GET api/_search/tasks?documentNo={documentNumber}
  → Returns acknowledgment tasks for specific note

CategoryTypePage routes to ProgressNotesPreviewPage for task action
```
