--

## 1. PatientInfo

**File:** `model/PatientInfo.ts`

```typescript
export class PatientInfo {
    constructor(
        public id ?: number,                          // Primary key
        public mrn ?: string,                         // Medical Record Number
        public name ?: string,                        // Patient full name
        public birthDate ?: string,                   // DOB (YYYY-MM-DD)
        public gender ?: string,                      // M / F
        public unitCode ?: string,                    // Ward/unit code
        public unit ?: string,                        // Unit display name
        public location ?: string,                    // Bed location
        public lastReceivedMsgTime ?: string,         // Last message timestamp
        public attribute ?: any,                      // Generic attributes (labels, etc.)
        public encounterNumber ?: string,             // Clinical encounter ID
        public admissionNumber ?: string,             // Hospital admission number
        public admissionDate ?: string,               // Admission timestamp (without Z)
        public admissionReason ?: string,             // Chief complaint
        public admissionCategory ?: string,           // Admission classification
        public unreadMsgCount ?: number,              // Unread message count
        public primaryConsultant ?: string,           // Primary physician name
        public ipActivityAction ?: IPActvityAction,   // MARK_DEAD / MARK_FOR_DISCHARGE / ABSCONDED
        public hscId ?: number,                       // Healthcare Service Center ID
        public procedureDate ?: string,               // Procedure date
        public pinFlag ?: number,                     // Pin/priority flag (0 or 1)
        public pinOrder ?: number,                    // Pin sort order
        public riskScore ?: String,                   // Clinical risk score
        public wardCapability ?: String,              // ICU or non-ICU
        public wardSort ?: number,                    // Sort priority (0=ICU, 1=General)
        public comorbidities ?: String,               // Comma-separated conditions
        public pmsViewer ?: number,                   // PMS viewer access flag
        public acsGroupId ?: String,                  // Azure Communication Services group
        public weight ?: string,                      // Patient weight (kg)
        public consultantShortName ?: string,         // Consultant abbreviated name
        public consultantLogin ?: string,             // Consultant login ID
        public mlc ?: boolean,                        // Medico-Legal Case flag
        public visitType ?: string,                   // NEW / FOLLOW-UP / EMERGENCY
        public sync ?: number,                        // Sync status flag
        public attendingConsultantLogin ?: string,    // Current attending login
        public attendingConsultantName ?: string,     // Current attending name
        public acceptingConsultantLogin ?: string,    // Handover accepting login
        public acceptingConsultantName ?: string,     // Handover accepting name
        public consultantHandoverStatus ?: string,    // REQUESTED / ACCEPTED / REJECTED
        public lastSeenDate ?: string,                // Last review date
        public dischargeIntimation ?: string,         // Discharge notification status
        public lastSyncTime ?: string                 // Last data sync timestamp
    ) {}
}

export enum IPActvityAction {
    MARK_DEAD = 'MARK_DEAD',
    MARK_FOR_DISCHARGE = 'MARK_FOR_DISCHARGE',
    ABSCONDED = 'ABSCONDED'
}
```

---

## 2. Message

**File:** `model/Message.ts`

```typescript
export class Message {
    constructor(
        public id?: number,                    // Unique message ID
        public context?: MessageContextDTO,    // Message context/category
        public payload?: any,                  // Serialized content (JSON string)
        public action?: MessageAction,         // SAVE / DELETE / PUBLISH
        public status?: MessageStatus,         // NOT_SENT / SUCCESS / FAILURE / IN_PROGRESS
        public remarks?: string,               // Error message
        public actionId?: any,                 // Associated action identifier
        public sender?: UserDTO,               // Sending user
        public receiver?: UserDTO,             // Receiving user
        public sentTime ?: string,             // ISO timestamp
        public receivedTime ?: string,         // ISO timestamp
        public createdDate?: any,              // Creation timestamp
        public parentId?: any,                 // Parent message ID (threading)
        public parentMessageDTO?: any,         // Parent message object
        public source?: any                    // Source system
    ) {}
}

export class UserDTO {
    constructor(
        public login ?: string,                // User login/username
        public name ?: string                  // Display name
    ) {}
}

export class MessageContextDTO {
    constructor(
        public value ?: MessageContext,        // Context type enum
        public identifier ?: string            // Context-specific identifier
    ) {}
}
```

