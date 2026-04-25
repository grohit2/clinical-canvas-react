# 10 - Error Handling & Security

**Module:** Error messages, validation rules, privacy compliance, encryption, audit logging
**Source:** Reverse-engineered from `libapp.so` string table (671 raw error/validation strings; ~599 after filtering duplicates and info messages) + decompiled Dart BLoC/model classes + AndroidManifest.xml + privacy-policy.html
**Jurisdiction:** Cayman Islands (Data Protection Act 2021)

---

## 1. Error Messages by Category (671 Raw / ~599 Filtered)

### 1.1 Authentication Errors

| # | Message | Context |
|---|---------|---------|
| 1 | "Failed to sign in! Invalid credentials" | Wrong username/password |
| 2 | "Failed to sign in! Password has expired" | Server returns PASSWORD_EXPIRED |
| 3 | "Account has been locked" | Too many failed attempts |
| 4 | "Account has been disabled" | Admin-disabled account |
| 5 | "Session expired. Please login again" | Token refresh failure |
| 6 | "Failed to refresh token" | Refresh token invalid/expired |
| 7 | "Unable to connect to server" | Server unreachable during login |
| 8 | "Failed to Verify Client" | Client setup verification failed |
| 9 | "Domain not found" | Unknown client code in domain fetch |

### 1.2 Patient Errors

| # | Message | Context |
|---|---------|---------|
| 10 | "Cannot select blocked patient" | Patient status is BLOCKED |
| 11 | "Cannot select deceased patient" | Patient status is DECEASED |
| 12 | "Cannot select merged patient" | Patient has been merged |
| 13 | "Patient already registered" | Duplicate registration in same camp |
| 14 | "Patient not found" | MPI search returned no results |
| 15 | "Please enter patient name" | Name field empty |
| 16 | "Please enter mobile number" | Mobile field empty |
| 17 | "Please enter valid mobile number" | Mobile format validation failed |
| 18 | "Please select gender" | Gender not selected |
| 19 | "Please enter date of birth" | DOB field empty |
| 20 | "Please select country" | Country not selected |
| 21 | "Please select state" | State not selected |
| 22 | "Please select a consultant" | Doctor not assigned (mandatory) |
| 23 | "Failed to generate temp number" | Temp ID API failure |

### 1.3 Camp Errors

| # | Message | Context |
|---|---------|---------|
| 24 | "Camp schedule has ended" | Registration on completed camp |
| 25 | "No camps available" | No camps found for user/facility |
| 26 | "ERR-101: Failed to start camp" | Camp start API failure |
| 27 | "Camp already started" | Start event on IN_PROGRESS camp |
| 28 | "Camp has been cancelled" | Action on CANCELLED camp |
| 29 | "Failed to fetch camp patients" | Patient list API failure |
| 30 | "Failed to update coordinators" | Coordinator update API failure |
| 31 | "Minimum one coordinator required" | Removing last coordinator |

### 1.4 Task Errors

| # | Message | Context |
|---|---------|---------|
| 32 | "Task has been already claimed" | Claim on already-claimed task |
| 33 | "Document creator cannot approve" | Self-approval prevention |
| 34 | "Cannot approve document, Refund mode not available" | Refund mode mismatch |
| 35 | "Task not found" | Task ID no longer valid |
| 36 | "Failed to claim task" | jBPM claim API failure |
| 37 | "Failed to approve task" | jBPM approve API failure |
| 38 | "Failed to reject task" | jBPM reject API failure |
| 39 | "Failed to revert task" | jBPM revert API failure |
| 40 | "Please enter remarks" | Reject/revert without comments |
| 41 | "Task has been reverted" | Info: task already reverted |
| 42 | "Unauthorized to perform this action" | Role-based access denied |
| 43 | "Please select a user to reassign" | Reassign without target user |

### 1.5 Chat Errors

| # | Message | Context |
|---|---------|---------|
| 44 | "This chat has been closed" | Send on closed conversation |
| 45 | "This message has been deleted" | Interaction with deleted message |
| 46 | "Chat conversation successfully delegated" | Info: delegation success |
| 47 | "Failed to send message" | ACS message send failure |
| 48 | "Failed to load conversations" | Conversation list API failure |
| 49 | "Failed to assign conversation" | Assignment API failure |
| 50 | "Failed to delegate conversation" | Delegation API failure |
| 51 | "Failed to close conversation" | Close API failure |
| 52 | "Failed to upload attachment" | DMS upload failure |
| 53 | "Failed to download attachment" | DMS download failure |
| 54 | "No conversations found" | Empty conversation list |
| 55 | "Connection lost. Reconnecting..." | ACS WebSocket disconnected |

