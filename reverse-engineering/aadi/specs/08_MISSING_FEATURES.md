# AADI App - Missing Features & Addendum

**Discovered by:** 10 verification agents cross-referencing source code against existing specs

---

## 1. Operation Notes (OT) System

### Overview
Complete surgical documentation platform with SNOMED-CT integration, multi-party team selection, and configurable mandatory sections.

### OT Notes Data Model
```typescript
OTNotes {
    id: string | null;
    otRequestNo: string;
    draft: boolean;
    source: "AADI";
    inPatient: {
        admissionDetails: { admissionDate, admissionNumber };
        patientDetails: PatientInfo;
        ward: { id, name };
        bed: { id, name };
    };
    scheduledDateTime: DateTime;
    unit: { id };
    formTemplateReport: {
        result: {
            patientDetail: PatientInfo;
            concept: {
                report: {
                    surgeons: Employee[];
                    assistantSurgeons: Employee[];
                    anaesthetists: Employee[];
                    scrubNurse: Employee[];
                    floorNurse: Employee[];
                    preOperativeDiagnosis: DiagnosisTerm[];
                    diagnosis: DiagnosisTerm[];        // Post-operative
                    operations: Operation[];
                    operationType: "NORMAL" | "EMERGENCY";
                    findings: string;
                    perioperativeComplications: string;
                    detailsOfProcedure: string;
                    surgicalSpecimenSentForExamination: string;
                    operationNotes: string;
                    postOpNotes: string;
                };
            };
        };
    };
}

Operation {
    surgery: { id, name, code, newAdded: boolean, print: boolean };
    snomed: {
        name: string;
        identifier: {
            code: string;
            standardCodes: [{ system: "SNOMED-CT", code: string }];
        };
        print: boolean;
    };
}
```

### OT API Endpoints (ATHMA)

| Code | Method | Purpose |
|------|--------|---------|
| OT_001 | GET | Get performed surgery list by otRequestNo |
| OT_002 | GET | Get OT notes list (status: IN_PROGRESS/ON_HOLD/DEFERRED/COMPLETED) |
| OT_003 | GET | Print OT notes (returns PDF blob) |
| OT_005 | GET | Get OT notes from request number |
| OT_006 | POST/PUT | Save/update OT notes |
| MDM_002 | GET | Get mandatory sections config (key: ot_notes_mandatory_section) |
| MDM_007 | GET | Search healthcare team (doctors/nurses by unit) |
| MDM_008 | GET | Search surgery names by unit |
| MDM_009 | GET | Get form template configuration |
| SM_001 | GET | SNOMED-CT search (diagnosis: disorder/finding, procedure: procedure) |

### Mandatory Sections (15 configurable per unit)
SURGEON, ASSISTANT SURGEON, ANAESTHETISTS, SCRUB NURSE, FLOOR NURSE, PRE OPERATIVE DIAGNOSIS, POST OPERATIVE DIAGNOSIS, TYPE OF OPERATION, OPERATION TYPE, OPERATION, FINDINGS, PERIOPERATIVE COMPLICATIONS, DETAILS OF PROCEDURE, SURGICAL SPECIMEN SENT FOR EXAMINATION, Post Operative Advice

### OT Request Status Values
IN_PROGRESS, ON_HOLD, DEFERRED, COMPLETED

---

## 2. Pre-Anesthesia Checkup (PAC) System

### PAC Data Model
```typescript
PAC {
    id: string;
    version: number;
    concept: {
        preAnaesthesia: {
            status: "Cleared" | "Re-evaluation Required" | "Not Cleared";
            generalExamination: { records[], noAbnormalityDetected, notes };
            systemicExamination: {
                respiratorySystems: { records[], noAbnormalityDetected, notes };
                cnsMusculoskeletal: { ... };
                endocrine: { ... };
                cardioVascularSystems: { ... };
                hepaticRenal: { ... };
                others: { ... };
            };
            airwayAssessment: {
                mouthOpening: { records[] };
                teeth: { normal, remarks };
                neckMovementsSpineEvaluation: { normal, remarks };
                intubationDifficulty: { check, remarks };
                met: { score };
                deepVeinThrombosisRiskAssessment: { score, text };
                asa: { score: "I"|"II"|"III"|"IV"|"V"|"VI", text };
            };
            ecgImpression: string;
            echoImpression: string;
            xrayImpression: string;
            previousAnaesthesia: string;
            anaesthesiaPlan: {
                planType: ValueSetItem[];
                postOpICURequired: { check, remarks };
                bloodProductRequired: { check, remarks };
                npo: string;           // NPO hours
            };
            advice: string;
            remarks: string;
            source: "AADI";
        };
    };
}
```

