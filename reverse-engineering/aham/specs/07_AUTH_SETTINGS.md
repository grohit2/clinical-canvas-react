# 07 - Authentication & Settings

**Module:** Auth, Client Setup, User Profile, Preferences, FAQ, FCM, Remote Config
**Source:** Reverse-engineered from `libapp.so` string table + decompiled Dart BLoC/model/service classes
**BLoCs:** LoginBloc, AuthenticationBloc, ClientSetupBloc, PreferenceBloc, UserProfileBloc, FAQBloc
**Services:** UserService, PrefernceService (sic), ClientRepository, UserRepository, PreferenceRepository

---

## 1. Login Flow

### LoginBloc

```
Events:
  └── LoginButtonPressed

States:
  ├── LoginInitial
  ├── LoginLoading
  ├── LoginSuccess
  └── LoginFailure { errorCode: String }
```

### Auth Endpoints

| Environment | Endpoint | Method |
|-------------|----------|--------|
| Production | `/gateway-api-v1/auth/login` | POST |
| UAT | `/uat/gateway-api-v1/auth/login` | POST |

### Request/Response

```
POST /gateway-api-v1/auth/login

Request:
{
  "username": String,
  "password": String
}

Response:
{
  "access_token": String,     // JWT, stored in SharedPreferences
  "refresh_token": String,    // JWT, stored in SharedPreferences
  "expires_in": int,          // seconds until access_token expiry
  "token_type": "Bearer"
}
```

### Error Codes (LoginFailure)

| Error | Message |
|-------|---------|
| `INVALID_CREDENTIALS` | "Failed to sign in! Invalid credentials" |
| `PASSWORD_EXPIRED` | "Failed to sign in! Password has expired" |
| `ACCOUNT_LOCKED` | "Account has been locked" |
| `ACCOUNT_DISABLED` | "Account has been disabled" |
| Network error | DioException message |

### Password Management

- Password expiry is enforced server-side; `PASSWORD_EXPIRED` error triggers password change flow
- Password visibility toggle on login screen (eye icon)
- No client-side password complexity validation (server-side only)

---

## 2. Token Refresh

### Endpoint

```
POST /api/reload/token

Headers:
  Authorization: Bearer <refresh_token>

Response:
{
  "access_token": String,     // new JWT
  "refresh_token": String,    // new refresh token
  "expires_in": int
}
```

### AuthenticationBloc

Manages session lifecycle:
- Monitors access token expiry
- Triggers automatic refresh before expiration
- On refresh failure: clears session, redirects to login
- Stores tokens in SharedPreferences (`access_token`, `refresh_token`)

### Token Storage (SharedPreferences)

| Key | Value | Purpose |
|-----|-------|---------|
| `access_token` | JWT string | API authorization header |
| `refresh_token` | JWT string | Token refresh requests |
| `logged-in-id` | String | Current logged-in user ID |
| `logged-in-login` | String | Current logged-in username |
| `logged-in-name` | String | Current logged-in display name |
| `logged-in-unit` | String | Current logged-in unit/facility |
| `logged-in-user` | String | Current logged-in user object (JSON) |
| `fcm_token` | String | Firebase Cloud Messaging device token |
| `appSharedPreferences` | String (JSON) | General app preferences blob |

---

## 3. Client Setup

### ClientSetupBloc

```
Events:
  └── VerifyClientEvent

States:
  ├── ClientSetupInitial
  ├── ClientSetupLoadingState
  ├── ClientSetupSuccessState
  ├── ClientSetupErrorState
  └── ClientBaseUrlSettingState
```

### Flow

```
1. App launch
       │
       ▼
2. ClientScreen
       │   User enters client/domain identifier
       │
       ▼
3. VerifyClientEvent dispatched
       │
       ▼
4. ClientSetupLoadingState
       │
       ▼
5. Fetch domain config
       │   GET /api/registry/_fetch-domain
       │
       ├── Success → ClientSetupSuccessState
       │       │
       │       ▼
       │   ClientBaseUrlSettingState
       │       │   Base URL configured for all subsequent API calls
       │       │
       │       ▼
       │   Proceed to Login
       │
       └── Failure → ClientSetupErrorState
               └── Show error, allow retry
```

### ClientRepository

