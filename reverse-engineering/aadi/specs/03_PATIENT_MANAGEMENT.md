# AADI App - Patient Management Flow

**Source:** Recovered TypeScript from `aadi_src/src/app/pages/` and `services/`

---

## 1. Patient List Display

### Data Loading Flow

```
App Launch → LoginService.login()
  → PatientInfoService.getPatientInfoListFromServer(userLogin, database)
    → AuthServerProvider.getPatientInfoListFromServer(userLogin)
      → GET api/my-patient-list?login={userLogin}
    → For each patient: addPatientInfo(patientInfo, database)
      → REPLACE INTO PatientInfo (...)
    → loadPatientInfoList(database)
      → SELECT * FROM PatientInfo WHERE (ip_activity_action IS NULL OR ...)
      → patientInfoList.next(results)
```

### Display Fields Per Patient Card

| Field | Source | Display Logic |
|-------|--------|---------------|
| Name | `name` | Title-cased, prefix stripped (Mr./Mrs./Dr. removed via `slicepatientname` pipe) |
| Gender & Age | `gender`, `birthDate` | Age via `ageFromDOB` pipe: <5y shows y/m/d, >=5y shows years only |
| MRN | `mrn` | Direct display |
| Weight | `weight` | Shown if available |
| Consultant | `consultantShortName` | 3-char abbreviated name via `consultantShortname` pipe |
| Location | `location` | Ward/bed display |
| Risk Score | `riskScore` | Color: black if <33, red if >=33 |
| Pin | `pinFlag` | Star/pin icon if pinFlag=1 |
| Unread Count | `unreadMsgCount` | Badge count if >0 |
| MFD | `ipActivityAction` | Badge if MARK_FOR_DISCHARGE |
| MLC | `mlc` | Badge if true |
| Visit Type | `visitType` | DC (Daycare), ER (Emergency) |
| Comorbidities | `comorbidities` | Color badges via `avatardesign` pipe (red for ICU, blue default, max 3 shown, "+N" overflow) |
| Ward | `wardCapability` | ICU indicator via `patientListAvatar` pipe |

### Sorting

```sql
ORDER BY pin_flag DESC, pin_order DESC, ward_sort ASC, last_msg_time DESC
```

- Pinned patients first
- ICU patients before general ward
- Most recent message activity

---

## 2. Patient Filtering (9 Dimensions)

**Page:** `inpatient-filter.page.ts`

| # | Filter | Source | Multi-Select | Search |
|---|--------|--------|-------------|--------|
| 1 | Location | PatientInfo.location | Yes + master checkbox | Yes |
| 2 | Ward | Extracted from location hierarchy | Yes + master checkbox | Yes |
| 3 | Unit | `patientInfoService.getUnitList()` | Yes + master checkbox | Yes |
| 4 | Primary Consultant | `patientInfoService.getPrimaryConsultantList()` | Yes + dedup by login | Yes |
| 5 | Attending Consultant | `patientInfoService.getAttendingConsultantList()` | Yes + dedup by login | Yes |
| 6 | Visit Type | `patientInfoService.getVisitTypeList()` | Yes | No |
| 7 | Discharge Intimation | TRUE / FALSE | Toggle | No |
| 8 | MLC / MFD | Boolean flags | Toggle | No |
| 9 | Dead / Absconded | ipActivityAction values | Toggle | No |

### Filter State Persistence

```typescript
// Saved to SecureStorage on submit
AppStorageKeys.FILTER_SUBMIT = {
    selectedLocations: string[],
    selectedWards: string[],
    selectedUnits: string[],
    selectedPrimaryConsultants: string[],
    selectedAttendingConsultants: string[],
    selectedVisitTypes: string[],
    dischargeIntimation: boolean,
    mlc: boolean,
    mfd: boolean,
    dead: boolean,
    absconded: boolean
}
```

### Indeterminate State Logic

Each filter category tracks:
- `selectAll{Category}`: master checkbox state
- `isIndeterminate{Category}`: partial selection (some but not all checked)
- `{category}CheckCount`: number of selected items

---

## 3. Initial Assessment Flow

**Page:** `initial-assessment.page.ts`

### Widget-Based Form Architecture

The initial assessment is composed of 27 dynamic widgets (from `IAWidgets` enum). Each widget represents a clinical assessment section.