### PAC API Endpoints

| Code | Method | Purpose |
|------|--------|---------|
| EHR_097 | GET | Get PAC data |
| EHR_098 | GET | Get admission details for PAC |
| EHR_099 | GET/PUT | Get/save PAC with version |
| EHR_100 | GET | Get PAC versions list |
| UAA_003 | GET | Get user authorities (PAC edit permissions) |
| MDM_001 | GET | Value sets: PAC_ANAESTHESIA_PLAN, PAC_CHECKUP_STATUS, PAC_ASA_FORM |

### ASA Classification (asa.page.ts)
I: Normal healthy patient, II: Mild systemic disease, III: Severe systemic disease, IV: Constant threat to life, V: Moribund patient, VI: Brain-dead for transplant

---

## 3. Checklist System (Full)

### Checklist Status Lifecycle
```
PENDING → DRAFT (save) or PENDING_APPROVAL (submit with reviewRequired)
PENDING_APPROVAL → COMPLETED (witness approves) or REJECTED (witness rejects)
REJECTED → DRAFT (re-edit) → PENDING_APPROVAL (re-submit)
```

### Response Types
- **yes/no**: Radio buttons, validates against defaultResponse, sequential enforcement
- **tick**: Checkboxes, independent or sequential selection

### Witness Configuration
- `MANDATORY`: Must assign witness before submit; witness gains approve/reject rights
- `OPTIONAL`: Witness assignment optional
- `null`: No witness needed

### Checklist API Endpoints

| Code | Method | Purpose |
|------|--------|---------|
| MDM_017 | GET | Get all checklist templates |
| EHR_036 | POST/PUT/GET | Create/update/get checklist instance |
| EHR_066 | GET | Get patient checklists (with status filter) |
| CL_001 | GET | Get surgery tracker records for OT association |
| MDM_007 | GET | Search witness doctors by unit |

### Validation
- Sequential: All questions must be answered in order with correct defaultResponse
- Non-sequential: All mandatory questions must have valid answers
- Witness: Must be assigned if `witness === 'MANDATORY'`
- Reject reason: Max 255 characters, non-empty required

---

## 4. Handover Request System

### Handover Status: REQUESTED → ACCEPTED | REJECTED

### Data Model
```typescript
HandoverRequest {
    name: "Consultant Handover";
    patient: { mrn, displayName };
    encounter: { documentNumber };
    taskDefinition: { id: 2, code: "IP-CONSULTANT-HANDOVER", name: "Inpatient Consultant handover" };
    priority: "HIGH";
    taskStatus: "REQUESTED" | "ACCEPTED" | "REJECTED";
    assignee: { id, login, displayName, employeeNo };
    createdBy: { id, login, displayName, employeeNo };
}
```

### API: `POST api/consultant/handover-tasks` (array of handover objects)

---

## 5. Incident Report System

### Fields
- **Description**: Required, max 2000 chars
- **Attachments**: Optional, max 5 files (IMAGE/PDF), quality 50

### Data Model
```typescript
IncidentReport {
    createdBy: string;
    createdOn: ISO8601;
    description: string;
    mrno: string;
    encounterNo: string;
    reportedOn: ISO8601;
    reporterLogin: string;
    reporterName: string;
    reporterType: "STAFF";
    status: "NEW";
    type: "PATIENT";
    party: "PATIENT";
    documents: string[];
    documentsDetails: Array<{
        id: null;
        "aadi-filePath": string;
        documentName: string;
        uploadedBy: string;
        active: true;
        documentType: "IMAGE";
        source: { documentType: "AADI", referenceNumber: null };
    }>;
}
```

