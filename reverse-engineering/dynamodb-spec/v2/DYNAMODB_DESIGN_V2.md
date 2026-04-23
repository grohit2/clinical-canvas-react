# DynamoDB Design V2 -- Clinical Canvas Healthcare Platform

> 9 Tables | 21 GSIs | Consolidated from 16-table V1 design
> AADI (doctor app) + AHAM (staff app) | Narayana Health
> Date: 2026-04-23

---

## Table Overview

| # | Table | PK Pattern | Contents | GSIs |
|---|-------|-----------|----------|------|
| 1 | UserStaffTable | `USER#{userId}` | Staff, doctors, preferences, FCM tokens, schedules | 3 |
| 2 | PatientTable | `PAT#{patientId}` | Demographics, Aadhaar KYC, labels, emergency contacts | 3 |
| 3 | EncounterTable | `ENC#{encounterNumber}` | Encounters, admissions, transfers, care teams, appointments, risk scores, comorbidities | 3 |
| 4 | ClinicalTable | `ENC#{encounterNumber}` | Medications, labs, radiology, progress notes, discharge summaries, initial assessments, checklists, operation notes, PAC, vitals, file uploads, macros, past records, favorites, catalogs | 3 |
| 5 | MessageTable | `PAT#{mrn}#ENC#{enc}` or `THREAD#{threadId}` | Patient clinical messages (16 categories) + ACS chat conversations | 3 |
| 6 | TaskWorkflowTable | `TASK#{taskId}` | Clinical tasks (7 types) + billing tasks (13 types), process variables, comments | 2 |
| 7 | BillingTable | `PAT#{patientId}` | Invoices, receipts, refunds, unbilled docs, discounts, authorizations | 2 |
| 8 | CampOutreachTable | `CAMP#{campId}` | Health camps, camp patients, coordinators, temp registrations | 2 |
| 9 | PlatformTable | Various | App config, geography, organizations, FAQ, audit events, feedback | 0 |
| | **Total** | | | **21** |

---

## Table 1: UserStaffTable

All human actors: doctors, nurses, paramedics, coordinators, admin staff.

### Keys & GSIs

| Key | Pattern | Purpose |
|-----|---------|---------|
| PK | `USER#{userId}` | User identity |
| SK | `PROFILE` / `PREF` / `SCHEDULE#{date}` / `FCM#{deviceId}` | Item type |
| GSI1 | PK=`LOGIN#{login}` SK=`USER#{userId}` | Login lookup |
| GSI2 | PK=`UNIT#{unitCode}` SK=`ROLE#{role}#USER#{userId}` | Users by unit+role |
| GSI3 | PK=`ORG#{orgId}` SK=`UNIT#{unitCode}#USER#{userId}` | Users by org (KEYS_ONLY) |

### SK Patterns

| SK | Entity | Description |
|----|--------|-------------|
| `PROFILE` | UserProfile | Core profile: userId, login, displayName, firstName, lastName, email, mobileNumber, roles[], department, departmentCode, designation, specialization, qualifications, unitCode, organizationId, isActive, photo, employeeNo, passwordExpired, accountLocked, lastLoginAt, createdAt, updatedAt |
| `PREF` | UserPreferences | notificationPreferences (map), locale, country, lastViewModule, sortPreference, filterPreference (map) |
| `SCHEDULE#{date}` | DoctorSchedule | consultationSlots[], maxAppointments, isAvailable, consultationFee |
| `FCM#{deviceId}` | FcmToken | fcmToken, deviceId, platform (android/ios), appVersion, isActive, lastUpdated |

### Access Patterns

| # | Pattern | Operation | Key Condition |
|---|---------|-----------|---------------|
| 1 | Get user by ID | GetItem (SC) | PK=`USER#X`, SK=`PROFILE` |
| 2 | Login lookup | Query GSI1 | PK=`LOGIN#X` |
| 3 | List users by unit | Query GSI2 | PK=`UNIT#X` |
| 4 | List doctors by unit | Query GSI2 | PK=`UNIT#X`, SK begins_with `ROLE#DOCTOR` |
| 5 | Get user preferences | GetItem | PK=`USER#X`, SK=`PREF` |
| 6 | Get doctor schedule for date | GetItem | PK=`USER#X`, SK=`SCHEDULE#2026-04-23` |
| 7 | Get doctor schedule range | Query | PK=`USER#X`, SK between `SCHEDULE#from` and `SCHEDULE#to` |
| 8 | Register FCM token | PutItem | PK=`USER#X`, SK=`FCM#deviceId` |
| 9 | List user devices | Query | PK=`USER#X`, SK begins_with `FCM#` |
| 10 | Deactivate FCM on logout | UpdateItem | PK=`USER#X`, SK=`FCM#deviceId` → set isActive=false |

---

## Table 2: PatientTable

Patient demographics, identity verification, labels, and emergency contacts.

### Keys & GSIs

| Key | Pattern | Purpose |
|-----|---------|---------|
| PK | `PAT#{patientId}` | Patient identity |
| SK | `PROFILE` / `AADHAAR` / `LABEL#{labelId}` / `CONTACT#{contactId}` | Item type |
| GSI1 | PK=`MRN#{mrn}` SK=`PAT#{patientId}` | Lookup by MRN (AADI) |
| GSI2 | PK=`UHID#{uhid}` SK=`PAT#{patientId}` | Lookup by UHID (AHAM) |
| GSI3 | PK=`PHONE#{mobileNumber}` SK=`PAT#{patientId}` | Search by phone (KEYS_ONLY) |

### SK Patterns

| SK | Entity | Description |
|----|--------|-------------|
| `PROFILE` | PatientProfile | patientId, mrn, uhid, firstName, lastName, fullName, dateOfBirth, age ({years,months,days}), gender (M/F/O), mobileNumber, email, address ({addressLine1, addressLine2, city, cityCode, district, districtCode, state, stateCode, country, countryCode, zipcode, landmark}), aadhaarNumber (masked), patientType (GENERAL/EMERGENCY/CAMP/REFERRED), registrationDate, registrationSource (WALK_IN/OUTREACH/DIRECT), status (Active/Inactive), unitCode, organizationId, photo, bloodGroup, maritalStatus, nationality, emergencyContactName, emergencyContactNumber, insuranceDetails ({provider, policyNumber, validUntil, coverageType}), weight, height, allergiesSnapshot[], comorbidities, createdAt, updatedAt |
| `AADHAAR` | AadhaarVerification | aadhaarNumber, nameOnAadhaar, dobOnAadhaar, genderOnAadhaar, addressOnAadhaar, photoFromAadhaar, verified, verificationTimestamp, verificationSource |
| `LABEL#{labelId}` | PatientLabel | labelId, labelName, labelColor, createdBy, createdAt |
| `CONTACT#{contactId}` | EmergencyContact | contactId, contactName, contactNumber, relationship, isPrimary |

### Access Patterns

