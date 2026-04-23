# AADI Healthcare App - Engineering Specs Index

**Package:** `org.nh.app.aadi` (Narayana Health)
**Version:** 2.35.0 | **Framework:** Ionic/Capacitor Angular
**Source:** 553 TypeScript files recovered from APK source maps
**Total Spec Coverage:** 14 files, ~200KB documentation

---

## Spec Files

| # | File | Size | Coverage |
|---|------|------|----------|
| 01 | [01_DATA_MODELS.md](./01_DATA_MODELS.md) | 25K | All TypeScript classes, enums, interfaces, SQLite schemas, relationship diagram |
| 02 | [02_API_LAYER.md](./02_API_LAYER.md) | 16K | REST + ATHMA proxy endpoints by domain (auth, patient, medication, notes, etc.) |
| 03 | [03_PATIENT_MANAGEMENT.md](./03_PATIENT_MANAGEMENT.md) | 12K | Patient list, 9-dimension filtering, risk scoring, cross-consultation, care team, comorbidities |
| 04 | [04_MEDICATION_SYSTEM.md](./04_MEDICATION_SYSTEM.md) | 10K | Order lifecycle, dosage config, day-wise distribution, drug safety, reconciliation |
| 05 | [05_LAB_RESULTS.md](./05_LAB_RESULTS.md) | 12K | Investigation ordering, lab result processing, abnormal flags, D3.js trends, provisional results |
| 06 | [06_PROGRESS_NOTES.md](./06_PROGRESS_NOTES.md) | 11K | CKEditor5 notes, draft/submit/acknowledge workflow, macros, 30+ API endpoints |
| 07 | [07_DISCHARGE_SUMMARY.md](./07_DISCHARGE_SUMMARY.md) | 12K | 28 clinical sections, 7-state workflow, AI voice-to-text, comments, PDF print |
| 08 | [08_MISSING_FEATURES.md](./08_MISSING_FEATURES.md) | 18K | Gap analysis summary with all undocumented features identified by verification agents |
| 09 | [09_OPERATION_NOTES_PAC.md](./09_OPERATION_NOTES_PAC.md) | 10K | OT notes with SNOMED-CT, 15 mandatory sections, PAC with ASA scoring, version control |
| 10 | [10_CHECKLIST_SYSTEM.md](./10_CHECKLIST_SYSTEM.md) | 10K | Yes/No + Tick types, sequential answering, witness workflow, reject with reason |
| 11 | [11_HANDOVER_INCIDENT_DISCHARGE.md](./11_HANDOVER_INCIDENT_DISCHARGE.md) | 7K | Handover accept/reject, incident report with file upload, discharge intimation/revert |
| 12 | [12_PAST_RECORDS_FOLLOWUP.md](./12_PAST_RECORDS_FOLLOWUP.md) | 10K | Past consultations (6 pages), follow-up scheduling (duration/date modes), slot management |
| 13 | [13_CHAT_LOGIN_HOME.md](./13_CHAT_LOGIN_HOME.md) | 14K | Login (3 auth methods), landing dashboard, home patient list, chat (14 message types), ACS, FCM |
| 14 | [14_VITALS_VIEWS_SETTINGS.md](./14_VITALS_VIEWS_SETTINGS.md) | 12K | Vital trends (11 params, D3.js), ECG, CT scorecard, tasks, notifications, image editing, viewers |

---

## Complete Feature Map

### Clinical Workflows
- Patient Management (list, filter, sort, pin, search, QR scan) → 03
- Initial Assessment (27 dynamic widgets) → 03
- Progress Notes (create, edit, preview, acknowledge, macros) → 06
- Discharge Summary (28 sections, 7-state workflow, AI, comments) → 07
- Operation Notes (OT with SNOMED-CT, mandatory sections) → 09
- Pre-Anesthesia Checkup (PAC with ASA I-VI, versioning) → 09
- Checklists (yes/no + tick, sequential, witness, reject) → 10

### Orders & Results
- Medication Orders (lifecycle, dosage, IV infusion, reconciliation) → 04
- Current Medication Dashboard (24-hour timeline, 5 categories) → 14
- Investigation Orders (favorites, search, priority) → 05
- Lab Results (processing, abnormal flags, trend graphs) → 05
- Provisional Lab Results → 05

### Communication
- Patient Chat (14 message types, media, star/reply/delete) → 13
- Patient Communication (family messaging, IVR calls) → 03
- Cross-Consultation (specialist referral with priority) → 03

### Care Coordination
- Care Team Management (PC-based, HSC-based, admin, lock) → 03, 13
- Handover Request (accept/reject workflow) → 11
- Consultant Handover from patient list → 13
- Task Management (nursing capture notes) → 14
- Activity Area (6 task categories) → 14

### Clinical Tracking
- Risk Scoring (D3.js gauge, trend, parameters) → 03
- Vital Trends (11 parameters, 3 view modes, D3.js) → 14
- CT Scorecard (0-25 clinical tracking) → 14
- ECG Viewer (iframe waveform display) → 14
- Comorbidities Management → 03, 13

### Historical Data
- Past Records (6 pages: consultations, investigations, medications, attachments) → 12
- Follow-Up System (duration/date modes, slot booking, investigations) → 12
- Discharged Patients List → 03

### Safety & Compliance
- Incident Report (form + file upload) → 11
- Discharge Intimation / Revert → 11
- Drug Monograph (EHR_115) → 14
- Drug Interaction Check (EHR_119) → 14

### Platform
- Authentication (JWT + refresh + OTP + multi-account) → 13
- Local Storage (encrypted SQLite, SecureStorage, 45 keys) → 01
- Offline Support (message queue, sync on reconnect) → 13
- Analytics (Firebase, 76 screens, 8 actions) → 14
- Push Notifications (FCM, preference management) → 13, 14
- Video Consultation (Agora + OpenTok, WebSocket chat) → separate VC-APP module

---

## ATHMA Endpoint Codes (150+ total)

### By System
- **EHR_001-EHR_169**: Electronic Health Records (assessment, notes, medications, investigations, checklists, vitals, consultations)
- **DS_001-DS_012**: Discharge Summary
- **ADT_001-ADT_006**: Admission/Discharge/Transfer
- **MDM_001-MDM_009**: Master Data Management (value sets, config, templates, search)
- **LIS_003-LIS_004**: Laboratory Information System
- **AMB_001-AMB_008**: Ambulatory/Appointments
- **OT_001-OT_006**: Operating Theatre
- **CL_001-CL_003**: Checklists/Surgery Tracker
- **AI_001-AI_003**: AI Analytics
- **SM_001**: SNOMED-CT Search
- **DMS_001-DMS_002**: Document Management
- **UAA_003**: User Authentication/Authorities

---

## Source File Locations

```
extracted_apks/aadi_src/           # 553 recovered TypeScript files
extracted_apks/aadi_jadx/          # 12,120 decompiled Java files
extracted_apks/aadi_apktool/       # Resources, AndroidManifest.xml, assets
extracted_apks/aadi_raw/           # Original APK files (base + 4 splits)
```
