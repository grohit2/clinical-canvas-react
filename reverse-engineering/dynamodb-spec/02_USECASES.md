# Use Cases

> Complete catalog of use cases across AADI (doctor app) and AHAM (staff app) that drive access pattern design.

---

## 1. Authentication & Session Management

| ID | Use Case | App | Actor |
|----|----------|-----|-------|
| UC-AUTH-01 | Doctor logs in with credentials | AADI | Doctor |
| UC-AUTH-02 | Staff logs in with credentials | AHAM | Staff |
| UC-AUTH-03 | Refresh expired access token | Both | System |
| UC-AUTH-04 | Register FCM token for push notifications | Both | System |
| UC-AUTH-05 | Logout and unregister device | Both | User |
| UC-AUTH-06 | Fetch current user profile/account | Both | System |
| UC-AUTH-07 | Check app version and force update | Both | System |

---

## 2. Patient Management

| ID | Use Case | App | Actor |
|----|----------|-----|-------|
| UC-PAT-01 | View my assigned patient list | AADI | Doctor |
| UC-PAT-02 | Filter patients by 9 dimensions (location, ward, unit, consultant, visit type, etc.) | AADI | Doctor |
| UC-PAT-03 | Sort patients by pin, ward priority, last message time | AADI | Doctor |
| UC-PAT-04 | Search patients by name | AADI | Doctor |
| UC-PAT-05 | Pin/unpin patient for priority access | AADI | Doctor |
| UC-PAT-06 | View patient detail card (demographics, admission, risk) | AADI | Doctor |
| UC-PAT-07 | View discharged patients list | AADI | Doctor |
| UC-PAT-08 | Search patients by UHID, name, or phone (MPI search) | AHAM | Staff |
| UC-PAT-09 | Register new patient with demographics | AHAM | Staff |
| UC-PAT-10 | Verify patient identity via Aadhaar KYC | AHAM | Staff |
| UC-PAT-11 | View patient admission status | AADI | Doctor |
| UC-PAT-12 | View mortality prediction risk score | AADI | Doctor |
| UC-PAT-13 | View risk scorecard with gauge visualization | AADI | Doctor |

---

## 3. Encounter & Admission Management

| ID | Use Case | App | Actor |
|----|----------|-----|-------|
| UC-ENC-01 | Create new admission/encounter | Backend | System |
| UC-ENC-02 | View encounter details (consultant, department, ward, bed) | AADI | Doctor |
| UC-ENC-03 | Track admission details (date, reason, visit type, triage) | AADI | Doctor |
| UC-ENC-04 | Transfer patient (bed transfer, ward transfer) | AADI | Doctor |
| UC-ENC-05 | Mark for discharge (MFD) | AADI | Doctor |
| UC-ENC-06 | Intimate discharge | AADI | Doctor |
| UC-ENC-07 | Revert discharge intimation | AADI | Doctor |
| UC-ENC-08 | Mark patient dead / absconded | AADI | Doctor |

---

## 4. Medication Orders

| ID | Use Case | App | Actor |
|----|----------|-----|-------|
| UC-MED-01 | Search medications (brand/generic) | AADI | Doctor |
| UC-MED-02 | Create new medication order with dosage | AADI | Doctor |
| UC-MED-03 | View medication list for encounter | AADI | Doctor |
| UC-MED-04 | Edit medication order (before ordering) | AADI | Doctor |
| UC-MED-05 | Delete medication order (ADDED status only) | AADI | Doctor |
| UC-MED-06 | Cancel medication order (ORDERED status) | AADI | Doctor |
| UC-MED-07 | Hold/unhold active medication | AADI | Doctor |
| UC-MED-08 | Stop active medication | AADI | Doctor |
| UC-MED-09 | View favorite medications | AADI | Doctor |
| UC-MED-10 | Check drug interactions | AADI | Doctor |
| UC-MED-11 | View drug monograph | AADI | Doctor |
| UC-MED-12 | View medication card with administration timeline | AADI | Doctor |
| UC-MED-13 | Publish medications with progress note | AADI | Doctor |
| UC-MED-14 | Medication reconciliation | AADI | Doctor |
| UC-MED-15 | View active medications for patient | AADI | Doctor |
| UC-MED-16 | View reconciled medications | AADI | Doctor |

---

## 5. Lab Results & Investigations

