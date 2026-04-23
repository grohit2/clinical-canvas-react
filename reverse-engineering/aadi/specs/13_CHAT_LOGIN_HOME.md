# AADI App - Patient Chat, Login, Home & Core Screens

**Source:** `aadi_src/src/app/pages/patient-chat/`, `login/`, `home/`, `landing/`, `groupinfo/`, `view-star-msg/`
**Services:** `services/chat/`, `services/login/`, `services/patient-msg/`

---

## 1. Login System

### 1.1 Three Authentication Methods

**Method 1: Username/Password**
```
Fields: username, password
Country selector: India (+91) | Cayman Islands (+1)
Device ID: Capacitor Device.getId()
→ POST {DOMAIN}/api/authenticate
  Body: { username, password, rememberMe, deviceId }
→ Response: { id_token, refresh_token, accessExpiryTime, refreshExpiryTime }
```

**Method 2: OTP via Phone**
```
1. Enter 10-digit phone number with country code
2. Generate OTP → SMS sent
3. 30-second countdown timer, "Resend OTP" after expiry
4. Enter 6-digit code (angular-code-input component)
5. Validate → Response includes accountDetails + loginDomainDetails[]
```

**Method 3: OTP via Email**
```
1. Enter email (regex validated)
2. Generate OTP → Email sent
3. Same verification flow as phone OTP
```

### 1.2 Multi-Account Support

If user has multiple domain accounts:
- Dropdown selector appears with domain list
- Selected account stores: DOMAIN, CLIENT, CLIENT_EMAIL, LOGIN_FIELD
- `LOGIN_WITH_EMAIL` flag tracks email-based login

### 1.3 Post-Login Sequence

```
1. Store TOKEN_CONFIG + AUTHENTICATION_TOKEN
2. GET api/account → Store LOGIN_CREDENTIAL
3. Set LOGGED_IN = 1
4. Store device ID
5. Initialize TokenRefreshService
6. FCM registration (subscribe-notification)
7. Navigate to /landing
```

### 1.4 Saved Credentials

- Username/password persisted with `rememberMe` flag
- Auto-populated on app restart

---

## 2. Landing Page (Dashboard)

### 2.1 Four Module Cards

| Card | Route | Data Source | Display |
|------|-------|-------------|---------|
| **Inpatients (IPL)** | `/home` | Cached count from PatientInfo table | Patient count |
| **Appointments (APL)** | `/home-vc` | `consultationService.appointmentListCount()` | Today's appointment count |
| **Activity Area** | Modal: ActivityAreaPage | `taskActivityService.getTasksCount()` from SQLite encounter numbers | Total task count |
| **Discharged Patients** | `/discharged-patients` | `dischargedPatientsService.getCount()` | Recent discharge count |

### 2.2 Data Loading

- `ionViewWillEnter()` → refresh all counts
- Queries encounter numbers from PatientInfo SQLite table
- Back button → exit confirmation dialog
- TASK flag in localStorage → auto-opens Activity modal
- App version check → routes to `/whats-new` if updated

---

## 3. Home Page (Inpatient List)

### 3.1 Patient Card Display

| Field | Source | Rendering |
|-------|--------|-----------|
| Name | `name` | Title-cased, prefix stripped |
| Gender/Age/Weight | `gender`, `birthDate`, `weight` | Age pipe: <5y shows y/m/d |
| Consultant | `consultantShortName` | 3-char abbreviated |
| Location | `location` | Ward/bed |
| MRN | `mrn` | Direct |
| Risk Score | `riskScore` | Black <33, Red >=33 |
| Badges | Various | MFD, MLC, DC, ER |
| Comorbidities | `comorbidities` | Color avatars (ICU=red, General=blue) |
| Unread Count | `unreadMsgCount` | Badge if >0 |
| Pin | `pinFlag` | Star icon |

### 3.2 List Operations