| # | Pattern | Operation | Key Condition |
|---|---------|-----------|---------------|
| 11 | Get patient by ID | GetItem (SC) | PK=`PAT#X`, SK=`PROFILE` |
| 12 | Get patient by MRN | Query GSI1 | PK=`MRN#X` |
| 13 | Get patient by UHID | Query GSI2 | PK=`UHID#X` |
| 14 | Search by phone | Query GSI3 | PK=`PHONE#X` |
| 15 | Register patient | PutItem | PK=`PAT#X`, SK=`PROFILE` |
| 16 | Update demographics | UpdateItem | PK=`PAT#X`, SK=`PROFILE` |
| 17 | Store Aadhaar KYC | PutItem | PK=`PAT#X`, SK=`AADHAAR` |
| 18 | Add/remove label | PutItem/DeleteItem | PK=`PAT#X`, SK=`LABEL#Y` |
| 19 | List labels | Query | PK=`PAT#X`, SK begins_with `LABEL#` |
| 20 | Add emergency contact | PutItem | PK=`PAT#X`, SK=`CONTACT#Y` |
| 21 | List contacts (bystanders) | Query | PK=`PAT#X`, SK begins_with `CONTACT#` |

---

## Table 3: EncounterTable

Admissions, encounters, care teams, appointments, risk scores, and comorbidities.

### Keys & GSIs

| Key | Pattern | Purpose |
|-----|---------|---------|
| PK | `ENC#{encounterNumber}` or `APT#{appointmentNumber}` or `SCHEDULE#DOC#{login}#DATE#{date}` | Encounter / Appointment / Doctor schedule |
| SK | Various (see below) | Item type |
| GSI1 | PK=`PAT#{patientId}` SK=`DATE#{admissionDate}` | Encounters by patient |
| GSI2 | PK=`DOC#{consultantLogin}#UNIT#{unitCode}` SK=`DATE#{admissionDate}` | Encounters by doctor |
| GSI3 | PK=`UNIT#{unitCode}#STATUS#{status}` SK=`WARD#{wardSort}#TIME#{lastMsgTime}` | Active/discharged by unit (patient list) |

### SK Patterns (PK=ENC#{encounterNumber})

| SK | Entity | Key Attributes |
|----|--------|---------------|
| `METADATA` | EncounterMetadata | encounterNumber, patientId, mrn, patientName, gender, dateOfBirth, weight, encounterClass (INPATIENT/OPD/EMERGENCY), status (ACTIVE/DISCHARGED/MARK_FOR_DISCHARGE/MARK_DEAD/ABSCONDED), consultantLogin, consultantName, consultantShortName, attendingConsultantLogin, attendingConsultantName, department, departmentCode, unitCode, unitName, hscId, hscName, location, wardCapability (ICU/GENERAL), wardSort, admissionDate, admissionNumber, admissionReason, visitType (NEW/FOLLOW-UP/EMERGENCY/DC), riskScore, comorbidities, mlc, pinFlag, pinOrder, unreadMsgCount, dischargeIntimation, dischargeDate, ipActivityAction, lastMsgTime, lastSyncTime, expectedDischargeDate, acsGroupId, acceptingConsultantLogin, consultantHandoverStatus, supportingConsultants[] |
| `ADMISSION` | AdmissionDetails | admissionNumber, visitType, department, primaryConsultant (map), supportingConsultants[], admissionDate, expectedDischargeDate, ward (map), bedNumber, reasonForAdmission, triage, medicoLegalCase, chargeClass |
| `TRANSFER#{timestamp}` | BedTransfer | fromLocation, toLocation, fromWard, toWard, reason, transferredBy |
| `MEMBER#{userId}` | CareTeamMember | userId, userLogin, userName, category (DOCTOR/NURSE/PARAMEDICS), isAdmin, active, mobileNo, employeeNo, addedOn |
| `TEAM_META` | CareTeamMetadata | primaryConsultant (map), mode (PRIMARY_CONSULTANT/HSC), unit (map), hsc (map), active, createdOn, createdBy, modifiedOn, modifiedBy |
| `RISK#{timestamp}` | RiskScore | riskScorePercentage, riskScoreValue, refreshDatetime, dataJson[] ({parameter_name, score, value}), aiPrediction, losDay, summary, observations |
| `COMORBIDITY#{code}` | Comorbidity | code (C/H/D/K/L/T/P/S), name, category, shortName, active, createdBy, createdOn |
| `HANDOVER#{timestamp}` | HandoverRequest | taskDefinition ({id, code: "IP-CONSULTANT-HANDOVER", name}), priority (HIGH), taskStatus (REQUESTED/ACCEPTED/REJECTED), assignee ({id, login, displayName, employeeNo}), createdBy ({id, login, displayName, employeeNo}), acceptedOn, rejectedOn, originalConsultant ({login, displayName}) |

### SK Patterns (PK=APT#{appointmentNumber})

| SK | Entity | Key Attributes |
|----|--------|---------------|
| `METADATA` | Appointment | appointmentNumber, encounterNumber, patientMrn, patientName, doctorLogin, doctorName, consultationStatus (SCHEDULED/BOOKED/ARRIVED/IN_PROGRESS/DONE/COMPLETED/CANCELLED/NO_SHOW), appointmentDate, appointmentTime, appointmentType (APPOINTMENT/VIDEO_CONSULT/TELE_CONSULT), unitCode, departmentCode, agoraAppId |
| `FOLLOWUP` | FollowUpRecord | mode (DURATION/DATE), followUpDate, duration, consultant, department, appointmentType, investigations[], notes, sourceEncounter, patientMrn, createdBy, createdOn |
| `CHAT#{timestamp}##{msgId}` | VCChatMessage | content, userType (DOCTOR/PATIENT), sender, sentTime |
| `AUDIT#{timestamp}` | VCAuditLog | auditStart, auditEnd, clientInfo |
| `OPD#{prescriptionId}` | PostVCUpload | fileType, fileName, s3Key, mimeType, md5Checksum, uploadedAt |

### SK Patterns (PK=SCHEDULE#DOC#{login}#DATE#{date})

| SK | Entity | Key Attributes |
|----|--------|---------------|
| `SLOT#{time}` | DoctorSlot | slotTime, slotDuration, isAvailable, isBooked, bookedBy, appointmentNumber |

### SK Patterns (PK=TMPL#{templateId})

| SK | Entity | Key Attributes |
|----|--------|---------------|
| `METADATA` | CareTeamTemplate | templateId, consultantLogin, unitCode, mode, active, careTeam[], createdOn, createdBy |

### Access Patterns

| # | Pattern | Operation | Key Condition |
|---|---------|-----------|---------------|
| 22 | Get encounter | GetItem (SC) | PK=`ENC#X`, SK=`METADATA` |
| 23 | Encounters by patient | Query GSI1 | PK=`PAT#X` |
| 24 | Encounters by doctor (patient list) | Query GSI2 | PK=`DOC#X#UNIT#Y` |
| 25 | Active encounters by unit | Query GSI3 | PK=`UNIT#X#STATUS#ACTIVE` |
| 26 | Discharged patients by unit | Query GSI3 | PK=`UNIT#X#STATUS#DISCHARGED` |
| 27 | Update encounter status | UpdateItem | PK=`ENC#X`, SK=`METADATA` → status, ipActivityAction |
| 28 | Get admission details | GetItem (SC) | PK=`ENC#X`, SK=`ADMISSION` |
| 29 | Get care team members | Query | PK=`ENC#X`, SK begins_with `MEMBER#` |
| 30 | Add/remove team member | PutItem/UpdateItem | PK=`ENC#X`, SK=`MEMBER#userId` |
| 31 | Get risk score history | Query | PK=`ENC#X`, SK begins_with `RISK#` |
| 32 | Store risk score | PutItem | PK=`ENC#X`, SK=`RISK#timestamp` |
| 33 | List comorbidities | Query | PK=`ENC#X`, SK begins_with `COMORBIDITY#` |
| 34 | Add/toggle comorbidity | PutItem/UpdateItem | PK=`ENC#X`, SK=`COMORBIDITY#code` |
| 35 | Get appointment | GetItem (SC) | PK=`APT#X`, SK=`METADATA` |
| 36 | Create appointment | PutItem | PK=`APT#X`, SK=`METADATA` |
| 37 | Update consultation status | UpdateItem | PK=`APT#X`, SK=`METADATA` |
| 38 | Store follow-up record | PutItem | PK=`APT#X`, SK=`FOLLOWUP` |
| 39 | Get available slots | Query | PK=`SCHEDULE#DOC#X#DATE#Y`, SK begins_with `SLOT#` |
| 40 | Create care team template | PutItem | PK=`TMPL#X`, SK=`METADATA` |
| 41 | Record bed transfer | PutItem | PK=`ENC#X`, SK=`TRANSFER#timestamp` |
| 42 | Handover request | PutItem | PK=`ENC#X`, SK=`HANDOVER#timestamp` |
| 43 | Update unread count | UpdateItem | PK=`ENC#X`, SK=`METADATA` → ADD unreadMsgCount |

