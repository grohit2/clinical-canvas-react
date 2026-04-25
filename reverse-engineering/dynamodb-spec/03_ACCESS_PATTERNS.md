# Access Patterns

> Every access pattern mapped to DynamoDB operations with table, key conditions, and estimated frequency.

---

## Legend

- **Op**: GetItem (G), Query (Q), PutItem (P), UpdateItem (U), DeleteItem (D), BatchGetItem (BG), BatchWriteItem (BW), Scan (S)
- **Freq**: Requests per second at peak per hospital unit
- **Consistency**: EC = Eventually Consistent, SC = Strongly Consistent

---

## 1. UserStaffTable Access Patterns

| # | Pattern | Use Case | Op | PK | SK | GSI | Freq | Consistency |
|---|---------|----------|----|----|----|----|------|-------------|
| AP-USR-01 | Get user by ID | UC-AUTH-06 | G | `USER#{userId}` | `PROFILE` | - | 50 | SC |
| AP-USR-02 | Get user by login | UC-AUTH-01/02 | Q | - | - | GSI1: PK=`LOGIN#{login}` | 10 | EC |
| AP-USR-03 | List users by unit | UC-CT-03 | Q | - | - | GSI2: PK=`UNIT#{unitCode}`, SK begins_with `ROLE#` | 20 | EC |
| AP-USR-04 | Search users by name in unit | UC-CT-03 | Q+Filter | - | - | GSI2: PK=`UNIT#{unitCode}` + filter on name | 10 | EC |
| AP-USR-05 | Get user by FCM token | UC-AUTH-04 | Q | `USER#{userId}` | `FCM#{deviceId}` | - | 5 | EC |
| AP-USR-06 | List users by organization | UC-SYS-04 | Q | - | - | GSI3: PK=`ORG#{orgId}`, SK=`UNIT#{unitCode}#USER#{userId}` | 2 | EC |

---

## 2. PatientTable Access Patterns

| # | Pattern | Use Case | Op | PK | SK | GSI | Freq | Consistency |
|---|---------|----------|----|----|----|----|------|-------------|
| AP-PAT-01 | Get patient by ID | UC-PAT-06 | G | `PAT#{patientId}` | `PROFILE` | - | 100 | SC |
| AP-PAT-02 | Get patient by MRN | UC-PAT-04 | Q | - | - | GSI1: PK=`MRN#{mrn}` | 100 | EC |
| AP-PAT-03 | Get patient by UHID | UC-PAT-08 | Q | - | - | GSI2: PK=`UHID#{uhid}` | 50 | EC |
| AP-PAT-04 | Search patient by phone | UC-PAT-08 | Q | - | - | GSI3: PK=`PHONE#{mobileNumber}` | 20 | EC |
| AP-PAT-05 | List patients by doctor | UC-PAT-01 | Q | - | - | GSI4: PK=`DOC#{consultantLogin}`, SK=`UNIT#{unitCode}#PAT#{patientId}` | 50 | EC |
| AP-PAT-06 | Update patient demographics | UC-PAT-09 | U | `PAT#{patientId}` | `PROFILE` | - | 10 | - |
| AP-PAT-07 | Store Aadhaar verification | UC-PAT-10 | P | `PAT#{patientId}` | `AADHAAR` | - | 5 | - |

---

## 3. EncounterTable Access Patterns

| # | Pattern | Use Case | Op | PK | SK | GSI | Freq | Consistency |
|---|---------|----------|----|----|----|----|------|-------------|
| AP-ENC-01 | Get encounter by number | UC-ENC-02 | G | `ENC#{encounterNumber}` | `METADATA` | - | 200 | SC |
| AP-ENC-02 | List encounters by patient | UC-ENC-02 | Q | - | - | GSI1: PK=`PAT#{patientId}`, SK=`DATE#{admissionDate}` | 50 | EC |
| AP-ENC-03 | List encounters by consultant | UC-PAT-01 | Q | - | - | GSI2: PK=`DOC#{consultantLogin}#UNIT#{unitCode}`, SK=`DATE#{admissionDate}` | 50 | EC |
| AP-ENC-04 | Get admission details | UC-ENC-03 | G | `ENC#{encounterNumber}` | `ADMISSION` | - | 100 | SC |
| AP-ENC-05 | Update encounter status (MFD, discharge) | UC-ENC-05/06 | U | `ENC#{encounterNumber}` | `METADATA` | - | 10 | - |
| AP-ENC-06 | List active encounters by unit | UC-PAT-01 | Q | - | - | GSI3: PK=`UNIT#{unitCode}#STATUS#ACTIVE`, SK=`WARD#{wardSort}#TIME#{lastMsgTime}` | 30 | EC |
| AP-ENC-07 | List discharged patients | UC-PAT-07 | Q | - | - | GSI3: PK=`UNIT#{unitCode}#STATUS#DISCHARGED`, SK=`DATE#{dischargeDate}` | 5 | EC |

