# Flow 00: Login, Authentication & Session Management

**App:** AADI (org.nh.app.aadi) v2.35.0
**Framework:** Ionic 7 / Capacitor 5 / Angular 17+
**Source files:** `login.page.ts`, `login.page.html`, `auth.service.ts`, `secure-storage.service.ts`, `auth-expired.interceptor.ts`, `token.interceptor.ts`, `app-init.service.ts`, `database.service.ts`

---

## 1. Overview

The Login & Auth flow handles user identity verification, session creation, token lifecycle, and secure teardown. AADI supports three login methods — Phone OTP, Email OTP, and Username/Password — targeting two geographies (India +91, Cayman Islands +1-345). After authentication, the app bootstraps local storage, an encrypted SQLite database, Firebase Cloud Messaging, and Azure Communication Services before navigating to the landing dashboard.

### 1.1 Auth Flow — High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LOGIN SCREEN                                │
│                                                                     │
│   ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐     │
│   │ Phone OTP    │  │ Email OTP    │  │ Username / Password   │     │
│   │ (default)    │  │              │  │                       │     │
│   └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘     │
│          │                 │                      │                 │
└──────────┼─────────────────┼──────────────────────┼─────────────────┘
           │                 │                      │
           ▼                 ▼                      ▼
   POST validate-      POST validate-        POST /api/
   user-by-mobile      user-by-email         authenticate
           │                 │                      │
           ▼                 ▼                      │
   ┌───────────────────────────────┐                │
   │  Multi-user dropdown         │                │
   │  (if phone/email has >1 user)│                │
   └──────────┬────────────────────┘                │
              │                                     │
              ▼                                     │
      POST validate-otp                             │
              │                                     │
              ▼                                     ▼
   ┌──────────────────────────────────────────────────┐
   │              { id_token, refresh_token }          │
   └──────────────────────┬───────────────────────────┘
                          │
                          ▼
   ┌──────────────────────────────────────────────────┐
   │              POST-LOGIN BOOTSTRAP                 │
   │  1. Store tokens in SecureStorage                 │
   │  2. GET /api/account → user profile               │
   │  3. Register FCM device token                     │
   │  4. Initialize SQLite DB                          │
   │  5. Subscribe ACS chat                            │
   │  6. Navigate to /landing                          │
   └──────────────────────────────────────────────────┘
```

---

## 2. Login Screen

### 2.1 Screen Mockup

```
┌─────────────────────────────────┐
│         ┌───────────┐           │
│         │  AADI     │           │
│         │  logo     │           │
│         └───────────┘           │
│                                 │
│  ┌─ Login Method Tabs ────────┐ │
│  │ [Phone]  [Email]  [User]   │ │
│  └────────────────────────────┘ │
│                                 │
│  Country:                       │
│  ┌────────────────────────────┐ │
│  │ 🇮🇳 India (+91)       ▼   │ │
│  └────────────────────────────┘ │
│                                 │
│  Phone Number:                  │
│  ┌────────────────────────────┐ │
│  │ +91  _______________       │ │
│  └────────────────────────────┘ │
│                                 │
│  ┌────────────────────────────┐ │
│  │         GET OTP            │ │
│  └────────────────────────────┘ │
│                                 │
│  v2.35.0            Powered by  │
│                     NH          │
└─────────────────────────────────┘
```

### 2.2 OTP Entry Screen

```
┌─────────────────────────────────┐
│  ← Back                        │
│                                 │
│  Enter OTP sent to              │
│  +91 98XXXX1234                 │
│                                 │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐│
│  │  │ │  │ │  │ │  │ │  │ │  ││
│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘│
│                                 │
│  Resend OTP in 0:30             │
│                                 │
│  ── OR select user ──           │
│  ┌────────────────────────────┐ │
│  │ Dr. Rohit G.          ▼   │ │
│  └────────────────────────────┘ │
│                                 │
│  ┌────────────────────────────┐ │
│  │        VERIFY OTP          │ │
│  └────────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

---

## 3. Login Method 1: Phone OTP

### 3.1 Step 1 — Validate User by Mobile

The user enters their phone number. The app sends it to the backend to check if a matching user exists. If multiple accounts share the same phone number, the backend returns all of them for the user to choose.

**Request:**

