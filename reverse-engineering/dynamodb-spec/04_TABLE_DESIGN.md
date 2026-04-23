# Table Design -- Complete Schema Reference

> All 16 tables with partition keys, sort keys, GSIs, attributes, and item examples.

---

## Naming Conventions

- **Table names**: PascalCase with `Table` suffix (e.g., `PatientTable`)
- **PK/SK prefixes**: UPPER_CASE with `#` delimiter (e.g., `PAT#123`, `DOC#PN#001`)
- **Attribute names**: camelCase (e.g., `patientName`, `encounterNumber`)
- **GSI names**: `GSI1`, `GSI2`, `GSI3` (numbered per table)
- **Timestamps**: ISO-8601 format (`2026-04-23T10:30:00Z`)
- **Boolean**: DynamoDB native BOOL type
- **Lists/Maps**: DynamoDB native L/M types

---

## Table 1: UserStaffTable

Stores all user types: doctors, nurses, paramedics, coordinators, admin staff.

### Keys

| Key | Attribute | Pattern | Example |
|-----|-----------|---------|---------|
| PK | `PK` | `USER#{userId}` | `USER#dr-sharma-01` |
| SK | `SK` | `PROFILE` or `FCM#{deviceId}` | `PROFILE` |

### GSIs

| GSI | PK | SK | Projection | Purpose |
|-----|----|----|------------|---------|
| GSI1 | `GSI1PK` = `LOGIN#{login}` | `GSI1SK` = `USER#{userId}` | ALL | Lookup by login |
| GSI2 | `GSI2PK` = `UNIT#{unitCode}` | `GSI2SK` = `ROLE#{role}#USER#{userId}` | ALL | Users by unit and role |
| GSI3 | `GSI3PK` = `ORG#{orgId}` | `GSI3SK` = `UNIT#{unitCode}#USER#{userId}` | KEYS_ONLY | Users by org |

### Attributes (PROFILE item)

| Attribute | Type | Description |
|-----------|------|-------------|
| userId | S | Unique user ID |
| login | S | Login username |
| displayName | S | Full display name |
| firstName | S | First name |
| lastName | S | Last name |
| email | S | Email address |
| mobileNumber | S | Phone number |
| roles | L | List of role strings (DOCTOR, NURSE, PARAMEDICS, COORDINATOR, ADMIN) |
| department | S | Department name |
| designation | S | Title/designation |
| specialization | S | Medical specialization (doctors only) |
| qualifications | S | Qualification string |
| unitCode | S | Primary unit code |
| organizationId | S | Organization ID |
| isActive | BOOL | Active status |
| photo | S | Photo URL or base64 |
| employeeNo | S | Employee number |
| createdAt | S | Creation timestamp |
| updatedAt | S | Last update timestamp |

### Attributes (FCM item)

| Attribute | Type | Description |
|-----------|------|-------------|
| fcmToken | S | Firebase Cloud Messaging token |
| deviceId | S | Device identifier |
| platform | S | android / ios |
| appVersion | S | App version string |
| isActive | BOOL | Token active status |
| lastUpdated | S | Token update timestamp |

### Item Examples

```json
{
  "PK": "USER#dr-sharma-01",
  "SK": "PROFILE",
  "GSI1PK": "LOGIN#dr.sharma",
  "GSI1SK": "USER#dr-sharma-01",
  "GSI2PK": "UNIT#NH-BLR-01",
  "GSI2SK": "ROLE#DOCTOR#USER#dr-sharma-01",
  "GSI3PK": "ORG#NH",
  "GSI3SK": "UNIT#NH-BLR-01#USER#dr-sharma-01",
  "userId": "dr-sharma-01",
  "login": "dr.sharma",
  "displayName": "Dr. Amit Sharma",
  "firstName": "Amit",
  "lastName": "Sharma",
  "roles": ["DOCTOR"],
  "department": "Cardiology",
  "specialization": "Interventional Cardiology",
  "unitCode": "NH-BLR-01",
  "organizationId": "NH",
  "isActive": true
}
```

---

## Table 2: PatientTable

Patient demographics, registration data, and identity.

### Keys

| Key | Attribute | Pattern | Example |
|-----|-----------|---------|---------|
| PK | `PK` | `PAT#{patientId}` | `PAT#P-100234` |
| SK | `SK` | `PROFILE` or `AADHAAR` | `PROFILE` |

### GSIs

| GSI | PK | SK | Projection | Purpose |
|-----|----|----|------------|---------|
| GSI1 | `GSI1PK` = `MRN#{mrn}` | `GSI1SK` = `PAT#{patientId}` | ALL | Lookup by MRN |
| GSI2 | `GSI2PK` = `UHID#{uhid}` | `GSI2SK` = `PAT#{patientId}` | ALL | Lookup by UHID |
| GSI3 | `GSI3PK` = `PHONE#{mobileNumber}` | `GSI3SK` = `PAT#{patientId}` | KEYS_ONLY | Search by phone |

### Attributes (PROFILE item)

| Attribute | Type | Description |
|-----------|------|-------------|
| patientId | S | Unique patient ID |
| mrn | S | Medical Record Number (AADI identifier) |
| uhid | S | Universal Health ID (AHAM identifier) |
| firstName | S | First name |
| lastName | S | Last name |
| fullName | S | Display name |
| dateOfBirth | S | ISO date (YYYY-MM-DD) |
| gender | S | M / F / O |
| mobileNumber | S | Primary phone |
| email | S | Email (optional) |
| address | M | Structured address (addressLine1, city, state, country, zipcode) |
| aadhaarNumber | S | Masked Aadhaar (optional) |
| patientType | S | GENERAL / EMERGENCY / CAMP / REFERRED |
| registrationDate | S | Registration timestamp |
| registrationSource | S | WALK_IN / OUTREACH / DIRECT |
| status | S | Active / Inactive |
| unitCode | S | Registration unit |
| organizationId | S | Organization |
| photo | S | Photo URL/base64 |
| bloodGroup | S | Blood group |
| maritalStatus | S | Marital status |
| nationality | S | Nationality |
| emergencyContactName | S | Emergency contact |
| emergencyContactNumber | S | Emergency phone |
| insuranceDetails | M | Insurance info map |
| weight | S | Weight in kg |
| createdAt | S | Creation timestamp |
| updatedAt | S | Last update timestamp |

