# Flow 07: Checklist, Operation Notes, PAC, Incident Reports, Initial Assessment, Risk Score, Tasks & Activity Area

**App:** AADI (org.nh.app.aadi) v2.35.0
**Framework:** Ionic 7 / Capacitor 5 / Angular 17+
**Source files:** `checklist.service.ts`, `add-checklist.page.ts`, `edit-checklist.page.ts`, `list-checklist.page.ts`, `checklist-reject-reason.page.ts`, `operation-note.service.ts`, `operation-note.page.ts`, `operation-note-create.page.ts`, `operation-note-details.page.ts`, `add-operation.page.ts`, `pac.service.ts`, `pre-anesthesia-checkup.page.ts`, `asa.page.ts`, `incident-report.service.ts`, `incident-report.page.ts`, `initial-assessment.page.ts`, `add-modify-widget.component.ts`, `search.component.ts`, `risk-score.page.ts`, `risk-scorecard.page.ts`, `risk-score-params.page.ts`, `risk-scorecard.service.ts`, `activity-area.page.ts`, `tasks-create.page.ts`, `tasks-history.page.ts`, `task-activity.service.ts`, `notification-preferences.page.ts`, `discharged-patients.page.ts`

---

## 1. Overview

This document covers the remaining clinical workflow systems in AADI that sit outside the core messaging, medication, and discharge pathways documented in Flows 02-06. These systems span **patient safety** (checklists, incident reports, PAC), **surgical documentation** (operation notes), **clinical assessment** (initial assessment with 16+ widget sections, risk scoring), and **task management** (activity area with 6 task categories). Additionally, this flow covers notification preferences and discharged patient access.

These features share a common architectural pattern: they are accessed from the patient chat context (PatientChatPage), communicate through the ATHMA proxy gateway for EHR operations and direct REST for task/activity operations, and render as modal or pushed pages within the Ionic navigation stack.

### 1.1 Component Dependency Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                    CLINICAL ASSESSMENT & SAFETY SYSTEMS                                       │
│                                                                                              │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌─────────────────────┐ │
│  │    CHECKLIST SYSTEM          │  │    OPERATION NOTES (OT)      │  │    PAC               │ │
│  │                              │  │                              │  │                      │ │
│  │  ListChecklistPage (tabs)    │  │  OperationNotePage (list)    │  │  PreAnesthesiaPage   │ │
│  │  AddChecklistPage (create)   │  │  OperationNoteCreatePage     │  │  AsaPage (reference) │ │
│  │  EditChecklistPage (modal)   │  │  OperationNoteDetailsPage    │  │  Version selector    │ │
│  │  RejectReasonPage (modal)    │  │  AddOperationPage (modal)    │  │  Value set forms     │ │
│  │                              │  │                              │  │                      │ │
│  │  ChecklistService            │  │  OperationNoteService        │  │  PacService          │ │
│  │  7 ATHMA endpoints           │  │  11 ATHMA endpoints          │  │  7 endpoints         │ │
│  └──────────┬───────────────────┘  └──────────┬───────────────────┘  └──────────┬──────────┘ │
│             │                                  │                                 │            │
│  ┌──────────▼──────────────────────────────────▼─────────────────────────────────▼──────────┐ │
│  │                          SURGERY TRACKER (CL_001)                                        │ │
│  │             Links checklists and OT notes to surgical cases                              │ │
│  └──────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                              │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌─────────────────────┐ │
│  │    INCIDENT REPORT           │  │    INITIAL ASSESSMENT        │  │    RISK SCORE        │ │
│  │                              │  │                              │  │                      │ │
│  │  IncidentReportPage          │  │  InitialAssessmentPage       │  │  RiskScorePage       │ │
│  │  Camera/Gallery capture      │  │  16+ widget sections         │  │  RiskScorecardPage   │ │
│  │  Base64 upload pipeline      │  │  AddModifyWidgetComponent    │  │  RiskScoreParamsPage │ │
│  │                              │  │  SearchComponent             │  │                      │ │
│  │  IncidentReportService       │  │  27 IAWidget enum values     │  │  RiskScorecardSvc    │ │
│  │  2 endpoints                 │  │  30+ ATHMA endpoints         │  │  D3.js charts        │ │
│  └──────────────────────────────┘  └──────────────────────────────┘  └─────────────────────┘ │
│                                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                          ACTIVITY AREA & TASKS                                           │ │
│  │                                                                                          │ │
│  │  ActivityAreaPage (modal)   │  TasksCreatePage   │  TasksHistoryPage                     │ │
│  │  6 task categories          │  NURSING-CAPTURE    │  List + edit/delete                   │ │
│  │  SQLite encounter query     │  Validation rules   │  Sorted by ID desc                   │ │
│  │  Server count aggregation   │  Date constraints   │  Creator-only edit                   │ │
│  └──────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                              │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐                          │
│  │  NOTIFICATION PREFERENCES    │  │  DISCHARGED PATIENTS         │                          │ │
│  │  Mandatory vs Optional       │  │  Search by name/MRN          │                          │ │
│  │  JSON.stringify diff          │  │  Navigate to DS on tap       │                          │ │
│  └──────────────────────────────┘  └──────────────────────────────┘                          │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Navigation Hierarchy

```
PatientChatPage (clinical encounter context)
  │
  ├── ListChecklistPage (checklist list with 2 tabs)
  │     ├── AddChecklistPage (create new checklist from template)
  │     └── EditChecklistPage (modal — view/edit/approve/reject)
  │           └── ChecklistRejectReasonPage (modal — reject with reason)
  │
  ├── OperationNotePage (OT notes list grouped by date)
  │     ├── OperationNoteCreatePage (create/edit OT note)
  │     │     └── AddOperationPage (modal — dual SNOMED + hospital search)
  │     └── OperationNoteDetailsPage (read-only + PDF download)
  │
  ├── PreAnesthesiaCheckupPage (PAC form with version control)
  │     └── AsaPage (modal — ASA classification reference)
  │
  ├── IncidentReportPage (description + image upload)
  │
  ├── InitialAssessmentPage (16+ widget sections)
  │     ├── AddModifyWidgetComponent (reactive form per widget type)
  │     └── SearchComponent (favorites + SNOMED/EHR search)
  │
  ├── RiskScorePage (D3.js trend chart)
  │     └── RiskScoreParamsPage (parameter drill-down)
  │
  └── RiskScorecardPage (SVG gauge + AI prediction)

LandingPage (dashboard)
  │
  ├── ActivityAreaPage (modal — 6 task categories with counts)
  │     ├── PN Acknowledgment → ProgressNotesPreviewPage
  │     ├── DS Creation → DischargeSummaryPage
  │     ├── DS Signoff → DischargeSummaryPage
  │     ├── IA Review → InitialAssessmentPage (read-only)
  │     ├── Checklist Approval → EditChecklistPage
  │     └── Cross Consultation → CrossConsultationListPage
  │
  ├── DischargedPatientsPage (list with search)
  │     └── DischargeSummaryPage (read-only)
  │
  └── NotificationPreferencesPage (toggle settings)

TasksCreatePage (from patient context)
TasksHistoryPage (from patient context)
```

---

## 2. Checklist System

The checklist system provides structured patient safety verification -- pre-operative checklists, nursing checklists, and general compliance checks. Each checklist is created from a template, answered question-by-question, optionally witnessed, and approved through a state machine.

### 2.1 Data Model

```typescript
ChecklistInstance {
    // Identity
    id: number;
    code: string;                          // Template code
    name: string;                          // Template display name
    type: string;                          // Checklist type classification
    applicableFor: string;                 // "patient" for patient-context checklists
    version: number;
    latest: boolean;
    checkListNumber: string | null;        // Server-assigned number

    // Patient Context
    patient: {
        mrn: string;
        name: string;
        birthDate: string;
        gender: string;
        weight: number;
        patientDetails: object;
    };
    encounter: {
        documentNumber: string;
        patient: object;
        type: string;
    };
    otRequestNumber: string | null;        // Surgery tracker link

    // Care Team
    consultant: { displayName, login, employeeNo };
    unit: { id, name };

    // Response Configuration
    responseType: {
        code: "yes/no" | "tick";
        displayName: string;
    };
    sequentialAnswering: boolean;
    witness: "MANDATORY" | "OPTIONAL" | null;

    // Questions
    questions: Question[];

    // Workflow
    status: "PENDING" | "DRAFT" | "PENDING_APPROVAL" | "COMPLETED" | "REJECTED";
    createdBy: UserRef;
    createdOn: ISO8601;
    submittedBy: UserRef | null;
    submittedOn: ISO8601 | null;
    witnessedBy: UserRef | null;
    witnessedOn: ISO8601 | null;
    remarks: string;
    rejectReason: string | null;
    reviewRequired: boolean;
}

Question {
    question: string;
    displayOrder: number;
    mandatory: boolean;
    defaultResponse: string | null;        // Expected correct answer (e.g., "YES")
    enableRemarks: boolean;
    answer: "YES" | "NO" | null;           // For yes/no type
    remarks: string | null;                // Per-question remarks
}

UserRef { displayName, login, employeeNo }
```

### 2.2 Status Lifecycle

```
                    ┌────────────────────────────────────────────────────────┐
                    │                 CHECKLIST LIFECYCLE                     │
                    └────────────────────────────────────────────────────────┘

    ┌─────────┐         ┌─────────┐         ┌──────────────────┐
    │ PENDING │────────→│  DRAFT  │────────→│ PENDING_APPROVAL │
    │ (new)   │  save   │ (WIP)   │ submit  │ (review=true)    │
    └────┬────┘  draft  └────┬────┘         └────────┬─────────┘
         │                   │                       │
         │                   │               ┌───────┴────────┐
         │ submit             │               │                │
         │ (review=false)     │           APPROVE          REJECT
         │                   │               │                │
         │                   │      ┌────────▼──────┐  ┌──────▼─────┐
         └───────────────────┼─────→│  COMPLETED    │  │  REJECTED  │
                             │      │  (final)      │  │            │
                             │      └───────────────┘  └──────┬─────┘
                             │                                │
                             │         re-edit                │
                             └────────────────────────────────┘
```

**Permission Matrix:**

| Status | Creator Can | Witness Can | Others |
|--------|------------|-------------|--------|
| PENDING | Edit, Save Draft, Submit | -- | -- |
| DRAFT | Edit, Save Draft, Submit | -- | -- |
| PENDING_APPROVAL | Read-only | Approve, Reject | Read-only |
| COMPLETED | Read-only | Read-only | Read-only |
| REJECTED | Edit, Save Draft, Re-Submit | -- | -- |

### 2.3 Response Types

#### 2.3.1 Yes/No Type (`responseType.code === 'yes/no'`)

Each question renders as a **radio button pair** (YES / NO).

```
┌─────────────────────────────────────────────────┐
│  Q1: Has patient identity been verified?        │
│      ○ YES    ○ NO                              │
│      [Remarks: ___________________________]     │  ← only if enableRemarks=true
│                                                 │
│  Q2: Is the consent form signed?                │
│      ○ YES    ○ NO                              │
│      [Remarks: ___________________________]     │
│                                                 │
│  Q3: Has the surgical site been marked?         │  ← disabled if Q2 wrong (sequential)
│      ○ YES    ○ NO                              │
└─────────────────────────────────────────────────┘
```