### Message Enums

```typescript
export enum MessageContext {
    PATIENT_INFO = 'PATIENT_INFO',
    PATIENT_MESSAGE = 'PATIENT_MESSAGE',
    CARE_TEAM = 'CARE_TEAM',
    DM_USER_INFO = 'DM_USER_INFO',
    DIRECT_MESSAGE = 'DIRECT_MESSAGE',
    LOGOUT_MESSAGE = 'LOGOUT_MESSAGE'
}

export enum MessageAction {
    SAVE = 'SAVE',
    DELETE = 'DELETE',
    PUBLISH = 'PUBLISH',
    PATIENT_INFO_ATTRIBUTE = 'PATIENT_INFO_ATTRIBUTE',
    LOGOUT = 'LOGOUT'
}

export enum MessageStatus {
    NOT_SENT = 'NOT_SENT',
    SUCCESS = 'SUCCESS',
    FAILURE = 'FAILURE',
    IN_PROGRESS = 'IN_PROGRESS'
}

export enum MessageCategory {
    LAB_RESULT = 'LAB_RESULT',
    RAD_RESULT = 'RAD_RESULT',
    DISCHARGE_SUMMARY = 'DISCHARGE_SUMMARY',
    CHAT = 'CHAT',
    INVESTIGATION_ORDER = 'INVESTIGATION_ORDER',
    MEDICATION_ORDER = 'MEDICATION_ORDER',
    ADMISSION_MESSAGE = 'ADMISSION_MESSAGE',
    PROGRESS_NOTES = 'PROGRESS_NOTES',
    CROSS_CONSULTATION = 'CROSS_CONSULTATION',
    SYSTEM_REMINDER = 'SYSTEM_REMINDER',
    INVESTIGATION_REPORT = 'INVESTIGATION_REPORT',
    BED_TRANSFER = 'BED_TRANSFER',
    KEY_VALUE_DATA = 'VITALS',
    ASSESSMENT_FORM = 'ASSESSMENT_FORM',
    DISCHARGE_INTIMATION = 'DISCHARGE_INTIMATION',
    INITIAL_ASSESSMENT = 'INITIAL_ASSESSMENT'
}

export enum MessageSubCategory {
    AUDIO = 'AUDIO',
    TEXT = 'TEXT',
    VIDEO = 'VIDEO',
    IMAGE = 'IMAGE',
    PDF = 'PDF',
    DOC = 'DOC',
    OTHERS = 'OTHERS'
}

export enum ContentType {
    TEXT = 'TEXT',
    JSON = 'JSON'
}

export enum PatientInfoAttributeType {
    HIGHLIGHT_MSG = 'HIGHLIGHT_MSG'
}
```

---

## 3. PatientMessage

**File:** `model/PatientMessage.ts`

```typescript
export class PatientMessage {
    constructor(
        public id ?: number,                      // Message ID
        public patientInfoId ?: number,            // FK to PatientInfo.id
        public mrn ?: string,                      // MRN (denormalized)
        public patientName ?: string,              // Patient name (denormalized)
        public category ?: MessageCategory,        // LAB_RESULT / MEDICATION_ORDER / CHAT / etc.
        public subCategory ?: MessageSubCategory,  // TEXT / IMAGE / AUDIO / VIDEO / PDF
        public contentType ?: ContentType,         // TEXT or JSON
        public content ?: any,                     // Serialized payload
        public senderLogin ?: string,              // Sender login ID
        public senderName ?: string,               // Sender display name
        public sentTime ?: string,                 // ISO timestamp
        public receivedTime ?: string,             // ISO timestamp
        public actionId?: any,                     // Dedup key (PK in SQLite)
        public messageStatus ?: MessageStatus,     // NOT_SENT / SUCCESS / FAILURE
        public msgDeleted ?: boolean,              // Soft delete flag
        public acsMessageId?: number,              // Azure Communication Services message ID
        public parentMessageId?: number,           // Reply-to message ID
        public messageId?: number,                 // Server message ID
        public parentMessageDTO?: any,             // Parent message object
        public msgStarred ?: any,                  // Starred/bookmarked flag
        public read?: number                       // 0=unread, 1=read
    ) {}
}
```

