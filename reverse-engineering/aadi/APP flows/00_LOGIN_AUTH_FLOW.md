# Flow 00: Login & Authentication

**App:** AADI (org.nh.app.aadi) v2.35.0
**Framework:** Ionic 7 / Capacitor 5 / Angular 17+
**Source files:** `login.page.ts` (523 lines), `login.service.ts` (269 lines), `auth-jwt.service.ts` (205 lines), `account.service.ts` (124 lines), `token-refresh.service.ts` (216 lines), `auth.interceptor.ts` (125 lines), `auth-expired.interceptor.ts` (45 lines), `app-storage.service.ts` (151 lines), `database.service.ts` (123 lines), `network.service.ts` (114 lines), `app.component.ts` (935 lines)

---

## 1. Overview

AADI is a bedside clinical app used by doctors and nurses at Narayana Health hospitals. Authentication is the gateway to all patient data, so it is hardened with encrypted storage, dual-token refresh, jailbreak detection, and multi-device session management.

**Three login methods exist:**

| # | Method | Primary Use Case | API Entry Point |
|---|--------|-----------------|-----------------|
| 1 | Phone + OTP | India (+91), Cayman Islands (+1-345) | `validate-user-by-mobile` |
| 2 | Email + OTP | Users without registered phone | `validate-user-by-email` |
| 3 | Username + Password | Fallback / legacy accounts | `/api/authenticate` |

**Token architecture:**

| Token | Lifetime | Purpose |
|-------|----------|---------|
| Access Token (JWT) | ~30 minutes (server-configured) | Bearer auth on every API call |
| Refresh Token | ~30 days | Silent renewal of access token |
| ATHMA Token | 5 hours | EHR system proxy auth (separate concern) |
| ACS Token | ~24 hours | Azure Communication Services chat |

---

## 2. Screen-by-Screen Walkthrough

### 2.1 Login Screen (login.page.ts / login.page.html)

```
+--------------------------------------------------+
|                   AADI Logo                       |
|                                                   |
|  [  Phone  |  Email  |  Username  ]  <-- tabs     |
|                                                   |
|  ---- Phone Tab (default) ----                    |
|                                                   |
|  Country:  [ India (+91)        v ]  <-- picker   |
|                                                   |
|  Phone:    [ __ __ __ __ __ __ __ __ __ __ ]     |
|            (10 digits for India)                  |
|                                                   |
|  [ Validate Phone ]  <-- primary button           |
|                                                   |
+--------------------------------------------------+
```

**Tab states:**

- `Phone` tab: country picker + phone input + "Validate Phone" button
- `Email` tab: email input + "Validate Email" button
- `Username` tab: username input + password input + "Login" button

### 2.2 OTP Entry Screen (same page, conditional render)

After successful phone/email validation, the UI transitions:

```
+--------------------------------------------------+
|                   AADI Logo                       |
|                                                   |
|  OTP sent to +91-XXXXXXXX89                       |
|                                                   |
|  User:  [ Dr. Sharma, Cardiology   v ]  <-- shown |
|          (only if multiple users returned)         |
|                                                   |
|  OTP:   [ __ __ __ __ __ __ ]  (6 digits)        |
|                                                   |
|  [ Verify OTP ]                                   |
|                                                   |
|  Resend OTP in 0:27  <-- 30-second countdown      |
|  [Resend OTP]         <-- enabled when timer = 0  |
|                                                   |
|  [< Back to Phone Entry]                          |
+--------------------------------------------------+
```

### 2.3 Multi-User Selection (inline within OTP screen)

When the API returns multiple users (same phone registered across facilities):

```
+--------------------------------------------------+
|  Select your account:                             |
|                                                   |
|  +----------------------------------------------+|
|  | ion-select                                    ||
|  |  > Dr. Sharma (Cardiology, Bangalore)         ||
|  |    Dr. Sharma (Cardiology, Cayman)             ||
|  |    Dr. Sharma (Internal Med, Bangalore)        ||
|  +----------------------------------------------+|
|                                                   |
|  OTP: [ __ __ __ __ __ __ ]                      |
|  [ Verify OTP ]                                   |
+--------------------------------------------------+
```

The `ion-select` dropdown lists each user object from `userList`. On selection:
- `loginUser` is set to the chosen user object
- `domain` is extracted from that user's record
- `client` is set from the user's facility

### 2.4 Username/Password Screen (tab 3)

```
+--------------------------------------------------+
|                   AADI Logo                       |
|                                                   |
|  [  Phone  |  Email  | *Username* ]               |
|                                                   |
|  Username:  [ _________________________ ]         |
|                                                   |
|  Password:  [ _________________________ ]         |
|             (ion-input type="password")           |
|                                                   |
|  [ Login ]                                        |
|                                                   |
+--------------------------------------------------+
```

### 2.5 Landing Page (post-login destination)

After successful login, the app navigates to `/landing`. This is covered in `01_LANDING_HOME_FLOW.md`.

---

## 3. Complete API Reference

### 3.1 Phone Validation

**Endpoint:** `POST {environment.appRegistryUrl}validate-user-by-mobile`

This is NOT the main domain. `appRegistryUrl` is a separate central registry service that handles user lookup across all Narayana Health facilities.

**Request:**
```json
{
  "mobileNumber": "+919876543210",
  "appId": "AADI",
  "client": "NH_BANGALORE"
}
```

| Field | Type | Rules |
|-------|------|-------|
| mobileNumber | string | Must include country code. India: `+91` + 10 digits. Cayman: `+1345` + 7 digits. |
| appId | string | Always `"AADI"` (hardcoded constant) |
| client | string | Current CLIENT value from SecureStorage. Set during initial config or previous login. |

**Response (success - single user):**
```json
{
  "userList": [
    {
      "login": "dr.sharma",
      "displayName": "Dr. Ankit Sharma",
      "email": "ankit.sharma@narayanahealth.org",
      "domain": "https://bangalore.narayanahealth.org/",
      "client": "NH_BANGALORE",
      "facility": "Narayana Health City, Bangalore"
    }
  ]
}
```