### Attributes (AADHAAR item)

| Attribute | Type | Description |
|-----------|------|-------------|
| aadhaarNumber | S | Aadhaar (masked) |
| nameOnAadhaar | S | Name as on card |
| dobOnAadhaar | S | DOB from Aadhaar |
| genderOnAadhaar | S | Gender from Aadhaar |
| addressOnAadhaar | S | Address from Aadhaar |
| verified | BOOL | Verification status |
| verificationTimestamp | S | When verified |

---

## Table 3: EncounterTable

Admissions, encounters, and visit tracking.

### Keys

| Key | Attribute | Pattern | Example |
|-----|-----------|---------|---------|
| PK | `PK` | `ENC#{encounterNumber}` | `ENC#EN-2026-00145` |
| SK | `SK` | `METADATA` or `ADMISSION` or `TRANSFER#{timestamp}` | `METADATA` |

### GSIs

| GSI | PK | SK | Projection | Purpose |
|-----|----|----|------------|---------|
| GSI1 | `GSI1PK` = `PAT#{patientId}` | `GSI1SK` = `DATE#{admissionDate}` | ALL | Encounters by patient |
| GSI2 | `GSI2PK` = `DOC#{consultantLogin}#UNIT#{unitCode}` | `GSI2SK` = `DATE#{admissionDate}` | ALL | Encounters by doctor |
| GSI3 | `GSI3PK` = `UNIT#{unitCode}#STATUS#{status}` | `GSI3SK` = `WARD#{wardSort}#TIME#{lastMsgTime}` | ALL | Active/discharged by unit |

### Attributes (METADATA item)

| Attribute | Type | Description |
|-----------|------|-------------|
| encounterNumber | S | Unique encounter ID |
| patientId | S | Patient reference |
| mrn | S | MRN (denormalized) |
| patientName | S | Patient name (denormalized) |
| gender | S | Gender (denormalized) |
| dateOfBirth | S | DOB (denormalized) |
| encounterClass | S | INPATIENT / OPD / EMERGENCY |
| status | S | ACTIVE / DISCHARGED / MARK_FOR_DISCHARGE / MARK_DEAD / ABSCONDED |
| consultantLogin | S | Primary consultant login |
| consultantName | S | Primary consultant name |
| consultantShortName | S | 3-char abbreviation |
| attendingConsultantLogin | S | Current attending login |
| attendingConsultantName | S | Current attending name |
| department | S | Department name |
| unitCode | S | Unit code |
| unitName | S | Unit display name |
| hscId | N | Healthcare Service Center ID |
| location | S | Bed location |
| wardCapability | S | ICU / GENERAL |
| wardSort | N | Sort priority (0=ICU, 1=General) |
| admissionDate | S | Admission timestamp |
| admissionNumber | S | Admission number |
| admissionReason | S | Chief complaint |
| admissionCategory | S | Category |
| visitType | S | NEW / FOLLOW-UP / EMERGENCY / DC (Daycare) |
| procedureDate | S | Scheduled procedure date |
| riskScore | S | Clinical risk score |
| comorbidities | S | Comma-separated conditions |
| weight | S | Patient weight |
| mlc | BOOL | Medico-Legal Case flag |
| pinFlag | N | Pin priority (0/1) |
| pinOrder | N | Pin sort order |
| unreadMsgCount | N | Unread message count |
| dischargeIntimation | S | true/false |
| ipActivityAction | S | MARK_DEAD / MARK_FOR_DISCHARGE / ABSCONDED |
| lastMsgTime | S | Last message timestamp |
| lastSyncTime | S | Last data sync time |
| expectedDischargeDate | S | Expected discharge |
| tariffClass | S | Tariff classification |
| acceptingConsultantLogin | S | Handover accepting login |
| acceptingConsultantName | S | Handover accepting name |
| consultantHandoverStatus | S | REQUESTED / ACCEPTED / REJECTED |

### Attributes (ADMISSION item)

| Attribute | Type | Description |
|-----------|------|-------------|
| admissionNumber | S | Admission number |
| visitType | S | Visit type |
| department | S | Department |
| primaryConsultant | M | Consultant details map |
| supportingConsultants | L | List of supporting consultants |
| admissionDate | S | Admission timestamp |
| expectedDischargeDate | S | Expected discharge |
| ward | M | Ward/HSC details |
| bedNumber | S | Bed number |
| reasonForAdmission | S | Reason |
| triage | S | Triage level |
| medicoLegalCase | BOOL | MLC flag |
| chargeClass | S | Charge class |

---

## Table 4: MedicationOrderTable

Medication orders, reconciliation, favorites, and drug catalog.

### Keys

| Key | Attribute | Pattern | Example |
|-----|-----------|---------|---------|
| PK | `PK` | `ENC#{encounterNumber}` or `FAV#{login}` or `CATALOG#DRUG` | `ENC#EN-2026-00145` |
| SK | `SK` | `MED#{medicationId}` or `RECON#{reconId}` or `#{drugName}` | `MED#MED-001` |

### GSIs