---

## 4. MedicationOrderTable Access Patterns

| # | Pattern | Use Case | Op | PK | SK | GSI | Freq | Consistency |
|---|---------|----------|----|----|----|----|------|-------------|
| AP-MED-01 | List medications for encounter | UC-MED-03 | Q | `ENC#{encounterNumber}` | begins_with `MED#` | - | 100 | EC |
| AP-MED-02 | Get specific medication | UC-MED-04 | G | `ENC#{encounterNumber}` | `MED#{medicationId}` | - | 50 | SC |
| AP-MED-03 | Create medication order | UC-MED-02 | P | `ENC#{encounterNumber}` | `MED#{medicationId}` | - | 50 | - |
| AP-MED-04 | Update medication status | UC-MED-06/07/08 | U | `ENC#{encounterNumber}` | `MED#{medicationId}` | - | 30 | - |
| AP-MED-05 | List active medications for patient | UC-MED-15 | Q | - | - | GSI1: PK=`PAT#{mrn}`, SK=`STATUS#ACTIVE#MED#{medicationId}` | 30 | EC |
| AP-MED-06 | Get medication favorites | UC-MED-09 | Q | `FAV#{consultantLogin}` | begins_with `MED#` | - | 20 | EC |
| AP-MED-07 | Save medication favorite | UC-MED-09 | P | `FAV#{consultantLogin}` | `MED#{drugCode}` | - | 5 | - |
| AP-MED-08 | List reconciled medications | UC-MED-16 | Q | `ENC#{encounterNumber}` | begins_with `RECON#` | - | 10 | EC |
| AP-MED-09 | Drug interaction check | UC-MED-10 | Q | `ENC#{encounterNumber}` | begins_with `MED#` + filter status=ACTIVE | - | 10 | EC |
| AP-MED-10 | Medication card timings | UC-MED-12 | Q | `ENC#{encounterNumber}` | begins_with `MED#` + filter | - | 20 | EC |
| AP-MED-11 | Search medication catalog | UC-MED-01 | Q | `CATALOG#DRUG` | begins_with `{searchPrefix}` | - | 30 | EC |

---

## 5. LabInvestigationTable Access Patterns

| # | Pattern | Use Case | Op | PK | SK | GSI | Freq | Consistency |
|---|---------|----------|----|----|----|----|------|-------------|
| AP-LAB-01 | List investigation orders for encounter | UC-LAB-03 | Q | `ENC#{encounterNumber}` | begins_with `ORDER#` | - | 50 | EC |
| AP-LAB-02 | Create investigation order | UC-LAB-02 | P | `ENC#{encounterNumber}` | `ORDER#{orderCode}` | - | 20 | - |
| AP-LAB-03 | List lab results for encounter | UC-LAB-04 | Q | `ENC#{encounterNumber}` | begins_with `RESULT#` | - | 100 | EC |
| AP-LAB-04 | Get specific lab result | UC-LAB-05 | G | `ENC#{encounterNumber}` | `RESULT#{resultCode}##{timestamp}` | - | 50 | SC |
| AP-LAB-05 | List results by patient (cross-encounter) | UC-LAB-07 | Q | - | - | GSI1: PK=`PAT#{mrn}`, SK=`DATE#{resultDate}#RESULT#{code}` | 30 | EC |
| AP-LAB-06 | Get investigation favorites | UC-LAB-09 | Q | `FAV#{consultantLogin}` | begins_with `INV#` | - | 10 | EC |
| AP-LAB-07 | Get result trend data | UC-LAB-06 | Q | - | - | GSI1: PK=`PAT#{mrn}`, SK=between `DATE#{from}` and `DATE#{to}` + filter code | 20 | EC |
| AP-LAB-08 | Search investigation catalog | UC-LAB-01 | Q | `CATALOG#INV` | begins_with `{searchPrefix}` | - | 20 | EC |

---

## 6. ClinicalDocumentTable Access Patterns

