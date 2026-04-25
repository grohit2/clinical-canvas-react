# AADI Flow Documentation — Progress Log

> Tracking detailed flow documentation for junior developer implementation.
> Target: Every user flow documented with exact API calls, state changes, error handling, and edge cases.

---

## Iteration 1 — 2026-04-22

**Mode:** SETUP + LOGIN/AUTH + HOME/LANDING
**Files Created:**
- `PROGRESS.md` (this file)
- `README.md` (index of all flows)
- `00_LOGIN_AUTH_FLOW.md` (login, OTP, token management, logout)
- `01_LANDING_HOME_FLOW.md` (landing dashboard, inpatient list, patient add, filtering)

**Source Files Read:**
- `login.page.ts` (523 lines), `login.page.html` (202 lines)
- `auth-jwt.service.ts` (205 lines), `account.service.ts` (124 lines), `token-refresh.service.ts` (216 lines)
- `login.service.ts` (269 lines)
- `auth.interceptor.ts` (125 lines), `auth-expired.interceptor.ts` (45 lines)
- `landing.page.ts` (281 lines), `landing.page.html` (60 lines)
- `home.page.ts` (2112 lines), `home.page.html` (427 lines)
- `app-routing.module.ts` (456 lines), `app.component.ts` (935 lines)
- `app-storage.service.ts` (151 lines), `database.service.ts` (123 lines)
- `network.service.ts` (114 lines), `Constants.ts` (8 lines)

**Decisions:**
- Flow docs organized as numbered files (00_, 01_, ...) in reading order
- Each flow doc includes: User Journey, Screen-by-Screen walkthrough, API calls with full request/response, State changes, Error handling, Edge cases
- Code references use `file.ts:lineNumber` format

---
