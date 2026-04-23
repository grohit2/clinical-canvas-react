# Platform & Infrastructure

> Authentication, offline support, notifications, analytics, and app settings.

---

## 1. Authentication System

### Three Login Methods

```
LOGIN SCREEN
    |
    +-----> [Username & Password]
    |       Enter username + password
    |       Select country: India (+91) / Cayman Islands (+1)
    |       [Login]
    |
    +-----> [OTP via Phone]
    |       Enter 10-digit phone number
    |       [Send OTP]
    |       30-second countdown timer
    |       Enter 6-digit code
    |       [Verify]
    |
    +-----> [OTP via Email]
            Enter email address
            [Send OTP]
            Enter 6-digit code
            [Verify]
```

### Multi-Account Support

If a user works at multiple Narayana Health facilities:

```
User enters phone/email
    |
    v
OTP verified successfully
    |
    v
System finds multiple accounts:
  +------------------------------------------+
  |  SELECT ACCOUNT                          |
  |                                          |
  |  [Narayana Health City - Bangalore]      |
  |  [Narayana Multispeciality - Mysore]     |
  |  [Mazumdar Shaw Medical Center]          |
  +------------------------------------------+
    |
    v
User selects facility
    |
    v
App connects to that facility's server
```

### Token Lifecycle

```
LOGIN
  |
  v
Server returns:
  - Access Token (JWT) -----> expires in ~30 minutes
  - Refresh Token ----------> expires in ~30 days
  |
  v
DURING USE:
  |
  v
Every API call:
  Access token attached automatically
  |
  v
60 seconds before expiry:
  System automatically refreshes token in background
  No user interruption
  |
  v
If refresh token expires:
  User automatically logged out
  Redirected to login screen
```

### Remember Me

Credentials saved for quick re-login. On app restart, user goes directly to the dashboard if credentials are still valid.

---

## 2. Offline Support

### How It Works

AADI uses an **offline-first** architecture. Patient data is stored locally on the device in an encrypted database.

```
ONLINE MODE:
  All data syncs between device and server in real-time
  Messages sent immediately
  Lab results appear as they're released

OFFLINE MODE:
  +------------------------------------------+
  |  You are offline                         |
  |  [Toast notification at top]             |
  +------------------------------------------+

  CAN DO:
    - View patient list (from local database)
    - Read message history (cached locally)
    - View care team information
    - Compose new messages (queued for later)
    - Browse previously cached lab results

  CANNOT DO:
    - Send messages (queued, sent when online)
    - Fetch new data from server
    - Start video consultations
    - Upload files or images
    - Place new medication/investigation orders

RECONNECTING:
  Phone reconnects to internet
      |
      v
  Calculate how long offline
      |
      v
  Fetch all messages received during offline period
      |
      v
  Send all queued outgoing messages
      |
      v
  Reconnect to Azure Communication Services
      |
      v
  Resume normal operation
```

### Local Database

| What's Stored | Where | Encrypted? |
|---------------|-------|-----------|
| Patient demographics | SQLite | Yes (28-char key via Android Keystore) |
| Message history | SQLite | Yes |
| Care team data | SQLite | Yes |
| Auth tokens | Secure Storage | Yes (hardware-backed) |
| User preferences | Secure Storage | Yes |
| File attachments | Device filesystem | No (OS-level protection) |
| Error logs | SQLite | Yes |

### Database Tables

```
PatientInfo        -- 35+ columns, all assigned patients
PatientMessage     -- All messages (chat, system, clinical)
CareTeam           -- Team member assignments
AppEventLog        -- Error/event audit trail (auto-purged after 48 hours)
ErrorMessage       -- Auth error tracking
```

---

## 3. Push Notifications

### How Notifications Work

```
SERVER EVENT (e.g., new lab result)
    |
    v
Server sends push via Firebase Cloud Messaging (FCM)
    |
    v
Device receives notification
    |
    v
User taps notification
    |
    v
App opens to relevant patient/screen
```

### FCM Registration