| # | Pattern | Use Case | Op | PK | SK | GSI | Freq | Consistency |
|---|---------|----------|----|----|----|----|------|-------------|
| AP-DOC-01 | List progress notes for encounter | UC-PN-04 | Q | `ENC#{encounterNumber}` | begins_with `DOC#PN#` | - | 50 | EC |
| AP-DOC-02 | Get specific progress note | UC-PN-01 | G | `ENC#{encounterNumber}` | `DOC#PN#{documentNumber}` | - | 30 | SC |
| AP-DOC-03 | Create/update progress note | UC-PN-01/02 | P/U | `ENC#{encounterNumber}` | `DOC#PN#{documentNumber}` | - | 20 | - |
| AP-DOC-04 | Get discharge summary by admission | UC-DS-01 | Q | `ENC#{encounterNumber}` | begins_with `DOC#DS#` | - | 20 | SC |
| AP-DOC-05 | Create/update discharge summary | UC-DS-02 | P/U | `ENC#{encounterNumber}` | `DOC#DS#{documentNumber}` | - | 10 | - |
| AP-DOC-06 | Get initial assessment | UC-IA-01 | Q | `ENC#{encounterNumber}` | begins_with `DOC#IA#` | - | 20 | EC |
| AP-DOC-07 | Save IA widget data | UC-IA-02 | P/U | `ENC#{encounterNumber}` | `DOC#IA#{documentNumber}#WGT#{widgetKey}` | - | 30 | - |
| AP-DOC-08 | List checklists for encounter | UC-CK-01 | Q | `ENC#{encounterNumber}` | begins_with `DOC#CK#` | - | 10 | EC |
| AP-DOC-09 | Create/update checklist | UC-CK-02 | P/U | `ENC#{encounterNumber}` | `DOC#CK#{checklistNumber}` | - | 5 | - |
| AP-DOC-10 | List operation notes | UC-OP-01 | Q | `ENC#{encounterNumber}` | begins_with `DOC#OP#` | - | 5 | EC |
| AP-DOC-11 | List cross-consultations | UC-CC-02 | Q | `ENC#{encounterNumber}` | begins_with `DOC#CC#` | - | 10 | EC |
| AP-DOC-12 | Save incident report | UC-IR-01 | P | `ENC#{encounterNumber}` | `DOC#IR#{timestamp}` | - | 2 | - |
| AP-DOC-13 | Handover request | UC-HO-01 | P | `ENC#{encounterNumber}` | `DOC#HO#{timestamp}` | - | 5 | - |
| AP-DOC-14 | Pending PN acknowledgments for doctor | UC-TK-02 | Q | - | - | GSI1 (sparse): PK=`PENDING#ACK#{consultantLogin}`, SK=`DATE#{createdDate}` | 20 | EC |
| AP-DOC-15 | DS pending sign-off | UC-TK-03 | Q | - | - | GSI1 (sparse): PK=`PENDING#SIGNOFF#{unitCode}`, SK=`DATE#{createdDate}` | 10 | EC |
| AP-DOC-16 | List docs by patient (cross-encounter) | All | Q | - | - | GSI2: PK=`PAT#{mrn}`, SK=`TYPE#{docType}#DATE#{createdDate}` | 20 | EC |
| AP-DOC-17 | Save/get clinical macros | UC-MR-01 | Q | `MACRO#{userLogin}` | `TYPE#{widgetType}##{macroId}` | - | 10 | EC |
| AP-DOC-18 | Handover requests for accepting doctor | UC-HO-02 | Q | - | - | GSI1 (sparse): PK=`PENDING#HANDOVER#{acceptingLogin}`, SK=`DATE#{createdDate}` | 5 | EC |

---

## 7. VitalsTable Access Patterns

| # | Pattern | Use Case | Op | PK | SK | GSI | Freq | Consistency |
|---|---------|----------|----|----|----|----|------|-------------|
| AP-VIT-01 | Record vital signs | UC-VIT-01 | P | `ENC#{encounterNumber}#DATE#{YYYY-MM-DD}` | `TIME#{HH:mm:ss}` | - | 200 | - |
| AP-VIT-02 | Get vitals for date range | UC-VIT-03 | Q | `ENC#{encounterNumber}#DATE#{date}` | between `TIME#{from}` and `TIME#{to}` | - | 100 | EC |
| AP-VIT-03 | Get vitals trend (cross-day) | UC-VIT-02 | Q (multiple) | `ENC#{enc}#DATE#{date1}`, `ENC#{enc}#DATE#{date2}` | all | - | 50 | EC |
| AP-VIT-04 | Get latest vitals | UC-VIT-01 | Q | `ENC#{encounterNumber}#DATE#{today}` | SK desc, limit 1 | - | 50 | EC |
| AP-VIT-05 | Get vitals by patient (cross-encounter) | UC-VIT-02 | Q | - | - | GSI1: PK=`PAT#{mrn}`, SK=`DATE#{date}#TIME#{time}` | 20 | EC |

---

## 8. CareTeamTable Access Patterns

