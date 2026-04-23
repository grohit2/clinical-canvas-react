# DynamoDB Data Model -- Clinical Canvas Healthcare Platform

> Formal data model specification for AWS DynamoDB MCP tooling
> Version: 2.0 (Iteration 2) | Date: 2026-04-23

---

## Tables

### Table 1: UserStaffTable

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| PK | S | HASH | `USER#{userId}` |
| SK | S | RANGE | `PROFILE` or `FCM#{deviceId}` or `PREF` or `SCHEDULE#{date}` |
| GSI1PK | S | GSI1-HASH | `LOGIN#{login}` |
| GSI1SK | S | GSI1-RANGE | `USER#{userId}` |
| GSI2PK | S | GSI2-HASH | `UNIT#{unitCode}` |
| GSI2SK | S | GSI2-RANGE | `ROLE#{role}#USER#{userId}` |
| GSI3PK | S | GSI3-HASH | `ORG#{orgId}` |
| GSI3SK | S | GSI3-RANGE | `UNIT#{unitCode}#USER#{userId}` |
| userId | S | - | Unique user ID |
| login | S | - | Login username |
| displayName | S | - | Full display name |
| firstName | S | - | First name |
| lastName | S | - | Last name |
| email | S | - | Email address |
| mobileNumber | S | - | Phone number |
| roles | L | - | List: DOCTOR, NURSE, PARAMEDICS, COORDINATOR, ADMIN |
| department | S | - | Department name |
| departmentCode | S | - | Department code |
| designation | S | - | Title/designation |
| specialization | S | - | Medical specialization (doctors) |
| qualifications | S | - | Qualifications string |
| unitCode | S | - | Primary unit code |
| organizationId | S | - | Organization ID |
| isActive | BOOL | - | Active status |
| photo | S | - | Photo URL |
| employeeNo | S | - | Employee number |
| passwordExpired | BOOL | - | Password expiry flag |
| accountLocked | BOOL | - | Account lock flag |
| lastLoginAt | S | - | Last login timestamp |
| createdAt | S | - | Creation timestamp |
| updatedAt | S | - | Last update timestamp |

#### SK=PREF (User Preferences)

| Attribute | Type | Description |
|-----------|------|-------------|
| notificationPreferences | M | Map of notification settings per category |
| locale | S | User locale (en, hi) |
| country | S | Country code |
| lastViewModule | S | Last viewed module route |
| sortPreference | S | Default sort preference |
| filterPreference | M | Saved filter state |

#### SK=SCHEDULE#{date} (Doctor Schedule -- doctors only)

| Attribute | Type | Description |
|-----------|------|-------------|
| consultationSlots | L | List of time slots |
| maxAppointments | N | Max appointments per day |
| isAvailable | BOOL | Availability flag |
| consultationFee | N | Consultation fee |

#### SK=FCM#{deviceId} (FCM Token)

| Attribute | Type | Description |
|-----------|------|-------------|
| fcmToken | S | Firebase Cloud Messaging token |
| deviceId | S | Device identifier |
| platform | S | android / ios |
| appVersion | S | App version |
| isActive | BOOL | Active status |
| lastUpdated | S | Update timestamp |

---

### Table 2: PatientTable

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| PK | S | HASH | `PAT#{patientId}` |
| SK | S | RANGE | `PROFILE` or `AADHAAR` or `LABEL#{labelId}` or `CONTACT#{contactId}` |
| GSI1PK | S | GSI1-HASH | `MRN#{mrn}` |
| GSI1SK | S | GSI1-RANGE | `PAT#{patientId}` |
| GSI2PK | S | GSI2-HASH | `UHID#{uhid}` |
| GSI2SK | S | GSI2-RANGE | `PAT#{patientId}` |
| GSI3PK | S | GSI3-HASH | `PHONE#{mobileNumber}` |
| GSI3SK | S | GSI3-RANGE | `PAT#{patientId}` |
| patientId | S | - | Unique patient ID |
| mrn | S | - | Medical Record Number (AADI) |
| uhid | S | - | Universal Health ID (AHAM) |
| firstName | S | - | First name |
| lastName | S | - | Last name |
| fullName | S | - | Display name |
| dateOfBirth | S | - | DOB (YYYY-MM-DD) |
| age | M | - | { years, months, days } |
| gender | S | - | M / F / O |
| mobileNumber | S | - | Primary phone |
| email | S | - | Email |
| address | M | - | { addressLine1, addressLine2, city, cityCode, district, districtCode, state, stateCode, country, countryCode, zipcode, landmark } |
| aadhaarNumber | S | - | Masked Aadhaar |
| patientType | S | - | GENERAL / EMERGENCY / CAMP / REFERRED |
| registrationDate | S | - | Registration timestamp |
| registrationSource | S | - | WALK_IN / OUTREACH / DIRECT |
| status | S | - | Active / Inactive |
| unitCode | S | - | Registration unit |
| organizationId | S | - | Organization |
| photo | S | - | Photo URL/base64 |
| bloodGroup | S | - | Blood group |
| maritalStatus | S | - | Marital status |
| nationality | S | - | Nationality |
| emergencyContactName | S | - | Emergency contact |
| emergencyContactNumber | S | - | Emergency phone |
| insuranceDetails | M | - | { provider, policyNumber, validUntil, coverageType } |
| weight | S | - | Weight (kg) |
| height | S | - | Height (cm) |
| allergiesSnapshot | L | - | List of known allergies (quick reference) |
| comorbidities | S | - | Comma-separated (C,H,D,K,L,T,P,S) |
| createdAt | S | - | Created timestamp |
| updatedAt | S | - | Updated timestamp |

#### SK=AADHAAR (Aadhaar KYC Verification)

| Attribute | Type | Description |
|-----------|------|-------------|
| aadhaarNumber | S | Masked Aadhaar number |
| nameOnAadhaar | S | Name as on Aadhaar |
| dobOnAadhaar | S | DOB from Aadhaar |
| genderOnAadhaar | S | Gender |
| addressOnAadhaar | S | Address |
| photoFromAadhaar | S | Photo (base64) |
| verified | BOOL | Verification success |
| verificationTimestamp | S | When verified |
| verificationSource | S | VERI5_DIGITAL |

#### SK=LABEL#{labelId} (Patient Labels/Attributes)

| Attribute | Type | Description |
|-----------|------|-------------|
| labelId | S | Label identifier |
| labelName | S | Label display text |
| labelColor | S | Badge color |
| createdBy | S | Who added the label |
| createdAt | S | When added |

#### SK=CONTACT#{contactId} (Emergency/Bystander Contacts)

| Attribute | Type | Description |
|-----------|------|-------------|
| contactName | S | Contact name |
| contactNumber | S | Phone number |
| relationship | S | Relationship to patient |
| isPrimary | BOOL | Primary contact flag |

---