| ID | Use Case | App | Actor |
|----|----------|-----|-------|
| UC-LAB-01 | Search investigation services | AADI | Doctor |
| UC-LAB-02 | Order investigation with priority | AADI | Doctor |
| UC-LAB-03 | View investigation orders for encounter | AADI | Doctor |
| UC-LAB-04 | View provisional lab results | AADI | Doctor |
| UC-LAB-05 | View lab result with abnormal flags | AADI | Doctor |
| UC-LAB-06 | View lab result trend graph (D3.js time-series) | AADI | Doctor |
| UC-LAB-07 | Filter results by name, date, most recent | AADI | Doctor |
| UC-LAB-08 | Download lab result PDF | AADI | Doctor |
| UC-LAB-09 | View investigation favorites | AADI | Doctor |
| UC-LAB-10 | Publish investigations with progress note | AADI | Doctor |

---

## 6. Clinical Documentation

### 6.1 Progress Notes

| ID | Use Case | App | Actor |
|----|----------|-----|-------|
| UC-PN-01 | Create new progress note with rich text | AADI | Doctor |
| UC-PN-02 | Save progress note as draft | AADI | Doctor |
| UC-PN-03 | Submit progress note for acknowledgment | AADI | Doctor |
| UC-PN-04 | View progress notes list for encounter | AADI | Doctor |
| UC-PN-05 | Acknowledge progress note (by primary consultant) | AADI | Doctor |
| UC-PN-06 | View progress notes with vitals | AADI | Doctor |
| UC-PN-07 | Filter progress notes by consultant | AADI | Doctor |
| UC-PN-08 | Attach medications to progress note | AADI | Doctor |
| UC-PN-09 | Attach investigations to progress note | AADI | Doctor |
| UC-PN-10 | Attach cross-consultation to progress note | AADI | Doctor |

### 6.2 Discharge Summary

| ID | Use Case | App | Actor |
|----|----------|-----|-------|
| UC-DS-01 | Create discharge summary | AADI | Doctor |
| UC-DS-02 | Fill 28 clinical sections | AADI | Doctor |
| UC-DS-03 | Save as draft | AADI | Doctor |
| UC-DS-04 | Send for review | AADI | Doctor |
| UC-DS-05 | Review and add comments | AADI | Doctor |
| UC-DS-06 | Sign off discharge summary | AADI | Doctor |
| UC-DS-07 | Amend completed summary | AADI | Doctor |
| UC-DS-08 | Print discharge summary (PDF) | AADI | Doctor |
| UC-DS-09 | Copy previous notes to summary | AADI | Doctor |
| UC-DS-10 | Revert review status | AADI | Doctor |
| UC-DS-11 | AI-generated discharge summary (voice-to-text) | AADI | Doctor |

### 6.3 Initial Assessment

| ID | Use Case | App | Actor |
|----|----------|-----|-------|
| UC-IA-01 | View 27-widget initial assessment form | AADI | Doctor |
| UC-IA-02 | Fill individual widget (allergy, vitals, diagnosis, etc.) | AADI | Doctor |
| UC-IA-03 | Search and add from widget favorites | AADI | Doctor |
| UC-IA-04 | Submit initial assessment for review | AADI | Doctor |
| UC-IA-05 | Download initial assessment PDF | AADI | Doctor |

### 6.4 Checklist System

| ID | Use Case | App | Actor |
|----|----------|-----|-------|
| UC-CK-01 | View checklist templates for patient | AADI | Doctor |
| UC-CK-02 | Fill checklist questions (sequential/free) | AADI | Doctor |
| UC-CK-03 | Submit checklist for approval | AADI | Doctor |
| UC-CK-04 | Approve/reject checklist | AADI | Doctor |
| UC-CK-05 | Add witness to checklist | AADI | Doctor |

### 6.5 Other Clinical Documents

| ID | Use Case | App | Actor |
|----|----------|-----|-------|
| UC-OP-01 | Create operation note | AADI | Doctor |
| UC-OP-02 | Search surgeries (hospital DB + SNOMED-CT) | AADI | Doctor |
| UC-CC-01 | Request cross-consultation | AADI | Doctor |
| UC-CC-02 | View cross-consultation list | AADI | Doctor |
| UC-HO-01 | Request consultant handover | AADI | Doctor |
| UC-HO-02 | Accept/reject handover | AADI | Doctor |
| UC-IR-01 | Submit incident report with attachments | AADI | Doctor |
| UC-MR-01 | Create/use clinical macros (templates) | AADI | Doctor |

---

## 7. Vitals

