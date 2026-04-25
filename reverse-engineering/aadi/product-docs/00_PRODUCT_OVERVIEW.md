# AADI - Product Overview

## What is AADI?

AADI is a mobile-first clinical care platform built by **Narayana Health**, one of India's largest hospital chains. It serves as the primary tool for **doctors and nurses** managing inpatients at the bedside.

Think of it as a **clinical command center in your pocket** — combining patient tracking, clinical documentation, medication management, lab results, team communication, and video consultations into a single app.

---

## Who Uses It?

| User | Primary Use |
|------|-------------|
| **Doctors (Consultants)** | Review patients, write progress notes, order medications, view lab results, discharge patients |
| **Nurses** | Medication administration tracking, checklist completion, task management, patient communication |
| **Specialists** | Cross-consultation requests, operation notes, pre-anesthesia assessments |
| **Administrators** | Care team management, template configuration |

---

## Core Value Propositions

1. **Single pane of glass** — All patient data (vitals, labs, meds, notes) in one place
2. **Real-time communication** — Instant team chat with media sharing (photos, audio, video, PDFs)
3. **Offline-first** — Works without internet; syncs when connectivity returns
4. **Clinical safety** — Drug interaction checks, abnormal lab flagging, surgical checklists with witness workflows
5. **AI-powered** — Voice-to-text discharge summaries, AI-generated clinical documentation
6. **Telemedicine** — Built-in video consultation with Agora/OpenTok and in-call chat

---

## Feature Map at a Glance

```
AADI App
|
|-- PATIENT HUB
|   |-- Patient List (search, filter, sort, pin, QR scan)
|   |-- Patient Chat (text, image, audio, video, PDF)
|   |-- Patient Details (demographics, care team, comorbidities)
|   |-- Risk Scoring (mortality prediction with visual gauges)
|
|-- CLINICAL DOCUMENTATION
|   |-- Progress Notes (rich text + linked orders)
|   |-- Discharge Summary (28 sections, AI voice-to-text)
|   |-- Operation Notes (SNOMED-CT coded procedures)
|   |-- Initial Assessment (27 configurable widgets)
|
|-- ORDERS & RESULTS
|   |-- Medication Orders (with dosage calculator)
|   |-- Medication Dashboard (24-hour administration timeline)
|   |-- Investigation Orders (with favorites & priority)
|   |-- Lab Results (abnormal flagging, trend graphs)
|   |-- Vital Trends (11 parameters, interactive charts)
|
|-- CARE COORDINATION
|   |-- Care Team Management (roles, admin, locking)
|   |-- Cross-Consultation (specialist referrals)
|   |-- Consultant Handover (accept/reject)
|   |-- Surgical Checklists (witness workflow)
|   |-- Task Management (nursing capture notes)
|
|-- SAFETY & COMPLIANCE
|   |-- Pre-Anesthesia Checkup (ASA scoring)
|   |-- Drug Interaction Checks
|   |-- Incident Reporting (with photo evidence)
|   |-- Discharge Intimation
|
|-- TELEMEDICINE
|   |-- Video Consultation (Agora/OpenTok)
|   |-- In-call Chat (quick replies)
|   |-- OPD Notes & Prescriptions
|   |-- Past Records & Follow-up Scheduling
|
|-- PLATFORM
    |-- Login (password, phone OTP, email OTP)
    |-- Push Notifications (configurable preferences)
    |-- Offline Support (encrypted local database)
    |-- Analytics & Feedback
```

---

## Key Metrics (from app configuration)

| Metric | Value |
|--------|-------|
| App Version | 2.35.0 |
| Target Platform | Android (Capacitor/Ionic) |
| Offline Storage | Encrypted SQLite |
| Push Notifications | Firebase Cloud Messaging |
| Video Provider | Agora RTC (primary), OpenTok (legacy) |
| Chat Provider | Azure Communication Services |
| Analytics | Firebase Analytics (76 tracked screens) |

---

## Document Index

| Doc | Feature Area | For |
|-----|-------------|-----|
| [01 - Patient Hub](./01_PATIENT_HUB.md) | Patient list, chat, details, risk scoring | PM, Design |
| [02 - Clinical Documentation](./02_CLINICAL_DOCUMENTATION.md) | Progress notes, discharge summary, operation notes | PM, Clinical |
| [03 - Medication System](./03_MEDICATION_SYSTEM.md) | Ordering, dashboard, reconciliation, safety | PM, Clinical |
| [04 - Lab Results & Investigations](./04_LAB_RESULTS.md) | Ordering tests, viewing results, trends | PM, Clinical |
| [05 - Care Coordination](./05_CARE_COORDINATION.md) | Team management, handover, checklists, tasks | PM, Ops |
| [06 - Telemedicine](./06_TELEMEDICINE.md) | Video consultation, chat, follow-up | PM, Design |
| [07 - Safety & Compliance](./07_SAFETY_COMPLIANCE.md) | PAC, incident reports, drug checks, discharge | PM, Compliance |
| [08 - Platform & Infrastructure](./08_PLATFORM.md) | Auth, offline, notifications, analytics | PM, Engineering |