```
After login:
  1. Get FCM token from Firebase
  2. Get device ID from Capacitor
  3. Send both to server: POST api/subscribe-notification/{fcmToken}
  4. Server associates token with user account

On logout:
  POST api/unsubscribe-notification/{token}?deviceId={id}
  (Device no longer receives notifications for this user)
```

### Notification Preferences

Users can control which notifications they receive:

```
NOTIFICATION PREFERENCES
    |
    +-- Mandatory (cannot disable):
    |     [Lock icon] Lab Results (Critical)
    |     [Lock icon] Medication Alerts
    |     [Lock icon] Emergency Notifications
    |
    +-- Optional (user can toggle):
          [Toggle] New Messages
          [Toggle] Progress Notes Acknowledgment
          [Toggle] Discharge Summary Updates
          [Toggle] Task Assignments
          [Toggle] Cross-Consultation Requests
```

**Mandatory** items show a lock icon and cannot be turned off.
**Optional** items have toggle switches.

Changes saved per user account.

---

## 4. Analytics (Firebase)

### What's Tracked

**76 screen views** are automatically tracked when users navigate:

| Category | Examples |
|----------|---------|
| Home screens | Landing, Patient List, Discharged Patients |
| Clinical | Progress Notes (Add/Edit/View), Discharge Summary, Initial Assessment |
| Medications | Medication List, Add, Dashboard |
| Investigations | Investigation List, Add, Results |
| Care Team | 8 template management screens |
| Tasks | Activity Area, Task Categories, Task List |
| Video Consultation | VC Screen, Chat, Notes, Past Consultation |
| Settings | Notification Preferences, What's New, FAQ |

**8 user actions** tracked for engagement:

| Action | When |
|--------|------|
| Barcode Scan (Search) | User scans patient barcode |
| Barcode Scan (Add) | User adds patient via barcode |
| View Progress Notes (from chat) | User opens notes from chat |
| Add Progress Notes (from chat) | User creates notes from chat |
| Copy Progress Notes | User copies previous notes |
| Unchart Progress Notes | User uncharts existing notes |
| Intimate Discharge | User initiates discharge |
| View Results (from chat) | User opens results from chat |

All events include: user ID, customer/facility, app version, device info.

---

## 5. App Settings & Information

### What's New (Changelog)

```
WHAT'S NEW
    |
    v
Version 2.35.0 (18 Apr 2026)
  - AI-powered discharge summary
  - Improved medication timeline
  - Bug fixes

Version 2.34.0 (01 Mar 2026)
  - CT Scorecard feature
  - Enhanced vital trends
  - Performance improvements

[Update Available!]
  Current: 2.34.0
  Latest: 2.35.0
  [Update Now] --> Opens Play Store
  [Not Now] --> Dismiss
```

### FAQ

Currently single FAQ:
> **Q: How do I delete my account?**
> A: Contact the helpdesk support at [hospital-email] to delete your account.

Email dynamically resolved per hospital facility.

### Feedback Surveys

```
FEEDBACK
    |
    v
+------------------------------------------+
|  Patient Satisfaction Survey             |
|  Created: 15 Apr 2026                    |
|  [Click here for feedback]              |
|  Status: Not completed                   |
+------------------------------------------+
|  Monthly Quality Survey                  |
|  Created: 01 Apr 2026                    |
|  [Completed] (link visited)             |
+------------------------------------------+

Clicking link:
  1. Opens external survey URL in browser
  2. Simultaneously marks as "viewed" on server
  3. Status updates to "Completed"
```

### Server Downtime Info

App checks for planned maintenance windows:

```
If downtime is active:
  +------------------------------------------+
  |  SCHEDULED MAINTENANCE                   |
  |  The system will be unavailable from     |
  |  10:00 PM to 2:00 AM for updates.       |
  +------------------------------------------+
```

---

## 6. Security Features

### Device Security

```
On app launch:
    |
    v
Check for root/jailbreak
    |
    v
If device compromised:
    Block app usage (security risk)
    |
    v
If clean:
    Continue to login
```

### Data Encryption