---

## Table 4: ClinicalTable

The big one. All clinical data per encounter: medications, labs, radiology, clinical documents (9 types), vitals, file uploads, macros, past records, favorites, and drug/investigation catalogs.

### Keys & GSIs

| Key | Pattern | Purpose |
|-----|---------|---------|
| PK | `ENC#{encounterNumber}` or `FAV#{login}` or `CATALOG#{type}` or `MACRO#{login}` or `PASTRECORDS#{mrn}` | Encounter data / Favorites / Catalogs / Macros / Past records |
| SK | Various (see below) | Item type with prefix discrimination |
| GSI1 | PK=`PAT#{mrn}` SK=`{entityPrefix}#{sortableField}` | All cross-encounter patient queries (unified) |
| GSI2 | PK=`PENDING#{action}#{userId}` SK=`DATE#{createdDate}` | Sparse -- pending acknowledgments, sign-offs, handovers |
| GSI3 | PK=`ENC#{enc}#STATUS#{status}` SK=`DATE#{date}` | Medications by encounter+status |

### SK Patterns (PK=ENC#{encounterNumber})

**Medications:**

| SK | Entity | Key Attributes |
|----|--------|---------------|
| `MED#{medicationId}` | MedicationOrder | medicationId, status (ADDED/ORDERED/PENDING/DISPENSED/PARTIALLY_DISPENSED/ISSUED/PARTIALLY_ISSUED/CLOSED/PARTIALLY_CLOSED/CANCELLED), medication ({code, name, brand, drugForm, genericName}), daywiseDosage ({morning, afternoon, evening, night, unit}), drugFrequency ({id, code, name, frequency, periodUnit}), duration, durationUnit, quantity, route, foodInstruction, patientInstruction, prefixInstruction, prescriptionDate, isDischargeMedication, substitution, orderedBy, createdOn, modifiedOn, documentNumber, referenceNumber, cancelReason, holdReason, stopReason |
| `RECON#{reconId}` | MedicationReconciliation | reconId, status (PENDING/RECONCILED/ORDERED), reconciledDate, reconciledBy ({login, displayName}), sourceType (IMPORT/MANUAL), medications[] ({code, name, dosage, route, frequency, status}), createdOn |
| `ADMIN#MED#{medId}#TIME#{timestamp}` | MedicationAdminRecord | scheduledTime, slotPeriod (Night00-06/Morning06-11/Afternoon11-15/Evening15-20/Night20-24), slotStatus (PENDING/ADMINISTERED/OVERDUE/HOLD/REFUSED/REVIEWED/PENDING_REVIEW), administeredBy, administeredAt, modifyReason, modifyCode (R/M/W/S/V/A), dose |

**Lab Results & Investigations:**

| SK | Entity | Key Attributes |
|----|--------|---------------|
| `ORDER#{orderCode}` | InvestigationOrder | orderCode, orderName, serviceType, status (ADDED/ORDERED/INPROGRESS/REPORT_READY/PROCESSED/CANCELLED), priority (NORMAL/URGENT), instructions, orderDate, orderedBy, isProfile, documentNumber |
| `RESULT#{code}##{timestamp}` | LabResult | resultCode, resultName, displayName, value, resultType (GENERAL/PARAMETER), unit, referenceRange, abnormalFlag (N/H/L/PH/PL/AH/AL), reportHoldStatus, resultDate, parameters[] ({name, value, unit, referenceRange, abnormalFlag}), reports[] ({reportType, documentName, extension, s3Key}) |
| `RAD#{studyUID}` | RadiologyResult | studyUID, modality (CT/MRI/XRay/US), studyName, studyDate, orderDate, orderNumber, orderStatus, images[] ({frameNo, name, filePath, extension, s3ThumbnailKey}), aiMediaFindings[] ({diagnosis, heatMapImageURL, s3HeatmapKey}), reportType, reportS3Key |

**Clinical Documents:**