| # | Pattern | Use Case | Op | PK | SK | GSI | Freq | Consistency |
|---|---------|----------|----|----|----|----|------|-------------|
| AP-CT-01 | Get care team for patient | UC-CT-01 | Q | `PAT#{mrn}#ENC#{encounterNumber}` | begins_with `MEMBER#` | - | 50 | EC |
| AP-CT-02 | Add team member | UC-CT-02 | P | `PAT#{mrn}#ENC#{encounterNumber}` | `MEMBER#{userId}` | - | 10 | - |
| AP-CT-03 | Remove team member | UC-CT-02 | U | `PAT#{mrn}#ENC#{encounterNumber}` | `MEMBER#{userId}` | - | 5 | - |
| AP-CT-04 | Get teams user belongs to | UC-CT-01 | Q | - | - | GSI1: PK=`USER#{userId}`, SK=`PAT#{mrn}#ENC#{enc}` | 20 | EC |
| AP-CT-05 | Get/create team template | UC-CT-04 | Q/P | `TMPL#{templateId}` | begins_with `MEMBER#` or `METADATA` | - | 10 | EC |
| AP-CT-06 | List templates by consultant | UC-CT-04 | Q | - | - | GSI2: PK=`TMPL#PC#{consultantLogin}`, SK=`UNIT#{unitCode}` | 5 | EC |
| AP-CT-07 | List templates by HSC | UC-CT-05 | Q | - | - | GSI2: PK=`TMPL#HSC#{hscCode}`, SK=`UNIT#{unitCode}` | 5 | EC |

---

## 9. PatientMessageTable Access Patterns

| # | Pattern | Use Case | Op | PK | SK | GSI | Freq | Consistency |
|---|---------|----------|----|----|----|----|------|-------------|
| AP-MSG-01 | List messages for patient | UC-PM-01 | Q | `PAT#{mrn}#ENC#{encounterNumber}` | begins_with `MSG#` (desc) | - | 100 | EC |
| AP-MSG-02 | Send message | UC-PM-02 | P | `PAT#{mrn}#ENC#{encounterNumber}` | `MSG#{timestamp}##{messageId}` | - | 50 | - |
| AP-MSG-03 | Filter messages by category | UC-PM-04 | Q+Filter | `PAT#{mrn}#ENC#{encounterNumber}` | begins_with `MSG#` + filter category | - | 30 | EC |
| AP-MSG-04 | Mark message as read | UC-PM-05 | U | `PAT#{mrn}#ENC#{encounterNumber}` | `MSG#{timestamp}##{messageId}` | - | 50 | - |
| AP-MSG-05 | Get unread count | UC-PM-01 | Q | `PAT#{mrn}#ENC#{encounterNumber}` | begins_with `MSG#` + filter read=0 | - | 50 | EC |
| AP-MSG-06 | Star/unstar message | UC-PM-06 | U | `PAT#{mrn}#ENC#{encounterNumber}` | `MSG#{timestamp}##{messageId}` | - | 10 | - |
| AP-MSG-07 | Sync messages since timestamp | UC-PM-08 | Q | `PAT#{mrn}#ENC#{encounterNumber}` | SK > `MSG#{lastSyncTime}` | - | 30 | EC |
| AP-MSG-08 | Pending (offline queued) messages | UC-PM-07 | Q | - | - | GSI1 (sparse): PK=`PENDING#MSG#{senderLogin}`, SK=`TIME#{timestamp}` | 10 | EC |

---

## 10. ChatTable Access Patterns

| # | Pattern | Use Case | Op | PK | SK | GSI | Freq | Consistency |
|---|---------|----------|----|----|----|----|------|-------------|
| AP-CHT-01 | List messages in thread | UC-CH-03 | Q | `THREAD#{threadId}` | begins_with `MSG#` (desc) | - | 100 | EC |
| AP-CHT-02 | Send message | UC-CH-03 | P | `THREAD#{threadId}` | `MSG#{timestamp}##{messageId}` | - | 50 | - |
| AP-CHT-03 | Get conversation metadata | UC-CH-01 | G | `THREAD#{threadId}` | `METADATA` | - | 30 | EC |
| AP-CHT-04 | Delete message | UC-CH-05 | U | `THREAD#{threadId}` | `MSG#{timestamp}##{messageId}` | - | 5 | - |
| AP-CHT-05 | My conversations | UC-CH-01 | Q | - | - | GSI1: PK=`ASSIGNED#{userId}`, SK=`LAST_MSG#{timestamp}` | 30 | EC |
| AP-CHT-06 | All conversations by unit | UC-CH-02 | Q | - | - | GSI2: PK=`UNIT#{unitCode}`, SK=`LAST_MSG#{timestamp}` | 20 | EC |
| AP-CHT-07 | Update assignment | UC-CH-06/07/08 | U | `THREAD#{threadId}` | `METADATA` | - | 5 | - |
| AP-CHT-08 | Conversations for patient | UC-CH-01 | Q | - | - | GSI3: PK=`PAT#{patientId}`, SK=`THREAD#{threadId}` | 10 | EC |