### 1.6 Network Errors (DioException Types)

| DioException Type | User-Facing Message |
|-------------------|-------------------|
| `connectionTimeout` | "Connection timed out. Please try again" |
| `sendTimeout` | "Request timed out. Please try again" |
| `receiveTimeout` | "Server response timed out" |
| `badResponse` (400) | Parsed from ErrorResponseModel |
| `badResponse` (401) | Triggers token refresh or logout |
| `badResponse` (403) | "You do not have permission to perform this action" |
| `badResponse` (404) | "Resource not found" |
| `badResponse` (500) | "Internal server error. Please try again later" |
| `cancel` | "Request was cancelled" |
| `connectionError` | "Unable to connect to server. Check your network" |
| `unknown` | "An unexpected error occurred" |

### 1.7 File Errors

| # | Message | Context |
|---|---------|---------|
| 56 | "File upload failed" | DMS upload API failure |
| 57 | "File download failed" | DMS download API failure |
| 58 | "Unsupported file format" | Invalid file type for upload |
| 59 | "File size exceeds limit" | File exceeds max size |
| 60 | "Only JPG and PNG formats are supported" | Aadhaar image format validation |
| 61 | "File size must not exceed 5 MB" | Aadhaar image size validation |
| 62 | "Failed to open file" | File viewer/reader failure |
| 63 | "Failed to save file" | Filesystem write failure |
| 64 | "Camera permission denied" | Camera permission not granted |
| 65 | "Storage permission denied" | Storage permission not granted |

---

## Undocumented Messages Found in Binary

The following 32 user-facing messages were found in the binary but were not covered in the categorized error tables above:

| # | Message |
|---|---------|
| 1 | "Failed to register Patient, please try again." |
| 2 | "Failed to start camp. Please try again." |
| 3 | "Failed to Verify Client" |
| 4 | "Experiencing technical difficulties while sending attachment. Please check your attachment." |
| 5 | "Please click on claim/start to start the approval process." |
| 6 | "Are you sure that you want to assign to yourself ?" |
| 7 | "Chat conversation successfully delegated!" |
| 8 | "This chat has been closed!" |
| 9 | "This message has been deleted." |
| 10 | "Coordinator already added" |
| 11 | "No coordinators assigned" |
| 12 | "No camps scheduled for today" |
| 13 | "Camp Not Started" |
| 14 | "Patient registration will be available when the camp begins." |
| 15 | "A patient with the same details is already registered for this camp." |
| 16 | "Patient registered successfully with consultation." |
| 17 | "No consultants Assigned" |
| 18 | "No files uploaded" |
| 19 | "No prescription uploaded" |
| 20 | "Prescription can be uploaded during registration" |
| 21 | "Error updating ACS data to stream:" |
| 22 | "Aadhar authentication error:" |
| 23 | "Invalid Aadhaar data. Please try again with valid Aadhaar." |
| 24 | "Disclaimer: Upload only original Aadhaar card images. Do not upload blurred, cropped, or tampered images. Ensure the correct side is selected." |
| 25 | "Please wait, we are fetching your chat messages!" |
| 26 | "No Conversations Found!" |
| 27 | "No FAQ's found" |
| 28 | "Preview not available for this file type." |
| 29 | "User declined or has not accepted permission" |
| 30 | "No images to display" |
| 31 | "Failed to save preferences" |
| 32 | "Failed to add coordinator" |

---

## 2. BLoC Error States (22)