| SK | Entity | Key Attributes |
|----|--------|---------------|
| `DOC#PN#{documentNumber}` | ProgressNote | documentNumber, text (HTML), sourceDepartment, status (DRAFT/SUBMITTED/ACKNOWLEDGED), submittedBy, submittedDate, acknowledgedBy, pad, ppd, createdOn, createdBy, vitals[], medications[], investigations[], crossConsultations[] |
| `DOC#DS#{documentNumber}` | DischargeSummary | documentNumber, status (NEW/DRAFT/SENT_FOR_REVIEW/UNDER_REVIEW/AMENDMENT/SIGN_OFF/COMPLETE), admissionNumber, patientDetails, **28 HTML sections**: admissionReason, chiefComplaint, medicalHistory, surgicalHistory, familyHistory, socialHistory, pastMedicationHistory, vitalSign, allergy, generalExamination, systemicExamination, investigationResults, provisionalDiagnosis, finalDiagnosis, medicationAtDischarge, crossConsultation, conditionAtDischarge, dischargeAdvice, dietaryAdvice, therapyAdvice, operationAndProcedure, followUp, causeOfDeath, activeMedication, comorbidities, urgentCare, diagnosis. comments[], amended, amendDetails[] |
| `DOC#IA#{documentNumber}` | InitialAssessment | status, submittedBy, submittedOn |
| `DOC#IA#{docNo}#WGT#{widgetKey}` | IAWidget | 27 widget types: allergy, comorbidities, chiefComplaint, socialHistory, medical-history, surgicalHistory, implantable_devices, family-history, relevant_personal_investigations, investigation_results, past_medication_and_reconciliation, vital_signs, general_examination, systemic-examination, maternalAndChildHealth, diagnosis, investigations_advised, treatment_plan, dischargePlan, psychologyAssessment, communicableDiseases, radiation_oncology, general_impression, mlc, primary_survey, lines_and_tubes, psychological. Each has concept (map), reference, encounter, patient, version, active, latest |
| `DOC#CK#{checklistNumber}` | Checklist | checklistNumber, code, name, type, applicableFor, version, latest, status (PENDING/DRAFT/PENDING_APPROVAL/COMPLETED/REJECTED), responseType ({code: "yes/no"/"tick", displayName}), sequentialAnswering, witness (MANDATORY/OPTIONAL/null), questions[] ({question, displayOrder, mandatory, defaultResponse, enableRemarks, answer: "YES"/"NO"/null, remarks}), consultant ({displayName, login, employeeNo}), patient ({mrn, name, birthDate, gender, weight}), encounter ({documentNumber}), otRequestNumber, submittedBy ({login, displayName, employeeNo}), submittedOn, witnessedBy, witnessedOn, reviewRequired, remarks, rejectReason, createdBy, createdOn |
| `DOC#OP#{otRequestNo}` | OperationNote | otRequestNo, draft, source, status (IN_PROGRESS/ON_HOLD/DEFERRED/COMPLETED), scheduledDateTime, operationType (NORMAL/EMERGENCY), surgeons[], assistantSurgeons[], anaesthetists[], scrubNurse[], floorNurse[], preOperativeDiagnosis[] (SNOMED-CT), postOperativeDiagnosis[], operations[] ({surgery: {id,name,code}, snomed: {name,code}}), operationNotes (HTML), findings (HTML), perioperativeComplications (HTML), detailsOfProcedure (HTML), surgicalSpecimen (HTML), postOpNotes (HTML) |
| `DOC#PAC#{pacId}` | PreAnesthesiaCheckup | pacId, version, status (Cleared/Re-evaluation Required/Not Cleared), asaGrade (I-VI), generalExamination ({records[], noAbnormalityDetected, notes}), systemicExamination ({respiratorySystems, cnsMusculoskeletal, endocrine, cardioVascularSystems, hepaticRenal, others}), airwayAssessment ({mouthOpening, teeth: {normal, remarks}, neckMovements: {normal, remarks}, intubationDifficulty: {check, remarks}, met: {score}, deepVeinThrombosis: {score, text}, asa: {score, text}}), ecgImpression, echoImpression, xrayImpression, previousAnaesthesia, anaesthesiaPlan ({planType[], postOpICURequired: {check, remarks}, bloodProductRequired: {check, remarks}, npo}), advice, remarks, source (AADI), assessedBy, assessedOn |
| `DOC#CC#{documentNumber}` | CrossConsultation | doctorId, unitId, departmentId, remarks, priority (NORMAL/Urgent), commentedOn |
| `DOC#IR#{timestamp}` | IncidentReport | description (max 2000 chars), reportedOn, reporterLogin, reporterName, reporterType (STAFF), status (NEW), type (PATIENT), party (PATIENT), documents[], documentsDetails[] |
| `DOC#CTS#{timestamp}` | CTScorecard | id, score (0-25), recordDate, parameters[], assessedBy ({login, displayName}), assessedOn, modifiedBy, modifiedOn, active, patientInfoId |

**Vitals:**

| SK | Entity | Key Attributes |
|----|--------|---------------|
| `VITAL#{date}#{time}` | VitalReading | systolicBP, diastolicBP, pulse, temperature, temperatureUnit, spO2, respiratoryRate, weight, height, bmi, painScore, bloodSugar, gcsScore, urineOutput, arterialPressureSys/Dia, bpLyingSys/Dia, bpStandingSys/Dia, bpSittingSys/Dia, crt, chewsScore, customVitals (map), recordedBy, recordedAt, source (MANUAL/DEVICE/IMPORT) |

**File Uploads:**

| SK | Entity | Key Attributes |
|----|--------|---------------|
| `FILE#{documentId}` | FileUpload | documentId, documentType (PRESCRIPTION/LAB_REPORT/IMAGING/CONSENT/ID_PROOF/GENERAL), fileName, s3Key, s3Bucket, mimeType, fileSize, uploadedAt, uploadedBy, description |

### SK Patterns (Other PKs)

| PK | SK | Entity | Description |
|----|-----|--------|-------------|
| `FAV#{login}` | `MED#{drugCode}` | MedicationFavorite | Doctor's medication favorites |
| `FAV#{login}` | `INV#{serviceCode}` | InvestigationFavorite | Doctor's investigation favorites |
| `CATALOG#DRUG` | `#{drugNameNormalized}` | DrugCatalog | Drug reference: drugCode, drugName, genericName, drugForm, medType (BRAND/GENERIC), defaultDosage, defaultRoute, monographHtml |
| `CATALOG#INV` | `#{serviceName}` | InvestigationCatalog | Investigation reference: serviceCode, serviceName, serviceType |
| `MACRO#{login}` | `TYPE#{widgetType}##{macroId}` | ClinicalMacro | title, notes, chiefComplaints, widgetName, widgetType |
| `PASTRECORDS#{mrn}` | `VISIT#{consultationDate}` | PastRecordSummary | visitDisplay (OP/IP), appointmentType, department, consultantName, chiefComplaints[], diagnoses[], notes[], hasMedications, hasInvestigations, hasAttachments |

### GSI1 Unified Patient Index

One GSI serves all cross-encounter patient queries via SK prefix:

```
GSI1 PK = PAT#{mrn}

  SK = MED#STATUS#ACTIVE#MED-001       → active medications
  SK = MED#STATUS#CLOSED#MED-002       → closed medications
  SK = RESULT#2026-04-23#CBC           → lab result
  SK = RAD#2026-04-23#1.2.3.4          → radiology result
  SK = DOC#PN#2026-04-23#PN-001        → progress note
  SK = DOC#DS#2026-04-20#DS-001        → discharge summary
  SK = VITAL#2026-04-23#10:30          → vital reading
  SK = FILE#2026-04-23#DOC-001         → uploaded file
```

**Queries:**

| Query | GSI1 Key Condition |
|-------|-------------------|
| All meds for patient | PK=`PAT#MRN001`, SK begins_with `MED#` |
| Active meds only | PK=`PAT#MRN001`, SK begins_with `MED#STATUS#ACTIVE` |
| Lab results | PK=`PAT#MRN001`, SK begins_with `RESULT#` |
| Lab results in date range | PK=`PAT#MRN001`, SK between `RESULT#2026-04-20` and `RESULT#2026-04-24` |
| Progress notes | PK=`PAT#MRN001`, SK begins_with `DOC#PN#` |
| All clinical docs | PK=`PAT#MRN001`, SK begins_with `DOC#` |
| Vitals | PK=`PAT#MRN001`, SK begins_with `VITAL#` |
| Uploaded files | PK=`PAT#MRN001`, SK begins_with `FILE#` |
| Everything for patient | PK=`PAT#MRN001` (no SK condition) |

### GSI2 Sparse Pending Actions

Only items needing action have GSI2PK populated:

| Action | GSI2PK | Items |
|--------|--------|-------|
| PN Acknowledgment | `PENDING#ACK#{consultantLogin}` | Progress notes awaiting ack |
| DS Sign-off | `PENDING#SIGNOFF#{unitCode}` | DS pending sign-off |
| DS Review | `PENDING#REVIEW#{reviewerLogin}` | DS pending review |
| IA Review | `PENDING#IAREVIEW#{unitCode}` | IA pending review |
| CK Approval | `PENDING#CKAPPROVAL#{unitCode}` | Checklists pending approval |

When action completes → REMOVE GSI2PK, GSI2SK (item disappears from index).

### Access Patterns