| GSI | PK | SK | Projection | Purpose |
|-----|----|----|------------|---------|
| GSI1 | `GSI1PK` = `PAT#{mrn}` | `GSI1SK` = `STATUS#{status}#MED#{medicationId}` | ALL | Meds by patient & status |
| GSI2 | `GSI2PK` = `ENC#{encounterNumber}#STATUS#{status}` | `GSI2SK` = `DATE#{prescriptionDate}` | KEYS_ONLY | Meds by encounter & status |

### Attributes (MED item)

| Attribute | Type | Description |
|-----------|------|-------------|
| medicationId | S | Unique medication order ID |
| encounterNumber | S | Encounter reference |
| patientMrn | S | Patient MRN (denormalized) |
| patientName | S | Patient name (denormalized) |
| status | S | ADDED/ORDERED/PENDING/DISPENSED/ISSUED/CLOSED/CANCELLED |
| medication | M | { code, name, brand (BOOL), drugForm } |
| daywiseDosage | M | { morning, afternoon, evening, night, unit } |
| drugFrequency | M | { id, code, name, frequency, periodUnit } |
| duration | N | Duration value |
| durationUnit | S | DAYS / WEEKS / MONTHS |
| quantity | N | Calculated quantity |
| route | S | Oral / IV / IM / etc. |
| foodInstruction | S | After Food / Before Food |
| patientInstruction | S | Free text instruction |
| prescriptionDate | S | YYYY-MM-DD |
| isDischargeMedication | BOOL | Discharge med flag |
| substitution | M | { allowed: BOOL } |
| orderedBy | M | { login, displayName } |
| createdOn | S | Creation timestamp |
| modifiedOn | S | Last modification |
| documentNumber | S | Associated document number |
| referenceNumber | S | Reference number |

### Attributes (CATALOG item -- drug master)

| Attribute | Type | Description |
|-----------|------|-------------|
| drugCode | S | Drug code |
| drugName | S | Drug name |
| genericName | S | Generic name |
| drugForm | S | TABLET / CAPSULE / SYRUP / INJECTION |
| medType | S | BRAND / GENERIC |
| defaultDosage | M | Default dosage map |
| defaultRoute | S | Default route |
| monographHtml | S | Drug monograph HTML |

---

## Table 5: LabInvestigationTable

Lab results, investigation orders, and investigation catalog.

### Keys

| Key | Attribute | Pattern | Example |
|-----|-----------|---------|---------|
| PK | `PK` | `ENC#{encounterNumber}` or `FAV#{login}` or `CATALOG#INV` | `ENC#EN-2026-00145` |
| SK | `SK` | `ORDER#{orderCode}` or `RESULT#{code}##{timestamp}` or `#{serviceName}` | `RESULT#CBC#2026-04-23T10:00:00Z` |

### GSIs

| GSI | PK | SK | Projection | Purpose |
|-----|----|----|------------|---------|
| GSI1 | `GSI1PK` = `PAT#{mrn}` | `GSI1SK` = `DATE#{resultDate}#RESULT#{code}` | ALL | Results by patient |

### Attributes (ORDER item)

| Attribute | Type | Description |
|-----------|------|-------------|
| orderCode | S | Service code |
| orderName | S | Service name |
| serviceType | S | Service type code |
| status | S | ADDED/ORDERED/INPROGRESS/REPORT_READY/PROCESSED/CANCELLED |
| priority | S | NORMAL / URGENT |
| instructions | S | 0-250 chars |
| orderDate | S | ISO datetime |
| orderedBy | M | { login, displayName } |
| encounterNumber | S | Encounter reference |
| patientMrn | S | Patient MRN |
| patientName | S | Patient name |
| isProfile | BOOL | Profile/panel flag |
| documentNumber | S | Document number |

### Attributes (RESULT item)

| Attribute | Type | Description |
|-----------|------|-------------|
| resultCode | S | Investigation code |
| resultName | S | Investigation name |
| displayName | S | Display name |
| shortName | S | Short name |
| value | S | Result value |
| resultType | S | GENERAL / PARAMETER |
| unit | S | Unit of measure |
| referenceRange | S | "min - max" |
| abnormalFlag | S | N/H/L/PH/PL/AH/AL |
| reportHoldStatus | S | Y/N |
| orderDate | S | Order date |
| resultDate | S | Result date |
| parameters | L | List of { name, value, unit, referenceRange, abnormalFlag } |
| reports | L | List of { reportType, documentName, extension } |
| encounterNumber | S | Encounter reference |
| patientMrn | S | Patient MRN |

---

## Table 6: ClinicalDocumentTable

Progress notes, discharge summaries, initial assessments, checklists, operation notes, cross-consultations, handovers, incident reports, and macros.

### Keys

| Key | Attribute | Pattern | Example |
|-----|-----------|---------|---------|
| PK | `PK` | `ENC#{encounterNumber}` or `MACRO#{userLogin}` | `ENC#EN-2026-00145` |
| SK | `SK` | `DOC#{type}#{docNumber}` or variants | `DOC#PN#PN-2026-001` |

### SK Patterns by Document Type

| Document Type | SK Pattern | Example |
|--------------|------------|---------|
| Progress Note | `DOC#PN#{documentNumber}` | `DOC#PN#PN-2026-001` |
| Discharge Summary | `DOC#DS#{documentNumber}` | `DOC#DS#DS-2026-001` |
| Initial Assessment | `DOC#IA#{documentNumber}` | `DOC#IA#IA-2026-001` |
| IA Widget Data | `DOC#IA#{docNo}#WGT#{widgetKey}` | `DOC#IA#IA-001#WGT#allergy` |
| Checklist | `DOC#CK#{checklistNumber}` | `DOC#CK#CK-2026-001` |
| Operation Note | `DOC#OP#{documentNumber}` | `DOC#OP#OP-2026-001` |
| Cross-Consultation | `DOC#CC#{documentNumber}` | `DOC#CC#CC-2026-001` |
| Handover Request | `DOC#HO#{timestamp}` | `DOC#HO#2026-04-23T10:00:00Z` |
| Incident Report | `DOC#IR#{timestamp}` | `DOC#IR#2026-04-23T10:00:00Z` |
| Macro | `TYPE#{widgetType}##{macroId}` | `TYPE#progress-notes#MAC-001` |