| ID | Use Case | App | Actor |
|----|----------|-----|-------|
| UC-VIT-01 | Record vital signs | AADI | Doctor/Nurse |
| UC-VIT-02 | View vital trends (time-series chart) | AADI | Doctor |
| UC-VIT-03 | View vitals for encounter (with date range) | AADI | Doctor |
| UC-VIT-04 | Save draft vitals with progress note | AADI | Doctor |
| UC-VIT-05 | View ECG data | AADI | Doctor |

---

## 8. Care Team Management

| ID | Use Case | App | Actor |
|----|----------|-----|-------|
| UC-CT-01 | View care team for patient | AADI | Doctor |
| UC-CT-02 | Add/remove team member | AADI | Doctor |
| UC-CT-03 | Search care team users by unit | AADI | Doctor |
| UC-CT-04 | Create care team template (PC-based or HSC-based) | AADI | Doctor |
| UC-CT-05 | View/manage admin care teams | AADI | Doctor |
| UC-CT-06 | Detect concurrent modification | AADI | System |

---

## 9. Messaging & Communication

### 9.1 Patient Messages (Clinical Context)

| ID | Use Case | App | Actor |
|----|----------|-----|-------|
| UC-PM-01 | View patient message history | AADI | Doctor |
| UC-PM-02 | Send text message in patient context | AADI | Doctor |
| UC-PM-03 | Send media (image, audio, video, PDF) | AADI | Doctor |
| UC-PM-04 | Receive clinical notification (lab result, medication, etc.) | AADI | Doctor |
| UC-PM-05 | Mark message as read | AADI | Doctor |
| UC-PM-06 | Star/bookmark message | AADI | Doctor |
| UC-PM-07 | Offline message queue (send when reconnected) | AADI | System |
| UC-PM-08 | Sync messages from server | AADI | System |
| UC-PM-09 | IVR call to patient family | AADI | Doctor |

### 9.2 Chat (ACS-Powered)

| ID | Use Case | App | Actor |
|----|----------|-----|-------|
| UC-CH-01 | View my chat conversations | AHAM | Staff |
| UC-CH-02 | View all chat conversations | AHAM | Staff |
| UC-CH-03 | Send text message in thread | AHAM | Staff |
| UC-CH-04 | Send file attachment | AHAM | Staff |
| UC-CH-05 | Delete message | AHAM | Staff |
| UC-CH-06 | Assign conversation to user | AHAM | Staff |
| UC-CH-07 | Delegate conversation | AHAM | Staff |
| UC-CH-08 | Reassign conversation | AHAM | Staff |
| UC-CH-09 | View thread participants | AHAM | Staff |
| UC-CH-10 | Search conversations | AHAM | Staff |

---

## 10. Video Consultation

| ID | Use Case | App | Actor |
|----|----------|-----|-------|
| UC-VC-01 | View scheduled consultations | AADI | Doctor |
| UC-VC-02 | Start video call (Agora RTC) | AADI | Doctor |
| UC-VC-03 | In-call chat messaging | AADI | Doctor |
| UC-VC-04 | Update consultation status | AADI | Doctor |
| UC-VC-05 | Quick reply templates | AADI | Doctor |
| UC-VC-06 | Upload post-consultation prescriptions | AADI | Doctor |
| UC-VC-07 | IVR call to patient | AADI | Doctor |
| UC-VC-08 | VC audit (start/stop tracking) | AADI | System |

---

## 11. Task & Workflow Management

### 11.1 Clinical Tasks (AADI)

| ID | Use Case | App | Actor |
|----|----------|-----|-------|
| UC-TK-01 | View task activity area (6 categories) | AADI | Doctor |
| UC-TK-02 | View progress notes pending acknowledgment | AADI | Doctor |
| UC-TK-03 | View discharge summary tasks (creation, signoff) | AADI | Doctor |
| UC-TK-04 | View initial assessment review tasks | AADI | Doctor |
| UC-TK-05 | View checklist approval tasks | AADI | Doctor |
| UC-TK-06 | View cross-consultation tasks | AADI | Doctor |

### 11.2 Billing Tasks (AHAM)

| ID | Use Case | App | Actor |
|----|----------|-----|-------|
| UC-TK-07 | View all tasks (3 queues: all, group, personal) | AHAM | Staff |
| UC-TK-08 | Filter tasks by 13 approval types | AHAM | Staff |
| UC-TK-09 | Claim and start task | AHAM | Staff |
| UC-TK-10 | Release claimed task back to group | AHAM | Staff |
| UC-TK-11 | Approve/reject task with process variables | AHAM | Staff |
| UC-TK-12 | View task detail with document data | AHAM | Staff |
| UC-TK-13 | Sort tasks by creation date | AHAM | Staff |