```
POST /api/validate-user-by-mobile
Content-Type: application/json

{
  "mobile": "9800001234",
  "countryCode": "+91",
  "clientCode": "NH",
  "domain": "AADI"
}
```

**Response (success — single user):**

```json
{
  "status": "SUCCESS",
  "users": [
    {
      "login": "rohit.g",
      "firstName": "Rohit",
      "lastName": "Garlapati",
      "designation": "Consultant",
      "department": "Cardiology",
      "employeeId": "EMP12345"
    }
  ],
  "otpSent": true,
  "otpLength": 6,
  "otpExpirySeconds": 300
}
```

**Response (success — multiple users):**

```json
{
  "status": "SUCCESS",
  "users": [
    {
      "login": "rohit.g",
      "firstName": "Rohit",
      "lastName": "Garlapati",
      "designation": "Consultant",
      "department": "Cardiology"
    },
    {
      "login": "rohit.nurse",
      "firstName": "Rohit",
      "lastName": "G",
      "designation": "Nurse",
      "department": "ICU"
    }
  ],
  "otpSent": true,
  "otpLength": 6,
  "otpExpirySeconds": 300
}
```

When multiple users are returned, the app displays a dropdown for the user to select which account to log in as before entering the OTP.

**Response (failure — user not found):**

```json
{
  "status": "FAILURE",
  "message": "No user found with this mobile number"
}
```

### 3.2 Step 2 — Verify OTP

After the user enters the 6-digit OTP (with a 30-second countdown before resend is enabled):

**Request:**

```
POST /api/validate-otp
Content-Type: application/json

{
  "login": "rohit.g",
  "otp": "482910",
  "mobile": "9800001234",
  "countryCode": "+91",
  "clientCode": "NH",
  "domain": "AADI"
}
```

**Response (success):**

```json
{
  "id_token": "eyJhbGciOiJSUzI1NiIs...<JWT access token>",
  "refresh_token": "eyJhbGciOiJSUzI1NiIs...<JWT refresh token>",
  "expires_in": 1800
}
```

**Response (failure — wrong OTP):**

```json
{
  "status": "FAILURE",
  "message": "Invalid OTP. Please try again.",
  "remainingAttempts": 2
}
```

### 3.3 Country Selection

| Country        | Code   | Phone Format     | Validation Regex               |
|----------------|--------|------------------|--------------------------------|
| India          | +91    | 10 digits        | `^[6-9]\d{9}$`                 |
| Cayman Islands | +1-345 | 7 digits         | `^\d{7}$`                      |

---

## 4. Login Method 2: Email OTP

### 4.1 Step 1 — Validate User by Email

**Request:**

```
POST /api/validate-user-by-email
Content-Type: application/json

{
  "email": "rohit.g@narayanahealth.org",
  "clientCode": "NH",
  "domain": "AADI"
}
```

**Response (success):**

```json
{
  "status": "SUCCESS",
  "users": [
    {
      "login": "rohit.g",
      "firstName": "Rohit",
      "lastName": "Garlapati",
      "designation": "Consultant",
      "department": "Cardiology"
    }
  ],
  "otpSent": true,
  "otpLength": 6,
  "otpExpirySeconds": 300
}
```

### 4.2 Step 2 — Verify OTP

Same as Phone OTP step 2 (Section 3.2), except `mobile` and `countryCode` fields are replaced with `email`:

```
POST /api/validate-otp
Content-Type: application/json

{
  "login": "rohit.g",
  "otp": "738291",
  "email": "rohit.g@narayanahealth.org",
  "clientCode": "NH",
  "domain": "AADI"
}
```

---

## 5. Login Method 3: Username / Password

This is the traditional credential-based login, primarily used for admin/service accounts or as a fallback.

**Request:**

```
POST /api/authenticate
Content-Type: application/json

{
  "username": "rohit.g",
  "password": "********",
  "rememberMe": true
}
```

**Response (success):**

```json
{
  "id_token": "eyJhbGciOiJSUzI1NiIs...<JWT access token>",
  "refresh_token": "eyJhbGciOiJSUzI1NiIs...<JWT refresh token>",
  "expires_in": 1800
}
```

**Response (failure — wrong credentials):**

```json
{
  "type": "https://www.jhipster.tech/problem/bad-credentials",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Bad credentials"
}
```

---

## 6. Test / Bypass Credentials

For development and QA testing:

| Field        | Value        | Notes                              |
|--------------|--------------|-------------------------------------|
| Phone number | `4000999889` | Triggers test OTP flow              |
| Login / OTP  | `999889`     | Always validates successfully       |

---

## 7. Post-Login Bootstrap

After receiving `id_token` and `refresh_token` from any login method, the app performs the following sequence:

```
┌─────────────────────────────────────────────────────┐
│                POST-LOGIN SEQUENCE                   │
│                                                     │
│  1. Store id_token        → SecureStorage "TOKEN"    │
│  2. Store refresh_token   → SecureStorage "REFRESH"  │
│  3. Store TOKEN_CONFIG    → { expiresIn, issuedAt }  │
│                                                     │
│  4. GET /api/account      → user profile + roles     │
│     Store DOCTOR_PROFILE  → SecureStorage            │
│     Store USER_AUTHORITIES → roles[]                 │
│                                                     │
│  5. Register FCM          → POST /api/device-session │
│     { deviceToken, platform, appVersion }            │
│                                                     │
│  6. Init SQLite           → open/create "aadi" DB    │
│     Run migrations if needed                         │
│                                                     │
│  7. Subscribe ACS         → chatClient.startRealtime │
│     Register for chatMessageReceived event           │
│                                                     │
│  8. Navigate              → /landing                 │
└─────────────────────────────────────────────────────┘
```

### 7.1 GET /api/account

**Request:**

```
GET /api/account
Authorization: Bearer <id_token>
```

**Response:**

```json
{
  "id": 42,
  "login": "rohit.g",
  "firstName": "Rohit",
  "lastName": "Garlapati",
  "email": "rohit.g@narayanahealth.org",
  "activated": true,
  "langKey": "en",
  "authorities": [
    "ROLE_DOCTOR",
    "ROLE_CHAT_USER",
    "ROLE_DISCHARGE_SUMMARY"
  ],
  "employeeNumber": "EMP12345",
  "designation": "Consultant",
  "department": "Cardiology",
  "unit": "RGNHH",
  "speciality": "Interventional Cardiology"
}
```

### 7.2 FCM Registration

**Request:**

```
POST /api/device-session
Authorization: Bearer <id_token>
Content-Type: application/json

{
  "deviceToken": "fMc8x...<FCM token>",
  "platform": "ANDROID",
  "appVersion": "2.35.0",
  "osVersion": "14",
  "deviceModel": "Pixel 7"
}
```

---

## 8. Token Management

### 8.1 Token Characteristics

| Token          | Lifetime  | Storage Key      | Notes                              |
|----------------|-----------|------------------|------------------------------------|
| Access (JWT)   | ~30 min   | `TOKEN`          | Sent as `Bearer` in every request  |
| Refresh (JWT)  | ~30 days  | `REFRESH_TOKEN`  | Used to obtain new access tokens   |
| TOKEN_CONFIG   | —         | `TOKEN_CONFIG`   | `{ expiresIn, issuedAt }` metadata |

### 8.2 Token Refresh Flow

The app proactively refreshes the access token **60 seconds before expiry** to avoid 401 errors during active use.

```
┌──────────────────────────────────────────────────────────┐
│                  TOKEN REFRESH TIMELINE                   │
│                                                          │
│  t=0           t=29min         t=29min        t=30min    │
│  ┃ Login       ┃ Refresh       ┃ New token    ┃ Old      │
│  ┃ id_token    ┃ triggered     ┃ received     ┃ expires  │
│  ┃ issued      ┃ (60s before)  ┃              ┃          │
│  ┗━━━━━━━━━━━━━┻━━━━━━━━━━━━━━━┻━━━━━━━━━━━━━┻━━━━━━━━━┛
│                                                          │
│  Trigger: setInterval checks every 10s                   │
│  Condition: (now - issuedAt) >= (expiresIn - 60)         │
└──────────────────────────────────────────────────────────┘
```

**Request:**

```
POST /api/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJSUzI1NiIs...<refresh token>"
}
```

**Response:**

```json
{
  "id_token": "eyJhbGciOiJSUzI1NiIs...<new access token>",
  "refresh_token": "eyJhbGciOiJSUzI1NiIs...<new refresh token>",
  "expires_in": 1800
}
```

### 8.3 Refresh Failure

If the refresh token is also expired or invalid, the app triggers a full logout (see Section 14).

---

## 9. HTTP Interceptor: Token Interceptor