### GSIs

| GSI | PK | SK | Projection | Purpose |
|-----|----|----|------------|---------|
| GSI1 (sparse) | `GSI1PK` = `PENDING#{action}#{userId}` | `GSI1SK` = `DATE#{createdDate}` | ALL | Pending actions for user |
| GSI2 | `GSI2PK` = `PAT#{mrn}` | `GSI2SK` = `TYPE#{docType}#DATE#{createdDate}` | ALL | Docs by patient |

### GSI1 Sparse Index Values

Only items with pending actions have GSI1PK populated:

| Action | GSI1PK Pattern | Items Included |
|--------|---------------|----------------|
| PN Acknowledgment | `PENDING#ACK#{consultantLogin}` | Progress notes awaiting acknowledgment |
| DS Sign-off | `PENDING#SIGNOFF#{unitCode}` | Discharge summaries pending sign-off |
| DS Review | `PENDING#REVIEW#{reviewerLogin}` | DS pending review by specific reviewer |
| IA Review | `PENDING#IAREVIEW#{unitCode}` | Initial assessments pending review |
| CK Approval | `PENDING#CKAPPROVAL#{unitCode}` | Checklists pending approval |
| Handover | `PENDING#HANDOVER#{acceptingLogin}` | Handover requests pending acceptance |

### Attributes (Progress Note)

| Attribute | Type | Description |
|-----------|------|-------------|
| documentNumber | S | Unique document number |
| documentType | S | `PROGRESS_NOTE` |
| encounterNumber | S | Encounter reference |
| patientMrn | S | Patient MRN |
| patientName | S | Patient name |
| text | S | Rich text content (HTML) |
| sourceDepartment | M | { name, code } |
| status | S | DRAFT / SUBMITTED / ACKNOWLEDGED |
| submittedBy | S | Submitter login |
| submittedByName | S | Submitter display name |
| submittedDate | S | Submission timestamp |
| acknowledgedBy | M | { login, displayName, timestamp } |
| pad | N | Post-Admission Days |
| ppd | N | Previous Progress Days |
| createdOn | S | Creation timestamp |
| createdBy | M | { login, displayName } |
| vitals | L | Associated vitals data |
| medications | L | Associated medication references |
| investigations | L | Associated investigation references |
| crossConsultations | L | Associated CC references |

### Attributes (Discharge Summary)

| Attribute | Type | Description |
|-----------|------|-------------|
| documentNumber | S | Unique document number |
| documentType | S | `DISCHARGE_SUMMARY` |
| status | S | NEW/DRAFT/SENT_FOR_REVIEW/UNDER_REVIEW/AMENDMENT/SIGN_OFF/COMPLETE |
| admissionNumber | S | Admission number |
| patientDetails | M | { mrn, name, gender, birthDate } |
| admissionDetails | M | { admissionDate, admissionNumber } |
| admissionReason | S | Section: admission reason (HTML) |
| chiefComplaint | S | Section: chief complaint (HTML) |
| medicalHistory | S | Section: medical history (HTML) |
| surgicalHistory | S | Section: surgical history (HTML) |
| familyHistory | S | Section: family history (HTML) |
| socialHistory | S | Section: social history (HTML) |
| pastMedicationHistory | S | Section: past medications (HTML) |
| vitalSign | S | Section: vitals (HTML) |
| allergy | S | Section: allergies (HTML) |
| generalExamination | S | Section: general exam (HTML) |
| systemicExamination | S | Section: systemic exam (HTML) |
| investigationResults | S | Section: investigation results (HTML) |
| provisionalDiagnosis | S | Section: provisional diagnosis (HTML) |
| finalDiagnosis | S | Section: final diagnosis (HTML) |
| medicationAtDischarge | S | Section: discharge medications (HTML) |
| crossConsultation | S | Section: cross-consultation (HTML) |
| conditionAtDischarge | S | Section: condition at discharge (HTML) |
| dischargeAdvice | S | Section: discharge advice (HTML) |
| dietaryAdvice | S | Section: dietary advice (HTML) |
| therapyAdvice | S | Section: therapy advice (HTML) |
| operationAndProcedure | S | Section: operations (HTML) |
| followUp | S | Section: follow-up (HTML) |
| causeOfDeath | S | Section: cause of death (HTML) |
| activeMedication | S | Section: active medications (HTML) |
| comorbidities | S | Section: comorbidities (HTML) |
| comments | L | List of { commentedBy, commentedOn, comment } |
| amended | BOOL | Amendment flag |
| amendDetails | L | List of { amendedDate, amendedBy, reasons } |
| createdOn | S | Creation timestamp |
| createdBy | M | { login, displayName } |
| modifiedOn | S | Last modification |

### Attributes (Checklist)