**Validation against `defaultResponse`:**
- If `defaultResponse` is set (e.g., `"YES"`) and the user selects a different answer, the app shows a warning toast: `"Please choose the correct answer"`
- In sequential mode, a wrong answer on Q(n) disables all subsequent questions Q(n+1)..Q(end)
- In non-sequential mode, all mandatory questions must have the correct answer before submit is enabled

#### 2.3.2 Tick Type (`responseType.code === 'tick'`)

Each question renders as a **checkbox** with a blue highlight (`bg-item-blue` CSS class) on selection.

```
┌─────────────────────────────────────────────────┐
│  ☑ Q1: Patient identity verified          [✓]  │  ← blue highlight
│  ☑ Q2: Consent form signed                [✓]  │  ← blue highlight
│  ☐ Q3: Surgical site marked               [ ]  │  ← enabled (sequential: Q2 checked)
│  ☐ Q4: Anesthesia plan confirmed          [ ]  │  ← disabled (sequential: Q3 unchecked)
└─────────────────────────────────────────────────┘
```

**Sequential tick behavior:**
- Unchecking Q(n) cascades removal: `removeAllTickFromIndex(n)` clears Q(n+1) through Q(end)
- Non-sequential: independent selection in any order

### 2.4 Sequential Answering Logic

#### Yes/No Sequential Flow

```
Q0 always enabled
User answers Q0:
  if answer matches defaultResponse (or default is null/NA):
    → enable Q1
  if answer mismatches defaultResponse:
    → show warning toast
    → disable Q1..Qn
    → call removeRemainingChecks(1)  // clear all answers from index 1 onward

Q1 enabled, user answers Q1:
  → same logic → enable/disable Q2
  ...repeat through all questions
```

#### Tick Sequential Flow

```
Q0 always enabled
User checks Q0:
  checked = true  → enable Q1, apply blue styling
  checked = false → removeAllTickFromIndex(0), disable Q1..Qn

Q1 enabled, user checks Q1:
  → same cascading logic
```

#### Non-Sequential Mode

All questions enabled from the start. Mandatory questions validated only at submit time.

### 2.5 Witness Workflow

#### Configuration

| `witness` Value | Behavior |
|----------------|----------|
| `"MANDATORY"` | Witness MUST be assigned before submit. Submit button blocked without witness. |
| `"OPTIONAL"` | Witness assignment optional. Can submit without witness. |
| `null` | No witness section shown at all. |

#### Witness Search

```
User types in witness search field (minimum 3 characters)
  │
  ├── ATHMA GET MDM_007
  │     Query: unit.id:{unitId} AND group.code:DOCTOR AND employee.displayName:*{search}*
  │     Exclusion: current user's login filtered out from results
  │     Max results: 20
  │
  ├── Dropdown shows matching doctors
  │     Display: "{displayName} ({employeeNo})"
  │
  └── User selects doctor
        witnessedBy = { displayName, login, employeeNo }
        witnessedOn = current ISO8601 timestamp
```

#### Witness Actions (status === PENDING_APPROVAL)

```
Witness opens checklist (via EditChecklistPage or Activity Area task)
  │
  ├── [Approve] button
  │     → status = COMPLETED
  │     → Toast: "Checklist approved"
  │     → Modal dismissed
  │
  └── [Reject] button
        → Opens ChecklistRejectReasonPage modal
        │
        ├── Textarea: reject reason (required, max 255 chars)
        │     Validation: non-empty, trimmed
        │     Error if empty: "Reject reason is empty."
        │
        └── [Submit Reject]
              → status = REJECTED
              → rejectReason = entered text
              → Modal dismissed
```

#### Witness Validation Function

```typescript
witnessMandatoryCheck(): boolean {
    if (witness === 'MANDATORY' && (!witnessedBy || witnessedBy == null)) {
        return false;  // Block submit, show: "Please Select Witnessed By"
    }
    return true;
}
```

### 2.6 Surgery Tracker Integration (CL_001)

When creating a new checklist, the system links it to an active surgical case:

```
1. ATHMA GET CL_001
   Query: patient.mrn:{mrn} AND inPatient.admissionDetails.admissionNumber:{admNo}
   Sort: id,desc

2. Find OT request with status REQUESTED or SCHEDULED

3. If found:
   otRequestNumber = surgeryTracker.requestNumber
   Inherit: consultant, unit, encounter from surgery/inpatient records

4. If not found:
   Toast: "OT request is not available for this patient."
   Checklist still creatable without OT association
```

### 2.7 List View (ListChecklistPage)

Two-tab segmented display:

```
┌───────────────────────────────────────────────┐
│  [<]  Checklists                              │
├───────────────────────────────────────────────┤
│  ┌─────────────────┬─────────────────────┐    │
│  │   Checklist      │   Pending Approval  │    │  ← ion-segment
│  └─────────────────┴─────────────────────┘    │
│                                               │
│  ── Today ──                                  │
│  ┌─────────────────────────────────────────┐  │
│  │  Pre-Op Safety Checklist       [DRAFT]  │  │  ← color-coded status badge
│  │  Submitted: Dr. Sharma                  │  │
│  │  Witnessed: Dr. Patel                   │  │
│  │  Created: 10:30 AM                      │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  ── Yesterday ──                              │
│  ┌─────────────────────────────────────────┐  │
│  │  Nursing Handoff Checklist  [COMPLETED] │  │
│  │  Submitted: Nurse Priya                 │  │
│  │  Created: 2:15 PM                       │  │
│  └─────────────────────────────────────────┘  │
│                                               │
│  [+ Add Checklist]                            │  ← FAB button
└───────────────────────────────────────────────┘
```

**Tab 1 (Checklist):** All checklists excluding `PENDING_APPROVAL` status
- API: `EHR_066 GET` with query `active:true AND patient.mrn:{mrn} AND encounter.documentNumber:{enc} AND !(status:PENDING_APPROVAL)&size=100&sort=id,desc`

**Tab 2 (Pending Approval):** Only `PENDING_APPROVAL` checklists
- API: `EHR_066 GET` with query `active:true AND patient.mrn:{mrn} AND encounter.documentNumber:{enc} AND status:PENDING_APPROVAL&size=100&sort=id,desc`

**Date grouping:** Today / Yesterday / DD-MM-YYYY format

**Tap action:** Opens `EditChecklistPage` modal for the selected checklist.

### 2.8 Create Flow (AddChecklistPage)

```
ionViewWillEnter()
  │
  ├── 1. Load checklist templates
  │     ATHMA GET MDM_017
  │     Query: ?query=active:true applicableFor.code:patient&size=100&sort=name.sort,asc
  │     → Populates template selection dropdown
  │
  ├── 2. User selects template
  │     → Questions populated from template
  │     → responseType, sequentialAnswering, witness config loaded
  │     → Q0 always enabled; others disabled if sequential
  │
  ├── 3. Fetch surgery tracker (if applicable)
  │     ATHMA GET CL_001
  │     → Associates otRequestNumber if OT request found
  │
  ├── 4. User answers questions
  │     → Sequential enforcement per section 2.4
  │     → Remarks captured per question if enableRemarks=true
  │
  ├── 5. Witness assignment (if witness !== null)
  │     → Witness search per section 2.5
  │
  └── 6. Submit or Save Draft
        │
        ├── [Save Draft]
        │     status = "DRAFT"
        │     ATHMA POST EHR_036 (body: ChecklistInstance)
        │
        └── [Submit]
              Validate: isAllQuestionsValid() && witnessMandatoryCheck()
              │
              ├── reviewRequired = true  → status = "PENDING_APPROVAL"
              └── reviewRequired = false → status = "COMPLETED"
              │
              ATHMA POST EHR_036 (body: ChecklistInstance)
              Toast: success or error.error.title
```

### 2.9 Edit/View Flow (EditChecklistPage)

```
Modal opens with checklist ID
  │
  ├── ATHMA GET EHR_036/{id}
  │     → Loads full ChecklistInstance
  │
  ├── Determine mode based on status + current user:
  │
  │   status = PENDING or DRAFT or REJECTED:
  │     → Edit mode (if current user is creator)
  │     → Buttons: [Save Draft] [Submit]
  │
  │   status = PENDING_APPROVAL:
  │     → Read-only for creator
  │     → Approve/Reject buttons for witness
  │
  │   status = COMPLETED:
  │     → Read-only for all users
  │
  └── Update: ATHMA PUT EHR_036 (body: updated ChecklistInstance)
```

---

## 3. Operation Notes (OT Notes)

Operation notes document surgical procedures performed on inpatients. They are linked to OT requests via the surgery tracker and include SNOMED-CT coded diagnoses, a multi-party surgical team, and configurable mandatory sections.

### 3.1 Data Model

```typescript
OTNotes {
    id: string | null;
    otRequestNo: string;                   // Links to surgery tracker
    draft: boolean;                        // true = WIP, false = finalized
    source: "AADI";

    inPatient: {
        admissionDetails: {
            admissionDate: DateTime;
            admissionNumber: string;
        };
        patientDetails: PatientInfo;
        ward: { id: number, name: string };
        bed: { id: number, name: string };
    };
    scheduledDateTime: DateTime;
    unit: { id: number };

    formTemplateReport: {
        result: {
            patientDetail: PatientInfo;
            concept: {
                report: OperationNoteReport;
            };
        };
    };
}

OperationNoteReport {
    // Surgical Team (each searchable via MDM_007)
    surgeons: Employee[];                  // Primary surgeon(s)
    assistantSurgeons: Employee[];         // Assistant surgeon(s)
    anaesthetists: Employee[];             // Anesthesiologist(s)
    scrubNurse: Employee[];                // Scrub nurse(s)
    floorNurse: Employee[];                // Floor/circulating nurse(s)

    // Diagnosis (SNOMED-CT coded via SM_001)
    preOperativeDiagnosis: DiagnosisTerm[];
    diagnosis: DiagnosisTerm[];            // Post-operative diagnosis
    preOperativeDiagnosisNotes: string;    // Free text supplement
    diagnosisNotes: string;

    // Procedures
    operations: Operation[];
    operationType: "NORMAL" | "EMERGENCY";
    operationNotes: string;                // CKEditor HTML

    // Clinical Documentation (all CKEditor HTML)
    findings: string;
    perioperativeComplications: string;
    detailsOfProcedure: string;
    surgicalSpecimenSentForExamination: string;
    postOpNotes: string;                   // Post-operative advice
}

Employee {
    id: number;
    displayName: string;
    newlyAdded: boolean;                   // Tracks newly added team members
}

Operation {
    surgery: {
        id: number;
        name: string;
        code: string;
        newAdded: boolean;
        print: boolean;
    };
    snomed: {
        name: string;
        identifier: {
            code: string;
            standardCodes: [{ system: "SNOMED-CT", code: string }];
        };
        print: boolean;
    };
}

DiagnosisTerm {
    term: string;
    concept: { conceptId: string };
}
```