The `token.interceptor.ts` attaches the Bearer token to outgoing HTTP requests.

### 9.1 Skip List

The interceptor does **not** add the Authorization header for these endpoints:

| Endpoint                           | Reason                              |
|------------------------------------|--------------------------------------|
| `/api/authenticate`               | Login — no token yet                 |
| `/api/refresh`                    | Uses refresh token in body           |
| `/api/unsubscribe-device-session` | Called during logout, token may be invalid |

### 9.2 Refresh-In-Progress Queue

If a token refresh is currently in progress when a new HTTP request fires:

1. The interceptor queues the request
2. Waits for the refresh `BehaviorSubject<boolean>` to emit `false` (refresh complete)
3. Retries the queued request with the new token

```
Request A ──▶ interceptor ──▶ token expired? ──YES──▶ start refresh
                                                        │
Request B ──▶ interceptor ──▶ refresh in progress? ─YES─┤
                                                        │
Request C ──▶ interceptor ──▶ refresh in progress? ─YES─┤
                                                        │ (queued)
                                                        ▼
                                          refresh complete ──▶ retry B, C
```

---

## 10. HTTP Interceptor: Auth Expired Interceptor

The `auth-expired.interceptor.ts` catches **401 Unauthorized** responses from the backend.

### 10.1 Behavior

1. Receives 401 response
2. Checks if the request was to a protected endpoint (not in skip list)
3. If token refresh has not already been attempted for this request cycle, attempts a refresh
4. If refresh fails or was already attempted, triggers full logout
5. Displays toast: "Session expired. Please log in again."

---

## 11. Secure Storage

### 11.1 Architecture

`SecureStorageService` wraps `@capacitor/preferences` with an **in-memory cache** (`Map<string, any>`) for synchronous reads within the same session.

```
┌─────────────────────────────────────────────┐
│              SecureStorageService             │
│                                              │
│  ┌───────────────┐    ┌──────────────────┐   │
│  │ In-Memory     │◄───│ get(key)         │   │
│  │ Cache (Map)   │    │ - check cache    │   │
│  │               │    │ - if miss: read  │   │
│  │ 63 keys max   │    │   from Preferences│  │
│  └───────┬───────┘    └──────────────────┘   │
│          │                                    │
│  ┌───────▼────────┐   ┌──────────────────┐   │
│  │ Capacitor      │◄──│ set(key, value)  │   │
│  │ Preferences    │   │ - update cache   │   │
│  │ (disk)         │   │ - write to disk  │   │
│  └────────────────┘   └──────────────────┘   │
└─────────────────────────────────────────────┘
```

### 11.2 Key Storage Keys (63 total)

| Key                    | Type    | Description                                  |
|------------------------|---------|----------------------------------------------|
| `TOKEN`                | string  | JWT access token                             |
| `REFRESH_TOKEN`        | string  | JWT refresh token                            |
| `TOKEN_CONFIG`         | object  | `{ expiresIn, issuedAt }`                    |
| `DOCTOR_PROFILE`       | object  | Full user profile from `/api/account`        |
| `USER_AUTHORITIES`     | array   | Role strings                                 |
| `DOMAIN`               | string  | "AADI" — survives logout                     |
| `CLIENT`               | string  | "NH" — survives logout                       |
| `COUNTRY`              | string  | "IN" or "KY" — survives logout               |
| `FCM_TOKEN`            | string  | Firebase device token                        |
| `ACS_TOKEN`            | string  | Azure Communication Services token           |
| `ACS_USER_ID`          | string  | ACS user identity                            |
| `SELECTED_UNIT`        | string  | Current hospital unit                        |
| `PATIENT_LIST_FILTERS` | object  | Saved filter selections                      |
| `LAST_SYNC_TIME`       | string  | ISO timestamp of last sync                   |
| `APP_VERSION`          | string  | Current app version                          |
| `DB_VERSION`           | number  | SQLite schema version                        |
| ...                    | ...     | (47 more keys for feature-specific state)    |

### 11.3 Migration from Legacy Storage

The app includes a one-time migration from the old `LocalStorageService` (which used `window.localStorage`) to the new `SecureStorageService` (which uses Capacitor Preferences). On first launch after update, the app:

1. Checks if `MIGRATION_COMPLETE` key exists in new storage
2. If not, reads all keys from `localStorage`
3. Copies them to Capacitor Preferences
4. Sets `MIGRATION_COMPLETE = true`
5. Clears `localStorage`