### Table 3: EncounterTable

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| PK | S | HASH | `ENC#{encounterNumber}` |
| SK | S | RANGE | `METADATA` or `ADMISSION` or `TRANSFER#{timestamp}` or `RISK#{timestamp}` or `COMORBIDITY#{code}` |
| GSI1PK | S | GSI1-HASH | `PAT#{patientId}` |
| GSI1SK | S | GSI1-RANGE | `DATE#{admissionDate}` |
| GSI2PK | S | GSI2-HASH | `DOC#{consultantLogin}#UNIT#{unitCode}` |
| GSI2SK | S | GSI2-RANGE | `DATE#{admissionDate}` |
| GSI3PK | S | GSI3-HASH | `UNIT#{unitCode}#STATUS#{status}` |
| GSI3SK | S | GSI3-RANGE | `WARD#{wardSort}#TIME#{lastMsgTime}` |
| encounterNumber | S | - | Unique encounter ID |
| patientId | S | - | Patient reference |
| mrn | S | - | MRN (denormalized) |
| patientName | S | - | Patient name (denormalized) |
| gender | S | - | Gender (denormalized) |
| dateOfBirth | S | - | DOB (denormalized) |
| weight | S | - | Weight (denormalized) |
| encounterClass | S | - | INPATIENT / OPD / EMERGENCY |
| status | S | - | ACTIVE / DISCHARGED / MARK_FOR_DISCHARGE / MARK_DEAD / ABSCONDED |
| consultantLogin | S | - | Primary consultant login |
| consultantName | S | - | Primary consultant name |
| consultantShortName | S | - | 3-char abbreviation |
| attendingConsultantLogin | S | - | Current attending login |
| attendingConsultantName | S | - | Current attending name |
| department | S | - | Department |
| departmentCode | S | - | Department code |
| unitCode | S | - | Unit code |
| unitName | S | - | Unit name |
| hscId | N | - | Healthcare Service Center ID |
| hscName | S | - | HSC name |
| location | S | - | Bed location |
| wardCapability | S | - | ICU / GENERAL |
| wardSort | N | - | 0=ICU, 1=General |
| admissionDate | S | - | Admission timestamp |
| admissionNumber | S | - | Admission number |
| admissionReason | S | - | Chief complaint |
| admissionCategory | S | - | Category |
| visitType | S | - | NEW / FOLLOW-UP / EMERGENCY / DC |
| procedureDate | S | - | Scheduled procedure |
| riskScore | S | - | Latest risk score |
| comorbidities | S | - | Comma-separated |
| mlc | BOOL | - | Medico-Legal Case |
| pinFlag | N | - | Pin priority (0/1) |
| pinOrder | N | - | Pin sort order |
| unreadMsgCount | N | - | Unread messages |
| dischargeIntimation | S | - | true/false |
| dischargeDate | S | - | Actual discharge date |
| ipActivityAction | S | - | MARK_DEAD / MARK_FOR_DISCHARGE / ABSCONDED |
| lastMsgTime | S | - | Last message time |
| lastSyncTime | S | - | Last sync time |
| lastSeenDate | S | - | Last review date |
| expectedDischargeDate | S | - | Expected discharge |
| tariffClass | S | - | Tariff classification |
| chargeClass | S | - | Charge class |
| triage | S | - | Triage level |
| acceptingConsultantLogin | S | - | Handover accepting login |
| acceptingConsultantName | S | - | Handover accepting name |
| consultantHandoverStatus | S | - | REQUESTED / ACCEPTED / REJECTED |
| acsGroupId | S | - | ACS chat group |
| pmsViewer | N | - | PMS viewer access |
| supportingConsultants | L | - | List of supporting consultants |

#### SK=RISK#{timestamp} (Risk Score History)

| Attribute | Type | Description |
|-----------|------|-------------|
| riskScorePercentage | N | Risk percentage (0-100) |
| riskScoreValue | N | Raw risk score |
| refreshDatetime | S | When calculated |
| dataJson | L | List of { parameter_name, score, value } |
| aiPrediction | M | AI prediction details |
| losDay | N | Length of Stay prediction (days) |
| summary | S | Prediction explanation |
| observations | S | Clinical observations |

#### SK=COMORBIDITY#{code} (Individual Comorbidities)

| Attribute | Type | Description |
|-----------|------|-------------|
| code | S | Single-char code (C, H, D, K, L, T, P, S) |
| name | S | Full name (cancer, hypertension, diabetes...) |
| category | S | Category |
| shortName | S | Single-char abbreviation |
| active | BOOL | Active status |
| createdBy | M | { login, displayName } |
| createdOn | S | Creation timestamp |

---

### Table 4: MedicationOrderTable

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| PK | S | HASH | `ENC#{encounterNumber}` or `FAV#{login}` or `CATALOG#DRUG` |
| SK | S | RANGE | `MED#{medicationId}` or `RECON#{reconId}` or `ADMIN#MED#{medId}#TIME#{timestamp}` or `#{drugNameNormalized}` |
| GSI1PK | S | GSI1-HASH | `PAT#{mrn}` |
| GSI1SK | S | GSI1-RANGE | `STATUS#{status}#MED#{medicationId}` |
| GSI2PK | S | GSI2-HASH | `ENC#{encounterNumber}#STATUS#{status}` |
| GSI2SK | S | GSI2-RANGE | `DATE#{prescriptionDate}` |
| medicationId | S | - | Unique order ID |
| encounterNumber | S | - | Encounter reference |
| patientMrn | S | - | Patient MRN |
| patientName | S | - | Patient name |
| status | S | - | ADDED/ORDERED/PENDING/DISPENSED/PARTIALLY_DISPENSED/ISSUED/PARTIALLY_ISSUED/CLOSED/PARTIALLY_CLOSED/CANCELLED/REJECTCED |
| medication | M | - | { code, name, brand (BOOL), drugForm, genericName } |
| daywiseDosage | M | - | { morning, afternoon, evening, night, unit } |
| drugFrequency | M | - | { id, code, name, frequency, periodUnit: { code, display } } |
| duration | N | - | Duration value |
| durationUnit | S | - | DAYS / WEEKS / MONTHS |
| quantity | N | - | Calculated quantity |
| route | S | - | Oral / IV / IM / SC / Topical / Inhalation |
| foodInstruction | S | - | After Food / Before Food / Empty Stomach |
| patientInstruction | S | - | Free text instruction |
| prefixInstruction | S | - | Medication instruction prefix |
| prescriptionDate | S | - | YYYY-MM-DD |
| isDischargeMedication | BOOL | - | Discharge med flag |
| substitution | M | - | { allowed: BOOL } |
| orderedBy | M | - | { login, displayName, employeeNo } |
| createdOn | S | - | Created timestamp |
| modifiedOn | S | - | Modified timestamp |
| documentNumber | S | - | Associated doc number |
| referenceNumber | S | - | Reference number |
| cancelReason | S | - | Cancellation reason |
| holdReason | S | - | Hold reason |
| stopReason | S | - | Stop reason |

#### SK=ADMIN#MED#{medId}#TIME#{timestamp} (Medication Administration Record -- Iteration 4)