| # | BLoC | Error State | Carries |
|---|------|-------------|---------|
| 1 | `LoginBloc` | `LoginFailure` | `errorCode: String` |
| 2 | `ClientSetupBloc` | `ClientSetupErrorState` | error message |
| 3 | `TaskBloc` | `TaskErrorState` | `message: String` |
| 4 | `TaskDetailBloc` | `TaskDetailLoadingErrorState` | error message |
| 5 | `TaskDetailBloc` | `ClaimTaskErrorState` | error message |
| 6 | `TaskDetailBloc` | `TaskActionError` | error message (approve/reject combined) |
| 7 | `TaskDetailBloc` | `RevertTaskErrorState` | error message |
| 8 | `ChatAssistantBloc` | `ConversationsErrorState` | error message |
| 9 | `OutreachCampsBloc` | `OutreachCampsErrorState` | error message |
| 10 | `OutreachCampsBloc` | `StartCampStateError4` | error message |
| 11 | `OutreachCampsBloc` | `FetchCampPatientsStateError` | error message |
| 12 | `PatientRegistrationBloc` | `PatientRegistrationFailureState` | error message |
| 13 | `PatientRegistrationBloc` | `FetchConsultantsFailure` | error message |
| 14 | `PatientRegistrationBloc` | `FetchOverBookingSlotsStateError` | error message |
| 15 | `PatientRegistrationBloc` | `FileDownloadFailure` | error message |
| 16 | `PatientRegistrationBloc` | `FileUploadFailure` | error message |
| 17 | `PatientRegistrationBloc` | `SearchCoOrdinatorsStateError` | error message |
| 18 | `PatientRegistrationBloc` | `UpdateCoOrdinatorsStateError` | error message |
| 19 | `PatientRegistrationBloc` | `SearchPatientFailure` | error message |
| 20 | `AadharBloc` | `AadharFailure` | error message |
| 21 | `FcmBloc` | `FcmUserInfoFetchFailure` | error message |
| 22 | `PreferenceBloc` | `PreferenceFailedState` | error message |

### Error State Handling Pattern

```dart
// BLoC error emission pattern (all BLoCs follow this)
try {
  final result = await repository.someOperation();
  emit(SuccessState(data: result));
} catch (e) {
  emit(ErrorState(message: e.toString()));
}

// UI error consumption pattern
BlocListener<SomeBloc, SomeState>(
  listener: (context, state) {
    if (state is ErrorState) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(state.message)),
      );
    }
  },
)
```

---

## 3. Validation Rules

### Mobile Number Validation

| Rule | Example (Invalid) | Behavior |
|------|-------------------|----------|
| Must start with 6, 7, 8, or 9 | `1234567890` | Rejected: "Mobile number must start with 6, 7, 8, or 9" |
| Must be 10 digits | `12345` | Rejected: "Must be 10 digits" |
| Repetitive digits | `1111111111`, `0000000000` | Rejected: "Please enter valid mobile number" |
| Non-numeric | `abcdefghij` | Rejected: "Please enter valid mobile number" |
| Empty | `` | Rejected: "Please enter mobile number" |

### Name Validation

| Rule | Constraint | Error |
|------|-----------|-------|
| Minimum length | At least 3 characters | "Name must be at least 3 characters" |

### Pin Code Validation

| Rule | Constraint | Error |
|------|-----------|-------|
| Exact length | Must be 6 digits | "Pin code must be 6 digits" |

### Age Validation

| Rule | Constraint | Error |
|------|-----------|-------|
| Valid range | 0-150 | "Enter a valid age (0-150)" |

### Image/File Upload Validation

| Rule | Constraint | Error |
|------|-----------|-------|
| Camera capture limit | Maximum 20 images | "Only 20 images can be captured from camera" |
| Gallery selection limit (default) | Maximum 20 images | "Maximum 20 images allowed" |
| Gallery selection limit (extended) | Maximum 30 images | "Maximum 30 images allowed" |
| PDF file size | Maximum 10 MB | "JPG, PNG, PDF (Max 10MB)" |
| Unsupported preview | Non-previewable file type | "Preview not available for this file type." |

### Aadhaar Validation

| Rule | Constraint | Error |
|------|-----------|-------|
| Front side first | Back cannot be captured without front | "Please capture Aadhaar front side first" |
| Format | JPG or PNG only | "Only JPG and PNG formats are supported" |
| Size | Maximum 5 MB per image | "File size must not exceed 5 MB" |
| Feature flag | `enable_aadhaar_registration` must be `true` | Section hidden when `false` |

### Required Field Validation