---

## 4. Radiology Models

**File:** `model/Message.ts` (bottom section)

```typescript
export class RadImageDTO {
    constructor(
        public frameNo?: any,                      // Frame number in multi-frame study
        public name?: string,                      // Image name
        public filePath ?: string,                 // Server file path
        public extension?: string,                 // File extension (.dcm, .jpg)
        public appCacheFilePath ?: string,         // Local cache path
        public base64ThumbnailBinary ?: string     // Base64 thumbnail
    ) {}
}

export class RadResultMediaDTO {
    constructor(
        public unit ?: string,                     // Radiology unit
        public orderNumber ?: string,              // Order identifier
        public code ?: string,                     // Procedure code
        public modality ?: string,                 // CT / MRI / XRay / US
        public name ?: string,                     // Study name
        public orderStatus ?: string,              // COMPLETED / PENDING
        public studyDate ?: string,                // Date of imaging
        public orderDate ?: string,                // Date order placed
        public studyUID ?: string,                 // DICOM Study Instance UID
        public image ?: RadImageDTO[],             // Array of images
        public aiMediaFindings ?: AiMediaFindingsDTO[]  // AI analysis results
    ) {}
}

export class AiMediaFindingsDTO {
    constructor(
        public diagnosis ?: string,                // AI-detected diagnosis
        public heatMapImageURL ?: string,          // Heatmap visualization URL
        public athmaDownloadPath ?: string,        // ATHMA download path
        public athmaDownloadFileName ?: string,    // Download filename
        public appCacheFilePath ?: string          // Local cache path
    ) {}
}

export class RadResultConceptDTO {
    constructor(
        public media ?: RadResultMediaDTO          // Study/media details
    ) {}
}

export class RadResult {
    constructor(
        public patient ?: any,                     // Patient reference
        public encounter ?: any,                   // Encounter reference
        public concept ?: RadResultConceptDTO      // Result concept
    ) {}
}
```

---

## 5. Attributes

**File:** `model/Attributes.ts`

```typescript
export class Attributes {
    constructor(
        public labels?: any    // Array of label objects, default: []
    ) {
        this.labels = [];
    }
}
```

---

## 6. Initial Assessment Widgets

**File:** `model/WidgetsIA.ts`

```typescript
export enum IAWidgets {
    Allergy = "allergy",
    Comorbidities = "comorbidities",
    ChiefComplaintsAndHistoryOfPresentIllness = "chiefComplaint",
    SocialHistory = "socialHistory",
    PastHistoryMedical = "medical-history",
    SurgicalHistory = "surgicalHistory",
    ImplantableDevices = "implantable_devices",
    FamilyHistory = "family-history",
    RelevantPersonalInvestigations = "relevant_personal_investigations",
    InvestigationResults = "investigation_results",
    PastMedicationAndReconciliation = "past_medication_and_reconciliation",
    VitalSigns = "vital_signs",
    GeneralExamination = "general_examination",
    SystemicExamination = "systemic-examination",
    MaternalAndChildHealth = "maternalAndChildHealth",
    ProvisionalDiagnosis = "diagnosis",
    InvestigationsAdvised = "investigations_advised",
    TreatmentPlan = "treatment_plan",
    DischargePlanning = "dischargePlan",
    PsychologicalAssessment = "psychologyAssessment",
    CommunicableDiseaseAssessment = "communicableDiseases",
    RadiationOncology = "radiation_oncology",
    GeneralImpression = "general_impression",
    MLC = "mlc",
    PrimarySurvey = "primary_survey",
    LinesAndTubes = "lines_and_tubes",
    Psychological = "psychological"
}
```

### IAWidgetMeta (27 widgets)

Each widget has: `value`, `searchKey`, `saveKey`, `label`, optional `favouritesKey`

