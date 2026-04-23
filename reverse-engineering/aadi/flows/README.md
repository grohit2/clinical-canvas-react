# AADI — Implementation Flow Guide for Developers

**App:** AADI (org.nh.app.aadi) v2.35.0
**Publisher:** Narayana Health
**Platform:** Android / iOS (Ionic + Capacitor)
**Source:** 553 TypeScript files recovered from APK source maps

---

## Overview

AADI is an Ionic/Capacitor Angular 17 healthcare app used by doctors and nurses at Narayana Health hospitals for bedside patient care. It provides real-time patient chat, medication management, lab results, clinical documentation, video consultation, and more — all with offline-first SQLite storage.

## Tech Stack

| Layer         | Technology                                         |
|---------------|-----------------------------------------------------|
| Framework     | Angular 17 (standalone components)                  |
| UI            | Ionic 7                                             |
| Native Bridge | Capacitor 5                                         |
| Local DB      | SQLite (encrypted via `@capacitor-community/sqlite`) |
| Real-time     | Azure Communication Services (ACS) Chat SDK          |
| Push          | Firebase Cloud Messaging (FCM)                       |
| Rich Text     | CKEditor 5                                          |
| Video         | Agora RTC SDK (primary) + OpenTok (legacy)           |
| Auth          | JWT (access + refresh tokens) + ATHMA proxy          |
| Barcode       | ML Kit Barcode Scanning                              |

---

## How to Read These Docs

1. **Start with `00_LOGIN_AUTH_FLOW.md`** — establishes auth, tokens, storage, and network that every other flow depends on.
2. **Read in numerical order.** Later docs reference concepts from earlier ones.
3. Each document follows a consistent structure:
   - Screen mockups (ASCII)
   - Step-by-step user flows
   - Complete API reference (endpoint, method, request/response JSON)
   - SQLite schema and queries
   - Error handling matrix
   - Edge cases
   - Implementation checklist
4. Cross-reference `../product-docs/` for user stories and `../specs/` for data models.

---

## Flow Documents Index

| #  | File | Topic | Lines | Status |
|----|------|-------|-------|--------|
| 00 | [00_LOGIN_AUTH_FLOW.md](./00_LOGIN_AUTH_FLOW.md) | Login (Phone OTP, Email OTP, Password), Token lifecycle, Logout | 805 | **DONE** |
| 01 | [01_LANDING_HOME_FLOW.md](./01_LANDING_HOME_FLOW.md) | Landing dashboard, Inpatient list, 9 filters, Add patient, Pin/Unpin | 769 | **DONE** |
| 02 | [02_PATIENT_CHAT_FLOW.md](./02_PATIENT_CHAT_FLOW.md) | 16 message types, ACS real-time, File upload, @Mentions, Audio recording | 1,659 | **DONE** |
| 03 | [03_MEDICATION_FLOW.md](./03_MEDICATION_FLOW.md) | Medication ordering (3 contexts), Dosage config, 24h timeline, Reconciliation | 1,693 | **DONE** |
| 04 | [04_LAB_RESULTS_FLOW.md](./04_LAB_RESULTS_FLOW.md) | Investigation ordering, 5-step result pipeline, D3.js trends, 7 abnormal flags | 1,322 | **DONE** |
| 05 | [05_PROGRESS_NOTES_DISCHARGE_FLOW.md](./05_PROGRESS_NOTES_DISCHARGE_FLOW.md) | Progress Notes + Discharge Summary, AI voice-to-text, 28 DS sections, 7-state workflow | 1,597 | **DONE** |
| 06 | [06_CARE_TEAM_VIDEO_CONSULTATION_FLOW.md](./06_CARE_TEAM_VIDEO_CONSULTATION_FLOW.md) | Care team templates, Cross-consultation, Handover, Agora/OpenTok video, STOMP chat | 1,728 | **DONE** |
| 07 | [07_CHECKLIST_OPERATIONS_ASSESSMENT_FLOW.md](./07_CHECKLIST_OPERATIONS_ASSESSMENT_FLOW.md) | Checklists, OT Notes, PAC, Incident Reports, 16 IA widgets, Risk Score, Tasks | 2,242 | **DONE** |
| 08 | [08_VITALS_PAST_RECORDS_PLATFORM_FLOW.md](./08_VITALS_PAST_RECORDS_PLATFORM_FLOW.md) | 13 vital params, Past records, Gallery view, Offline architecture, Platform features | 1,724 | **DONE** |

**Total: 13,539 lines of implementation-level documentation**

---

## Functional Flow (High-Level)

| File | Description | Lines |
|------|-------------|-------|
| [../Functional Flows/patient journey.md](../Functional%20Flows/patient%20journey.md) | End-to-end patient journey with source-code-level annotations | 1,675 |

---

## Cross-References

| Resource | Path | Description |
|----------|------|-------------|
| Product documentation | `../product-docs/` | 8 files covering user-facing features |
| Technical specifications | `../specs/` | 14 files with data models, API lists, and protocol specs |
| Complete engineering spec | `../AADI_COMPLETE_ENGINEERING_SPEC.md` | 26KB consolidated architecture document |
| Functional Flows | `../Functional Flows/` | High-level patient journey with API annotations |

---

## Key Numbers

- **553** TypeScript source files analyzed
- **200+** API endpoints documented
- **16** message categories in patient chat
- **28** discharge summary sections
- **16** initial assessment widgets
- **13** vital parameters tracked
- **9** flow documents covering every feature
- **~700** implementation checklist items