```dart
class ClientRepository {
  Future<DomainConfig> fetchDomain(String clientCode);
  void setBaseUrl(String baseUrl);
  String? getBaseUrl();
}
```

### Domain Fetch API

```
GET /api/registry/_fetch-domain

Query Parameters:
  clientCode: String

Response:
{
  "domain": String,
  "baseUrl": String,
  "environment": String    // "PROD" or "UAT"
}
```

---

## 4. Multi-Facility Support

### APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/mdm/api/logged-in/organizations` | GET | Fetch organizations the user belongs to |
| `/mdm/api/logged-in/all-unit-hscs` | GET | Fetch all units/HSCs for current organization |

### Behavior

- After login, the app fetches all organizations the user has access to
- User can switch between facilities/units within the same session
- Switching facility updates the context for all subsequent API calls (tasks, camps, billing)
- Organization and unit selection persists in SharedPreferences

---

## 5. User Preferences

### PreferenceBloc

```
Events:
  ├── LoadPreferences
  └── PreferenceSave

States:
  ├── PreferenceIntialState      (sic - typo preserved from source)
  ├── PreferenceLoadedState
  ├── PreferenceSavingState
  ├── PreferenceSavedState
  └── PreferenceFailedState
```

### Repository & Service

```dart
class PreferenceRepository {
  Future<UserPreferences> fetchPreferences();
  Future<void> savePreferences(UserPreferences prefs);
}

class PrefernceService {          // sic - typo preserved from source
  Future<UserPreferences> getPreferences();
  Future<void> updatePreferences(UserPreferences prefs);
}
```

### Preference Fields

Stored as key-value pairs via the UAA service (`/uaa/api/account/preferences`):
- Language preference (8 supported: en, bn, gu, hi, kn, mr, ta, te)
- Notification settings
- Default facility/unit
- Theme preferences

---

## 6. User Profile

### UserProfileBloc

```
Events:
  └── FetchUserProfile

States:
  ├── UserProfileInitial
  ├── UserProfileLoading
  ├── UserProfileLoaded
  └── UserProfileError
```

### Repository & Service

```dart
class UserRepository {
  Future<UserModel> fetchUserProfile();
  Future<List<UserModel>> searchUsers(String query);
}

class UserService {
  Future<UserModel> getUserProfile();
  Future<List<UserModel>> searchUsers(String query);
}
```

### User Search API

```
GET /mdm/api/_search/users/i/id,login,displayName,firstName,lastName,employeeNo,designation,department,status,mobileNo

Query Parameters:
  searchTerm: String    // partial match on name, login, or employee number

Response: List<UserModel>
```

The URL path includes the projection fields (`id,login,displayName,...`) to limit the returned data.

---

## 7. FAQ

### FAQBloc

```
States:
  ├── FAQUninitialized
  ├── FAQFetching
  ├── FAQEmpty
  ├── FAQsFetched
  └── FAQError
```

### 6 FAQ Questions

| # | Question | Category |
|---|----------|----------|
| 1 | "What are Tasks?" | Tasks |
| 2 | "How to claim a task?" | Tasks |
| 3 | "How to approve a task?" | Tasks |
| 4 | "How to reject a task?" | Tasks |
| 5 | "How to revert a task?" | Tasks |
| 6 | "What is the difference between My Tasks and Group Tasks?" | Tasks |

All FAQ content is loaded locally (no API call); the BLoC emits `FAQsFetched` with hardcoded Q&A pairs.

### Screens

- `FAQScreen` - FAQ list with expandable categories
- Route: `/faq` (list), `/faqCategory` (category detail)

---

## 8. About Us & Privacy Policy

### About Us

- `AboutUsScreen` - Static screen with app information
- Route: `/aboutUs`
- Displays app version, build number, organization info

### Privacy Policy

- `PrivacyPolicyScreen` - WebView loading HTML content
- Route: `/privacyPolicy`
- Content URL: `/privacy-policy.html`
- Jurisdiction: Cayman Islands
- Governing law: Data Protection Act 2021
- Data Protection Officer: dpo@healthcity.ky

---

## 9. Firebase Cloud Messaging (FCM)

### FcmUserInfoModel

```dart
class FcmUserInfoModel {
  String? userId;
  String? fcmToken;
  String? deviceId;
  String? platform;        // "android" or "ios"
  String? appVersion;
}
```

