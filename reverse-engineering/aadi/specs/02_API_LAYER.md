# AADI App - API Layer Reference

**Source:** Recovered TypeScript from `aadi_src/src/app/services/`

---

## Architecture

Two API systems operate in parallel:

### 1. Direct REST API
- **Base URL:** `{DOMAIN}/api/{endpoint}`
- **Auth:** `Authorization: Bearer {JWT}` (auto-injected by AuthInterceptor)
- **Service:** `ApiService` wraps HttpClient with domain prefix

### 2. ATHMA Proxy API (EHR Gateway)
- **Base URL:** `{DOMAIN}/api/athma/_search/athma-records-with-token` (GET) or `_update/athma-records-with-token` (POST/PUT/DELETE)
- **Auth:** `athmaToken` header (5-hour TTL, generated via `api/athma/generate/athma-user-token`)
- **Pattern:** URL code + query string routed to backend EHR system
- **Service:** `AthmaUrlUtility` wraps all ATHMA calls

```
GET:    {DOMAIN}/api/athma/_search/athma-records-with-token?athmaUrlCode={CODE}&athmaUrlContent={QUERY}&responseTypes=json
POST:   {DOMAIN}/api/athma/_update/athma-records-with-token?athmaUrlCode={CODE}&athmaUrlContent={QUERY}&httpMethod=POST
PUT:    {DOMAIN}/api/athma/_update/athma-records-with-token?athmaUrlCode={CODE}&athmaUrlContent={QUERY}&httpMethod=PUT
DELETE: {DOMAIN}/api/athma/_update/athma-records-with-token?athmaUrlCode={CODE}&athmaUrlContent={QUERY}&httpMethod=DELETE
```

---

## Authentication Endpoints

| Method | Endpoint | Body | Response | Purpose |
|--------|----------|------|----------|---------|
| POST | `api/authenticate` | `{ username, password, rememberMe, deviceId }` | `{ id_token, refresh_token, accessExpiryTime, refreshExpiryTime }` | Login |
| POST | `api/refresh` | `{ refreshToken, accessToken, login, deviceId }` | `{ accessToken, accessExpiryTime }` | Token refresh |
| GET | `api/account` | - | User profile object | Get current user |
| POST | `api/unsubscribe-device-session` | FCM token + device details | - | Logout |

---

## Patient Management Endpoints

| Method | Endpoint | Params | Purpose |
|--------|----------|--------|---------|
| GET | `api/my-patient-list` | `login={userLogin}` | Fetch assigned patients |
| GET | `api/patient-infos/{patientId}` | - | Get patient by ID |
| GET | `api/_search/inpatient-status` | `admissionNumber={num}` | Patient admission status |
| GET | `api/_search/recent-discharge-patients` | - | Discharged patients list |
| GET | `api/count/recent-discharge-patients` | - | Count of discharged patients |
| GET | `api/mortality-prediction-score/{mrn}/{enc}` | - | Risk score prediction |
| GET | `api/_search/risk-score/{mrn}/{enc}` | - | Risk score details |
| GET | `api/_search/vi-score/{mrn}/{enc}` | - | VI score details |

---

## Care Team Endpoints

| Method | Endpoint | Params | Purpose |
|--------|----------|--------|---------|
| GET | `api/care-teams/patient/{mrn}` | - | Get care team for patient |
| GET | `api/_search/care-teams` | `mrn, encounterNumber` | Care team by encounter |
| GET | `api/_search/athma/care-team` | `encounterNumber` | Care team from EHR |
| GET | `api/_search/care-team-users` | `unitCode, searchStr` (size=50) | Search team members |
| POST | `api/update/care-teams` | Care team JSON | Update care team |
| ATHMA PUT | `EHR_124` | Care team object | Update care team in EHR |

### Care Team Management

| Method | Endpoint | Params | Purpose |
|--------|----------|--------|---------|
| GET | `api/_search/user-organization-role-mapping` | `loginId` | Admin role mapping |
| GET | `api/_search/employee-unit-category-mappings` | `loginId, groupCode` | Employee-unit mapping |
| GET | `api/_search/care-team-template-other` | `loginId` | Other care team templates |
| GET | `api/_search/care-team-template-hsc` | `loginId` | HSC-based templates |
| GET | `api/care-team-template` | `id` | Template by ID |
| POST | `api/care-team-template` | Template JSON | Create template |
| GET | `api/_search/care-team-template-primary` | `loginId, unitId` | PC-based templates |
| GET | `api/_search/unit-wise-hsc-care-team-template` | `unitId` | Unit HSC templates |
| GET | `api/_search/admin-employee-unit-category-mappings` | `unitIds, searchStr` | Employees in units |
| GET | `api/_search/care-team-template-by-hsc-id` | `unitId, locationId` | Team by HSC |