---

## 11. VideoConsultationTable Access Patterns

| # | Pattern | Use Case | Op | PK | SK | GSI | Freq | Consistency |
|---|---------|----------|----|----|----|----|------|-------------|
| AP-VC-01 | Get consultation by appointment | UC-VC-01 | G | `APT#{appointmentNumber}` | `METADATA` | - | 20 | SC |
| AP-VC-02 | List consultations for doctor | UC-VC-01 | Q | - | - | GSI1: PK=`DOC#{doctorLogin}`, SK=`DATE#{date}#APT#{aptNo}` | 20 | EC |
| AP-VC-03 | Update consultation status | UC-VC-04 | U | `APT#{appointmentNumber}` | `METADATA` | - | 10 | - |
| AP-VC-04 | List consultations for patient | UC-VC-01 | Q | - | - | GSI2: PK=`PAT#{mrn}`, SK=`DATE#{date}` | 10 | EC |
| AP-VC-05 | Store VC chat message | UC-VC-03 | P | `APT#{appointmentNumber}` | `CHAT#{timestamp}##{msgId}` | - | 30 | - |
| AP-VC-06 | VC audit log | UC-VC-08 | P | `APT#{appointmentNumber}` | `AUDIT#{timestamp}` | - | 5 | - |

---

## 12. TaskWorkflowTable Access Patterns

| # | Pattern | Use Case | Op | PK | SK | GSI | Freq | Consistency |
|---|---------|----------|----|----|----|----|------|-------------|
| AP-TK-01 | Get task by ID | UC-TK-12 | G | `TASK#{taskId}` | `METADATA` | - | 50 | SC |
| AP-TK-02 | My tasks (personal queue) | UC-TK-07 | Q | - | - | GSI1: PK=`ASSIGNEE#{userId}`, SK=`STATUS#{status}#CREATED#{timestamp}` | 30 | EC |
| AP-TK-03 | Group tasks by unit | UC-TK-07 | Q | - | - | GSI2: PK=`UNIT#{unitCode}#STATUS#OPEN`, SK=`TYPE#{taskName}#CREATED#{timestamp}` | 30 | EC |
| AP-TK-04 | All tasks by unit | UC-TK-07 | Q | - | - | GSI2: PK=`UNIT#{unitCode}#STATUS#ALL`, SK=`TYPE#{taskName}#CREATED#{timestamp}` | 20 | EC |
| AP-TK-05 | Claim task | UC-TK-09 | U | `TASK#{taskId}` | `METADATA` | - | 10 | - |
| AP-TK-06 | Release task | UC-TK-10 | U | `TASK#{taskId}` | `METADATA` | - | 5 | - |
| AP-TK-07 | Complete task | UC-TK-11 | U | `TASK#{taskId}` | `METADATA` | - | 10 | - |
| AP-TK-08 | Store process variables | UC-TK-12 | P | `TASK#{taskId}` | `VARS` | - | 10 | - |
| AP-TK-09 | Task count by type for unit | UC-TK-01 | Q | - | - | GSI2: PK=`UNIT#{unitCode}#STATUS#OPEN` + count | 10 | EC |

---

## 13. BillingTable Access Patterns

| # | Pattern | Use Case | Op | PK | SK | GSI | Freq | Consistency |
|---|---------|----------|----|----|----|----|------|-------------|
| AP-BIL-01 | List invoices for patient | UC-BIL-01 | Q | `PAT#{patientId}` | begins_with `INV#` | - | 30 | EC |
| AP-BIL-02 | Get invoice with receipts/refunds | UC-BIL-01 | Q | `PAT#{patientId}` | begins_with `INV#{invoiceNo}` | - | 20 | SC |
| AP-BIL-03 | Create invoice | UC-BIL-01 | P | `PAT#{patientId}` | `INV#{invoiceNo}` | - | 10 | - |
| AP-BIL-04 | Create receipt | UC-BIL-03 | P | `PAT#{patientId}` | `INV#{invoiceNo}#REC#{receiptNo}` | - | 10 | - |
| AP-BIL-05 | Create refund | UC-BIL-05 | P | `PAT#{patientId}` | `INV#{invoiceNo}#REC#{receiptNo}#REF#{refundNo}` | - | 5 | - |
| AP-BIL-06 | List invoices by unit/status | UC-BIL-01 | Q | - | - | GSI1: PK=`UNIT#{unitCode}#STATUS#{status}`, SK=`DATE#{invoiceDate}` | 20 | EC |
| AP-BIL-07 | Get invoice by number | UC-BIL-02 | Q | - | - | GSI2: PK=`INVNO#{invoiceNo}` | 10 | EC |
| AP-BIL-08 | List unbilled documents | UC-BIL-07 | Q | `PAT#{patientId}` | begins_with `UNBILL#` | - | 10 | EC |
| AP-BIL-09 | Get unbilled by unit | UC-BIL-07 | Q | - | - | GSI1: PK=`UNIT#{unitCode}#STATUS#UNBILLED`, SK=`DATE#{serviceDate}` | 10 | EC |
| AP-BIL-10 | Store authorization | UC-BIL-11 | P | `PAT#{patientId}` | `INV#{invoiceNo}#AUTH#{authId}` | - | 5 | - |
| AP-BIL-11 | Invoice line items | UC-BIL-02 | Q | `PAT#{patientId}` | begins_with `INV#{invoiceNo}#LINE#` | - | 10 | EC |