```
Initial Assessment Page
├── Widget List (scrollable)
│   ├── Allergy → EHR_002 (GET) / EHR_145 (POST/PUT/DELETE)
│   ├── Comorbidities → EHR_162
│   ├── Chief Complaints → EHR_003 / EHR_163
│   ├── Social History → EHR_004 / EHR_151
│   ├── Past Medical History → EHR_005 / EHR_149
│   ├── Surgical History → EHR_006 / EHR_150
│   ├── Family History → EHR_008 / EHR_152
│   ├── Vital Signs → EHR_010 / EHR_031
│   ├── General Examination → EHR_011 / EHR_157
│   ├── Systemic Examination → EHR_012 / EHR_158
│   ├── Provisional Diagnosis → EHR_013 / EHR_153
│   ├── Investigation Advised → EHR_014
│   ├── Lines & Tubes → EHR_050
│   ├── Implantable Devices → EHR_051
│   ├── Communicable Diseases → EHR_037 / EHR_035
│   ├── Psychological → EHR_159
│   ├── MLC → ADT_004
│   ├── Discharge Planning → EHR_146
│   └── ... (27 total widgets)
├── Add/Modify Widget (AddModifyWidgetComponent)
├── Search within assessment
└── Submit IA → EHR_146 (PUT)
```

### Widget Operations

Each widget supports:
- **GET:** Fetch existing data (`searchKey`)
- **POST:** Create new entry (`saveKey`)
- **PUT:** Update existing entry
- **DELETE:** Remove entry
- **Favorites:** Quick-add from favorites list (`favouritesKey`)

### Submit Flow

```typescript
submitIA() → ATHMA PUT EHR_146
  → postData includes all widget data
  → Status updated to SUBMITTED
  → Task created: INITIAL_ASSESSMENT_REVIEW
```

---

## 4. Risk Scoring System

### Risk Score Display (`risk-score.page.ts`)

**API:** `GET api/mortality-prediction-score/{mrn}/{encounterNumber}`

**Response:**
```typescript
{
    refreshdatetime: string,
    riskScorePercentage: number,
    riskScore: number,
    dataJson: [
        { parameter_name: string, score: number, value: number }
    ],
    aiPrediction: object,
    plot: boolean
}
```