**Response (success - multiple users):**
```json
{
  "userList": [
    {
      "login": "dr.sharma",
      "displayName": "Dr. Ankit Sharma (Bangalore)",
      "domain": "https://bangalore.narayanahealth.org/",
      "client": "NH_BANGALORE",
      "facility": "Narayana Health City, Bangalore"
    },
    {
      "login": "dr.sharma.cay",
      "displayName": "Dr. Ankit Sharma (Cayman)",
      "domain": "https://cayman.narayanahealth.org/",
      "client": "NH_CAYMAN",
      "facility": "Health City Cayman Islands"
    }
  ]
}
```

**Response (user not found):**
```json
{
  "userList": []
}
```
UI action: show toast "User not registered with AADI".

**Response (server error):**
HTTP 500 with generic error body. UI action: show toast "Server error. Please try after sometime".

---

### 3.2 Email Validation

**Endpoint:** `POST {environment.appRegistryUrl}validate-user-by-email`

**Request:**
```json
{
  "email": "ankit.sharma@narayanahealth.org",
  "appId": "AADI",
  "client": "NH_BANGALORE"
}
```

**Response:** Identical structure to phone validation (`userList` array). Same multi-user handling applies.

---

### 3.3 OTP Validation

**Endpoint:** `POST {environment.appRegistryUrl}validate-otp`

**Request:**
```json
{
  "mobileNumber": "+919876543210",
  "otp": "482917",
  "login": "dr.sharma",
  "appId": "AADI",
  "domain": "https://bangalore.narayanahealth.org/",
  "client": "NH_BANGALORE"
}
```

| Field | Type | Rules |
|-------|------|-------|
| mobileNumber | string | Same number used in validate step. For email flow, this may be the email instead. |
| otp | string | 6-digit OTP entered by user |
| login | string | The `login` field from the selected user in `userList` |
| appId | string | Always `"AADI"` |
| domain | string | The `domain` from the selected user. Trailing slash included. |
| client | string | The `client` from the selected user |

**Response (success):**
```json
{
  "id_token": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkci5zaGFybWEiLC...",
  "tokenConfig": {
    "accessExpiryTime": "2026-04-22T15:30:00.000Z",
    "refreshExpiryTime": "2026-05-22T14:00:00.000Z",
    "refresh_token": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJyZWZyZXNoXy..."
  }
}
```

Alternatively, for multi-domain users, the response may include user credentials that are then passed to `LoginService.login()`.

**Response (invalid OTP):**
HTTP 400 or 401. UI action: show toast "Invalid OTP".

**Response (OTP expired):**
HTTP 400 with specific error code. UI action: show toast "OTP expired. Please request a new one".

---

### 3.4 Username/Password Login (Direct)

**Endpoint:** `POST {DOMAIN}api/authenticate`

Note: `{DOMAIN}` is the facility-specific domain (e.g., `https://bangalore.narayanahealth.org/`). Already has trailing slash. So the full URL is `https://bangalore.narayanahealth.org/api/authenticate`.

**Request:**
```json
{
  "username": "dr.sharma",
  "password": "S3cur3P@ss!",
  "rememberMe": true
}
```

| Field | Type | Rules |
|-------|------|-------|
| username | string | User's login ID |
| password | string | Plaintext password (HTTPS encrypts in transit) |
| rememberMe | boolean | Always `true` in AADI (hardcoded) — tells server to issue long-lived refresh token |

**Response (success):**
```json
{
  "id_token": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJkci5zaGFybWEiLCJhdXRoIjoiUk9MRV9ET0NUT1IiLCJleHAiOjE3MTM4MH0...",
  "tokenConfig": {
    "accessExpiryTime": "2026-04-22T15:30:00.000Z",
    "refreshExpiryTime": "2026-05-22T14:00:00.000Z",
    "refresh_token": "eyJhbGciOiJIUzUxMiJ9..."
  }
}
```

**Response (invalid credentials):**
HTTP 401:
```json
{
  "type": "https://www.jhipster.tech/problem/unauthorized",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Bad credentials"
}
```
UI action: show toast "Invalid username or password".

---

### 3.5 Get User Profile

**Endpoint:** `GET {DOMAIN}api/account`

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:**
```json
{
  "id": 12045,
  "login": "dr.sharma",
  "firstName": "Ankit",
  "lastName": "Sharma",
  "email": "ankit.sharma@narayanahealth.org",
  "imageUrl": null,
  "activated": true,
  "langKey": "en",
  "authorities": ["ROLE_DOCTOR"],
  "userGroup": "DOCTOR"
}
```

| Field | Type | Stored As |
|-------|------|-----------|
| login | string | Part of `DOCTOR_PROFILE` |
| firstName + lastName | string | Display name throughout app |
| authorities | string[] | Used for role-based UI rendering (ROLE_DOCTOR, ROLE_NURSE, etc.) |
| userGroup | string | Stored separately as `USER_GROUP` — controls which modules are visible |
| langKey | string | Stored as `LOCALE` — controls i18n |
| activated | boolean | If `false`, login is rejected |

---

### 3.6 Register FCM Device Session

**Endpoint:** `POST {DOMAIN}api/device-session`

**Headers:**
```
Authorization: Bearer {access_token}
```

**Request:**
```json
{
  "appId": "AADI",
  "login": "dr.sharma",
  "deviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "fcmToken": "dGhpcyBpcyBhIGZha2UgRkNNIHRva2VuIGZvciBkZW1vbnN0cmF0aW9u...",
  "osType": "ANDROID"
}
```