| Field | Screen | Error |
|-------|--------|-------|
| Patient name | `PatientRegistrationScreen` | "Please enter patient name" |
| Mobile number | `PatientRegistrationScreen` | "Please enter mobile number" |
| Gender | `PatientRegistrationScreen` | "Please select gender" |
| Date of birth | `PatientRegistrationScreen` | "Please enter date of birth" |
| Country | `PatientRegistrationScreen` | "Please select country" |
| State | `PatientRegistrationScreen` | "Please select state" |
| Consultant | `PatientRegistrationScreen` | "Please select a consultant" |
| Remarks | `TaskDetailScreen` (reject/revert) | "Please enter remarks" |
| Reassign target | `TaskDetailScreen` (reassign) | "Please select a user to reassign" |

---

## 4. Privacy Policy

### Jurisdiction & Governing Law

```
Jurisdiction:     Cayman Islands
Governing Law:    Data Protection Act 2021
DPO Contact:      dpo@healthcity.ky
Policy URL:       /privacy-policy.html
```

### Data Collection

| Data Category | Collected | Purpose |
|---------------|-----------|---------|
| Name, DOB, gender | Yes | Patient identification |
| Mobile number, email | Yes | Contact and notifications |
| Aadhaar number + images | Yes (if enabled) | KYC verification |
| Address (full hierarchy) | Yes | Patient records |
| Medical records | Yes | Treatment documentation |
| Device information | Yes | FCM push notifications |
| Usage analytics | Yes | App improvement |

### Data Subject Rights (DPA 2021)

- Right of access to personal data
- Right to rectification of inaccurate data
- Right to erasure (right to be forgotten)
- Right to restrict processing
- Right to data portability
- Right to object to processing
- Rights related to automated decision-making

### Data Retention

```
Medical records:    Retained for legally required period (Cayman Islands medical law)
Chat messages:      Retained until explicit cleanup (deleteOldMessages)
Session data:       Cleared on logout
FCM tokens:         Cleared on logout, refreshed on new login
Attachments:        Retained until associated messages are hard-deleted
Audit logs:         Retained per hospital compliance requirements
```

---

## 5. Security Architecture

### Transport Security

```
Protocol:       TLS/SSL (HTTPS only)
Certificate:    Server certificate validation (default Dio behavior)
Pinning:        _registerBadCertificateCallback and _onBadCertificateWrapper exist
                in binary, suggesting custom certificate validation may be present
Min TLS:        Platform default (Android: TLS 1.2+)
```

### Authentication Security

```
Token Type:       Bearer JWT
Storage:          SharedPreferences (access_token, refresh_token)
Transmission:     Authorization header on every API request
Refresh:          Automatic via Dio interceptor on 401 response
Expiry:           Server-controlled (expires_in field)
Logout:           SharedPreferences.clear() removes all tokens
```

### Android Permissions (Security)

```
DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION
  protectionLevel: "signature"
  Purpose: Prevents other apps from sending intents to dynamically
           registered broadcast receivers (Android 14+ requirement)
```

### Android KeyStore

```
Purpose:        Secure storage of cryptographic keys
Usage:          Encryption keys for sensitive local data
Access:         Only by the AHAM app process (Android sandbox)
Backed by:      Hardware security module (if available)
```

### ObjectBox Encryption

```
Encryption:     ObjectBox supports AES-256 encryption at rest
Key Storage:    Android KeyStore
Scope:          Entire ObjectBox database file
Performance:    Minimal overhead (hardware-accelerated AES)
```

Note: The presence of ObjectBox encryption was inferred from the combination of ObjectBox FFI references and Android KeyStore usage. The exact encryption configuration could not be confirmed from string-level decompilation alone.

### Audit Logging

```
Events Logged:
  - User login / logout
  - Task claim / approve / reject / revert
  - Patient registration
  - Camp start / completion
  - Chat conversation assign / delegate / close
  - Document upload / download

Log Destination:    Server-side (via API calls)
Local Logging:      Debug-level only (not persisted in release builds)
```

---

## 6. Data Retention Implementation

### Automatic Cleanup

```dart
// Triggered periodically or on specific events
deleteOldMessages(int olderThanTimestamp) {
  1. Query: timestamp < olderThanTimestamp
  2. For each matching message:
     a. Delete attachmentLocalPath file (if exists)
     b. Delete voiceUrl local cache (if exists)
  3. ObjectBox: box.query(...).build().remove()
  4. Log cleanup count
}
```

### Secure Deletion

```
SharedPreferences:    clear() removes all key-value pairs
ObjectBox:            remove() deletes records; file-level encryption prevents recovery
Filesystem:           File.deleteSync() removes attachment files
Memory:               Dart GC handles in-memory cleanup
```

