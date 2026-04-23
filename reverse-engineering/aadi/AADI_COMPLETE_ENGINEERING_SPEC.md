# AADI Healthcare App - Complete Engineering Specification

**Package:** `org.nh.app.aadi` (Narayana Health)
**Version:** 2.35.0 (code 23500)
**Framework:** Ionic/Capacitor (Angular 17+)
**Source Recovery:** 553 TypeScript files from source maps
**Analysis Date:** 2026-04-22

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication & Token Management](#2-authentication--token-management)
3. [API Service Layer](#3-api-service-layer)
4. [Data Models](#4-data-models)
5. [Local Storage & Database](#5-local-storage--database)
6. [Patient Management](#6-patient-management)
7. [Medication Orders System](#7-medication-orders-system)
8. [Lab Results & Investigations](#8-lab-results--investigations)
9. [Progress Notes & Discharge Summary](#9-progress-notes--discharge-summary)
10. [Video Consultation & Chat](#10-video-consultation--chat)
11. [Utilities, Pipes & Analytics](#11-utilities-pipes--analytics)

---

## 1. Architecture Overview

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Angular 17+ / Ionic 7 |
| Native Bridge | Capacitor 5 |
| Video | Agora RTC (current) + OpenTok (legacy) |
| Chat | Azure Communication Services + WebSocket (SockJS/STOMP) |
| Database | SQLite (encrypted via custom SecureDBKey plugin) |
| Secure Storage | Capacitor SecureStorage (Android Keystore-backed) |
| Rich Text | CKEditor5 Classic |
| Analytics | Firebase Analytics |
| Crash Reporting | Firebase Crashlytics |
| Push | Firebase Cloud Messaging |
| Speech | @capacitor-community/speech-recognition |
| HTTP | Angular HttpClient + @capacitor-community/http |
| Charts | D3.js v4+ |

### Package Structure

```
src/app/
├── components/          # 14 shared components (labels, chat, medication views)
├── directives/          # SafeAreaFooter directive
├── interceptors/        # AuthInterceptor, AuthExpiredInterceptor
├── model/               # 7 model files (PatientInfo, Message, WidgetsIA, etc.)
├── pages/               # 80+ lazy-loaded page modules
│   ├── VC-APP/          # Video consultation module (Agora, OpenTok, chat)
│   ├── careTeam-management/  # 6 care team sub-modules
│   ├── discharge-summary/    # Summary + comments + copy
│   ├── initial-assessment/   # Widgets, search, social history
│   ├── medication-*/         # 7 medication-related pages
│   ├── progress-notes*/      # 6 progress notes pages
│   └── ...              # 60+ other pages
├── pipes/               # 25 custom Angular pipes
├── resolver/            # 2 route resolvers
├── services/            # 25+ injectable services
│   ├── VC-APP/          # 5 VC-specific services
│   ├── auth/            # JWT, account, token refresh
│   └── ...
└── util/                # Constants, AthmaAPI, LabResultProcessor
```

### 41 Capacitor Plugins

Firebase (analytics, auth, crashlytics, firestore, functions, messaging, performance), SQLite, SecureStorage, SecureDBKey, Camera, Filesystem, FileOpener, FilePicker, FileViewer, VideoPlayer, VoiceRecorder, SpeechRecognition, HTTP, Network, Browser, BarcodeScanning, DeviceSecurityDetect, EmailComposer, IntentSender, Keyboard, StatusBar, SplashScreen, Haptics, SafeArea, ScreenOrientation, BackgroundTask, Device, App, AppLauncher, KeepAwake, Media.

---

## 2. Authentication & Token Management

### Login Flow

```
User submits credentials
  → POST {DOMAIN}/api/authenticate { username, password, rememberMe, deviceId }
  → Response: { id_token, refresh_token, accessExpiryTime, refreshExpiryTime }
  → Store TOKEN_CONFIG, AUTHENTICATION_TOKEN
  → GET {DOMAIN}/api/account → Store LOGIN_CREDENTIAL
  → Set LOGGED_IN = 1
  → Register FCM token with device details
  → Start TokenRefreshService scheduler
  → Navigate to last viewed module
```

### Dual Token System

| Token | Purpose | Storage Key | Lifetime |
|-------|---------|-------------|----------|
| Access Token (JWT) | API Bearer auth | `AUTHENTICATION_TOKEN` | ~30 min (server-configured) |
| Refresh Token | Silent token renewal | `TOKEN_CONFIG.refresh_token` | ~30 days |
| ATHMA Token | EHR system auth | `ATHMA_TOKEN` | 5 hours |
| ACS Token | Azure Chat auth | `USER_ACS_TOKEN` | ~24 hours |

### Auth Interceptor Chain

**AuthInterceptor** (1st in chain):
- Bypasses: `/api/authenticate`, `/api/refresh`, `/api/unsubscribe-device-session`
- Checks `accessExpiryTime` before each request
- If `secondsLeft <= 60` → triggers `refreshToken()` and queues request
- Request deduplication: concurrent requests wait for single refresh promise
- Attaches `Authorization: Bearer {token}` header

**AuthExpiredInterceptor** (2nd in chain):
- Catches all 401 responses → forces logout
- Logs error to SQLite `ErrorMessage` table

### Token Refresh

```typescript
// Proactive refresh: 60 seconds BEFORE expiry
// Scheduled via setTimeout((secondsLeft - 60) * 1000)
// On app resume: checks immediately, refreshes if needed
// On app pause: stops scheduler, unsubscribes ACS

POST {DOMAIN}/api/refresh
Body: { refreshToken, accessToken, login, deviceId }
Response: { accessToken, accessExpiryTime }
```

### App Lifecycle

```
App Launch → initStorage() → checkRootOrJailBreak() → platform.ready()
  → tokenRefreshService.initOnAppResume() → setPlatformListener()
  → SplashScreen.hide()

App Pause → chatService.unSubscribeToACS() → tokenRefreshService.stopScheduler()
App Resume → tokenRefreshService.initOnAppResume() → doMessageSyncBeforeRefresh()
```

### Storage Keys (40+ keys in AppStorageKeys enum)

**Auth:** AUTHENTICATION_TOKEN, TOKEN_CONFIG, LOGIN_CREDENTIAL, LOGGED_IN, ATHMA_TOKEN, ATHMA_TOKEN_TIME
**Chat:** USER_ACS_ID, USER_ACS_TOKEN, ACS_TOKEN_EXPIRY_DATE, LAST_MSG_INIT_TIME
**Device:** FCM_TOKEN, DOMAIN, APP_VERSION
**Sync:** LAST_SYNC_TIME, ALL_PATIENT_LIST_LOAD_FROM_SERVER_DONE, ALL_PATIENT_MSG_LOAD_DONE
**UI:** LAST_VIEW_MODULE, FILTER_SUBMIT, RESULT_FILTER_SUBMIT, SORT_BY_DETAIL
**Config:** CLIENT, USER_GROUP, LOCALE, COUNTRY

---

## 3. API Service Layer

### API Architecture

**Two API Systems:**
1. **Direct REST API:** `{DOMAIN}/api/{endpoint}` — standard CRUD
2. **ATHMA Proxy API:** `{DOMAIN}/api/athma/_search/athma-records-with-token` — EHR system wrapper using URL codes (EHR_001 through EHR_169, DS_001-DS_012, ADT_001-ADT_006, MDM_001-MDM_007, LIS_003-LIS_004, AMB_004-AMB_008, AI_001-AI_003, DMS_001-DMS_002)

### Key Endpoints by Domain

**Authentication:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/authenticate` | Login with credentials |
| POST | `/api/refresh` | Refresh access token |
| GET | `/api/account` | Get current user profile |
| POST | `/api/unsubscribe-device-session` | Logout + FCM unregister |

**Patient Management:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/my-patient-list` | Fetch assigned patients |
| GET | `/api/care-teams/patient/{mrn}` | Get patient care team |
| GET | `/api/_search/care-team-users` | Search care team members |
| POST | `/api/update/care-teams` | Update care team |
| GET | `/api/_search/recent-discharge-patients` | Discharged patients list |
| GET | `/api/_search/inpatient-status` | Patient admission status |
| GET | `/api/mortality-prediction-score/{mrn}/{enc}` | Risk score |

**Medication (20+ endpoints):**

| Code | Method | Purpose |
|------|--------|---------|
| EHR_019 | GET | Get medication list for encounter |
| EHR_020 | GET | Search medications (BRAND/GENERIC) |
| EHR_021 | POST/PUT/DELETE | Create/update/delete medication order |
| EHR_023 | GET | Frequency list |
| EHR_024 | GET | Favorite medications |
| EHR_025 | GET | Concept values (route, food instruction, etc.) |
| EHR_026 | PUT | Cancel medication order |
| EHR_106 | GET | Reconciled medications |
| EHR_107 | POST/PUT | Create/update reconciliation |
| EHR_108 | POST | Order reconciliation records |
| EHR_113 | PUT | Unhold medication |
| EHR_114 | PUT | Hold medication |
| EHR_115 | GET | Drug monograph |
| EHR_118 | PUT | Stop active medication |
| EHR_119 | GET | Drug interaction check |
| EHR_168 | GET | Medication card timings |
| Direct | POST | `/api/medication-order-record-action` — save order |

**Progress Notes (30+ endpoints):**

| Code | Method | Purpose |
|------|--------|---------|
| EHR_034 | POST/PUT/GET | Progress notes CRUD |
| EHR_031 | POST/PUT | Draft vitals save/update |
| EHR_032 | POST | Acknowledge progress notes |
| EHR_084 | PUT | Publish medications |
| EHR_085 | PUT | Publish investigations |
| EHR_086 | POST | Publish cross-consultation |
| EHR_087 | POST/DELETE | Draft investigations |
| EHR_088 | POST/DELETE | Draft cross-consultations |
| Direct | GET | `/api/_search/progress-notes-with-vitals` |
| Direct | POST | `/api/progress-notes-record-action` |

**Discharge Summary:**

| Code | Method | Purpose |
|------|--------|---------|
| DS_001 | GET | Get summary by admission |
| DS_002 | POST/PUT | Create/update summary |
| DS_003 | GET/PUT | Workflow transitions |
| DS_004 | GET | Regenerate summary |
| DS_007 | GET | Print summary (PDF blob) |
| DS_009 | PUT | Revert review status |
| DS_012 | PUT | Intimate discharge |

**Lab Results:**

| Code | Method | Purpose |
|------|--------|---------|
| EHR_104 | GET | Search investigations |
| EHR_105 | GET | Investigation favorites |
| LIS_003 | GET | Provisional lab results |
| LIS_004 | GET | Download PDF |
| Direct | POST | `/api/investigation-order-record-action` |

**Video Consultation:**

| Code | Method | Purpose |
|------|--------|---------|
| EHR_038 | POST | Load consultations |
| EHR_069 | PUT | Update consultation status |
| EHR_074 | PUT | Start IVR call |
| EHR_075 | PUT | Save client info |
| EHR_076/077 | PUT | VC audit start/stop |
| AMB_008 | GET | Get Agora app ID |

**Initial Assessment (27 widget endpoints):**

EHR_001 (sections), EHR_002 (allergies), EHR_003 (chief complaints), EHR_004-EHR_014 (various history/exam), EHR_029-EHR_037 (vitals, communicable diseases), EHR_050-EHR_051 (lines/tubes, implants), EHR_105 (favorites), EHR_128 (download PDF), EHR_140-EHR_141 (macros), EHR_145-EHR_165 (widget save/delete).

---

## 4. Data Models

### PatientInfo (Core Entity)

| Field | Type | Purpose |
|-------|------|---------|
| id | number | Primary key |
| mrn | string | Medical Record Number |
| name | string | Patient full name |
| birthDate | string | Date of birth |
| gender | string | M/F |
| unitCode | string | Ward/unit code |
| unit | string | Unit name |
| location | string | Bed location |
| encounterNumber | string | Clinical encounter ID |
| admissionNumber | string | Admission ID |
| admissionDate | string | Admission timestamp |
| admissionReason | string | Chief complaint |
| primaryConsultant | string | Attending physician |
| consultantLogin | string | Consultant login ID |
| ipActivityAction | IPActvityAction | MARK_DEAD, MARK_FOR_DISCHARGE, ABSCONDED |
| hscId | number | Healthcare Service Center ID |
| riskScore | string | Clinical risk score |
| wardCapability | string | ICU vs non-ICU |
| comorbidities | string | Comma-separated conditions |
| weight | string | Patient weight |
| mlc | boolean | Medico-Legal Case flag |
| visitType | string | NEW, FOLLOW-UP, EMERGENCY |
| dischargeIntimation | string | Discharge notification status |
| unreadMsgCount | number | Unread message count |
| pinFlag | number | Priority pin (0/1) |
| acsGroupId | string | Azure Communication Services group |

### Message Enums

```
MessageContext: PATIENT_INFO, PATIENT_MESSAGE, CARE_TEAM, DM_USER_INFO, DIRECT_MESSAGE, LOGOUT_MESSAGE
MessageAction: SAVE, DELETE, PUBLISH, PATIENT_INFO_ATTRIBUTE, LOGOUT
MessageStatus: NOT_SENT, SUCCESS, FAILURE, IN_PROGRESS
MessageCategory: LAB_RESULT, RAD_RESULT, DISCHARGE_SUMMARY, CHAT, INVESTIGATION_ORDER,
                 MEDICATION_ORDER, ADMISSION_MESSAGE, PROGRESS_NOTES, CROSS_CONSULTATION,
                 SYSTEM_REMINDER, INVESTIGATION_REPORT, BED_TRANSFER, KEY_VALUE_DATA,
                 ASSESSMENT_FORM, DISCHARGE_INTIMATION, INITIAL_ASSESSMENT
MessageSubCategory: AUDIO, TEXT, VIDEO, IMAGE, PDF, DOC, OTHERS
```

### PatientMessage

| Field | Type | Purpose |
|-------|------|---------|
| id | number | Message ID |
| patientInfoId | number | FK to PatientInfo |
| mrn | string | MRN (denormalized) |
| category | MessageCategory | Clinical category |
| subCategory | MessageSubCategory | Media type |
| contentType | ContentType | TEXT or JSON |
| content | any | Serialized payload |
| senderLogin/senderName | string | Sender |
| sentTime/receivedTime | string | Timestamps |
| messageStatus | MessageStatus | Delivery status |
| acsMessageId | number | ACS system message ID |
| read | number | 0=unread, 1=read |

### Clinical Models (via InvestigationService.ts)

**EncounterDTO:** consultant, department, unit, patient, encounterClass (INPATIENT/OPD), tariffClass, status, admissionDetailsDTO

**AdmissionDetailsDTO:** admissionNumber, visitType, department, primaryConsultant, supportingConsultants, admissionDate, expectedDischargeDate, ward (HealthcareServiceCenterDTO), bedNumber, reasonforAdmission, triage, medicoLegalCase, chargeClass

**WidgetModel:** concept (dynamic form data), reference (documentNumber, documentType), encounter, patient, version, active, latest

### 27 Initial Assessment Widgets (IAWidgets enum)

Allergy, Comorbidities, ChiefComplaints, SocialHistory, PastHistoryMedical, SurgicalHistory, ImplantableDevices, FamilyHistory, RelevantPersonalInvestigations, InvestigationResults, PastMedicationAndReconciliation, VitalSigns, GeneralExamination, SystemicExamination, MaternalAndChildHealth, ProvisionalDiagnosis, InvestigationsAdvised, TreatmentPlan, DischargePlanning, PsychologicalAssessment, CommunicableDiseaseAssessment, RadiationOncology, GeneralImpression, MLC, PrimarySurvey, LinesAndTubes, Psychological

---

## 5. Local Storage & Database

### SQLite Database (Encrypted)

**Name:** `aadi`
**Encryption:** SQLite cipher with 28-char random key (22 alphanumeric + 6-digit number)
**Key Storage:** SecureStorage via Android Keystore

#### Table: PatientInfo (35+ columns)

Key columns: id (PK), mrn, name, birth_date, gender, unit, unit_code, location, encounter_number, admission_number, primary_consultant, ip_activity_action, risk_score, ward_capability, comorbidities, unread_msg_count, pin_flag, pin_order, discharge_intimation, last_sync_time

**Indices:** idx_PI_mrn, idx_PI_last_msg_time DESC, idx_PI_location, idx_PI_ip_activity_action, idx_PI_pin_flag DESC, idx_PI_ward_sort, idx_pi_visit_type, idx_pi_mlc, idx_pi_primary_consultant, idx_PI_attending_consultant_login, idx_PI_consultant_handover_status, idx_pi_discharge_intimation

#### Table: PatientMessage (21 columns)

Key columns: id, patient_info_id (FK → PatientInfo ON DELETE CASCADE), mrn, category, sub_category, content_type, content, sender_login, sender_name, sent_time, action_id (PK for dedup), msg_status, acs_message_id, read

**Indices:** idx_PM_sent_time DESC, idx_PM_category, idx_PM_msg_delete, idx_PM_msg_status, idx_PM_message_id, idx_PM_read

#### Table: CareTeam (11 columns)

patient_info_id (FK → PatientInfo ON DELETE CASCADE), mrn, user_login, user_name, primary_consultant (JSON), careTeam (JSON array), active

#### Table: AppEventLog (16 columns)

event_date, log_level, event_category, event_action, request_url, request_method, response_status, error_message
**Retention:** 48-hour rolling window (auto-cleanup)

#### Table: ErrorMessage

url, description, eventtimer (for auth error tracking)

### Secure Storage (Capacitor SecureStorage)

Android Keystore-backed encryption for all 40+ AppStorageKeys. Migrated from localStorage on version upgrade.

### File System Caching

```
Directory.Data/{MRN}/
├── IMAGE/    # Image attachments
├── AUDIO/    # Voice recordings
├── VIDEO/    # Video files
├── DOC/      # Documents
└── PDF/      # PDF reports
```

### Offline Strategy

- **Fully offline:** Patient list, message history, care team, compose messages (queued as NOT_SENT)
- **Requires online:** Send messages, fetch new data, ACS chat, file uploads, API calls
- **Sync on reconnect:** Calculate offline duration → fetch missed messages → upload pending messages → reconnect ACS

---

## 6. Patient Management

### Patient List Filtering (9 dimensions)

1. **Location** — Ward/bed hierarchy with master select
2. **Ward** — ICU vs non-ICU
3. **Unit** — Organization units
4. **Primary Consultant** — With deduplication
5. **Attending Consultant** — Current attending
6. **Visit Type** — DC (Daycare), ER (Emergency), IP (Inpatient)
7. **Discharge Intimation** — TRUE/FALSE
8. **MLC/MFD** — Medico-Legal Case / Marked for Discharge
9. **Dead/Absconded** — Status flags

### Risk Scoring

- **Mortality prediction:** `GET /api/mortality-prediction-score/{mrn}/{encounter}`
- **Risk scorecard:** SVG gauge with Low (0-30%), Average (30-70%), High (70-100%)
- **Trend graph:** D3.js line chart with 2-day rolling window
- **Color coding:** Green < 33%, Red >= 33%
- **Parameters:** Individual scores for each clinical parameter

### Cross-Consultation

```
Doctor selects target unit → searches specialist → adds remarks/priority
→ POST /api/cross-consultation-record-action
→ Document number auto-generated
→ Optional message sent to target doctor
```

### Care Team Management

**Team types:** Primary Consultant-based, Location (HSC)-based
**Roles:** DOCTOR, NURSE, PARAMEDICS (with admin flag)
**CRUD:** `/api/care-team-template` (POST/GET)
**Concurrency:** Timestamp-based conflict detection

---

## 7. Medication Orders System

### Order Status Lifecycle

```
ADDED → ORDERED → PENDING → DISPENSED → ISSUED → CLOSED
                                    ↓
                            PARTIALLY_DISPENSED → PARTIALLY_ISSUED → PARTIALLY_CLOSED
ADDED → (delete)
ORDERED → CANCELLED
```

### Dosage Configuration

**Drug forms:** TABLET (0.5 or 1), CAPSULE (1), SYRUP (2.5/5/7.5/10 ml)
**Custom dosage:** Per-session (Morning/Afternoon/Evening/Night) with fractional support (1/4, 1/2)
**Frequency:** Once daily, Twice daily, Thrice daily, Four times, As needed, Custom
**Quantity calculation:** `ceil((morning + afternoon + evening + night) * duration)`

### Day-wise Distribution

| Frequency | Morning | Afternoon | Evening | Night |
|-----------|---------|-----------|---------|-------|
| Once (1) | dose | 0 | 0 | 0 |
| Twice (2) | dose | 0 | 0 | dose |
| Thrice (3) | dose | dose | 0 | dose |
| As needed (11) | 0 | 0 | 0 | 0 (qty=1) |

### Medicine Card Legends

R=Refuse, M=Modify, W=Withhold, S=Stopped, V=Vomited, A=Allergy, !=Overdue
Timeline: 4-slot view (Morning 00-06, Noon 06-12, Evening 12-18, Night 18-24)
Colors: ADMINISTERED=#2FB7B1 (teal), PENDING=#F1F1F1 (gray), OVERDUE=#FCCFCF (red)

---

## 8. Lab Results & Investigations

### Investigation Order Flow

```
Search services (EHR_104) or load favorites (EHR_105)
→ Select services with priority (NORMAL/URGENT)
→ Add instructions (0-250 chars)
→ POST /api/investigation-order-record-action { action: "ADD_AND_ORDER" }
```

### Lab Result Processing (LabResultProcesserUtil)

**Input:** Raw lab result with nested services hierarchy (up to 3 levels)
**Output:** Flattened display rows with abnormal flags

```
Abnormal flags: N=Normal, H=High, L=Low, PH=Panic High, PL=Panic Low, AH=Alert High, AL=Alert Low
Colors: Green (#5FBA63) for Normal, Red (#E35241) for Abnormal
```

**Result types:** GENERAL (single value), PARAMETER (multi-parameter panel)
**Report types:** ATTACHMENT_REPORT, DIAGNOSTIC_REPORT, EXTERNAL_REPORT, LIS_REPORT, SRM_REPORT

### Trend Graphing (D3.js)

- Time-series chart with data points color-coded by abnormal flag
- X-axis: Time (HH:MM) stacked with Date (DD/MM)
- Y-axis: Numeric values with nice() rounding
- Responsive: Recalculates on orientation change
- Auto-scroll to latest data point

### Result Filtering

- By result name (multi-select with search)
- By date (multi-select)
- Most recent: deduplicates by service code, keeps newest
- Stored in `RESULT_FILTER_SUBMIT`

---

## 9. Progress Notes & Discharge Summary

### Progress Notes

**Format:** Free-form rich text (CKEditor5) — NOT rigid SOAP format
**Toolbar:** bold, italic, bulleted list, numbered list
**Associated data:** Vitals, Medication Orders, Investigation Orders, Cross-Consultations

**Workflow:**
```
CREATE → DRAFT (save) or SUBMIT (send for acknowledgment)
  → If submitter = primary consultant: AUTO-ACKNOWLEDGED
  → If submitter ≠ primary consultant: PENDING ACKNOWLEDGMENT → ACKNOWLEDGED
```

**API:** `POST /api/progress-notes-record-action` + ATHMA EHR_034

### Discharge Summary

**Workflow states:** CREATE → DRAFT → SENT_FOR_REVIEW → UNDER_REVIEW → AMENDMENT → SIGN_OFF → COMPLETE

**28 clinical sections** (all CKEditor5): admission reason, chief complaint, medical/surgical/family/social history, past medications, vitals, allergies, general/systemic examination, investigation results, provisional/final diagnosis, medication at discharge, cross-consultation, condition at discharge, discharge/dietary/therapy advice, operation & procedure, follow-up, cause of death, active medication, comorbidities

**Comments workflow:** Multi-user review with timestamped comments, amendment tracking

### AI Discharge Summary

- Voice-to-text via @capacitor-community/speech-recognition
- AI processing: `POST AI_002` (generate AI EMR)
- Widget population from server-configured AI modules
- Keep-awake during recording

### Macros System

- User-created templates for frequently used clinical phrases
- CRUD via ATHMA EHR_140 (GET), EHR_141 (POST)
- Search with debounce (500ms)
- Scoped per widget type (progress-notes, discharge-summary sections)

---

## 10. Video Consultation & Chat

### Consultation Lifecycle

```
SCHEDULED → BOOKED → ARRIVED → IN_PROGRESS → DONE → COMPLETED
Cancellation: CANCELLED_BY_DOCTOR/PATIENT/SYSTEM, NO_SHOW, REJECTED
```

### Video Backends

**Agora RTC (current):**
- Codec: VP8, mode: "rtc"
- Dynamic app ID from API (AMB_008)
- Media tracks: createMicrophoneAudioTrack() + createCameraVideoTrack()
- Camera switching: filtered front/back device enumeration

**OpenTok (legacy):**
- Resolution: 320x240, frameRate: 7fps
- Session error 1004: token expired → navigate back

### Chat System

**WebSocket (STOMP over SockJS):**
```
Connect: {DOMAIN}/websocket/connect?access_token={token}
Subscribe: /consultation-topic/{appointmentNumber}
Publish: /consultation-topic/send-message
```

**Message format:** `{ appointmentNumber, messageId, content, userType: DOCTOR/PATIENT, sender, sentTime }`

**Quick replies:** 5 pre-set templates (Rejoin, IVR Call, Prescription, Admission, Noise)

### Azure Communication Services

- Chat client initialization with AzureCommunicationTokenCredential
- Thread-level messaging for care team communication
- Message sync on app resume: fetch from LAST_SYNC_TIME
- Offline queue: messages stored as NOT_SENT, retried on reconnect

### IVR Integration

- India-only (countryCode === 'IN')
- Endpoint: EHR_074 `?encounterNumber={enc}`
- Family communication via EHR_067 with bystander mobile numbers

### OPD Notes (Post-Consultation)

- Upload prescriptions: Camera, Gallery (max 5 files), File picker (PDFs)
- Base64 encoding with MD5 checksum
- Upload path: `/api/athma/_upload/base64FileDataWithChecksum`
- Auto-marks consultation as DONE after upload

---

## 11. Utilities, Pipes & Analytics

### 25 Custom Pipes

**Text:** aadiTitleCase, camelcaseToTitlecasewithSpace, slicepatientname, consultantShortname, highlightSearchText, labelname, patCommMsgFormat

**Date/Time:** ageFromDOB (pediatric logic: <5y shows full breakdown), sinceFromDate, isPediatricPatient, checkDateAsToday, convertUTCtoLocalDate, displayDateFormatResults, dateTimeFormat, lastMsgReceiveTimeFormat, timeFilter

**Data:** searchPatient, arrayFilterParam, reverselabresultservice, mandatorypipe

**Visual:** avatardesign (comorbidity badges), patientListAvatar (ICU=red, General=green), pdfresultfilter, labResultGenerator

### Analytics (Firebase)

**76 screen names** tracked via `AnalyticsService.setScreenName()`
**8 action types** tracked via `logUserActionEvent()`

**Event structure:**
```
screen_view: { screen_name, customer }
user_action: { feature_name, action_name, action_value, customer }
```

### Error Handling

1. **GlobalErrorHandler** → catches unhandled exceptions → LogEventService.saveAppErrors()
2. **AuthExpiredInterceptor** → 401 responses → force logout
3. **LogEventService** → SQLite AppEventLog table (48-hour retention)
4. **UtilUIAlert** → Toast notifications (2-5 second durations)
5. **LoadingService** → Ionic LoadingController wrappers (8-20 second timeouts)

### Task Activity System

**6 task categories:**
1. PROGRESS-NOTES-ACKNOWLEDGEMENT (PN)
2. DISCHARGE_SUMMARY_CREATION (DSC)
3. DISCHARGE_SUMMARY_SIGNOFF (DSS)
4. INITIAL_ASSESSMENT_REVIEW (IAR)
5. CHECKLIST_TASK_APPROVAL (CTA)
6. CROSS_CONSULTATION (CCT)

**Flow:** ActivityAreaPage → CategoryTypePage → ActivityTaskListPage → Route to specific modal

### Checklist System

- Surgical checklists with templated questions
- Sequential answering mode (one question at a time)
- Response types: Y/N, multiselect
- Review/approval workflow
- Witness configuration

### Operation Management

- Surgery search from hospital database + SNOMED-CT
- Duplicate prevention across both search sources
- Operation note create/edit/view lifecycle

---

## Appendix: Environment Configuration

```typescript
// Production
environment.production = true
environment.appRegistryUrl = 'https://aadiregistry.athma.health/'

// Runtime (from SecureStorage)
DOMAIN = 'https://api.{hospital}.com/'  // Trailing slash required
APP_VERSION = '2.35.0'
ACS_MESSAGE_RETRY_LIMIT = 10
ONLINE_SYNC_MESSAGE_INTERVAL = 300000  // 5 min
ATHMA_TOKEN_TTL = 5 hours
LOG_RETENTION = 48 hours
```

## Appendix: Source Files

```
extracted_apks/aadi_src/          # 553 recovered TypeScript files
extracted_apks/aadi_jadx/         # 12,120 decompiled Java files
extracted_apks/aadi_apktool/      # Resources, layouts, AndroidManifest.xml
extracted_apks/aadi_raw/          # Original APK files (base + 4 splits)
```
