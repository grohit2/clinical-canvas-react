# AHAM - Platform & Settings

This document covers everything outside the four core modules: how staff log in, how the app decides what to show on startup, how facilities and languages are selected, how notifications arrive, what happens when things go wrong, and how privacy and security protect everyone involved.

---

## Table of Contents

1. [App Startup Flow](#app-startup-flow)
2. [Authentication & Login](#authentication--login)
3. [Multi-Facility Support](#multi-facility-support)
4. [User Profile & Preferences](#user-profile--preferences)
5. [8 Language Support](#8-language-support)
6. [Home Dashboard](#home-dashboard)
7. [Push Notifications](#push-notifications)
8. [Remote Configuration](#remote-configuration)
9. [FAQ](#faq)
10. [About Us & App Info](#about-us--app-info)
11. [Privacy Policy & Security](#privacy-policy--security)
12. [Error Handling](#error-handling)
13. [Offline Support](#offline-support)

---

## App Startup Flow

When a staff member taps the AHAM icon, the app goes through a multi-step startup sequence before showing any screen. The user sees a splash screen during this time.

```
+------------------------------------------------------------------+
|                                                                    |
|                     AHAM STARTUP SEQUENCE                          |
|                                                                    |
|  Tap app icon                                                      |
|       |                                                            |
|       v                                                            |
|  +------------------+                                              |
|  | Splash Screen    |  (Narayana Health logo + loading indicator)  |
|  +--------+---------+                                              |
|           |                                                        |
|           v                                                        |
|  +------------------+                                              |
|  | Initialize       |  Firebase services start up silently:       |
|  | Firebase         |  - Push notification registration           |
|  |                  |  - Feature flag fetch (Remote Config)        |
|  +--------+---------+                                              |
|           |                                                        |
|           v                                                        |
|  +------------------+     NO      +----------------------+         |
|  | Saved client     +------------>| Client Setup Screen  |         |
|  | config exists?   |             | (first-time only)    |         |
|  +--------+---------+             +----------+-----------+         |
|           | YES                              |                     |
|           v                                  | Staff enters org    |
|  +------------------+                        | identifier          |
|  | Configure base   |<----------------------+                     |
|  | connection       |                                              |
|  +--------+---------+                                              |
|           |                                                        |
|           v                                                        |
|  +------------------+                                              |
|  | Initialize       |  Local database opens for cached data       |
|  | local database   |  (chat history, offline content)             |
|  +--------+---------+                                              |
|           |                                                        |
|           v                                                        |
|  +------------------+     NO      +----------------------+         |
|  | Valid session?   +------------>| Login Screen          |         |
|  | (token not       |             |                      |         |
|  |  expired)        |             +----------------------+         |
|  +--------+---------+                                              |
|           | YES                                                    |
|           v                                                        |
|  +------------------+                                              |
|  | Home Dashboard   |                                              |
|  +------------------+                                              |
|                                                                    |
+------------------------------------------------------------------+
```

### What the User Experiences

| Scenario | What Happens | Time |
|----------|-------------|------|
| **First launch ever** | Splash > Client Setup > Login > Facility Selection > Home | ~15 seconds |
| **Returning user (session valid)** | Splash > Home (skips login entirely) | ~3 seconds |
| **Returning user (session expired)** | Splash > Login > Home | ~8 seconds |
| **App updated** | Same as returning user; client config is preserved across updates | Varies |

### Client Setup (First Time Only)

On the very first launch, before the login screen ever appears, the user must identify their organization. This is a one-time step.

```
+--------------------------------------------------+
|                                                   |
|  CLIENT SETUP                                     |
|                                                   |
|  Enter your organization code to get started.     |
|                                                   |
|  +----------------------------------------------+ |
|  | Organization Code                             | |
|  | [                                          ]  | |
|  +----------------------------------------------+ |
|                                                   |
|  This code is provided by your IT department.     |
|                                                   |
|           [       VERIFY       ]                  |
|                                                   |
+--------------------------------------------------+
```

| Outcome | What the User Sees |
|---------|--------------------|
| **Valid code** | Loading spinner, then automatically proceeds to Login screen |
| **Invalid code** | "Domain not found" error with option to retry |
| **No network** | "Unable to connect to server" error with option to retry |

Once verified, the organization code is saved and never asked again (even after logout or app updates).

---

## Authentication & Login

Staff members log into AHAM using their Narayana Health employee credentials -- the same username and password they use for other hospital systems.

### Login Screen

```
+--------------------------------------------------+
|                                                   |
|              [Narayana Health Logo]                |
|                                                   |
|                    AHAM                            |
|                                                   |
|  +----------------------------------------------+ |
|  | Username                                      | |
|  | [                                          ]  | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | Password                                      | |
|  | [                                    ]  [eye] | |
|  +----------------------------------------------+ |
|                                                   |
|           [        LOG IN        ]                |
|                                                   |
|                                                   |
+--------------------------------------------------+
```

- **Username** is typically the employee ID or hospital email
- **Password** field has a show/hide toggle (eye icon) for convenience
- No "Remember Me" checkbox -- session persistence is handled automatically (see Token Lifecycle below)
- No password strength indicator on the login screen
- No "Forgot Password" link -- password resets are handled through the hospital's IT portal

### Login Flow

```
  Staff enters        Tap
  credentials         "Log In"
       |                 |
       v                 v
  +------------------+  +------------------+
  | Username field   |  | Validate &       |
  | Password field   |  | send to server   |
  | (eye toggle)     |  |                  |
  +------------------+  +--------+---------+
                                  |
                    +-------------+-------------+
                    |                           |
                    v                           v
           +-------+--------+        +--------+--------+
           |    SUCCESS      |        |    FAILURE       |
           |                 |        |                  |
           | Tokens stored   |        | Error message    |
           | on device       |        | shown (see       |
           |                 |        | table below)     |
           +-------+---------+        +-----------------+
                   |
                   v
           +-------+--------+
           | Fetch user's   |
           | organizations  |
           +-------+--------+
                   |
          +--------+--------+
          |                 |
          v                 v
  +-------+------+  +------+--------+
  | ONE facility |  | MULTIPLE      |
  |              |  | facilities    |
  | Go straight  |  |               |
  | to Home      |  | Show facility |
  |              |  | selection     |
  +--------------+  +---------------+
```

### Login Error Messages

When login fails, the user sees one of these messages:

| Error | Message Shown | What It Means |
|-------|--------------|---------------|
| **Wrong credentials** | "Failed to sign in! Invalid credentials" | Username or password is incorrect |
| **Password expired** | "Password has expired" | Must change password through IT portal first |
| **Account locked** | "Account has been locked" | Too many failed attempts; contact IT |
| **Account disabled** | "Account has been disabled" | Account deactivated by administrator |
| **Server unreachable** | "Unable to connect to server" | No network or server is down |
| **Invalid setup** | "Invalid client configuration" | Client setup is corrupted; re-enter org code |

### Token Lifecycle (Session Management)

After a successful login, the server gives the app two tokens. This is invisible to the user but determines when they need to log in again.

```
+------------------------------------------------------------------+
|                                                                    |
|                     TOKEN LIFECYCLE                                 |
|                                                                    |
|  LOGIN                                                             |
|    |                                                               |
|    v                                                               |
|  +----------------------+                                          |
|  | Server issues:       |                                          |
|  |  - Access Token      |  (short-lived, minutes to hours)         |
|  |  - Refresh Token     |  (long-lived, days)                      |
|  +----------+-----------+                                          |
|             |                                                      |
|             v                                                      |
|  +----------------------+                                          |
|  | Normal app usage     |  Access token sent with every request    |
|  +----------+-----------+                                          |
|             |                                                      |
|             v  Access token expires                                |
|  +----------------------+                                          |
|  | Auto-refresh         |  App silently gets a new access token    |
|  | (invisible to user)  |  using the refresh token                 |
|  +----------+-----------+                                          |
|             |                                                      |
|        +----+----+                                                 |
|        |         |                                                 |
|        v         v                                                 |
|   Refresh     Refresh                                              |
|   succeeds    fails                                                |
|      |           |                                                 |
|      v           v                                                 |
|   Continue    +-------------------+                                |
|   using app   | "Session expired. |                                |
|               |  Please login     |                                |
|               |  again"           |                                |
|               +--------+----------+                                |
|                        |                                           |
|                        v                                           |
|                  Login Screen                                      |
|                                                                    |
+------------------------------------------------------------------+
```

### What This Means for Users

| Scenario | User Experience |
|----------|----------------|
| **Used app yesterday, open it today** | Goes straight to Home (session still valid) |
| **Used app last week** | May need to log in again (refresh token expired) |
| **App open all day** | Access token refreshes silently in the background; no interruption |
| **Internet drops during refresh** | "Session expired" message; must log in when back online |

### Password Expiry

Narayana Health enforces periodic password changes. When a staff member's password has expired:

```
  Staff tries to log in
         |
         v
  +------------------+
  | Server says:     |
  | "Password has    |
  |  expired"        |
  +--------+---------+
           |
           v
  +------------------+
  | Error message:   |
  | "Password has    |
  |  expired"        |
  |                  |
  | (No in-app       |
  |  password change |
  |  is available)   |
  +--------+---------+
           |
           v
  Staff must change password through
  the hospital's IT web portal, then
  return to AHAM and log in with the
  new password.
```

### Logout

Logging out is available from the side navigation menu.

```
+--------------------------------------------------+
|  "Are you sure you want to log out?"              |
|                                                   |
|  You will need to enter your credentials          |
|  again to access AHAM.                            |
|                                                   |
|        [ Cancel ]        [ Log Out ]              |
+--------------------------------------------------+
```

What happens when staff tap "Log Out":

1. Session tokens are cleared from the device
2. Push notification registration is removed
3. Chat connections are closed
4. App returns to the Login screen
5. Cached data (chat history) is retained locally but not accessible without logging in again

---

## Multi-Facility Support

Narayana Health operates hospitals and clinics across India and internationally. A single staff member may have access to multiple facilities. AHAM supports seamless switching between them.

### Organization Selection (After Login)

If a staff member has access to more than one facility, they choose which one to work in immediately after logging in.

```
+--------------------------------------------------+
|                                                   |
|  SELECT YOUR ORGANIZATION                         |
|                                                   |
|  You have access to the following facilities:     |
|                                                   |
|  +----------------------------------------------+ |
|  | NH Bangalore - Health City                    | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | NH Mysuru                                     | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | NH Anantapur                                  | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | SRCC Children's Hospital, Mumbai              | |
|  +----------------------------------------------+ |
|                                                   |
|  Tap a facility to continue                       |
|                                                   |
+--------------------------------------------------+
```

**Key behaviors:**
- The list shows **only** facilities the staff member has been granted access to
- Staff with access to just one facility skip this screen entirely
- The selected facility is remembered for next time

### Unit / HSC Switching

Within a single facility, there may be multiple units (departments, buildings, floors -- referred to internally as "HSCs"). Staff can switch units from the Preferences screen without logging out.

```
+--------------------------------------------------+
|                                                   |
|  SELECT UNIT                                      |
|                                                   |
|  NH Bangalore - Health City                       |
|                                                   |
|  +----------------------------------------------+ |
|  | Cardiology Unit - Block A               [*]  | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | Oncology Unit - Block B                 [ ]   | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | General Medicine - Block C              [ ]   | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | Orthopedics - Block D                   [ ]   | |
|  +----------------------------------------------+ |
|                                                   |
+--------------------------------------------------+
```

### What Changes When You Switch

| Data | Behavior on Switch |
|------|--------------------|
| **Task queues** | Refreshed to show only tasks for the new unit |
| **Chat conversations** | Refreshed to show conversations for the new unit |
| **Camp list** | Refreshed to show camps for the new unit |
| **Billing items** | Refreshed to show financial documents for the new unit |
| **Header display** | Updated to show the new unit name |

### Multi-Facility User Journey

> **Sunita** is a billing administrator who works across two Narayana Health facilities. In the morning, she reviews invoice approvals at NH Bangalore. After lunch, she needs to check on tasks at NH Mysuru.
>
> 1. Sunita opens AHAM (already logged in from this morning)
> 2. She sees her Bangalore tasks on the Home screen
> 3. She taps the side menu and goes to **Preferences**
> 4. She taps **Current Facility** and selects **NH Mysuru**
> 5. The app refreshes -- all task queues, chats, and billing items now show Mysuru data
> 6. She taps **Switch Unit** and picks "Finance Department"
> 7. Her task queue narrows to finance-related tasks at Mysuru
>
> At no point did she need to log out and log back in.

---

## User Profile & Preferences

### User Profile

The user profile is loaded after login and contains the staff member's identity within the hospital system.

```
+--------------------------------------------------+
|  USER PROFILE                                     |
|                                                   |
|  +----------------------------------------------+ |
|  |                                               | |
|  |  [Avatar]                                     | |
|  |                                               | |
|  |  Name:         Dr. Sunita Patel               | |
|  |  Employee No:  NH-EMP-4521                    | |
|  |  Login:        sunita.patel                   | |
|  |  Designation:  Senior Billing Admin           | |
|  |  Department:   Finance & Billing              | |
|  |  Mobile:       +91 98XXX XXXXX                | |
|  |  Status:       Active                         | |
|  |                                               | |
|  +----------------------------------------------+ |
|                                                   |
+--------------------------------------------------+
```

Profile information is read-only in the app -- changes must be made through the hospital's HR or IT systems.

### Preferences Screen

The Preferences screen lets staff customize their working context.

```
+--------------------------------------------------+
|  PREFERENCES                                      |
|                                                   |
|  Current Facility                                 |
|  +----------------------------------------------+ |
|  | NH Bangalore - Health City               [>]  | |
|  +----------------------------------------------+ |
|                                                   |
|  Switch Unit                                      |
|  +----------------------------------------------+ |
|  | Cardiology Unit - Block A                [>]  | |
|  +----------------------------------------------+ |
|  (Changing unit filters your task queue to show   |
|   only tasks for the selected unit)               |
|                                                   |
|  Language                                         |
|  +----------------------------------------------+ |
|  | English                                  [>]  | |
|  +----------------------------------------------+ |
|                                                   |
|  Notifications                                    |
|  +----------------------------------------------+ |
|  | Manage notification preferences          [>]  | |
|  +----------------------------------------------+ |
|                                                   |
+--------------------------------------------------+
```

### Preference Persistence

| Preference | Where It's Saved | When It Applies |
|-----------|------------------|-----------------|
| **Selected facility** | Device + server | Immediately; all data refreshes |
| **Selected unit** | Device + server | Immediately; task queue refreshes |
| **Language** | Device + server | Immediately; all UI text changes |
| **Notification settings** | Device + server | On next notification |
| **Default facility** | Server | Used on next login to skip facility selection |

Preferences sync to the server, so if a staff member logs in on a different device, their language and default facility carry over.

---

## 8 Language Support

AHAM supports 8 Indian languages to serve Narayana Health's staff across different regions.

### Supported Languages

| # | Language | Code | Script | Primary Region |
|---|----------|------|--------|----------------|
| 1 | **English** | en | Latin | All facilities (default) |
| 2 | **Bengali** | bn | Bengali | Eastern India (Kolkata, etc.) |
| 3 | **Gujarati** | gu | Gujarati | Western India (Ahmedabad, etc.) |
| 4 | **Hindi** | hi | Devanagari | North India and general |
| 5 | **Kannada** | kn | Kannada | Karnataka (Bangalore HQ) |
| 6 | **Marathi** | mr | Devanagari | Maharashtra (Mumbai, Pune) |
| 7 | **Tamil** | ta | Tamil | Tamil Nadu (Chennai, etc.) |
| 8 | **Telugu** | te | Telugu | Andhra Pradesh & Telangana |

### Language Selection

```
+--------------------------------------------------+
|  SELECT LANGUAGE                                  |
|                                                   |
|  +----------------------------------------------+ |
|  | English                                 [*]  | |
|  +----------------------------------------------+ |
|  | Bengali / bangla                        [ ]  | |
|  +----------------------------------------------+ |
|  | Gujarati / gujaraatee                   [ ]  | |
|  +----------------------------------------------+ |
|  | Hindi / hindee                          [ ]  | |
|  +----------------------------------------------+ |
|  | Kannada / kannada                       [ ]  | |
|  +----------------------------------------------+ |
|  | Marathi / maraathee                     [ ]  | |
|  +----------------------------------------------+ |
|  | Tamil / tamil                           [ ]  | |
|  +----------------------------------------------+ |
|  | Telugu / telugu                         [ ]  | |
|  +----------------------------------------------+ |
|                                                   |
+--------------------------------------------------+
```

### What Gets Translated

| Element | Translated? | Notes |
|---------|------------|-------|
| **Menu items & navigation** | Yes | All UI labels change |
| **Button text** (Approve, Reject, etc.) | Yes | Action buttons in all 8 languages |
| **Error messages** | Yes | Validation and system messages |
| **FAQ content** | Yes | Questions and answers |
| **Patient names & data** | No | Patient data stays as entered |
| **Task financial amounts** | No | Numbers displayed as-is |
| **Chat messages** | No | Messages shown in original language |

### Language Change User Journey

> **Ramesh** is a billing clerk at NH Bangalore who is more comfortable reading Kannada than English.
>
> 1. Ramesh opens AHAM and navigates to **Preferences**
> 2. He taps **Language** and selects **Kannada**
> 3. The entire app interface immediately switches to Kannada script
> 4. All buttons, menus, labels, and error messages now appear in Kannada
> 5. When he views a task, the patient name and amounts remain unchanged (data is not translated)
> 6. His language preference is saved -- next time he opens the app, it will be in Kannada

---

## Home Dashboard

After login and facility selection, staff see the home dashboard -- the central hub of AHAM.

```
+--------------------------------------------------+
|                                                   |
|  [Narayana Health Logo]                           |
|                                                   |
|  Welcome, Sunita                                  |
|  NH Bangalore - Health City                       |
|  Cardiology Unit - Block A                        |
|                                                   |
|  +---------------------+  +---------------------+ |
|  |                     |  |                     | |
|  |  TASK MANAGEMENT    |  |  CONVERSATIONS      | |
|  |                     |  |                     | |
|  |  12 pending tasks   |  |  3 unread chats     | |
|  |                     |  |                     | |
|  +---------------------+  +---------------------+ |
|                                                   |
|  +---------------------+  +---------------------+ |
|  |                     |  |                     | |
|  |  OUTREACH CAMPS     |  |  BILLING &          | |
|  |                     |  |  FINANCE            | |
|  |  2 upcoming camps   |  |                     | |
|  |                     |  |  5 pending reviews   | |
|  +---------------------+  +---------------------+ |
|                                                   |
+--------------------------------------------------+
```

### Side Navigation Menu

Accessible via the hamburger menu icon:

```
+--------------------------------------------------+
|  +----------------------------------------------+ |
|  |  [Avatar]  Dr. Sunita Patel                  | |
|  |            Senior Billing Admin              | |
|  |            NH Bangalore                      | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  |   Home                                       | |
|  +----------------------------------------------+ |
|  |   Preferences                                | |
|  +----------------------------------------------+ |
|  |   FAQ                                        | |
|  +----------------------------------------------+ |
|  |   About Us                                   | |
|  +----------------------------------------------+ |
|  |   Privacy Policy                             | |
|  +----------------------------------------------+ |
|  |   Logout                                     | |
|  +----------------------------------------------+ |
|                                                   |
+--------------------------------------------------+
```

Each module card on the dashboard shows a summary count (pending tasks, unread chats, etc.) so staff can quickly see where attention is needed.

---

## Push Notifications

AHAM uses Firebase Cloud Messaging (FCM) to keep staff informed even when the app is not in the foreground. Notifications are registered automatically -- no setup required from the user.

### Notification Types

| Notification Type | When It Fires | Example |
|-------------------|---------------|---------|
| **New task available** | A new task appears in your Group Tasks | "New Invoice Approval - Rs 45,200" |
| **Task assigned to you** | A supervisor assigns a task directly | "Invoice task assigned to you by Dr. Anita" |
| **Chat message received** | A patient sends a message in your assigned conversation | "Rajesh Kumar: When will my reports be ready?" |
| **New unassigned chat** | A patient starts a new conversation nobody has picked up | "New unassigned conversation from Meena Devi" |
| **Camp reminder** | A camp you are coordinating is starting soon | "Anantapur Health Camp starts tomorrow" |
| **System alert** | Important system-level message | "Scheduled maintenance tonight 11 PM - 2 AM" |

### Notification Behavior by App State

```
+------------------------------------------------------------------+
|                                                                    |
|                NOTIFICATION DELIVERY                               |
|                                                                    |
|  +------------------+   +------------------+   +----------------+ |
|  | APP IN           |   | APP IN           |   | APP            | |
|  | FOREGROUND       |   | BACKGROUND       |   | CLOSED         | |
|  |                  |   |                  |   |                | |
|  | In-app banner    |   | System           |   | System         | |
|  | or toast         |   | notification     |   | notification   | |
|  | appears at top   |   | in tray          |   | in tray        | |
|  | of screen        |   |                  |   |                | |
|  |                  |   | Tap to open      |   | Tap to open    | |
|  | Tap to navigate  |   | relevant screen  |   | app & navigate | |
|  | to relevant      |   |                  |   | to relevant    | |
|  | screen           |   |                  |   | screen         | |
|  +------------------+   +------------------+   +----------------+ |
|                                                                    |
+------------------------------------------------------------------+
```

### Notification Registration Flow

```
  Staff logs in
       |
       v
  +------------------+
  | Device generates  |
  | a unique push     |
  | notification ID   |
  +--------+---------+
           |
           v
  +------------------+
  | ID sent to       |
  | server along     |
  | with:            |
  |  - User ID       |
  |  - Device type   |
  |    (Android/iOS) |
  |  - App version   |
  +--------+---------+
           |
           v
  Server now knows how to
  reach this user on this device
```

- Registration happens automatically on every login
- If the notification ID changes (e.g., app reinstall), it is updated automatically
- On logout, the notification registration is cleared so the user stops receiving push notifications on that device

### Managing Notifications

Staff can control notifications through their device's system settings:

```
  Device Settings > Apps > AHAM > Notifications
       |
       +-- All notifications: ON / OFF
       +-- Sound: ON / OFF
       +-- Vibration: ON / OFF
       +-- Show on lock screen: ON / OFF
```

There is no in-app notification settings screen -- the app defers to the operating system's notification controls.

---

## Remote Configuration

AHAM uses feature flags to control certain behaviors without requiring an app update. These flags are fetched from the server when the app starts.

### Known Feature Flags

| Flag | What It Controls | When OFF | When ON |
|------|-----------------|----------|---------|
| **Aadhaar Registration** | Whether the Aadhaar KYC section appears in patient registration | Aadhaar section hidden | Aadhaar front/back photo capture available |

Feature flags allow Narayana Health to:
- Roll out new features gradually across facilities
- Disable features that are not yet approved in certain jurisdictions
- Turn off features quickly if issues are discovered

Staff do not see or interact with feature flags directly -- the app simply shows or hides functionality based on the current flag values.

---

## FAQ

The app includes a built-in FAQ section with answers to the most common questions about task management. All FAQ content is available offline (it is bundled with the app, not fetched from a server).

### FAQ Screen

```
+--------------------------------------------------+
|  FREQUENTLY ASKED QUESTIONS                       |
|                                                   |
|  +----------------------------------------------+ |
|  | Q: What are Tasks?                       [v]  | |
|  |                                               | |
|  | A: Tasks are approval items that flow         | |
|  | through AHAM. Every financial or clinical      | |
|  | action that needs a second pair of eyes        | |
|  | becomes a task -- invoices, refunds,           | |
|  | discounts, high-value medications, and more.   | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | Q: How to claim a task?                  [v]  | |
|  |                                               | |
|  | A: Go to Group Tasks, find the task you        | |
|  | want to work on, and tap it. Then tap the      | |
|  | "Claim" button. The task moves to your         | |
|  | My Tasks queue.                                | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | Q: How to approve a task?                [v]  | |
|  |                                               | |
|  | A: First claim the task, then review the       | |
|  | details. If everything looks correct, tap      | |
|  | "Approve." The task is processed and           | |
|  | removed from your queue.                       | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | Q: How to reject a task?                 [v]  | |
|  |                                               | |
|  | A: Claim the task, review it, and tap          | |
|  | "Reject." You must enter a reason for          | |
|  | the rejection. The task is closed with         | |
|  | your remarks recorded.                         | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | Q: How to revert a task?                 [v]  | |
|  |                                               | |
|  | A: Revert releases your claim on a task and    | |
|  | sends it back to the Group Tasks queue.        | |
|  | Another team member can then claim it.         | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | Q: What is the difference between My Tasks    | |
|  |    and Group Tasks?                      [v]  | |
|  |                                               | |
|  | A: My Tasks shows tasks you have claimed       | |
|  | and are working on. Group Tasks shows           | |
|  | unclaimed tasks available to your team.         | |
|  | Claim a group task to move it to My Tasks.     | |
|  +----------------------------------------------+ |
|                                                   |
+--------------------------------------------------+
```

Each question is expandable -- tap the arrow to reveal the answer, tap again to collapse. The FAQ is organized into categories for easy browsing.

### FAQ Summary

| # | Question | Category |
|---|----------|----------|
| 1 | "What are Tasks?" | Tasks |
| 2 | "How to claim a task?" | Tasks |
| 3 | "How to approve a task?" | Tasks |
| 4 | "How to reject a task?" | Tasks |
| 5 | "How to revert a task?" | Tasks |
| 6 | "What is the difference between My Tasks and Group Tasks?" | Tasks |

---

## About Us & App Info

### About Us Screen

```
+--------------------------------------------------+
|  ABOUT US                                         |
|                                                   |
|  AHAM is a hospital administration workflow       |
|  application developed by Narayana Health.        |
|                                                   |
|  "AHAM enables the administration staff by        |
|   making the workflow process easier and          |
|   eliminates delay or lag in business             |
|   processes."                                     |
|                                                   |
|  Version: [App Version]                           |
|  Build: [Build Number]                            |
|                                                   |
+--------------------------------------------------+
```

Accessible from the side navigation menu. Displays the app version and build number, which is useful for IT support when troubleshooting.

### What's New

After app updates, staff may see a "What's New" section highlighting recent changes and improvements, helping them discover new features without external communication.

---

## Privacy Policy & Security

AHAM handles sensitive patient health records, financial data, and identity documents. Privacy and security are built into every layer of the app.

### Privacy Policy Screen

```
+--------------------------------------------------+
|  PRIVACY POLICY                                   |
|                                                   |
|  +----------------------------------------------+ |
|  |                                               | |
|  |  [Full privacy policy text displayed          | |
|  |   in a scrollable web view]                   | |
|  |                                               | |
|  |  Jurisdiction: Cayman Islands                 | |
|  |  Governing Law: Data Protection Act 2021      | |
|  |  DPO Contact: dpo@healthcity.ky               | |
|  |                                               | |
|  +----------------------------------------------+ |
|                                                   |
+--------------------------------------------------+
```

Accessible from the side navigation menu. The policy is displayed as a web page within the app.

### Data Collection Summary

| What Data | Why It's Collected | Who Can See It |
|-----------|-------------------|----------------|
| Staff name, employee ID, department | Login and access control | Staff themselves, IT admins |
| Patient name, DOB, gender | Patient identification during registration | Authorized staff at the facility |
| Mobile number, email | Contact and notifications | Authorized staff |
| Aadhaar number + images | KYC verification (when enabled) | Authorized staff during registration |
| Patient address (full hierarchy) | Medical records | Authorized staff |
| Medical records | Treatment documentation | Authorized clinical staff |
| Device information | Push notification delivery | System only (not visible to users) |
| Usage analytics | App improvement | Aggregated; not tied to individuals |

### Data Subject Rights

Under the Data Protection Act 2021 (Cayman Islands), patients and staff have the following rights:

- Right to access their personal data
- Right to correct inaccurate data
- Right to erasure ("right to be forgotten")
- Right to restrict how their data is processed
- Right to data portability
- Right to object to processing
- Rights related to automated decision-making

Contact: **dpo@healthcity.ky** for any data protection inquiries.

### Security Features

```
+------------------------------------------------------------------+
|                                                                    |
|                     SECURITY LAYERS                                |
|                                                                    |
|  +------------------------------------------------------------+   |
|  |  TRANSPORT SECURITY                                         |   |
|  |  All data travels over encrypted connections (HTTPS/TLS)    |   |
|  +------------------------------------------------------------+   |
|                                                                    |
|  +------------------------------------------------------------+   |
|  |  AUTHENTICATION                                             |   |
|  |  Every request carries a secure token that proves           |   |
|  |  the user's identity. Tokens expire and refresh             |   |
|  |  automatically.                                             |   |
|  +------------------------------------------------------------+   |
|                                                                    |
|  +------------------------------------------------------------+   |
|  |  ENCRYPTED LOCAL STORAGE                                    |   |
|  |  Session tokens stored in platform secure storage           |   |
|  |  (Android Keystore / iOS Keychain). Chat database           |   |
|  |  encrypted with AES-256 at rest.                            |   |
|  +------------------------------------------------------------+   |
|                                                                    |
|  +------------------------------------------------------------+   |
|  |  AUDIT LOGGING                                              |   |
|  |  Every significant action is recorded server-side           |   |
|  |  with user identity, timestamp, and facility context.       |   |
|  +------------------------------------------------------------+   |
|                                                                    |
+------------------------------------------------------------------+
```

### Audit Trail

Every significant action in AHAM is logged server-side for compliance and accountability:

| Action Logged | Data Captured |
|---------------|---------------|
| Login / Logout | User, timestamp, device, facility |
| Task claimed | User, task ID, timestamp |
| Task approved / rejected / reverted | User, task ID, action, reason (if rejection), timestamp |
| Chat assigned / delegated / closed | User, conversation ID, action, timestamp |
| Patient registered | User, patient details, camp ID, timestamp |
| Aadhaar scanned | User, timestamp (Aadhaar number is masked in logs) |
| Document uploaded / downloaded | User, document ID, timestamp |

These logs support compliance audits and help resolve disputes about who did what and when.

### Data Retention

| Data Type | Retention Policy |
|-----------|-----------------|
| **Medical records** | Retained for the legally required period under Cayman Islands medical law |
| **Chat messages** | Retained until periodic cleanup runs; old messages are automatically purged |
| **Session data** | Cleared immediately on logout |
| **Push notification tokens** | Cleared on logout, re-registered on next login |
| **File attachments** | Retained until associated messages are removed |
| **Audit logs** | Retained per hospital compliance requirements |

---

## Error Handling

AHAM is designed to show clear, actionable messages when something goes wrong. Errors appear as brief messages (banners or pop-ups) at the bottom of the screen.

### Error Categories and User-Facing Messages

#### Network Errors

These appear when the device loses connectivity or the server is slow to respond.

```
+--------------------------------------------------+
|                                                   |
|  [Current screen content]                         |
|                                                   |
|                                                   |
|  +----------------------------------------------+ |
|  | ! Unable to connect to server.               | |
|  |   Check your network connection.             | |
|  +----------------------------------------------+ |
|                                                   |
+--------------------------------------------------+
```

| Situation | Message Shown |
|-----------|--------------|
| **No internet** | "Unable to connect to server. Check your network" |
| **Server not responding** | "Connection timed out. Please try again" |
| **Request took too long** | "Request timed out. Please try again" |
| **Server slow to respond** | "Server response timed out" |
| **Request cancelled** | "Request was cancelled" |
| **Server error** | "Internal server error. Please try again later" |
| **Access denied** | "You do not have permission to perform this action" |
| **Resource missing** | "Resource not found" |
| **Unknown issue** | "An unexpected error occurred" |

#### Authentication Errors

| Situation | Message Shown | What to Do |
|-----------|--------------|------------|
| Wrong credentials | "Failed to sign in! Invalid credentials" | Check username and password |
| Password expired | "Password has expired" | Change password through IT portal |
| Account locked | "Account has been locked" | Contact IT department |
| Account disabled | "Account has been disabled" | Contact IT department |
| Session expired | "Session expired. Please login again" | Log in again |
| Token refresh failed | "Failed to refresh token" | Log in again |

#### Task Errors

| Situation | Message Shown |
|-----------|--------------|
| Someone else claimed the task first | "Task has been already claimed" |
| Trying to approve your own document | "Document creator cannot approve" |
| Task no longer exists | "Task not found" |
| Server error during claim | "Failed to claim task" |
| Server error during approval | "Failed to approve task" |
| Server error during rejection | "Failed to reject task" |
| Server error during revert | "Failed to revert task" |
| Rejecting without a reason | "Please enter remarks" |
| Reassigning without selecting a user | "Please select a user to reassign" |
| Insufficient permissions | "Unauthorized to perform this action" |

#### Chat Errors

| Situation | Message Shown |
|-----------|--------------|
| Sending to a closed conversation | "This chat has been closed" |
| Message was deleted | "This message has been deleted" |
| Failed to send | "Failed to send message" |
| Failed to load conversations | "Failed to load conversations" |
| Connection dropped | "Connection lost. Reconnecting..." |
| File upload failed | "Failed to upload attachment" |
| File download failed | "Failed to download attachment" |

#### File Errors

| Situation | Message Shown |
|-----------|--------------|
| Upload failed | "File upload failed" |
| Download failed | "File download failed" |
| Wrong file type | "Unsupported file format" |
| File too large | "File size exceeds limit" |
| Aadhaar image wrong format | "Only JPG and PNG formats are supported" |
| Aadhaar image too large | "File size must not exceed 5 MB" |
| Camera not allowed | "Camera permission denied" |
| Storage not allowed | "Storage permission denied" |

### Offline Detection

When the app detects no network connectivity, it adjusts behavior automatically:

```
  ONLINE                              OFFLINE
  +----------------------------+      +----------------------------+
  |                            |      |                            |
  |  All features available    |      |  Read-only mode            |
  |                            |      |                            |
  |  +-- Tasks: claim,        |      |  +-- Tasks: view cached    |
  |  |   approve, reject      |      |  |   tasks only            |
  |  |                        |      |  |                         |
  |  +-- Chat: send & receive |      |  +-- Chat: view history    |
  |  |   messages             |      |  |   only                  |
  |  |                        |      |  |                         |
  |  +-- Camps: full          |      |  +-- Camps: view cached    |
  |  |   management           |      |  |   details only          |
  |  |                        |      |  |                         |
  |  +-- Search: find         |      |  +-- Search: not           |
  |      patients, users      |      |      available             |
  |                            |      |                            |
  +----------------------------+      +----------------------------+
         ^                                     |
         |          Connection restored         |
         +-------------------------------------+
              App syncs and refreshes data
```

### Error Handling User Journey

> **Priya** is reviewing tasks during a train journey with spotty connectivity.
>
> 1. She opens AHAM and sees her previously loaded My Tasks (cached locally)
> 2. She taps on an Invoice Approval to review it -- the cached details load fine
> 3. She taps "Approve" but the network is down
> 4. A message appears: "Connection timed out. Please try again"
> 5. She waits a few minutes. The train enters an area with signal
> 6. She taps "Approve" again -- this time it succeeds
> 7. A confirmation appears and the task disappears from her queue
>
> If her session had expired during the connectivity gap, she would see "Session expired. Please login again" the next time the app tries to reach the server.

---

## Offline Support

AHAM is designed to work in areas with poor or intermittent connectivity -- especially important for outreach health camps in rural locations.

### What Works Offline

| Feature | Offline Capability |
|---------|--------------------|
| **View claimed tasks** | Previously loaded tasks are cached and viewable |
| **View chat history** | Past messages are stored locally in an encrypted database |
| **View camp details** | Camp information and patient lists are cached |
| **Patient registration form** | Form can be filled out offline |
| **FAQ** | All FAQ content is bundled with the app |

### What Requires Connectivity

| Feature | Why It Needs Internet |
|---------|-----------------------|
| **Claiming a new task** | Must communicate with the server to lock the task |
| **Approving / Rejecting** | Must be recorded on the server immediately |
| **Sending chat messages** | Real-time messaging requires a live connection |
| **Searching existing patients** | Database search happens server-side |
| **Aadhaar scanning** | Image processing happens on a remote server |
| **Logging in** | Credentials must be verified by the server |

### How Sync Works

```
  ONLINE                           OFFLINE
  +--------------------+           +--------------------+
  |                    |           |                    |
  |  App fetches data  |           |  App uses cached   |
  |  from server       |   Lost    |  local data        |
  |                    | <-------> |                    |
  |  All actions       | connection|  Read-only for     |
  |  available         |           |  most features     |
  |                    |           |                    |
  +--------------------+           +--------------------+
           ^                                |
           |         Connection             |
           |         restored               |
           +--------------------------------+
           App syncs any queued changes
           and refreshes data
```

When connectivity returns, the app automatically syncs and refreshes data. No manual "sync" button is needed.

---

*Previous: [Outreach Camps](./03_OUTREACH_CAMPS.md) | Back to: [Product Overview](./00_PRODUCT_OVERVIEW.md)*