---

## 12. Database Initialization

### 12.1 SQLite Setup

The app uses `@capacitor-community/sqlite` to manage an encrypted local database.

| Property     | Value                         |
|--------------|-------------------------------|
| DB Name      | `aadi`                        |
| Encryption   | Yes (key derived from device) |
| Seed Script  | `assets/database/aadi.sql`    |
| Migrations   | Version-based, sequential     |

### 12.2 Initialization Sequence

```
1. Check if DB "aadi" exists
   ├── YES → check DB_VERSION vs expected
   │         ├── Match → open DB, done
   │         └── Mismatch → run migration scripts sequentially
   └── NO  → create DB
             → execute assets/database/aadi.sql (seed)
             → set DB_VERSION
```

### 12.3 Seed Script

The seed script (`aadi.sql`) creates all tables required for offline operation: patients, messages, filters, checklists, medications, etc. Tables are created with `IF NOT EXISTS` to be idempotent.

---

## 13. Network Monitoring

The app uses the **Capacitor Network plugin** to track connectivity state.

```typescript
// Simplified from app-init.service.ts
Network.addListener('networkStatusChange', (status) => {
  this.networkStatus$.next(status.connected);
});
```

| Observable           | Type                         | Description                        |
|----------------------|------------------------------|------------------------------------|
| `networkStatus$`     | `BehaviorSubject<boolean>`   | `true` = online, `false` = offline |

### 13.1 Offline Behavior

- When offline: requests are queued, SQLite is used for reads, UI shows "Offline" banner
- When back online: queued requests are replayed, patient list re-synced, ACS reconnected

---

## 14. App Initialization Flow

On every app launch (cold start or resume from background), `AppInitService` runs:

```
┌──────────────────────────────────────────────────────┐
│              APP INITIALIZATION SEQUENCE              │
│                                                      │
│  1. Jailbreak / Root Detection                       │
│     └── If detected → show warning, block app        │
│                                                      │
│  2. Version Check                                    │
│     └── GET /api/app-version                         │
│     └── If force update required → show update modal │
│                                                      │
│  3. Token Validation                                 │
│     └── Read TOKEN from SecureStorage                │
│     ├── No token → navigate to /login                │
│     ├── Token expired, refresh valid → refresh       │
│     └── Token valid → proceed                        │
│                                                      │
│  4. Database Check                                   │
│     └── Open/migrate SQLite DB                       │
│                                                      │
│  5. ACS Subscription                                 │
│     └── Initialize ACS chat client                   │
│     └── Subscribe to real-time events                │
│                                                      │
│  6. FCM Setup                                        │
│     └── Ensure device token is registered            │
│                                                      │
│  7. Navigate to /landing                             │
└──────────────────────────────────────────────────────┘
```

---

## 15. Logout Flow

### 15.1 Logout Sequence Diagram

```
User taps "Logout"
       │
       ▼
┌─────────────────────────────────────────────────┐
│                 LOGOUT SEQUENCE                  │
│                                                  │
│  1. Unsubscribe ACS                              │
│     └── chatClient.stopRealtimeNotifications()   │
│     └── POST /api/unsubscribe-acs-user           │
│                                                  │
│  2. Unregister FCM                               │
│     └── POST /api/unsubscribe-device-session     │
│         { deviceToken, login }                   │
│                                                  │
│  3. Clear SecureStorage                          │
│     └── Remove ALL keys EXCEPT:                  │
│         - DOMAIN                                 │
│         - CLIENT                                 │
│         - COUNTRY                                │
│     └── (these survive for pre-filling login)    │
│                                                  │
│  4. Clear SQLite                                 │
│     └── DROP all user-specific data              │
│     └── Keep schema (tables remain, rows deleted)│
│                                                  │
│  5. Clear in-memory caches                       │
│     └── BehaviorSubjects reset                   │
│     └── Patient list cleared                     │
│                                                  │
│  6. Navigate to /login                           │
│     └── Clear navigation stack                   │
└─────────────────────────────────────────────────┘
```

### 15.2 Keys Preserved After Logout