### APIs
- Upload: `POST api/athma/_upload/base64FileDataWithChecksum` (FormData: data, mrn, fileName, dirName, documentType, md5Checksum)
- Submit: `PUT api/athma/_upload/incident-reports` (headers: athmaToken)

---

## 6. Discharge Intimation (Standalone)

### Status: UNDER_IP_CARE → DISCHARGE_INTIMATED ↔ (revert) UNDER_IP_CARE → DISCHARGED

### Intimate: Requires consultant selection + expected discharge date/time (must be future)
### Revert: Requires consultant selection + remarks (non-empty reason)

### APIs (ATHMA)
- DS_012 PUT: Intimate discharge
- ADT_002 PUT: Revert discharge intimation
- Get details: GET with encounter.documentNumber query

---

## 7. Past Records System (5 pages)

### Pages
- **past-records**: Main page with Overview (consultations) and Tests (LAB/RAD/OTHER/ATTACHMENT) segments
- **past-records-summary**: OP or IP consultation detail view
- **past-records-investigation**: Investigation reports with gallery view
- **past-records-medication**: Medication history (Brand/Generic badges, status, instructions)
- **past-records-lab-result-details-view**: Drill-down lab result parameters
- **past-records-attachments**: Document/image viewer

### APIs

| Code | Method | Purpose |
|------|--------|---------|
| EHR_017 | POST | Consultation list (size=5, paginated, sort by consultationDate desc) |
| EHR_018 | GET | OP (outpatient) summary |
| DS_001 | GET | IP (inpatient) summary |
| EHR_015 | POST | Encounter attachments |
| EHR_092 | POST | Past record attachment files |
| EHR_096 | GET | Download attachment (via athma-file-with-token) |
| DMS_001 | POST | Document management system attachments |

---

## 8. Follow-Up System

### Follow-Up Modes
- **DURATION**: Select days/weeks/months/years → auto-calculate date
- **DATE**: Select date → fetch available slots → select slot → book appointment

### Follow-Up Request Model
```typescript
FollowUpRequestModel {
    mode: "DURATION" | "DATE";
    date?: string;
    duration?: string;
    consultant: { id, name, code, resourceType: "USER", displayName };
    department: { id, name, code };
    unit: { id, name, code };
    appointment: { id, number, appointmentType: "APPOINTMENT"|"VIDEO_CONSULT"|"TELE_CONSULT" };
    investigation: Array<{ name, code, type }>;
    notes?: string;
}
```

### Slot Management
- Fetch: AMB_001 GET (resourceIds, date, unitId, resourceType=USER)
- Work pattern: AMB_002 GET (resourceId, unitId, resourceType=USER)
- Book: AMB_003 POST (create appointment)
- Follow-up record: EHR_028 POST/PUT

### Investigation Selection (3 modes)
- Favorites: EHR_024 (consultant-specific)
- Order Sets: MDM_003 (pre-defined bundles)
- Master Search: MDM_004 (global investigation search)

---

## 9. Current Medication Dashboard

### 5 Medication Categories (auto-segmented by mode.code)
Regular, SOS, Infusion, Narcotic, STAT + Stopped (archived)

### 24-Hour Timeline View
- 5 time periods: Night (00-06, blue), Morning (06-11, yellow), Afternoon (11-15, orange), Evening (15-20, purple), Night (20-24, blue)
- 3 view modes: default (full), minimised (compact), list (vertical)

### Slot Statuses: PENDING, ADMINISTERED, OVERDUE, HOLD, REFUSED, REVIEWED, PENDING_REVIEW

### Additional medication pages documented:
- **medicine-reconciliation**: Import + reconcile patient medication history
- **medicine-slots-selection**: 24-hour timeline for IV infusion slot configuration
- **medicine-card-popups**: Modal for Stop/Hold/Cancel/View details with reason capture (max 2000 chars)
- **current-medication-order-list**: Add new orders with swipe-to-publish gesture

---

## 10. Patient ECG Viewer