| Attribute | Type | Description |
|-----------|------|-------------|
| checklistNumber | S | Checklist number |
| documentType | S | `CHECKLIST` |
| code | S | Checklist template code |
| name | S | Checklist name |
| type | S | Checklist type |
| applicableFor | S | Applicability |
| responseType | M | { code: "yes/no" or "tick", displayName } |
| sequentialAnswering | BOOL | Sequential mode |
| witness | S | MANDATORY / OPTIONAL / null |
| questions | L | List of { question, displayOrder, mandatory, defaultResponse, enableRemarks, answer, remarks } |
| status | S | PENDING/DRAFT/PENDING_APPROVAL/COMPLETED/REJECTED |
| consultant | M | { displayName, login, employeeNo } |
| patient | M | { mrn, name, birthDate, gender, weight } |
| encounter | M | { documentNumber } |
| submittedBy | M | { login, displayName, employeeNo } |
| submittedOn | S | Submission timestamp |
| witnessedBy | M | Witness details |
| witnessedOn | S | Witness timestamp |
| rejectReason | S | Rejection reason |
| remarks | S | Remarks |
| createdBy | M | Creator details |
| createdOn | S | Creation timestamp |

---

## Table 7: VitalsTable

Time-series vital signs data with daily partitioning.

### Keys

| Key | Attribute | Pattern | Example |
|-----|-----------|---------|---------|
| PK | `PK` | `ENC#{encounterNumber}#DATE#{YYYY-MM-DD}` | `ENC#EN-2026-00145#DATE#2026-04-23` |
| SK | `SK` | `TIME#{HH:mm:ss}` | `TIME#10:30:00` |

### GSIs

| GSI | PK | SK | Projection | Purpose |
|-----|----|----|------------|---------|
| GSI1 | `GSI1PK` = `PAT#{mrn}` | `GSI1SK` = `DATE#{date}#TIME#{time}` | ALL | Vitals by patient |

### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| encounterNumber | S | Encounter reference |
| patientMrn | S | Patient MRN |
| documentNumber | S | Associated document number |
| temperature | N | Temperature (Fahrenheit) |
| pulse | N | Heart rate (bpm) |
| respiratoryRate | N | Respiratory rate |
| systolicBP | N | Systolic blood pressure |
| diastolicBP | N | Diastolic blood pressure |
| spO2 | N | Oxygen saturation (%) |
| weight | N | Weight (kg) |
| height | N | Height (cm) |
| bmi | N | BMI |
| painScore | N | Pain score (0-10) |
| bloodSugar | N | Blood sugar level |
| gcsScore | N | Glasgow Coma Scale |
| urinOutput | N | Urine output (ml) |
| customVitals | M | Map of custom vital parameters |
| recordedBy | M | { login, displayName } |
| recordedAt | S | Recording timestamp |
| source | S | MANUAL / DEVICE / IMPORT |
| ttl | N | TTL epoch (2 years from recording) |

### TTL

- Attribute: `ttl`
- Value: Unix epoch timestamp 2 years after recording
- Rationale: Vitals older than 2 years archived to S3 via DynamoDB Streams

---

## Table 8: CareTeamTable

Care team membership using adjacency list pattern.

### Keys

| Key | Attribute | Pattern | Example |
|-----|-----------|---------|---------|
| PK | `PK` | `PAT#{mrn}#ENC#{enc}` or `TMPL#{templateId}` | `PAT#MRN001#ENC#EN-001` |
| SK | `SK` | `METADATA` or `MEMBER#{userId}` | `MEMBER#dr-sharma-01` |

### GSIs

| GSI | PK | SK | Projection | Purpose |
|-----|----|----|------------|---------|
| GSI1 | `GSI1PK` = `USER#{userId}` | `GSI1SK` = `PAT#{mrn}#ENC#{enc}` | ALL | Teams user belongs to |
| GSI2 | `GSI2PK` = `TMPL#PC#{consultantLogin}` or `TMPL#HSC#{hscCode}` | `GSI2SK` = `UNIT#{unitCode}` | ALL | Templates by type |

### Attributes (METADATA item)

| Attribute | Type | Description |
|-----------|------|-------------|
| patientMrn | S | Patient MRN |
| encounterNumber | S | Encounter number |
| primaryConsultant | M | { login, displayName, employeeNo } |
| mode | S | PRIMARY_CONSULTANT / HSC |
| unit | M | { id, code, name } |
| hsc | M | { code, name } (for HSC mode) |
| active | BOOL | Team active status |
| createdOn | S | Creation timestamp |
| createdBy | M | Creator details |
| modifiedOn | S | Last modification |
| modifiedBy | M | Modifier details |

### Attributes (MEMBER item)

| Attribute | Type | Description |
|-----------|------|-------------|
| userId | S | User ID |
| userLogin | S | User login |
| userName | S | Display name |
| category | S | DOCTOR / NURSE / PARAMEDICS |
| isAdmin | BOOL | Admin flag |
| active | BOOL | Member active status |
| mobileNo | S | Phone number |
| employeeNo | S | Employee number |
| addedOn | S | When added |

---

## Table 9: PatientMessageTable

Clinical context messages (AADI patient chat).

### Keys

| Key | Attribute | Pattern | Example |
|-----|-----------|---------|---------|
| PK | `PK` | `PAT#{mrn}#ENC#{encounterNumber}` | `PAT#MRN001#ENC#EN-001` |
| SK | `SK` | `MSG#{timestamp}##{messageId}` | `MSG#2026-04-23T10:30:00Z#MSG-001` |

### GSIs

| GSI | PK | SK | Projection | Purpose |
|-----|----|----|------------|---------|
| GSI1 (sparse) | `GSI1PK` = `PENDING#MSG#{senderLogin}` | `GSI1SK` = `TIME#{timestamp}` | ALL | Offline queued messages |

### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| messageId | S | Unique message ID |
| patientInfoId | N | Patient info FK |
| mrn | S | Patient MRN |
| patientName | S | Patient name |
| category | S | LAB_RESULT/RAD_RESULT/DISCHARGE_SUMMARY/CHAT/INVESTIGATION_ORDER/MEDICATION_ORDER/ADMISSION_MESSAGE/PROGRESS_NOTES/CROSS_CONSULTATION/SYSTEM_REMINDER/INVESTIGATION_REPORT/BED_TRANSFER/VITALS/ASSESSMENT_FORM/DISCHARGE_INTIMATION/INITIAL_ASSESSMENT |
| subCategory | S | AUDIO/TEXT/VIDEO/IMAGE/PDF/DOC/OTHERS |
| contentType | S | TEXT / JSON |
| content | S | Serialized payload |
| senderLogin | S | Sender login |
| senderName | S | Sender display name |
| sentTime | S | Sent timestamp |
| receivedTime | S | Received timestamp |
| actionId | S | Dedup key |
| messageStatus | S | NOT_SENT / SUCCESS / FAILURE / IN_PROGRESS |
| read | N | 0=unread, 1=read |
| msgStarred | BOOL | Starred flag |
| msgDeleted | BOOL | Soft delete flag |
| acsMessageId | S | ACS message ID |
| parentMessageId | S | Reply-to message ID |
| action | S | SAVE / DELETE / PUBLISH |
| context | S | PATIENT_INFO / PATIENT_MESSAGE / CARE_TEAM / DIRECT_MESSAGE |

---

## Table 10: ChatTable

ACS-powered chat conversations and messages (AHAM).

### Keys

| Key | Attribute | Pattern | Example |
|-----|-----------|---------|---------|
| PK | `PK` | `THREAD#{threadId}` | `THREAD#th-abc-123` |
| SK | `SK` | `METADATA` or `MSG#{timestamp}##{messageId}` or `PART#{userId}` | `METADATA` |

### GSIs

| GSI | PK | SK | Projection | Purpose |
|-----|----|----|------------|---------|
| GSI1 | `GSI1PK` = `ASSIGNED#{userId}` | `GSI1SK` = `LAST_MSG#{timestamp}` | ALL | My conversations |
| GSI2 | `GSI2PK` = `UNIT#{unitCode}` | `GSI2SK` = `LAST_MSG#{timestamp}` | ALL | All conversations by unit |
| GSI3 | `GSI3PK` = `PAT#{patientId}` | `GSI3SK` = `THREAD#{threadId}` | KEYS_ONLY | Conversations by patient |

### Attributes (METADATA item)

| Attribute | Type | Description |
|-----------|------|-------------|
| threadId | S | ACS thread ID |
| conversationId | S | Internal conversation ID |
| topic | S | Thread topic/title |
| patientId | S | Associated patient |
| patientName | S | Patient display name |
| uhid | S | Patient UHID |
| assignedTo | S | Current assignee user ID |
| assignedToName | S | Assignee display name |
| assignType | S | ASSIGN / DELEGATE / REASSIGN |
| status | S | Conversation status |
| unitCode | S | Unit code |
| lastMessage | S | Last message preview |
| lastMessageOn | S | Last message timestamp |
| unreadCount | N | Unread count |
| createdOn | S | Creation timestamp |

### Attributes (MSG item)

| Attribute | Type | Description |
|-----------|------|-------------|
| messageId | S | Message ID |
| senderId | S | Sender ACS user ID |
| senderDisplayName | S | Sender name |
| content | S | Message body |
| type | S | text / attachment / system |
| createdOn | S | Timestamp |
| deletedOn | S | Deletion timestamp (null if active) |
| metadata | M | Custom metadata map |
| attachments | L | List of { attachmentId, fileName, fileUrl, mimeType, fileSize } |
| ttl | N | TTL epoch (1 year) |

---

## Table 11: VideoConsultationTable

Video consultation sessions and appointments.

### Keys

| Key | Attribute | Pattern | Example |
|-----|-----------|---------|---------|
| PK | `PK` | `APT#{appointmentNumber}` | `APT#APT-2026-001` |
| SK | `SK` | `METADATA` or `CHAT#{timestamp}##{msgId}` or `AUDIT#{timestamp}` | `METADATA` |

### GSIs

| GSI | PK | SK | Projection | Purpose |
|-----|----|----|------------|---------|
| GSI1 | `GSI1PK` = `DOC#{doctorLogin}` | `GSI1SK` = `DATE#{date}#APT#{aptNo}` | ALL | Appointments by doctor |
| GSI2 | `GSI2PK` = `PAT#{mrn}` | `GSI2SK` = `DATE#{date}` | ALL | Appointments by patient |

### Attributes (METADATA item)

| Attribute | Type | Description |
|-----------|------|-------------|
| appointmentNumber | S | Unique appointment ID |
| encounterNumber | S | Associated encounter |
| patientMrn | S | Patient MRN |
| patientName | S | Patient name |
| doctorLogin | S | Doctor login |
| doctorName | S | Doctor display name |
| consultationStatus | S | SCHEDULED/BOOKED/ARRIVED/IN_PROGRESS/DONE/COMPLETED/CANCELLED/NO_SHOW |
| appointmentDate | S | Date |
| appointmentTime | S | Time |
| unitCode | S | Unit code |
| departmentCode | S | Department |
| agoraAppId | S | Agora RTC app ID |
| agoraToken | S | Agora token |
| clientInfo | M | { userType, applicationType, operatingSystem, browser } |
| quickReplies | L | Pre-set templates |
| auditStart | S | VC audit start time |
| auditEnd | S | VC audit end time |

---

## Table 12: TaskWorkflowTable

Clinical (AADI) and billing (AHAM) tasks.

### Keys

| Key | Attribute | Pattern | Example |
|-----|-----------|---------|---------|
| PK | `PK` | `TASK#{taskId}` | `TASK#12345` |
| SK | `SK` | `METADATA` or `VARS` or `COMMENT#{timestamp}` | `METADATA` |

### GSIs