### 3.2 Surgery List & Status

OT notes are grouped by date (Today / Yesterday / DD-MM-YYYY) and filtered by surgery status:

```
OT Request Statuses: IN_PROGRESS | ON_HOLD | DEFERRED | COMPLETED
Note Statuses: draft=true (WIP) | draft=false (finalized)
```

The list page cross-references **performed surgeries** (from OT_001) with **existing OT notes** (from OT_002). A surgery appears with a "create note" action if no note exists yet, and a "view/edit" action if one does.

### 3.3 Surgery List Flow

```
OperationNotePage loads
  │
  ├── 1. ATHMA GET OT_002
  │     Query: status:(IN_PROGRESS OR ON_HOLD OR DEFERRED OR COMPLETED)
  │            AND patient.mrn:{mrn}
  │            AND inPatient.admissionDetails.admissionNumber:{admNo}
  │     Sort: wheelInTime,desc
  │     → Returns list of OT records
  │
  ├── 2. Group by date
  │     Today → "Today"
  │     Yesterday → "Yesterday"
  │     Older → "DD-MM-YYYY"
  │
  ├── 3. For each OT record, check if form template exists
  │     ATHMA GET MDM_009
  │     Query: serviceMaster.id:({ids})
  │            AND unit.id:{unitId}
  │            AND formTemplates.formPrintTemplate.templateName:"operation-note.ftl"
  │     → Determines if OT note template is available for this surgery type
  │
  └── 4. Display list
        │
        ├── [+] Create new note → navigates to OperationNoteCreatePage
        └── Tap existing → navigates to OperationNoteDetailsPage (or create if draft)
```

### 3.4 Create/Edit OT Note (OperationNoteCreatePage)

```
┌──────────────────────────────────────────────────────────────┐
│  [<]  Operation Note                              [Done]    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Ward: ICU-5 (auto)    Bed: 12 (auto)                       │
│  Admission: 15-Apr-2026 (auto)                              │
│  Operation Date: 18-Apr-2026 (auto)                         │
│                                                              │
│  SURGICAL TEAM:                                              │
│    Surgeon:        [Search...] (min 3 chars, MDM_007)       │
│      ┌────────────────────────────────────┐                  │
│      │ Dr. Sharma (EMP001)          [x]  │                  │
│      └────────────────────────────────────┘                  │
│    Asst. Surgeon:  [Search...]                               │
│    Anaesthetist:   [Search...]                               │
│    Scrub Nurse:    [Search...] (filtered: NURSE group)      │
│    Floor Nurse:    [Search...]                               │
│                                                              │
│  OPERATION TYPE:  ○ Normal   ○ Emergency                    │
│                                                              │
│  PRE-OPERATIVE DIAGNOSIS:                                    │
│    [Search SNOMED-CT: disorder, finding...] (SM_001)        │
│    ┌────────────────────────────────┐                        │
│    │ Acute appendicitis    [x]     │                        │
│    └────────────────────────────────┘                        │
│    Free-text notes: [____________________________]          │
│                                                              │
│  POST-OPERATIVE DIAGNOSIS:                                   │
│    [Search SNOMED-CT...] (SM_001)                           │
│    Free-text notes: [____________________________]          │
│                                                              │
│  OPERATION (procedure):                                      │
│    [+ Add Operation] → opens AddOperationPage modal         │
│                                                              │
│  FINDINGS:                    [CKEditor: bold/italic/list]  │
│  PERIOPERATIVE COMPLICATIONS: [CKEditor]                    │
│  DETAILS OF PROCEDURE:        [CKEditor]                    │
│  SURGICAL SPECIMEN:           [CKEditor]                    │
│  POST-OPERATIVE ADVICE:       [CKEditor]                    │
│                                                              │
│  [Cancel]                                     [Done]        │
└──────────────────────────────────────────────────────────────┘
```

#### Team Member Search (MDM_007)

```
User types 3+ characters in team member search
  │
  ├── ATHMA GET MDM_007
  │     Query: unit.id:{unitId}
  │            AND (group.code:({DOCTOR or NURSE depending on field}))
  │            AND employee.displayName:*{search}*
  │     Max results: 20
  │
  └── User selects → added to team array with newlyAdded=true
```

#### SNOMED-CT Diagnosis Search (SM_001)

```
User types search term in diagnosis field
  │
  ├── ATHMA GET SM_001
  │     Params: limit=50
  │             &conceptActive=true
  │             &active=true
  │             &semanticTags=disorder,procedure,finding,morphologic abnormality,tumor staging
  │             &term={searchTerm}
  │
  └── Returns: [{ term, concept: { conceptId } }]
```

### 3.5 Add Operation Modal (AddOperationPage)

The operation/procedure selection uses a **dual search** pattern:

```
┌──────────────────────────────────────────────────────┐
│  [<]  Add Operation                                  │
├──────────────────────────────────────────────────────┤
│                                                      │
│  HOSPITAL DATABASE:                                  │
│    [Search surgery name/code...]  (MDM_008)         │
│    ┌──────────────────────────────────────────────┐  │
│    │  Appendectomy (SRG001)               [+]    │  │
│    │  Laparoscopic Appendectomy (SRG002)  [+]    │  │
│    └──────────────────────────────────────────────┘  │
│                                                      │
│  SNOMED-CT:                                          │
│    [Search procedure term...]  (SM_001)             │
│    ┌──────────────────────────────────────────────┐  │
│    │  Appendectomy (80146002)             [+]    │  │
│    └──────────────────────────────────────────────┘  │
│                                                      │
│  SELECTED:                                           │
│    ┌──────────────────────────────────────────────┐  │
│    │  Laparoscopic Appendectomy           [x]    │  │
│    └──────────────────────────────────────────────┘  │
│                                                      │
│  [Cancel]                            [Add]          │
└──────────────────────────────────────────────────────┘
```

**Duplicate prevention:** Before adding, the system checks both `surgery` and `snomed` arrays for existing operations with matching names/codes.

**Hospital DB search (MDM_008):**
```
Query: serviceMaster.serviceType.code.raw:(Operation OR Procedure OR Surgery)
       AND *{searchTerm}*
Params: unitId={unitId}, size=20
```

**Output structure per operation:**
```typescript
{
    surgery: { name, code, id, newAdded: true, print: true },
    snomed: {
        name: operationObj.term,
        identifier: {
            code: operationObj.term,
            standardCodes: [{ system: "SNOMED-CT", code: operationObj.concept.id }]
        },
        print: true
    }
}
```

### 3.6 Mandatory Sections Validation

15 sections are configurable per unit via `MDM_002`:

```
SURGEON, ASSISTANT SURGEON, ANAESTHETISTS, SCRUB NURSE, FLOOR NURSE,
PRE OPERATIVE DIAGNOSIS, POST OPERATIVE DIAGNOSIS,
TYPE OF OPERATION, OPERATION TYPE, OPERATION,
FINDINGS, PERIOPERATIVE COMPLICATIONS, DETAILS OF PROCEDURE,
SURGICAL SPECIMEN SENT FOR EXAMINATION, Post Operative Advice
```

**Fetch config:**
```
ATHMA GET MDM_002
Query: key:ot_notes_mandatory_section AND (applicableType:system OR unit OR global OR local)
```

**Validation on save:** Each mandatory section is checked for non-empty content -- arrays must have `length > 0`, text fields must be non-blank after trimming.

### 3.7 Save & PDF

**Save (new):** `ATHMA POST OT_006` with full `OTNotes` object
**Save (update):** `ATHMA PUT OT_006` with full `OTNotes` object (includes `id`)

**PDF download:**
```
ATHMA GET OT_003
Params: ?otRequestNo={no}&serviceCode={code}&printLogoWithHeaderAndFooter=false
Response: Blob (PDF)
→ Opened in PDF viewer
```

---

## 4. Pre-Anesthesia Checkup (PAC)

PAC is a comprehensive pre-surgical assessment performed by anesthesiologists. It features version control, value-set-driven forms, and an ASA classification reference modal.

### 4.1 Data Model

```typescript
PAC {
    id: string;
    version: number;
    concept: {
        preAnaesthesia: {
            status: "Cleared" | "Re-evaluation Required" | "Not Cleared";
            source: "AADI";

            // Physical Examination
            generalExamination: {
                records: ExaminationRecord[];
                noAbnormalityDetected: boolean;
                notes: string;
            };

            // Systemic Review (6 body systems)
            systemicExamination: {
                respiratorySystems:   { records[], noAbnormalityDetected, notes };
                cnsMusculoskeletal:   { records[], noAbnormalityDetected, notes };
                endocrine:           { records[], noAbnormalityDetected, notes };
                cardioVascularSystems: { records[], noAbnormalityDetected, notes };
                hepaticRenal:        { records[], noAbnormalityDetected, notes };
                others:              { records[], noAbnormalityDetected, notes };
            };

            // Airway Assessment
            airwayAssessment: {
                mouthOpening: { records[] };
                teeth: { normal: boolean, remarks: string };
                neckMovementsSpineEvaluation: { normal: boolean, remarks: string };
                intubation Difficulty: { check: boolean, remarks: string };
                met: { score: number };                             // MET score
                deepVeinThrombosisRiskAssessment: { score: number, text: string };
                asa: { score: "I"|"II"|"III"|"IV"|"V"|"VI", text: string };
            };

            // Diagnostic Impressions
            ecgImpression: string;
            echoImpression: string;
            xrayImpression: string;
            previousAnaesthesia: string;

            // Anesthesia Plan
            anaesthesiaPlan: {
                planType: ValueSetItem[];                           // From PAC_ANAESTHESIA_PLAN
                postOpICURequired: { check: boolean, remarks: string };
                bloodProductRequired: { check: boolean, remarks: string };
                npo: string;                                        // Nil Per Os hours
            };

            advice: string;
            remarks: string;
        };
    };
}
```

### 4.2 Version Control

Every PAC save creates a new version. Users can browse historical versions but only edit the latest.

```
┌──────────────────────────────────────────────────────┐
│  [<]  Pre-Anesthesia Checkup                        │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Version: [▾ V.3 (Current) ]                        │  ← dropdown selector
│                V.2  (16 Apr)                         │
│                V.1  (15 Apr)                         │
│                                                      │
│  ── Viewing V.3 (Current) ──                         │  ← editable
│  ... form fields ...                                 │
│                                                      │
│  [Save]                                              │  ← creates V.4
└──────────────────────────────────────────────────────┘
```

**Version load flow:**
```
1. ATHMA GET EHR_097
   Params: ?mrn={mrn}&formType=PRE_ANAESTHESIA_CHECKUP&referenceDate={date}
   → Returns current PAC data

2. ATHMA GET EHR_100/{id}
   → Returns list of all versions

3. User selects version from dropdown:
   ATHMA GET EHR_099/{id}/{versionId}
   → Loads specific version data

4. If version !== latest → form fields disabled (read-only)
```

### 4.3 ASA Classification Reference (AsaPage)

A modal showing the American Society of Anesthesiologists physical status classification:

| Score | Description | Example |
|-------|-------------|---------|
| **I** | Normal healthy patient | Healthy 25-year-old |
| **II** | Mild systemic disease | Controlled hypertension |
| **III** | Severe systemic disease limiting activity | Poorly controlled diabetes |
| **IV** | Severe systemic disease, constant threat to life | Recent heart attack |
| **V** | Moribund, not expected to survive without operation | Ruptured aortic aneurysm |
| **VI** | Brain-dead patient for organ donation | Organ donor |

Accessed via info icon next to the ASA score field. Read-only reference.

### 4.4 Value Sets

Three value sets are fetched from `MDM_001` on page load:

| Value Set Code | Purpose | Used In |
|---------------|---------|---------|
| `PAC_ANAESTHESIA_PLAN` | Anesthesia plan types (General, Regional, Spinal, etc.) | Anesthesia Plan → planType multi-select |
| `PAC_CHECKUP_STATUS` | Final PAC status options | Status dropdown (Cleared / Re-evaluation / Not Cleared) |
| `PAC_ASA_FORM` | ASA score descriptions | ASA score selector |

### 4.5 Post-Op ICU & Blood Products

Two critical binary questions with conditional remarks:

```
Post-Op ICU Required:
  ○ Yes  → [Remarks: ________________________________]
  ○ No

Blood Products Required:
  ○ Yes  → [Remarks: ________________________________]
  ○ No
```

### 4.6 Authority Check

Only users with specific PAC authorities can edit the form:

```
GET UAA_003 → returns user's authorities array
Check: USER_PAC_AUTHORITIES present in authorities
  → true:  form fields enabled, [Save] button shown
  → false: all fields read-only, no save button
```

### 4.7 Save Flow

```
User taps [Save]
  │
  ├── Validate required fields (status must be selected)
  │
  ├── Set source = "AADI"
  │
  ├── ATHMA PUT EHR_099
  │     Body: full PAC object
  │     → Creates new version server-side
  │
  └── Success → reload version list, toast: "PAC saved successfully"
```

---

## 5. Incident Reports

Incident reports capture patient safety events with a description and optional photographic evidence. The system uses a two-stage upload pipeline (file upload, then report submission).

### 5.1 Data Model

```typescript
IncidentReport {
    createdBy: string;                            // Current user login
    createdOn: ISO8601;                           // YYYY-MM-DDTHH:mm:ss.SSS
    description: string;                          // Max 2000 chars, REQUIRED
    mrno: string;                                 // Patient MRN
    encounterNo: string;                          // Encounter number
    reportedOn: ISO8601;                          // Current timestamp
    reporterLogin: string;                        // Current user login
    reporterName: string;                         // Current user firstName
    reporterType: "STAFF";                        // Always STAFF
    status: "NEW";                                // Always NEW on creation
    type: "PATIENT";                              // Always PATIENT
    party: "PATIENT";                             // Always PATIENT
    documents: string[];                          // Array of file names
    documentsDetails: Array<{
        id: null;
        "aadi-filePath": string;                  // Server path from upload response
        documentName: string;                     // Original file name
        uploadedBy: string;                       // Current user login
        active: true;
        documentType: "IMAGE";
        source: {
            documentType: "AADI";
            referenceNumber: null;
        };
    }>;
}
```

### 5.2 Form Layout

```
┌──────────────────────────────────────────────────────┐
│  [<]  Incident Report                                │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Patient: John Smith (MRN: 123456)                  │
│  Gender: M | Age: 45y | Weight: 72kg                │
│                                                      │
│  UPLOAD ATTACHMENTS (2/5)                            │
│    [+ Take Photo]    [+ From Gallery]               │
│                                                      │
│    ┌────────┐  ┌────────┐                            │
│    │ img_1  │  │ img_2  │                            │
│    │   [x]  │  │   [x]  │                            │
│    └────────┘  └────────┘                            │
│                                                      │
│  DESCRIPTION *                                       │
│  ┌────────────────────────────────────────────────┐  │
│  │ Patient experienced a fall while attempting    │  │
│  │ to walk to bathroom unassisted at approx       │  │
│  │ 3:30 AM. No visible injuries.                  │  │
│  └────────────────────────────────────────────────┘  │
│  (1847 / 2000 characters)                            │
│                                                      │
│  [Cancel]                              [Complete]   │
└──────────────────────────────────────────────────────┘
```

### 5.3 Image Management

| Property | Value |
|----------|-------|
| Max images | 5 total |
| Source: Camera | Capacitor Camera plugin, quality: 50 |
| Source: Gallery | Multi-select up to 8 at once, total capped at 5 |
| Format | JPEG (camera creates `image_${Date.now()}.jpg`) |
| Remove | Tap X on thumbnail; if already uploaded (has ID), show confirmation alert |
| Preview | Tap thumbnail for full-screen modal view |

### 5.4 Upload Pipeline

```
Step 1: Image Capture/Selection
  Camera → Capacitor Camera.getPhoto() → Blob
  Gallery → Capacitor Camera.pickImages() → Blob[]
  Convert: new File([blob], 'image_${Date.now()}.jpg')

Step 2: Read as Base64
  FileReader.readAsDataURL(file) → base64 string

Step 3: Upload Each Image Individually
  POST api/athma/_upload/base64FileDataWithChecksum
  Content-Type: multipart/form-data
  FormData fields:
    data: base64String
    mrn: patient MRN
    fileName: image filename
    dirName: encounterNumber
    documentType: "IMAGE"
    md5Checksum: "dummy"                   // Hardcoded placeholder
  Response: { filePath: string, fileName: string }

Step 4: Collect Upload Responses
  For each successful upload:
    documentsDetails.push({
        id: null,
        "aadi-filePath": response.filePath,
        documentName: response.fileName,
        uploadedBy: currentUser.login,
        active: true,
        documentType: "IMAGE",
        source: { documentType: "AADI", referenceNumber: null }
    })
    documents.push(response.fileName)

Step 5: Submit Incident Report
  PUT api/athma/_upload/incident-reports
  Headers: { athmaToken: storedAthmaToken }
  Body: full IncidentReport object with all documentsDetails populated
```

### 5.5 Validation

| Field | Rule | Error |
|-------|------|-------|
| Description | Required, non-empty after trim | "Description is required" |
| Description | Max 2000 characters | Character counter shown; input blocked at limit |
| Images | Max 5 | Gallery selection capped; toast if exceeded |

---

## 6. Initial Assessment (IA) -- 16+ Widget Sections

The Initial Assessment is the most complex form in AADI. It captures a comprehensive admission assessment using a **widget-based architecture** where each clinical section is a self-contained widget with its own API endpoints, form structure, and search capabilities.

### 6.1 Architecture Overview

```
InitialAssessmentPage
  │
  ├── widgetInfo[] ← controls which sections are visible (per-unit config)
  │
  ├── Widget List (scrollable cards)
  │     ├── Each widget card: title, summary of entries, [+] add button
  │     └── Tap [+] → opens AddModifyWidgetComponent (modal)
  │
  ├── AddModifyWidgetComponent
  │     ├── Reactive FormGroup per widget type
  │     ├── SearchComponent embedded for searchable widgets
  │     └── Form fields specific to widget type
  │
  ├── SearchComponent
  │     ├── Favorites tab (EHR_105 / EHR_024)
  │     ├── Search tab (EHR_025 or SM_001 for SNOMED)
  │     └── Selection → auto-populates form fields
  │
  ├── [Submit IA] → ATHMA PUT EHR_146
  └── [Download PDF] → ATHMA GET EHR_128 (blob)
```

### 6.2 IAWidgets Enum (27 Defined, ~16 Commonly Shown)

```typescript
enum IAWidgets {
    Allergy                                    = "allergy",
    Comorbidities                              = "comorbidities",
    ChiefComplaintsAndHistoryOfPresentIllness  = "chiefComplaint",
    SocialHistory                              = "socialHistory",
    PastHistoryMedical                         = "medical-history",
    SurgicalHistory                            = "surgicalHistory",
    ImplantableDevices                         = "implantable_devices",
    FamilyHistory                              = "family-history",
    RelevantPersonalInvestigations             = "relevant_personal_investigations",
    InvestigationResults                       = "investigation_results",
    PastMedicationAndReconciliation            = "past_medication_and_reconciliation",
    VitalSigns                                 = "vital_signs",
    GeneralExamination                         = "general_examination",
    SystemicExamination                        = "systemic-examination",
    MaternalAndChildHealth                     = "maternalAndChildHealth",
    ProvisionalDiagnosis                       = "diagnosis",
    InvestigationsAdvised                      = "investigations_advised",
    TreatmentPlan                              = "treatment_plan",
    DischargePlanning                          = "dischargePlan",
    PsychologicalAssessment                    = "psychologyAssessment",
    CommunicableDiseaseAssessment              = "communicableDiseases",
    RadiationOncology                          = "radiation_oncology",
    GeneralImpression                          = "general_impression",
    MLC                                        = "mlc",
    PrimarySurvey                              = "primary_survey",
    LinesAndTubes                              = "lines_and_tubes",
    Psychological                              = "psychological"
}
```

**`widgetInfo` flags** from the server configuration control which widgets are displayed for a given unit/department. Not all 27 widgets are shown for every patient.

### 6.3 Widget API Mapping

Each widget has a **read** endpoint (GET) and a **write** endpoint (POST/PUT/DELETE):

| Widget | Read (GET) | Write (POST/PUT/DELETE) | Favorites |
|--------|-----------|------------------------|-----------|
| Allergy | EHR_002 | EHR_145 | EHR_105 |
| Comorbidities | EHR_162 | EHR_162 | -- |
| Chief Complaints | EHR_003 | EHR_163 | EHR_105 |
| Social History | EHR_004 | EHR_151 | -- |
| Past Medical History | EHR_005 | EHR_149 | EHR_105 |
| Surgical History | EHR_006 | EHR_150 | EHR_105 |
| Family History | EHR_008 | EHR_152 | EHR_105 |
| Vital Signs | EHR_010 | EHR_031 | -- |
| General Examination | EHR_011 | EHR_157 | -- |
| Systemic Examination | EHR_012 | EHR_158 | -- |
| Provisional Diagnosis | EHR_013 | EHR_153 | EHR_105 |
| Investigations Advised | EHR_014 | -- | EHR_024 |
| Lines & Tubes | EHR_050 | -- | -- |
| Implantable Devices | EHR_051 | -- | -- |
| Communicable Diseases | EHR_037, EHR_035 | -- | -- |
| Psychological | EHR_159 | EHR_159 | -- |
| MLC | ADT_004 | -- | -- |
| Discharge Planning | EHR_146 | EHR_146 | -- |
| Maternal & Child Health | -- | -- | -- |
| Treatment Plan | -- | -- | -- |

### 6.4 "No Known..." Checkbox Pattern

Several widgets (Allergy, Past Medical History, Surgical History, Family History) support a "No known..." checkbox that toggles between an empty state and a single negative entry:

```
┌──────────────────────────────────────────────────────┐
│  ALLERGY                                             │
│                                                      │
│  ☑ No Known Allergies                                │
│                                                      │
│  ── OR ──                                            │
│                                                      │
│  ☐ No Known Allergies                                │
│  ┌──────────────────────────────────────────────┐    │
│  │  Penicillin (Drug Allergy)    Severe   [x]  │    │
│  │  Shellfish (Food Allergy)     Moderate [x]  │    │
│  └──────────────────────────────────────────────┘    │
│  [+ Add Allergy]                                     │
└──────────────────────────────────────────────────────┘
```

**Toggle behavior:**
1. User checks "No known..."
2. Warning dialog: "This will delete all existing entries. Continue?"
3. If confirmed:
   - Bulk DELETE all existing entries for this widget
   - POST a single "No Known {type}" entry
4. User unchecks "No known...":
   - DELETE the "No Known" entry
   - Widget reverts to empty state with [+ Add] button

### 6.5 SearchComponent

The SearchComponent provides a unified search interface used by multiple widgets:

```
┌──────────────────────────────────────────────────────┐
│  ┌──────────────┬──────────────┐                     │
│  │  Favorites   │    Search    │                     │  ← segment tabs
│  └──────────────┴──────────────┘                     │
│                                                      │
│  ── Favorites Tab ──                                 │
│  Loaded via: EHR_105 GET (consultant's favorites)    │
│  ┌──────────────────────────────────────────────┐    │
│  │  Penicillin Allergy               [+]       │    │
│  │  Aspirin Sensitivity              [+]       │    │
│  │  Latex Allergy                    [+]       │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ── Search Tab ──                                    │
│  [Search: _______________] (min 3 chars, debounced)  │
│  Search via: EHR_025 GET (concept values)            │
│         or:  SM_001 GET (SNOMED-CT)                  │
│  ┌──────────────────────────────────────────────┐    │
│  │  Amoxicillin hypersensitivity     [+]       │    │
│  │  Cephalosporin allergy            [+]       │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

**EHR_025 search (concept values):**
```
ATHMA GET EHR_025
Params: key={widgetSearchKey}&queryValue={searchTerm}
→ Returns matching concept values for the widget type
```

**SM_001 search (SNOMED-CT) -- used for diagnosis widgets:**
```
ATHMA GET SM_001
Params: limit=50&conceptActive=true&active=true
        &semanticTags=disorder,procedure,finding,morphologic abnormality,tumor staging
        &term={searchTerm}
→ Returns SNOMED-CT coded terms
```

### 6.6 AddModifyWidgetComponent

Each widget type gets a **reactive FormGroup** with widget-specific fields. The component adapts its form layout based on the widget type passed as an input.

**Common pattern for add/modify:**
```
1. User taps [+] on widget card
2. AddModifyWidgetComponent opens as modal
3. SearchComponent shown if widget supports search
4. User selects item or fills form fields
5. [Save] → POST {saveKey} endpoint with form data
6. Modal closes → widget card refreshes from server
```

**Common pattern for edit:**
```
1. User taps existing entry in widget card
2. AddModifyWidgetComponent opens with pre-populated data
3. User modifies fields
4. [Save] → PUT {saveKey} endpoint with updated data
5. Modal closes → widget card refreshes
```

**Common pattern for delete:**
```
1. User taps [x] on existing entry
2. Confirmation dialog
3. DELETE {saveKey}/{id} endpoint
4. Widget card refreshes
```

### 6.7 Vital Signs Widget (Most Complex Form)

The Vital Signs widget contains **22+ form fields** with auto-calculation logic:

```
┌──────────────────────────────────────────────────────────────────────┐
│  VITAL SIGNS                                                         │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Blood Pressure:                                                     │
│    Mode: ○ Sitting   ○ Standing   ○ Lying   ○ Arterial              │
│    Systolic:  [120]    Diastolic: [80]    (mmHg)                    │
│                                                                      │
│  Heart Rate:          [72]    (bpm)                                  │
│  Respiratory Rate:    [16]    (breaths/min)                          │
│  Temperature:         [98.6]  (F)    ○ F  ○ C                      │
│  SpO2:                [98]    (%)                                    │
│                                                                      │
│  Height:              [170]   (cm)                                   │
│  Weight:              [72]    (kg)                                    │
│  BMI:                 [24.9]  (auto-calculated)                      │
│  BSA:                 [1.83]  (auto-calculated)                      │
│                                                                      │
│  Pulse:               [72]    (bpm)                                  │
│  GRBS:                [110]   (mg/dL)                                │
│  Pain Score:          [3]     (0-10)                                 │
│  GCS:                 [15]    (3-15)                                 │
│  CHEWS Score:         [2]                                            │
│  CRT:                 [2]     (seconds)                              │
│                                                                      │
│  Intake:              [1500]  (mL)                                   │
│  Output:              [1200]  (mL)                                   │
│  Drain:               [50]    (mL)                                   │
│                                                                      │
│  Head Circumference:  [___]   (cm)   ← pediatric                   │
│  Mid-Arm Circ:        [___]   (cm)                                   │
│                                                                      │
│  [Cancel]                                           [Save]          │
└──────────────────────────────────────────────────────────────────────┘
```

**Auto-calculations:**

```typescript
// BMI = weight(kg) / height(m)^2
BMI = weight / ((height / 100) ** 2)

// BSA (Du Bois formula) = 0.007184 * weight^0.425 * height^0.725
BSA = 0.007184 * Math.pow(weight, 0.425) * Math.pow(height, 0.725)
```

**BP split modes:** The blood pressure field can render in multiple modes (Sitting, Standing, Lying, Arterial) with separate systolic/diastolic pairs for each position.

**Temperature conversion:** If unit selector is set to Celsius, the app auto-converts: `F = C * 9/5 + 32`

### 6.8 Submit IA Flow

```
User taps [Submit IA]
  │
  ├── 1. Validate all required widgets have data
  │
  ├── 2. ATHMA PUT EHR_146
  │     Body: { all widget data assembled, status: "SUBMITTED" }
  │
  ├── 3. System creates task: INITIAL_ASSESSMENT_REVIEW
  │     → Appears in Activity Area for senior doctor
  │
  └── 4. Toast: "Initial Assessment submitted successfully"
```

### 6.9 Download IA PDF

```
ATHMA GET EHR_128
Response: Blob (PDF)
→ Opens in PDF viewer (same viewer as OT notes, lab reports)
```

### 6.10 IA Disabled Check

```
ATHMA GET EHR_165
→ Returns whether IA is disabled for this encounter
→ If disabled: entire page shows read-only message, no edit controls
```

---

## 7. Risk Score

The Risk Score system provides AI-powered mortality prediction with D3.js visualizations, a circular gauge scorecard, and per-parameter drill-down.

### 7.1 Three Views

| Page | Purpose | API |
|------|---------|-----|
| RiskScorePage | D3.js line chart of risk score over time | `GET api/_search/risk-score/{mrn}/{enc}` |
| RiskScorecardPage | SVG circular gauge + AI prediction text | `GET api/mortality-prediction-score/{mrn}/{enc}` |
| RiskScoreParamsPage | Individual parameter D3.js charts | Same data, filtered per parameter |

### 7.2 Risk Score Response Model

```typescript
// From api/mortality-prediction-score/{mrn}/{enc}
MortalityPrediction {
    refreshdatetime: string;
    riskScorePercentage: number;           // 0-100
    riskScore: number;
    dataJson: Array<{
        parameter_name: string;            // e.g., "WBC Count", "Creatinine"
        score: number;
        value: number;
    }>;
    aiPrediction: {
        class_1: number;                   // Risk probability (0-1), displayed as percentage
        init: string;                      // Observations (newline-separated)
        summary: string;                   // AI prediction explanation
        createdDateTime: string;
        losDay: number;                    // Length of Stay prediction (days)
    };
    plot: boolean;
}

// From api/_search/risk-score/{mrn}/{enc}
RiskScoreHistory {
    data: Array<{
        timestamp: string;
        score: number;
        parameters: Array<{
            parameter_name: string;
            score: number;
            value: number;
        }>;
    }>;
}

// From api/_search/vi-score/{mrn}/{enc}
VIScore {
    // Vasoactive-Inotropic Score (alternate view)
    data: Array<{
        timestamp: string;
        score: number;
    }>;
}
```

### 7.3 D3.js Line Chart (RiskScorePage)

```
┌──────────────────────────────────────────────────────┐
│  [<]  Risk Score                                     │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Score                                               │
│   50 ┤                                               │
│      │        ●──────●                               │  ← RED (>33)
│   33 ┤ - - - -│- - - -│- - - - - - - - - - - - - -  │  ← threshold line
│      │  ●────●         ●──────●                      │  ← BLUE (<=33)
│   20 ┤                         ●                     │
│      │                                               │
│    0 ┤───────────────────────────────────────────    │
│      10:00   14:00   18:00   22:00   02:00   06:00  │
│      18/04          19/04                            │
└──────────────────────────────────────────────────────┘
```

**D3.js configuration:**
- Line stroke: 1.5px default, 2.5px on hover
- Circle radius: 3px default, 6px on hover
- Color: **RED (#F43636)** if score > 33, **BLUE/GREEN (#7dc9b8)** if score <= 33
- X-axis: Time scale, format "HH:MM DD/MM"
- Y-axis: Dynamic range based on data
- Rolling 2-day window

**Tap interaction:** Tapping a data point navigates to `RiskScoreParamsPage` showing that timestamp's contributing parameters.

### 7.4 Risk Scorecard (RiskScorecardPage)

```
┌──────────────────────────────────────────────────────┐
│  [<]  Risk Scorecard                                 │
├──────────────────────────────────────────────────────┤
│                                                      │
│              ┌──────────────────┐                    │
│             /   42%              \                   │
│            │     [needle]        │                   │  ← SVG gauge
│             \                   /                    │
│              └──────────────────┘                    │
│           Low      Avg       High                   │
│          0-30    30-70     70-100                    │
│                                                      │
│  AI PREDICTION:                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │  Length of Stay: 5 days                      │   │
│  │                                              │   │
│  │  Summary: "Patient shows elevated            │   │
│  │  inflammatory markers with declining         │   │
│  │  renal function..."                          │   │
│  │                                              │   │
│  │  Observations:                               │   │
│  │  - WBC Count: 15.2 (elevated)               │   │
│  │  - Creatinine: 2.8 (elevated)               │   │
│  │  - Heart Rate: 102 (tachycardic)            │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  CONTRIBUTING FACTORS:                               │
│  ┌────────────────────────────────────────┐          │
│  │  WBC Count        Score: 8    (!)     │          │  ← red if score > 0
│  │  Creatinine       Score: 5    (!)     │          │
│  │  Heart Rate       Score: 3            │          │
│  │  Age              Score: 2            │          │
│  │  Hemoglobin       Score: 1            │          │
│  └────────────────────────────────────────┘          │
└──────────────────────────────────────────────────────┘
```

**Gauge zones:**
- **Low (green):** 0-30%
- **Average (yellow):** 30-70%
- **High (red):** 70-100%

**AI prediction parsing:**
- `class_1` (0-1 float) is multiplied by 100 for percentage display
- `init` (newline-separated string) is split into observation bullets
- `summary` displayed as prose paragraph
- `losDay` shown as "Length of Stay: N days"

### 7.5 Parameter Drill-Down (RiskScoreParamsPage)

Each contributing parameter gets its own D3.js mini-chart showing that parameter's trend over time. Color coding: **RED** if parameter score > 0 (contributing to risk), **BLUE** if score = 0.

### 7.6 VIS Score Alternate View

An alternate visualization showing the Vasoactive-Inotropic Score (VIS) trend. This view uses the same D3.js chart infrastructure but queries `api/_search/vi-score/{mrn}/{enc}`.

### 7.7 Local SQLite Update

When risk score data is fetched from the server, the local SQLite `PatientInfo` table is updated:

```sql
UPDATE PatientInfo SET risk_score = {riskScorePercentage} WHERE mrn = {mrn}
```

This keeps the patient list risk score badge in sync without requiring another server call.

---

## 8. Activity Area & Tasks

The Activity Area is the task management hub in AADI, aggregating 6 categories of clinical tasks across all patients assigned to the current user.

### 8.1 Activity Area (ActivityAreaPage)

The Activity Area opens as a **modal** from the Landing Page dashboard.

```
┌──────────────────────────────────────────────────────┐
│  [x]  Activity Area                                  │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────┐                │
│  │  PN Acknowledgement         (3) │                │  ← pending PN acknowledgments
│  └──────────────────────────────────┘                │
│  ┌──────────────────────────────────┐                │
│  │  DS Creation                (2) │                │  ← discharge summaries to create
│  └──────────────────────────────────┘                │
│  ┌──────────────────────────────────┐                │
│  │  DS Signoff                 (1) │                │  ← DS awaiting signoff
│  └──────────────────────────────────┘                │
│  ┌──────────────────────────────────┐                │
│  │  IA Review                  (4) │                │  ← initial assessments to review
│  └──────────────────────────────────┘                │
│  ┌──────────────────────────────────┐                │
│  │  Checklist Approval         (2) │                │  ← checklists pending approval
│  └──────────────────────────────────┘                │
│  ┌──────────────────────────────────┐                │
│  │  Cross Consultation         (1) │                │  ← incoming cross-consultations
│  └──────────────────────────────────┘                │
│                                                      │
│  Total Tasks: 13                                     │
└──────────────────────────────────────────────────────┘
```

### 8.2 Data Loading Flow

```
ActivityAreaPage opens
  │
  ├── 1. Query SQLite for encounter numbers
  │     SELECT encounter_number FROM PatientInfo
  │     WHERE (ip_activity_action IS NULL OR ...)
  │     → Builds list of active encounters
  │
  ├── 2. Get task counts from server
  │     POST api/task/total-count
  │     Body: { query: "encounterNumber IN ({enc1, enc2, ...})" }
  │     → Returns total count
  │
  ├── 3. Get aggregated task breakdown
  │     POST api/_search/aggregation/tasks
  │     Body: {
  │         query: "encounterNumber IN ({...})",
  │         parentFieldName: "taskDefinition.code",
  │         level1FieldName: "taskStatus",
  │         ...
  │     }
  │     → Returns counts per category
  │
  └── 4. Render 6 category cards with counts