| # | Pattern | Operation | Key Condition |
|---|---------|-----------|---------------|
| 44 | List medications for encounter | Query | PK=`ENC#X`, SK begins_with `MED#` |
| 45 | Get specific medication | GetItem (SC) | PK=`ENC#X`, SK=`MED#Y` |
| 46 | Create medication order | PutItem | PK=`ENC#X`, SK=`MED#Y` |
| 47 | Update medication status | UpdateItem | PK=`ENC#X`, SK=`MED#Y` |
| 48 | Delete medication (ADDED only) | DeleteItem | PK=`ENC#X`, SK=`MED#Y` |
| 49 | Record medication administration | PutItem | PK=`ENC#X`, SK=`ADMIN#MED#Y#TIME#Z` |
| 50 | Get admin slots for medication | Query | PK=`ENC#X`, SK begins_with `ADMIN#MED#Y` |
| 51 | Active meds by patient | Query GSI1 | PK=`PAT#MRN`, SK begins_with `MED#STATUS#ACTIVE` |
| 52 | List medication favorites | Query | PK=`FAV#login`, SK begins_with `MED#` |
| 53 | Search drug catalog | Query | PK=`CATALOG#DRUG`, SK begins_with `{searchPrefix}` |
| 54 | List investigation orders | Query | PK=`ENC#X`, SK begins_with `ORDER#` |
| 55 | Create investigation order | PutItem | PK=`ENC#X`, SK=`ORDER#code` |
| 56 | List lab results for encounter | Query | PK=`ENC#X`, SK begins_with `RESULT#` |
| 57 | Store lab result | PutItem | PK=`ENC#X`, SK=`RESULT#code#timestamp` |
| 58 | Patient results (cross-encounter) | Query GSI1 | PK=`PAT#MRN`, SK begins_with `RESULT#` |
| 59 | Patient results in date range | Query GSI1 | PK=`PAT#MRN`, SK between `RESULT#from` and `RESULT#to` |
| 60 | Get radiology result | GetItem (SC) | PK=`ENC#X`, SK=`RAD#studyUID` |
| 61 | List radiology results | Query | PK=`ENC#X`, SK begins_with `RAD#` |
| 62 | List progress notes | Query | PK=`ENC#X`, SK begins_with `DOC#PN#` |
| 63 | Create progress note | PutItem | PK=`ENC#X`, SK=`DOC#PN#docNo` |
| 64 | Get discharge summary | GetItem (SC) | PK=`ENC#X`, SK=`DOC#DS#docNo` |
| 65 | Pending PN acknowledgments | Query GSI2 | PK=`PENDING#ACK#login` |
| 66 | Pending DS sign-offs | Query GSI2 | PK=`PENDING#SIGNOFF#unitCode` |
| 67 | Acknowledge PN (atomic) | TransactWrite | UPDATE status + REMOVE GSI2PK/GSI2SK |
| 68 | List checklists | Query | PK=`ENC#X`, SK begins_with `DOC#CK#` |
| 69 | Get operation note | GetItem (SC) | PK=`ENC#X`, SK=`DOC#OP#otReqNo` |
| 70 | Get PAC | GetItem (SC) | PK=`ENC#X`, SK=`DOC#PAC#pacId` |
| 71 | List cross-consultations | Query | PK=`ENC#X`, SK begins_with `DOC#CC#` |
| 72 | Store incident report | PutItem | PK=`ENC#X`, SK=`DOC#IR#timestamp` |
| 73 | Store CT scorecard | PutItem | PK=`ENC#X`, SK=`DOC#CTS#timestamp` |
| 74 | Get vitals for encounter | Query | PK=`ENC#X`, SK begins_with `VITAL#` |
| 75 | Record vital signs | PutItem | PK=`ENC#X`, SK=`VITAL#date#time` |
| 76 | Patient vitals (cross-encounter) | Query GSI1 | PK=`PAT#MRN`, SK begins_with `VITAL#` |
| 77 | Upload file | PutItem | PK=`ENC#X`, SK=`FILE#docId` |
| 78 | List files for encounter | Query | PK=`ENC#X`, SK begins_with `FILE#` |
| 79 | Save clinical macro | PutItem | PK=`MACRO#login`, SK=`TYPE#widgetType#macroId` |
| 80 | List macros by widget type | Query | PK=`MACRO#login`, SK begins_with `TYPE#widgetType` |
| 81 | List past record summaries | Query | PK=`PASTRECORDS#mrn`, SK begins_with `VISIT#` |
| 82 | Get IA widget data | GetItem | PK=`ENC#X`, SK=`DOC#IA#docNo#WGT#widgetKey` |
| 83 | Save IA widget | PutItem | PK=`ENC#X`, SK=`DOC#IA#docNo#WGT#widgetKey` |

---

## Table 5: MessageTable

Patient clinical messages (AADI) + ACS chat conversations (AHAM) in one table.

### Keys & GSIs

| Key | Pattern | Purpose |
|-----|---------|---------|
| PK | `PAT#{mrn}#ENC#{enc}` (patient msgs) or `THREAD#{threadId}` (chat) | Message context |
| SK | `MSG#{timestamp}##{messageId}` or `METADATA` or `PART#{userId}` | Item type |
| GSI1 | PK=`ASSIGNED#{userId}` SK=`LAST_MSG#{timestamp}` | My chat conversations |
| GSI2 | PK=`UNIT#{unitCode}` SK=`LAST_MSG#{timestamp}` | All chat conversations by unit |
| GSI3 | PK=`PAT#{patientId}` SK=`THREAD#{threadId}` | Chat conversations by patient (KEYS_ONLY) |

### SK Patterns (PK=PAT#{mrn}#ENC#{enc}) -- Patient Messages

| SK | Entity | Key Attributes |
|----|--------|---------------|
| `MSG#{timestamp}##{messageId}` | PatientMessage | messageId, patientName, category (LAB_RESULT/RAD_RESULT/DISCHARGE_SUMMARY/CHAT/INVESTIGATION_ORDER/MEDICATION_ORDER/ADMISSION_MESSAGE/PROGRESS_NOTES/CROSS_CONSULTATION/SYSTEM_REMINDER/INVESTIGATION_REPORT/BED_TRANSFER/VITALS/ASSESSMENT_FORM/DISCHARGE_INTIMATION/INITIAL_ASSESSMENT), subCategory (AUDIO/TEXT/VIDEO/IMAGE/PDF/DOC/OTHERS), contentType (TEXT/JSON), content, senderLogin, senderName, sentTime, receivedTime, actionId, messageStatus (NOT_SENT/SUCCESS/FAILURE/IN_PROGRESS), read (0/1), msgStarred, msgDeleted, parentMessageId, action (SAVE/DELETE/PUBLISH), context (PATIENT_INFO/PATIENT_MESSAGE/CARE_TEAM/DIRECT_MESSAGE) |

### SK Patterns (PK=THREAD#{threadId}) -- ACS Chat

| SK | Entity | Key Attributes |
|----|--------|---------------|
| `METADATA` | ChatConversation | threadId, conversationId, topic, patientId, patientName, uhid, assignedTo, assignedToName, assignType (ASSIGN/DELEGATE/REASSIGN), status, unitCode, lastMessage, lastMessageOn, unreadCount, createdOn |
| `MSG#{timestamp}##{messageId}` | ChatMessage | messageId, senderId, senderDisplayName, content, type (text/attachment/system), createdOn, deletedOn, metadata (map), attachments[] ({attachmentId, fileName, fileUrl, mimeType, fileSize}), ttl |
| `PART#{userId}` | ChatParticipant | userId, displayName, role, joinedOn, isActive |