| GSI | PK | SK | Projection | Purpose |
|-----|----|----|------------|---------|
| GSI1 | `GSI1PK` = `ASSIGNEE#{userId}` | `GSI1SK` = `STATUS#{status}#CREATED#{timestamp}` | ALL | My tasks |
| GSI2 | `GSI2PK` = `UNIT#{unitCode}#STATUS#{status}` | `GSI2SK` = `TYPE#{taskName}#CREATED#{timestamp}` | ALL | Tasks by unit/status |

### Attributes (METADATA item)

| Attribute | Type | Description |
|-----------|------|-------------|
| taskId | N | jBPM task ID |
| taskName | S | Task type (13 AHAM + 6 AADI types) |
| taskStatus | S | OPEN / CLAIMED / IN_PROGRESS / DONE / CLOSED |
| processInstanceId | N | jBPM process instance |
| containerId | S | jBPM container |
| actualOwner | S | Claimed by user |
| createdBy | S | Task creator |
| createdOn | S | Creation timestamp |
| activationTime | S | Activation timestamp |
| priority | N | Task priority |
| processId | S | Process definition ID |
| description | S | Task description |
| subject | S | Task subject |
| documentNo | S | Linked document number |
| patientId | S | Linked patient |
| uhid | S | Patient UHID |
| unitCode | S | Unit code |
| taskSource | S | AADI / AHAM |
| ttl | N | TTL epoch (1 year for completed tasks) |

### AADI Task Types (6)

1. `PROGRESS-NOTES-ACKNOWLEDGEMENT`
2. `DISCHARGE_SUMMARY_CREATION`
3. `DISCHARGE_SUMMARY_SIGNOFF`
4. `INITIAL_ASSESSMENT_REVIEW`
5. `CHECKLIST_TASK_APPROVAL`
6. `CROSS_CONSULTATION`

### AHAM Task Types (13)

1. `Invoice Generation Approval`
2. `Discount Approval`
3. `Receipt Approval`
4. `Receipt Cancellation`
5. `Refund Approval`
6. `Reversal Invoice Approval`
7. `Retrospect Invoice Initiation`
8. `Retrospect Invoice Approval`
9. `UnBilled Invoice Approval`
10. `HighValue MedicationRequest Approval`
11. `Authorization Approval`
12. `Mandatory Brand Approval`
13. `Invoice Cancellation`

---

## Table 13: BillingTable

Invoices, receipts, refunds, unbilled documents, authorizations.

### Keys

| Key | Attribute | Pattern | Example |
|-----|-----------|---------|---------|
| PK | `PK` | `PAT#{patientId}` | `PAT#P-100234` |
| SK | `SK` | `INV#{invoiceNo}` or `INV#{inv}#REC#{rec}` or `INV#{inv}#REC#{rec}#REF#{ref}` or `UNBILL#{docNo}` | `INV#INV-2026-001` |

### GSIs

| GSI | PK | SK | Projection | Purpose |
|-----|----|----|------------|---------|
| GSI1 | `GSI1PK` = `UNIT#{unitCode}#STATUS#{status}` | `GSI1SK` = `DATE#{invoiceDate}` | ALL | Invoices by unit/status |
| GSI2 | `GSI2PK` = `INVNO#{invoiceNo}` | `GSI2SK` = `PAT#{patientId}` | ALL | Lookup by invoice number |

### Attributes (Invoice)

| Attribute | Type | Description |
|-----------|------|-------------|
| invoiceId | S | Internal invoice ID |
| invoiceNo | S | Display invoice number |
| patientId | S | Patient reference |
| uhid | S | Patient UHID |
| patientName | S | Patient name |
| encounterNo | S | Encounter number |
| unitCode | S | Hospital unit |
| departmentCode | S | Department |
| invoiceDate | S | Invoice date |
| invoiceStatus | S | Status |
| invoiceType | S | Type classification |
| grossAmount | N | Gross total |
| netAmount | N | Net amount |
| taxAmount | N | Tax amount |
| patientPayable | N | Patient payable |
| sponsorAmount | N | Sponsor contribution |
| totalAmount | N | Final total |
| patientDiscount | N | Patient discount |
| sponsorDiscount | N | Sponsor discount |
| discretionaryDiscount | N | Discretionary discount |
| nonDiscretionaryDiscount | N | Non-discretionary discount |
| planDiscountAmount | N | Plan discount |
| createdBy | S | Creator |
| createdAt | S | Creation timestamp |
| approvedBy | S | Approver |
| approvedAt | S | Approval timestamp |
| remarks | S | Remarks |

### Attributes (Receipt -- nested under invoice)

| Attribute | Type | Description |
|-----------|------|-------------|
| receiptId | S | Receipt ID |
| receiptNo | S | Display receipt number |
| receiptAmount | N | Receipt amount |
| paymentMode | S | Payment mode |
| receiptDate | S | Receipt date |
| receiptStatus | S | Status |
| cancellationAmount | N | If cancelled |
| reasonForCancellation | S | Cancellation reason |

### Attributes (Refund -- nested under receipt)

| Attribute | Type | Description |
|-----------|------|-------------|
| refundId | S | Refund ID |
| refundNo | S | Display refund number |
| refundAmount | N | Refund amount |
| refundMode | S | Refund mode |
| refundDate | S | Refund date |
| refundStatus | S | Status |
| reasonForRefund | S | Refund reason |

---

## Table 14: CampOutreachTable

Outreach camps with adjacency list for camp-patient relationships.

### Keys

| Key | Attribute | Pattern | Example |
|-----|-----------|---------|---------|
| PK | `PK` | `CAMP#{campId}` | `CAMP#CMP-2026-001` |
| SK | `SK` | `METADATA` or `PAT#{patientId}` or `COORD#{coordId}` or `TEMP#{tempId}` or `WPAT#{wpatId}` | `METADATA` |

### GSIs