```

### 8.3 Task Category Routing

| Category | Task Definition Code | Tap Action | Target Page |
|----------|---------------------|------------|-------------|
| PN Acknowledgement | `PROGRESS_NOTES_ACKNOWLEDGMENT` | Navigate to patient → PN preview | ProgressNotesPreviewPage |
| DS Creation | `DISCHARGE_SUMMARY_CREATION` | Navigate to patient → DS editor | DischargeSummaryPage |
| DS Signoff | `DISCHARGE_SUMMARY_SIGNOFF` | Navigate to patient → DS review | DischargeSummaryPage |
| IA Review | `INITIAL_ASSESSMENT_REVIEW` | Navigate to patient → IA read-only | InitialAssessmentPage |
| Checklist Approval | `CHECKLIST_APPROVAL` | Open checklist modal | EditChecklistPage |
| Cross Consultation | `CROSS_CONSULTATION` | Navigate to CC list | CrossConsultationListPage |

**Routing flow per task:**
```
User taps task category card
  │
  ├── GET api/_search/tasks
  │     Query: taskDefinitionCode={code} AND encounterNumber IN ({...})
  │     → Returns list of matching tasks with patient details
  │
  ├── Select specific task/patient
  │
  └── Navigate to appropriate page with patient context
```

### 8.4 Task Creation (TasksCreatePage)

Used to create **nursing capture notes** tasks -- manual task assignments for nursing staff.

```
┌──────────────────────────────────────────────────────┐
│  [<]  Create Task                                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  Title: *                                            │
│    [Check patient vitals_____]  (max 25 chars)      │
│                                                      │
│  Description:                                        │
│    [Monitor BP every 2 hours and record in chart.   │
│     Alert if systolic > 160 or diastolic > 100.]    │
│                                                      │
│  Priority:                                           │
│    ○ LOW   ● MEDIUM   ○ HIGH   ○ URGENT             │  ← default: MEDIUM
│                                                      │
│  Starts On: *                                        │
│    [22-Apr-2026  14:00]  [Calendar]                 │  ← must be >= now
│                                                      │
│  Due On: *                                           │
│    [22-Apr-2026  16:00]  [Calendar]                 │  ← must be >= startsOn
│                                                      │
│  [Cancel]                              [Create]     │
└──────────────────────────────────────────────────────┘
```

**Data model:**
```typescript
Task {
    name: string;                          // Max 25 chars
    description: string;
    patient: { id, mrn };
    encounter: { documentNumber };
    taskDefinition: {
        id: 1,
        code: "NURSING-CAPTURE-NOTES",
        name: "Capture Note"
    };
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    workflowStatus: "OPEN";
    taskStatus: "OPEN";
    assignee: { id, login, displayName, employeeNo };  // Auto from accepting nurse
    startsOn: ISO8601;
    dueOn: ISO8601;
    createdBy: { id, login, displayName, employeeNo };
    active: boolean;
}
```

**Validation rules:**

| Field | Rule |
|-------|------|
| Title | Required, non-empty, max 25 characters |
| Priority | Defaults to MEDIUM |
| startsOn (create mode) | Must be >= current time |
| startsOn (edit mode) | Must be >= original creation time |
| dueOn | Must be >= startsOn (minimum 1-hour difference) |

**Assignee auto-assignment:**
```
GET api/patient-infos/{patientId}
→ Extract accepting nurse from patient info
→ Set as task assignee automatically
```

**Feature flag check:**
```
GET api/task-enabled/{unitCode}
→ Returns boolean
→ If false: task creation UI hidden
```

**Create API:** `POST api/tasks` (observe: response)
**Update API:** `PUT api/tasks/{id}` (observe: response)

### 8.5 Task History (TasksHistoryPage)

```
┌──────────────────────────────────────────────────────┐
│  [<]  Task History                                   │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  Check patient vitals          MEDIUM        │    │
│  │  Monitor BP every 2 hours and record...      │    │  ← truncated at 70 chars
│  │  [Read more]                                 │    │  ← expands on tap
│  │  Due: 22-Apr 16:00                           │    │
│  │  Status: OPEN                                │    │
│  │  [Edit]  [Delete]                            │    │  ← only if creator + OPEN
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  Administer IV antibiotics     HIGH          │    │
│  │  Give Cefuroxime 750mg IV at...              │    │
│  │  Due: 22-Apr 08:00                           │    │
│  │  Status: CLOSED                              │    │  ← no edit/delete
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

**Data source:**
```
GET api/_search/task-dtos
Query: active:true AND encounter.documentNumber:{enc}
       AND taskDefinition.code:"NURSING-CAPTURE-NOTES"
Params: size=100&sort=id,desc
```

**Permissions:**
- Edit/Delete visible only if: `taskStatus === "OPEN"` AND current user is the task creator
- Delete: sets `active=false` via `PUT api/tasks/{id}` with confirmation modal
- Description: truncated at 70 characters with "Read more..." expansion toggle

---

## 9. Notification Preferences

A settings page for configuring push notification preferences.

### 9.1 Layout

```
┌──────────────────────────────────────────────────────┐
│  [<]  Notification Preferences                       │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  Lab Results Ready        [🔒 ON --------]   │    │  ← Mandatory: locked, always on
│  └──────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────┐    │
│  │  Medication Administered  [🔒 ON --------]   │    │  ← Mandatory
│  └──────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────┐    │
│  │  Progress Notes           [---- ON ------]   │    │  ← Optional: toggleable
│  └──────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────┐    │
│  │  Discharge Summary        [------ OFF ----]  │    │  ← Optional: toggleable
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  [Save]  ← enabled only when changes detected       │
└──────────────────────────────────────────────────────┘
```

### 9.2 Categories

| Category | Behavior | UI |
|----------|----------|-----|
| **Mandatory** | Always enabled, cannot be toggled off | Lock icon, toggle disabled |
| **Optional** | User can enable/disable | Toggle enabled |

### 9.3 Change Detection

```typescript
// Deep comparison via JSON serialization
const hasChanges = JSON.stringify(originalPreferences) !== JSON.stringify(currentPreferences);
// Save button enabled only when hasChanges === true
```

### 9.4 API

```
Load:  GET api/_search/user-notification-preferences/{login}
Save:  PUT api/_update/user-notification-preferences/{login} (observe: response)
       Body: updated preferences object
```

---

## 10. Discharged Patients

A list of recently discharged patients with search and navigation to their discharge summary.

### 10.1 Layout

