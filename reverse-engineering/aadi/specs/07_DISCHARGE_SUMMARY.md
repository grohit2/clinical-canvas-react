# AADI App - Discharge Summary System

**Source:** `aadi_src/src/app/pages/discharge-summary/`, `ai-discharge-summary/`, `services/dischargesummary/`

---

## 1. Discharge Summary Data Model

```typescript
interface DischargeSummary {
    id: number;
    documentNumber: string;
    document: {
        admissionNumber: string;
        status: DischargeSummaryStatus;

        inPatient: {
            patientDetails: {
                mrn: string;
                name: string;
                gender: string;
                birthDate: string;
                weight?: number;
            };
            admissionDetails: {
                admissionDate: string;
                admissionNumber: string;
            };
        };

        // === 28 Clinical Sections (all optional, CKEditor HTML) ===
        admissionReason?: string;
        chiefComplaint?: string;
        medicalHistory?: string;
        surgicalHistory?: string;
        familyHistory?: string;
        socialHistory?: string;
        pastMedicationHistory?: string;
        vitalSign?: string;
        allergy?: string;
        generalExamination?: string;
        systemicExamination?: string;
        investigationResults?: string;
        provisionalDiagnosis?: string;
        finalDiagnosis?: string;
        medicationAtDischarge?: string;
        crossConsultation?: string;
        urgentCare?: string;
        conditionAtDischarge?: string;
        dischargeAdvice?: string;
        dietaryAdvice?: string;
        therapyAdvice?: string;
        operationAndProcedure?: string;
        followUp?: string;
        diagnosis?: string;
        causeOfDeath?: string;
        activeMedication?: string;
        comorbidities?: string;

        // Review & Comments
        comments: Comment[];
        amended: boolean;
        amendDetails: Amendment[];
    };
}

type DischargeSummaryStatus =
    'NEW' | 'DRAFT' | 'SENT_FOR_REVIEW' | 'UNDER_REVIEW' | 'SIGN_OFF' | 'COMPLETE';

interface Comment {
    commentedBy: {
        id: number;
        login: string;
        displayName: string;
        employeeNo: string;
        email: string;
        mobileNo: string;
    };
    commentedOn: string;        // ISO datetime
    comment: string;            // Free-form text
}

interface Amendment {
    amendedDate: string;
    amendedBy: string;
    reasons: string[];
}
```

---

## 2. Workflow State Machine

```
CREATE ────→ DRAFT ────→ SENT_FOR_REVIEW ────→ UNDER_REVIEW
                              ↑                      │
                              │                      ├──→ COMMENTS (feedback)
                              │                      │       │
                              │                      ↓       │
                              └──── AMENDMENT ←──────────────┘
                                      │
                                      ├──→ DRAFT (re-edit)
                                      └──→ RESEND_FOR_REVIEW
                                                │
                                                ↓
                                          SIGN_OFF ────→ COMPLETE (archived, read-only)

SPECIAL TRANSITIONS:
  REVERT_REVIEW  → Send back from review to draft (DS_009)
  DISCHARGE_INTIMATION → Notify of imminent discharge (DS_012)
  REVERT_INTIMATION → Cancel discharge notification (ADT_002)
  COPY_PREVIOUS → Clone from earlier admission (DS_006)
  REGENERATE → Re-generate from current data (DS_004)
```

---

## 3. Creation Flow

### Step 1: Initiate

```
Get existing summary:
  ATHMA DS_001 GET (documentNumber = admission number)
  → Returns existing summary or empty template

OR create new:
  ATHMA DS_002 POST (?action=DRAFT)
  → Creates new summary document
```

### Step 2: Populate Sections

Each section uses CKEditor5:
```typescript
toolbar: { items: ['bold', 'italic', '|', 'bulletedList', 'numberedList'] }
placeholder: 'Add Notes'
```

**28 section keys:**
```
admission-reason, chief-complaint, medical-history, surgical-history,
family-history, social-history, past-medication-history, vital-sign,
allergy, general-examination, systemic-examination, investigation-results,
provisional-diagnosis, final-diagnosis, medication-at-discharge,
cross-consultation, urgent-care, condition-at-discharge, discharge-advice,
dietary-advice, therapy-advice, operation-and-procedure, follow-up,
diagnosis, cause-of-death, discharge-summary-emergency-management,
active-medication, comorbidities
```