| Field | Type | Source |
|-------|------|--------|
| appId | string | Always `"AADI"` |
| login | string | From account profile |
| deviceId | string | Capacitor Device plugin `Device.getId()` — unique per install |
| fcmToken | string | From Firebase Messaging plugin registration |
| osType | string | Always `"ANDROID"` for this app (it's Android-only) |

**Response:** HTTP 200/201 (body not used by client).

This registration allows the server to send push notifications to this specific device. It also enables the server to track active sessions and send LOGOUT_MESSAGE to older sessions when a new login occurs.

---

### 3.7 Token Refresh

**Endpoint:** `POST {DOMAIN}api/refresh`

**Headers:**
```
Authorization: Bearer {refresh_token}
```

Note: This endpoint uses the **refresh token** in the Authorization header, NOT the access token.

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzUxMiJ9...",
  "accessToken": "eyJhbGciOiJIUzUxMiJ9...",
  "login": "dr.sharma",
  "deviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Response (success):**
```json
{
  "id_token": "eyJhbGciOiJIUzUxMiJ9...(new access token)...",
  "tokenConfig": {
    "accessExpiryTime": "2026-04-22T16:00:00.000Z",
    "refreshExpiryTime": "2026-05-22T14:00:00.000Z",
    "refresh_token": "eyJhbGciOiJIUzUxMiJ9...(may be same or new)..."
  }
}
```

**Response (refresh token expired):**
HTTP 401. Action: immediate force logout.

**Response (refresh token invalid/revoked):**
HTTP 401. Action: immediate force logout.

---

### 3.8 Unsubscribe Device Session (Logout)

**Endpoint:** `DELETE {DOMAIN}api/unsubscribe-device-session/{deviceId}`

**Headers:**
```
Authorization: Bearer {access_token}
```

**Response:** HTTP 200 (body not used). Server removes the FCM registration and marks the session as ended.

Note: The auth interceptor explicitly SKIPS adding the auth header for `api/unsubscribe-device-session` requests. This is intentional — the token may already be expired when the user is being force-logged-out.

---

## 4. State Machine: Token Lifecycle

### 4.1 Full Authentication State Diagram

```
                         +------------------+
                         |   APP LAUNCHED   |
                         +--------+---------+
                                  |
                         Check SecureStorage
                         for AUTHENTICATION_TOKEN
                                  |
                    +-------------+-------------+
                    |                           |
               Token EXISTS              Token MISSING
                    |                           |
           Check TOKEN_CONFIG              Navigate to
           for refreshExpiryTime           /login page
                    |                           |
          +---------+---------+          +------+------+
          |                   |          |  LOGIN      |
     Refresh token       Refresh token   |  SCREEN     |
     STILL VALID         EXPIRED         +------+------+
          |                   |                 |
     Attempt token       Force logout      User enters
     refresh             to /login         credentials
          |                                     |
    +-----+-----+                          API call
    |           |                          (3 methods)
 Refresh     Refresh                            |
 SUCCESS     FAILURE                     +------+------+
    |           |                        |             |
 Schedule    Force logout             SUCCESS       FAILURE
 next refresh   to /login                |             |
    |                               Store tokens   Show error
 Navigate to                        Store profile  toast
 /landing                           Register FCM
    |                               Schedule refresh
 +--+---+                           Navigate to
 | ACTIVE|                          /landing
 | SESSION|
 +--+---+
    |
    |  Every (accessExpiryTime - 60 seconds):
    |
    +---------> TokenRefreshService fires
    |               |
    |          POST /api/refresh
    |               |
    |         +-----+-----+
    |         |           |
    |      SUCCESS     FAILURE
    |         |           |
    |    Update tokens  Force logout
    |    Reschedule     Clear storage
    |    next refresh   Navigate to /login
    |         |
    +<--------+
    |
    |  On HTTP request with <60s left on access token:
    |
    +---------> AuthInterceptor triggers refresh
    |           Queue current request
    |           Wait for refresh completion
    |           Retry request with new token
    |
    |  On 401 response:
    |
    +---------> AuthExpiredInterceptor
                Force logout
```

### 4.2 Token Refresh Scheduling Logic

```
accessExpiryTime = "2026-04-22T15:30:00.000Z"
currentTime      = "2026-04-22T15:00:00.000Z"
secondsLeft      = 1800                         // 30 minutes
refreshDelay     = (1800 - 60) * 1000           // 1,740,000 ms = 29 minutes

setTimeout(() => {
  this.refreshToken();
}, 1740000);

// The refresh fires at 15:29:00, which is 60 seconds BEFORE expiry.
```

If the app is paused (backgrounded) and resumed after the scheduled refresh time has passed, `initOnAppResume()` checks immediately and refreshes if needed.

### 4.3 Interceptor Request Flow

```
HTTP Request
    |
    v
AuthInterceptor.intercept(req, next)
    |
    +-- Is URL in skip list?
    |   (/api/authenticate, /api/refresh, /api/unsubscribe-device-session)
    |       |
    |      YES --> Pass through WITHOUT auth header --> next.handle(req)
    |       |
    |      NO
    |       |
    |       v
    +-- Read access token from storage
    |
    +-- Calculate seconds until token expires
    |       |
    |       v
    +-- secondsLeft > 60?
    |       |
    |      YES --> Clone request, add Authorization header --> next.handle(clonedReq)
    |       |
    |      NO
    |       |
    |       v
    +-- Is refresh already in progress?
    |       |
    |      YES --> Wait for existing refresh promise to resolve
    |       |      Then retry with new token
    |       |
    |      NO --> Trigger tokenRefreshService.refreshToken()
    |              Set refreshInProgress = true
    |              Queue this request
    |              On refresh complete:
    |                refreshInProgress = false
    |                Retry all queued requests with new token
    |
    v
Response
    |
    v
AuthExpiredInterceptor.intercept(req, next)
    |
    +-- Response status === 401?
    |       |
    |      YES --> tokenRefreshService.checkAndLogOut()
    |       |      (force logout, navigate to /login)
    |       |
    |      NO --> Pass through
    |
    v
Caller receives response
```

---

## 5. Storage Keys Reference

### 5.1 Keys Set During Login

| Key | Type | Set When | Value Example | Persists After Logout? |
|-----|------|----------|---------------|----------------------|
| `AUTHENTICATION_TOKEN` | string | After authenticate API | `"eyJhbGciOi..."` | NO - cleared |
| `TOKEN_CONFIG` | object (JSON stringified) | After authenticate API | `{"accessExpiryTime":"...","refreshExpiryTime":"...","refresh_token":"..."}` | NO - cleared |
| `DOCTOR_PROFILE` | object (JSON stringified) | After GET /api/account | `{"login":"dr.sharma","firstName":"Ankit",...}` | NO - cleared |
| `LOGIN_CREDENTIAL` | object (JSON stringified) | After GET /api/account | Same as DOCTOR_PROFILE (alias) | NO - cleared |
| `LOGGED_IN` | string | After full login sequence | `"1"` | NO - cleared |
| `USER_GROUP` | string | After GET /api/account | `"DOCTOR"` or `"NURSE"` | NO - cleared |
| `DOMAIN` | string | During login (from user selection or config) | `"https://bangalore.narayanahealth.org/"` | YES - kept |
| `CLIENT` | string | During login (from user selection or config) | `"NH_BANGALORE"` | YES - kept |
| `COUNTRY` | string | During login (from country picker) | `"IN"` or `"KY"` | YES - kept |
| `FCM_TOKEN` | string | After Firebase Messaging registration | `"dGhpcyBpcy..."` | YES - kept |
| `LOCALE` | string | From account.langKey | `"en"` | NO - cleared |
| `USER_ACS_ID` | string | After ACS registration | `"8:acs:xxxx"` | NO - cleared |
| `USER_ACS_TOKEN` | string | After ACS token fetch | `"eyJ0eXAi..."` | NO - cleared |

### 5.2 Keys Preserved After Logout

The logout flow calls `clearStorage()` which removes ALL keys EXCEPT:

```typescript
// These keys survive logout — user doesn't re-select facility on next login
const PRESERVED_KEYS = [
  'DOMAIN',
  'CLIENT',
  'COUNTRY',
  'FCM_TOKEN',
  'APP_VERSION'
];
```

### 5.3 Storage Implementation Details

`AppStorageService` (`app-storage.service.ts`, 151 lines) wraps `capacitor-secure-storage-plugin`:

```
+------------------------------------------+
|          AppStorageService                |
|                                          |
|  +------------------------------------+  |
|  |  In-Memory Cache (JS Map)          |  |
|  |  - Fast reads, no async overhead   |  |
|  |  - Populated on app start          |  |
|  +------------------------------------+  |
|              |        ^                  |
|         write |        | read            |
|              v        |                  |
|  +------------------------------------+  |
|  |  SecureStoragePlugin               |  |
|  |  - Android Keystore encryption     |  |
|  |  - Persists across app restarts    |  |
|  +------------------------------------+  |
+------------------------------------------+
```

**Read path:** Check in-memory cache first. If miss, read from SecureStoragePlugin, populate cache, return value.

**Write path:** Write to SecureStoragePlugin first. On success, update in-memory cache.

**Migration:** On first launch after upgrade from older version, the service checks for keys in `localStorage` (the old unencrypted store). If found, migrates them to SecureStoragePlugin and deletes the localStorage entries.

**Full AppStorageKeys enum (63 keys):**

```
AUTHENTICATION_TOKEN, TOKEN_CONFIG, LOGIN_CREDENTIAL, LOGGED_IN,
DOCTOR_PROFILE, USER_GROUP, DOMAIN, CLIENT, COUNTRY, LOCALE,
FCM_TOKEN, APP_VERSION, ATHMA_TOKEN, ATHMA_TOKEN_TIME,
USER_ACS_ID, USER_ACS_TOKEN, ACS_TOKEN_EXPIRY_DATE,
LAST_MSG_INIT_TIME, LAST_SYNC_TIME,
ALL_PATIENT_LIST_LOAD_FROM_SERVER_DONE,
ALL_PATIENT_MSG_LOAD_DONE, LAST_VIEW_MODULE,
FILTER_SUBMIT, RESULT_FILTER_SUBMIT, SORT_BY_DETAIL,
SELECTED_PATIENT_MRN, SELECTED_ENCOUNTER,
... (remaining 36 keys are feature-specific: medication filters,
    progress note drafts, IA widget states, VC session, etc.)
```

---

## 6. Error Handling Matrix

### 6.1 Login Screen Errors

| Scenario | HTTP Status | Error Detection | User-Facing Message | Code Action |
|----------|-------------|-----------------|---------------------|-------------|
| No network connectivity | N/A (request fails) | `NetworkService.isOnline === false` or request timeout | "Please check your internet connection" | Show toast, keep user on login screen |
| Phone number not registered | 200 (empty userList) | `response.userList.length === 0` | "User not registered with AADI" | Show toast, clear phone input |
| Invalid phone format | N/A (client-side) | Regex validation before API call | "Please enter a valid phone number" | Disable submit button, show inline error |
| Invalid email format | N/A (client-side) | Angular email validator | "Please enter a valid email" | Disable submit button, show inline error |
| Wrong OTP entered | 400 or 401 | HTTP error response | "Invalid OTP" | Show toast, clear OTP input, keep user on OTP screen |
| OTP expired (>5 min) | 400 | Specific error code in response | "OTP expired. Please request a new one" | Show toast, enable Resend OTP button |
| Invalid username/password | 401 | HTTP 401 response | "Invalid username or password" | Show toast, clear password input |
| Server error | 500 | HTTP 500 response | "Server error. Please try after sometime" | Show toast, keep user on current screen |
| Account deactivated | 200 but `activated: false` | Check account response | "Your account has been deactivated" | Show toast, do NOT proceed with login |

### 6.2 Token Refresh Errors

| Scenario | Detection | Action | User Impact |
|----------|-----------|--------|-------------|
| Refresh token expired | 401 from `/api/refresh` | `checkAndLogOut()` — clear storage, navigate to `/login` | Session ended, must re-login |
| Refresh token revoked | 401 from `/api/refresh` | Same as expired | Session ended |
| Network error during refresh | Request timeout/failure | Retry once, then force logout | Session ended if retry fails |
| Concurrent refresh attempts | `refreshInProgress` flag | Second caller waits for first refresh to complete | Transparent — no user impact |

### 6.3 Interceptor Errors

| Scenario | Detection | Action |
|----------|-----------|--------|
| 401 on any API call | `AuthExpiredInterceptor` catches status 401 | Calls `checkAndLogOut()` |
| Token expires during request | `AuthInterceptor` detects `secondsLeft < 60` | Triggers refresh, queues request, retries |
| Refresh fails while requests are queued | Refresh promise rejects | All queued requests are rejected, force logout |

### 6.4 Error Logging

All authentication errors are written to the local SQLite database:

```sql
INSERT INTO ErrorMessage (timestamp, errorType, errorMessage, stackTrace, login)
VALUES (datetime('now'), 'AUTH_REFRESH_FAILED', 'Token refresh returned 401', '...', 'dr.sharma');
```

This table is periodically synced to the server for monitoring (when network is available).

---

## 7. Edge Cases & Race Conditions

### 7.1 App Opened After Long Offline Period

```
User closes app on Friday evening.
Opens app on Monday morning.

Timeline:
  Friday 18:00  - Access token expires (30 min lifetime)
  Friday 18:00  - Scheduled refresh fires but app is backgrounded
                   (on Android, background execution may or may not run)
  Monday 08:00  - User opens app

App resume flow:
  1. app.component.ts: appStateChange fires with isActive=true
  2. tokenRefreshService.initOnAppResume() is called
  3. Reads TOKEN_CONFIG from SecureStorage
  4. Checks refreshExpiryTime: was ~30 days from last login
     - If last login was < 30 days ago: refresh token is still valid
       -> Calls POST /api/refresh with refresh_token
       -> Gets new access token
       -> User continues seamlessly
     - If last login was > 30 days ago: refresh token is expired
       -> Refresh API returns 401
       -> checkAndLogOut() fires
       -> Storage cleared, navigate to /login
       -> User must re-login
```

### 7.2 Two Devices Login With Same Account

```
Device A: Logged in as dr.sharma, ACS chat subscribed
Device B: User logs in as dr.sharma

Server-side:
  1. Device B registers new FCM token via POST /api/device-session
  2. Server detects existing session for dr.sharma on Device A
  3. Server sends ACS chat message with type: "LOGOUT_MESSAGE" to Device A

Device A:
  1. ACS subscription receives LOGOUT_MESSAGE
  2. app.component.ts handles this message type specifically
  3. Triggers force logout:
     - Unsubscribe ACS
     - Clear storage
     - Navigate to /login
     - Show toast: "You have been logged out because your account was used on another device"

Device B:
  Continues normally. It is now the active session.
```

### 7.3 User Kills App During OTP Entry

```
User enters phone number, receives OTP, then force-kills the app.

On next app open:
  1. app.component.ts checks for AUTHENTICATION_TOKEN in SecureStorage
  2. Token is NOT present (login was never completed)
  3. Navigate to /login
  4. User starts fresh — enters phone number again
  5. Can request a new OTP (old OTP may still be valid if < 5 min)

No partial state is saved. The OTP screen state is entirely in-memory
(component instance variables). Killing the app destroys all of it.
```

### 7.4 Network Drops During Login POST

```
User taps "Verify OTP" -> POST validate-otp fires -> network drops mid-request

HttpClient observable errors out with a network/timeout error.
login.page.ts catch block:
  1. Checks NetworkService.isOnline
  2. If offline: shows "Please check your internet connection"
  3. If online (transient failure): shows "Something went wrong. Please try again"
  4. User stays on OTP screen, can retry
  5. OTP is still valid (server-side) until its expiry window
```

### 7.5 Multiple Facilities for Same User

```
Phone +919876543210 is registered at:
  - NH Bangalore (domain: https://blr.nh.org/)
  - NH Cayman (domain: https://cay.nh.org/)

Flow:
  1. POST validate-user-by-mobile returns userList with 2 entries
  2. UI shows ion-select dropdown with both options
  3. User MUST select one before OTP can be verified
     (loginUser must be set, otherwise the domain/client are unknown)
  4. On selection:
     - loginUser = selectedUser
     - DOMAIN is set to selectedUser.domain
     - CLIENT is set to selectedUser.client
  5. OTP is verified against the selected user's domain
  6. Login proceeds with that facility's API server
```

### 7.6 Test User Bypass

```
For QA/testing purposes, two bypass values exist:

  Phone number: 4000999889
  Login ID: 999889

If the entered phone matches "4000999889" OR the login matches "999889":
  - OTP validation is SKIPPED entirely
  - The system proceeds directly to LoginService.login() with pre-configured
    test credentials
  - This bypass only works in non-production environments
    (controlled by environment.ts config)

WARNING for implementation: Ensure this bypass is NEVER enabled
in production builds. Gate it behind environment.production === false.
```

### 7.7 Concurrent API Calls During Token Expiry Window

```
Scenario: Access token expires in 45 seconds. Three API calls fire simultaneously.

Call 1 hits AuthInterceptor:
  - secondsLeft = 45 (< 60)
  - refreshInProgress = false
  - Triggers refreshToken()
  - Sets refreshInProgress = true
  - Queues Call 1

Call 2 hits AuthInterceptor (milliseconds later):
  - secondsLeft = 45
  - refreshInProgress = true  (already triggered by Call 1)
  - Does NOT trigger another refresh
  - Waits on the same refresh promise
  - Queues Call 2

Call 3 hits AuthInterceptor:
  - Same as Call 2
  - Queues Call 3

Refresh completes:
  - New token stored
  - refreshInProgress = false
  - All three queued calls are retried with the new token
  - Each cloned request gets the fresh Authorization header

This prevents thundering-herd refreshes.
```

### 7.8 Jailbreak/Root Detection at App Start

```
app.component.ts calls checkRootOrJailBreak() during initialization.

Uses: capacitor-plugin-device-security-detect

If device is rooted/jailbroken:
  - Show blocking alert: "This app cannot run on rooted/jailbroken devices"
  - Alert has no dismiss button
  - App is effectively bricked on this device
  - This check runs BEFORE any login logic

This is a healthcare compliance requirement — patient data
must not be accessible on compromised devices.
```

### 7.9 Version Upgrade Force-Update

```
During app.component.ts initialization:

  1. Read local APP_VERSION from storage
  2. Fetch server-side minimum version (API or Firebase Remote Config)
  3. Compare: if localVersion < serverMinVersion
     - Show blocking alert: "Please update AADI to continue"
     - Button: "Update" -> opens Play Store listing
     - No "Skip" option — this is a FORCE update
  4. This check happens BEFORE login, after jailbreak check
```

---

## 8. Post-Login Orchestration: Step-by-Step

This is the exact sequence inside `LoginService.login()` (269 lines). Every step must succeed for login to complete.

```
Step 1: Authenticate
  ├── Input: { username, password, rememberMe: true } (or OTP-derived credentials)
  ├── Call: authServerProvider.login(credentials)
  │     └── POST {DOMAIN}api/authenticate
  ├── Output: { id_token, tokenConfig }
  ├── On failure: throw → caught by login.page.ts → show error toast
  └── On success: continue to Step 2

Step 2: Store Token
  ├── appStorageService.setItem('AUTHENTICATION_TOKEN', id_token)
  ├── appStorageService.setItem('TOKEN_CONFIG', JSON.stringify(tokenConfig))
  └── Both sync to SecureStorage AND in-memory cache

Step 3: Fetch User Profile
  ├── Call: accountService.identity(true)
  │     └── GET {DOMAIN}api/account
  │     └── Header: Authorization: Bearer {id_token}
  ├── Output: Account object
  ├── Store: appStorageService.setItem('DOCTOR_PROFILE', JSON.stringify(account))
  ├── Store: appStorageService.setItem('LOGIN_CREDENTIAL', JSON.stringify(account))
  ├── Store: appStorageService.setItem('USER_GROUP', account.userGroup)
  ├── Store: appStorageService.setItem('LOCALE', account.langKey)
  └── Store: appStorageService.setItem('LOGGED_IN', '1')

Step 4: Register Device for Push Notifications
  ├── Get FCM token from Firebase Messaging plugin
  ├── Get deviceId from Capacitor Device plugin
  ├── Call: POST {DOMAIN}api/device-session
  │     └── Body: { appId: "AADI", login, deviceId, fcmToken, osType: "ANDROID" }
  └── On failure: log error but do NOT block login (notifications are non-critical)

Step 5: Start Token Refresh Scheduler
  ├── tokenRefreshService.scheduleRefresh(tokenConfig)
  │     └── Calculate delay = (secondsUntilExpiry - 60) * 1000
  │     └── setTimeout(refreshToken, delay)
  └── This runs in the background for the lifetime of the session

Step 6: Initialize Database (if first login)
  ├── databaseService.initializeDB()
  │     └── Open/create SQLite database named "aadi" (encrypted)
  │     └── If first launch: execute assets/database/aadi.sql seed script
  └── Database is ready for local patient data, messages, error logs

Step 7: Navigate to Landing
  ├── router.navigate(['/landing'], { replaceUrl: true })
  │     └── replaceUrl: true prevents back-button returning to login
  └── Login flow is COMPLETE
```

---

## 9. App Bootstrap & Resume Flow

### 9.1 Cold Start (app.component.ts, 935 lines)

```
ngOnInit / platform.ready()
  │
  ├── 1. initStorage()
  │     └── Initialize SecureStorage plugin
  │     └── Run localStorage → SecureStorage migration (if needed)
  │     └── Populate in-memory cache from SecureStorage
  │
  ├── 2. checkRootOrJailBreak()
  │     └── If rooted: show blocking alert, STOP
  │
  ├── 3. checkAppVersion()
  │     └── If outdated: show force-update alert, STOP
  │
  ├── 4. Check AUTHENTICATION_TOKEN exists in storage
  │     ├── Token EXISTS:
  │     │     ├── Read TOKEN_CONFIG
  │     │     ├── Check refreshExpiryTime > now
  │     │     │     ├── YES: Call tokenRefreshService.initOnAppResume()
  │     │     │     │        → Refresh token if access token is expired/expiring
  │     │     │     │        → Navigate to /landing
  │     │     │     └── NO: Force logout → Navigate to /login
  │     │     └── (This is the "auto-login on app reopen" path)
  │     └── Token MISSING:
  │           └── Navigate to /login
  │
  ├── 5. setupFCM()
  │     └── Request notification permission
  │     └── Register for FCM token
  │     └── Set up notification tap handler (routes to relevant patient page)
  │
  ├── 6. setupACSSubscription()
  │     └── Connect to Azure Communication Services
  │     └── Subscribe to incoming messages (including LOGOUT_MESSAGE)
  │
  ├── 7. setupSafeArea()
  │     └── Read device safe area insets (notch, status bar)
  │     └── Apply CSS custom properties for safe area padding
  │
  └── 8. SplashScreen.hide()
        └── Native splash screen is dismissed, app is visible
```

### 9.2 App Resume (from background)

```
App.addListener('appStateChange', ({ isActive }) => {
  if (isActive) {
    // App came to foreground
    tokenRefreshService.initOnAppResume();
    doMessageSyncBeforeRefresh();
    // Re-subscribe to ACS if needed
  } else {
    // App went to background
    chatService.unSubscribeToACS();
    tokenRefreshService.stopScheduler();
  }
});
```

---

## 10. Logout Flow: Complete Teardown

### 10.1 Voluntary Logout (user taps "Logout")

```
Step 1: Unsubscribe from ACS Chat
  └── chatService.unSubscribeToACS()
      └── Disconnect WebSocket / ACS connection
      └── No more real-time messages

Step 2: Unregister FCM Token
  └── DELETE {DOMAIN}api/unsubscribe-device-session/{deviceId}
      └── Server removes this device from push notification registry
      └── On failure: log error, continue with logout anyway

Step 3: Clear SecureStorage (selective)
  └── appStorageService.clearStorage()
      └── Remove ALL keys EXCEPT: DOMAIN, CLIENT, COUNTRY, FCM_TOKEN, APP_VERSION
      └── Clear in-memory cache (except preserved keys)

Step 4: Clear SQLite Database
  └── databaseService.clearAllTables()
      └── DELETE FROM PatientInfo
      └── DELETE FROM Message
      └── DELETE FROM ErrorMessage
      └── (all local patient data is wiped)

Step 5: Stop Token Refresh Scheduler
  └── tokenRefreshService.stopScheduler()
      └── clearTimeout on the scheduled refresh

Step 6: Navigate to Login
  └── router.navigate(['/login'], { replaceUrl: true })
      └── replaceUrl: true — no back-button to the old session
```

### 10.2 Force Logout (token expired / multi-device / server-triggered)

Same as voluntary logout, but:
- No user confirmation dialog
- May show a toast explaining why: "Session expired" or "Logged in on another device"
- The DELETE device-session call may fail (token already invalid) — this is expected and ignored

---

## 11. Database Initialization

### 11.1 SQLite Setup (database.service.ts, 123 lines)

```
Plugin: @capacitor-community/sqlite
Database name: "aadi"
Encryption: YES (key derived from custom SecureDBKey Capacitor plugin)

On first launch:
  1. Check if database "aadi" exists
  2. If NOT: create database, execute seed SQL from assets/database/aadi.sql
  3. If YES: open existing database, check schema version, run migrations if needed

Tables relevant to auth:
  - ErrorMessage: stores auth failures, network errors for diagnostics
  - (Patient tables are initialized but empty until after login)
```

---

## 12. Network Monitoring

### 12.1 NetworkService (network.service.ts, 114 lines)

```typescript
// Core state
isOnline$: BehaviorSubject<boolean>;  // Observable stream
isOnline: boolean;                     // Snapshot value

// Initialization (in constructor)
Network.addListener('networkStatusChange', (status) => {
  this.isOnline$.next(status.connected);
  this.isOnline = status.connected;

  if (status.connected && !this.wasOnline) {
    // Network RESTORED
    this.recordOfflineDuration();
    this.triggerMessageSync();  // Sync queued messages
  }

  this.wasOnline = status.connected;
});
```

**Impact on login:**
- Login page checks `networkService.isOnline` before making API calls
- If offline: shows toast immediately, does not attempt network call
- If network drops during a call: HttpClient error is caught, toast shown

---

## 13. Implementation Checklist for Junior Developer

### Phase 1: Project Setup

- [ ] Create Ionic/Capacitor Angular 17 project with `ionic start aadi blank --type=angular`
- [ ] Install Capacitor plugins:
  - [ ] `capacitor-secure-storage-plugin`
  - [ ] `@capacitor-community/sqlite`
  - [ ] `@capacitor/network`
  - [ ] `@capacitor/device`
  - [ ] `@capacitor/splash-screen`
  - [ ] `@capacitor/app`
  - [ ] `@capacitor-firebase/messaging`
  - [ ] `@capacitor-firebase/analytics`
  - [ ] `capacitor-plugin-device-security-detect` (for jailbreak detection)
- [ ] Configure `environment.ts` with `appRegistryUrl` and default `DOMAIN`
- [ ] Create `AppStorageKeys` enum with all 63 key names

### Phase 2: Storage Layer

- [ ] Implement `AppStorageService` with:
  - [ ] In-memory cache (`Map<string, string>`)
  - [ ] `setItem(key, value)` — write to SecureStorage + cache
  - [ ] `getItem(key)` — read from cache first, then SecureStorage
  - [ ] `removeItem(key)` — remove from both
  - [ ] `clearStorage()` — clear all except preserved keys
  - [ ] `initStorage()` — populate cache from SecureStorage on startup
  - [ ] `migrateFromLocalStorage()` — one-time migration logic
- [ ] Implement `DatabaseService` with:
  - [ ] `initializeDB()` — create/open encrypted SQLite database
  - [ ] `executeSql(query, params)` — parameterized queries
  - [ ] `clearAllTables()` — used during logout
  - [ ] Create `assets/database/aadi.sql` seed file with table definitions

### Phase 3: Network Layer

- [ ] Implement `NetworkService` with:
  - [ ] `isOnline$` BehaviorSubject
  - [ ] `isOnline` boolean snapshot
  - [ ] Network status change listener
  - [ ] Offline duration tracking
  - [ ] Network restore callback hook

### Phase 4: Auth Services

- [ ] Implement `AuthServerProvider` with:
  - [ ] `login(credentials)` — POST to `/api/authenticate`, return token + config
  - [ ] `logout()` — DELETE device session, clear storage
- [ ] Implement `AccountService` with:
  - [ ] `identity(force: boolean)` — GET `/api/account`, cache result
  - [ ] `isAuthenticated()` — check if identity exists
  - [ ] `getAuthorities()` — return user roles
- [ ] Implement `LoginService` with:
  - [ ] `login(credentials)` — full orchestration (Steps 1-7 from Section 8)
  - [ ] `logout()` — full teardown (Section 10)
- [ ] Implement `TokenRefreshService` with:
  - [ ] `scheduleRefresh(tokenConfig)` — setTimeout for proactive refresh
  - [ ] `refreshToken()` — POST to `/api/refresh`, update storage
  - [ ] `stopScheduler()` — clearTimeout
  - [ ] `initOnAppResume()` — check token state, refresh if needed
  - [ ] `checkAndLogOut()` — force logout on unrecoverable auth failure
  - [ ] Error logging to SQLite on refresh failure

### Phase 5: HTTP Interceptors

- [ ] Implement `AuthInterceptor` (register first in interceptor chain):
  - [ ] Skip list: `/api/authenticate`, `/api/refresh`, `/api/unsubscribe-device-session`
  - [ ] Read token from `AppStorageService`
  - [ ] Calculate seconds until expiry from `TOKEN_CONFIG.accessExpiryTime`
  - [ ] If >60 seconds: attach `Authorization: Bearer {token}` header
  - [ ] If <=60 seconds and no refresh in progress: trigger refresh, queue request
  - [ ] If <=60 seconds and refresh in progress: wait for existing refresh
  - [ ] After refresh: retry queued requests with new token
- [ ] Implement `AuthExpiredInterceptor` (register second):
  - [ ] Catch HTTP 401 responses
  - [ ] Call `tokenRefreshService.checkAndLogOut()`
  - [ ] Log error to SQLite

### Phase 6: Login Page UI

- [ ] Create `/login` page with three tabs:
  - [ ] Phone tab: country picker (India +91, Cayman +1-345) + phone input
  - [ ] Email tab: email input
  - [ ] Username tab: username + password inputs
- [ ] Phone validation:
  - [ ] India: exactly 10 digits
  - [ ] Cayman: exactly 7 digits
  - [ ] Disable submit button until valid
- [ ] Implement "Validate Phone" flow:
  - [ ] POST to `validate-user-by-mobile`
  - [ ] Handle empty userList (show toast)
  - [ ] Handle single user (auto-select, show OTP input)
  - [ ] Handle multiple users (show `ion-select` dropdown + OTP input)
- [ ] Implement "Validate Email" flow (same as phone, different API)
- [ ] Implement OTP entry:
  - [ ] 6-digit input
  - [ ] 30-second countdown timer for resend
  - [ ] Resend button enabled when timer reaches 0
  - [ ] POST to `validate-otp` with selected user's login/domain/client
- [ ] Implement Username/Password flow:
  - [ ] Direct call to `LoginService.login()`
- [ ] Implement test user bypass:
  - [ ] Check phone === `4000999889` or login === `999889`
  - [ ] Skip OTP, proceed directly to login
  - [ ] Gate behind `!environment.production`
- [ ] Error toasts for every failure scenario (see Section 6)

### Phase 7: App Component (Bootstrap)

- [ ] In `app.component.ts`:
  - [ ] Call `initStorage()` on platform ready
  - [ ] Run jailbreak detection — block app if rooted
  - [ ] Run version check — force update if outdated
  - [ ] Check for existing token — auto-login or navigate to `/login`
  - [ ] Set up FCM (permission + registration + tap handler)
  - [ ] Set up ACS subscription (including LOGOUT_MESSAGE handler)
  - [ ] Set up app state change listener (pause/resume)
  - [ ] Handle safe area insets for notched devices
  - [ ] Hide splash screen after initialization

### Phase 8: Testing

- [ ] Unit tests:
  - [ ] `AppStorageService`: cache + SecureStorage sync
  - [ ] `TokenRefreshService`: scheduling, refresh, force logout
  - [ ] `AuthInterceptor`: skip list, token attachment, queue + retry
  - [ ] `AuthExpiredInterceptor`: 401 catch + logout
  - [ ] `LoginService`: full login orchestration
- [ ] Integration tests:
  - [ ] Phone OTP flow (happy path)
  - [ ] Email OTP flow (happy path)
  - [ ] Username/Password flow (happy path)
  - [ ] Multi-user selection flow
  - [ ] Token refresh cycle (mock timer)
  - [ ] Force logout on 401
  - [ ] Network offline during login
- [ ] Edge case tests:
  - [ ] Concurrent API calls during token expiry window
  - [ ] App resume after >30 days (refresh token expired)
  - [ ] Multi-device logout via ACS LOGOUT_MESSAGE
  - [ ] Test user bypass (4000999889)
- [ ] Manual QA:
  - [ ] Test on rooted device (should be blocked)
  - [ ] Test OTP resend timer (30 seconds)
  - [ ] Test app kill during OTP entry (should restart fresh)
  - [ ] Test airplane mode toggle during login

---

## Appendix A: Environment Configuration

```typescript
// environment.ts (development)
export const environment = {
  production: false,
  appRegistryUrl: 'https://registry-dev.narayanahealth.org/',
  // Default domain (overridden by user selection):
  defaultDomain: 'https://dev.narayanahealth.org/',
  appId: 'AADI',
  firebaseConfig: {
    // ... Firebase project config
  }
};

// environment.prod.ts (production)
export const environment = {
  production: true,
  appRegistryUrl: 'https://registry.narayanahealth.org/',
  defaultDomain: 'https://bangalore.narayanahealth.org/',
  appId: 'AADI',
  firebaseConfig: {
    // ... Firebase project config
  }
};
```

---

## Appendix B: Country Code Configuration

```typescript
// Used in the country picker on the login page
const COUNTRY_CONFIG = [
  {
    name: 'India',
    code: 'IN',
    dialCode: '+91',
    phoneLength: 10,
    flag: '🇮🇳'
  },
  {
    name: 'Cayman Islands',
    code: 'KY',
    dialCode: '+1-345',
    phoneLength: 7,
    flag: '🇰🇾'
  }
];
```

When a country is selected:
1. Phone input `maxlength` is set to `phoneLength`
2. `COUNTRY` is stored in SecureStorage
3. `dialCode` is prepended to the phone number before API call

---

## Appendix C: JWT Token Structure (Decoded)

```json
{
  "sub": "dr.sharma",
  "auth": "ROLE_DOCTOR",
  "exp": 1713800000,
  "iat": 1713798200,
  "client": "NH_BANGALORE"
}
```

| Claim | Purpose |
|-------|---------|
| `sub` | User's login ID — matches `account.login` |
| `auth` | Comma-separated authorities string |
| `exp` | Expiry timestamp (Unix seconds) — used by interceptor for expiry check |
| `iat` | Issued-at timestamp |
| `client` | Facility identifier |

The interceptor does NOT decode the JWT to check expiry. Instead, it uses the `accessExpiryTime` from `TOKEN_CONFIG` (which is an ISO 8601 string). This avoids needing a JWT decode library on the client.

---

## Appendix D: File Reference

| File | Lines | Responsibility |
|------|-------|---------------|
| `login.page.ts` | 523 | Login screen logic: phone/email/password tabs, OTP entry, multi-user selection, test bypass |
| `login.page.html` | 202 | Login screen template: tabs, inputs, dropdowns, buttons, error messages |
| `login.service.ts` | 269 | Post-login orchestration: token storage, profile fetch, FCM registration, navigation |
| `auth-jwt.service.ts` | 205 | Low-level auth API calls: authenticate, refresh, token storage |
| `account.service.ts` | 124 | User profile fetch and caching |
| `token-refresh.service.ts` | 216 | Proactive token refresh scheduler, force logout logic |
| `auth.interceptor.ts` | 125 | HTTP interceptor: attach token, trigger refresh, queue requests |
| `auth-expired.interceptor.ts` | 45 | HTTP interceptor: catch 401s, force logout |
| `app-storage.service.ts` | 151 | Encrypted key-value storage with in-memory cache |
| `database.service.ts` | 123 | SQLite database initialization and management |
| `network.service.ts` | 114 | Online/offline status tracking |
| `app.component.ts` | 935 | App bootstrap, lifecycle management, jailbreak check, version check |
