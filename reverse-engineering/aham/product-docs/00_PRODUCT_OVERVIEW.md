# AHAM - Product Overview

**Product Name:** AHAM
**Organization:** Narayana Health
**Platform:** Mobile (Android & iOS)
**Category:** Hospital Administration Workflow App

---

## What is AHAM?

> "AHAM enables the administration staff by making the workflow process easier and eliminates delay or lag in business processes."

AHAM is an internal mobile application built by Narayana Health for its hospital administration teams. It replaces paper-based and fragmented digital workflows with a single, unified mobile experience covering task approvals, patient chat support, outreach health camps, and billing/finance operations.

The name "AHAM" sits alongside its sister app "AADI" (the patient-facing app). While AADI serves patients, AHAM serves the people who keep the hospital running behind the scenes.

---

## Who Uses AHAM?

| Role | What They Do in AHAM |
|------|---------------------|
| **Billing Administrators** | Review and approve invoices, receipts, refunds, and discount requests |
| **Finance Managers** | Oversee high-value transactions, authorize medication costs, handle retrospect invoices |
| **Outreach Coordinators** | Manage health camps, register patients at remote locations, coordinate doctors |
| **Front Office Staff** | Handle patient chat conversations, delegate queries to specialists |
| **Unit Heads / Supervisors** | Monitor all tasks across the facility, revert incorrect approvals |

---

## AHAM vs AADI Comparison

```
+-------------------+----------------------------+----------------------------+
|                   |          AHAM              |          AADI              |
+-------------------+----------------------------+----------------------------+
| Target User       | Hospital admin staff       | Patients & families        |
+-------------------+----------------------------+----------------------------+
| Primary Purpose   | Workflow approvals &       | Appointment booking,       |
|                   | operations management      | health records, payments   |
+-------------------+----------------------------+----------------------------+
| Task Management   | Yes - 13 approval types,   | No                         |
|                   | claim/approve/reject       |                            |
+-------------------+----------------------------+----------------------------+
| Chat              | Staff-side: assign,        | Patient-side: ask          |
|                   | delegate, manage queues    | questions, get help        |
+-------------------+----------------------------+----------------------------+
| Health Camps      | Yes - full camp mgmt,      | No                         |
|                   | patient registration       |                            |
+-------------------+----------------------------+----------------------------+
| Billing           | Approve/reject financial   | View & pay bills           |
|                   | documents                  |                            |
+-------------------+----------------------------+----------------------------+
| Authentication    | Staff credentials,         | Patient login,             |
|                   | multi-facility access      | single facility            |
+-------------------+----------------------------+----------------------------+
| Offline Support   | Yes - cached tasks & chat  | Limited                    |
+-------------------+----------------------------+----------------------------+
```

---

## Feature Map

```
+================================================================+
|                         AHAM APP                                |
+================================================================+
|                                                                 |
|  +---------------------------+  +---------------------------+   |
|  |   TASK MANAGEMENT (Core)  |  |   CHAT CONVERSATIONS      |   |
|  |                           |  |                           |   |
|  |  - 13 approval types      |  |  - Real-time messaging    |   |
|  |  - 3 task queues          |  |  - Assign / Delegate      |   |
|  |    (My/Group/All)         |  |  - Text, audio, PDF,      |   |
|  |  - Claim > Review >       |  |    image attachments      |   |
|  |    Approve/Reject         |  |  - Conversation mgmt      |   |
|  +---------------------------+  +---------------------------+   |
|                                                                 |
|  +---------------------------+  +---------------------------+   |
|  |   OUTREACH CAMPS          |  |   BILLING & FINANCE       |   |
|  |                           |  |                           |   |
|  |  - Camp lifecycle mgmt    |  |  - Invoice review         |   |
|  |  - Patient registration   |  |  - Receipt processing     |   |
|  |  - Aadhaar KYC scan       |  |  - Refund handling        |   |
|  |  - Doctor/coordinator     |  |  - 5 discount types       |   |
|  |    assignment             |  |  - High-value medications |   |
|  +---------------------------+  +---------------------------+   |
|                                                                 |
|  +----------------------------------------------------------+  |
|  |                    PLATFORM                               |  |
|  |  Login | Multi-Facility | Notifications | Offline | FAQ   |  |
|  +----------------------------------------------------------+  |
|                                                                 |
+================================================================+
```

---

## Key Metrics at a Glance

| Metric | Value |
|--------|-------|
| **Framework** | Flutter (cross-platform: Android + iOS) |
| **Total Screens** | 32 |
| **Backend Microservices** | 7 (Gateway, MDM, AMB, MPI, PRM, jBPM, Registry) |
| **Task Approval Types** | 13 |
| **Chat System** | Azure Communication Services (real-time) |
| **Languages Supported** | 8 (English, Bengali, Gujarati, Hindi, Kannada, Marathi, Tamil, Telugu) |
| **Local Storage** | ObjectBox (offline-capable) |
| **Push Notifications** | Firebase Cloud Messaging |

---

## The Four Modules

When a staff member opens AHAM, they see a home dashboard with four module cards:

```
+--------------------------------------------------+
|                  AHAM Home                        |
|                                                   |
|   Welcome, [Staff Name]                           |
|   [Selected Facility Name]                        |
|                                                   |
|   +---------------------+ +---------------------+ |
|   |                     | |                     | |
|   |   TASK MANAGEMENT   | |   CONVERSATIONS     | |
|   |                     | |                     | |
|   |   Review & approve  | |   Chat with         | |
|   |   pending items     | |   patients           | |
|   |                     | |                     | |
|   +---------------------+ +---------------------+ |
|                                                   |
|   +---------------------+ +---------------------+ |
|   |                     | |                     | |
|   |   OUTREACH CAMPS    | |   BILLING &         | |
|   |                     | |   FINANCE           | |
|   |   Manage health     | |                     | |
|   |   camps & patients  | |   Financial docs    | |
|   |                     | |                     | |
|   +---------------------+ +---------------------+ |
|                                                   |
+--------------------------------------------------+
```

---

## Document Index

This product documentation is organized into the following sections:

| # | Document | What It Covers |
|---|----------|---------------|
| 00 | **Product Overview** (this file) | What AHAM is, who uses it, feature map, key metrics |
| 01 | [Task Management](./01_TASK_MANAGEMENT.md) | 13 approval types, task lifecycle, claim/approve/reject/revert, user journeys |
| 02 | [Chat Conversations](./02_CHAT_CONVERSATIONS.md) | Chat dashboard, assign/delegate, message types, user journeys |
| 03 | [Outreach Camps](./03_OUTREACH_CAMPS.md) | Camp lifecycle, patient registration, Aadhaar KYC, user journeys |
| 04 | [Platform & Settings](./04_PLATFORM_SETTINGS.md) | Login, multi-facility, notifications, offline, privacy, FAQ |

---

## How to Read These Docs

- **No code, no APIs.** These documents describe what the user sees and does, not how the system is built.
- **Flowcharts** use ASCII art to show processes and decision points.
- **Screen mockups** use ASCII boxes to show what each screen looks like.
- **User journeys** walk through realistic scenarios step by step.
- **Validation rules** are stated in plain English (e.g., "The amount must be greater than zero").

For engineering specifications (data models, API endpoints, architecture), see the [Engineering Specs](../specs/00_INDEX.md) folder.