| GSI | PK | SK | Projection | Purpose |
|-----|----|----|------------|---------|
| GSI1 | `GSI1PK` = `UNIT#{unitCode}#STATUS#{status}` | `GSI1SK` = `DATE#{startDate}` | ALL | Camps by unit/status |
| GSI2 | `GSI2PK` = `PAT#{patientId}` | `GSI2SK` = `CAMP#{campId}` | ALL | Camps for patient (inverted) |

### Attributes (METADATA item)

| Attribute | Type | Description |
|-----------|------|-------------|
| campId | S | Camp ID |
| campName | S | Camp name |
| campCode | S | Short code |
| campType | S | Camp type |
| status | S | NOT_STARTED / IN_PROGRESS / DONE / CANCELLED |
| startDate | S | Camp start date |
| endDate | S | Camp end date |
| location | S | Location description |
| address | M | Structured address |
| organizationId | S | Organization |
| unitCode | S | Hospital unit |
| totalPatients | N | Patient count |
| createdBy | S | Creator |
| createdAt | S | Creation timestamp |
| updatedAt | S | Last update |

### Attributes (PAT item -- camp patient registration)

| Attribute | Type | Description |
|-----------|------|-------------|
| campPatientId | S | Camp-patient link ID |
| patientId | S | Patient reference |
| uhid | S | UHID (null for temp) |
| tempId | S | Temp ID (pre-registration) |
| patientName | S | Patient name |
| mobileNumber | S | Phone |
| gender | S | Gender |
| age | M | { years, months, days } |
| registeredAt | S | Registration time |
| registeredBy | S | Registering user |
| registrationStatus | S | Status |
| consultationStatus | S | Consultation progress |
| notes | S | Camp-specific notes |

---

## Table 15: DocumentStorageTable

Patient document metadata (actual files in S3).

### Keys

| Key | Attribute | Pattern | Example |
|-----|-----------|---------|---------|
| PK | `PK` | `PAT#{patientId}` | `PAT#P-100234` |
| SK | `SK` | `DOC#{documentId}` | `DOC#DOC-2026-001` |

### GSIs

| GSI | PK | SK | Projection | Purpose |
|-----|----|----|------------|---------|
| GSI1 | `GSI1PK` = `TAG#{tag}` | `GSI1SK` = `PAT#{patientId}#DOC#{docId}` | KEYS_ONLY | Search by tag |

### Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| documentId | S | Unique document ID |
| patientId | S | Owning patient |
| documentType | S | Type classification |
| fileName | S | Original file name |
| fileUrl | S | S3 URL |
| mimeType | S | MIME type |
| fileSize | N | Size in bytes |
| uploadedAt | S | Upload timestamp |
| uploadedBy | S | Uploader user ID |
| description | S | Description |
| tags | SS | String set of tags |
| s3Key | S | S3 object key |
| s3Bucket | S | S3 bucket name |

---

## Table 16: SystemConfigTable

System configuration, geography master data, FCM tokens, audit events.

### Keys

| Key | Attribute | Pattern | Example |
|-----|-----------|---------|---------|
| PK | `PK` | Various prefixes | `CONFIG#APP` |
| SK | `SK` | Various | `LATEST` |

### Key Patterns

| Category | PK | SK | Description |
|----------|----|----|-------------|
| App Config | `CONFIG#APP` | `LATEST` | Current app configuration |
| Downtime | `CONFIG#DOWNTIME` | `LATEST` | Server downtime info |
| Organization | `CONFIG#ORG` | `ORG#{orgId}` | Organization record |
| Org Units | `CONFIG#ORG##{orgId}` | `UNIT#{unitCode}` | Units within org |
| FAQ | `CONFIG#FAQ` | `CAT#{categoryId}` | FAQ category |
| Country | `GEO#COUNTRY` | `#{countryCode}` | Country record |
| State | `GEO#STATE` | `#{countryCode}##{stateCode}` | State record |
| District | `GEO#DISTRICT` | `#{countryCode}##{stateCode}##{districtCode}` | District record |
| City | `GEO#CITY` | `#{stateCode}##{cityCode}` | City record |
| Zipcode | `GEO#ZIPCODE` | `#{zipcode}` | Zipcode record |
| FCM | `FCM#USER#{userId}` | `DEV#{deviceId}` | FCM token |
| Audit | `AUDIT##{YYYY-MM-DD}` | `#{timestamp}##{eventId}` | Audit event |

### Attributes (Config)

| Attribute | Type | Description |
|-----------|------|-------------|
| configId | S | Config identifier |
| appVersion | S | Minimum app version |
| forceUpdate | BOOL | Force update flag |
| maintenanceMode | BOOL | Maintenance flag |
| maintenanceMessage | S | Maintenance message |
| features | M | Feature toggle map |
| apiBaseUrl | S | API base URL |
| acsEndpoint | S | ACS endpoint |
| chatEnabled | BOOL | Chat feature flag |
| campEnabled | BOOL | Camp feature flag |
| lastUpdated | S | Config update timestamp |

### Attributes (Geography)

| Attribute | Type | Description |
|-----------|------|-------------|
| code | S | Entity code |
| name | S | Entity name |
| parentCode | S | Parent entity code |
| isActive | BOOL | Active flag |

### Attributes (Audit Event)

| Attribute | Type | Description |
|-----------|------|-------------|
| eventId | S | Unique event ID |
| eventDate | S | Event timestamp |
| logLevel | S | Log level |
| eventCategory | S | Category |
| eventAction | S | Action |
| requestUrl | S | Request URL |
| requestMethod | S | HTTP method |
| responseStatus | N | Response status |
| errorMessage | S | Error message |
| serviceName | S | Service name |
| pageName | S | Page name |
| ttl | N | TTL epoch (90 days) |