```
┌──────────────────────────────────────────────────────┐
│  [<]  Discharged Patients                            │
├──────────────────────────────────────────────────────┤
│  [Search by name or MRN...]                          │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  John Smith (MRN: 123456)                    │    │
│  │  Discharged: 20-Apr-2026                     │    │
│  │  Unit: Cardiology                            │    │
│  └──────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────┐    │
│  │  Jane Doe (MRN: 789012)                      │    │
│  │  Discharged: 19-Apr-2026                     │    │
│  │  Unit: Orthopedics                           │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

### 10.2 Data Source

```
List:  GET api/_search/recent-discharge-patients
Count: GET api/count/recent-discharge-patients
```

### 10.3 Navigation

Tapping a discharged patient navigates to their `DischargeSummaryPage` in read-only mode. The discharge summary contains the complete clinical journey documentation.

### 10.4 Search

Real-time client-side filter on the loaded patient list by patient name or MRN. No server-side search API -- the full list is loaded upfront and filtered locally.

---

## 11. Complete API Reference

### 11.1 Checklist APIs (ATHMA)

| Code | Method | Purpose | Query/Body |
|------|--------|---------|------------|
| MDM_017 | GET | All checklist templates | `?query=active:true applicableFor.code:patient&size=100&sort=name.sort,asc` |
| EHR_036 | POST | Create checklist | ChecklistInstance body |
| EHR_036 | PUT | Update checklist | ChecklistInstance body (with id) |
| EHR_036 | GET | Get checklist by ID | `/{id}` |
| EHR_066 | GET | Patient checklists (excl. pending) | `active:true AND patient.mrn AND encounter.documentNumber AND !(status:PENDING_APPROVAL)&size=100&sort=id,desc` |
| EHR_066 | GET | Pending approval checklists | `active:true AND patient.mrn AND encounter.documentNumber AND status:PENDING_APPROVAL&size=100&sort=id,desc` |
| CL_001 | GET | Surgery tracker | `patient.mrn AND inPatient.admissionDetails.admissionNumber&sort=id,desc` |
| ADT_001 | GET | Inpatient details | `encounter.documentNumber.raw:{encounterNumber}` |
| MDM_007 | GET | Search witness doctors | `unit.id:{unitId} AND group.code:DOCTOR AND employee.displayName:*{search}*` (excludes self, max 20) |
| CL_003 | GET | Checklist summary data | Per-checklist summary |

### 11.2 Operation Notes APIs (ATHMA)

| Code | Method | Purpose | Query/Body |
|------|--------|---------|------------|
| OT_001 | GET | Performed surgery list | `?page=0&query={otRequestNo}` |
| OT_002 | GET | OT notes list | `status:(IN_PROGRESS OR ON_HOLD OR DEFERRED OR COMPLETED) AND patient.mrn AND admissionNumber`, sort=wheelInTime,desc |
| OT_003 | GET | Print PDF | `?otRequestNo={no}&serviceCode={code}&printLogoWithHeaderAndFooter=false` → blob |
| OT_005 | GET | Get OT notes by request | `?otRequestNo={number}` |
| OT_006 | POST | Create OT notes | Full OTNotes object |
| OT_006 | PUT | Update OT notes | Full OTNotes object (with id) |
| MDM_002 | GET | Mandatory sections config | `key:ot_notes_mandatory_section AND (applicableType:system OR unit OR global OR local)` |
| MDM_006 | GET | Unit-specific OT config | Per-unit configuration |
| MDM_007 | GET | Search team members | `unit.id:{unitId} AND (group.code:({DOCTOR/NURSE})) AND employee.displayName:*{search}*` |
| MDM_008 | GET | Search surgeries | `serviceMaster.serviceType.code.raw:(Operation OR Procedure OR Surgery) AND *{search}*`, unitId, size=20 |
| MDM_009 | GET | Form template config | `serviceMaster.id:({ids}) AND unit.id:{unitId} AND formTemplates.formPrintTemplate.templateName:"operation-note.ftl"` |
| SM_001 | GET | SNOMED-CT search | `limit=50&conceptActive=true&active=true&semanticTags=...&term={search}` |

### 11.3 PAC APIs

| Code | Method | Purpose | Query/Body |
|------|--------|---------|------------|
| EHR_097 | GET | Get PAC data | `?mrn={mrn}&formType=PRE_ANAESTHESIA_CHECKUP&referenceDate={date}` |
| EHR_098 | GET | Get admission details for PAC | `?encounterNumber={enc}` |
| EHR_099 | GET | Get PAC by ID + version | `/{id}/{versionId}` |
| EHR_099 | PUT | Save PAC | PAC object body → creates new version |
| EHR_100 | GET | Get PAC version list | `/{id}` |
| UAA_003 | GET | Get user authorities | Returns authorities array for PAC edit check |
| MDM_001 | GET | Value sets | `PAC_ANAESTHESIA_PLAN`, `PAC_CHECKUP_STATUS`, `PAC_ASA_FORM` |

### 11.4 Incident Report APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `api/athma/_upload/base64FileDataWithChecksum` | Upload individual image (FormData: data, mrn, fileName, dirName, documentType, md5Checksum) |
| PUT | `api/athma/_upload/incident-reports` | Submit incident report (headers: athmaToken) |

### 11.5 Initial Assessment APIs (ATHMA)

| Code | Method | Purpose |
|------|--------|---------|
| EHR_001 | GET/POST | IA sections / create record |
| EHR_002 | GET | Allergy list |
| EHR_003 | GET | Chief complaints & HPI |
| EHR_004 | GET | Personal/social history |
| EHR_005 | GET | Past medical history |
| EHR_006 | GET | Surgical history |
| EHR_007 | GET | OB/GYN history |
| EHR_008 | GET | Family history |
| EHR_009 | GET | Past medication & reconciliation |
| EHR_010 | GET | Vital signs |
| EHR_011 | GET | General examination |
| EHR_012 | GET | Systemic examination |
| EHR_013 | GET | Provisional diagnosis |
| EHR_014 | GET | Investigations advised |
| EHR_025 | GET | Concept value search (key, queryValue) |
| EHR_031 | POST/PUT | Save/update vitals |
| EHR_035 | GET | Communicable disease data |
| EHR_037 | GET | Communicable diseases list |
| EHR_050 | GET | Lines and tubes (size=500) |
| EHR_051 | GET | Implantable devices (size=20) |
| EHR_105 | GET | Favorites list (consultant-specific) |
| EHR_128 | GET | Download IA PDF (blob) |
| EHR_145 | POST/PUT/DELETE | Allergy widget CRUD |
| EHR_146 | PUT | Submit IA / discharge planning |
| EHR_149 | POST/PUT/DELETE | Past medical history widget |
| EHR_150 | POST/PUT/DELETE | Surgical history widget |
| EHR_151 | POST/PUT/DELETE | Social history widget |
| EHR_152 | POST/PUT/DELETE | Family history widget |
| EHR_153 | POST/PUT/DELETE | Provisional diagnosis widget |
| EHR_157 | POST/PUT/DELETE | General examination widget |
| EHR_158 | POST/PUT/DELETE | Systemic examination widget |
| EHR_159 | POST/PUT/DELETE | Psychological widget |
| EHR_162 | POST/PUT/DELETE | Comorbidities widget |
| EHR_163 | POST/PUT/DELETE | Chief complaints widget |
| EHR_165 | GET | Check if IA is disabled |
| SM_001 | GET | SNOMED-CT search |
| ADT_004 | GET | MLC (Medico-Legal Case) data |

### 11.6 Risk Score APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `api/mortality-prediction-score/{mrn}/{enc}` | Mortality prediction + AI analysis |
| GET | `api/_search/risk-score/{mrn}/{enc}` | Risk score history (for D3.js chart) |
| GET | `api/_search/vi-score/{mrn}/{enc}` | VIS score history (alternate view) |

### 11.7 Activity Area & Task APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `api/task/total-count` | Total task count (body: { query }) |
| POST | `api/_search/aggregation/tasks` | Aggregated task counts by category |
| GET | `api/_search/tasks` | Tasks by document number |
| GET | `api/_search/tasks-by-definition` | Tasks by referenceNumber + taskDefinitionCode |
| POST | `api/tasks` | Create task (observe: response) |
| PUT | `api/tasks/{id}` | Update/delete task (observe: response) |
| GET | `api/task-enabled/{unitCode}` | Feature flag check |
| GET | `api/patient-infos/{patientId}` | Get patient info (for nurse assignee) |
| GET | `api/_search/user?login={login}` | Get user info |
| GET | `api/_search/task-dtos` | Search tasks with query (size=100, sort=id,desc) |

### 11.8 Notification Preferences APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `api/_search/user-notification-preferences/{login}` | Fetch preferences |
| PUT | `api/_update/user-notification-preferences/{login}` | Save preferences (observe: response) |

### 11.9 Discharged Patients APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `api/_search/recent-discharge-patients` | Full discharged patient list |
| GET | `api/count/recent-discharge-patients` | Count only |

---

## 12. Error Handling

### 12.1 Checklist Errors

| Scenario | HTTP | Toast Message | Recovery |
|----------|------|--------------|----------|
| Invalid answers on submit | -- | "Please Provide Valid Answers to all Questions" | Fix answers |
| Missing witness (mandatory) | -- | "Please Select Witnessed By" | Select witness |
| No OT request for patient | -- | "OT request is not available for this patient." | Proceed without OT link |
| Duplicate checklist | 409 | "Checklist already exists" | View existing |
| API error | 4xx/5xx | `error.error.title` (server message) | Retry |
| Empty reject reason | -- | "Reject reason is empty." | Enter reason |

### 12.2 Operation Notes Errors

| Scenario | HTTP | Toast Message | Recovery |
|----------|------|--------------|----------|
| Missing mandatory section | -- | Section-specific validation message | Fill required fields |
| Team member search no results | -- | No results shown in dropdown | Broaden search term |
| Duplicate operation | -- | "Operation already added" | Remove duplicate |
| PDF download failure | 4xx/5xx | Generic error | Retry |
| SNOMED search failure | 4xx/5xx | Empty results | Retry or use hospital DB |

### 12.3 PAC Errors

| Scenario | HTTP | Toast Message | Recovery |
|----------|------|--------------|----------|
| No PAC authority | -- | Form rendered read-only | Contact admin for access |
| Version conflict | -- | "PAC has been updated. Reloading..." | Auto-reload latest |
| Save failure | 4xx/5xx | Server error message | Retry |

### 12.4 Incident Report Errors

| Scenario | HTTP | Toast Message | Recovery |
|----------|------|--------------|----------|
| Empty description | -- | "Description is required" | Enter description |
| Image upload failure | 4xx/5xx | "Failed to upload image" | Retry individual image |
| Exceeded image limit | -- | "Maximum 5 images allowed" | Remove excess images |
| Report submission failure | 4xx/5xx | Server error message | Retry (images already uploaded) |

### 12.5 Initial Assessment Errors

| Scenario | HTTP | Toast Message | Recovery |
|----------|------|--------------|----------|
| Widget save failure | 4xx/5xx | Widget-specific error | Retry |
| "No known" deletion warning | -- | Confirmation dialog before bulk delete | Cancel or confirm |
| IA disabled for encounter | -- | Read-only message displayed | Contact admin |
| Submit IA failure | 4xx/5xx | Server error message | Retry |
| PDF download failure | 4xx/5xx | Generic error | Retry |

### 12.6 Risk Score Errors

| Scenario | HTTP | Toast Message | Recovery |
|----------|------|--------------|----------|
| No risk data available | 200 (empty) | "No risk score data available" | Check data sources |
| D3.js render failure | -- | Chart area blank | Refresh page |
| AI prediction unavailable | 200 (null) | AI section hidden | Server-side issue |

### 12.7 Task Errors

| Scenario | HTTP | Toast Message | Recovery |
|----------|------|--------------|----------|
| Title too long | -- | Client-side maxlength enforcement | Shorten title |
| Invalid date range | -- | "Due date must be after start date" | Fix dates |
| Task feature disabled | -- | UI hidden | Unit does not support tasks |
| Delete failure | 4xx/5xx | Server error message | Retry |

---

## 13. Edge Cases

### 13.1 Checklist Edge Cases

1. **Rejected → re-edit → re-submit loop:** After rejection, creator re-edits and resubmits. The system resets `rejectReason` to null and transitions back to `PENDING_APPROVAL`. There is no limit on rejection cycles.

2. **Witness searches self:** The witness search API explicitly excludes the current user's login from results. This prevents self-witnessing.

3. **Sequential mode with mixed mandatory/optional:** In sequential mode, ALL questions (mandatory and optional) must be answered in order. Skipping an optional question is not allowed -- it must be answered or marked before proceeding.

4. **Template with no questions:** If a checklist template has zero questions, the submit button is enabled immediately (no validation needed). Only witness check applies.

5. **OT request not found but checklist needed:** The checklist can still be created and submitted without an OT association. The `otRequestNumber` remains null.

### 13.2 Operation Notes Edge Cases

1. **Multiple surgeries same day:** Each surgery gets its own OT note linked by `otRequestNo`. The list groups them under the same date header.

2. **Draft note for completed surgery:** A note can remain `draft=true` even after the surgery status changes to `COMPLETED`. The note status is independent of the surgery status.

3. **CKEditor paste blocking:** Rich text fields block clipboard paste events. If pasted content exceeds 30 characters, the content is reverted to the previous state. This prevents bulk copy from external sources.

### 13.3 PAC Edge Cases

1. **Editing non-current version:** Selecting a historical version from the dropdown disables all form fields. The [Save] button is hidden. Only the latest version can be edited.

2. **PAC without authority:** If `USER_PAC_AUTHORITIES` is not in the user's authority list, the entire form is read-only. No save or edit actions are available.

3. **Concurrent PAC edits:** If two users edit the same PAC simultaneously, the second save creates version N+2 (not N+1), as each save always creates a new version. No conflict resolution -- last write wins.

### 13.4 Incident Report Edge Cases

1. **md5Checksum is always "dummy":** The upload endpoint accepts a checksum field, but the app always sends the literal string `"dummy"`. No actual integrity verification is performed client-side.

2. **Image removal after upload:** If an image has already been uploaded to the server (has a filePath), removing it from the UI only removes it from the report submission -- the uploaded file remains on the server.

3. **Camera vs. Gallery limits:** Camera captures one image at a time. Gallery allows multi-select up to 8, but the total is capped at 5 across both sources.

### 13.5 Initial Assessment Edge Cases

1. **"No known" to entries transition:** When unchecking "No known allergies" and then adding specific allergies, the deletion of the "No known" entry and addition of specific entries are separate API calls. If the delete succeeds but the add fails, the patient temporarily has no allergy data.

2. **Widget visibility changes mid-session:** `widgetInfo` flags are loaded once on page init. If the server-side configuration changes while the user is filling the form, the change is not reflected until the next page load.

3. **Vital Signs BMI/BSA with missing inputs:** If height or weight is not provided, BMI and BSA fields remain empty (not calculated). No error is shown -- the fields simply stay blank.

4. **Multiple concurrent widget edits:** Each widget saves independently via its own API endpoint. Two users can edit different widgets simultaneously without conflict. Same-widget concurrent edits follow last-write-wins.

### 13.6 Risk Score Edge Cases

1. **Score exactly 33:** The threshold for color coding is strictly `> 33` for red. A score of exactly 33 renders in blue/green (not red).

2. **Empty dataJson:** If the server returns `dataJson` as an empty array, the contributing factors section is hidden but the gauge and main score still render.

3. **AI prediction null:** If `aiPrediction` is null or undefined, the AI prediction section (summary, observations, LOS) is completely hidden. Only the gauge renders.

### 13.7 Task Edge Cases

1. **startsOn in the past (edit mode):** When editing an existing task, `startsOn` validation changes from "must be >= now" to "must be >= original creation time." This allows editing tasks that were created in the past without invalidating the start time.

2. **Task for deleted patient:** If a patient is removed from the user's list (discharged, transferred), existing tasks for that patient remain visible in TasksHistoryPage but cannot be edited.

3. **dueOn minimum gap:** The minimum gap between `startsOn` and `dueOn` is 1 hour. Setting them to the same time fails validation silently (the Create button remains disabled).

---

## 14. Implementation Checklist

### 14.1 Checklist System
- [ ] ChecklistService with 7 ATHMA endpoint methods
- [ ] ListChecklistPage with 2-tab segment (Checklist / Pending Approval)
- [ ] Date grouping (Today / Yesterday / DD-MM-YYYY)
- [ ] AddChecklistPage with template selection dropdown (MDM_017)
- [ ] Yes/No response type with radio buttons
- [ ] Tick response type with checkboxes and blue highlight
- [ ] Sequential answering logic with cascading disable
- [ ] Non-sequential mode with submit-time validation
- [ ] defaultResponse mismatch warning toast
- [ ] Witness search (MDM_007, excludes self, DOCTOR role filter)
- [ ] Witness mandatory/optional/null configuration
- [ ] Witness approve action → COMPLETED
- [ ] ChecklistRejectReasonPage modal (max 255 chars, non-empty)
- [ ] Surgery tracker integration (CL_001)
- [ ] EditChecklistPage modal with status-based mode switching
- [ ] Status badge color coding per checklist item

### 14.2 Operation Notes
- [ ] OperationNoteService with 11 ATHMA endpoints
- [ ] OperationNotePage with date-grouped surgery list
- [ ] Cross-reference performed surgeries with existing notes
- [ ] OperationNoteCreatePage with full form layout
- [ ] Surgical team search (MDM_007, DOCTOR + NURSE groups)
- [ ] SNOMED-CT diagnosis search (SM_001, semantic tags filter)
- [ ] AddOperationPage modal with dual search (MDM_008 + SM_001)
- [ ] Duplicate operation prevention
- [ ] 15 configurable mandatory sections (MDM_002)
- [ ] CKEditor 5 for 5 rich text sections (findings, complications, etc.)
- [ ] Operation type selector (Normal / Emergency)
- [ ] Save as draft (draft=true) and finalize (draft=false)
- [ ] PDF preview/download (OT_003 blob)
- [ ] OperationNoteDetailsPage read-only view

### 14.3 Pre-Anesthesia Checkup
- [ ] PacService with 7 endpoint methods
- [ ] PreAnesthesiaCheckupPage with full form
- [ ] Version control: dropdown selector with "(Current)" label
- [ ] Version history loading (EHR_100)
- [ ] Read-only rendering for non-current versions
- [ ] 6 systemic examination subsections
- [ ] Airway assessment form (mouth opening, teeth, neck, intubation, MET, DVT, ASA)
- [ ] AsaPage reference modal (I-VI classification table)
- [ ] Value set loading (MDM_001): PAC_ANAESTHESIA_PLAN, PAC_CHECKUP_STATUS, PAC_ASA_FORM
- [ ] Post-op ICU required (Yes/No + conditional remarks)
- [ ] Blood products required (Yes/No + conditional remarks)
- [ ] NPO hours field
- [ ] Authority check (USER_PAC_AUTHORITIES via UAA_003)
- [ ] Save creates new version (EHR_099 PUT)
- [ ] Status selector: Cleared / Re-evaluation Required / Not Cleared
- [ ] Source field set to "AADI"

### 14.4 Incident Reports
- [ ] IncidentReportService with 2 endpoints
- [ ] IncidentReportPage with description + image form
- [ ] Description textarea: max 2000 chars, required, character counter
- [ ] Image capture via Capacitor Camera (quality 50)
- [ ] Image selection via Gallery (multi-select up to 8, total cap 5)
- [ ] Image preview thumbnails with [x] remove
- [ ] Full-screen image preview on thumbnail tap
- [ ] Base64 encoding pipeline (FileReader → base64)
- [ ] Individual image upload (POST base64FileDataWithChecksum)
- [ ] md5Checksum hardcoded as "dummy"
- [ ] Incident report submission (PUT incident-reports with athmaToken header)
- [ ] Auto-populated metadata: reporterType, status, type, party

### 14.5 Initial Assessment
- [ ] InitialAssessmentPage with widget list architecture
- [ ] widgetInfo flags for section visibility control
- [ ] IAWidgets enum (27 values)
- [ ] Widget card rendering with summary + [+] add button
- [ ] AddModifyWidgetComponent with reactive FormGroup per widget type
- [ ] SearchComponent with Favorites + Search tabs
- [ ] Favorites loading (EHR_105 / EHR_024)
- [ ] Concept value search (EHR_025)
- [ ] SNOMED-CT search (SM_001) for diagnosis widgets
- [ ] "No known..." checkbox pattern with bulk delete + single add
- [ ] Warning dialog before "No known" deletion
- [ ] Vital Signs widget with 22+ fields
- [ ] BMI auto-calculation: weight / (height/100)^2
- [ ] BSA auto-calculation (Du Bois formula)
- [ ] BP split modes (Sitting, Standing, Lying, Arterial)
- [ ] Temperature C/F conversion
- [ ] Per-widget CRUD (POST/PUT/DELETE for each widget endpoint)
- [ ] Submit IA (EHR_146 PUT)
- [ ] Download IA PDF (EHR_128 GET blob)
- [ ] IA disabled check (EHR_165 GET)

### 14.6 Risk Score
- [ ] RiskScorecardService with 3 endpoints
- [ ] RiskScorePage with D3.js line chart
- [ ] Chart color coding: RED if >33, BLUE/GREEN if <=33
- [ ] Interactive data points with tap-to-drill-down
- [ ] Rolling 2-day window for chart X-axis
- [ ] RiskScorecardPage with SVG circular gauge
- [ ] Gauge zones: Low (0-30), Average (30-70), High (70-100)
- [ ] AI prediction display: class_1 percentage, summary, observations, LOS days
- [ ] `init` string split into observation bullets (newline-separated)
- [ ] RiskScoreParamsPage with per-parameter mini-charts
- [ ] VIS score alternate view
- [ ] Local SQLite risk_score update after server fetch

### 14.7 Activity Area & Tasks
- [ ] ActivityAreaPage modal with 6 task category cards
- [ ] SQLite encounter number query for task scope
- [ ] Server task count aggregation (POST api/task/total-count)
- [ ] Task breakdown by category (POST api/_search/aggregation/tasks)
- [ ] Task routing per category to appropriate page
- [ ] TasksCreatePage with title (max 25), description, priority, date fields
- [ ] Priority selector: LOW / MEDIUM / HIGH / URGENT (default: MEDIUM)
- [ ] startsOn validation: >= now (create) or >= creation time (edit)
- [ ] dueOn validation: >= startsOn (min 1 hour gap)
- [ ] Auto-assignee from patient's accepting nurse
- [ ] Feature flag check (GET api/task-enabled/{unitCode})
- [ ] TasksHistoryPage with sorted list (id desc)
- [ ] Description truncation at 70 chars with "Read more..." toggle
- [ ] Edit/Delete only if taskStatus=OPEN AND user is creator
- [ ] Delete: confirmation modal, sets active=false via PUT

### 14.8 Notification Preferences
- [ ] NotificationPreferencesPage with toggle list
- [ ] Mandatory items: lock icon, toggle disabled
- [ ] Optional items: toggle enabled
- [ ] Change detection via JSON.stringify comparison
- [ ] Save button enabled only when changes detected
- [ ] GET/PUT notification preferences API

### 14.9 Discharged Patients
- [ ] DischargedPatientsPage with patient list
- [ ] Client-side search by name or MRN
- [ ] Tap to navigate to DischargeSummaryPage (read-only)
- [ ] Count endpoint for Landing Page dashboard card