---

## Cross Consultation Endpoints

| Method | Endpoint | Params | Purpose |
|--------|----------|--------|---------|
| GET | `api/_search/ehr-cross-consultation-records` | `mrn, encounterNumber, referenceNumber` (size=20) | List cross-consultations |
| GET | `api/app-cross-consultation-document-no` | `encounterNumber` | Generate document number |
| POST | `api/cross-consultation-record-action` | CC JSON | Save cross-consultation |
| GET | `api/_search/organizations` | `searchStr` (size=20) | Search units |
| GET | `api/_search/doctors` | `unitId, searchStr` (size=20) | Search doctors by unit |

---

## Medication Endpoints

### Direct REST

| Method | Endpoint | Params | Purpose |
|--------|----------|--------|---------|
| GET | `api/_search/medication-fav-service` | `login, sort=version,desc&sort=document.name.sort,asc` | Favorite medications |
| GET | `api/_search/medication-order-records/allItems` | `serviceMasterSearchParam={query}` (size=100) | Search all medications |
| GET | `api/_search/medication-order-records` | `encounterNumber` (size=100, sort=createdOn,desc) | Encounter medications |
| GET | `api/_search/medication-order-records/hscItems` | `drugSearchParam, drugType, hscId` (size=100) | Search by HSC |
| GET | `api/_search/active-medication-order-records` | `mrn, encounterNumber` (size=100) | Active medications |
| POST | `api/medication-order-record-action` | Medication JSON | Save medication order |
| GET | `api/drug-frequencies` | - | Frequency list |
| GET | `api/food-instructions` | - | Food instructions |
| GET | `api/medication-enabled/{unitCode}` | - | Unit config check |

### ATHMA Proxy

| Code | Method | Query | Purpose |
|------|--------|-------|---------|
| EHR_019 | GET | `encounterNumber` (size=500) | Get medication list |
| EHR_020 | GET | `medType (BRAND/GENERIC), hscId, searchText` | Search medications |
| EHR_021 | POST | Medication object | Create medication |
| EHR_021 | PUT | Medication object | Update medication |
| EHR_021 | DELETE | `/{id}` | Delete medication |
| EHR_022 | PUT | Publish object | Publish new order |
| EHR_023 | GET | - | Frequency list |
| EHR_024 | GET | `consultant login, type=medication-order` | Favorites |
| EHR_025 | GET | `key, queryValue` | Concept values (route, food, duration) |
| EHR_026 | PUT | `/{id}?reason={reason}` | Cancel medication |
| EHR_056 | GET | `mrn, encounterNumber, date` | Medications on date |
| EHR_106 | GET | `encounterNumber` (size=500) | Reconciled medications |
| EHR_107 | POST/PUT | Medication object | Create/update reconciliation |
| EHR_108 | POST | `idArray` | Order reconciliation |
| EHR_112 | POST | `id, reason` | Cancel medication |
| EHR_113 | PUT | `/{id}` | Unhold medication |
| EHR_114 | PUT | `/{id}?reason={reason}` | Hold medication |
| EHR_115 | GET | `drugCode` | Drug monograph (HTML) |
| EHR_118 | PUT | `/{id}?reason={reason}` | Stop active medication |
| EHR_119 | GET | `encounter, mrn` | Drug interaction check |
| EHR_168 | GET | `unitCode` | Medication card timings |
| EHR_169 | GET | `documentNumber` | Vital concepts |
| MDM_001 | GET | `valueSetCode` | Value set master (drug forms) |
| MDM_002 | GET | `keys[], unit, global` | Configuration values |

---

## Investigation & Lab Results Endpoints

### Direct REST