| Attribute | Type | Description |
|-----------|------|-------------|
| medicationId | S | Parent medication order ID |
| scheduledTime | S | Scheduled administration time |
| slotPeriod | S | Night(00-06)/Morning(06-11)/Afternoon(11-15)/Evening(15-20)/Night(20-24) |
| slotStatus | S | PENDING/ADMINISTERED/OVERDUE/HOLD/REFUSED/REVIEWED/PENDING_REVIEW |
| administeredBy | M | { login, displayName } (if administered) |
| administeredAt | S | Actual administration time |
| modifyReason | S | Reason for refuse/withhold/modify (max 2000 chars) |
| modifyCode | S | R=Refuse/M=Modify/W=Withhold/S=Stopped/V=Vomited/A=Allergy |
| dose | M | { morning, afternoon, evening, night } actual dose given |
| encounterNumber | S | Encounter reference |
| patientMrn | S | Patient MRN |

---

### Table 5: LabInvestigationTable

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| PK | S | HASH | `ENC#{encounterNumber}` or `FAV#{login}` or `CATALOG#INV` |
| SK | S | RANGE | `ORDER#{orderCode}` or `RESULT#{code}##{timestamp}` or `RAD#{studyUID}` or `#{serviceName}` |
| GSI1PK | S | GSI1-HASH | `PAT#{mrn}` |
| GSI1SK | S | GSI1-RANGE | `DATE#{resultDate}#RESULT#{code}` |
| encounterNumber | S | - | Encounter reference |
| patientMrn | S | - | Patient MRN |
| patientName | S | - | Patient name |

#### SK=ORDER#{orderCode} (Investigation Order)

| Attribute | Type | Description |
|-----------|------|-------------|
| orderCode | S | Service code |
| orderName | S | Service name |
| serviceType | S | Service type code |
| status | S | ADDED/ORDERED/INPROGRESS/REPORT_READY/PROCESSED/APPROVAL_REQUIRED/CANCELLED/REJECTCED |
| priority | S | NORMAL / URGENT |
| instructions | S | 0-250 chars |
| orderDate | S | ISO datetime |
| orderedBy | M | { login, displayName } |
| isProfile | BOOL | Panel/profile flag |
| documentNumber | S | Document number |

#### SK=RESULT#{code}##{timestamp} (Lab Result)

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
| resultDate | S | Result date |
| parameters | L | List of { name, value, unit, referenceRange, abnormalFlag } |
| reports | L | List of { reportType, documentName, extension, s3Key } |

#### SK=RAD#{studyUID} (Radiology Result -- NEW in iteration 2)

| Attribute | Type | Description |
|-----------|------|-------------|
| studyUID | S | DICOM Study Instance UID |
| modality | S | CT / MRI / XRay / US |
| studyName | S | Study name |
| studyDate | S | Date of imaging |
| orderDate | S | Order date |
| orderNumber | S | Order identifier |
| orderStatus | S | COMPLETED / PENDING |
| images | L | List of { frameNo, name, filePath, extension, s3ThumbnailKey } |
| aiMediaFindings | L | List of { diagnosis, heatMapImageURL, s3HeatmapKey } |
| reportType | S | ATTACHMENT_REPORT / DIAGNOSTIC_REPORT / EXTERNAL_REPORT |
| reportS3Key | S | S3 key for report file |

---

### Table 6: ClinicalDocumentTable

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| PK | S | HASH | `ENC#{encounterNumber}` or `MACRO#{userLogin}` or `PASTRECORDS#{mrn}` |
| SK | S | RANGE | See SK patterns below |
| GSI1PK | S | GSI1-HASH | Sparse: `PENDING#{action}#{userId}` |
| GSI1SK | S | GSI1-RANGE | `DATE#{createdDate}` |
| GSI2PK | S | GSI2-HASH | `PAT#{mrn}` |
| GSI2SK | S | GSI2-RANGE | `TYPE#{docType}#DATE#{createdDate}` |

#### SK Patterns

| Type | SK | Count/Encounter |
|------|------|----------------|
| Progress Note | `DOC#PN#{documentNumber}` | 5-20 |
| Discharge Summary | `DOC#DS#{documentNumber}` | 1 |
| Initial Assessment | `DOC#IA#{documentNumber}` | 1 |
| IA Widget | `DOC#IA#{docNo}#WGT#{widgetKey}` | 27 per IA |
| Checklist | `DOC#CK#{checklistNumber}` | 1-5 |
| Operation Note | `DOC#OP#{otRequestNo}` | 0-2 |
| PAC (Pre-Anesthesia) | `DOC#PAC#{pacId}` | 0-1 |
| Cross-Consultation | `DOC#CC#{documentNumber}` | 0-5 |
| Handover Request | `DOC#HO#{timestamp}` | 0-1 |
| Incident Report | `DOC#IR#{timestamp}` | 0-1 |
| CT Scorecard | `DOC#CTS#{timestamp}` | 0-N |
| Past Record Summary | `VISIT#{consultationDate}` (PK=PASTRECORDS) | N |
| Macro | `TYPE#{widgetType}##{macroId}` (PK=MACRO) | N |

#### Operation Note Attributes (DOC#OP -- Enhanced in iteration 2)

| Attribute | Type | Description |
|-----------|------|-------------|
| otRequestNo | S | OT request number |
| draft | BOOL | Draft status |
| source | S | AADI |
| scheduledDateTime | S | Scheduled surgery time |
| operationType | S | NORMAL / EMERGENCY |
| status | S | IN_PROGRESS / ON_HOLD / DEFERRED / COMPLETED |
| surgeons | L | List of { id, displayName, employeeNo } |
| assistantSurgeons | L | Same structure |
| anaesthetists | L | Same structure |
| scrubNurse | L | Same structure |
| floorNurse | L | Same structure |
| preOperativeDiagnosis | L | List of { term, conceptId } (SNOMED-CT) |
| postOperativeDiagnosis | L | Same structure |
| preOperativeDiagnosisNotes | S | Free text |
| postOperativeDiagnosisNotes | S | Free text |
| operations | L | List of { surgery: { id, name, code }, snomed: { name, code } } |
| operationNotes | S | CKEditor HTML |
| findings | S | CKEditor HTML |
| perioperativeComplications | S | CKEditor HTML |
| detailsOfProcedure | S | CKEditor HTML |
| surgicalSpecimen | S | CKEditor HTML |
| postOpNotes | S | CKEditor HTML |
| inPatient | M | { admissionDetails, patientDetails, ward, bed } |

#### PAC Attributes (DOC#PAC -- NEW in iteration 2)

| Attribute | Type | Description |
|-----------|------|-------------|
| pacId | S | PAC identifier |
| asaGrade | S | ASA physical status classification (I-VI) |
| airwayAssessment | M | Airway evaluation details |
| anesthesiaType | S | General / Regional / Local / Sedation |
| preOpInvestigations | L | Required pre-op tests |
| riskFactors | L | Anesthesia risk factors |
| npoStatus | S | NPO (nil per os) status |
| consent | BOOL | Anesthesia consent obtained |
| assessedBy | M | { login, displayName } |
| assessedOn | S | Assessment timestamp |