---

## 14. CampOutreachTable Access Patterns

| # | Pattern | Use Case | Op | PK | SK | GSI | Freq | Consistency |
|---|---------|----------|----|----|----|----|------|-------------|
| AP-CMP-01 | Get camp details | UC-CMP-01 | G | `CAMP#{campId}` | `METADATA` | - | 10 | SC |
| AP-CMP-02 | List camps by unit/status | UC-CMP-01 | Q | - | - | GSI1: PK=`UNIT#{unitCode}#STATUS#{status}`, SK=`DATE#{startDate}` | 10 | EC |
| AP-CMP-03 | Update camp status | UC-CMP-02/03 | U | `CAMP#{campId}` | `METADATA` | - | 2 | - |
| AP-CMP-04 | List patients in camp | UC-CMP-04 | Q | `CAMP#{campId}` | begins_with `PAT#` | - | 20 | EC |
| AP-CMP-05 | Register patient in camp | UC-CMP-05 | P | `CAMP#{campId}` | `PAT#{patientId}` | - | 10 | - |
| AP-CMP-06 | List camps for patient | UC-CMP-05 | Q | - | - | GSI2: PK=`PAT#{patientId}`, SK=`CAMP#{campId}` | 5 | EC |
| AP-CMP-07 | Get temp registration IDs | UC-CMP-05 | Q | `CAMP#{campId}` | begins_with `TEMP#` | - | 5 | EC |
| AP-CMP-08 | Store camp coordinators | UC-CMP-07 | P | `CAMP#{campId}` | `COORD#{coordinatorId}` | - | 2 | - |
| AP-CMP-09 | Store work pattern | UC-CMP-08 | P | `CAMP#{campId}` | `WPAT#{workPatternId}` | - | 2 | - |

---

## 15. DocumentStorageTable Access Patterns

| # | Pattern | Use Case | Op | PK | SK | GSI | Freq | Consistency |
|---|---------|----------|----|----|----|----|------|-------------|
| AP-DST-01 | List documents for patient | UC-DOC-02 | Q | `PAT#{patientId}` | begins_with `DOC#` | - | 10 | EC |
| AP-DST-02 | Upload document metadata | UC-DOC-01 | P | `PAT#{patientId}` | `DOC#{documentId}` | - | 5 | - |
| AP-DST-03 | Get document by ID | UC-DOC-03 | G | `PAT#{patientId}` | `DOC#{documentId}` | - | 10 | SC |
| AP-DST-04 | Filter documents by type | UC-DOC-04 | Q | `PAT#{patientId}` | begins_with `DOC#` + filter type | - | 5 | EC |
| AP-DST-05 | Search by tag | UC-DOC-04 | Q | - | - | GSI1: PK=`TAG#{tag}`, SK=`PAT#{patientId}#DOC#{docId}` | 5 | EC |

---

## 16. SystemConfigTable Access Patterns