| Method | Endpoint | Params | Purpose |
|--------|----------|--------|---------|
| GET | `api/_search/fav-service` | `login, sort` | Investigation favorites |
| GET | `api/_search/services` | `serviceMasterSearchParam, unitId` (size=100) | Search services |
| GET | `api/_search/investigation-order-records` | `encounterNumber` (size=100, sort=createdOn,desc) | Existing orders |
| POST | `api/investigation-order-record-action` | Investigation JSON | Save investigation |

### ATHMA Proxy

| Code | Method | Purpose |
|------|--------|---------|
| EHR_104 | GET | Search investigations by unit |
| EHR_105 | GET | Investigation favorites |
| EHR_014 | GET | Investigation results by encounter |
| LIS_003 | GET | Provisional lab results (status=VALIDATED, size=50) |
| LIS_004 | GET | Download lab PDF (returns blob) |

---

## Progress Notes Endpoints

### Direct REST

| Method | Endpoint | Params | Purpose |
|--------|----------|--------|---------|
| GET | `api/_search/progress-notes` | `mrn, encounterNumber, createdOn` (sort=id,desc) | List notes |
| GET | `api/_search/progress-notes-with-vitals` | `mrn, encounterNumber, createdOn, acknowledgeFilter, login, filterByConsultant` (size=50) | Notes with vitals |
| POST | `api/progress-notes-record-action` | PN JSON (observe: response) | Create/update notes |
| GET | `api/app-progress-notes-document-no` | `encounterNumber` | Generate doc number |
| GET | `api/_search/progress-notes-reference-no` | `mrn, encounterNumber, referenceNumber` | Notes by reference |
| GET | `api/_search/progress-notes-medication-order-records` | `encounterNumber, referenceNumber` (size=100) | Medications for note |
| GET | `api/_search/progress-notes-investigation-order-records` | `encounterNumber, referenceNumber` (size=100) | Investigations for note |
| GET | `api/_search/distinct-progress-notes-consultant` | `encounterNumber` | Note creators list |
| POST | `api/_search/latest-progress-notes-by-login` | `{ query, size: 1, sortBy: "id" }` | Last department used |

### ATHMA Proxy

| Code | Method | Purpose |
|------|--------|---------|
| EHR_030 | GET | Vitals by document number |
| EHR_031 | POST/PUT | Save/update draft vitals |
| EHR_032 | POST | Acknowledge progress notes |
| EHR_034 | POST/PUT/GET | Progress notes CRUD |
| EHR_083 | GET | Cross-consultation by document |
| EHR_084 | PUT | Publish medications |
| EHR_085 | PUT | Publish investigations |
| EHR_086 | POST | Publish cross-consultation |
| EHR_087 | POST/DELETE | Draft investigations |
| EHR_088 | POST/DELETE | Draft cross-consultations |
| ADT_001 | GET | Inpatient details |

---

## Discharge Summary Endpoints

### Direct REST

| Method | Endpoint | Params | Purpose |
|--------|----------|--------|---------|
| PUT | `api/discharge-summary-action` | DS sign-off JSON | Approve/update summary |
| GET | `api/_search/discharge-summary-record` | `documentNumber` | Get summary record |
| GET | `api/_search/user` | `login` | Get user info |

### ATHMA Proxy

| Code | Method | Purpose |
|------|--------|---------|
| DS_001 | GET | Get summary by admission number |
| DS_002 | POST | Create summary (`?action=DRAFT/SEND_FOR_REVIEW`) |
| DS_002 | PUT | Update summary |
| DS_003 | GET | Get workflow status (`?documentNumber, userId`) |
| DS_003 | PUT | Update workflow (`?transition, taskId`) |
| DS_004 | GET | Regenerate summary |
| DS_005 | GET | Search summaries (`?query, sort`) |
| DS_006 | PUT | Copy previous notes (`?sourceDocumentNumber, admissionNumber`) |
| DS_007 | GET | Print summary (returns PDF blob) |
| DS_008 | GET | Get task detail (`?documentNumber, userId, taskName`) |
| DS_009 | PUT | Revert review status (`?documentNumber`) |
| DS_011 | POST | Sync discharge to medication (`?encounterNumber, widgetType`) |
| DS_012 | PUT | Intimate discharge |
| ADT_002 | PUT | Revert discharge intimation |
| ADT_005 | GET | Inpatient detail from MFD |
| EHR_029 | GET | Vital concept list |
| EHR_141 | POST | Save macro for discharge summary |
| MDM_001 | GET | Value set master |
| AMB_004 | PUT | Cancel appointment |