---

## 12. Billing & Finance

| ID | Use Case | App | Actor |
|----|----------|-----|-------|
| UC-BIL-01 | View invoices for patient | AHAM | Staff |
| UC-BIL-02 | Apply discount to invoice | AHAM | Staff |
| UC-BIL-03 | View receipts for invoice | AHAM | Staff |
| UC-BIL-04 | Cancel receipt | AHAM | Staff |
| UC-BIL-05 | Initiate refund | AHAM | Staff |
| UC-BIL-06 | View refund records | AHAM | Staff |
| UC-BIL-07 | View unbilled documents | AHAM | Staff |
| UC-BIL-08 | Process unbilled documents | AHAM | Staff |
| UC-BIL-09 | Retrospective invoice adjustment | AHAM | Staff |
| UC-BIL-10 | High-value medication approval | AHAM | Staff |
| UC-BIL-11 | Authorization approval | AHAM | Staff |
| UC-BIL-12 | Mandatory brand (LCHM) approval | AHAM | Staff |
| UC-BIL-13 | Invoice reversal | AHAM | Staff |
| UC-BIL-14 | Invoice cancellation | AHAM | Staff |

---

## 13. Outreach & Camp Management

| ID | Use Case | App | Actor |
|----|----------|-----|-------|
| UC-CMP-01 | View health camps for unit | AHAM | Staff |
| UC-CMP-02 | Start camp (NOT_STARTED -> IN_PROGRESS) | AHAM | Coordinator |
| UC-CMP-03 | Complete camp (IN_PROGRESS -> DONE) | AHAM | Coordinator |
| UC-CMP-04 | View patients registered in camp | AHAM | Staff |
| UC-CMP-05 | Register patient in camp (with temp ID) | AHAM | Staff |
| UC-CMP-06 | Assign UHID to temp-registered patient | AHAM | Staff |
| UC-CMP-07 | Update camp coordinators | AHAM | Staff |
| UC-CMP-08 | Create work pattern for camp | AHAM | Staff |
| UC-CMP-09 | Book appointment for camp patient | AHAM | Staff |

---

## 14. Follow-Up & Appointment Scheduling

| ID | Use Case | App | Actor |
|----|----------|-----|-------|
| UC-FU-01 | Schedule follow-up by duration (days/weeks/months) | AADI | Doctor |
| UC-FU-02 | Schedule follow-up by specific date | AADI | Doctor |
| UC-FU-03 | Search available appointment slots | AADI | Doctor |
| UC-FU-04 | Book follow-up appointment (in-person/video/tele) | AADI | Doctor |
| UC-FU-05 | Attach follow-up investigations | AADI | Doctor |
| UC-FU-06 | View follow-up history for patient | AADI | Doctor |

---

## 15. Medication Administration (Nursing)

| ID | Use Case | App | Actor |
|----|----------|-----|-------|
| UC-MA-01 | View 24-hour medication timeline | AADI | Nurse |
| UC-MA-02 | Record medication administration | AADI | Nurse |
| UC-MA-03 | Record refused/withheld/modified dose | AADI | Nurse |
| UC-MA-04 | View medication slot status (pending/administered/overdue) | AADI | Nurse |
| UC-MA-05 | Create nursing capture note (task) | AADI | Nurse |
| UC-MA-06 | Close nursing capture note | AADI | Nurse |

---

## 16. Document Management

| ID | Use Case | App | Actor |
|----|----------|-----|-------|
| UC-DOC-01 | Upload patient document | AHAM | Staff |
| UC-DOC-02 | View patient documents | Both | User |
| UC-DOC-03 | Download document | Both | User |
| UC-DOC-04 | Search documents by type/tags | Both | User |

---

## 17. System & Configuration

| ID | Use Case | App | Actor |
|----|----------|-----|-------|
| UC-SYS-01 | Fetch remote app configuration | Both | System |
| UC-SYS-02 | Check maintenance mode | Both | System |
| UC-SYS-03 | Lookup geography data (zipcode -> city/state) | AHAM | Staff |
| UC-SYS-04 | View organizations and units | AHAM | Staff |
| UC-SYS-05 | View FAQ categories | AHAM | Staff |
| UC-SYS-06 | Customer feedback surveys | AADI | Doctor |
| UC-SYS-07 | App event logging | Both | System |
| UC-SYS-08 | Server downtime notification | Both | System |