### Push Notification Handling

```
App State         │ Handler
──────────────────┼──────────────────────
Foreground        │ onMessage (RemoteMessage.fromMap)
Background        │ Background handler (top-level function)
Terminated        │ getInitialMessage on app launch
```

- `RemoteMessage.fromMap` parses the FCM payload
- Background handler is a top-level Dart function (required by Firebase)
- FCM token is stored in SharedPreferences (`fcm_token`)
- Token is registered with backend on login and refreshed on token change

---

## 10. Remote Configuration

### AppRemoteConfigModel

```dart
class AppRemoteConfigModel {
  bool? enableAadhaarRegistration;     // enable_aadhaar_registration
  // additional feature flags loaded from Firebase Remote Config
}
```

### Known Feature Flags

| Flag | Type | Default | Purpose |
|------|------|---------|---------|
| `enable_aadhaar_registration` | bool | false | Controls Aadhaar KYC in patient registration |

Feature flags are fetched from Firebase Remote Config on app startup and cached locally.

### App Config Flavors

| Flavor | Purpose |
|--------|---------|
| `aham_appconfig` | Production configuration |
| `aham_appconfig_dev` | Development configuration |
| `aham_appconfig_sqa` | SQA/QA testing configuration |
| `aham_appconfig_uat` | UAT testing configuration |

---

## 11. Error Handling

### ErrorResponseModel

```dart
class ErrorResponseModel {
  String? errorCode;
  String? errorMessage;
  int? statusCode;
  String? timestamp;
  String? path;
}
```

Used across all API calls to parse error responses consistently.

---

## 12. Android Manifest Permissions (10)

### Standard Permissions (8)

| # | Permission | Purpose |
|---|-----------|---------|
| 1 | `android.permission.INTERNET` | Network access |
| 2 | `android.permission.CAMERA` | Photo capture (Aadhaar, attachments) |
| 3 | `android.permission.READ_EXTERNAL_STORAGE` | File access (pre-Android 13) |
| 4 | `android.permission.WRITE_EXTERNAL_STORAGE` | File writing (pre-Android 13) |
| 5 | `android.permission.POST_NOTIFICATIONS` | Push notifications (Android 13+) |
| 6 | `android.permission.ACCESS_NETWORK_STATE` | Network connectivity checks |
| 7 | `android.permission.ACCESS_WIFI_STATE` | Wi-Fi connectivity checks |
| 8 | `android.permission.WAKE_LOCK` | Background processing |

### GMS/Custom Permissions (2)

| # | Permission | Purpose |
|---|-----------|---------|
| 9 | `android.permission.READ_MEDIA_IMAGES` | Media access (Android 13+) |
| 10 | `com.google.android.c2dm.permission.RECEIVE` | GCM/FCM push message receipt |

---

## 13. App Startup Flow

```
1. Firebase Initialization
       │   - Firebase.initializeApp()
       │   - Remote Config fetch
       │   - FCM token retrieval
       │
       ▼
2. Client Setup
       │   - Check saved client config
       │   - If none: show ClientScreen
       │   - If exists: proceed
       │
       ▼
3. Base URL Configuration
       │   - Set base URL from client config
       │   - Configure Dio interceptors
       │
       ▼
4. ObjectBox Initialization
       │   - Open ObjectBox store
       │   - Initialize ChatHistoryDbManager
       │
       ▼
5. Login Check
       │
       ├── Valid session (token not expired)
       │       │
       │       ▼
       │   HomeScreen
       │
       └── No valid session
               │
               ▼
           LoginScreen
```

### Dio Interceptor Chain

```
Request Interceptor:
  1. Add Authorization: Bearer <access_token>
  2. Add Content-Type header
  3. Add facility/organization context headers

Response Interceptor:
  1. Check for 401 Unauthorized
  2. If 401: attempt token refresh
  3. If refresh success: retry original request
  4. If refresh failure: logout, redirect to LoginScreen

Error Interceptor:
  1. Parse ErrorResponseModel from response body
  2. Map DioException types to user-facing messages
  3. Log error details

Retry Layer:
  - RetryOptions (package:retry) for automatic retry on transient failures
  - Wraps Dio requests with configurable retry count and delay
```