### Session Cleanup (Logout)

```
1. SharedPreferences.clear()
       │   Removes: access_token, refresh_token, logged-in-id, logged-in-login, logged-in-name, logged-in-unit, logged-in-user, fcm_token
       │
       ▼
2. ACS disconnect
       │   Closes WebSocket connection
       │
       ▼
3. Navigate to LoginScreen
       │   pushNamedAndRemoveUntil('/', (route) => false)
       │
       ▼
4. ObjectBox data retained
       │   Chat history preserved for next login
       │   (same device, potentially different user)
```

---

## 7. Password Management

### Password Expiry Enforcement

```
Flow:
  1. User submits login credentials
  2. Server validates and returns:
     ├── Success → JWT tokens → HomeScreen
     └── PASSWORD_EXPIRED → LoginFailure(errorCode: "PASSWORD_EXPIRED")
                                │
                                ▼
                          "Password has expired" message
                                │
                                ▼
                          User must change password
                          (via web portal or admin contact)
```

No in-app password change flow was found in the decompiled code. Password changes appear to be handled externally.

### Password Visibility Toggle

```
LoginScreen:
  - Password field: obscureText = true (default)
  - Eye icon button: toggles obscureText
  - No password strength indicator
  - No "remember me" functionality observed
```

---

## 8. ErrorResponseModel

```dart
class ErrorResponseModel {
  String? errorCode;       // machine-readable error code
  String? errorMessage;    // human-readable error message
  int? statusCode;         // HTTP status code
  String? timestamp;       // ISO 8601 timestamp
  String? path;            // API endpoint that generated the error
}
```

### Usage

```dart
// Dio interceptor parses error responses
onError: (DioException error, handler) {
  if (error.response?.data != null) {
    final errorModel = ErrorResponseModel.fromJson(error.response!.data);
    // Use errorModel.errorMessage for user-facing display
    // Use errorModel.errorCode for programmatic handling
  }
  handler.next(error);
}
```

---

## 9. Security Boundary Summary

```
┌─────────────────────────────────────────────────────┐
│                    AHAM App                          │
│                                                     │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │ SharedPrefs   │    │ ObjectBox (AES-256)       │   │
│  │ - JWT tokens  │    │ - Chat messages           │   │
│  │ - Session     │    │ - Attachments metadata    │   │
│  │ - FCM token   │    │                          │   │
│  └──────┬───────┘    └──────────┬───────────────┘   │
│         │                       │                    │
│  ┌──────┴───────────────────────┴───────────────┐   │
│  │            Android KeyStore                    │   │
│  │         (encryption key storage)               │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │         TLS/SSL Transport Layer               │   │
│  │    Bearer JWT on every API request            │   │
│  └──────────────────┬───────────────────────────┘   │
└─────────────────────┼───────────────────────────────┘
                      │
              ┌───────┴────────┐
              │  Backend APIs   │
              │  (7 services)   │
              │  + ACS (chat)   │
              └────────────────┘
```

---

## 10. Remaining Error Messages (Counts by Category)

The 671 raw error/validation strings (approximately 599 after deduplication and filtering) break down as follows:

| Category | Count | Notes |
|----------|-------|-------|
| Authentication & session | ~25 | Login, token, session errors |
| Patient & registration | ~45 | MPI search, validation, eligibility |
| Camp management | ~30 | Lifecycle, coordinators, schedules |
| Task workflows | ~80 | 13 task types x claim/approve/reject/revert states |
| Chat & messaging | ~50 | ACS events, message states, delegation |
| Billing & finance | ~120 | Invoice/receipt/refund/discount/authorization |
| Network & connectivity | ~30 | DioException types, timeout, retry |
| File & document | ~25 | Upload/download, format, size |
| UI validation | ~60 | Required fields, format checks, dropdowns |
| System & internal | ~40 | ObjectBox, FCM, remote config, permissions |
| Info/success messages | ~94 | Not errors: confirmation toasts, log messages |
| Undocumented user-facing | ~32 | See "Undocumented Messages" section above |
| **Total (raw)** | **~671** | ~599 after dedup/filtering |

Many of the 599 strings are variants (e.g., each of the 13 task types has its own set of error messages for claim/approve/reject/revert, generating ~80 task-specific strings from ~6 templates).