| # | Pattern | Use Case | Op | PK | SK | GSI | Freq | Consistency |
|---|---------|----------|----|----|----|----|------|-------------|
| AP-SYS-01 | Get app config | UC-SYS-01 | G | `CONFIG#APP` | `LATEST` | - | 100 | EC |
| AP-SYS-02 | Lookup zipcode | UC-SYS-03 | Q | `GEO#ZIPCODE` | `#{zipcode}` | - | 10 | EC |
| AP-SYS-03 | List cities by state | UC-SYS-03 | Q | `GEO#CITY` | begins_with `#{stateCode}#` | - | 5 | EC |
| AP-SYS-04 | List states by country | UC-SYS-03 | Q | `GEO#STATE` | begins_with `#{countryCode}#` | - | 2 | EC |
| AP-SYS-05 | List organizations | UC-SYS-04 | Q | `CONFIG#ORG` | begins_with `ORG#` | - | 5 | EC |
| AP-SYS-06 | List units for org | UC-SYS-04 | Q | `CONFIG#ORG##{orgId}` | begins_with `UNIT#` | - | 5 | EC |
| AP-SYS-07 | Get FAQ categories | UC-SYS-05 | Q | `CONFIG#FAQ` | begins_with `CAT#` | - | 2 | EC |
| AP-SYS-08 | Store audit event | UC-SYS-07 | P | `AUDIT##{YYYY-MM-DD}` | `#{timestamp}##{eventId}` | - | 50 | - |
| AP-SYS-09 | FCM token management | UC-AUTH-04 | P/U | `FCM#USER#{userId}` | `DEV#{deviceId}` | - | 5 | - |
| AP-SYS-10 | Downtime info | UC-SYS-08 | G | `CONFIG#DOWNTIME` | `LATEST` | - | 10 | EC |
| AP-SYS-11 | Get pending surveys | UC-SYS-06 | Q | `FEEDBACK#{userId}` | filter status=PENDING | - | 2 | EC |
| AP-SYS-12 | Submit survey response | UC-SYS-06 | U | `FEEDBACK#{userId}` | `#{surveyId}` | - | 1 | - |

---

## 17. New Access Patterns (Iteration 2 Additions)

### UserStaffTable -- Doctor Details

| # | Pattern | Use Case | Op | PK | SK | GSI | Freq | Consistency |
|---|---------|----------|----|----|----|----|------|-------------|
| AP-USR-07 | Get doctor schedule | UC-VC-01 | G | `USER#{userId}` | `SCHEDULE#{date}` | - | 10 | EC |
| AP-USR-08 | Update doctor availability | UC-VC-01 | U | `USER#{userId}` | `SCHEDULE#{date}` | - | 2 | - |
| AP-USR-09 | Get user preferences | UC-AUTH-06 | G | `USER#{userId}` | `PREF` | - | 20 | EC |
| AP-USR-10 | Update notification preferences | UC-SYS-01 | U | `USER#{userId}` | `PREF` | - | 2 | - |

### PatientTable -- Enhanced Details

| # | Pattern | Use Case | Op | PK | SK | GSI | Freq | Consistency |
|---|---------|----------|----|----|----|----|------|-------------|
| AP-PAT-08 | Add patient label | UC-PAT-06 | P | `PAT#{patientId}` | `LABEL#{labelId}` | - | 5 | - |
| AP-PAT-09 | Remove patient label | UC-PAT-06 | D | `PAT#{patientId}` | `LABEL#{labelId}` | - | 2 | - |
| AP-PAT-10 | List patient labels | UC-PAT-06 | Q | `PAT#{patientId}` | begins_with `LABEL#` | - | 20 | EC |
| AP-PAT-11 | Get bystander contacts | UC-PM-09 | Q | `PAT#{patientId}` | begins_with `CONTACT#` | - | 5 | EC |
| AP-PAT-12 | Add emergency contact | UC-PAT-09 | P | `PAT#{patientId}` | `CONTACT#{contactId}` | - | 5 | - |

### EncounterTable -- Risk & Comorbidity

| # | Pattern | Use Case | Op | PK | SK | GSI | Freq | Consistency |
|---|---------|----------|----|----|----|----|------|-------------|
| AP-ENC-08 | Store risk score history | UC-PAT-12 | P | `ENC#{encounterNumber}` | `RISK#{timestamp}` | - | 10 | - |
| AP-ENC-09 | Get risk score trend | UC-PAT-13 | Q | `ENC#{encounterNumber}` | begins_with `RISK#` | - | 20 | EC |
| AP-ENC-10 | Add comorbidity | UC-PAT-06 | P | `ENC#{encounterNumber}` | `COMORBIDITY#{code}` | - | 5 | - |
| AP-ENC-11 | Toggle comorbidity active | UC-PAT-06 | U | `ENC#{encounterNumber}` | `COMORBIDITY#{code}` | - | 5 | - |
| AP-ENC-12 | List comorbidities | UC-PAT-06 | Q | `ENC#{encounterNumber}` | begins_with `COMORBIDITY#` | - | 20 | EC |

### LabInvestigationTable -- Radiology

| # | Pattern | Use Case | Op | PK | SK | GSI | Freq | Consistency |
|---|---------|----------|----|----|----|----|------|-------------|
| AP-LAB-09 | Get radiology result | UC-LAB-05 | G | `ENC#{encounterNumber}` | `RAD#{studyUID}` | - | 10 | SC |
| AP-LAB-10 | List radiology results | UC-LAB-03 | Q | `ENC#{encounterNumber}` | begins_with `RAD#` | - | 10 | EC |