```
THREE LAYERS OF ENCRYPTION:

Layer 1: SQLite Database
  - Encrypted with 28-character random key
  - Key generated via native Android Keystore
  - Key never leaves the device

Layer 2: Secure Storage (Credentials)
  - Android Keystore-backed encryption
  - Hardware security module on capable devices
  - Stores: JWT tokens, user credentials, ACS tokens

Layer 3: Network Transport
  - All API calls over HTTPS (TLS)
  - Certificate pinning for hospital servers
  - ATHMA token for EHR system access
```

### Clipboard Security

In clinical text editors (progress notes, discharge summary):
- **Paste is blocked** — prevents copy-paste from external apps
- **Large text detection** — prevents automated paste attacks (>30 characters)
- Protects against accidental PHI leakage

### Session Management

```
App goes to BACKGROUND:
  - Stop token refresh scheduler
  - Disconnect from Azure Communication Services
  - Record offline timestamp

App comes to FOREGROUND:
  - Check token validity
  - If expired: refresh immediately
  - Reconnect to ACS
  - Sync missed messages
  - Resume normal operation

App LOGOUT:
  - Unsubscribe from push notifications
  - Clear tokens and session data
  - Stop all background services
  - Return to login screen
```

---

## 7. Image Editing

Built-in image editor for clinical photos:

```
CAPTURE / SELECT IMAGE
    |
    v
+------------------------------------------+
|  IMAGE EDITOR                            |
|                                          |
|  [Image preview with crop overlay]       |
|                                          |
|  Crop: Free-form (no fixed aspect ratio) |
|  Rotate: [Left] [Right]                 |
|  Delete: [Remove this image]             |
|  Retake: [Camera icon]                   |
|                                          |
|  Thumbnails: [1] [2] [3] [+]            |
|  Max 8 images per session                |
|                                          |
|  [Cancel]                    [Done]      |
+------------------------------------------+
```

**Specs:**
- Camera quality: 50% compression
- Resolution: 800 x 1250 pixels
- Crop library: Free-form (no fixed ratio)
- Supports camera capture + gallery multi-select

---

## 8. Error Handling & Debugging

### For Users

```
NETWORK ERROR:
  "You are offline. Please check your internet connection."
  (Toast notification, 2 seconds)

API ERROR:
  "Please try after sometime."
  (Toast notification, 2 seconds)

SESSION EXPIRED:
  Automatic logout
  Redirect to login screen

FEATURE NOT AVAILABLE:
  "This feature is not enabled for your unit."
  (Toast notification)
```

### For Developers (Log Viewer)

Hidden debug screen showing error logs:

```
+------+---------------------------+------------------+
| URL  | Description               | Timestamp        |
+------+---------------------------+------------------+
| /api | Token refresh failed      | 2026-04-18 03:30 |
| /api | Connection timeout        | 2026-04-18 03:28 |
| /api | 401 Unauthorized          | 2026-04-18 03:25 |
+------+---------------------------+------------------+

[Refresh]  [Clear All]

Auto-purged after 48 hours
```

---

## Key Specifications Summary

| Component | Technology | Detail |
|-----------|-----------|--------|
| **App Framework** | Ionic + Capacitor | Angular 17+, cross-platform |
| **Database** | SQLite | Encrypted, 5 tables, 35+ indices |
| **Secure Storage** | Android Keystore | 45+ configuration keys |
| **Push Notifications** | Firebase Cloud Messaging | Configurable per user |
| **Video Calls** | Agora RTC | VP8 codec, adaptive bitrate |
| **Chat** | Azure Communication Services | Real-time messaging |
| **Analytics** | Firebase Analytics | 76 screens, 8 action types |
| **Crash Reporting** | Firebase Crashlytics | Automatic exception capture |
| **Speech-to-Text** | Capacitor plugin | For AI discharge summaries |
| **Barcode Scanner** | ML Kit | Patient QR code scanning |
| **File Storage** | Capacitor Filesystem | Per-patient directories |
| **Rich Text Editor** | CKEditor 5 | Bold, italic, lists |
| **Charts** | D3.js v4+ | Vital trends, risk scoring |
| **Date Handling** | Moment.js | Timezone-aware formatting |