| Key       | Value Example | Purpose                                    |
|-----------|---------------|--------------------------------------------|
| `DOMAIN`  | `"AADI"`      | Pre-fill domain on next login              |
| `CLIENT`  | `"NH"`        | Pre-fill client code                       |
| `COUNTRY` | `"IN"`        | Pre-fill country / phone prefix            |

---

## 16. Error Handling Matrix

| Scenario                            | HTTP Code | UI Behavior                                  | Recovery                           |
|-------------------------------------|-----------|----------------------------------------------|------------------------------------|
| Invalid phone number format         | —         | Inline validation error, button disabled     | User corrects input                |
| Phone not registered                | 404       | Toast: "No user found with this number"      | User checks number                 |
| Wrong OTP                           | 400       | Toast: "Invalid OTP", show remaining attempts | User retries (max 3)              |
| OTP expired                         | 400       | Toast: "OTP expired", enable Resend          | User taps Resend                   |
| Max OTP attempts exceeded           | 429       | Toast: "Too many attempts, try after 15min"  | Wait and retry                     |
| Wrong username/password             | 401       | Toast: "Bad credentials"                     | User corrects input                |
| Account locked                      | 403       | Toast: "Account locked, contact admin"       | Contact IT admin                   |
| Network timeout                     | —         | Toast: "Network error, check connection"     | Retry after connectivity restored  |
| Server error                        | 500       | Toast: "Something went wrong"               | Retry later                        |
| Token refresh failed                | 401       | Auto-logout, toast: "Session expired"        | Re-login                           |
| Jailbreak detected                  | —         | Full-screen blocking modal                   | Use non-rooted device              |
| Force update required               | —         | Modal with Play Store link, app blocked      | Update app                         |
| SQLite DB corruption                | —         | Delete and recreate DB, re-sync data         | Automatic                          |

---

## 17. Edge Cases

1. **Multi-device login:** The backend allows only one active session per user. Logging in on device B automatically invalidates device A's token. Device A receives a 401 on next API call and is logged out.

2. **Background token expiry:** If the app is backgrounded for >30 min, on resume the app-init flow detects the expired token and attempts a refresh before any API call.

3. **OTP race condition:** If the user taps "Resend OTP" and then enters the old OTP, the old OTP is invalidated — only the latest OTP is valid.

4. **Migration edge case:** If a user has data in both old `localStorage` and new `Preferences` (partial migration from a crash), the migration checks for key conflicts and prefers the newer value.

5. **Network toggle during login:** If the network drops between validate-user-by-mobile and validate-otp, the OTP screen stays open. The user can enter the OTP once connectivity is restored (within the 5-minute expiry window).

6. **Cayman Islands timezone:** The app adjusts OTP expiry display for the Cayman timezone (EST/EDT) when `COUNTRY === "KY"`.

---

## 18. Implementation Checklist

- [ ] Login screen with 3 tabs (Phone OTP, Email OTP, Username/Password)
- [ ] Country selector (India +91, Cayman +1-345) with validation regex
- [ ] POST validate-user-by-mobile integration
- [ ] POST validate-user-by-email integration
- [ ] Multi-user dropdown when >1 user returned
- [ ] OTP input (6 digits) with 30-second countdown timer
- [ ] Resend OTP button (enabled after countdown)
- [ ] POST validate-otp integration
- [ ] POST /api/authenticate integration (username/password)
- [ ] Store tokens in SecureStorage (TOKEN, REFRESH_TOKEN, TOKEN_CONFIG)
- [ ] GET /api/account → store DOCTOR_PROFILE, USER_AUTHORITIES
- [ ] FCM registration (POST /api/device-session)
- [ ] SQLite database initialization (create/migrate "aadi" DB)
- [ ] ACS chat client initialization and subscription
- [ ] Token refresh timer (60s before expiry)
- [ ] Token interceptor (skip list, refresh queue)
- [ ] Auth expired interceptor (401 handling → logout)
- [ ] SecureStorage service with in-memory cache
- [ ] Migration from LocalStorageService
- [ ] Network monitoring (Capacitor Network plugin)
- [ ] Jailbreak/root detection on app start
- [ ] Version check on app start
- [ ] Logout flow (unsubscribe ACS, unregister FCM, clear storage, clear SQLite)
- [ ] Preserve DOMAIN/CLIENT/COUNTRY across logout
- [ ] Error toasts for all failure scenarios
- [ ] Test bypass (phone 4000999889, OTP 999889)
- [ ] Navigation to /landing after successful login