| Widget | searchKey | saveKey | label |
|--------|-----------|---------|-------|
| Allergy | allergy | allergy_save | Allergy |
| Comorbidities | comorbidities | comorbidities_save | Comorbidities |
| Chief Complaints | chiefComplaint | chief_complaint_save | Chief Complaints |
| Social History | social_history_search | social_history_save | Social History |
| Past Medical History | medical_history_search | medical_history_save | Past Medical History |
| Surgical History | surgical_history_search | surgical_history_save | Surgical History |
| Implantable Devices | implantable_devices_search | implantable_devices_save | Implantable Devices |
| Family History | family_history_search | family_history_save | Family History |
| Relevant Investigations | personal_investigations_search | personal_investigations_save | Relevant Personal Investigations |
| Investigation Results | investigation_results_search | investigation_results_save | Investigation Results |
| Past Medication | past_medication_search | past_medication_save | Past Medication & Reconciliation |
| Vital Signs | vital_signs_search | vital_signs_save | Vital Signs |
| General Examination | general_examination_search | general_examination_save | General Examination |
| Systemic Examination | systemic_examination_search | systemic_examination_save | Systemic Examination |
| Maternal & Child | maternal_child_health_search | maternal_child_health_save | Maternal & Child Health |
| Provisional Diagnosis | provisional_diagnosis_search | provisional_diagnosis_save | Provisional Diagnosis |
| Investigations Advised | investigations_advised_search | investigations_advised_save | Investigations Advised |
| Treatment Plan | treatment_plan_search | treatment_plan_save | Treatment Plan |
| Discharge Planning | discharge_planning_search | discharge_planning_save | Discharge Planning |
| Psychological Assessment | psychological_assessment_search | psychological_assessment_save | Psychological Assessment |
| Communicable Disease | communicable_disease_assessment_search | communicable_disease_assessment_save | Communicable Disease Assessment |
| Radiation Oncology | radiation_oncology_search | radiation_oncology_save | Radiation Oncology |
| General Impression | general_impression_search | general_impression_save | General Impression |
| MLC | mlc_search | mlc_save | MLC |
| Primary Survey | primary_survey_search | primary_survey_save | Primary Survey |
| Lines & Tubes | lines_and_tubes_search | lines_and_tubes_save | Lines & Tubes |
| Psychological | psychological | psychological_save | Psychological Condition |

---

## 7. Client Info (Video Consultation)

**File:** `model/VC-APP/client-info.model.ts`

```typescript
export interface IClientInfo {
    userType?: string;                // 'DOCTOR' (default)
    applicationType?: string;         // 'AADI' (default)
    operatingSystem?: string;         // iOS / Android / Windows
    operatingSystemVersion?: string;  // OS version
    browser?: string;                 // Browser name
    browserVersion?: string;          // Browser version
    otherDetails?: any;               // Additional device info
    appointmentId?: any;              // Associated appointment
}

export class ClientInfo implements IClientInfo {
    // Defaults: userType='DOCTOR', applicationType='AADI'
}
```

---

## 8. Inferred Clinical Models (from service usage)

### MedicationOrder (inferred from medication-order-list.page.ts)

```typescript
interface MedicationOrder {
    id?: string;
    status: 'ADDED' | 'ORDERED' | 'PENDING' | 'DISPENSED' | 'PARTIALLY_DISPENSED' |
            'ISSUED' | 'PARTIALLY_ISSUED' | 'CLOSED' | 'PARTIALLY_CLOSED' |
            'CANCELLED' | 'REJECTCED';
    medication: {
        code: string;
        name: string;
        brand?: boolean;        // true=Brand, false=Generic
        drugForm?: string;      // TABLET / CAPSULE / SYRUP / INJECTION
    };
    daywiseDosage: {
        morning: number | string;
        afternoon: number | string;
        evening: number | string;
        night: number | string;
        unit?: string;
    };
    drugFrequency: {
        id: number;
        code: string;           // OID / BID / TID / NTID
        name: string;           // "Once Daily" / "Twice Daily" / etc.
        frequency: number;      // 1 / 2 / 3 / 11
        periodUnit: { code: string; display: string; };
    };
    duration: number;
    durationUnit: string;       // DAYS / WEEKS / MONTHS
    quantity: number;
    route?: string;             // Oral / IV / IM / etc.
    foodInstruction?: string;   // After Food / Before Food / etc.
    patientInstruction?: string;
    prescriptionDate: string;   // YYYY-MM-DD
    isDischargeMedication: boolean;
    substitution: { allowed: boolean; };
}
```

