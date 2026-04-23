# AHAM — Implementation Flow Guide for Developers

**App:** AHAM (org.nh.prod.aham) v2.6.1 (Build 10513)
**Publisher:** Narayana Health
**Platform:** Android (Flutter)
**Source:** Reconstructed from Java plugin layer, specs, and binary analysis

---

## Overview

AHAM is Narayana Health's **hospital administration app** for billing staff, approvers, and outreach coordinators. Built with Flutter/Dart and BLoC pattern, it handles task approvals (13 types), billing workflows, real-time chat via Azure Communication Services, outreach health camps with Aadhaar KYC, and multi-facility access.

> **Source note:** The Dart code is compiled to `libapp.so` (binary). These flows were reconstructed from the **Java plugin layer** (11 files), **AndroidManifest**, **Firebase config**, and cross-referencing with `specs/` and `product-docs/`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Flutter 3.x |
| Language | Dart |
| State Management | BLoC pattern (10 BLoCs) |
| Offline Storage | ObjectBox (AES-256 encrypted) |
| Real-time Messaging | Azure Communication Services (native Java plugin) |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Remote Config | Firebase Remote Config |
| Auth | JWT (access + refresh tokens) |
| Build Flavors | `prod`, `dev`, `sqa`, `uat` |
| Languages | 8 (en, bn, gu, hi, kn, mr, ta, te) |

---

## How to Read These Docs

1. **Start with `00_LOGIN_AUTH_FLOW.md`** — establishes auth, BLoC patterns, Dio interceptors, and ACS plugin that all other flows depend on.
2. **Read in numerical order.** Later documents reference concepts from earlier ones.
3. Each document follows a consistent structure:
   - Screen mockups (ASCII)
   - BLoC state machines (events, states, diagrams)
   - Complete API reference with request/response JSON
   - Error handling matrix
   - Edge cases
   - Implementation checklist
4. Cross-reference `../product-docs/` for user stories and `../specs/` for data models.

---

## Flow Documents Index

| # | File | Topic | Lines | Status |
|---|------|-------|-------|--------|
| 00 | [00_LOGIN_AUTH_FLOW.md](./00_LOGIN_AUTH_FLOW.md) | Client setup, Login, Token lifecycle, ACS plugin, Multi-facility, Logout | 1,671 | **DONE** |
| 01 | [01_TASK_MANAGEMENT_FLOW.md](./01_TASK_MANAGEMENT_FLOW.md) | 13 approval types, jBPM lifecycle, BLoC architecture, Billing formulas | 2,558 | **DONE** |
| 02 | [02_CHAT_MESSAGING_FLOW.md](./02_CHAT_MESSAGING_FLOW.md) | ACS native plugin, 3-layer architecture, Delegation, ObjectBox, 8 message types | 2,044 | **DONE** |
| 03 | [03_OUTREACH_CAMPS_FLOW.md](./03_OUTREACH_CAMPS_FLOW.md) | Camp lifecycle, 8-step patient registration, Aadhaar KYC, Coordinator management | 1,919 | **DONE** |
| 04 | [04_BILLING_SETTINGS_FLOW.md](./04_BILLING_SETTINGS_FLOW.md) | Invoice/Receipt/Refund models, 5 discount types, Multi-facility, FCM, 8 languages, Security | 2,513 | **DONE** |

**Total: 10,705 lines of implementation-level documentation**

---

## Functional Flow (High-Level)

| File | Description | Lines |
|------|-------------|-------|
| [../Functional Flows/staff journey.md](../Functional%20Flows/staff%20journey.md) | End-to-end staff journey with BLoC events and API annotations | 1,678 |

---

## Cross-References

| Resource | Path | Description |
|----------|------|-------------|
| Product documentation | `../product-docs/` | 5 files covering user-facing features |
| Technical specifications | `../specs/` | 10 files with data models, API lists, error catalogs |
| Functional Flows | `../Functional Flows/` | High-level staff journey with status machines |

---

## Key Numbers

- **10** BLoCs managing all app state
- **13** task approval types with jBPM workflow
- **44** API endpoints documented
- **67** data models
- **32** screens
- **8** languages supported
- **5** flow documents covering every feature
- **~400** implementation checklist items