---

## Macros Endpoints

| Code | Method | Purpose |
|------|--------|---------|
| EHR_140 | GET | Get macros (`?query=widgetType AND user.login AND (title OR notes)`, size=50) |
| EHR_141 | POST | Save macro (NotesTemplate object) |

---

## Patient Communication Endpoints

| Method | Endpoint | Params | Purpose |
|--------|----------|--------|---------|
| GET | `api/_search/patient-communication` | `mrn, admissionNumber, encounterNumber` | Load messages |
| POST | `api/patient-communication-record-action` | Message body | Send message |
| ATHMA GET | `ADT_006` | `encounterNumber, mrn, currentDate` (size=100) | Bystander list |
| ATHMA POST | `EHR_067` | Message body | IVR call to family |

---

## Task Activity Endpoints

| Method | Endpoint | Body | Purpose |
|--------|----------|------|---------|
| POST | `api/task/total-count` | `{ query }` | Total task count |
| POST | `api/_search/aggregation/tasks` | `{ query, parentFieldName, level1FieldName, ... }` | Aggregated tasks |
| GET | `api/_search/tasks` | `documentNo` | Tasks by document |
| GET | `api/_search/tasks-by-definition` | `referenceNumber, taskDefinitionCode` | Tasks by definition |
| PUT | `api/tasks/{id}` | Task object | Update task |

---

## Initial Assessment Endpoints (ATHMA)

| Code | Method | Purpose |
|------|--------|---------|
| EHR_001 | GET/POST | IA sections / create record |
| EHR_002 | GET | Allergy list |
| EHR_003 | GET | Chief complaint & HPI |
| EHR_004 | GET | Personal history |
| EHR_005 | GET | Past medical history |
| EHR_006 | GET | Surgical history |
| EHR_007 | GET | OB/GYN history |
| EHR_008 | GET | Family history |
| EHR_009 | GET | Past medication & reconciliation |
| EHR_010 | GET | Vitals |
| EHR_011 | GET | General examination |
| EHR_012 | GET | Systemic examination |
| EHR_013 | GET | Provisional diagnosis |
| EHR_014 | GET | Investigation advised |
| EHR_035 | GET | Communicable diseases |
| EHR_037 | GET | Communicable disease data |
| EHR_050 | GET | Lines and tubes (size=500) |
| EHR_051 | GET | Implantable devices (size=20) |
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
| EHR_165 | GET | Check if IA disabled |
| SM_001 | GET | SNOMED search |

---

## Video Consultation Endpoints

| Code | Method | Purpose |
|------|--------|---------|
| EHR_038 | POST | Load consultations |
| EHR_069 | PUT | Update consultation status (`?encounterNumber, consultationStatus`) |
| EHR_070 | GET | Appointment count (`?query, doctorLogin, date`) |
| EHR_071 | GET | Past chat messages (`?appointmentNumber`) |
| EHR_074 | PUT | Start IVR call (`?encounterNumber`) |
| EHR_075 | PUT | Save client info |
| EHR_076 | PUT | VC audit start |
| EHR_077 | PUT | VC audit stop |
| AMB_005 | GET | Appointment list |
| AMB_008 | GET | Get Agora app ID |

---

## Vital Trend Endpoints

| Code/Method | Endpoint | Purpose |
|-------------|----------|---------|
| ATHMA EHR_033 | GET | Patient vitals (`mrn, encounterNumber, fromDate, toDate`, size=1000) |
| GET | `api/athma/_search/patient-vitals-device_info` | Patient ECG data |
| ATHMA MDM_002 | GET | Unit configuration data |
| GET | `api/_search/care-team-employee-unit-category-mappings` | Logged-in user details (size=50) |
| POST | `api/_search/_user-organization-from-code` | Unit info from code |
| GET | `api/_search/employee-department-mappings` | Employee department mappings (size=100) |

---

## Feedback & System Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `api/_load/my-customer-feedback-list/{login}` | Feedback list |
| POST | `api/_update/customer-feedback-view-status/{login}` | Mark survey done |
| GET | `api/_load/my-pending-customer-feedback-list/{login}` | Pending surveys |
| GET | `api/_load/down-time-info` | Server downtime info |
| POST | `api/update/app-version` | Report app version to server |
