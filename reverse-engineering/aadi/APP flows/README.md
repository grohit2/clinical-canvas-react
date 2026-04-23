# AADI — Implementation Flow Guide for Developers

## Overview

AADI is Narayana Health's **bedside clinical app** built for doctors and nurses. It is an **Ionic/Capacitor Angular** hybrid mobile application that covers the full inpatient workflow -- from patient admission and medication orders through discharge summaries and follow-ups.

This folder contains step-by-step flow documents that explain how each major feature is implemented. Each document walks through the UI, service layer, API calls, state management, and edge cases so that a developer can understand (or reimplement) the feature without access to the original source.

> **Source note:** All flows were reverse-engineered from the decompiled APK **v2.35.0**. Variable and class names are faithful to the original Angular/TypeScript bundle.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Angular 17 |
| Mobile shell | Ionic 7 + Capacitor 5 |
| Language | TypeScript |
| Offline storage | SQLite (via Capacitor plugin) |
| Real-time messaging | Azure Communication Services (ACS) |
| Push notifications | Firebase Cloud Messaging (FCM) |
| Video calls | Agora / OpenTok |
| Rich text | CKEditor |
| Auth | Phone OTP, Email OTP, Password |

---

## How to Read These Docs

1. **Start with `00_LOGIN_AUTH_FLOW.md`** -- it establishes the auth model, token lifecycle, and API client setup that every other flow depends on.
2. **Read in numerical order.** Later documents reference concepts introduced in earlier ones.
3. Each document follows a consistent structure:
   - **What the user sees** (screens, actions)
   - **What the code does** (components, services, models)
   - **API contracts** (request/response shapes)
   - **Error handling & edge cases**
4. Cross-reference the `product-docs/` folder for user stories and the `specs/` folder for data models and API lists.

---

## Flow Document Index

| # | File | Topic | Status |
|---|---|---|---|
| 00 | `00_LOGIN_AUTH_FLOW.md` | Login (Phone OTP, Email OTP, Password), Token management, Logout | Planned |
| 01 | `01_LANDING_HOME_FLOW.md` | Landing dashboard, Inpatient list, Patient add, Filtering, Pin/Unpin | Planned |
| 02 | `02_PATIENT_CHAT_FLOW.md` | Real-time messaging, 14 message types, File attachments, ACS integration | Planned |
| 03 | `03_MEDICATION_FLOW.md` | Medication orders, Dosage config, IV infusions, Reconciliation | Planned |
| 04 | `04_LAB_RESULTS_FLOW.md` | Investigation ordering, Result processing, Abnormal flags, Trends | Planned |
| 05 | `05_PROGRESS_NOTES_FLOW.md` | Clinical notes, CKEditor, Macros, Acknowledgment workflow | Planned |
| 06 | `06_DISCHARGE_SUMMARY_FLOW.md` | 28 sections, 7-state workflow, AI voice-to-text, Comments | Planned |
| 07 | `07_CARE_TEAM_FLOW.md` | Team management, Handover, Cross-consultation | Planned |
| 08 | `08_VIDEO_CONSULTATION_FLOW.md` | Appointments, Agora/OpenTok video, In-call chat, OPD notes | Planned |
| 09 | `09_CHECKLIST_OPERATIONS_FLOW.md` | Checklists, Operation Notes, PAC, Incident Report | Planned |
| 10 | `10_ASSESSMENT_VITALS_FLOW.md` | Initial Assessment, Risk Score, Vitals, CT Scorecard | Planned |
| 11 | `11_PAST_RECORDS_FOLLOWUP_FLOW.md` | Past records, Follow-up scheduling, Attachments | Planned |
| 12 | `12_OFFLINE_SYNC_FLOW.md` | Offline architecture, SQLite, Sync strategy, Network monitoring | Planned |
| 13 | `13_NOTIFICATIONS_SETTINGS_FLOW.md` | Push notifications, Deep linking, Settings, Feedback | Planned |

---

## Related Docs

- **`product-docs/`** — User stories, feature requirements, product specs
- **`specs/`** — Data models, API endpoint lists, enum definitions
- **`PROGRESS.md`** — Tracks which flows have been written and what remains
