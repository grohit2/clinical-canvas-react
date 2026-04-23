# AHAM App - Login & Authentication Flow
## Implementation-Level Specification (Reconstructed from Binary Analysis)

**App:** AHAM (org.nh.prod.aham) v2.6.1 (Build 10513)
**Client:** Narayana Health - Hospital Administration Staff
**Framework:** Flutter/Dart with BLoC pattern
**Reconstructed from:** Java plugin layer, AndroidManifest, Firebase config, binary analysis of libapp.so

---

## Table of Contents

1. [Overview](#1-overview)
2. [Screen-by-Screen Walkthrough](#2-screen-by-screen-walkthrough)
3. [BLoC State Machines](#3-bloc-state-machines)
4. [Complete API Reference](#4-complete-api-reference)
5. [Token Lifecycle State Machine](#5-token-lifecycle-state-machine)
6. [ACS Chat Plugin Interface](#6-acs-chat-plugin-interface)
7. [Storage Keys Reference](#7-storage-keys-reference)
8. [Firebase Configuration](#8-firebase-configuration)
9. [Error Handling Matrix](#9-error-handling-matrix)
10. [Edge Cases & Race Conditions](#10-edge-cases--race-conditions)
11. [Implementation Checklist](#11-implementation-checklist)

---

## 1. Overview

### What This App Does

AHAM is an internal hospital administration app for Narayana Health staff. It handles task management, real-time chat (via Azure Communication Services), push notifications (Firebase), and multi-facility access. Before any of that works, the user must authenticate.

### The Authentication Pipeline (Bird's-Eye View)

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AHAM AUTHENTICATION PIPELINE                    │
│                                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐    ┌───────────┐ │
│  │  CLIENT   │    │          │    │  POST-LOGIN  │    │           │ │
│  │  SETUP    │───>│  LOGIN   │───>│    SETUP     │───>│   HOME    │ │
│  │ (1-time)  │    │          │    │              │    │           │ │
│  └──────────┘    └──────────┘    └──────────────┘    └───────────┘ │
│       │                │               │                    │       │
│  org code +        username +      store tokens         dashboard   │
│  fetch domain      password        register FCM         loaded      │
│                                    init ACS chat                    │
│                                    fetch facilities                 │
└─────────────────────────────────────────────────────────────────────┘
```

### Decision Tree on App Launch

```
App Opens
    │
    ├── Is client_baseUrl in SharedPreferences?
    │       │
    │       ├── NO  ──────> Show CLIENT SETUP screen (Step 1)
    │       │
    │       └── YES
    │             │
    │             ├── Is access_token in SharedPreferences?
    │             │       │
    │             │       ├── NO  ──────> Show LOGIN screen (Step 2)
    │             │       │
    │             │       └── YES
    │             │             │
    │             │             ├── Is token still valid?
    │             │             │       │
    │             │             │       ├── YES ──> Post-Login Setup ──> HOME
    │             │             │       │
    │             │             │       └── NO
    │             │             │             │
    │             │             │             ├── Try refresh_token
    │             │             │             │       │
    │             │             │             │       ├── SUCCESS ──> HOME
    │             │             │             │       │
    │             │             │             │       └── FAIL ──> LOGIN screen
    │             │             │
```

### Build Flavors

The app has 4 build flavors. The only difference relevant to auth is the API URL path prefix:

| Flavor | Login Endpoint Path                    | Usage          |
|--------|----------------------------------------|----------------|
| prod   | `gateway-api-v1/auth/login`            | Production     |
| dev    | `dev/gateway-api-v1/auth/login`        | Development    |
| sqa    | `sqa/gateway-api-v1/auth/login`        | QA Testing     |
| uat    | `uat/gateway-api-v1/auth/login`        | User Acceptance|

The `baseUrl` (from client setup) is always prepended. Example for prod:
`https://api.narayanahealth.org/gateway-api-v1/auth/login`

---

## 2. Screen-by-Screen Walkthrough

### Screen 1: Client Setup

This screen appears ONLY on first launch (or after full data clear). It captures the organization code to determine which backend to connect to.

```
┌──────────────────────────────────────┐
│           ═══ AHAM ═══               │
│                                      │
│                                      │
│        ┌──────────────────┐          │
│        │  [NH Logo Area]  │          │
│        │                  │          │
│        └──────────────────┘          │
│                                      │
│   Organization Code                  │
│   ┌──────────────────────────────┐   │
│   │  NH                          │   │
│   └──────────────────────────────┘   │
│                                      │
│   ┌──────────────────────────────┐   │
│   │         CONTINUE             │   │
│   └──────────────────────────────┘   │
│                                      │
│                                      │
│   ┌──────────────────────────────┐   │
│   │   [Loading indicator here    │   │
│   │    when fetching domain]     │   │
│   └──────────────────────────────┘   │
│                                      │
│          v2.6.1 (10513)              │
└──────────────────────────────────────┘
```

**What happens when user taps CONTINUE:**

1. Validate input is not empty
2. Dispatch `FetchDomain(orgCode)` event to `ClientSetupBloc`
3. BLoC calls `GET /api/registry/_fetch-domain?org=NH`
4. On success: store `client_baseUrl` in SharedPreferences, navigate to Login
5. On error: show error message in SnackBar

**Implementation Notes:**
- The org code field should be case-insensitive (convert to uppercase before sending)
- Show a loading spinner over the CONTINUE button while fetching
- Disable the CONTINUE button while a request is in flight (prevent double-tap)
- The `client_baseUrl` persists forever -- it survives logout. User never sees this screen again unless app data is cleared

---

### Screen 2: Login

```
┌──────────────────────────────────────┐
│           ═══ AHAM ═══               │
│                                      │
│        ┌──────────────────┐          │
│        │  [NH Logo Area]  │          │
│        │                  │          │
│        └──────────────────┘          │
│                                      │
│   Welcome to Narayana Health         │
│                                      │
│   Username                           │
│   ┌──────────────────────────────┐   │
│   │  doctor.smith                │   │
│   └──────────────────────────────┘   │
│                                      │
│   Password                           │
│   ┌──────────────────────────────┐   │
│   │  ●●●●●●●●●●●●    [👁]       │   │
│   └──────────────────────────────┘   │
│                                      │
│   ┌──────────────────────────────┐   │
│   │           LOGIN              │   │
│   └──────────────────────────────┘   │
│                                      │
│                                      │
│   [Error messages appear here as     │
│    a SnackBar from the bottom]       │
│                                      │
│          v2.6.1 (10513)              │
└──────────────────────────────────────┘
```

**What happens when user taps LOGIN:**

1. Validate both fields are not empty
2. Dispatch `LoginSubmitted(username, password)` event to `LoginBloc`
3. BLoC calls `POST {baseUrl}gateway-api-v1/auth/login`
4. On success: store tokens + user info, begin post-login setup
5. On error: show specific error in SnackBar (see Error Handling Matrix)

**Implementation Notes:**
- Password field: obscured text with toggle visibility icon
- Disable LOGIN button while request is in flight
- Username field: no autocapitalization, no autocorrect
- Use `flutter_keyboard_visibility` plugin to adjust layout when keyboard appears
- The org name ("Narayana Health") comes from the client setup response, stored locally

---

### Screen 3: Post-Login Setup (Implicit / Splash-like)

This is NOT a visible screen the user interacts with. It is a brief loading state after login succeeds and before the home screen appears. Think of it as a transparent setup phase.

```
┌──────────────────────────────────────┐
│                                      │
│                                      │
│                                      │
│                                      │
│        ┌──────────────────┐          │
│        │  [NH Logo Area]  │          │
│        │                  │          │
│        └──────────────────┘          │
│                                      │
│          Setting up...               │
│                                      │
│         [Circular Progress           │
│          Indicator]                  │
│                                      │
│                                      │
│                                      │
│                                      │
└──────────────────────────────────────┘
```

**Actions performed in sequence:**

```
1. Store tokens in SharedPreferences          ──> MUST succeed
2. Register FCM device session                ──> CAN fail silently (retry later)
3. Initialize ACS chat connection             ──> CAN fail silently (chat degraded)
4. Fetch user facilities                      ──> MUST succeed
5. Navigate to Home                           ──> Done
```

Steps 2 and 3 can be fired in parallel since they are independent. Step 4 must complete before navigating to Home because the facility context is required for all subsequent API calls.

---

## 3. BLoC State Machines

### 3.1 ClientSetupBloc

```
                    ┌──────────────────────┐
                    │  ClientSetupInitial  │
                    │                      │
                    │  (empty org code     │
                    │   text field)        │
                    └──────────┬───────────┘
                               │
                    User taps CONTINUE
                    Event: FetchDomain(orgCode)
                               │
                               ▼
                    ┌──────────────────────┐
                    │  ClientSetupLoading  │
                    │                      │
                    │  (show spinner,      │
                    │   disable button)    │
                    └────────┬─────┬───────┘
                             │     │
                   success   │     │   failure
                             │     │
                    ┌────────▼──┐  │  ┌───────────────────┐
                    │ ClientSet-│  └─>│  ClientSetupError  │
                    │ upSuccess │     │                    │
                    │           │     │  (show SnackBar    │
                    │ (navigate │     │   with error msg,  │
                    │  to Login)│     │   return to        │
                    └───────────┘     │   Initial state)   │
                                      └───────────────────┘
```

**Dart Pseudocode:**

```dart
// Events
abstract class ClientSetupEvent {}
class FetchDomain extends ClientSetupEvent {
  final String orgCode;
  FetchDomain(this.orgCode);
}

// States
abstract class ClientSetupState {}
class ClientSetupInitial extends ClientSetupState {}
class ClientSetupLoading extends ClientSetupState {}
class ClientSetupSuccess extends ClientSetupState {
  final String baseUrl;
  final String orgName;
  ClientSetupSuccess({required this.baseUrl, required this.orgName});
}
class ClientSetupError extends ClientSetupState {
  final String message;
  ClientSetupError(this.message);
}

// BLoC
class ClientSetupBloc extends Bloc<ClientSetupEvent, ClientSetupState> {
  ClientSetupBloc() : super(ClientSetupInitial()) {
    on<FetchDomain>(_onFetchDomain);
  }

  Future<void> _onFetchDomain(FetchDomain event, Emitter<ClientSetupState> emit) async {
    emit(ClientSetupLoading());
    try {
      final response = await dio.get(
        '/api/registry/_fetch-domain',
        queryParameters: {'org': event.orgCode.toUpperCase()},
      );
      final baseUrl = response.data['baseUrl'];
      final orgName = response.data['orgName'];

      // Persist base URL
      await SharedPreferences.getInstance()
        ..setString('client_baseUrl', baseUrl);

      emit(ClientSetupSuccess(baseUrl: baseUrl, orgName: orgName));
    } on DioException catch (e) {
      emit(ClientSetupError(_mapDioError(e)));
    } catch (e) {
      emit(ClientSetupError('Something went wrong. Please try again later.'));
    }
  }
}
```

---

### 3.2 LoginBloc

```
                    ┌──────────────────┐
                    │   LoginInitial   │
                    │                  │
                    │  (empty form)    │
                    └────────┬─────────┘
                             │
                  User taps LOGIN
                  Event: LoginSubmitted(username, password)
                             │
                             ▼
                    ┌──────────────────┐
                    │   LoginLoading   │
                    │                  │
                    │  (show spinner,  │
                    │   disable btn)   │
                    └───────┬──┬───────┘
                            │  │
                  success   │  │   failure
                            │  │
                   ┌────────▼┐ │  ┌──────────────────┐
                   │ Login   │ └─>│   LoginFailure   │
                   │ Success │    │                   │
                   │         │    │  (show SnackBar   │
                   │ (begin  │    │   with error,     │
                   │  post-  │    │   return to form  │
                   │  login  │    │   -- fields kept) │
                   │  setup) │    └──────────────────┘
                   └─────────┘           │
                                         │ user retries
                                         └──> back to LoginInitial
```

**Dart Pseudocode:**

```dart
// Events
abstract class LoginEvent {}
class LoginSubmitted extends LoginEvent {
  final String username;
  final String password;
  LoginSubmitted({required this.username, required this.password});
}

// States
abstract class LoginState {}
class LoginInitial extends LoginState {}
class LoginLoading extends LoginState {}
class LoginSuccess extends LoginState {
  final AuthTokenResponse tokens;
  final UserProfile user;
  LoginSuccess({required this.tokens, required this.user});
}
class LoginFailure extends LoginState {
  final String errorCode;   // e.g., "INVALID_CREDENTIALS"
  final String message;     // e.g., "Invalid username or password"
  LoginFailure({required this.errorCode, required this.message});
}

// BLoC
class LoginBloc extends Bloc<LoginEvent, LoginState> {
  final AuthRepository authRepository;

  LoginBloc({required this.authRepository}) : super(LoginInitial()) {
    on<LoginSubmitted>(_onLoginSubmitted);
  }

  Future<void> _onLoginSubmitted(LoginSubmitted event, Emitter<LoginState> emit) async {
    emit(LoginLoading());
    try {
      final tokenResponse = await authRepository.login(
        username: event.username,
        password: event.password,
      );

      // Store tokens immediately
      await _persistTokens(tokenResponse);
      await _persistUserInfo(tokenResponse);

      emit(LoginSuccess(tokens: tokenResponse, user: tokenResponse.user));

      // Fire-and-forget: FCM registration + ACS init (parallel)
      unawaited(Future.wait([
        _registerFcmToken(),
        _initAcsChat(tokenResponse.accessToken),
      ]));

      // Must await: fetch facilities (needed for home screen)
      await _fetchAndStoreFacilities();

    } on DioException catch (e) {
      final errorBody = e.response?.data;
      if (errorBody != null && errorBody is Map) {
        emit(LoginFailure(
          errorCode: errorBody['error'] ?? 'UNKNOWN',
          message: errorBody['message'] ?? 'Login failed',
        ));
      } else {
        emit(LoginFailure(
          errorCode: 'NETWORK_ERROR',
          message: 'Unable to connect. Check your internet connection.',
        ));
      }
    }
  }
}
```

---

### 3.3 AuthenticationBloc (Global Session Manager)

This BLoC runs for the entire app lifetime. It manages the token refresh cycle and forced logout.

```
                    ┌──────────────────────┐
                    │   Unauthenticated    │◄─────────────────────────┐
                    │                      │                          │
                    │ (show login screen)  │                          │
                    └──────────┬───────────┘                          │
                               │                                      │
                        Login succeeds                                │
                        Event: LoggedIn(tokens)                       │
                               │                                      │
                               ▼                                      │
                    ┌──────────────────────┐                          │
                    │    Authenticated     │                          │
                    │                      │                          │
                    │  (normal app usage)  │─────┐                    │
                    │                      │     │                    │
                    └──────────┬───────────┘     │                    │
                               │                 │                    │
                     access_token near           │  User taps logout  │
                     expiry (<60s left)          │  Event: LoggedOut  │
                     Event: TokenExpiring         │                    │
                               │                 │                    │
                               ▼                 │                    │
                    ┌──────────────────────┐     │                    │
                    │   TokenRefreshing    │     │                    │
                    │                      │     │                    │
                    │  (API calls queued)  │     │                    │
                    └────────┬──┬──────────┘     │                    │
                             │  │                │                    │
                   success   │  │  failure       │                    │
                             │  │                │                    │
                    ┌────────▼┐ │                │                    │
                    │ back to │ │                │                    │
                    │ Authen- │ │                │                    │
                    │ ticated │ │                │                    │
                    └─────────┘ │                │                    │
                                │                │                    │
                                ▼                ▼                    │
                    ┌──────────────────────┐                          │
                    │   SessionExpired     │──────────────────────────┘
                    │                      │  (clear storage,
                    │  (refresh failed)    │   unsubscribe ACS,
                    └──────────────────────┘   deregister FCM)
```

**Key Implementation Detail -- the Refresh Lock:**

When the access token is near expiry and multiple API calls happen simultaneously, you must NOT fire multiple refresh requests. Use a `Completer` as a lock:

```dart
class AuthenticationBloc extends Bloc<AuthEvent, AuthState> {
  Completer<AuthTokenResponse>? _refreshCompleter;

  /// Call this from the Dio interceptor when a 401 is received
  /// or when the token is detected as near-expiry.
  Future<AuthTokenResponse> ensureValidToken() async {
    final prefs = await SharedPreferences.getInstance();
    final accessToken = prefs.getString('access_token');

    if (accessToken != null && !_isTokenExpiringSoon(accessToken)) {
      // Token is still good
      return AuthTokenResponse(accessToken: accessToken, ...);
    }

    // If a refresh is already in flight, wait for it
    if (_refreshCompleter != null && !_refreshCompleter!.isCompleted) {
      return _refreshCompleter!.future;
    }

    // Start a new refresh
    _refreshCompleter = Completer<AuthTokenResponse>();

    try {
      final refreshToken = prefs.getString('refresh_token');
      if (refreshToken == null || _isTokenExpired(refreshToken)) {
        throw TokenExpiredException();
      }

      final response = await _dio.post(
        '${_baseUrl}api/reload/token',
        options: Options(headers: {
          'Authorization': 'Bearer $refreshToken',
        }),
      );

      final newTokens = AuthTokenResponse.fromJson(response.data);
      await _persistTokens(newTokens);

      _refreshCompleter!.complete(newTokens);
      return newTokens;

    } catch (e) {
      _refreshCompleter!.completeError(e);
      add(SessionExpired()); // force logout
      rethrow;
    }
  }

  bool _isTokenExpiringSoon(String jwt) {
    final payload = _decodeJwtPayload(jwt);
    final exp = DateTime.fromMillisecondsSinceEpoch(payload['exp'] * 1000);
    return DateTime.now().isAfter(exp.subtract(Duration(seconds: 60)));
  }

  bool _isTokenExpired(String jwt) {
    final payload = _decodeJwtPayload(jwt);
    final exp = DateTime.fromMillisecondsSinceEpoch(payload['exp'] * 1000);
    return DateTime.now().isAfter(exp);
  }

  Map<String, dynamic> _decodeJwtPayload(String jwt) {
    final parts = jwt.split('.');
    final payload = base64Url.decode(base64Url.normalize(parts[1]));
    return json.decode(utf8.decode(payload));
  }
}
```

---

## 4. Complete API Reference

### 4.1 Fetch Domain (Client Setup)

```
GET /api/registry/_fetch-domain?org={orgCode}
```

| Field      | Value                                  |
|------------|----------------------------------------|
| Method     | GET                                    |
| Base URL   | Hardcoded registry URL (not from prefs)|
| Auth       | None (pre-login)                       |

**Request:**
```
GET /api/registry/_fetch-domain?org=NH HTTP/1.1
Host: registry.narayanahealth.org
Content-Type: application/json
```

**Response (200 OK):**
```json
{
  "baseUrl": "https://api.narayanahealth.org/",
  "orgName": "Narayana Health",
  "orgCode": "NH",
  "logoUrl": "https://cdn.narayanahealth.org/logo.png"
}
```

**Response (404 Not Found):**
```json
{
  "error": "ORG_NOT_FOUND",
  "message": "Organization code not recognized"
}
```

---

### 4.2 Login

```
POST {baseUrl}{flavor_prefix}gateway-api-v1/auth/login
```

| Field      | Value                                  |
|------------|----------------------------------------|
| Method     | POST                                   |
| Base URL   | From SharedPreferences `client_baseUrl`|
| Auth       | None (pre-login)                       |

**Flavor Prefix Mapping:**

| Flavor | Prefix   | Full Example                                            |
|--------|----------|---------------------------------------------------------|
| prod   | (none)   | `https://api.nh.org/gateway-api-v1/auth/login`          |
| dev    | `dev/`   | `https://api.nh.org/dev/gateway-api-v1/auth/login`      |
| sqa    | `sqa/`   | `https://api.nh.org/sqa/gateway-api-v1/auth/login`      |
| uat    | `uat/`   | `https://api.nh.org/uat/gateway-api-v1/auth/login`      |

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "doctor.smith",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRyLiBTbWl0aCIsImxvZ2luIjoiZG9jdG9yLnNtaXRoIiwidW5pdCI6IkhTUi1PUEQiLCJleHAiOjE3MTYyMzkwMjIsImlhdCI6MTcxNjIzNzIyMn0.signature",
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidHlwZSI6InJlZnJlc2giLCJleHAiOjE3MTY4NDIwMjJ9.signature",
  "expires_in": 1800,
  "token_type": "Bearer",
  "scope": "read write"
}
```

**JWT Payload (decoded access_token -- expected fields):**
```json
{
  "sub": "1234567890",
  "name": "Dr. Smith",
  "login": "doctor.smith",
  "unit": "HSR-OPD",
  "roles": ["DOCTOR", "ADMIN"],
  "exp": 1716239022,
  "iat": 1716237222
}
```

**Error Responses:**

401 Unauthorized:
```json
{
  "error": "INVALID_CREDENTIALS",
  "message": "Invalid username or password"
}
```

403 Forbidden (Account Locked):
```json
{
  "error": "ACCOUNT_LOCKED",
  "message": "Account locked after too many attempts"
}
```

403 Forbidden (Account Disabled):
```json
{
  "error": "ACCOUNT_DISABLED",
  "message": "Account has been disabled"
}
```

403 Forbidden (Password Expired):
```json
{
  "error": "PASSWORD_EXPIRED",
  "message": "Password has expired"
}
```

---

### 4.3 Token Refresh

```
POST {baseUrl}api/reload/token
```

| Field      | Value                                  |
|------------|----------------------------------------|
| Method     | POST                                   |
| Base URL   | From SharedPreferences `client_baseUrl`|
| Auth       | Bearer {refresh_token}                 |

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...  (the REFRESH token, not access token)
Content-Type: application/json
```

**Request Body:** None (empty body)

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...(NEW)",
  "refresh_token": "eyJhbGciOiJSUzI1NiIs...(NEW)",
  "expires_in": 1800,
  "token_type": "Bearer",
  "scope": "read write"
}
```

**Response (401 Unauthorized -- refresh token expired):**
```json
{
  "error": "TOKEN_EXPIRED",
  "message": "Refresh token has expired"
}
```
This response triggers forced logout.

---

### 4.4 Register FCM Device Session

```
POST {baseUrl}api/device-session
```

| Field      | Value                                  |
|------------|----------------------------------------|
| Method     | POST                                   |
| Base URL   | From SharedPreferences `client_baseUrl`|
| Auth       | Bearer {access_token}                  |

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json
```

**Request Body:**
```json
{
  "login": "doctor.smith",
  "deviceId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "fcmToken": "cKnE_RGrT3a...:APA91bH...",
  "appId": "AHAM",
  "osType": "ANDROID"
}
```

**Notes:**
- `deviceId`: Use `device_info_plus` plugin to get Android ID
- `fcmToken`: From `FirebaseMessaging.instance.getToken()`
- `appId`: Always "AHAM" (hardcoded)
- `osType`: Always "ANDROID" for Android builds

**Response (200 OK):**
```json
{
  "id": "session-uuid-here",
  "status": "ACTIVE"
}
```

---

### 4.5 Deregister FCM Device Session (Logout)

```
DELETE {baseUrl}api/device-session/{deviceId}
```

| Field      | Value                                  |
|------------|----------------------------------------|
| Method     | DELETE                                 |
| Base URL   | From SharedPreferences `client_baseUrl`|
| Auth       | Bearer {access_token}                  |

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

**Response (200 OK):**
```json
{
  "status": "DEREGISTERED"
}
```

---

### 4.6 Fetch User Facilities

```
GET {baseUrl}api/user-facilities
```

| Field      | Value                                  |
|------------|----------------------------------------|
| Method     | GET                                    |
| Base URL   | From SharedPreferences `client_baseUrl`|
| Auth       | Bearer {access_token}                  |

**Request Headers:**
```
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
Content-Type: application/json
```

**Response (200 OK):**
```json
{
  "facilities": [
    {
      "id": "HSR",
      "name": "Narayana Health - HSR Layout",
      "unit": "HSR-OPD",
      "isDefault": true
    },
    {
      "id": "WHF",
      "name": "Narayana Health - Whitefield",
      "unit": "WHF-OPD",
      "isDefault": false
    },
    {
      "id": "BNG",
      "name": "Narayana Health - Bommasandra",
      "unit": "BNG-OPD",
      "isDefault": false
    }
  ]
}
```

---

## 5. Token Lifecycle State Machine

### Complete Lifecycle Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TOKEN LIFECYCLE                                      │
│                                                                             │
│  ┌──────────┐  login   ┌──────────┐  <60s left  ┌──────────────┐          │
│  │ NO TOKEN │ ────────>│  VALID   │ ───────────> │  REFRESHING  │          │
│  │          │          │  TOKEN   │              │              │          │
│  └──────────┘          └──────────┘              └──────┬───────┘          │
│       ▲                     ▲                           │                   │
│       │                     │                           │                   │
│       │                     │  success                  │                   │
│       │                     └───────────────────────────┘                   │
│       │                                                 │                   │
│       │                                                 │ failure           │
│       │                                                 │                   │
│       │                    ┌──────────┐                  │                   │
│       └────────────────────│ EXPIRED  │ <───────────────┘                   │
│         forced logout      │ (logout) │                                     │
│                            └──────────┘                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### When Token Checks Happen

| Trigger                          | Action                                    |
|----------------------------------|-------------------------------------------|
| App resumes from background      | Check access_token expiry                 |
| Before each API call             | Dio interceptor checks expiry             |
| Periodic timer (every 5 min)     | AuthenticationBloc checks expiry          |
| 401 response from any API call   | Dio interceptor triggers refresh          |
| Firebase token refresh callback  | Re-register FCM device session            |

### Dio Interceptor Implementation

```dart
class AuthInterceptor extends Interceptor {
  final AuthenticationBloc authBloc;

  AuthInterceptor(this.authBloc);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    try {
      // This will refresh if needed, or return current token
      final tokens = await authBloc.ensureValidToken();
      options.headers['Authorization'] = 'Bearer ${tokens.accessToken}';

      // Add facility context header
      final prefs = await SharedPreferences.getInstance();
      final unit = prefs.getString('logged-in-unit');
      if (unit != null) {
        options.headers['X-Facility-Unit'] = unit;
      }
    } catch (e) {
      // Token refresh failed -- request will proceed without auth
      // and get a 401, which will trigger logout
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Try to refresh and retry the request ONCE
      try {
        final tokens = await authBloc.ensureValidToken();

        // Clone and retry the original request with new token
        final opts = err.requestOptions;
        opts.headers['Authorization'] = 'Bearer ${tokens.accessToken}';

        final response = await Dio().fetch(opts);
        handler.resolve(response);
        return;
      } catch (e) {
        // Refresh failed -- force logout
        authBloc.add(SessionExpired());
      }
    }

    // Parse error response into a user-friendly model
    if (err.response?.data != null) {
      try {
        final errorModel = ErrorResponseModel.fromJson(err.response!.data);
        err = err.copyWith(
          error: errorModel, // attach parsed error for UI consumption
        );
      } catch (_) {}
    }

    handler.next(err);
  }
}
```

### Dio Client Setup

```dart
Dio createAuthenticatedDio(AuthenticationBloc authBloc) {
  final prefs = SharedPreferencesSync.instance;
  final baseUrl = prefs.getString('client_baseUrl')!;

  final dio = Dio(BaseOptions(
    baseUrl: baseUrl,
    connectTimeout: Duration(seconds: 30),
    receiveTimeout: Duration(seconds: 30),
    headers: {
      'Content-Type': 'application/json',
    },
  ));

  // Interceptors execute in order: request → response → error
  dio.interceptors.addAll([
    AuthInterceptor(authBloc),    // 1. Add auth header
    LogInterceptor(),              // 2. Debug logging (remove in prod)
  ]);

  return dio;
}
```

---

## 6. ACS Chat Plugin Interface

Azure Communication Services chat is implemented as a native Android plugin (`FlutterAcsPlugin.java`) communicating with Flutter via a method channel.

### Method Channel Name

```
flutter_acs
```

### Methods (Flutter -> Native)

| Method                  | Arguments                              | Returns     | When Called                |
|-------------------------|----------------------------------------|-------------|---------------------------|
| `initACS`              | `accessToken: String, endpoint: String`| `void`      | Post-login setup          |
| `resubscribeToACS`     | (none)                                 | `void`      | Network reconnect         |
| `unsubscribeACS`       | (none)                                 | `void`      | Logout                    |
| `allMessages`          | `threadId: String`                     | `List<Map>` | Open chat thread          |
| `getAllHistoryMessages` | `threadId: String, startDate: String`  | `List<Map>` | Load older messages       |

### Events (Native -> Flutter)

Events are pushed from Java to Dart via `EventChannel` or method channel invocations.

| Event Name              | Payload Model             | Fields                                    |
|-------------------------|---------------------------|-------------------------------------------|
| `chatMessageReceived`   | `ChatMessageDTO`          | `threadId, payload, senderDisplayName, metadata, createdOn` |
| `chatMessageDeleted`    | `ChatMessageDeleted`      | `threadId, messageId, deletedOn`          |
| `chatThreadDeleted`     | `ChatThreadDeletedModel`  | `threadId, deletedOn`                     |
| `participantsAdded`     | `ChatParticipantsModel`   | `threadId, participants: List<Participant>` |
| `participantsRemoved`   | `ChatParticipantsModel`   | `threadId, participants: List<Participant>` |

### ACS Initialization in Post-Login

```dart
Future<void> _initAcsChat(String accessToken) async {
  try {
    // Step 1: Get ACS token from your backend
    final response = await dio.get('${baseUrl}api/acs/token');
    final acsToken = response.data['token'];
    final acsEndpoint = response.data['endpoint'];
    // endpoint is something like: "https://narayanahealth.communication.azure.com"

    // Step 2: Pass to native plugin
    const channel = MethodChannel('flutter_acs');
    await channel.invokeMethod('initACS', {
      'accessToken': acsToken,
      'endpoint': acsEndpoint,
    });

    // Step 3: Listen for incoming events
    channel.setMethodCallHandler((call) async {
      switch (call.method) {
        case 'chatMessageReceived':
          final dto = ChatMessageDTO.fromMap(call.arguments);
          chatBloc.add(MessageReceived(dto));
          break;
        case 'chatMessageDeleted':
          final dto = ChatMessageDeleted.fromMap(call.arguments);
          chatBloc.add(MessageDeleted(dto));
          break;
        case 'chatThreadDeleted':
          final dto = ChatThreadDeletedModel.fromMap(call.arguments);
          chatBloc.add(ThreadDeleted(dto));
          break;
        case 'participantsAdded':
          final dto = ChatParticipantsModel.fromMap(call.arguments);
          chatBloc.add(ParticipantsChanged(dto, added: true));
          break;
        case 'participantsRemoved':
          final dto = ChatParticipantsModel.fromMap(call.arguments);
          chatBloc.add(ParticipantsChanged(dto, added: false));
          break;
      }
    });
  } catch (e) {
    // ACS init failure is non-fatal
    // Chat features will be degraded; retry on next app resume
    debugPrint('ACS init failed: $e');
  }
}
```

### ACS Cleanup on Logout

```dart
Future<void> _cleanupAcs() async {
  try {
    const channel = MethodChannel('flutter_acs');
    await channel.invokeMethod('unsubscribeACS');
  } catch (e) {
    // Ignore errors during cleanup
  }
}
```

---

## 7. Storage Keys Reference

### SharedPreferences Keys

| Key                | Type   | Set When          | Cleared on Logout | Example Value                              |
|--------------------|--------|-------------------|--------------------|--------------------------------------------|
| `client_baseUrl`   | String | Client setup      | **NO** (persists)  | `https://api.narayanahealth.org/`          |
| `access_token`     | String | Login / Refresh   | YES                | `eyJhbGciOiJSUzI1NiIs...`                 |
| `refresh_token`    | String | Login / Refresh   | YES                | `eyJhbGciOiJSUzI1NiIs...`                 |
| `logged-in-id`     | String | Login             | YES                | `1234567890`                               |
| `logged-in-login`  | String | Login             | YES                | `doctor.smith`                             |
| `logged-in-name`   | String | Login             | YES                | `Dr. Smith`                                |
| `logged-in-unit`   | String | Login / Facility switch | YES          | `HSR-OPD`                                  |
| `logged-in-user`   | String | Login             | YES                | `{"id":"123","name":"Dr. Smith",...}` (JSON)|

### ObjectBox (Local Database)

ObjectBox is used for caching facility-specific data (tasks, chat threads, etc.). It is NOT used for auth storage.

| Cleared on Logout | Cleared on Facility Switch | Contents                     |
|--------------------|----------------------------|------------------------------|
| YES (full wipe)    | YES (selective)            | Cached tasks, chat threads, facility-specific data |

### What to Clear on Logout vs What to Keep

```dart
Future<void> _clearStorageOnLogout() async {
  final prefs = await SharedPreferences.getInstance();

  // KEEP these keys (survive logout):
  final baseUrl = prefs.getString('client_baseUrl');  // preserve

  // CLEAR everything
  await prefs.clear();

  // RESTORE preserved keys
  if (baseUrl != null) {
    await prefs.setString('client_baseUrl', baseUrl);
  }

  // CLEAR ObjectBox
  final store = await ObjectBox.getStore();
  store.close();
  // Delete the ObjectBox database directory
  final dbDir = await getApplicationDocumentsDirectory();
  final objectboxDir = Directory('${dbDir.path}/objectbox');
  if (await objectboxDir.exists()) {
    await objectboxDir.delete(recursive: true);
  }
}
```

---

## 8. Firebase Configuration

### Project Setup

| Setting           | Value                                          |
|-------------------|------------------------------------------------|
| Project ID        | `aham-fce98`                                   |
| GCM Sender ID     | `927985632374`                                 |
| App ID            | `1:927985632374:android:a275e236fc405f84cfcb57`|
| Storage Bucket    | `aham-fce98.firebasestorage.app`               |

### Services Used

| Service                    | Purpose                                     |
|----------------------------|---------------------------------------------|
| Firebase Cloud Messaging   | Push notifications for tasks/approvals      |
| Firebase Remote Config     | Feature flags, server URLs, toggle features |
| Firebase Core              | Base dependency                             |

### FCM Token Lifecycle

```dart
class FcmService {
  Future<void> initialize() async {
    // 1. Get the current token
    final token = await FirebaseMessaging.instance.getToken();
    if (token != null) {
      await _registerWithServer(token);
    }

    // 2. Listen for token refresh (happens when Firebase rotates the token)
    FirebaseMessaging.instance.onTokenRefresh.listen((newToken) {
      _registerWithServer(newToken);
    });

    // 3. Request notification permission (Android 13+ / API 33+)
    final settings = await FirebaseMessaging.instance.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // 4. Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      // Show local notification or update UI
    });

    // 5. Handle background/terminated message tap
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      // Navigate to relevant screen
    });
  }

  Future<void> _registerWithServer(String fcmToken) async {
    final prefs = await SharedPreferences.getInstance();
    final login = prefs.getString('logged-in-login');
    if (login == null) return; // not logged in yet

    final deviceInfo = DeviceInfoPlugin();
    final androidInfo = await deviceInfo.androidInfo;

    await dio.post('api/device-session', data: {
      'login': login,
      'deviceId': androidInfo.id,
      'fcmToken': fcmToken,
      'appId': 'AHAM',
      'osType': 'ANDROID',
    });
  }
}
```

### Firebase Remote Config

```dart
class RemoteConfigService {
  final FirebaseRemoteConfig _remoteConfig = FirebaseRemoteConfig.instance;

  Future<void> initialize() async {
    await _remoteConfig.setConfigSettings(RemoteConfigSettings(
      fetchTimeout: Duration(seconds: 10),
      minimumFetchInterval: Duration(hours: 1),
    ));

    // Set defaults for when fetch fails
    await _remoteConfig.setDefaults({
      'maintenance_mode': false,
      'min_app_version': '2.0.0',
      'feature_chat_enabled': true,
    });

    // Fetch and activate
    await _remoteConfig.fetchAndActivate();
  }
}
```

---

## 9. Error Handling Matrix

### Login Screen Errors

| HTTP Status | Error Code            | User-Facing Message                                      | UI Action                        |
|-------------|-----------------------|----------------------------------------------------------|----------------------------------|
| 401         | `INVALID_CREDENTIALS` | "Invalid username or password"                           | SnackBar, clear password field   |
| 403         | `ACCOUNT_LOCKED`      | "Account locked after too many attempts"                 | SnackBar, disable login for 30s  |
| 403         | `ACCOUNT_DISABLED`    | "Account has been disabled. Contact your administrator"  | SnackBar, keep form as-is       |
| 403         | `PASSWORD_EXPIRED`    | "Password has expired. Please reset your password"       | SnackBar, keep form as-is       |
| 0 (network) | `NETWORK_ERROR`       | "Unable to connect. Check your internet connection"      | SnackBar with retry suggestion   |
| 500         | `SERVER_ERROR`        | "Something went wrong. Please try again later"           | SnackBar                         |
| timeout     | `TIMEOUT`             | "Connection timed out. Please try again"                 | SnackBar                         |

### Client Setup Screen Errors

| HTTP Status | Error Code       | User-Facing Message                                      | UI Action                       |
|-------------|------------------|----------------------------------------------------------|---------------------------------|
| 404         | `ORG_NOT_FOUND`  | "Organization code not recognized"                       | SnackBar, clear field           |
| 0 (network) | `NETWORK_ERROR`  | "Unable to connect. Check your internet connection"      | SnackBar                        |
| 500         | `SERVER_ERROR`   | "Something went wrong. Please try again later"           | SnackBar                        |

### Token Refresh Errors (Silent / Background)

| Scenario                     | Action                                                    |
|------------------------------|-----------------------------------------------------------|
| Refresh succeeds             | Update tokens in SharedPreferences, continue normally     |
| Refresh fails (401)          | Force logout, navigate to login, no error shown to user   |
| Refresh fails (network)      | Queue retry on next API call or network reconnect         |
| Refresh in progress + new API call arrives | Queue the new call, resolve when refresh completes |

### ACS Chat Errors (Non-Fatal)

| Scenario                     | Action                                                    |
|------------------------------|-----------------------------------------------------------|
| ACS init fails               | Log error, chat features degraded, retry on app resume   |
| ACS connection drops         | Call `resubscribeToACS()` on network reconnect           |
| ACS token expired            | Fetch new ACS token from backend, reinitialize           |

### DioException Mapping Utility

```dart
String mapDioError(DioException e) {
  switch (e.type) {
    case DioExceptionType.connectionTimeout:
    case DioExceptionType.sendTimeout:
    case DioExceptionType.receiveTimeout:
      return 'Connection timed out. Please try again.';

    case DioExceptionType.connectionError:
      return 'Unable to connect. Check your internet connection.';

    case DioExceptionType.badResponse:
      final statusCode = e.response?.statusCode;
      final body = e.response?.data;

      if (body is Map && body.containsKey('message')) {
        return body['message'];
      }

      if (statusCode == 500) {
        return 'Something went wrong. Please try again later.';
      }

      return 'Request failed ($statusCode).';

    case DioExceptionType.cancel:
      return 'Request was cancelled.';

    default:
      return 'Something went wrong. Please try again later.';
  }
}
```

---

## 10. Edge Cases & Race Conditions

### Edge Case 1: First Launch (No client_baseUrl)

```
Scenario: User opens app for the very first time.
Detection: SharedPreferences.getString('client_baseUrl') == null
Behavior: Route to ClientSetup screen instead of Login screen.
Code:

  Widget build(BuildContext context) {
    return FutureBuilder<SharedPreferences>(
      future: SharedPreferences.getInstance(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return SplashScreen();
        final prefs = snapshot.data!;
        if (prefs.getString('client_baseUrl') == null) {
          return ClientSetupScreen();
        }
        if (prefs.getString('access_token') == null) {
          return LoginScreen();
        }
        return HomeScreen(); // will check token validity via AuthenticationBloc
      },
    );
  }
```

### Edge Case 2: App Killed During Login

```
Scenario: User submits login, network call is in flight, user swipes app away.
Detection: On next launch, access_token is null (login never completed).
Behavior: Show login screen. No partial state to clean up because
          tokens are only written on successful login response.
Risk: None. The login API call is idempotent.
```

### Edge Case 3: Multiple Devices / Session Invalidation

```
Scenario: User logs in on Device A, then logs in on Device B.
          Server may invalidate Device A's session.
Detection: Device A gets 401 on next API call, token refresh also
           returns 401.
Behavior: Device A is force-logged out. User sees login screen.
Note:     The server-side behavior depends on NH's session policy.
          The app must handle this gracefully -- no crash, no stale data.
```

### Edge Case 4: Network Drop During Token Refresh

```
Scenario: access_token expires, refresh API call fails due to network.
Detection: DioException with connectionError type during refresh.
Behavior:
  1. Do NOT immediately logout (user may regain network).
  2. Mark refresh as failed.
  3. On next API call, retry the refresh.
  4. On network reconnect (listen via connectivity plugin), retry refresh.
  5. If refresh_token has expired by the time network returns, THEN logout.
```

### Edge Case 5: Facility Switch During Active Task

```
Scenario: User is editing a task in Facility A, switches to Facility B.
Detection: Task context contains facility ID that no longer matches
           the current logged-in-unit.
Behavior:
  1. Warn user before facility switch if there are unsaved changes.
  2. On switch, clear ObjectBox cache (facility-specific data).
  3. Reload home screen.
  4. All subsequent API calls use the new facility header.
Risk:     If user approves a task and then switches facility before
          the response arrives, the approval still applies to the
          original facility (server uses the facility from the request,
          not the user's current state).
```

### Edge Case 6: Firebase Token Refresh

```
Scenario: Firebase rotates the FCM token (happens periodically).
Detection: FirebaseMessaging.instance.onTokenRefresh stream fires.
Behavior: Automatically re-register with server via POST /api/device-session.
          Use the same device ID, new FCM token.
Risk:     If the user is not logged in when the token refreshes,
          skip the registration (no login to associate with).
```

### Edge Case 7: Concurrent Token Refresh Requests

```
Scenario: Token expires. Three API calls fire simultaneously.
          All three detect expired token and try to refresh.
Detection: Multiple calls to ensureValidToken() within milliseconds.
Behavior: Use a Completer lock (see Section 3.3).
          First caller starts the refresh.
          Second and third callers await the same Completer.
          When refresh completes, all three get the new token.
Risk:     Without the lock, you'd fire 3 refresh requests.
          The server may only honor the first one and invalidate
          the refresh_token, causing the other 2 to fail and
          trigger false logouts.
```

### Edge Case 8: App Resume After Extended Background

```
Scenario: User puts app in background for 2 hours. Both tokens expire.
Detection: AppLifecycleState.resumed triggers token check.
Behavior:
  1. Check access_token -> expired
  2. Try refresh_token -> also expired (or returns 401)
  3. Force logout
  4. Navigate to login screen
  5. No error SnackBar (silent redirect -- user expects to re-login)

Code:
  class AppLifecycleObserver extends WidgetsBindingObserver {
    final AuthenticationBloc authBloc;

    @override
    void didChangeAppLifecycleState(AppLifecycleState state) {
      if (state == AppLifecycleState.resumed) {
        authBloc.add(CheckTokenValidity());
      }
    }
  }
```

---

## 11. Implementation Checklist

Use this as a step-by-step build guide. Complete each section in order.

### Phase 1: Project Setup

- [ ] Create Flutter project with package name `org.nh.prod.aham`
- [ ] Configure 4 build flavors: `prod`, `dev`, `sqa`, `uat`
  - Each flavor needs its own `google-services.json` from Firebase
  - Each flavor defines a `flavorPrefix` constant (empty string for prod)
- [ ] Set `minSdkVersion: 24`, `targetSdkVersion: 35`, `compileSdkVersion: 36`
- [ ] Add Android permissions to `AndroidManifest.xml`:
  ```xml
  <uses-permission android:name="android.permission.INTERNET"/>
  <uses-permission android:name="android.permission.CAMERA"/>
  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
  <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
  <uses-permission android:name="android.permission.READ_MEDIA_IMAGES"/>
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
  <uses-permission android:name="android.permission.ACCESS_WIFI_STATE"/>
  <uses-permission android:name="android.permission.WAKE_LOCK"/>
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
  ```

### Phase 2: Dependencies

- [ ] Add to `pubspec.yaml`:
  ```yaml
  dependencies:
    flutter_bloc: ^8.x
    dio: ^5.x
    shared_preferences: ^2.x
    firebase_core: ^2.x
    firebase_messaging: ^14.x
    firebase_remote_config: ^4.x
    objectbox: ^2.x
    device_info_plus: ^9.x
    package_info_plus: ^4.x
    permission_handler: ^11.x
    flutter_keyboard_visibility: ^5.x
    fluttertoast: ^8.x
    url_launcher: ^6.x
    path_provider: ^2.x
    # Also used but for non-auth features:
    # audioplayers, file_picker, flutter_pdfview, image_picker
  ```
- [ ] Run `flutter pub get`
- [ ] Run `dart run build_runner build` (for ObjectBox code generation)

### Phase 3: Data Layer

- [ ] Create `AuthTokenResponse` model:
  ```dart
  class AuthTokenResponse {
    final String accessToken;
    final String refreshToken;
    final int expiresIn;
    final String tokenType;
    final String scope;
    // fromJson, toJson
  }
  ```
- [ ] Create `ErrorResponseModel`:
  ```dart
  class ErrorResponseModel {
    final String error;
    final String message;
    // fromJson
  }
  ```
- [ ] Create `UserFacility` model:
  ```dart
  class UserFacility {
    final String id;
    final String name;
    final String unit;
    final bool isDefault;
    // fromJson
  }
  ```
- [ ] Create `AuthRepository` with methods:
  - `Future<Map<String, dynamic>> fetchDomain(String orgCode)`
  - `Future<AuthTokenResponse> login(String username, String password)`
  - `Future<AuthTokenResponse> refreshToken(String refreshToken)`
  - `Future<void> registerDevice(DeviceSession session)`
  - `Future<void> deregisterDevice(String deviceId)`
  - `Future<List<UserFacility>> fetchFacilities()`

### Phase 4: Dio Setup

- [ ] Create `DioFactory` that builds a `Dio` instance with:
  - Base URL from SharedPreferences
  - 30-second timeouts
  - JSON content type
- [ ] Implement `AuthInterceptor` (see Section 5 for full code):
  - Request: attach `Authorization` header + facility header
  - Error: catch 401, attempt refresh, retry OR force logout
- [ ] Wire interceptor into Dio instance

### Phase 5: BLoCs

- [ ] Implement `ClientSetupBloc` (see Section 3.1)
  - Events: `FetchDomain`
  - States: `Initial`, `Loading`, `Success`, `Error`
- [ ] Implement `LoginBloc` (see Section 3.2)
  - Events: `LoginSubmitted`
  - States: `Initial`, `Loading`, `Success`, `Failure`
- [ ] Implement `AuthenticationBloc` (see Section 3.3)
  - Events: `LoggedIn`, `LoggedOut`, `TokenExpiring`, `CheckTokenValidity`, `SessionExpired`
  - States: `Unauthenticated`, `Authenticated`, `TokenRefreshing`, `SessionExpired`
  - Include the `Completer`-based refresh lock

### Phase 6: Screens

- [ ] Build `ClientSetupScreen`
  - Text field for org code
  - CONTINUE button
  - BlocListener for navigation on success
  - BlocBuilder for loading/error states
- [ ] Build `LoginScreen`
  - Username + password fields
  - Password visibility toggle
  - LOGIN button
  - BlocListener for navigation on success
  - BlocBuilder for loading/error SnackBars
- [ ] Build app root with routing logic (see Edge Case 1)

### Phase 7: Post-Login Pipeline

- [ ] Store tokens + user info in SharedPreferences (immediately after login)
- [ ] Register FCM device session (fire-and-forget, log errors)
- [ ] Initialize ACS chat via method channel (fire-and-forget, log errors)
- [ ] Fetch user facilities (must complete before home screen)
- [ ] Store default facility in SharedPreferences
- [ ] Navigate to Home

### Phase 8: Token Management

- [ ] Implement periodic token check (every 5 min via `Timer.periodic`)
- [ ] Implement app lifecycle observer for token check on resume
- [ ] Implement concurrent refresh protection with `Completer`
- [ ] Test: let token expire, verify automatic refresh works
- [ ] Test: let both tokens expire, verify forced logout works

### Phase 9: Logout

- [ ] Implement logout sequence in order:
  1. `FlutterAcsPlugin.unsubscribeACS()`
  2. `DELETE /api/device-session/{deviceId}`
  3. Clear SharedPreferences (preserve `client_baseUrl`)
  4. Clear ObjectBox database
  5. `Navigator.pushNamedAndRemoveUntil(context, '/', (route) => false)`

### Phase 10: Firebase

- [ ] Add `google-services.json` for each flavor
- [ ] Initialize Firebase in `main()` before `runApp()`
- [ ] Set up FCM token registration + refresh listener
- [ ] Set up Remote Config with defaults + fetch
- [ ] Request POST_NOTIFICATIONS permission on Android 13+

### Phase 11: ACS Chat Plugin

- [ ] Create `flutter_acs` method channel plugin (native Android side in Java)
- [ ] Implement `initACS`, `resubscribeToACS`, `unsubscribeACS`
- [ ] Implement event forwarding: `chatMessageReceived`, etc.
- [ ] Wire up reconnection on network restore

### Phase 12: Multi-Facility

- [ ] Implement facility selector UI
- [ ] On facility switch:
  - Update `logged-in-unit` in SharedPreferences
  - Clear facility-specific ObjectBox data
  - Reload home screen
- [ ] Verify all API calls include the correct facility header

### Phase 13: Testing

- [ ] Unit test: `ClientSetupBloc` (success + error states)
- [ ] Unit test: `LoginBloc` (success + each error type)
- [ ] Unit test: `AuthenticationBloc` (refresh flow + concurrent refresh + forced logout)
- [ ] Unit test: `AuthInterceptor` (401 retry + logout on refresh failure)
- [ ] Integration test: full login flow from client setup to home
- [ ] Integration test: token refresh while app is active
- [ ] Integration test: app resume after token expiry
- [ ] Manual test: kill app during login, reopen
- [ ] Manual test: login on two devices, verify first gets logged out
- [ ] Manual test: turn off network during token refresh, turn back on

---

## Appendix: Registered Flutter Plugins (Full List)

These are all 17 plugins registered in `GeneratedPluginRegistrant.java`. The auth flow directly uses a subset of these.

| Plugin                          | Used in Auth Flow | Purpose                          |
|---------------------------------|-------------------|----------------------------------|
| `firebase_core`                | YES               | Firebase initialization          |
| `firebase_messaging`           | YES               | FCM push token                   |
| `firebase_remote_config`       | YES               | Feature flags                    |
| `flutter_acs` (custom)         | YES               | ACS chat init/cleanup            |
| `shared_preferences_android`   | YES               | Token + user storage             |
| `device_info_plus`             | YES               | Device ID for FCM registration   |
| `package_info_plus`            | Indirect          | App version display              |
| `flutter_keyboard_visibility`  | Indirect          | Login screen keyboard handling   |
| `fluttertoast`                 | Indirect          | Error messages                   |
| `permission_handler_android`   | Indirect          | Notification permission          |
| `path_provider_android`        | Indirect          | ObjectBox database path          |
| `objectbox_flutter_libs`       | Indirect          | Local database (cleared on logout)|
| `audioplayers_android`         | NO                | Non-auth feature                 |
| `file_picker`                  | NO                | Non-auth feature                 |
| `flutter_pdfview`              | NO                | Non-auth feature                 |
| `flutter_plugin_android_lifecycle` | NO            | Android lifecycle                |
| `image_picker_android`         | NO                | Non-auth feature                 |
| `url_launcher_android`         | NO                | Non-auth feature                 |

---

*Document reconstructed from binary analysis of AHAM v2.6.1 (Build 10513). API contracts are inferred from observed network behavior and decompiled Java plugin code. Actual server responses may contain additional fields not documented here.*