### Access Patterns

| # | Pattern | Operation | Key Condition |
|---|---------|-----------|---------------|
| 84 | List patient messages | Query | PK=`PAT#MRN#ENC#X`, SK begins_with `MSG#` |
| 85 | Send patient message | PutItem | PK=`PAT#MRN#ENC#X`, SK=`MSG#time#id` |
| 86 | Mark message read | UpdateItem | PK=`PAT#MRN#ENC#X`, SK=`MSG#time#id` → read=1 |
| 87 | Star/unstar message | UpdateItem | PK=`PAT#MRN#ENC#X`, SK=`MSG#time#id` → msgStarred |
| 88 | Sync messages since time | Query | PK=`PAT#MRN#ENC#X`, SK > `MSG#lastSyncTime` |
| 89 | Get chat conversation | GetItem | PK=`THREAD#X`, SK=`METADATA` |
| 90 | List chat messages | Query | PK=`THREAD#X`, SK begins_with `MSG#` |
| 91 | Send chat message | PutItem | PK=`THREAD#X`, SK=`MSG#time#id` |
| 92 | Delete chat message | UpdateItem | PK=`THREAD#X`, SK=`MSG#time#id` → set deletedOn |
| 93 | My conversations | Query GSI1 | PK=`ASSIGNED#userId` |
| 94 | All unit conversations | Query GSI2 | PK=`UNIT#unitCode` |
| 95 | Assign/delegate/reassign | UpdateItem | PK=`THREAD#X`, SK=`METADATA` → assignedTo, assignType |
| 96 | Patient conversations | Query GSI3 | PK=`PAT#patientId` |

---

## Table 6: TaskWorkflowTable

All task types: 7 AADI clinical + 13 AHAM billing = 20 task types.

### Keys & GSIs

| Key | Pattern | Purpose |
|-----|---------|---------|
| PK | `TASK#{taskId}` | Task identity |
| SK | `METADATA` / `VARS` / `COMMENT#{timestamp}` | Item type |
| GSI1 | PK=`ASSIGNEE#{userId}` SK=`STATUS#{status}#CREATED#{timestamp}` | My tasks (personal queue) |
| GSI2 | PK=`UNIT#{unitCode}#STATUS#{status}` SK=`TYPE#{taskName}#CREATED#{timestamp}` | Group/all tasks by unit |

### Task Types

**AADI Clinical (7):** PROGRESS-NOTES-ACKNOWLEDGEMENT, DISCHARGE_SUMMARY_CREATION, DISCHARGE_SUMMARY_SIGNOFF, INITIAL_ASSESSMENT_REVIEW, CHECKLIST_TASK_APPROVAL, CROSS_CONSULTATION, NURSING-CAPTURE-NOTES

**AHAM Billing (13):** Invoice Generation Approval, Discount Approval, Receipt Approval, Receipt Cancellation, Refund Approval, Reversal Invoice Approval, Retrospect Invoice Initiation, Retrospect Invoice Approval, UnBilled Invoice Approval, HighValue MedicationRequest Approval, Authorization Approval, Mandatory Brand Approval, Invoice Cancellation

### SK Patterns

| SK | Entity | Key Attributes |
|----|--------|---------------|
| `METADATA` | TaskMetadata | taskId, taskName, taskStatus (OPEN/CLAIMED/IN_PROGRESS/DONE/CLOSED), processInstanceId, containerId, actualOwner, createdBy, createdOn, activationTime, priority, processId, description, subject, documentNo, patientId, uhid, unitCode, taskSource (AADI/AHAM), ttl |
| `VARS` | TaskProcessVariables | documentNo, documentType, invoiceData (map), receiptData (map), refundData (map), patientId, uhid, unitCode, additionalData (map) |
| `COMMENT#{timestamp}` | TaskComment | commentedOn, commentedBy, commentedByName, comment |

### Access Patterns

| # | Pattern | Operation | Key Condition |
|---|---------|-----------|---------------|
| 97 | Get task | GetItem (SC) | PK=`TASK#X`, SK=`METADATA` |
| 98 | Create task | PutItem | PK=`TASK#X`, SK=`METADATA` |
| 99 | Claim task (with condition) | UpdateItem | PK=`TASK#X`, SK=`METADATA` → CONDITION taskStatus=OPEN AND attribute_not_exists(actualOwner) |
| 100 | Release task | UpdateItem | PK=`TASK#X`, SK=`METADATA` → taskStatus=OPEN, REMOVE actualOwner |
| 101 | Complete task | UpdateItem | PK=`TASK#X`, SK=`METADATA` → taskStatus=DONE |
| 102 | My tasks | Query GSI1 | PK=`ASSIGNEE#userId` |
| 103 | Group tasks (open) | Query GSI2 | PK=`UNIT#X#STATUS#OPEN` |
| 104 | Tasks by type | Query GSI2 | PK=`UNIT#X#STATUS#OPEN`, SK begins_with `TYPE#Invoice Generation` |
| 105 | Get process variables | GetItem | PK=`TASK#X`, SK=`VARS` |
| 106 | Store process variables | PutItem | PK=`TASK#X`, SK=`VARS` |
| 107 | Add comment | PutItem | PK=`TASK#X`, SK=`COMMENT#timestamp` |
| 108 | List comments | Query | PK=`TASK#X`, SK begins_with `COMMENT#` |

---

## Table 7: BillingTable

Invoices, receipts, refunds with hierarchical sort key pattern.

### Keys & GSIs

| Key | Pattern | Purpose |
|-----|---------|---------|
| PK | `PAT#{patientId}` | Patient billing |
| SK | `INV#{invoiceNo}` / `INV#X#REC#{receiptNo}` / `INV#X#REC#Y#REF#{refundNo}` / `UNBILL#{docNo}` / `MEDREQ#{reqId}` | Hierarchical billing docs |
| GSI1 | PK=`UNIT#{unitCode}#STATUS#{status}` SK=`DATE#{invoiceDate}` | Invoices by unit+status |
| GSI2 | PK=`INVNO#{invoiceNo}` SK=`PAT#{patientId}` | Lookup by invoice number |

### Hierarchy

```
PAT#P-100234
├── INV#INV-001                           → Invoice
│   ├── INV#INV-001#LINE#L-001            → Line item
│   ├── INV#INV-001#LINE#L-002            → Line item
│   ├── INV#INV-001#DISC#D-001            → Discount
│   ├── INV#INV-001#AUTH#A-001            → Authorization
│   ├── INV#INV-001#REC#REC-001           → Receipt
│   │   └── INV#INV-001#REC#REC-001#REF#REF-001 → Refund
│   └── INV#INV-001#REC#REC-002           → Receipt 2
│   └── INV#INV-001#REVERSAL#REV-001       → Reversal invoice
├── UNBILL#UB-001                         → Unbilled document
└── MEDREQ#MR-001                         → High-value med request
```

### Key Attributes

**Invoice:** invoiceNo, patientId, uhid, patientName, encounterNo, unitCode, departmentCode, invoiceDate, invoiceStatus, invoiceType, grossAmount, netAmount, taxAmount, patientPayable, sponsorAmount, totalAmount, patientDiscount, sponsorDiscount, discretionaryDiscount, nonDiscretionaryDiscount, planDiscountAmount, createdBy, createdAt, approvedBy, approvedAt, remarks

