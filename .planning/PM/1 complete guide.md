# Clinical Canvas: Complete Architecture Guide

> A FHIR-aligned clinical workflow system combining hospital data modeling, patient management, task workflows, and document handling.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Core Data Model (FHIR-Aligned)](#3-core-data-model-fhir-aligned)
4. [Patient Details Page](#4-patient-details-page)
5. [Workflow & Template Engine](#5-workflow--template-engine)
6. [Document Management System](#6-document-management-system)
7. [Task Management System](#7-task-management-system)
8. [Access Control & Security](#8-access-control--security)
9. [Production Readiness](#9-production-readiness)
10. [Implementation Roadmap](#10-implementation-roadmap)

---

## 1. Executive Summary

### Vision

Clinical Canvas is a FHIR-aligned healthcare application that manages the complete clinical workflow:

```
Patient Created → Pathway Assigned → Tasks/Docs Materialized → 
Ownership Assigned → Completion Reviewed → Stage Change → 
Next Work Triggered → Everything Syncs with Audit Trail
```

### Current State Assessment

| Metric | Status |
|--------|--------|
| Demo completeness | 70-80% |
| Production readiness | 35-45% |
| Core gap | Trust layer (single source of truth, workflow automation, sync, permissions) |

### Key Principles

1. **FHIR-aligned, not FHIR-native** - Clean relational model now, FHIR mapping layer later
2. **One source of truth** - All screens use same domain model and command pipeline
3. **Person ≠ Role** - Stable `Practitioner` records with time-bounded `PractitionerRole` assignments
4. **Workflow-driven documents** - Documents are workflow objects, not storage pages

---

## 2. System Architecture Overview

### High-Level System Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLINICAL CANVAS SYSTEM                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │   PATIENT    │───▶│   WORKFLOW   │───▶│    TASKS     │───▶│  DOCUMENTS │ │
│  │   REGISTRY   │    │   ENGINE     │    │   SYSTEM     │    │   SYSTEM   │ │
│  └──────────────┘    └──────────────┘    └──────────────┘    └────────────┘ │
│         │                   │                   │                   │        │
│         ▼                   ▼                   ▼                   ▼        │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                      UNIFIED ACTIVITY FEED                               ││
│  │   (Encounter | Condition | Medication | Order | Task | Document | Note)  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│         │                   │                   │                   │        │
│         ▼                   ▼                   ▼                   ▼        │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                      LOCAL-FIRST DATA LAYER                              ││
│  │              SQLite (offline) ←→ Outbox ←→ Cloud Sync                    ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│         │                   │                   │                   │        │
│         ▼                   ▼                   ▼                   ▼        │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                         AWS BACKEND                                       ││
│  │         Cognito (Auth) | AppSync (Real-time) | S3 (Documents)            ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Ten-Layer Hospital Model

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: Organization Hierarchy                                 │
│          Hospital → Campus → Service Line → Department → Unit   │
├─────────────────────────────────────────────────────────────────┤
│ Layer 2: Location Hierarchy                                     │
│          Building → Floor → Ward → Room → Bed                   │
├─────────────────────────────────────────────────────────────────┤
│ Layer 3: Healthcare Services                                    │
│          Cardiology, ICU, Social Work, Interpreter, Transport   │
├─────────────────────────────────────────────────────────────────┤
│ Layer 4: People                                                 │
│          Doctors, Nurses, Residents, Students, Support Staff    │
├─────────────────────────────────────────────────────────────────┤
│ Layer 5: Role Assignments                                       │
│          What each person does, where, for whom, when           │
├─────────────────────────────────────────────────────────────────┤
│ Layer 6: Care Teams                                             │
│          Patient Team, Consult Team, On-Call Team, Support Team │
├─────────────────────────────────────────────────────────────────┤
│ Layer 7: Schedules & Slots                                      │
│          Shifts, Call Coverage, Clinic Sessions, Blocked Time   │
├─────────────────────────────────────────────────────────────────┤
│ Layer 8: Appointments                                           │
│          Planned Booked Events                                  │
├─────────────────────────────────────────────────────────────────┤
│ Layer 9: Encounters & Episodes                                  │
│          Actual Care Events, Longitudinal Responsibility        │
├─────────────────────────────────────────────────────────────────┤
│ Layer 10: Tasks + Security                                      │
│           Consults, Routing, Access Rules, Consent, Audit       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Data Model (FHIR-Aligned)

### FHIR Resource Mapping

| Domain | FHIR Resource | Purpose |
|--------|---------------|---------|
| **Organization** | `Organization` | Hospital, department, division hierarchy (use `partOf`) |
| **Locations** | `Location` | Building, ward, room, bed, virtual clinic |
| **External Partners** | `OrganizationAffiliation` | Contractors, agency nurses, labs, HIEs |
| **People** | `Practitioner` | Person identity and qualifications |
| **People** | `RelatedPerson` | Family member, guardian, caregiver |
| **Assignments** | `PractitionerRole` | Role + location + service + time period |
| **Services** | `HealthcareService` | Service catalog (social work, PT, interpreter) |
| **Teams** | `CareTeam` | Patient team, consult team, event team |
| **Availability** | `Schedule` + `Slot` | Shifts, on-call blocks, availability |
| **Bookings** | `Appointment` | Planned events |
| **Care Events** | `Encounter` | Actual visits, admissions, transfers |
| **Longitudinal** | `EpisodeOfCare` | Ongoing responsibility periods |
| **Work Items** | `Task` | Operational work, consults, requests |
| **Privacy** | `Consent` | Patient preferences and restrictions |
| **Audit** | `AuditEvent` + `Provenance` | Access logs, authorship tracking |

### Critical Design Decision: Person vs Role

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PERSON VS ROLE MODEL                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   PRACTITIONER (Person)              PRACTITIONERROLE (Assignment)           │
│   ─────────────────────              ──────────────────────────────          │
│   • Identity                         • Role/Function                         │
│   • Qualifications                   • Specialty                             │
│   • Demographics                     • Organization                          │
│   • Licenses                         • Location(s)                           │
│   • ONE record per person            • Healthcare Service                    │
│   • Stable across time               • Time-bounded period                   │
│                                      • Contact information                   │
│                                      • MANY records per person               │
│                                                                              │
│   ┌─────────────┐                                                            │
│   │ Dr. Smith   │──────┬──────────▶ PGY1 Cardiology (2023-2024)             │
│   │ Practitioner│      │                                                     │
│   │ ID: P-1234  │      ├──────────▶ PGY2 Cardiology (2024-2025)             │
│   └─────────────┘      │                                                     │
│                        ├──────────▶ PGY3 CCU Service (2025-2026)            │
│                        │                                                     │
│                        └──────────▶ Night Float Coverage (Jan 2026)         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Database Schema

#### Directory Layer
```sql
-- Organization hierarchy (business structure)
organization (id, name, type, status, part_of, identifier)
organization_affiliation (id, organization_id, participating_org_id, role, period)

-- Physical locations (separate from business hierarchy)
location (id, name, type, status, part_of, managing_organization_id)

-- Service catalog
healthcare_service (id, name, category, type, organization_id, location_ids, appointment_required)

-- People
practitioner (id, name, identifier, qualification, active)
practitioner_qualification (id, practitioner_id, code, issuer, period)
practitioner_role (id, practitioner_id, organization_id, location_ids, specialty, period, active)
```

#### Team & Schedule Layer
```sql
-- Teams
care_team (id, name, status, category, subject_patient_id, encounter_id, period)
care_team_member (id, care_team_id, role, member_type, member_id, period)

-- Schedules
schedule (id, actor_type, actor_id, planning_horizon, active)
slot (id, schedule_id, status, start, end, overbooked)
appointment (id, status, type, subject_patient_id, slot_id, participant_ids)
```

#### Patient Context Layer
```sql
-- Episodes and encounters
episode_of_care (id, patient_id, status, type, managing_organization_id, period, care_team_id)
encounter (id, patient_id, status, type, episode_of_care_id, location_id, period)
encounter_participant (id, encounter_id, type, individual_type, individual_id, period)
```

#### Work & Document Layer
```sql
-- Tasks
task (id, status, business_status, intent, priority, code, focus_type, focus_id, 
      for_patient_id, encounter_id, authored_on, last_modified, requester_id, owner_id,
      due_date, restriction_period, note)
task_assignment_history (id, task_id, from_owner_id, to_owner_id, reason, timestamp)

-- Documents
document_reference (id, patient_id, encounter_id, type, category, status, 
                    doc_status, created, author_id, content_url, review_status,
                    reviewer_id, expiry_date, workflow_stage)
```

#### Security Layer
```sql
-- Access control
user_account (id, practitioner_id, username, status, last_login)
policy_role (id, name, permissions, scope)
access_rule (id, role_id, resource_type, conditions, allowed_actions)

-- Privacy and audit
consent_record (id, patient_id, status, scope, category, period, provision)
audit_event (id, type, action, recorded, outcome, agent_id, source, entity_type, entity_id)
provenance_record (id, target_type, target_id, recorded, activity, agent_id, reason)
```

---

## 4. Patient Details Page

### Page Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PATIENT BANNER                                    │
│  Name: John Smith | MRN: 123456 | Age: 65 | DOB: 1960-03-15 | Sex: M        │
│  Encounter: Inpatient | Location: ICU Bed 4 | Language: English             │
│  Attending: Dr. Johnson | Code Status: Full Code                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                            SAFETY STRIP                                      │
│  ⚠️ Allergies: Penicillin (severe), Sulfa | 🚨 Flags: Fall Risk, DVT Risk   │
│  📋 Advance Directive: DNR/DNI on file                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                           QUICK ACTIONS                                      │
│  [+ Note] [+ Order] [+ Medication] [+ Referral] [+ Task] [+ Problem]        │
├───────────────────┬───────────────────┬─────────────────┬───────────────────┤
│  ACTIVE PROBLEMS  │ CURRENT MEDS      │ RESULTS/VITALS  │ OPEN WORK         │
│  ────────────────│ ───────────────── │ ─────────────── │ ─────────────     │
│  • CHF (active)   │ • Metoprolol 25mg │ • BP: 128/82    │ • Echo pending    │
│  • HTN (active)   │ • Lisinopril 10mg │ • HR: 72        │ • Cardio consult  │
│  • T2DM (active)  │ • Metformin 500mg │ • K: 4.2 ✓      │ • PT eval due     │
│  • CAD (resolved) │ • Insulin glargine│ • Cr: 1.1 ↑     │ • Discharge plan  │
├───────────────────┴───────────────────┴─────────────────┴───────────────────┤
│                      ACTIVITY FEED                                           │
│  Filters: [All] [Today] [Notes] [Orders] [Results] [Meds] [Tasks] [Docs]    │
│  ─────────────────────────────────────────────────────────────────────────  │
│  🕐 10:45 AM  Lab resulted: BMP - K 4.2, Cr 1.1 (↑ from 0.9)                │
│  🕐 10:30 AM  Medication given: Metoprolol 25mg PO                          │
│  🕐 09:15 AM  Task completed: Morning vitals check                          │
│  🕐 08:00 AM  Progress note signed by Dr. Johnson                           │
│  🕐 07:30 AM  Nursing assessment completed                                  │
│  🕐 Yesterday  Cardiology consult requested                                 │
│  🕐 Yesterday  Admitted from ED - CHF exacerbation                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                       DETAIL PANEL (click to expand)                         │
│  [Selected item details appear here without leaving the page]               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Activity Feed Event Types

| Event Category | FHIR Resource | Example Events |
|----------------|---------------|----------------|
| **Encounters** | `Encounter` | Admitted, transferred, discharged |
| **Problems** | `Condition` | Added, changed, resolved |
| **Medications** | `MedicationRequest`, `MedicationAdministration` | Ordered, given, held, stopped |
| **Results** | `Observation`, `DiagnosticReport` | Lab resulted, critical value |
| **Orders** | `ServiceRequest` | Ordered, completed, cancelled |
| **Tasks** | `Task` | Created, assigned, completed, overdue |
| **Procedures** | `Procedure` | Scheduled, completed |
| **Notes** | `DocumentReference`, `Composition` | Written, signed, amended |
| **Communications** | `Communication` | Handoff recorded, message sent |
| **Care Plan** | `CarePlan` | Updated, goal achieved |

### Quick Add Forms (Minimal Entry)

| Form | Required Fields |
|------|-----------------|
| **Problem** | Diagnosis, status, onset, short note |
| **Medication** | Medication, dose, route/frequency, reason |
| **Order/Referral** | Service, reason, priority, destination |
| **Task** | Title, owner, due date, priority |
| **Note** | Type, title, text |

---

## 5. Workflow & Template Engine

### Patient State Machine

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PATIENT WORKFLOW SPINE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐            │
│    │ ADMITTED │───▶│  PRE-OP  │───▶│IN SURGERY│───▶│ POST-OP  │            │
│    └──────────┘    └──────────┘    └──────────┘    └──────────┘            │
│          │                                               │                   │
│          │         ┌──────────┐    ┌──────────┐         │                   │
│          └────────▶│ RECOVERY │───▶│DISCHARGE │◀────────┘                   │
│                    │  READY   │    │  READY   │                             │
│                    └──────────┘    └──────────┘                             │
│                                          │                                   │
│                                          ▼                                   │
│                                    ┌──────────┐                             │
│                                    │DISCHARGED│                             │
│                                    └──────────┘                             │
│                                                                              │
│   State changes trigger:                                                     │
│   • Task generation from templates                                          │
│   • Document requirement checks                                             │
│   • Team notifications                                                      │
│   • Audit trail entries                                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Template System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TEMPLATE HIERARCHY                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    ORGANIZATION TEMPLATES                            │   │
│   │            Hospital-wide standard playbooks (locked)                 │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                      TEAM TEMPLATES                                  │   │
│   │           Ward / Specialty / Unit specific (admin-editable)         │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│                                    ▼                                         │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                    PERSONAL TEMPLATES                                │   │
│   │                 Individual shortcuts (user-owned)                    │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Template Features

#### 1. Template Packs (Bundled Templates)
```yaml
admission_pack:
  name: "General Admission Pack"
  templates:
    - admission_checklist
    - initial_labs_order_set
    - nursing_assessment_template
    - attending_notification_task
```

#### 2. Parameterized Templates (Variables)
```yaml
surgical_prep_template:
  variables:
    - "{{SURGERY_TIME}}"
    - "{{ADMISSION_TIME}}"
    - "{{WARD}}"
    - "{{ATTENDING}}"
    - "{{ANESTHESIOLOGIST}}"
  auto_fill_from: patient_context
```

#### 3. Anchor-Time Scheduling
```yaml
task:
  title: "Pre-op antibiotics"
  anchor: "{{SURGERY_TIME}}"
  offset: "-60 minutes"
  reminder: "-10 minutes before due"
```

#### 4. Conditional Items
```yaml
condition_checks:
  - if: "patient.has_diabetes"
    then: add_task("glucose_monitoring_q4h")
  - if: "surgery.type == 'major'"
    then: add_checklist("dvt_prophylaxis")
  - if: "discharge.destination == 'rehab'"
    then: add_docs("rehab_documentation_pack")
```

#### 5. Task Gates (State Transition Requirements)
```yaml
stage: "in_surgery"
required_for_entry:
  - task: "surgical_consent_signed"
    status: completed
  - task: "site_marking_verified"
    status: completed
  - document: "pre_op_checklist"
    status: approved
blocked_message: "Cannot proceed to surgery without consent and site marking"
```

#### 6. Role-Based Assignment
```yaml
task:
  title: "Post-op check"
  assign_to_role: "resident_on_service"  # Resolved from roster
  escalate_to: "attending_on_call"
  escalation_after: "30 minutes"
```

#### 7. Template Versioning
```yaml
template:
  id: "admission_checklist"
  version: "3.2"
  status: "published"  # draft | published | deprecated
  published_at: "2026-01-15"
  applied_version_frozen: true  # Patient gets immutable copy
```

### Workflow Automation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AUTOMATION TRIGGER FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌────────────┐                                                            │
│   │  TRIGGER   │                                                            │
│   │  ────────  │                                                            │
│   │ • Patient  │                                                            │
│   │   created  │                                                            │
│   │ • State    │                                                            │
│   │   changed  │                                                            │
│   │ • Time     │                                                            │
│   │   event    │                                                            │
│   │ • Task     │                                                            │
│   │   completed│                                                            │
│   └─────┬──────┘                                                            │
│         │                                                                    │
│         ▼                                                                    │
│   ┌────────────┐    ┌────────────┐    ┌────────────┐    ┌────────────┐     │
│   │  EVALUATE  │───▶│  RESOLVE   │───▶│ MATERIALIZE│───▶│   NOTIFY   │     │
│   │ CONDITIONS │    │   ROLES    │    │ TASKS/DOCS │    │   OWNERS   │     │
│   └────────────┘    └────────────┘    └────────────┘    └────────────┘     │
│         │                                                      │            │
│         ▼                                                      ▼            │
│   ┌────────────┐                                        ┌────────────┐     │
│   │ IDEMPOTENT │                                        │   AUDIT    │     │
│   │   CHECK    │                                        │   TRAIL    │     │
│   │ (patient + │                                        │            │     │
│   │  stage +   │                                        │            │     │
│   │  template) │                                        │            │     │
│   └────────────┘                                        └────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Document Management System

### Document as Workflow Object

Documents are NOT just storage. They are workflow-controlled entities with:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DOCUMENT ENTITY MODEL                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   DOCUMENT RECORD                                                            │
│   ───────────────                                                            │
│   • patient_id           → Links to patient                                 │
│   • category             → Consent, Lab, Imaging, Note, Insurance           │
│   • subtype              → Specific document type                           │
│   • source               → Upload, Scan, Import, Generated                  │
│   • uploader_id          → Who uploaded                                     │
│   • uploaded_at          → When uploaded                                    │
│   • review_status        → Pending | Approved | Rejected | Expired          │
│   • reviewer_id          → Who reviewed                                     │
│   • reviewed_at          → When reviewed                                    │
│   • expiry_date          → Document validity period                         │
│   • workflow_stage       → Which stage requires this                        │
│   • linked_task_id       → Auto-created/resolved task                       │
│   • content_url          → S3 presigned URL                                 │
│   • audit_trail          → Full history                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Document States by Workflow Stage

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    DOCUMENT REQUIREMENTS VIEW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   Stage: PRE-OP                                        Progress: 3/5 ✓      │
│   ────────────────────────────────────────────────────────────────────      │
│                                                                              │
│   REQUIRED DOCUMENTS                                                         │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │ ✅ Surgical Consent        Approved     Dr. Smith    Jan 15, 10:30 │    │
│   │ ✅ H&P                     Approved     Dr. Jones    Jan 14, 14:00 │    │
│   │ ✅ Pre-op Labs             Uploaded     Auto-import  Jan 15, 08:00 │    │
│   │ ⏳ Anesthesia Consent      Pending Review            Jan 15, 09:45 │    │
│   │ ❌ Insurance Authorization Missing                   Due: Jan 15   │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│   ⚠️ Cannot proceed to surgery until all required documents approved        │
│                                                                              │
│   OPTIONAL DOCUMENTS                                                         │
│   ┌────────────────────────────────────────────────────────────────────┐    │
│   │ ○ Living Will              Not uploaded                            │    │
│   │ ○ Power of Attorney        Not uploaded                            │    │
│   └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Document Workflow Integration

```
Document uploaded
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Auto-create  │────▶│   Review     │────▶│   Approved   │
│ review task  │     │   pending    │     │              │
└──────────────┘     └──────────────┘     └──────┬───────┘
                            │                     │
                            ▼                     ▼
                     ┌──────────────┐     ┌──────────────┐
                     │   Rejected   │     │ Resolve gate │
                     │ (with reason)│     │ Check stage  │
                     └──────────────┘     │ requirements │
                            │             └──────────────┘
                            ▼
                     ┌──────────────┐
                     │ Create task: │
                     │ Re-upload    │
                     └──────────────┘
```

### Clinical Note Types to Support

| Note Type | Use Case |
|-----------|----------|
| Discharge Summary | Required for discharge |
| Consult Note | Specialist consultation |
| History & Physical | Admission documentation |
| Progress Note | Daily documentation |
| Procedure Note | Post-procedure documentation |
| Diagnostic Imaging Narrative | Radiology reports |
| Laboratory Report Narrative | Lab interpretations |
| Pathology Report Narrative | Pathology findings |
| Surgical Operation Note | Operative reports |
| Emergency Department Note | ED documentation |

---

## 7. Task Management System

### Unified Task Model

**Critical requirement:** ONE task model used everywhere - task board, patient pages, reminders, automation.

```yaml
task:
  # Identity
  id: uuid
  identifier: string  # Human-readable ID
  
  # Status (FHIR-aligned)
  status: draft | requested | received | accepted | rejected | 
          ready | cancelled | in-progress | on-hold | failed | completed
  business_status: string  # Custom workflow status
  
  # Classification
  intent: proposal | plan | order | original-order | reflex-order | 
          filler-order | instance-order | option
  priority: routine | urgent | asap | stat
  code: task_type_code  # From controlled vocabulary
  
  # Context
  focus_type: string  # What this task is about
  focus_id: uuid
  for_patient_id: uuid
  encounter_id: uuid
  
  # Timing
  authored_on: datetime
  last_modified: datetime
  due_date: datetime
  due_anchor: string  # e.g., "surgery_time"
  due_offset: duration  # e.g., "-2 hours"
  
  # Assignment
  requester_id: uuid
  owner_type: practitioner | practitioner_role | care_team | organization
  owner_id: uuid
  requested_performer_role: string  # Role to resolve
  
  # Content
  description: string
  note: text
  checklist_items: array
  
  # Workflow
  template_id: uuid
  template_version: string
  escalation_rules: object
  gate_for_stage: string
  
  # Audit
  created_by: uuid
  activity_log: array
```

### Task Board Views

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            TASK BOARD                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│  View: [Today Mode] [All Mode]                                              │
│  Group by: [Ward] [Patient] [Doctor] [Priority] [Type] [Flow]               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  🔴 OVERDUE (3)                    🟡 DUE SOON (5)           🟢 ON TRACK    │
│  ─────────────                     ────────────              ───────────    │
│  □ Post-op check - Rm 401         □ Labs review - Rm 405    □ Discharge    │
│    Due: 2h ago | STAT             Due: 30 min | Urgent      planning       │
│    Owner: Dr. Smith               Owner: Nursing            Due: Tomorrow   │
│                                                                              │
│  □ Consent form - Rm 402          □ PT eval - Rm 403        □ Follow-up    │
│    Due: 1h ago | Urgent           Due: 1h | Routine         call           │
│    Owner: Unassigned              Owner: PT Team            Due: 3 days    │
│                                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│  FLOW: Pre-Op (Ward A)                              Progress: 60% complete  │
│  ────────────────────────────────────────────────────────────────────────── │
│  ✅ H&P completed    ✅ Labs ordered    ⏳ Consent    ❌ Anesthesia eval    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Escalation Rules

```yaml
escalation:
  - condition: "overdue > 10 minutes AND priority == 'stat'"
    action: "notify_again"
    target: "current_owner"
    
  - condition: "overdue > 30 minutes AND priority == 'stat'"
    action: "escalate"
    target: "senior_on_call"
    notify: ["charge_nurse", "attending"]
    
  - condition: "overdue > 60 minutes"
    action: "escalate"
    target: "department_head"
    create_incident: true
    
  - always:
    action: "audit_log"
```

---

## 8. Access Control & Security

### RBAC + ABAC Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ACCESS CONTROL MODEL                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   RBAC (Role-Based)              +        ABAC (Attribute-Based)            │
│   ─────────────────                       ──────────────────────            │
│   • Attending                             • Active role?                    │
│   • Resident                              • Current shift?                  │
│   • Nurse                                 • On care team?                   │
│   • Student                               • Patient assigned?               │
│   • Support Staff                         • Encounter participant?          │
│   • Scheduler                             • Trainee year?                   │
│                                           • Supervision required?           │
│                                           • Confidentiality label?          │
│                                           • Purpose of use?                 │
│                                           • Consent restrictions?           │
│                                           • Emergency override?             │
│                                                                              │
│                              ┌───────────┐                                  │
│                              │  DECISION │                                  │
│                              │  ENGINE   │                                  │
│                              └─────┬─────┘                                  │
│                                    │                                         │
│                    ┌───────────────┼───────────────┐                        │
│                    ▼               ▼               ▼                        │
│              ┌─────────┐    ┌───────────┐   ┌──────────┐                   │
│              │ ALLOW   │    │ DENY      │   │ AUDIT    │                   │
│              └─────────┘    └───────────┘   └──────────┘                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Clinical Access Matrix

| Role | Assigned Patients | Unit Patients | All Patients | Notes |
|------|-------------------|---------------|--------------|-------|
| **Attending/Chief** | Full | Service-based | Break-glass | Can supervise |
| **Fellow** | Full | Service-based | Break-glass | Supervision varies |
| **Resident** | Full | Cross-cover | None | Requires supervision for some actions |
| **Intern** | Assigned only | Limited | None | Always supervised |
| **Student** | Read + draft | None | None | Cannot sign |
| **Nurse** | Full (care plan, meds, vitals) | Unit-based | None | |
| **Support Staff** | Minimum necessary | None | None | Service-specific |
| **Scheduler** | Demographics only | Demographics | Demographics | No clinical |

### Data Ownership Model

| Owner | Responsibilities |
|-------|------------------|
| **HR / Credentialing** | Legal identity, employment, licensure, active/inactive |
| **GME** | Resident year, rotations, supervising service |
| **Department Admin** | Role catalog, team templates, on-call approvals |
| **Nursing Admin** | Unit assignments, charge structure, float pool |
| **Clinical Ops** | Real-time coverage, emergency reassignment |
| **Privacy / HIM** | Consent exceptions, break-glass review |
| **IAM / Security** | User accounts, access policies, auth tokens |
| **Integration Team** | FHIR mappings, API publishing |

**Key Principle:** Department managers approve business need but do NOT directly grant chart permissions.

---

## 9. Production Readiness

### Current State Assessment

| Area | Production Bar | Current State | Status |
|------|----------------|---------------|--------|
| **Single source of truth** | One authoritative model | Split between local-ledger, REST API, architecture doc | ❌ Missing |
| **Patient lifecycle workflows** | Create/stage triggers tasks | Not implemented in command layer | ❌ Missing |
| **Templates/checklists/approvals** | Reusable pathways, gates | Not implemented | ❌ Missing |
| **Documents as workflow objects** | Structured with review states | Only `filesUrl` concept | ❌ Missing |
| **Offline + sync** | Local cache + cloud authority | Local-only blob, no multi-user sync | ⚠️ Partial |
| **Audit + undo** | Durable history, traceable | Good for task ops only | ⚠️ Partial |
| **Auth / permissions** | Real RBAC, secure identity | Hard-coded staff, local actor string | ❌ Missing |
| **Search / notifications** | Fast search, real reminders | Basic filters only | ❌ Missing |
| **UX consistency** | Same concepts everywhere | Board vs patient flows inconsistent | ⚠️ Partial |
| **Testing / observability** | E2E tests, monitoring | Some unit tests, incomplete smoke | ⚠️ Partial |

### Mobile Release Checklist

| Item | Ready State | Current |
|------|-------------|---------|
| Latest SDK (iOS/Android) | Xcode 26, API 35 | Not verified |
| Accessibility | Labels, focus, contrast | ⚠️ Partial |
| Adaptive layouts | Phone, tablet, foldable | ⚠️ Partial |
| Crash/perf monitoring | Crash reporting, vitals | ❌ Missing |
| Background/restore | Safe resume, network loss | ⚠️ Partial |
| Notifications | Push/local with permission UX | ❌ Missing |
| Security/privacy | Real auth, no PHI logging | ❌ Missing |

### Trust-Killing Issues to Fix

1. **PHI Logging:** `shared/lib/api.ts` logs patient data to console
2. **CDN Dependencies:** `sql.js` loaded from public CDN at runtime
3. **LocalStorage:** Web ledger persists state in localStorage
4. **No Real Auth:** Actor is a local string, not authenticated identity
5. **Demo Scaffolding:** Hard-coded doctors/nurses/places in production path

---

## 10. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)

**Goal:** Single source of truth for all data

```
Week 1-2: Unified Task Model
├── Consolidate REST API and local-ledger task models
├── Define canonical status values
├── Migrate all screens to single command pipeline
└── Remove duplicate constants

Week 3-4: Patient & Document Entities
├── Add patient operations to command layer
├── Create document_reference table
├── Link documents to patients and stages
└── Basic document upload/view
```

### Phase 2: Workflow Engine (Weeks 5-8)

**Goal:** Template-driven automation

```
Week 5-6: Template System
├── Template schema (personal/team/org)
├── Template versioning
├── Apply template with preview
└── Role-based assignment resolution

Week 7-8: Automation Engine
├── Patient state machine
├── Stage-change triggers
├── Task materialization
├── Document requirement gates
└── Escalation rules
```

### Phase 3: Trust Layer (Weeks 9-12)

**Goal:** Production security and reliability

```
Week 9-10: Authentication & Authorization
├── Cognito integration
├── PractitionerRole-based access
├── RBAC + ABAC engine
├── Remove demo scaffolding

Week 11-12: Sync & Audit
├── Cloud sync with outbox
├── Conflict resolution
├── Audit logging
├── Provenance tracking
└── Remove PHI logging
```

### Phase 4: Polish (Weeks 13-16)

**Goal:** Production-ready UX

```
Week 13-14: Mobile UX
├── Worklist-based navigation
├── Patient detail drawer
├── Quick actions
├── Offline indicators

Week 15-16: Testing & Monitoring
├── E2E workflow tests
├── Crash reporting
├── Performance monitoring
├── App store submission prep
```

### AWS Architecture Target

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AWS BACKEND ARCHITECTURE                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                              ┌──────────────┐                               │
│                              │   COGNITO    │                               │
│                              │  User Pools  │                               │
│                              │  + Identity  │                               │
│                              └──────┬───────┘                               │
│                                     │                                        │
│                                     ▼                                        │
│   ┌──────────────┐           ┌──────────────┐           ┌──────────────┐   │
│   │    CLIENT    │◀─────────▶│   APPSYNC    │◀─────────▶│   DYNAMODB   │   │
│   │  (RN App)    │  GraphQL  │   Events     │           │   + Streams  │   │
│   │              │  + Subs   │              │           │              │   │
│   └──────┬───────┘           └──────────────┘           └──────────────┘   │
│          │                                                                   │
│          │                   ┌──────────────┐                               │
│          └──────────────────▶│      S3      │                               │
│            Presigned URLs    │  (Documents) │                               │
│                              └──────────────┘                               │
│                                                                              │
│   LOCAL LAYER                                                                │
│   ───────────                                                                │
│   ┌──────────────┐           ┌──────────────┐                               │
│   │   SQLITE     │◀─────────▶│    OUTBOX    │───────▶ Sync to cloud        │
│   │ (Offline)    │           │              │                               │
│   └──────────────┘           └──────────────┘                               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Quick Reference

### FHIR Version Strategy

| Layer | Approach |
|-------|----------|
| Internal model | FHIR-aligned, resource-based, version-tagged |
| US interoperability | US Core + SMART (R4-based) |
| Staffing/schedule/task | Core FHIR + local profiles |

### Key Design Principles

1. **Person ≠ Role** — Stable `Practitioner`, time-bounded `PractitionerRole`
2. **One Source of Truth** — All screens use same domain model
3. **Documents are Workflow Objects** — Not storage pages
4. **Templates Drive Automation** — Patient state triggers task generation
5. **Local-First with Cloud Authority** — SQLite cache, server is truth
6. **FHIR-Aligned, Not FHIR-Native** — Clean relational now, FHIR mapping later

### Core Workflow Loop

```
Patient Created 
    → Pathway/Template Assigned 
    → Tasks/Checklists/Docs Materialized 
    → Ownership Assigned (via role resolution)
    → Completion Reviewed/Approved 
    → Stage Change Triggers Next Work 
    → Everything Syncs with Audit Trail
```

---

## References

| Resource | URL |
|----------|-----|
| FHIR R5 | hl7.org/fhir/ |
| US Core 8.0.1 | hl7.org/fhir/us/core/ |
| SMART App Launch | hl7.org/fhir/smart-app-launch/ |
| Apple App Review | developer.apple.com/app-store/review/guidelines/ |
| AWS Well-Architected | docs.aws.amazon.com/wellarchitected/ |
| HIPAA Security Rule | hhs.gov/hipaa/for-professionals/security/ |