- **Tap** → Navigate to patient chat
- **Long Press** → Multi-select mode for handover
- **Search** → Real-time filter by name/MRN/consultant (debounced)
- **Filter** → 9-dimension filter modal (InpatientFilterPage)
- **Sort** → 4 columns: Name, Admission Date, Bed Number, Risk Score (InpatientFilterSortbyPage)
- **Pin/Unpin** → Pinned patients appear first

### 3.3 Patient Addition

- Search by name/MRN or QR barcode scan (Capacitor MLKit BarcodeScanner)
- Swipe gesture to confirm add
- "Find in hospital" fallback when patient not in assigned list
- Download progress bar with percentage tracking

### 3.4 Handover from Home

- Doctor-specific: Handover icon visible for DOCTOR user group
- Search consultant → select → multi-patient handover modal
- Skip option for no consultant selection

### 3.5 Data Layer

```sql
-- Patient list sorted by: pinned first, ICU first, newest messages first
SELECT * FROM PatientInfo
WHERE (ip_activity_action IS NULL OR ip_activity_action != 'excluded_values')
ORDER BY pin_flag DESC, pin_order DESC, ward_sort ASC, last_msg_time DESC
```

---

## 4. Patient Chat Page

### 4.1 Message Categories Supported

| Category | SubCategories | Content |
|----------|--------------|---------|
| CHAT | TEXT, IMAGE, AUDIO, VIDEO, DOC, PDF | User-generated content |
| LAB_RESULT | — | Lab test results with parameters/flags |
| RAD_RESULT | — | Radiology images with DICOM viewer |
| INVESTIGATION_REPORT | — | Diagnostic/radiology reports |
| MEDICATION_ORDER | — | Medication order details |
| PROGRESS_NOTES | — | Clinical notes with status badges |
| DISCHARGE_SUMMARY | — | DS with amendment tracking |
| INITIAL_ASSESSMENT | — | Assessment form link |
| ADMISSION_MESSAGE | — | Admission details (date, category, location) |
| DISCHARGE_INTIMATION | — | Discharge notification |
| CROSS_CONSULTATION | — | Priority-based (NORMAL/URGENT) |
| SYSTEM_REMINDER | — | System alert messages |
| BED_TRANSFER | — | Transfer notification |
| KEY_VALUE_DATA (VITALS) | — | Vital signs data |

### 4.2 Media Handling

**Images:**
- Multi-image per message: `[{ fileName, filepath, appCacheFilePath }]`
- Lazy loading with local cache path resolution
- Download from server if cache miss: `GET api/downloadFile?filePath={url}&name={name}&contentType={type}`
- Write to `Directory.Data/{mrn}/{filename}`

**Audio:** MP3 (Android) / WAV (iOS), inline player

**Video:** MP4 + PNG thumbnail, CapacitorVideoPlayer for playback, full-screen

**PDF/DOC:** Download on demand, base64 storage, File extension validation

### 4.3 Message Actions

| Action | Behavior |
|--------|----------|
| **Star** | Toggle msgStarred object; only sender or consultant can star |
| **Reply** | Shows parent message context card; parentMessageId + parentMessageDTO |
| **Delete** | Soft delete (msgDeleted=true); cannot delete starred without unstarring |
| **Download** | Automatic for text, lazy for attachments; Filesystem + Capacitor.convertFileSrc() |

### 4.4 Message Sending Pipeline

```
1. Compose: FormData with content, MRN, fileName
2. Validate: Network status check
3. Local save: SQLite with PENDING status
4. Upload:
   - Image: Sequential upload of all images in array
   - Audio/Video/Doc: Single upload with type-specific handling
   - Endpoint: POST api/uploadFileData (multipart/form-data)
5. Server confirmation: Message gets server ID
6. Status update: PENDING → SUCCESS / FAILED
```

### 4.5 ACS (Azure Communication Services) Integration

```
Endpoint: nhazurecommunicationservices.communication.azure.com
Token: USER_ACS_TOKEN with 1-hour refresh threshold
Client: ChatClient + ChatThreadClient pattern
Offline: Messages queued in SQLite, retried on reconnect
Sync: fetchMessagesFromOfflineTimeFromServer(lastSyncTime) on resume
```