### ClinicalDocumentTable -- New Document Types

| # | Pattern | Use Case | Op | PK | SK | GSI | Freq | Consistency |
|---|---------|----------|----|----|----|----|------|-------------|
| AP-DOC-19 | Get operation note | UC-OP-01 | G | `ENC#{encounterNumber}` | `DOC#OP#{otRequestNo}` | - | 5 | SC |
| AP-DOC-20 | Create/update operation note | UC-OP-01 | P/U | `ENC#{encounterNumber}` | `DOC#OP#{otRequestNo}` | - | 3 | - |
| AP-DOC-21 | Get PAC | UC-OP-01 | G | `ENC#{encounterNumber}` | `DOC#PAC#{pacId}` | - | 3 | SC |
| AP-DOC-22 | Create/update PAC | UC-OP-01 | P/U | `ENC#{encounterNumber}` | `DOC#PAC#{pacId}` | - | 2 | - |
| AP-DOC-23 | Store CT scorecard | UC-PAT-12 | P | `ENC#{encounterNumber}` | `DOC#CTS#{timestamp}` | - | 5 | - |
| AP-DOC-24 | List past record summaries | UC-PAT-06 | Q | `PASTRECORDS#{mrn}` | begins_with `VISIT#` (desc) | - | 10 | EC |
| AP-DOC-25 | Store past record summary | Backend | P | `PASTRECORDS#{mrn}` | `VISIT#{consultationDate}` | - | 5 | - |

### VideoConsultationTable -- Post-VC Uploads

| # | Pattern | Use Case | Op | PK | SK | GSI | Freq | Consistency |
|---|---------|----------|----|----|----|----|------|-------------|
| AP-VC-07 | Upload post-VC prescription | UC-VC-06 | P | `APT#{appointmentNumber}` | `OPD#{prescriptionId}` | - | 5 | - |
| AP-VC-08 | List post-VC uploads | UC-VC-06 | Q | `APT#{appointmentNumber}` | begins_with `OPD#` | - | 5 | EC |

### VideoConsultationTable -- Follow-Up Appointments (Iteration 4)

| # | Pattern | Use Case | Op | PK | SK | GSI | Freq | Consistency |
|---|---------|----------|----|----|----|----|------|-------------|
| AP-VC-09 | Book follow-up appointment | UC-FU-04 | P | `APT#{appointmentNumber}` | `METADATA` | - | 10 | - |
| AP-VC-10 | Get available slots | UC-FU-03 | Q | `SCHEDULE#DOC#{doctorLogin}#DATE#{date}` | begins_with `SLOT#` | - | 10 | EC |
| AP-VC-11 | Store follow-up record | UC-FU-01 | P | `APT#{appointmentNumber}` | `FOLLOWUP` | - | 10 | - |
| AP-VC-12 | List follow-ups for patient | UC-FU-06 | Q | - | - | GSI2: PK=`PAT#{mrn}`, SK begins_with `DATE#` | 5 | EC |

### MedicationOrderTable -- Administration Slots (Iteration 4)

| # | Pattern | Use Case | Op | PK | SK | GSI | Freq | Consistency |
|---|---------|----------|----|----|----|----|------|-------------|
| AP-MED-12 | Record medication administration | UC-MA-02 | P | `ENC#{encounterNumber}` | `ADMIN#MED#{medId}#TIME#{timestamp}` | - | 100 | - |
| AP-MED-13 | Get medication admin slots for day | UC-MA-01 | Q | `ENC#{encounterNumber}` | begins_with `ADMIN#MED#{medId}` | - | 50 | EC |
| AP-MED-14 | Update slot status (refuse/withhold) | UC-MA-03 | U | `ENC#{encounterNumber}` | `ADMIN#MED#{medId}#TIME#{timestamp}` | - | 20 | - |

### TaskWorkflowTable -- Nursing Tasks (Iteration 4)

| # | Pattern | Use Case | Op | PK | SK | GSI | Freq | Consistency |
|---|---------|----------|----|----|----|----|------|-------------|
| AP-TK-10 | Create nursing capture note | UC-MA-05 | P | `TASK#{taskId}` | `METADATA` | - | 10 | - |
| AP-TK-11 | List nursing tasks by encounter | UC-MA-05 | Q | - | - | GSI2: PK=`UNIT#{unitCode}#STATUS#OPEN`, SK begins_with `TYPE#NURSING-CAPTURE-NOTES` | 10 | EC |