- Embedded iframe viewer for cardiac monitoring waveforms
- Input: mainURL, grpcURL, apiURL, patchId, token
- Locks screen to landscape orientation
- PostMessage API for iframe communication

---

## 11. CT Scorecard (Clinical Tracking)

### Score: 0-25 integer scale
### APIs
- GET `api/_search/ct-scores?patientInfoId={id}&sort=recordDate,desc&sort=id,desc`
- POST `api/ct-scores` (create)
- PUT `api/ct-scores` (soft delete via active=false)

### Validation: Integer 0-25 only, no duplicates per date

---

## 12. Task Management (Nursing Capture Notes)

### Task Model
```typescript
Task {
    name: string;                    // max 25 chars
    description: string;
    patient: { id, mrn };
    encounter: { documentNumber };
    taskDefinition: { id: 1, code: "NURSING-CAPTURE-NOTES", name: "Capture Note" };
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    workflowStatus: "OPEN";
    taskStatus: "OPEN" | "CLOSED";
    assignee: { id, login, displayName, employeeNo };
    startsOn: ISO8601;
    dueOn: ISO8601;
    createdBy: { id, login, displayName, employeeNo };
    active: boolean;
}
```

### APIs
- GET `api/_search/task-dtos?query=...&size=100&sort=id,desc`
- POST `api/tasks` (create)
- PUT `api/tasks/{id}` (update/delete)
- GET `api/task-enabled/{unitCode}` (feature flag check)

---

## 13. Notification Preferences

### APIs
- GET `api/_search/user-notification-preferences/{login}`
- PUT `api/_update/user-notification-preferences/{login}`
### Categories: Mandatory (locked, always enabled) vs Optional (toggleable)

---

## 14. What's New Changelog
### API: GET `api/fetch/app-feature-info`
### Includes Play Store link for version upgrades

---

## 15. Login Flow Details

### 3 Auth Methods
1. **Username/Password** with country selection (India +91 / Cayman Islands +1)
2. **OTP via Phone** (10-digit, 30s countdown, 6-digit code via angular-code-input)
3. **OTP via Email** (regex validated)

### Multi-Account Support
If user has multiple domain accounts, dropdown selector appears. Domain/client/email stored per selection.

### Test Credentials (from source)
- Mobile: 4000999889 → skip to credentials
- Username: 999889
- Domain: https://com.narayanahealth.org/aadi/

---

## 16. Home Dashboard (Landing Page)

### 4 Module Cards
1. **Inpatients (IPL)** → /home with patient count
2. **Appointments (APL)** → /home-vc with today's count
3. **Activity Area** → Modal with 6 task categories
4. **Discharged Patients** → /discharged-patients with count

---

## 17. Patient Chat (Core Messaging)

### Message Types Supported
TEXT, IMAGE (multi-image), AUDIO (MP3/WAV), VIDEO (MP4 + thumbnail), PDF, DOC

### System Message Types
ADMISSION_MESSAGE, DISCHARGE_INTIMATION, SYSTEM_REMINDER, CROSS_CONSULTATION, LAB_RESULT, RAD_RESULT, INVESTIGATION_REPORT, PROGRESS_NOTES, DISCHARGE_SUMMARY, MEDICATION_ORDER, INITIAL_ASSESSMENT, BED_TRANSFER

### ACS Integration
- Azure Communication Services endpoint: `nhazurecommunicationservices.communication.azure.com`
- Token refresh threshold: 1 hour before expiry
- Offline message queue with automatic retry on reconnect

### Message Actions: Star/Unstar, Reply (with context card), Delete (soft), Download attachments

---

## 18. Vital Trends (D3.js Charts)

### 11 Vital Parameters
Blood Pressure (Systolic/Diastolic), Heart Rate, Temperature (C→F conversion), SpO2, Respiratory Rate, Arterial Pressure, BP Lying/Standing/Sitting, CRT, CHEWS Score

### Chart Config
- D3.js line charts with interactive data points
- Color-coded per vital type (11 distinct colors)
- Combined overlay view with legend control
- Individual chart view (11 separate scrollable)
- Table view (horizontal scrolling)
- Auto-scroll to rightmost data on load