#### CT Scorecard (DOC#CTS -- NEW in iteration 2)

| Attribute | Type | Description |
|-----------|------|-------------|
| score | N | Score 0-25 |
| parameters | L | Individual parameter scores |
| assessedBy | M | { login, displayName } |
| assessedOn | S | Assessment timestamp |

#### Past Record Summary (PK=PASTRECORDS#{mrn}) -- NEW in iteration 2

| Attribute | Type | Description |
|-----------|------|-------------|
| visitDisplay | S | OP / IP |
| appointmentType | S | VIDEO_CONSULT / IN_PERSON |
| department | S | Department name |
| consultantName | S | Consultant display name |
| consultationDate | S | Consultation date |
| encounterNumber | S | Encounter reference |
| chiefComplaints | L | List of { name, hpi } |
| diagnoses | L | List of { name, date } |
| notes | L | List of { label, text } |
| hasMedications | BOOL | Medications present |
| hasInvestigations | BOOL | Investigations present |
| hasAttachments | BOOL | Attachments present |
| hasInitialAssessment | BOOL | IA present |
| opSummaryRef | S | OP summary document ref |
| ipSummaryRef | S | IP summary / DS document ref |

---

### Table 7: VitalsTable

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| PK | S | HASH | `ENC#{encounterNumber}#DATE#{YYYY-MM-DD}` |
| SK | S | RANGE | `TIME#{HH:mm:ss}` |
| GSI1PK | S | GSI1-HASH | `PAT#{mrn}` |
| GSI1SK | S | GSI1-RANGE | `DATE#{date}#TIME#{time}` |
| encounterNumber | S | - | Encounter reference |
| patientMrn | S | - | Patient MRN |
| documentNumber | S | - | Associated document |
| systolicBP | N | - | Systolic BP |
| diastolicBP | N | - | Diastolic BP |
| pulse | N | - | Heart rate (bpm) |
| temperature | N | - | Temperature (F) |
| temperatureUnit | S | - | C or F (auto-converted) |
| spO2 | N | - | Oxygen saturation % |
| respiratoryRate | N | - | Respiratory rate |
| weight | N | - | Weight (kg) |
| height | N | - | Height (cm) |
| bmi | N | - | BMI |
| painScore | N | - | Pain score 0-10 |
| bloodSugar | N | - | Blood sugar |
| gcsScore | N | - | Glasgow Coma Scale |
| urineOutput | N | - | Urine output (ml) |
| arterialPressureSys | N | - | Arterial systolic |
| arterialPressureDia | N | - | Arterial diastolic |
| bpLyingSys | N | - | BP lying systolic |
| bpLyingDia | N | - | BP lying diastolic |
| bpStandingSys | N | - | BP standing systolic |
| bpStandingDia | N | - | BP standing diastolic |
| bpSittingSys | N | - | BP sitting systolic |
| bpSittingDia | N | - | BP sitting diastolic |
| crt | N | - | Capillary Refill Time |
| chewsScore | N | - | Clinical early warning score |
| customVitals | M | - | Map of additional parameters |
| recordedBy | M | - | { login, displayName } |
| recordedAt | S | - | Recording timestamp |
| source | S | - | MANUAL / DEVICE / IMPORT |
| ttl | N | - | TTL epoch (2 years) |

---

### Table 8: CareTeamTable

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| PK | S | HASH | `PAT#{mrn}#ENC#{enc}` or `TMPL#{templateId}` |
| SK | S | RANGE | `METADATA` or `MEMBER#{userId}` |
| GSI1PK | S | GSI1-HASH | `USER#{userId}` |
| GSI1SK | S | GSI1-RANGE | `PAT#{mrn}#ENC#{enc}` |
| GSI2PK | S | GSI2-HASH | `TMPL#PC#{consultantLogin}` or `TMPL#HSC#{hscCode}` |
| GSI2SK | S | GSI2-RANGE | `UNIT#{unitCode}` |

(Attributes defined in 04_TABLE_DESIGN.md Table 8)

---

### Table 9: PatientMessageTable

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| PK | S | HASH | `PAT#{mrn}#ENC#{encounterNumber}` |
| SK | S | RANGE | `MSG#{timestamp}##{messageId}` |
| GSI1PK | S | GSI1-HASH | Sparse: `PENDING#MSG#{senderLogin}` |
| GSI1SK | S | GSI1-RANGE | `TIME#{timestamp}` |

(Attributes defined in 04_TABLE_DESIGN.md Table 9)

---

### Table 10: ChatTable

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| PK | S | HASH | `THREAD#{threadId}` |
| SK | S | RANGE | `METADATA` or `MSG#{timestamp}##{messageId}` or `PART#{userId}` |
| GSI1PK | S | GSI1-HASH | `ASSIGNED#{userId}` |
| GSI1SK | S | GSI1-RANGE | `LAST_MSG#{timestamp}` |
| GSI2PK | S | GSI2-HASH | `UNIT#{unitCode}` |
| GSI2SK | S | GSI2-RANGE | `LAST_MSG#{timestamp}` |
| GSI3PK | S | GSI3-HASH | `PAT#{patientId}` |
| GSI3SK | S | GSI3-RANGE | `THREAD#{threadId}` |

(Attributes defined in 04_TABLE_DESIGN.md Table 10)

---

### Table 11: VideoConsultationTable

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| PK | S | HASH | `APT#{appointmentNumber}` or `SCHEDULE#DOC#{doctorLogin}#DATE#{date}` |
| SK | S | RANGE | `METADATA` or `FOLLOWUP` or `CHAT#{timestamp}##{msgId}` or `AUDIT#{timestamp}` or `OPD#{prescriptionId}` or `SLOT#{time}` |
| GSI1PK | S | GSI1-HASH | `DOC#{doctorLogin}` |
| GSI1SK | S | GSI1-RANGE | `DATE#{date}#APT#{aptNo}` |
| GSI2PK | S | GSI2-HASH | `PAT#{mrn}` |
| GSI2SK | S | GSI2-RANGE | `DATE#{date}` |

#### SK=OPD#{prescriptionId} (Post-Consultation Upload -- NEW)

| Attribute | Type | Description |
|-----------|------|-------------|
| prescriptionId | S | Upload ID |
| fileType | S | CAMERA / GALLERY / FILE |
| fileName | S | Original filename |
| s3Key | S | S3 object key |
| mimeType | S | MIME type |
| md5Checksum | S | MD5 verification |
| uploadedAt | S | Upload timestamp |

#### SK=FOLLOWUP (Follow-Up Record -- Iteration 4)