### Step 3: Sync from EHR

```
DS_011 POST (?encounterNumber={enc}&widgetType={type})
→ Pulls latest data from EHR for specific widget section
→ Auto-populates the section content
```

### Step 4: Save/Submit

```
Draft:        DS_002 POST (?action=DRAFT)
Review:       DS_002 PUT  (?action=SEND_FOR_REVIEW)
Sign-off:     PUT api/discharge-summary-action (sign-off JSON)
```

---

## 4. Vital Signs in Discharge Summary

### Supported Vitals

| Vital | Unit | Max Digits |
|-------|------|------------|
| Blood Pressure (Lying/Standing/Sitting) | mmHg | 3 |
| Heart Rate | bpm | 3 |
| Temperature | °C or °F | 5 |
| SpO2 | % (with support type: Room air/O2) | 3 |
| Respiratory Rate | breaths/min | 3 |
| Consciousness Level | text | — |
| MEWS Score | score | — |

### Anthropometric Data

| Measurement | Unit Options |
|-------------|-------------|
| Height | cm / inches |
| Weight | kg / lbs |
| BMI | auto-calculated |
| BSA | auto-calculated |
| Head Circumference | cm |
| Waist | cm |
| Hip | cm |
| WHR | ratio |
| Fall Score | score + remarks |
| Pain Score | score + location |

### Vital Concept List

```
ATHMA EHR_029 GET
  ?conceptType=vital-sign&conceptName={type}&key=concept.vitalSign.value&query=*
  For Pain Score: key=concept.vitalSign.location
```

---

## 5. Comments & Review Workflow

### Comments Page (discharge-comments.page.ts)

```typescript
// Add comment
addComments() {
    const commentObj = {
        commentedBy: reviewer.doctor,
        commentedOn: moment().format('YYYY-MM-DDTHH:mm:ss.SSS'),
        comment: newComments
    };
    comments.unshift(commentObj);   // Prepend (newest first)
}
```

### Local Caching

```typescript
// Comments cached in SecureStorage
AppStorageKeys.DISCHARGE_SUMMARY_COMMENTS = {
    mrn: string,
    documentNumber: string,
    comments: Comment[]
}
// Validated against MRN + documentNumber match
// Cleared on server sync
```

### Workflow Transitions

```
Get workflow:   DS_003 GET (?documentNumber={docNum}&userId={userId})
Update flow:    DS_003 PUT (?transition={transition}&taskId={taskId})
Revert review:  DS_009 PUT (?documentNumber={docNum})
```

---

## 6. AI-Powered Discharge Summary

**Page:** `ai-discharge-summary.page.ts`

### Technology

- Speech Recognition: `@capacitor-community/speech-recognition`
- Keep-Awake: `@capacitor-community/keep-awake` (prevents screen sleep during recording)

### Workflow

```
1. REQUEST PERMISSION
   → SpeechRecognition.available()
   → SpeechRecognition.requestPermissions()
   → If granted: startListening()

2. VOICE RECORDING
   → Continuous listening during clinical dictation
   → Real-time transcript accumulation

3. AI PROCESSING
   POST AI_002 (generateAIEMR)
   Body: {
       feature: "aichart",
       message: "<transcript>",
       source: "AADI"
   }

4. WIDGET POPULATION
   GET AI_003 → retrieve server-configured AI modules
   → Each module maps to discharge summary section
   → Async processing with server-side NLP

5. SAVE TO EHR
   POST EHR_143 → save AI-generated content to EHR
```

---

## 7. Copy Previous Notes

**Page:** `copy-previous-notes.page.ts`

```
DS_006 PUT (?sourceDocumentNumber={srcDocNum}&admissionNumber={admissionNumber})
→ Clones content from a previous admission's discharge summary
→ Pre-populates all sections with historical data
→ Doctor can then edit/update for current admission
```

---

## 8. Print Summary (PDF)

```
DS_007 GET (/{id}?withLogo=false)
Response: Blob (PDF)
→ Opens in PDF viewer or downloads
```

---

## 9. Discharge Intimation

### Intimate Discharge