### 4.6 Timestamp Grouping

- Date separators between message groups
- Format: "Today" | "Yesterday" | "D MMMM YYYY"
- Time on messages: HH:mm

---

## 5. Group Info Page (Patient Details)

### 5.1 Tabbed Sections

| Tab | Content | Editable |
|-----|---------|----------|
| **Info** | Name, MRN, consultant, attending, procedure, admission date/number, unit, location, patient plan | Read-only |
| **Tags** | 2 user-defined labels (max 30 chars each), system labels (read-only) | Yes |
| **Comorbidities** | Master list with toggle active/inactive per condition | Yes |
| **Patient Criticality** | Dropdown: NONE/LOW/MEDIUM/HIGH (ICU-only, disabled for non-ICU) | Yes |
| **Care Team** | Primary consultant (read-only), team members (add/remove/toggle admin), search & add, lock toggle | Yes |

### 5.2 Care Team Management

```typescript
CareTeamSubmission {
    appCareTeamId: number;
    careTeam: Array<{
        user: { displayName, login, employeeNo };
        category: { code: "DOCTOR"|"NURSE"|"PARAMEDICS", display };
        admin: boolean;
        active: boolean;
    }>;
    modifiedBy: string;
    lock: boolean;                     // Only primary consultant can toggle
}
```

### 5.3 Save Flow

1. Detect changes in 3 areas: comorbidity, care team, labels
2. Set flags: comorbidityFlag, careTeamFlag, labelsFlag
3. Open GroupinfoSavePage modal showing save progress
4. Parallel submission to server
5. Auto-dismiss after 5 seconds

---

## 6. Starred Messages Page

- Modal: `view-star-msg.page.ts`
- Fetch: `getStarredMessageFromServer(patientInfoId, mrn, login)`
- API: `GET api/_search/star-messages?query&mrn&login&page=0&size=1000&sort=id,asc`
- Sorted by sentTime descending
- Unstar action: Only starrer or consultant can unstar
- Full message rendering with reply context cards

---

## 7. Missing Chat/Message API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `api/messages/patient-messages/{login}/{mrn}?loadCompleteHistory&page&size=1000&time` | Get patient messages with pagination |
| GET | `api/messages/{messageId}` | Get specific message |
| POST | `api/messages/{messageId}` | Update message |
| GET | `api/messages/reload-patient-messages/{loginId}/{mrn}/{loadAll}` | Reload messages (0 or 1) |
| GET | `api/messages/reload-patient-messages/ALL/{loginId}/{hours}` | Reload all within N hours |
| GET | `api/_search/star-messages` | Search starred messages |
| GET | `api/star/patient-message` | Get star message details |
| POST | `api/offline-patient-messages` | Post offline messages batch |
| POST | `api/uploadFileData` | Upload attachment (multipart/form-data) |
| GET | `api/downloadFile` | Download attachment |
| POST | `api/create/app-message` | Create app message |
| POST | `api/fetch/patient-info-by-acs-group-id` | Patient info by ACS group |
| GET | `api/dm-user-list/{userLogin}` | Direct message user list |

---

## 8. FCM/Push Notification Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `api/subscribe-notification/{userFcmToken}?subscribingUserToken={token}` | Subscribe to push |
| POST | `api/unsubscribe-notification/unsubscribingUserToken/{token}?deviceId={id}` | Unsubscribe |
| POST | `api/manage-notification-subscription/{userFcmToken}` | Manage subscriptions |
| POST | `api/user-fcm-tokens` | Register FCM token |

---

## 9. Care Team Real-Time Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `api/update/care-teams/add-user/http-publish` | Add user with real-time publish (params: login, mrn, userCategoryCode, userCategoryDisplay) |
| PUT | `api/update/care-teams/user-last-seen-time/{mrn}/{loginId}` | Update last seen time |