---

## 19. Image Editing Modal

### Capabilities
- Camera capture + gallery multi-select (max 8 images)
- Crop: angular-cropperjs with free-form aspect ratio
- Rotate: Left/right with degree tracking
- Quality: 50, resolution: 800x1250px

---

## 20. Sort-By Configuration

### 4 Sort Columns
1. Alphabetical (name) - A-Z icon
2. Date of Admission - 1-9 icon
3. Bed Number (location) - 1-9 icon
4. Risk Score - % icon

### 3 States per column: Empty → Ascending → Descending → Empty

---

## 21. Additional Viewers

- **HTML Viewer**: Drug monographs (EHR_115) and drug interactions (EHR_119), CIMS branding
- **PDF Viewer**: Investigation reports with pinch-zoom, pagination
- **Log Messages**: SQLite ErrorMessage table viewer (debug/admin utility)
- **Send for Review**: Doctor search + swipe-to-confirm gesture for DS review assignment

---

## 22. Missing Data Models (from verification agent)

### CareTeam (CRITICAL - referenced but file missing from source map)
```typescript
// Inferred from database queries and service usage
CareTeam {
    id?: number;
    patientInfoId?: number;
    patientName?: string;
    mrn?: string;
    userLogin?: string;
    userName?: string;
    active?: boolean;
    primaryConsultant?: CareTeamUserDTO;  // JSON
    careTeam?: CareTeamUserDTO[];         // JSON array
    createdDate?: string;
    modifiedDate?: string;
}
```

### NotesTemplate (Macro service model)
```typescript
NotesTemplate {
    chiefComplaints?: string;
    id?: number;
    notes?: string;
    title?: string;
    user?: UserDTO;
    widgetName?: string;
    widgetType?: string;
}
```

### ConnectionStatus Enum
```typescript
enum ConnectionStatus { Online = 1, Offline = 0 }
```

### AppStorageKeys (45+ keys) - Full enum documented in verification output

### UserDTO Duplication Issue
- Message.ts: `{ login, name }` (lightweight)
- InvestigationService.ts: `{ id, login, displayName, employeeNo, email, mobileNo, organizationUnit, active }` (full)

---

## 23. Missing API Endpoints (from verification agent)

### Completely Missing from 02_API_LAYER.md

**CT Scorecard:** GET/POST/PUT `api/_search/ct-scores`, `api/ct-scores`

**Handover:** POST `api/consultant/handover-tasks`

**Notifications:** GET/PUT `api/_search/user-notification-preferences/{login}`, `api/_update/user-notification-preferences/{login}`

**What's New:** GET `api/fetch/app-feature-info`

**Task DTOs:** GET `api/_search/task-dtos`, POST/PUT `api/tasks`, GET `api/task-enabled/{unitCode}`

**Incident Upload:** POST `api/athma/_upload/base64FileDataWithChecksum`, PUT `api/athma/_upload/incident-reports`

**OT Notes:** OT_001 through OT_006

**PAC:** EHR_097 through EHR_100, UAA_003

**Messages:** GET `api/messages/patient-messages/{login}/{mrn}`, `api/messages/{messageId}`, `api/messages/reload-patient-messages/...`, `api/_search/star-messages`, POST `api/offline-patient-messages`

**FCM:** POST `api/subscribe-notification/{token}`, `api/unsubscribe-notification/...`, `api/manage-notification-subscription/{token}`, `api/user-fcm-tokens`

**Care Team Real-Time:** POST `api/update/care-teams/add-user/http-publish`, PUT `api/update/care-teams/user-last-seen-time/{mrn}/{loginId}`

**WebSocket:** `websocket/connect`, `/consultation-topic/{appointmentNumber}` (subscribe), `/consultation-topic/send-message` (publish)

**Other:** POST `api/fetch/patient-info-by-acs-group-id`, GET `api/dm-user-list/{login}`, GET `api/downloadFile`, POST `api/create/app-message`

### Estimate: Existing spec covers ~50% of actual endpoints. Total ATHMA codes: 150+ (vs ~50 documented).