### InvestigationOrder (inferred from investigation-orders.page.ts)

```typescript
interface InvestigationOrder {
    concept: {
        investigationOrder: {
            servicePackageDTO: {
                code: string;
                name: string;
                id: number;
                profile: boolean;
                serviceType: { code: string; };
            };
            status: 'ADDED' | 'ORDERED' | 'INPROGRESS' | 'REPORT_READY' |
                    'PROCESSED' | 'APPROVAL_REQUIRED' | 'CANCELLED' | 'REJECTCED';
            priority: 'NORMAL' | 'URGENT';
            instructions?: string;    // 0-250 chars
            orderDate: string;        // ISO datetime
            orderBy: { displayName: string; };
        };
    };
}
```

### LabResult (inferred from LabResultProcesserUtil)

```typescript
interface LabResult {
    code: string;
    name: string;
    investigationDisplayName: string;
    investigationShortName: string;
    value: string | number;
    resultType: 'GENERAL' | 'PARAMETER';
    unit: string;
    referenceRange: string;          // "min - max"
    abnormalFlag: 'N' | 'H' | 'L' | 'PH' | 'PL' | 'AH' | 'AL';
    reportHoldStatus: 'Y' | 'N';
    orderDate: string;
    parameter: Array<{
        name: string;
        value: string | number;
        unit: string;
        referenceRange: string;
        abnormalFlag: string;
    }>;
    report: Array<{
        reportType: 'ATTACHMENT_REPORT' | 'DIAGNOSTIC_REPORT' | 'EXTERNAL_REPORT' |
                    'LIS_REPORT' | 'SRM_REPORT';
        fileAttachmentReport?: { documentName: string; extension: string; };
        diagnosticReport?: { report: { pdfReport: string; }; };
    }>;
}
```

### ProgressNote (inferred from progress-notes.page.ts)

```typescript
interface ProgressNote {
    id: number;
    documentNumber: string;
    concept: {
        progressNotes: {
            text: string;                // Rich text (HTML from CKEditor)
            sourceDepartment: { name: string; code: string; };
            acknowledge: {
                by: string;              // Consultant name
                byLogin: string;         // Consultant login
                on: string;              // ISO datetime
            };
        };
        vitals: Vital[];
        medication: MedicationOrder[];
        investigation: InvestigationOrder[];
        crossConsultation: CrossConsultation[];
    };
    pad: number;                        // Post-Admission Days
    ppd: number;                        // Previous Progress Days
    submittedBy: string;
    submittedDate: string;
    status: 'DRAFT' | 'SUBMITTED' | 'ACKNOWLEDGED';
    createdOn: string;
}
```

### DischargeSummary (inferred from dischargesummary.service.ts)

```typescript
interface DischargeSummary {
    id: number;
    documentNumber: string;
    document: {
        status: 'NEW' | 'DRAFT' | 'SENT_FOR_REVIEW' | 'UNDER_REVIEW' | 'SIGN_OFF' | 'COMPLETE';
        admissionNumber: string;
        inPatient: {
            patientDetails: { mrn: string; name: string; gender: string; birthDate: string; };
            admissionDetails: { admissionDate: string; admissionNumber: string; };
        };
        // 28 clinical sections (all optional, CKEditor HTML):
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
        comments: Array<{
            commentedBy: { login: string; displayName: string; };
            commentedOn: string;
            comment: string;
        }>;
        amended: boolean;
        amendDetails: Array<{ amendedDate: string; amendedBy: string; reasons: string[]; }>;
    };
}
```

---

## 9. SQLite Table Schemas

### PatientInfo Table