```
DS_012 PUT (inPatientDetails object)
→ Notifies that patient is ready for discharge
→ Updates dischargeIntimation flag in PatientInfo
→ Visible as badge in patient list
```

### Revert Intimation

```
ADT_002 PUT (inPatientDetails object)
→ Cancels discharge notification
→ Resets dischargeIntimation to 'false'
```

---

## 10. Macros for Discharge Summary

### Allowed Sections for Macro Save

```typescript
allowedTitles = [
    'Therapy Advice - Notes',
    'Dietary Advice - Notes',
    'Hospital Discharge Instructions - Notes',
    'When To Obtain Urgent Care - Notes'
]
```

### Macro Operations

```
Get macros:    ATHMA EHR_140 GET
  query: widgetType.raw:discharge-summary
         AND widgetName.raw:"{sectionName}"
         AND user.login.raw:{login}
         AND (title:(*) OR notes:(*))

Save macro:    ATHMA EHR_141 POST (NotesTemplate)
  OR via:      dischargesummaryService.saveMacroForDs(notesTemplate)

Search macros: ATHMA EHR_140 GET (add searchPrompt to query)
  Debounce: 500ms
```

---

## 11. Task Integration

Discharge summaries create tasks in the activity system:

```
Task categories:
  DISCHARGE_SUMMARY_CREATION  → Task for creating DS
  DISCHARGE_SUMMARY_SIGNOFF   → Task for consultant sign-off

Task routing:
  CategoryTypePage → Router.navigate('/discharge-summary')
  (not modal-based, full page navigation)
```

---

## 12. API Endpoints Summary

### Direct REST

| Method | Endpoint | Purpose |
|--------|----------|---------|
| PUT | `api/discharge-summary-action` | Approve/sign-off |
| GET | `api/_search/discharge-summary-record?documentNumber={doc}` | Get record |
| GET | `api/_search/inpatient-status?admissionNumber={num}` | Patient status |
| GET | `api/_search/user?login={login}` | User info |
| GET | `api/patient-infos/{id}` | Patient info by ID |

### ATHMA Proxy

| Code | Method | Purpose |
|------|--------|---------|
| DS_001 | GET | Get summary by admission |
| DS_002 | POST | Create summary (`?action=DRAFT`) |
| DS_002 | PUT | Update summary (`?action=SEND_FOR_REVIEW`) |
| DS_003 | GET | Get workflow (`?documentNumber, userId`) |
| DS_003 | PUT | Update workflow (`?transition, taskId`) |
| DS_004 | GET | Regenerate summary |
| DS_005 | GET | Search summaries (`?query, sort`) |
| DS_006 | PUT | Copy previous notes (`?sourceDocumentNumber, admissionNumber`) |
| DS_007 | GET | Print/download PDF (blob) |
| DS_008 | GET | Task detail (`?documentNumber, userId, taskName`) |
| DS_009 | PUT | Revert review status |
| DS_011 | POST | Sync to medication (`?encounterNumber, widgetType`) |
| DS_012 | PUT | Intimate discharge |
| ADT_001 | GET | Inpatient detail (IPCare) |
| ADT_002 | PUT | Revert discharge intimation |
| ADT_005 | GET | Inpatient detail (MFD) |
| EHR_029 | GET | Vital concept list |
| EHR_141 | POST | Save macro |
| MDM_001 | GET | Value set master |
| AMB_004 | PUT | Cancel appointment |
| AI_001 | POST | Save AI EMR |
| AI_002 | POST | Generate AI EMR |
| AI_003 | GET | Get widget info |
| EHR_143 | POST | Save AI EMR to EHR |

---

## 13. Editor Configuration

### CKEditor5 (all sections)

```typescript
{
    toolbar: { items: ['bold', 'italic', '|', 'bulletedList', 'numberedList'] },
    placeholder: 'Add Notes'
}
```

### Full-Screen Editor (text-editor.page.ts)

- Same toolbar configuration
- Macro integration (save/load)
- Clipboard security (paste blocking)
- Returns: `{ editorDataDetails: string, title: string, from: string }`

### Security

- `clipboardInput` event blocked (paste prevention)
- `clipboardOutput` event blocked
- `beforeinput` event monitored for large pastes (>30 chars)