**Visualization:** D3.js line chart
- X-axis: Time (HH:MM) + Date (DD/MM)
- Y-axis: Score values
- Colors: Green (#7dc9b8) normal, Red (#F43636) abnormal (>33% for risk score, >0 for parameters)
- Rolling 2-day window

### Risk Scorecard (`risk-scorecard.page.ts`)

**Visual:** SVG circular gauge with needle animation
- Low: 0-30% (green zone)
- Average: 30-70% (yellow zone)
- High: 70-100% (red zone)

**Data:**
```typescript
{
    class_1: number,         // Risk probability (0-1), multiplied by 100 for %
    init: string,            // Observations (newline-separated)
    summary: string,         // Prediction explanation
    createdDateTime: string,
    losDay: number           // Length of Stay prediction (days)
}
```

---

## 5. Cross-Consultation Flow

**Page:** `cross-consultation.page.ts`

### Request Structure

```typescript
{
    doctorId: string,
    unitId: string,
    departmentId: string,
    remarks: string,                  // Optional notes
    unitname: string,
    doctorName: string,
    priority: 'NORMAL' | 'Urgent',
    commentedOn: datetime             // ISO format
}
```

### Workflow

```
1. Search unit → GET api/_search/organizations?searchStr={query}&size=20
2. Search doctor in unit → GET api/_search/doctors?unitId={id}&searchStr={query}&size=20
3. Validate: cannot consult self
4. Generate document number → GET api/app-cross-consultation-document-no?encounterNumber={enc}
5. Save → POST api/cross-consultation-record-action
6. Optional: send message to target doctor
```

### Listing (`cross-consultation-list.page.ts`)

```
GET api/_search/ehr-cross-consultation-records
  ?mrn={mrn}&encounterNumber={enc}&referenceNumber={ref}
  &sort=document.consultationDate,desc&size=20
```

---

## 6. Patient Communication

**Page:** `patient-communication.page.ts`

### Message Flow

```
1. Load history → GET api/_search/patient-communication?mrn={mrn}&admissionNumber={adm}&encounterNumber={enc}
2. Get bystanders → ATHMA ADT_006 (?encounterNumber={enc}&mrn={mrn}&currentDate={date}, size=100)
3. Compose message (max 150 chars)
4. Confirmation alert before send
5. Send → POST api/patient-communication-record-action
   Body: { mrn, encounterNumber, name, content, senderLogin, sourceId, sender }
6. Auto-refresh every 10 seconds
```

### IVR Call to Family

```
ATHMA POST EHR_067
Body: {
    fromNumber: doctor.mobileNo,
    toNumber: bystander.mobileNumber,
    audioMessage: null,
    source: { referenceNumber: encounterNumber, documentType: "AADI" }
}
```

---

## 7. Care Team Management

### Team Types

| Type | Mode | Key | Description |
|------|------|-----|-------------|
| Primary Consultant | `PRIMARY_CONSULTANT` | consultant login | Team assigned to specific PC |
| Location-Based | `HSC` | HSC code | Team assigned to ward/location |

### Roles

```typescript
categories: [
    { code: 'DOCTOR', display: 'Doctor' },
    { code: 'NURSE', display: 'Nurse' },
    { code: 'PARAMEDICS', display: 'Paramedics' }
]
```

### Team Template Structure

```typescript
{
    id: number | null,
    careTeam: [{
        user: { displayName, id, mobileNo, login, employeeNo },
        category: { code: 'DOCTOR' | 'NURSE' | 'PARAMEDICS', display: string },
        admin: boolean,
        active: boolean,
        type: 'PRIMARY_CONSULTANT' | 'HSC'
    }],
    active: boolean,
    primaryConsultant: { /* user */ },     // For PC-based
    hsc: { /* location */ },               // For HSC-based
    unit: { id, code, name, active },
    mode: 'PRIMARY_CONSULTANT' | 'HSC',
    createdOn: datetime,
    createdBy: { id, login, displayName, employeeNo },
    modifiedBy: { id, login, displayName },
    modifiedOn: datetime
}
```

### Concurrency Handling

- Timestamp comparison on load vs save
- If `modifiedOn` changed since load → reload latest data
- User notification: "Team was modified by another user"

---

## 8. Discharge Tracking

### Status Values

| Status | Description | Filter |
|--------|-------------|--------|
| `ACTIVE` | Currently admitted | Default list |
| `MARK_FOR_DISCHARGE` (MFD) | Approved for discharge | Badge in list |
| `DISCHARGED` | Formally discharged | Separate list |
| `MARK_DEAD` | Patient expired | Filter option |
| `ABSCONDED` | Left without treatment | Filter option |

### Discharge Intimation

```
dischargeIntimation field: 'true' | 'false'
→ Filterable in inpatient filter
→ Badge shown in patient list
→ Triggers DS_012 (intimate discharge) API
→ Reversible via ADT_002 (revert intimation)
```

### Discharged Patients List

```
GET api/_search/recent-discharge-patients → Full patient list
GET api/count/recent-discharge-patients → Count only
```

---

## 9. Comorbidities Management

**Page:** `comordities.page.ts`

### Data Structure

```typescript
{
    id: number,
    active: boolean,
    patient: { mrn, name, ... },
    encounter: { documentNumber, ... },
    concept: {
        comorbidities: {
            name: string,
            category: string,
            shortName: string    // Single char: C, H, K, L, T, P, D, S
        }
    },
    reference: { referenceNumber, documentType: "INITIAL_ASSESSMENT" },
    createdBy: { login, displayName },
    createdOn: datetime
}
```

### Short Name Mapping (from application-constants.ts)

```typescript
comorbidities: {
    "C": "cancer",
    "H": "hypertension",
    "K": "kidneyImpairment",
    "L": "liverImpairment",
    "T": "thyroidDisease",
    "P": "pulmonaryImpairment",
    "D": "diabetes",
    "S": "stroke"
}
```

### Operations

- Add: Creates new comorbidity record (active: true)
- Remove: Sets active: false (soft delete)
- Toggle: Switches active status
- Submit: Batch save all changes

---

## 10. Navigation Flow

```
Home Dashboard
├── Inpatient List (filterable, sortable, searchable)
│   ├── Patient Chat (messaging + clinical data)
│   │   ├── Progress Notes (create/view/edit)
│   │   ├── Medication Orders
│   │   ├── Investigation Orders
│   │   ├── Lab Results
│   │   ├── Cross-Consultation
│   │   ├── Initial Assessment
│   │   ├── Risk Score & Scorecard
│   │   ├── Patient Communication
│   │   ├── Gallery View (attachments)
│   │   ├── Vital Trends
│   │   └── Discharge Summary
│   └── Care Team Management
│       ├── Self Care Team
│       ├── Admin Care Team
│       ├── Location-Wise Team
│       └── Add New Template
├── Discharged Patients
│   └── Patient Detail → Discharge Summary
├── Activity Area (task hub)
│   ├── Progress Notes Acknowledgment
│   ├── Discharge Summary Creation
│   ├── Discharge Summary Signoff
│   ├── Initial Assessment Review
│   ├── Checklist Approval
│   └── Cross-Consultation
└── Video Consultation (VC-APP module)
```