| Attribute | Type | Description |
|-----------|------|-------------|
| mode | S | DURATION / DATE |
| followUpDate | S | Calculated or selected date |
| duration | S | Duration string (e.g., "2 weeks") |
| consultant | M | { id, name, code, displayName, resourceType } |
| department | M | { id, name, code } |
| unit | M | { id, name, code } |
| appointmentType | S | APPOINTMENT / VIDEO_CONSULT / TELE_CONSULT |
| investigations | L | List of { name, code, type } |
| notes | S | Follow-up notes |
| sourceEncounter | S | Source encounter number |
| patientMrn | S | Patient MRN |
| createdBy | M | { login, displayName } |
| createdOn | S | Creation timestamp |

#### PK=SCHEDULE#DOC#{login}#DATE#{date}, SK=SLOT#{time} (Doctor Slots -- Iteration 4)

| Attribute | Type | Description |
|-----------|------|-------------|
| slotTime | S | Slot start time |
| slotDuration | N | Duration in minutes |
| isAvailable | BOOL | Availability flag |
| isBooked | BOOL | Booking flag |
| bookedBy | S | Patient ID if booked |
| appointmentNumber | S | Linked appointment if booked |

(Other attributes defined in 04_TABLE_DESIGN.md Table 11)

---

### Table 12: TaskWorkflowTable

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| PK | S | HASH | `TASK#{taskId}` |
| SK | S | RANGE | `METADATA` or `VARS` or `COMMENT#{timestamp}` |
| GSI1PK | S | GSI1-HASH | `ASSIGNEE#{userId}` |
| GSI1SK | S | GSI1-RANGE | `STATUS#{status}#CREATED#{timestamp}` |
| GSI2PK | S | GSI2-HASH | `UNIT#{unitCode}#STATUS#{status}` |
| GSI2SK | S | GSI2-RANGE | `TYPE#{taskName}#CREATED#{timestamp}` |

(Attributes defined in 04_TABLE_DESIGN.md Table 12)

---

### Table 13: BillingTable

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| PK | S | HASH | `PAT#{patientId}` |
| SK | S | RANGE | `INV#{invoiceNo}` or `INV#...#REC#...` or `INV#...#REC#...#REF#...` or `UNBILL#{docNo}` or `MEDREQ#{reqId}` |
| GSI1PK | S | GSI1-HASH | `UNIT#{unitCode}#STATUS#{status}` |
| GSI1SK | S | GSI1-RANGE | `DATE#{invoiceDate}` |
| GSI2PK | S | GSI2-HASH | `INVNO#{invoiceNo}` |
| GSI2SK | S | GSI2-RANGE | `PAT#{patientId}` |

(Attributes defined in 04_TABLE_DESIGN.md Table 13)

---

### Table 14: CampOutreachTable

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| PK | S | HASH | `CAMP#{campId}` |
| SK | S | RANGE | `METADATA` or `PAT#{patientId}` or `COORD#{coordId}` or `CONS#{consId}` or `TEMP#{tempId}` or `WPAT#{wpatId}` |
| GSI1PK | S | GSI1-HASH | `UNIT#{unitCode}#STATUS#{status}` |
| GSI1SK | S | GSI1-RANGE | `DATE#{startDate}` |
| GSI2PK | S | GSI2-HASH | `PAT#{patientId}` |
| GSI2SK | S | GSI2-RANGE | `CAMP#{campId}` |

(Attributes defined in 04_TABLE_DESIGN.md Table 14)

---

### Table 15: DocumentStorageTable

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| PK | S | HASH | `PAT#{patientId}` |
| SK | S | RANGE | `DOC#{documentId}` |
| GSI1PK | S | GSI1-HASH | `TAG#{tag}` |
| GSI1SK | S | GSI1-RANGE | `PAT#{patientId}#DOC#{docId}` |

(Attributes defined in 04_TABLE_DESIGN.md Table 15)

---

### Table 16: SystemConfigTable

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| PK | S | HASH | Various: `CONFIG#APP`, `GEO#COUNTRY`, `AUDIT##{date}`, `FCM#USER#{userId}`, `FEEDBACK#{userId}` |
| SK | S | RANGE | Various per PK pattern |

#### PK=FEEDBACK#{userId} (Customer Feedback -- NEW in iteration 2)

| Attribute | Type | Description |
|-----------|------|-------------|
| surveyId | S | Survey identifier |
| surveyType | S | Survey type |
| status | S | PENDING / COMPLETED |
| responses | M | Survey response map |
| completedAt | S | Completion timestamp |

(Other patterns defined in 04_TABLE_DESIGN.md Table 16)

---

## Access Patterns Summary

See [03_ACCESS_PATTERNS.md](./03_ACCESS_PATTERNS.md) for the complete 100+ access pattern catalog with DynamoDB operations, key conditions, and frequency estimates.

---

## GSI Summary (38 Total)

| Table | GSI Count | GSI Names |
|-------|-----------|-----------|
| UserStaffTable | 3 | GSI1 (login), GSI2 (unit+role), GSI3 (org) |
| PatientTable | 3 | GSI1 (MRN), GSI2 (UHID), GSI3 (phone) |
| EncounterTable | 3 | GSI1 (patient), GSI2 (doctor+unit), GSI3 (unit+status) |
| MedicationOrderTable | 2 | GSI1 (patient+status), GSI2 (encounter+status) |
| LabInvestigationTable | 1 | GSI1 (patient) |
| ClinicalDocumentTable | 2 | GSI1 (sparse pending), GSI2 (patient) |
| VitalsTable | 1 | GSI1 (patient) |
| CareTeamTable | 2 | GSI1 (user), GSI2 (template type) |
| PatientMessageTable | 1 | GSI1 (sparse pending) |
| ChatTable | 3 | GSI1 (assigned), GSI2 (unit), GSI3 (patient) |
| VideoConsultationTable | 2 | GSI1 (doctor), GSI2 (patient) |
| TaskWorkflowTable | 2 | GSI1 (assignee), GSI2 (unit+status) |
| BillingTable | 2 | GSI1 (unit+status), GSI2 (invoice number) |
| CampOutreachTable | 2 | GSI1 (unit+status), GSI2 (patient) |
| DocumentStorageTable | 1 | GSI1 (tag) |
| SystemConfigTable | 0 | None |
| **Total** | **38** | |


## Cost Report