**Receipt:** receiptNo, invoiceNo, receiptAmount, paymentMode, receiptDate, receiptStatus, cancellationAmount, reasonForCancellation, cancelledBy, cancelledAt, createdBy, createdAt, unitCode

**Refund:** refundNo, receiptNo, invoiceNo, refundAmount, refundMode, refundDate, refundStatus, reasonForRefund, approvedBy, approvedAt, createdBy, createdAt, unitCode

**Line Item (INV#X#LINE#L-001):** lineItemId, serviceCode, serviceName, quantity, unitPrice, amount, discount, netAmount, taxAmount, departmentCode, remarks

**Discount (INV#X#DISC#D-001):** discountId, discountType (DISCRETIONARY/NON_DISCRETIONARY/PLAN/PATIENT/SPONSOR), discountPercentage, appliedAmount, approvalRequired, appliedBy, approvedBy, remarks

**Authorization (INV#X#AUTH#A-001):** authorizationId, authorizationNumber, authStatus (PENDING/APPROVED/REJECTED/EXPIRED/CANCELLED), authAmount, scope, authorizedProcedures[], validUntil, provider, requestedBy, approvedBy

**Unbilled Document (UNBILL#UB-001):** documentNo, patientName, uhid, encounterNo, unbilledAmount, serviceDate, departmentCode, unitCode, status, lineItems[], createdBy, createdAt

**Medication Request (MEDREQ#MR-001):** requestId, medicationName, dosage, requestedAmount, isHighValue, status, justification, approvalThreshold, createdBy, createdOn, unitCode

**Reversal Invoice (INV#X#REVERSAL#REV-001):** reversalId, originalInvoiceNo, reversalAmount, reversalReason, reversedBy, reversedAt, status

### Access Patterns

| # | Pattern | Operation | Key Condition |
|---|---------|-----------|---------------|
| 109 | All billing for patient | Query | PK=`PAT#X` |
| 110 | Invoice with all children | Query | PK=`PAT#X`, SK begins_with `INV#INV-001` |
| 111 | Get specific invoice | GetItem | PK=`PAT#X`, SK=`INV#INV-001` |
| 112 | Create invoice | PutItem | PK=`PAT#X`, SK=`INV#Y` |
| 113 | Create receipt | PutItem | PK=`PAT#X`, SK=`INV#Y#REC#Z` |
| 114 | Create refund | PutItem | PK=`PAT#X`, SK=`INV#Y#REC#Z#REF#W` |
| 115 | Invoices by unit+status | Query GSI1 | PK=`UNIT#X#STATUS#Y` |
| 116 | Lookup by invoice number | Query GSI2 | PK=`INVNO#X` |
| 117 | Unbilled documents | Query | PK=`PAT#X`, SK begins_with `UNBILL#` |

---

## Table 8: CampOutreachTable

Health camps with adjacency list for camp-patient relationships.

### Keys & GSIs

| Key | Pattern | Purpose |
|-----|---------|---------|
| PK | `CAMP#{campId}` | Camp identity |
| SK | `METADATA` / `PAT#{patientId}` / `COORD#{coordId}` / `CONS#{consId}` / `TEMP#{tempId}` / `WPAT#{wpatId}` | Item type |
| GSI1 | PK=`UNIT#{unitCode}#STATUS#{status}` SK=`DATE#{startDate}` | Camps by unit+status |
| GSI2 | PK=`PAT#{patientId}` SK=`CAMP#{campId}` | Reverse lookup: camps for patient |

### Camp Lifecycle

```
NOT_STARTED → IN_PROGRESS → DONE
     └── CANCELLED
```

### SK Patterns

| SK | Entity | Key Attributes |
|----|--------|---------------|
| `METADATA` | CampMetadata | campId, campName, campCode, status, startDate, endDate, location, address (map), organizationId, unitCode, totalPatients, createdBy, createdAt |
| `PAT#{patientId}` | CampPatient | campPatientId, patientId, uhid, tempId, patientName, mobileNumber, gender, age (map), registeredAt, registeredBy, registrationStatus, consultationStatus, notes |
| `COORD#{coordId}` | CampCoordinator | coordinatorId, name, mobileNumber, email, role, isActive |
| `CONS#{consId}` | CampConsultant | consultantId, displayName, department, designation |
| `TEMP#{tempId}` | TempRegistration | tempId, patientName, mobileNumber, campId, status, assignedUhid |
| `WPAT#{wpatId}` | WorkPattern | workPatternId, resourceId, date, slots[], maxOverBooking, isActive |

### Access Patterns

| # | Pattern | Operation | Key Condition |
|---|---------|-----------|---------------|
| 118 | Get camp details | GetItem (SC) | PK=`CAMP#X`, SK=`METADATA` |
| 119 | Camps by unit+status | Query GSI1 | PK=`UNIT#X#STATUS#Y` |
| 120 | Update camp status | UpdateItem | PK=`CAMP#X`, SK=`METADATA` |
| 121 | List camp patients | Query | PK=`CAMP#X`, SK begins_with `PAT#` |
| 122 | Register patient | PutItem | PK=`CAMP#X`, SK=`PAT#Y` |
| 123 | Camps for patient (reverse) | Query GSI2 | PK=`PAT#X` |
| 124 | List temp registrations | Query | PK=`CAMP#X`, SK begins_with `TEMP#` |
| 125 | Update coordinators | PutItem | PK=`CAMP#X`, SK=`COORD#Y` |

---

## Table 9: PlatformTable

System configuration, geography, organizations, audit, and feedback. No GSIs.

### Key Patterns

| PK | SK | Entity | Description |
|----|-----|--------|-------------|
| `CONFIG#APP` | `LATEST` | AppConfig | appVersion, forceUpdate, maintenanceMode, maintenanceMessage, features (map), apiBaseUrl, acsEndpoint, chatEnabled, campEnabled, lastUpdated |
| `CONFIG#DOWNTIME` | `LATEST` | DowntimeInfo | active, message, startTime, endTime |
| `CONFIG#ORG` | `ORG#{orgId}` | Organization | organizationId, organizationName, organizationType, isActive |
| `CONFIG#ORG##{orgId}` | `UNIT#{unitCode}` | OrgUnit | unitCode, unitName, address (map), isActive |
| `CONFIG#FAQ` | `CAT#{categoryId}` | FAQCategory | categoryId, categoryName, questions[] |
| `GEO#COUNTRY` | `#{countryCode}` | Country | code, name, isActive |
| `GEO#STATE` | `#{countryCode}##{stateCode}` | State | code, name, parentCode, isActive |
| `GEO#DISTRICT` | `#{countryCode}##{stateCode}##{districtCode}` | District | code, name, parentCode, isActive |
| `GEO#CITY` | `#{stateCode}##{cityCode}` | City | code, name, parentCode, isActive |
| `GEO#ZIPCODE` | `#{zipcode}` | Zipcode | zipcode, area, cityCode, districtCode, stateCode, countryCode |
| `AUDIT##{YYYY-MM-DD}` | `#{timestamp}##{eventId}` | AuditEvent | eventDate, logLevel, eventCategory, eventAction, requestUrl, requestMethod, responseStatus, errorMessage, serviceName, ttl (90 days) |
| `FEEDBACK#{userId}` | `#{surveyId}` | FeedbackSurvey | surveyType, status (PENDING/COMPLETED), responses (map), completedAt |

### Access Patterns

| # | Pattern | Operation | Key Condition |
|---|---------|-----------|---------------|
| 126 | Get app config | GetItem | PK=`CONFIG#APP`, SK=`LATEST` |
| 127 | Lookup zipcode | GetItem | PK=`GEO#ZIPCODE`, SK=`560001` |
| 128 | List states by country | Query | PK=`GEO#STATE`, SK begins_with `IN#` |
| 129 | List cities by state | Query | PK=`GEO#CITY`, SK begins_with `KA#` |
| 130 | List organizations | Query | PK=`CONFIG#ORG`, SK begins_with `ORG#` |
| 131 | List units for org | Query | PK=`CONFIG#ORG#NH`, SK begins_with `UNIT#` |
| 132 | Store audit event | PutItem | PK=`AUDIT#2026-04-23`, SK=`timestamp#eventId` |
| 133 | Get pending surveys | Query | PK=`FEEDBACK#userId`, filter status=PENDING |

---

## Design Decisions Summary

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | 9 tables (not 16) | Merged tables with same PK axis; reduced GSIs from 38 to 21 |
| 2 | ClinicalTable unified GSI1 | 4 separate PAT#{mrn} GSIs collapsed into 1 via SK prefix |
| 3 | Sparse GSI2 on ClinicalTable | Only pending-action items appear; zero cost when nothing pending |
| 4 | Encounter-centric clinical data | All clinical data partitioned by encounter (natural access pattern) |
| 5 | Hierarchical SK on BillingTable | Invoice → Receipt → Refund hierarchy via SK nesting |
| 6 | Adjacency list on CampOutreachTable | Many-to-many camp-patient via GSI2 reverse lookup |
| 7 | MessageTable dual PK | Patient messages use PAT#MRN#ENC#X; Chat uses THREAD#X |
| 8 | Vitals in ClinicalTable | 3/day volume is small enough; split to own table if volume grows |
| 9 | File uploads in ClinicalTable | Files are clinical artifacts viewed per-encounter |
| 10 | Denormalization | Patient name/MRN copied to all tables; DDB Streams propagation |
| 11 | CampOutreachTable separate | Own lifecycle, AHAM-only, adjacency list pattern |
| 12 | PlatformTable (no GSIs) | Static reference data; all queries are PK+SK direct lookups |

---

## Denormalized Fields (copied across tables)

| Field | Source | Copied To | Update Strategy |
|-------|--------|-----------|----------------|
| patientName, mrn, gender, dateOfBirth | PatientTable | EncounterTable, ClinicalTable, MessageTable, BillingTable | DDB Streams + Lambda |
| consultantName, consultantLogin | UserStaffTable | EncounterTable, ClinicalTable | DDB Streams + Lambda |
| unitCode, unitName | PlatformTable | EncounterTable, TaskWorkflowTable | Rarely changes; manual |

---

## Estimated Costs (MCP Tool Output)

**Total: $4,521.58/mo** (on-demand, us-east-1) -- 11% less than V1 ($5,054) due to 18 fewer GSIs.

**Note:** Read/write costs assume representative RPS. Actual costs will vary. Storage costs are confirmed.

### Storage

| Table | Items | Avg Size | Storage | Cost/mo |
|-------|-------|----------|---------|---------|
| ClinicalTable + GSIs | ~70M | 1-15KB | ~430 GB | ~$107 |
| MessageTable + GSIs | ~30M | 800B-1KB | ~29 GB | ~$7 |
| EncounterTable + GSIs | ~2M | 2-3KB | ~24 GB | ~$6 |
| BillingTable + GSIs | ~5M | 2-3KB | ~19 GB | ~$5 |
| TaskWorkflowTable + GSIs | ~2M | 2KB | ~6 GB | ~$2 |
| PatientTable + GSIs | ~500K | 2KB | ~3 GB | ~$1 |
| CampOutreachTable + GSIs | ~200K | 1KB | ~0.5 GB | ~$0.1 |
| UserStaffTable + GSIs | ~15K | 1.5KB | ~0.05 GB | ~$0.01 |
| PlatformTable | ~100K | 500B | ~0.05 GB | ~$0.01 |
| **Total** | | | **~512 GB** | **~$128/mo** |

### V1 vs V2 Comparison

| Metric | V1 (16 tables) | V2 (9 tables) | Delta |
|--------|---------------|---------------|-------|
| Tables | 16 | 9 | -44% |
| GSIs | 38 | 21 | -45% |
| Monthly cost | $5,054 | $4,522 | -11% |
| Storage | 240 GB | 512 GB* | +113%* |

*Storage increase is from GSI1 on ClinicalTable projecting ALL for 70M items. Use INCLUDE projection to reduce.

---

## Migration Note

If vitals volume increases beyond 3/day (e.g., continuous ICU monitoring), split:
- Move `VITAL#` items from ClinicalTable → dedicated VitalsTable
- VitalsTable would use daily partitioning: PK=`ENC#X#DATE#YYYY-MM-DD`, SK=`TIME#HH:mm:ss`
- Add TTL (2 years) on VitalsTable
- No other changes needed; GSI1 pattern remains the same

---

## V2 Validation Log

### Iteration 1: Cross-Reference Against Source Specs

**Agents analyzed:** 14 AADI specs + 10 AHAM specs against all 9 tables.

**163 gaps identified. Triaged as:**
- Critical (structural/access pattern): 15 → FIXED
- Important (missing fields affecting functionality): 30 → FIXED (key ones)
- Noise (sub-field enumeration, documentation): 118 → Deferred (no impact on design correctness)

**Fixes applied:**
1. BillingTable: Added LineItem, Discount, Authorization, UnbilledDocument, MedicationRequest, ReversalInvoice entity definitions with full key attributes
2. ClinicalTable: Expanded MedicationReconciliation from "reconciliation data" to full structure
3. ClinicalTable: CT Scorecard expanded from 4 fields to 10 fields
4. ClinicalTable: PAC expanded with version, status, full nested structures
5. ClinicalTable: Checklist expanded with code, applicableFor, version, latest, otRequestNumber, reviewRequired, full question structure
6. EncounterTable: HandoverRequest expanded with acceptedOn, rejectedOn, originalConsultant, structured assignee/createdBy

**Not fixed (by design):**
- Enumerating all 11 vital type field names (already listed, just not color-coded)
- Repeating enum values that are obvious from context (e.g., reportType variants)
- Sub-field structures of DynamoDB Map attributes (implementation detail, not design)
- Missing "messageId in VCChatMessage" (it's in the SK: `CHAT#{timestamp}##{msgId}`)
- Drug interaction/monograph "cache" items (these are fetched from ATHMA EHR API, not stored in DDB)

### Iteration 2: Schema Validation + Cost Analysis

**MCP Schema Validation:**
- `ClinicalTable_schema.json` (4 entities, 14 patterns) → PASSED
- `EncounterTable_schema.json` (3 entities, 8 patterns) → PASSED

**MCP Cost Analysis:**
- Total: **$4,521.58/mo** (on-demand, us-east-1)
- 11% cheaper than V1 ($5,054) due to 18 fewer GSIs
- ClinicalTable GSI1 is the largest cost driver (70M items × ALL projection)
- Recommendation: Switch ClinicalTable GSI1 to INCLUDE projection to cut GSI storage by ~60%

**Design stable. No structural changes needed.**