```sql
CREATE TABLE IF NOT EXISTS PatientInfo (
    id INTEGER PRIMARY KEY,
    mrn TEXT NOT NULL,
    name TEXT, birth_date TEXT, gender TEXT,
    unit TEXT, unit_code TEXT, location TEXT,
    last_msg_time TEXT, unread_msg_count INTEGER DEFAULT 0,
    attributes TEXT, encounter_number TEXT,
    admission_number TEXT, admission_date TEXT,
    admission_reason TEXT, admission_category TEXT,
    primary_consultant TEXT,
    ip_activity_action TEXT,
    hsc_id TEXT, procedure_date TEXT,
    pin_flag INTEGER DEFAULT 0, pin_order INTEGER DEFAULT 0,
    risk_score TEXT, ward_capability TEXT, ward_sort INTEGER DEFAULT 1,
    comorbidities TEXT, pms_viewer INTEGER DEFAULT 0,
    acs_group_id TEXT, weight TEXT,
    consultant_short_name TEXT, consultant_login TEXT,
    mlc INTEGER, visit_type TEXT, sync INTEGER DEFAULT 0,
    attending_consultant_login TEXT, attending_consultant_name TEXT,
    accepting_consultant_login TEXT, accepting_consultant_name TEXT,
    consultant_handover_status TEXT,
    last_seen_date TEXT,
    discharge_intimation TEXT DEFAULT 'false',
    last_sync_time TEXT DEFAULT NULL
);
-- 15 indices on mrn, last_msg_time, location, ip_activity_action, pin_flag, ward_sort, etc.
```

### PatientMessage Table

```sql
CREATE TABLE IF NOT EXISTS PatientMessage (
    id INTEGER, patient_info_id INTEGER,
    patient_name TEXT, mrn TEXT,
    category TEXT, sub_category TEXT,
    content_type TEXT, content TEXT,
    sender_login TEXT, sender_name TEXT,
    sent_time TEXT, received_time TEXT,
    action_id TEXT PRIMARY KEY,
    msg_status TEXT, msg_delete TEXT DEFAULT 'false',
    acs_message_id TEXT, message_id TEXT,
    parent_message_id TEXT, parent_message_dto TEXT,
    msg_starred TEXT, read INTEGER DEFAULT 0,
    FOREIGN KEY (patient_info_id) REFERENCES PatientInfo(id) ON DELETE CASCADE
);
```

### CareTeam Table

```sql
CREATE TABLE IF NOT EXISTS CareTeam (
    id INTEGER, patient_info_id INTEGER,
    patient_name TEXT, mrn TEXT,
    user_login TEXT, user_name TEXT,
    primary_consultant TEXT,    -- JSON
    created_date TEXT, modified_date TEXT,
    active INTEGER,
    careTeam TEXT,              -- JSON array
    FOREIGN KEY (patient_info_id) REFERENCES PatientInfo(id) ON DELETE CASCADE
);
```

### AppEventLog Table

```sql
CREATE TABLE IF NOT EXISTS AppEventLog (
    id INTEGER PRIMARY KEY,
    event_date TEXT, log_level TEXT,
    event_category TEXT, event_action TEXT,
    event_name TEXT, request_url TEXT,
    request_method TEXT, request_content TEXT,
    response_status INTEGER, error_message TEXT,
    source_system TEXT, service_name TEXT,
    page_name TEXT, app_state TEXT, remarks TEXT
);
-- Auto-cleanup: DELETE WHERE datetime(event_date) < datetime('now', '-48 hours')
```

---

## 10. Model Relationship Diagram

```
PatientInfo (1)
├── PatientMessage (N)  [FK: patient_info_id → PatientInfo.id, CASCADE DELETE]
│   ├── category → MessageCategory enum
│   ├── subCategory → MessageSubCategory enum
│   ├── contentType → ContentType enum
│   └── messageStatus → MessageStatus enum
│
├── CareTeam (1)  [FK: patient_info_id → PatientInfo.id, CASCADE DELETE]
│
└── ipActivityAction → IPActvityAction enum

Message (transport layer)
├── context → MessageContextDTO → MessageContext enum
├── action → MessageAction enum
├── status → MessageStatus enum
├── sender/receiver → UserDTO
└── payload → serialized PatientMessage or clinical data

LabResult
├── resultType: GENERAL (single value) or PARAMETER (multi-value panel)
├── parameter[] → individual test results
├── report[] → attachments (PDF, diagnostic, LIS, SRM)
└── abnormalFlag → N / H / L / PH / PL / AH / AL

RadResult
└── concept → RadResultConceptDTO
    └── media → RadResultMediaDTO
        ├── image[] → RadImageDTO
        └── aiMediaFindings[] → AiMediaFindingsDTO
```