> **Disclaimer:** This estimate covers **read/write request costs** and **storage costs** only,
> based on DynamoDB Standard table class on-demand pricing for the **US East (N. Virginia) /
> us-east-1** region. Prices were last verified in **January 2026**. Additional features such as
> Point-in-Time Recovery (PITR), backups, streams, and data transfer may incur additional costs.
> Actual costs may also vary based on your AWS region, pricing model (on-demand vs. provisioned),
> reserved capacity, and real-world traffic patterns. This report assumes constant RPS and average
> item sizes. For the most current pricing, refer to the
> [Amazon DynamoDB Pricing](https://aws.amazon.com/dynamodb/pricing/) page.

**Total Monthly Cost: $5053.83**

| Source                  | Monthly Cost |
| ----------------------- | ------------ |
| Storage                 | $60.13       |
| Read and write requests | $4993.70     |

### Storage Costs

**Monthly Cost:** $60.13

| Resource               | Type  | Storage (GB) | Monthly Cost |
| ---------------------- | ----- | ------------ | ------------ |
| UserStaffTable         | Table | 0.02         | $0.01        |
| GSI1                   | GSI   | 0.01         | $0.00        |
| GSI2                   | GSI   | 0.01         | $0.00        |
| GSI3                   | GSI   | 0.00         | $0.00        |
| PatientTable           | Table | 0.98         | $0.24        |
| GSI1                   | GSI   | 0.98         | $0.24        |
| GSI2                   | GSI   | 0.98         | $0.24        |
| GSI3                   | GSI   | 0.14         | $0.03        |
| EncounterTable         | Table | 2.89         | $0.72        |
| GSI1                   | GSI   | 2.89         | $0.72        |
| GSI2                   | GSI   | 2.89         | $0.72        |
| GSI3                   | GSI   | 2.89         | $0.72        |
| MedicationOrderTable   | Table | 7.45         | $1.86        |
| GSI1                   | GSI   | 7.45         | $1.86        |
| GSI2                   | GSI   | 1.40         | $0.35        |
| LabInvestigationTable  | Table | 12.11        | $3.03        |
| GSI1                   | GSI   | 12.11        | $3.03        |
| ClinicalDocumentTable  | Table | 42.19        | $10.55       |
| GSI1                   | GSI   | 0.20         | $0.05        |
| GSI2                   | GSI   | 14.25        | $3.56        |
| VitalsTable            | Table | 27.94        | $6.98        |
| GSI1                   | GSI   | 27.94        | $6.98        |
| CareTeamTable          | Table | 0.04         | $0.01        |
| GSI1                   | GSI   | 0.04         | $0.01        |
| GSI2                   | GSI   | 0.01         | $0.00        |
| PatientMessageTable    | Table | 20.49        | $5.12        |
| GSI1                   | GSI   | 0.05         | $0.01        |
| ChatTable              | Table | 8.38         | $2.10        |
| GSI1                   | GSI   | 0.06         | $0.01        |
| GSI2                   | GSI   | 0.06         | $0.01        |
| GSI3                   | GSI   | 0.03         | $0.01        |
| VideoConsultationTable | Table | 0.98         | $0.24        |
| GSI1                   | GSI   | 0.98         | $0.24        |
| GSI2                   | GSI   | 0.98         | $0.24        |
| TaskWorkflowTable      | Table | 3.91         | $0.98        |
| GSI1                   | GSI   | 0.98         | $0.24        |
| GSI2                   | GSI   | 0.98         | $0.24        |
| BillingTable           | Table | 14.44        | $3.61        |
| GSI1                   | GSI   | 14.44        | $3.61        |
| GSI2                   | GSI   | 1.12         | $0.28        |
| CampOutreachTable      | Table | 0.30         | $0.07        |
| GSI1                   | GSI   | 0.01         | $0.00        |
| GSI2                   | GSI   | 0.17         | $0.04        |
| DocumentStorageTable   | Table | 2.79         | $0.70        |
| GSI1                   | GSI   | 1.40         | $0.35        |
| SystemConfigTable      | Table | 0.20         | $0.05        |

### Read and Write Request Costs

**Monthly Cost:** $4993.70

| Resource               | Type  | Monthly Cost |
| ---------------------- | ----- | ------------ |
| UserStaffTable         | Table | $16.47       |
| GSI1                   | GSI   | $0.00        |
| GSI2                   | GSI   | $26.35       |
| GSI3                   | GSI   | $0.00        |
| PatientTable           | Table | $65.88       |
| GSI1                   | GSI   | $49.41       |
| GSI2                   | GSI   | $32.94       |
| GSI3                   | GSI   | $16.47       |
| EncounterTable         | Table | $115.29      |
| GSI1                   | GSI   | $49.41       |
| GSI2                   | GSI   | $230.58      |
| GSI3                   | GSI   | $415.04      |
| MedicationOrderTable   | Table | $362.34      |
| GSI1                   | GSI   | $263.52      |
| GSI2                   | GSI   | $131.76      |
| LabInvestigationTable  | Table | $263.52      |
| GSI1                   | GSI   | $164.70      |
| ClinicalDocumentTable  | Table | $298.11      |
| GSI1                   | GSI   | $65.88       |
| GSI2                   | GSI   | $164.70      |
| VitalsTable            | Table | $527.04      |
| GSI1                   | GSI   | $329.40      |
| CareTeamTable          | Table | $0.00        |
| GSI1                   | GSI   | $0.00        |
| GSI2                   | GSI   | $0.00        |
| PatientMessageTable    | Table | $378.81      |
| GSI1                   | GSI   | $82.35       |
| ChatTable              | Table | $181.17      |
| GSI1                   | GSI   | $82.35       |
| GSI2                   | GSI   | $82.35       |
| GSI3                   | GSI   | $0.00        |
| VideoConsultationTable | Table | $0.00        |
| GSI1                   | GSI   | $0.00        |
| GSI2                   | GSI   | $0.00        |
| TaskWorkflowTable      | Table | $49.41       |
| GSI1                   | GSI   | $72.47       |
| GSI2                   | GSI   | $156.47      |
| BillingTable           | Table | $88.94       |
| GSI1                   | GSI   | $49.41       |
| GSI2                   | GSI   | $16.47       |
| CampOutreachTable      | Table | $49.41       |
| GSI1                   | GSI   | $0.00        |
| GSI2                   | GSI   | $16.47       |
| DocumentStorageTable   | Table | $0.00        |
| GSI1                   | GSI   | $0.00        |
| SystemConfigTable      | Table | $98.82       |

#### UserStaffTable Table

**Monthly Cost:** $16.47

| Pattern          | Operation | RPS  | RRU / WRU | Monthly Cost |
| ---------------- | --------- | ---- | --------- | ------------ |
| get-user-profile | GetItem   | 50.0 | 1.00      | $16.47       |

#### UserStaffTable Table / GSI1 GSI

**Monthly Cost:** $0.00

| Pattern | Operation | RPS | RRU / WRU | Monthly Cost |
| ------- | --------- | --- | --------- | ------------ |

#### UserStaffTable Table / GSI2 GSI

**Monthly Cost:** $26.35

| Pattern            | Operation | RPS  | RRU / WRU | Monthly Cost |
| ------------------ | --------- | ---- | --------- | ------------ |
| list-users-by-unit | Query     | 20.0 | 4.00      | $26.35       |

#### UserStaffTable Table / GSI3 GSI

**Monthly Cost:** $0.00

| Pattern | Operation | RPS | RRU / WRU | Monthly Cost |
| ------- | --------- | --- | --------- | ------------ |

#### PatientTable Table

**Monthly Cost:** $65.88

| Pattern           | Operation | RPS   | RRU / WRU | Monthly Cost |
| ----------------- | --------- | ----- | --------- | ------------ |
| get-patient-by-id | GetItem   | 100.0 | 1.00      | $32.94       |
| create-patient    | PutItem   | 10.0  | 2.00      | $32.94       |

#### PatientTable Table / GSI1 GSI

**Monthly Cost:** $49.41

| Pattern            | Operation | RPS   | RRU / WRU | Monthly Cost |
| ------------------ | --------- | ----- | --------- | ------------ |
| get-patient-by-mrn | Query     | 100.0 | 0.50      | $16.47       |
| create-patient¹    | PutItem   | 10.0  | 2.00      | $32.94       |

#### PatientTable Table / GSI2 GSI

**Monthly Cost:** $32.94

| Pattern         | Operation | RPS  | RRU / WRU | Monthly Cost |
| --------------- | --------- | ---- | --------- | ------------ |
| create-patient¹ | PutItem   | 10.0 | 2.00      | $32.94       |

#### PatientTable Table / GSI3 GSI

**Monthly Cost:** $16.47

| Pattern         | Operation | RPS  | RRU / WRU | Monthly Cost |
| --------------- | --------- | ---- | --------- | ------------ |
| create-patient¹ | PutItem   | 10.0 | 1.00      | $16.47       |

#### EncounterTable Table

**Monthly Cost:** $115.29

| Pattern          | Operation  | RPS   | RRU / WRU | Monthly Cost |
| ---------------- | ---------- | ----- | --------- | ------------ |
| get-encounter    | GetItem    | 200.0 | 1.00      | $65.88       |
| update-encounter | UpdateItem | 10.0  | 3.00      | $49.41       |

#### EncounterTable Table / GSI1 GSI

**Monthly Cost:** $49.41

| Pattern           | Operation  | RPS  | RRU / WRU | Monthly Cost |
| ----------------- | ---------- | ---- | --------- | ------------ |
| update-encounter¹ | UpdateItem | 10.0 | 3.00      | $49.41       |

#### EncounterTable Table / GSI2 GSI

**Monthly Cost:** $230.58

| Pattern              | Operation  | RPS  | RRU / WRU | Monthly Cost |
| -------------------- | ---------- | ---- | --------- | ------------ |
| encounters-by-doctor | Query      | 50.0 | 11.00     | $181.17      |
| update-encounter¹    | UpdateItem | 10.0 | 3.00      | $49.41       |

#### EncounterTable Table / GSI3 GSI

**Monthly Cost:** $415.04

| Pattern           | Operation  | RPS  | RRU / WRU | Monthly Cost |
| ----------------- | ---------- | ---- | --------- | ------------ |
| active-by-unit    | Query      | 30.0 | 37.00     | $365.63      |
| update-encounter¹ | UpdateItem | 10.0 | 3.00      | $49.41       |

#### MedicationOrderTable Table

**Monthly Cost:** $362.34

| Pattern           | Operation  | RPS   | RRU / WRU | Monthly Cost |
| ----------------- | ---------- | ----- | --------- | ------------ |
| list-medications  | Query      | 100.0 | 3.00      | $98.82       |
| create-medication | PutItem    | 50.0  | 2.00      | $164.70      |
| update-medication | UpdateItem | 30.0  | 2.00      | $98.82       |

#### MedicationOrderTable Table / GSI1 GSI

**Monthly Cost:** $263.52

| Pattern            | Operation  | RPS  | RRU / WRU | Monthly Cost |
| ------------------ | ---------- | ---- | --------- | ------------ |
| create-medication¹ | PutItem    | 50.0 | 2.00      | $164.70      |
| update-medication¹ | UpdateItem | 30.0 | 2.00      | $98.82       |

#### MedicationOrderTable Table / GSI2 GSI

**Monthly Cost:** $131.76

| Pattern            | Operation  | RPS  | RRU / WRU | Monthly Cost |
| ------------------ | ---------- | ---- | --------- | ------------ |
| create-medication¹ | PutItem    | 50.0 | 1.00      | $82.35       |
| update-medication¹ | UpdateItem | 30.0 | 1.00      | $49.41       |

#### LabInvestigationTable Table

**Monthly Cost:** $263.52

| Pattern          | Operation | RPS   | RRU / WRU | Monthly Cost |
| ---------------- | --------- | ----- | --------- | ------------ |
| list-lab-results | Query     | 100.0 | 3.00      | $98.82       |
| store-lab-result | PutItem   | 50.0  | 2.00      | $164.70      |

#### LabInvestigationTable Table / GSI1 GSI

**Monthly Cost:** $164.70

| Pattern           | Operation | RPS  | RRU / WRU | Monthly Cost |
| ----------------- | --------- | ---- | --------- | ------------ |
| store-lab-result¹ | PutItem   | 50.0 | 2.00      | $164.70      |

#### ClinicalDocumentTable Table

**Monthly Cost:** $298.11

| Pattern               | Operation | RPS  | RRU / WRU | Monthly Cost |
| --------------------- | --------- | ---- | --------- | ------------ |
| list-progress-notes   | Query     | 50.0 | 6.50      | $107.05      |
| create-progress-note  | PutItem   | 20.0 | 5.00      | $164.70      |
| get-discharge-summary | GetItem   | 20.0 | 4.00      | $26.35       |

#### ClinicalDocumentTable Table / GSI1 GSI

**Monthly Cost:** $65.88

| Pattern               | Operation | RPS  | RRU / WRU | Monthly Cost |
| --------------------- | --------- | ---- | --------- | ------------ |
| create-progress-note¹ | PutItem   | 20.0 | 2.00      | $65.88       |

#### ClinicalDocumentTable Table / GSI2 GSI

**Monthly Cost:** $164.70

| Pattern               | Operation | RPS  | RRU / WRU | Monthly Cost |
| --------------------- | --------- | ---- | --------- | ------------ |
| create-progress-note¹ | PutItem   | 20.0 | 5.00      | $164.70      |

#### VitalsTable Table

**Monthly Cost:** $527.04

| Pattern        | Operation | RPS   | RRU / WRU | Monthly Cost |
| -------------- | --------- | ----- | --------- | ------------ |
| record-vitals  | PutItem   | 200.0 | 1.00      | $329.40      |
| vitals-for-day | Query     | 100.0 | 6.00      | $197.64      |

#### VitalsTable Table / GSI1 GSI

**Monthly Cost:** $329.40

| Pattern        | Operation | RPS   | RRU / WRU | Monthly Cost |
| -------------- | --------- | ----- | --------- | ------------ |
| record-vitals¹ | PutItem   | 200.0 | 1.00      | $329.40      |

#### CareTeamTable Table

**Monthly Cost:** $0.00

| Pattern | Operation | RPS | RRU / WRU | Monthly Cost |
| ------- | --------- | --- | --------- | ------------ |

#### CareTeamTable Table / GSI1 GSI

**Monthly Cost:** $0.00

| Pattern | Operation | RPS | RRU / WRU | Monthly Cost |
| ------- | --------- | --- | --------- | ------------ |

#### CareTeamTable Table / GSI2 GSI

**Monthly Cost:** $0.00

| Pattern | Operation | RPS | RRU / WRU | Monthly Cost |
| ------- | --------- | --- | --------- | ------------ |

#### PatientMessageTable Table

**Monthly Cost:** $378.81

| Pattern       | Operation  | RPS   | RRU / WRU | Monthly Cost |
| ------------- | ---------- | ----- | --------- | ------------ |
| list-messages | Query      | 100.0 | 6.50      | $214.11      |
| send-message  | PutItem    | 50.0  | 1.00      | $82.35       |
| mark-read     | UpdateItem | 50.0  | 1.00      | $82.35       |

#### PatientMessageTable Table / GSI1 GSI

**Monthly Cost:** $82.35

| Pattern       | Operation | RPS  | RRU / WRU | Monthly Cost |
| ------------- | --------- | ---- | --------- | ------------ |
| send-message¹ | PutItem   | 50.0 | 1.00      | $82.35       |

#### ChatTable Table

**Monthly Cost:** $181.17

| Pattern       | Operation | RPS   | RRU / WRU | Monthly Cost |
| ------------- | --------- | ----- | --------- | ------------ |
| chat-messages | Query     | 100.0 | 3.00      | $98.82       |
| send-chat     | PutItem   | 50.0  | 1.00      | $82.35       |

#### ChatTable Table / GSI1 GSI

**Monthly Cost:** $82.35

| Pattern    | Operation | RPS  | RRU / WRU | Monthly Cost |
| ---------- | --------- | ---- | --------- | ------------ |
| send-chat¹ | PutItem   | 50.0 | 1.00      | $82.35       |

#### ChatTable Table / GSI2 GSI

**Monthly Cost:** $82.35

| Pattern    | Operation | RPS  | RRU / WRU | Monthly Cost |
| ---------- | --------- | ---- | --------- | ------------ |
| send-chat¹ | PutItem   | 50.0 | 1.00      | $82.35       |

#### ChatTable Table / GSI3 GSI

**Monthly Cost:** $0.00

| Pattern | Operation | RPS | RRU / WRU | Monthly Cost |
| ------- | --------- | --- | --------- | ------------ |

#### VideoConsultationTable Table

**Monthly Cost:** $0.00

| Pattern | Operation | RPS | RRU / WRU | Monthly Cost |
| ------- | --------- | --- | --------- | ------------ |

#### VideoConsultationTable Table / GSI1 GSI

**Monthly Cost:** $0.00

| Pattern | Operation | RPS | RRU / WRU | Monthly Cost |
| ------- | --------- | --- | --------- | ------------ |

#### VideoConsultationTable Table / GSI2 GSI

**Monthly Cost:** $0.00

| Pattern | Operation | RPS | RRU / WRU | Monthly Cost |
| ------- | --------- | --- | --------- | ------------ |

#### TaskWorkflowTable Table

**Monthly Cost:** $49.41

| Pattern    | Operation  | RPS  | RRU / WRU | Monthly Cost |
| ---------- | ---------- | ---- | --------- | ------------ |
| get-task   | GetItem    | 50.0 | 1.00      | $16.47       |
| claim-task | UpdateItem | 10.0 | 2.00      | $32.94       |

#### TaskWorkflowTable Table / GSI1 GSI

**Monthly Cost:** $72.47

| Pattern     | Operation  | RPS  | RRU / WRU | Monthly Cost |
| ----------- | ---------- | ---- | --------- | ------------ |
| my-tasks    | Query      | 30.0 | 4.00      | $39.53       |
| claim-task¹ | UpdateItem | 10.0 | 2.00      | $32.94       |

#### TaskWorkflowTable Table / GSI2 GSI

**Monthly Cost:** $156.47

| Pattern     | Operation  | RPS  | RRU / WRU | Monthly Cost |
| ----------- | ---------- | ---- | --------- | ------------ |
| unit-tasks  | Query      | 30.0 | 12.50     | $123.52      |
| claim-task¹ | UpdateItem | 10.0 | 2.00      | $32.94       |

#### BillingTable Table

**Monthly Cost:** $88.94

| Pattern          | Operation | RPS  | RRU / WRU | Monthly Cost |
| ---------------- | --------- | ---- | --------- | ------------ |
| patient-invoices | Query     | 30.0 | 4.00      | $39.53       |
| create-invoice   | PutItem   | 10.0 | 3.00      | $49.41       |

#### BillingTable Table / GSI1 GSI

**Monthly Cost:** $49.41

| Pattern         | Operation | RPS  | RRU / WRU | Monthly Cost |
| --------------- | --------- | ---- | --------- | ------------ |
| create-invoice¹ | PutItem   | 10.0 | 3.00      | $49.41       |

#### BillingTable Table / GSI2 GSI

**Monthly Cost:** $16.47

| Pattern         | Operation | RPS  | RRU / WRU | Monthly Cost |
| --------------- | --------- | ---- | --------- | ------------ |
| create-invoice¹ | PutItem   | 10.0 | 1.00      | $16.47       |

#### CampOutreachTable Table

**Monthly Cost:** $49.41

| Pattern               | Operation | RPS  | RRU / WRU | Monthly Cost |
| --------------------- | --------- | ---- | --------- | ------------ |
| camp-patients         | Query     | 20.0 | 5.00      | $32.94       |
| register-camp-patient | PutItem   | 10.0 | 1.00      | $16.47       |

#### CampOutreachTable Table / GSI1 GSI

**Monthly Cost:** $0.00

| Pattern | Operation | RPS | RRU / WRU | Monthly Cost |
| ------- | --------- | --- | --------- | ------------ |

#### CampOutreachTable Table / GSI2 GSI

**Monthly Cost:** $16.47

| Pattern                | Operation | RPS  | RRU / WRU | Monthly Cost |
| ---------------------- | --------- | ---- | --------- | ------------ |
| register-camp-patient¹ | PutItem   | 10.0 | 1.00      | $16.47       |

#### DocumentStorageTable Table

**Monthly Cost:** $0.00

| Pattern | Operation | RPS | RRU / WRU | Monthly Cost |
| ------- | --------- | --- | --------- | ------------ |

#### DocumentStorageTable Table / GSI1 GSI

**Monthly Cost:** $0.00

| Pattern | Operation | RPS | RRU / WRU | Monthly Cost |
| ------- | --------- | --- | --------- | ------------ |

#### SystemConfigTable Table

**Monthly Cost:** $98.82

| Pattern     | Operation | RPS   | RRU / WRU | Monthly Cost |
| ----------- | --------- | ----- | --------- | ------------ |
| get-config  | GetItem   | 100.0 | 0.50      | $16.47       |
| audit-event | PutItem   | 50.0  | 1.00      | $82.35       |

¹ **GSI additional writes** - When a table write changes attributes projected into a GSI,
DynamoDB performs an additional write to that index, incurring extra WRUs. If the GSI partition
key value changes, the cost doubles (delete + insert) - this estimate assumes single writes only.
[Learn more](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html#GSI.ThroughputConsiderations.Writes)

<!-- end-cost-report -->