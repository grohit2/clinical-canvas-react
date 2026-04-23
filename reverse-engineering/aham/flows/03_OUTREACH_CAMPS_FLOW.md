# AHAM Outreach Health Camps System -- Implementation Flow

> **Audience:** Junior developers building this system from scratch.
> **Stack:** Flutter/Dart, BLoC pattern, REST APIs, Veri5 Digital (Aadhaar KYC).
> **Module:** "Outreach Health Camps" -- hospital-run medical camps in underserved communities.
> **Last updated:** 2026-04-22

---

## Table of Contents

1. [Overview](#1-overview)
2. [Screen Mockups](#2-screen-mockups)
3. [Camp Lifecycle State Machine](#3-camp-lifecycle-state-machine)
4. [Patient Registration Flow](#4-patient-registration-flow)
5. [Aadhaar KYC Integration](#5-aadhaar-kyc-integration)
6. [Coordinator Management](#6-coordinator-management)
7. [BLoC Architecture](#7-bloc-architecture)
8. [Data Models](#8-data-models)
9. [Address Cascading](#9-address-cascading)
10. [Complete API Reference](#10-complete-api-reference)
11. [Screen Navigation Flow](#11-screen-navigation-flow)
12. [Validation Rules Matrix](#12-validation-rules-matrix)
13. [Error Handling Matrix](#13-error-handling-matrix)
14. [Offline Support](#14-offline-support)
15. [Edge Cases](#15-edge-cases)
16. [Implementation Checklist](#16-implementation-checklist)

---

## 1. Overview

### What Are Outreach Health Camps?

Hospitals run free or subsidized medical camps in underserved communities -- slums, villages, tribal areas. A team of doctors, nurses, and coordinators sets up a temporary clinic (often in a school, community hall, or mobile van), registers walk-in patients, does basic screenings, and refers serious cases to the main hospital.

The AHAM mobile app is the digital backbone for these camps. Coordinators use it to manage the camp lifecycle, register patients on the spot, verify identity via Aadhaar, assign doctors, and generate temporary IDs for patients who don't have a hospital MRN (Medical Record Number) yet.

### Why This Module Exists

Without digital registration, camp data is handwritten on paper forms. By the time staff return to the hospital and manually enter patient data, records are lost, duplicates are created, and follow-ups never happen. This module solves that by:

1. **Searching the Master Patient Index (MPI)** to detect existing patients and avoid duplicates.
2. **Generating temp IDs** for new patients so they can be tracked even before a hospital MRN is created.
3. **Capturing Aadhaar KYC** for identity verification (optional, feature-flagged).
4. **Assigning consultants** so each patient has a doctor linked at registration time.
5. **Managing camp lifecycle** so back-office systems know a camp is active, completed, or cancelled.

### Architecture At a Glance

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    OUTREACH HEALTH CAMPS ARCHITECTURE                        │
│                                                                              │
│  PRESENTATION LAYER (7 Screens)                                              │
│  ┌────────────────┐  ┌───────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ HomeScreen      │→│ OutreachHealth │→│ CampScreen   │→│ CampDetail   │  │
│  │ (entry point)   │  │ CampsScreen   │  │ (camp card)  │  │ Screen       │  │
│  └────────────────┘  └───────────────┘  └──────────────┘  └──────┬───────┘  │
│                                                                   │          │
│                          ┌────────────────────────────────────────┤          │
│                          ▼                                        ▼          │
│  ┌──────────────────────────┐  ┌───────────────┐  ┌──────────────────────┐  │
│  │ OutreachPatientsScreen   │  │ PatientReg    │  │ AadharAuthScreen     │  │
│  │ (patient list for camp)  │  │ Screen (form) │  │ (Aadhaar capture)    │  │
│  └──────────────────────────┘  └───────────────┘  └──────────────────────┘  │
│                                                                              │
│  BLOC LAYER (3 BLoCs)                                                        │
│  ┌───────────────────┐  ┌─────────────────────────┐  ┌──────────────────┐   │
│  │ OutreachCampsBloc │  │ PatientRegistrationBloc  │  │ AadharBloc       │   │
│  │ (3 events)        │  │ (9 events)               │  │ (1 event)        │   │
│  └────────┬──────────┘  └────────────┬─────────────┘  └────────┬─────────┘  │
│           │                          │                          │            │
│  SERVICE LAYER (5 internal + 1 external)                                     │
│  ┌────────┴──────────────────────────┴──────────────────────────┴─────────┐  │
│  │  PRM Service    MPI Service    MDM Service    AMB Service    DMS       │  │
│  │  (camps, pts,   (patient       (zipcodes,     (appointments, (document │  │
│  │   coordinators, search)        address)       overbooking)   upload/   │  │
│  │   temp IDs)                                                  download) │  │
│  │                                                                        │  │
│  │  External: Veri5 Digital (Aadhaar KYC extraction)                      │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  API LAYER (14 endpoints)                                                    │
│  PRM: 7 endpoints  |  MPI: 1  |  MDM: 1  |  AMB: 2  |  DMS: 2  | Veri5: 1 │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Screen Mockups

These are ASCII representations of each screen. Use them as a wireframe reference -- every element shown below corresponds to a real widget in the decompiled source.

### 2.1 OutreachHealthCampsScreen (Camp List)

```
┌──────────────────────────────────────────┐
│  ← Outreach Health Camps                 │
│──────────────────────────────────────────│
│  ┌──────────────────────────────────────┐│
│  │ 🏥 Camp: Free Eye Check-Up Camp     ││
│  │ Code: OHC-2026-0042                 ││
│  │ Date: 22 Apr 2026 - 22 Apr 2026     ││
│  │ Location: Govt. School, Mehdipatnam  ││
│  │ Status: [NOT_STARTED]               ││
│  │ Coordinators: 2  |  Patients: 0     ││
│  │                                      ││
│  │          [ START CAMP ]              ││
│  └──────────────────────────────────────┘│
│                                          │
│  ┌──────────────────────────────────────┐│
│  │ 🏥 Camp: General Health Screening    ││
│  │ Code: OHC-2026-0039                 ││
│  │ Date: 20 Apr 2026 - 20 Apr 2026     ││
│  │ Location: Community Hall, Tolichowki ││
│  │ Status: [IN_PROGRESS]               ││
│  │ Coordinators: 3  |  Patients: 47    ││
│  │                                      ││
│  │  [ VIEW PATIENTS ]  [ COMPLETE ]     ││
│  └──────────────────────────────────────┘│
│                                          │
│  ┌──────────────────────────────────────┐│
│  │ 🏥 Camp: Diabetes Awareness Drive    ││
│  │ Code: OHC-2026-0035                 ││
│  │ Status: [DONE]                      ││
│  │ Coordinators: 2  |  Patients: 112   ││
│  └──────────────────────────────────────┘│
└──────────────────────────────────────────┘
```

**Key behaviors:**
- Fetched via `FetchOutreachCamps` event on screen load.
- Camp cards show status-dependent action buttons (START for NOT_STARTED, VIEW PATIENTS/COMPLETE for IN_PROGRESS, read-only for DONE/CANCELLED).
- Pull-to-refresh re-fetches the list.

### 2.2 CampDetailScreen

```
┌──────────────────────────────────────────┐
│  ← Camp Details                          │
│──────────────────────────────────────────│
│                                          │
│  Camp Name:    Free Eye Check-Up Camp    │
│  Camp Code:    OHC-2026-0042             │
│  Camp Type:    General                   │
│  Schedule ID:  SCH-2026-0042             │
│  Start Date:   22 Apr 2026              │
│  End Date:     22 Apr 2026              │
│  Location:     Govt. School, Mehdipatnam │
│  Address:      Plot 12, Street 4...      │
│  Organization: NH Hospitals              │
│  Unit Code:    HYD01                     │
│  Status:       NOT_STARTED              │
│                                          │
│  ── Coordinators (2) ──────── [Manage] ──│
│  ┌──────────────────────────────────────┐│
│  │ Rajesh Kumar (EMP001) - Coordinator  ││
│  │ Priya Sharma (EMP002) - Nurse        ││
│  └──────────────────────────────────────┘│
│                                          │
│  ── Consultants (3) ─────────────────────│
│  ┌──────────────────────────────────────┐│
│  │ Dr. Anand Rao - Ophthalmology        ││
│  │ Dr. Meena Iyer - General Medicine    ││
│  │ Dr. Suresh K - Pediatrics            ││
│  └──────────────────────────────────────┘│
│                                          │
│         [ START CAMP ]                   │
│                                          │
└──────────────────────────────────────────┘
```

**Key behaviors:**
- "Manage" button opens `ManageCoordinatorsSheet` (bottom sheet).
- "START CAMP" button dispatches `StartCampEvent` and transitions camp to IN_PROGRESS.
- Once IN_PROGRESS, button changes to "VIEW PATIENTS" and "COMPLETE CAMP".

### 2.3 OutreachPatientsScreen (Patient List)

```
┌──────────────────────────────────────────┐
│  ← Patients (47)            [ + Add ]    │
│──────────────────────────────────────────│
│  ┌──────────────────────────────────────┐│
│  │ Temp-042-001 | Ramesh Babu           ││
│  │ M, 45 yrs | 9876543210              ││
│  │ Registered: 22 Apr 2026, 09:15 AM   ││
│  │ Consultant: Dr. Anand Rao            ││
│  │ Status: REGISTERED                   ││
│  └──────────────────────────────────────┘│
│  ┌──────────────────────────────────────┐│
│  │ UHID-HYD-00234 | Lakshmi Devi       ││
│  │ F, 62 yrs | 8765432109              ││
│  │ Registered: 22 Apr 2026, 09:32 AM   ││
│  │ Consultant: Dr. Meena Iyer           ││
│  │ Status: REGISTERED                   ││
│  └──────────────────────────────────────┘│
│  ┌──────────────────────────────────────┐│
│  │ ...                                  ││
│  └──────────────────────────────────────┘│
│                                          │
│  Showing 20 of 47          [Load More]   │
└──────────────────────────────────────────┘
```

**Key behaviors:**
- Fetched via `FetchCampPatientsEvent`.
- Each card shows either the temp ID (new patients) or UHID (existing patients).
- "+ Add" button navigates to `PatientRegistrationScreen`.
- Only visible when camp is IN_PROGRESS.

### 2.4 PatientRegistrationScreen

```
┌──────────────────────────────────────────┐
│  ← Register Patient                     │
│──────────────────────────────────────────│
│                                          │
│  ── Search Existing Patient ─────────────│
│  ┌──────────────────────────────────────┐│
│  │ [Search by Name / Phone / MRN]       ││
│  │                        [ Search ]    ││
│  └──────────────────────────────────────┘│
│  Search Results:                         │
│  ┌──────────────────────────────────────┐│
│  │ UHID-HYD-00234 | Lakshmi Devi       ││
│  │ F, 62 | 8765432109 | Active  [Select]│
│  └──────────────────────────────────────┘│
│  ┌──────────────────────────────────────┐│
│  │ No matching patient found.           ││
│  │        [ Register New Patient ]      ││
│  └──────────────────────────────────────┘│
│                                          │
│  ── Patient Details ─────────────────────│
│  First Name*:   [________________]       │
│  Middle Name:   [________________]       │
│  Last Name*:    [________________]       │
│  Gender*:       ( ) Male (•) Female ( ) Other│
│  Date of Birth*:[__ / __ / ____]         │
│  Mobile No*:    [________________]       │
│  Email:         [________________]       │
│                                          │
│  ── Address ─────────────────────────────│
│  Country*:      [India          ▼]       │
│  State*:        [Telangana      ▼]       │
│  District*:     [Hyderabad      ▼]       │
│  City*:         [Hyderabad      ▼]       │
│  Pincode*:      [500028         ▼]       │
│  Address:       [________________]       │
│                                          │
│  ── Aadhaar KYC (Optional) ─────────────│
│  [ Verify Aadhaar → ]                   │
│                                          │
│  ── Assign Consultant* ─────────────────│
│  Consultant:    [Dr. Anand Rao  ▼]       │
│                                          │
│         [ REGISTER PATIENT ]             │
│                                          │
└──────────────────────────────────────────┘
```

**Key behaviors:**
- MPI search is the first action. Selecting an existing patient auto-fills the form.
- New patient form appears when no match is found or user clicks "Register New Patient".
- Aadhaar KYC section only visible if `enable_aadhaar_registration` feature flag is true.
- Consultant assignment is mandatory -- registration fails without one.
- Address fields cascade: selecting Country loads States, selecting State loads Districts, etc.

### 2.5 ManageCoordinatorsSheet (Bottom Sheet)

```
┌──────────────────────────────────────────┐
│  Manage Coordinators                  ✕  │
│──────────────────────────────────────────│
│                                          │
│  ── Current Coordinators ────────────────│
│  ┌──────────────────────────────────────┐│
│  │ Rajesh Kumar (EMP001)        [ ✕ ]   ││
│  │ Priya Sharma (EMP002)        [ ✕ ]   ││
│  └──────────────────────────────────────┘│
│                                          │
│  ── Add Coordinator ─────────────────────│
│  ┌──────────────────────────────────────┐│
│  │ [Search by name / employee ID]       ││
│  │                        [ Search ]    ││
│  └──────────────────────────────────────┘│
│  Results:                                │
│  ┌──────────────────────────────────────┐│
│  │ Anita Reddy (EMP045)         [ + ]   ││
│  │ Sanjay Gupta (EMP078)        [ + ]   ││
│  └──────────────────────────────────────┘│
│                                          │
└──────────────────────────────────────────┘
```

**Key behaviors:**
- Remove (x) button is disabled on last remaining coordinator (min 1 rule).
- Add (+) dispatches `UpdateCoOrdinatorEvent` with `action: ADD`.
- Remove (x) dispatches `UpdateCoOrdinatorEvent` with `action: REMOVE`.

### 2.6 AadharAuthScreen

```
┌──────────────────────────────────────────┐
│  ← Aadhaar Verification                 │
│──────────────────────────────────────────│
│                                          │
│  ┌──────────────────────────────────────┐│
│  │ DISCLAIMER                           ││
│  │ Your Aadhaar information is being    ││
│  │ collected solely for identity        ││
│  │ verification purposes. It will be    ││
│  │ processed securely and not shared    ││
│  │ with unauthorized parties.           ││
│  └──────────────────────────────────────┘│
│                                          │
│  Aadhaar Number*: [____________]         │
│                                          │
│  ── Front Side ──────────────────────────│
│  ┌──────────────────────────────────────┐│
│  │                                      ││
│  │     [ Camera ]    [ Gallery ]        ││
│  │                                      ││
│  │     (or captured image preview)      ││
│  │                                      ││
│  └──────────────────────────────────────┘│
│                                          │
│  ── Back Side ───────────────────────────│
│  ┌──────────────────────────────────────┐│
│  │                                      ││
│  │     [ Camera ]    [ Gallery ]        ││
│  │                                      ││
│  │     (or captured image preview)      ││
│  │                                      ││
│  └──────────────────────────────────────┘│
│                                          │
│         [ VERIFY & EXTRACT ]             │
│                                          │
└──────────────────────────────────────────┘
```

**Key behaviors:**
- Front side must be captured before back side.
- Images are validated: JPG/PNG only, max 5MB.
- On success, extracted data (name, DOB, gender, address) auto-fills the registration form.
- On failure, user can manually enter data -- the flow does not block.

---

## 3. Camp Lifecycle State Machine

### State Diagram

```
                    ┌──────────────┐
                    │  NOT_STARTED │
                    │  (PLANNED)   │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │                         │
              ▼                         ▼
     ┌────────────────┐        ┌──────────────┐
     │  IN_PROGRESS   │        │  CANCELLED   │
     │  (ACTIVE)      │        │  (terminal)  │
     └────────┬───────┘        └──────────────┘
              │
              ▼
     ┌────────────────┐
     │     DONE       │
     │  (COMPLETED)   │
     │  (terminal)    │
     └────────────────┘
```

### Transition Rules

| From          | To            | Trigger                | Preconditions                              |
|---------------|---------------|------------------------|--------------------------------------------|
| NOT_STARTED   | IN_PROGRESS   | `StartCampEvent`       | Min 1 coordinator assigned                 |
| NOT_STARTED   | CANCELLED     | Admin action (backend) | No patients registered                     |
| IN_PROGRESS   | DONE          | Complete action        | Camp was actively running                  |
| DONE          | (none)        | --                     | Terminal state, no transitions allowed      |
| CANCELLED     | (none)        | --                     | Terminal state, no transitions allowed      |

### Critical Rules

1. **Forward-only transitions.** You cannot go backward (e.g., DONE back to IN_PROGRESS). The state machine is strictly one-directional.
2. **Only NOT_STARTED camps can be started.** The BLoC checks `camp.status == 'NOT_STARTED'` before dispatching `StartCampEvent`.
3. **Only IN_PROGRESS camps accept patient registrations.** The "+ Add" button on `OutreachPatientsScreen` is hidden or disabled for camps in any other state.
4. **Only IN_PROGRESS camps can be completed.** The "COMPLETE" button dispatches completion only when status is IN_PROGRESS.
5. **Coordinator minimum.** A camp cannot be started if it has zero coordinators. The UI blocks the START action and shows an error.

### Status Display Mapping

The backend sends status strings. The UI maps them to display labels and colors:

```
Backend String    UI Label        Color
──────────────    ────────        ─────
NOT_STARTED       Not Started     Grey
PLANNED           Planned         Grey  (alias for NOT_STARTED)
IN_PROGRESS       In Progress     Blue
ACTIVE            Active          Blue  (alias for IN_PROGRESS)
DONE              Completed       Green
COMPLETED         Completed       Green (alias for DONE)
CANCELLED         Cancelled       Red
```

---

## 4. Patient Registration Flow

This is the most complex flow in the module. It has 8 sequential steps, branching logic for existing vs. new patients, and optional Aadhaar verification.

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PATIENT REGISTRATION FLOW                              │
│                                                                             │
│  Step 1: MPI Search                                                         │
│  ┌─────────────────────────────────────────────────────────┐                │
│  │ User enters name / phone / MRN / Aadhaar                │                │
│  │ POST /mpi/api/search/patients                           │                │
│  └───────────────────────────┬─────────────────────────────┘                │
│                              │                                              │
│               ┌──────────────┴──────────────┐                               │
│               │                             │                               │
│               ▼                             ▼                               │
│  Step 2a: Patient Found             Step 2b: No Match                       │
│  ┌─────────────────────┐             ┌─────────────────────┐                │
│  │ Show search results │             │ "No results found"  │                │
│  │ User selects one    │             │ User taps "Register │                │
│  └──────────┬──────────┘             │ New Patient"        │                │
│             │                        └──────────┬──────────┘                │
│             ▼                                   │                           │
│  Step 3a: Eligibility Check                     ▼                           │
│  ┌─────────────────────┐             Step 3b: New Patient Form              │
│  │ BLOCKED → Error msg │             ┌─────────────────────┐                │
│  │ DECEASED → Error msg│             │ Fill: Name, Gender, │                │
│  │ MERGED → Error msg  │             │ DOB, Phone, Address │                │
│  │ ACTIVE → Proceed ✓  │             └──────────┬──────────┘                │
│  └──────────┬──────────┘                        │                           │
│             │                                   │                           │
│             └──────────────┬────────────────────┘                           │
│                            │                                                │
│                            ▼                                                │
│  Step 4: Duplicate Prevention                                               │
│  ┌─────────────────────────────────────────────────────────┐                │
│  │ Check if patient already registered in THIS camp        │                │
│  │ If yes → "Patient already registered" error             │                │
│  │ If no → Proceed                                         │                │
│  └───────────────────────────┬─────────────────────────────┘                │
│                              │                                              │
│                              ▼                                              │
│  Step 5: Consultant Assignment (MANDATORY)                                  │
│  ┌─────────────────────────────────────────────────────────┐                │
│  │ FetchConsultants event → load available doctors          │                │
│  │ User MUST select one before proceeding                  │                │
│  └───────────────────────────┬─────────────────────────────┘                │
│                              │                                              │
│                              ▼                                              │
│  Step 6: Camp Assignment                                                    │
│  ┌─────────────────────────────────────────────────────────┐                │
│  │ Link patient to camp via campId + campScheduleId        │                │
│  │ Final duplicate check before submission                  │                │
│  └───────────────────────────┬─────────────────────────────┘                │
│                              │                                              │
│                              ▼                                              │
│  Step 7: Aadhaar KYC (OPTIONAL, feature-flagged)                            │
│  ┌─────────────────────────────────────────────────────────┐                │
│  │ If enable_aadhaar_registration == true:                  │                │
│  │   Navigate to AadharAuthScreen                          │                │
│  │   Capture front + back → POST to Veri5 → extract data  │                │
│  │   Auto-fill form fields on success                      │                │
│  │   Manual fallback on failure                            │                │
│  │ If flag == false: Skip entirely                         │                │
│  └───────────────────────────┬─────────────────────────────┘                │
│                              │                                              │
│                              ▼                                              │
│  Step 8: Submit Registration                                                │
│  ┌─────────────────────────────────────────────────────────┐                │
│  │ a) POST /prm/api/outreach/patients (register patient)   │                │
│  │ b) POST /prm/api/outreach/temp-numbers (generate temp   │                │
│  │    ID for NEW patients)                                  │                │
│  │ c) POST /dms/api/document-records/upload (Aadhaar docs  │                │
│  │    if captured)                                          │                │
│  │ d) Return to patient list with success snackbar          │                │
│  └─────────────────────────────────────────────────────────┘                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Step-by-Step Detail

#### Step 1: MPI Search

The Master Patient Index (MPI) is the hospital's central patient database. Before registering anyone, you MUST search MPI to check if this person already has a record.

```
Event:    SearchPatientEvent(query: "Lakshmi", searchType: "name")
API:      POST /mpi/api/search/patients
Body:     { "searchCriteria": "name", "searchValue": "Lakshmi" }
States:   SearchPatientLoading → SearchPatientSuccess(results) / SearchPatientFailure(error)
```

**Search types supported:**
| Search Type | Example Input    | Notes                                    |
|-------------|------------------|------------------------------------------|
| Name        | "Lakshmi Devi"   | Partial match, case-insensitive          |
| Phone       | "9876543210"     | Exact 10-digit match                     |
| MRN/UHID    | "UHID-HYD-00234" | Exact match against hospital MRN         |
| Aadhaar     | "123456789012"   | Exact 12-digit match (if Aadhaar stored) |

#### Step 2: Patient Type Detection

After MPI search returns, the app determines the patient type:

- **Search returns results:** Display list. User taps one to select. Patient type = `EXISTING`.
- **Search returns empty:** Show "No results found" message with "Register New Patient" button. Patient type = `NEW`.

This distinction matters because:
- EXISTING patients already have a UHID. No temp ID is generated.
- NEW patients get a temp ID via the temp-numbers API.

#### Step 3a: Existing Patient Eligibility Check

When a user selects an existing patient from search results, the app checks the patient's `status` field:

```
Status Check Logic (client-side):
─────────────────────────────────
if (patient.status == "BLOCKED") {
    showError("Cannot select blocked MRN patient");
    return; // Do NOT proceed
}
if (patient.status == "DECEASED") {
    showError("Cannot select deceased MRN patient");
    return; // Do NOT proceed
}
if (patient.status == "MERGED") {
    showError("Cannot select merged MRN patient");
    return; // Do NOT proceed
}
// status == "ACTIVE" → proceed to Step 4
```

**Why these blocks exist:**
- BLOCKED: Patient account suspended (e.g., fraud, billing dispute). Cannot create new encounters.
- DECEASED: Patient has a recorded death date. New registrations make no sense.
- MERGED: This MRN was merged into another. Using it would create data inconsistency.

#### Step 3b: New Patient Form

If the user chooses to register a new patient, an empty form appears with these required fields:

| Field       | Type        | Required | Validation                                   |
|-------------|-------------|----------|----------------------------------------------|
| First Name  | Text        | Yes      | Min 3 characters, alphabets only             |
| Middle Name | Text        | No       | --                                           |
| Last Name   | Text        | Yes      | Min 3 characters, alphabets only             |
| Gender      | Radio       | Yes      | Male / Female / Other                        |
| DOB         | Date Picker | Yes      | Must be in the past                          |
| Mobile No   | Text        | Yes      | 10 digits, starts with 6/7/8/9              |
| Email       | Text        | No       | Standard email format                        |
| Country     | Dropdown    | Yes      | Cascading (see Section 9)                    |
| State       | Dropdown    | Yes      | Populated after country selection             |
| District    | Dropdown    | Yes      | Populated after state selection               |
| City        | Dropdown    | Yes      | Populated after district selection            |
| Pincode     | Dropdown    | Yes      | 6 digits, populated after city selection      |
| Address     | Text        | No       | Free-form street address                     |

#### Step 4: Duplicate Prevention

Before proceeding, the app checks if this patient (by patientId or phone number) is already registered in this specific camp.

```
Logic:
──────
campPatients = existing patients list for this campId
match = campPatients.firstWhere((p) => p.patientId == selectedPatient.id
                                    || p.mobileNumber == form.phone)
if (match != null) {
    showError("Patient already registered in this camp");
    return;
}
```

This is a client-side check using the already-fetched patient list. No additional API call is needed.

#### Step 5: Consultant Assignment (Mandatory)

Every patient must be assigned a consultant (doctor) at registration time. This is not optional.

```
Event:    FetchConsultants(campId: "camp-123")
States:   FetchConsultantsLoading → FetchConsultantsSuccess(consultants) / FetchConsultantsFailure
```

The consultant dropdown is populated from the camp's assigned consultants list. If no consultants are assigned to the camp, registration cannot proceed.

**Important:** The `consultantId` and `consultantName` are both required in the registration request. Omitting either causes a 400 error.

#### Step 6: Camp Assignment

The patient is linked to the camp via `campId` and `campScheduleId`. A final duplicate check runs on the server side during registration. If the server detects a duplicate, it returns an error and the client shows it.

#### Step 7: Aadhaar KYC (Optional)

See [Section 5](#5-aadhaar-kyc-integration) for complete details.

#### Step 8: Submit Registration

The final submission involves up to 3 sequential API calls:

```
Call 1: Register Patient
────────────────────────
POST /prm/api/outreach/patients
Body: PatientRegistrationRequestModel (see Data Models)
Response: { "patientId": "...", "campPatientId": "...", "status": "REGISTERED" }

Call 2: Generate Temp ID (NEW patients only)
────────────────────────────────────────────
POST /prm/api/outreach/temp-numbers
Body: { "campId": "camp-123", "patientName": "Ramesh Babu", "mobileNumber": "9876543210" }
Response: { "tempId": "Temp-042-001" }

Call 3: Upload Aadhaar Documents (if captured)
──────────────────────────────────────────────
POST /dms/api/document-records/upload
Body: multipart/form-data with front_image and back_image
Response: { "documentId": "...", "status": "UPLOADED" }
```

**On success:** Navigate back to `OutreachPatientsScreen`, show success snackbar, refresh patient list.

**On failure:** Show error message, keep form data intact so user can retry without re-entering.

---

## 5. Aadhaar KYC Integration

### What Is This?

Aadhaar is India's national biometric identity system. Every resident has a 12-digit Aadhaar number linked to their name, DOB, address, and biometrics. In health camps, staff capture images of a patient's Aadhaar card to verify identity and auto-fill registration data.

### Feature Flag

This entire feature is gated behind a Firebase Remote Config flag:

```
Flag name:     enable_aadhaar_registration
Default value: false
Type:          Boolean
```

When `false`, the Aadhaar section of the registration form is completely hidden. No UI elements are shown, no API calls are made.

### External Service: Veri5 Digital

The app uses Veri5 Digital, a third-party KYC provider, to extract data from Aadhaar card images.

```
Endpoint:   POST https://sandbox.veri5digital.com/video-id-kyc/api/1.0/docInfoExtract
Auth:       API key in headers (configured per environment)
Content:    multipart/form-data
Fields:     front_image (file), back_image (file)
Response:   {
              "aadhaarNumber": "123456789012",
              "name": "Lakshmi Devi",
              "dateOfBirth": "1964-03-15",
              "gender": "FEMALE",
              "address": "H.No. 4-5-67, Mehdipatnam, Hyderabad, Telangana 500028",
              "photo": "<base64-encoded-jpg>",
              "verified": true,
              "verificationTimestamp": "2026-04-22T09:15:00Z"
            }
```

**Note:** The URL contains `sandbox` -- this is the test environment. Production will use a different host.

### BLoC

```
AadharBloc
─────────
Event:   AuthenticateAadhar(frontImage: File, backImage: File, aadhaarNumber: String)
States:  AadharLoading → AadharSuccess(AadhaarResultModel) / AadharFailure(error)
```

This is a single-purpose BLoC with exactly one event. It is created and disposed within the `AadharAuthScreen` lifecycle.

### Flow

```
Step 1: Disclaimer
───────────────────
Show legal disclaimer about Aadhaar data collection.
User must see this before proceeding.

Step 2: Enter Aadhaar Number
────────────────────────────
12-digit numeric input.
Validation: exactly 12 digits, numeric only.

Step 3: Capture Front Image
───────────────────────────
Options: Camera (real-time capture) or Gallery (pick from device).
Validation: JPG or PNG only, max 5MB file size.
Preview: show captured image with re-capture option.

Step 4: Capture Back Image
──────────────────────────
Same options and validation as front.
BLOCKED until front image is captured (front-before-back rule).

Step 5: Submit to Veri5
───────────────────────
Dispatch AuthenticateAadhar event.
BLoC calls Veri5 API with both images.
Show loading indicator.

Step 6a: Success
────────────────
Extract AadhaarResultModel from response.
Auto-fill registration form fields:
  - aadhaarNumber → form.aadhaarNumber
  - name → split into firstName / lastName
  - dateOfBirth → form.dob
  - gender → form.gender
  - address → parse into form address fields (best-effort)
Navigate back to registration form with pre-filled data.

Step 6b: Failure
────────────────
Show error message (e.g., "Unable to extract Aadhaar details").
Allow manual entry: user goes back to registration form and types everything manually.
Aadhaar verification is NOT blocking -- registration can proceed without it.
```

### Validation Rules

| Rule                | Detail                                              |
|---------------------|-----------------------------------------------------|
| Aadhaar number      | Exactly 12 digits, numeric only                     |
| Front image format  | JPG or PNG                                           |
| Back image format   | JPG or PNG                                           |
| Image size          | Max 5MB per image                                    |
| Capture order       | Front must be captured before back is allowed        |
| Feature gate        | Entire flow hidden when remote config flag is false  |

---

## 6. Coordinator Management

### Why Coordinators Matter

Coordinators are hospital staff responsible for running the camp on the ground. They handle logistics, patient flow, and data entry. The system enforces a minimum of 1 coordinator at all times -- a camp without a coordinator is a camp without accountability.

### Add Coordinator Flow

```
Step 1: Open ManageCoordinatorsSheet (bottom sheet from CampDetailScreen)
Step 2: Search for staff member by name or employee ID
        Event: SearchCoOrdinatorEvent(query: "Anita")
        States: SearchCoOrdinatorsStateLoading → Success(results) / Error

Step 3: Select from search results, tap "+" button
        Event: UpdateCoOrdinatorEvent(
            request: UpdateCoordinatorRequest(
                campId: "camp-123",
                campScheduleId: "sch-123",
                coordinators: [selectedCoordinator],
                action: "ADD"
            )
        )
        API: PUT /prm/api/outreach-camp/update/coordinators
        Body: { "campId": "...", "campScheduleId": "...",
                "coordinators": [...], "action": "ADD" }

Step 4: On success, refresh coordinator list in the sheet.
```

### Remove Coordinator Flow

```
Step 1: In ManageCoordinatorsSheet, tap "x" next to coordinator name

Step 2: Check coordinator count
        if (currentCoordinators.length <= 1) {
            showError("Cannot remove the last coordinator");
            return; // Block removal
        }

Step 3: Dispatch removal
        Event: UpdateCoOrdinatorEvent(
            request: UpdateCoordinatorRequest(
                campId: "camp-123",
                campScheduleId: "sch-123",
                coordinators: [coordinatorToRemove],
                action: "REMOVE"
            )
        )
        API: PUT /prm/api/outreach-camp/update/coordinators
        Body: { "campId": "...", "campScheduleId": "...",
                "coordinators": [...], "action": "REMOVE" }

Step 4: On success, refresh coordinator list. Removed coordinator disappears.
```

### Data Flow

```
CoordinatorModel (from search)
│
├── fromJsonForSearch (factory variant)
│   Used when searching for staff to add.
│   Maps JSON with field names like "displayName", "mobileNo".
│
└── fromJson (standard factory)
    Used when loading existing coordinators from camp data.
    Maps JSON with field names like "name", "mobileNumber".

Note: The two JSON shapes exist because the search API and the camp API
return coordinator data in slightly different formats. The model handles
both via two factory constructors.
```

---

## 7. BLoC Architecture

### 7.1 OutreachCampsBloc

This BLoC manages the camp list and camp lifecycle transitions. It is the "parent" BLoC for the module.

```
OutreachCampsBloc
├── Events
│   ├── FetchOutreachCamps
│   │   Trigger: Screen load, pull-to-refresh
│   │   API: GET /prm/api/outreach-health-camps
│   │
│   ├── StartCampEvent(campId, campScheduleId)
│   │   Trigger: "START CAMP" button
│   │   API: (camp status update endpoint)
│   │   Precondition: camp.status == NOT_STARTED, coordinators.length >= 1
│   │
│   └── FetchCampPatientsEvent(campId)
│       Trigger: Entering OutreachPatientsScreen
│       API: GET /prm/api/outreach/patients?campId=xxx
│
├── States
│   ├── OutreachCampsInitial
│   │
│   ├── OutreachCampsLoading
│   │   → OutreachCampsLoaded(camps: List<CampModel>)
│   │   → OutreachCampsError(message: String)
│   │
│   ├── StartCampStateLoading
│   │   → StartCampStateSuccess(updatedCamp: CampModel)
│   │   → StartCampStateError4(message: String)
│   │
│   ├── FetchCampPatientsStateLoading
│   │   → FetchCampPatientsStateSuccess(patients: List<CampPatientsModel>)
│   │   → FetchCampPatientsStateError(message: String)
│   │
│   └── (Error states show SnackBar or inline error widget)
│
└── State Flow Diagram

    FetchOutreachCamps:
    Initial ──dispatch──→ OutreachCampsLoading ──success──→ OutreachCampsLoaded
                                                ──failure──→ OutreachCampsError

    StartCampEvent:
    Any ──dispatch──→ StartCampStateLoading ──success──→ StartCampStateSuccess
                                             ──failure──→ StartCampStateError4

    FetchCampPatientsEvent:
    Any ──dispatch──→ FetchCampPatientsStateLoading ──success──→ FetchCampPatientsStateSuccess
                                                     ──failure──→ FetchCampPatientsStateError
```

### 7.2 PatientRegistrationBloc

This is the largest BLoC in the module with 9 distinct events. It handles patient search, registration, coordinator management, address lookup, file operations, and appointment scheduling.

```
PatientRegistrationBloc
├── Events
│   ├── SearchPatientEvent(query, searchType)
│   │   API: POST /mpi/api/search/patients
│   │
│   ├── RegisterPatientEvent(PatientRegistrationRequestModel)
│   │   API: POST /prm/api/outreach/patients
│   │
│   ├── FetchConsultants(campId)
│   │   Loads available doctors for this camp
│   │
│   ├── SearchCoOrdinatorEvent(query)
│   │   API: Staff search for coordinator management
│   │
│   ├── UpdateCoOrdinatorEvent(UpdateCoordinatorRequest)
│   │   API: PUT /prm/api/outreach-camp/update/coordinators
│   │
│   ├── SearchZipCodesEvent(query, level)
│   │   API: GET /mdm/api/_search/zipcodes
│   │   Used for address cascading (Section 9)
│   │
│   ├── FetchOverBookingSlotsEvent(resourceCalendarId)
│   │   API: GET /amb/api/resource-calendars/over-booking
│   │
│   ├── FileDownloadEvent(documentId)
│   │   API: GET /dms/api/document-records/download
│   │
│   └── FileUploadEvent(file, metadata)
│       API: POST /dms/api/document-records/upload
│
├── States (each event has its own Loading/Success/Failure triplet)
│   ├── SearchPatientLoading → SearchPatientSuccess / SearchPatientFailure
│   ├── PatientRegistrationLoadingState → PatientRegistrationSuccess / PatientRegistrationFailure
│   ├── FetchConsultantsLoading → FetchConsultantsSuccess / FetchConsultantsFailure
│   ├── SearchCoOrdinatorsStateLoading → SearchCoOrdinatorsStateSuccess / SearchCoOrdinatorsStateError
│   ├── UpdateCoOrdinatorsStateLoading → UpdateCoOrdinatorsStateSuccess / UpdateCoOrdinatorsStateError
│   ├── SearchZipCodeLoading → SearchZipCodeSuccess / SearchZipCodeError
│   ├── FetchOverBookingSlotsStateLoading → FetchOverBookingSlotsStateSuccess / FetchOverBookingSlotsStateError
│   ├── FileDownloadLoading → FileDownloadSuccess / FileDownloadFailure
│   └── FileUploadLoading → FileUploadSuccess / FileUploadFailure
│
└── Notes
    - This BLoC is shared across PatientRegistrationScreen and ManageCoordinatorsSheet.
    - BlocListener in the UI reacts to each state type independently.
    - Multiple events can be in-flight simultaneously (e.g., FetchConsultants while
      user is typing in the address fields, triggering SearchZipCodesEvent).
```

### 7.3 AadharBloc

The simplest BLoC in the module. Single event, single success/failure outcome.

```
AadharBloc
├── Events
│   └── AuthenticateAadhar(frontImage: File, backImage: File, aadhaarNumber: String)
│       API: POST https://sandbox.veri5digital.com/video-id-kyc/api/1.0/docInfoExtract
│
├── States
│   ├── AadharInitial
│   ├── AadharLoading
│   ├── AadharSuccess(result: AadhaarResultModel)
│   └── AadharFailure(error: String)
│
└── Lifecycle
    - Created when AadharAuthScreen is pushed.
    - Disposed when AadharAuthScreen is popped.
    - NOT shared with other screens.
```

### BLoC Interaction Diagram

```
┌──────────────────────────┐
│   OutreachCampsBloc      │
│   (camp list + lifecycle)│
└──────────┬───────────────┘
           │
           │ CampModel passed to child screens
           │
           ▼
┌──────────────────────────┐        ┌──────────────────┐
│ PatientRegistrationBloc  │───────→│   AadharBloc     │
│ (patient CRUD, search,   │        │ (Aadhaar KYC)    │
│  coordinators, address,  │        │                  │
│  files, appointments)    │        │ Created on-demand│
└──────────────────────────┘        │ for Aadhaar flow │
                                    └──────────────────┘
```

---

## 8. Data Models

### 8.1 CampModel

The central model representing an outreach health camp.

| Field              | Type                 | Nullable | Description                                        |
|--------------------|----------------------|----------|----------------------------------------------------|
| campId             | String               | No       | Unique camp identifier (UUID)                      |
| campName           | String               | No       | Human-readable camp name                           |
| campCode           | String               | No       | System-generated code (e.g., OHC-2026-0042)        |
| campType           | String               | Yes      | Category (General, Eye, Dental, etc.)              |
| campScheduleId     | String               | No       | Schedule record ID (links to work pattern)         |
| campScheduleCode   | String               | Yes      | Human-readable schedule code                       |
| campScheduleStatus | String               | Yes      | Schedule-level status                              |
| status             | String               | No       | Camp status: NOT_STARTED/IN_PROGRESS/DONE/CANCELLED|
| startDate          | DateTime             | No       | Scheduled start date                               |
| endDate            | DateTime             | No       | Scheduled end date                                 |
| location           | String               | Yes      | Venue name (e.g., "Govt. School, Mehdipatnam")     |
| address            | String               | Yes      | Full address string                                |
| organizationId     | String               | No       | Parent hospital organization ID                    |
| unitCode           | String               | No       | Hospital unit code (e.g., HYD01)                   |
| coordinators       | List<CoordinatorModel>| No      | Assigned coordinators (min 1)                      |
| consultants        | List<ConsultantModel>| No       | Assigned doctors                                   |
| consultantCount    | int                  | Yes      | Number of assigned consultants                     |
| totalPatients      | int                  | Yes      | Count of registered patients                       |
| createdBy          | String               | Yes      | User who created the camp                          |
| createdAt          | DateTime             | Yes      | Creation timestamp                                 |
| updatedAt          | DateTime             | Yes      | Last update timestamp                              |
| workPatternId      | String               | Yes      | Links to scheduling work pattern                   |

### 8.2 CampPatientsModel

Represents a patient registered at a specific camp.

| Field              | Type     | Nullable | Description                                     |
|--------------------|----------|----------|-------------------------------------------------|
| campPatientId      | String   | No       | Unique registration record ID                   |
| campId             | String   | No       | Which camp this registration belongs to         |
| patientId          | String   | Yes      | MPI patient ID (null for brand-new patients)    |
| uhid               | String   | Yes      | Hospital MRN (null for new patients)            |
| tempId             | String   | Yes      | Temporary ID (null for existing patients)       |
| patientName        | String   | No       | Full display name                               |
| mobileNumber       | String   | No       | 10-digit phone number                           |
| age                | AgeDTO   | Yes      | Age object (years, months, days)                |
| gender             | String   | No       | MALE / FEMALE / OTHER                           |
| registeredAt       | DateTime | No       | Timestamp of registration                       |
| registeredBy       | String   | No       | Staff member who registered                     |
| status             | String   | No       | REGISTERED / COMPLETED / CANCELLED              |
| consultationStatus | String   | Yes      | PENDING / IN_PROGRESS / COMPLETED               |
| notes              | String   | Yes      | Free-form notes                                 |

**Key insight:** A patient will have EITHER `uhid` (existing) OR `tempId` (new), never both. The UI checks: `display = patient.uhid ?? patient.tempId ?? "N/A"`.

### 8.3 CoordinatorModel

| Field          | Type              | Nullable | Description                                   |
|----------------|-------------------|----------|-----------------------------------------------|
| coordinatorId  | String            | No       | Also mapped as `id`                           |
| name           | String            | No       | Also mapped as `displayName`                  |
| firstName      | String            | Yes      | Given name                                    |
| lastName       | String            | Yes      | Family name                                   |
| login          | String            | Yes      | System login ID                               |
| employeeNo     | String            | Yes      | Employee number (e.g., EMP001)                |
| mobileNumber   | String            | Yes      | Also mapped as `mobileNo`                     |
| email          | String            | Yes      | Email address                                 |
| designation    | String            | Yes      | Job title                                     |
| department     | String            | Yes      | Department name                               |
| role           | String            | Yes      | System role                                   |
| status         | String            | Yes      | ACTIVE / INACTIVE                             |
| unitCode       | String            | Yes      | Hospital unit code                            |
| organizationId | String            | Yes      | Organization ID                               |
| assignedCamps  | List<String>      | Yes      | Camp IDs this coordinator is assigned to      |

**Dual-factory pattern:**

```dart
// Standard factory -- used when loading coordinators from camp data
factory CoordinatorModel.fromJson(Map<String, dynamic> json) {
    return CoordinatorModel(
        coordinatorId: json['coordinatorId'],
        name: json['name'],
        mobileNumber: json['mobileNumber'],
        // ...
    );
}

// Search factory -- used when searching for staff to add as coordinators
factory CoordinatorModel.fromJsonForSearch(Map<String, dynamic> json) {
    return CoordinatorModel(
        coordinatorId: json['id'],          // different key!
        name: json['displayName'],          // different key!
        mobileNumber: json['mobileNo'],     // different key!
        // ...
    );
}
```

This dual-factory exists because two different APIs return coordinator data with different field names. The model abstracts this away so the rest of the app works with a single `CoordinatorModel` regardless of the source.

### 8.4 ConsultantModel

| Field          | Type         | Nullable | Description                               |
|----------------|--------------|----------|-------------------------------------------|
| consultantId   | String       | No       | Also mapped as `id`                       |
| name           | String       | No       | Also mapped as `displayName`              |
| firstName      | String       | Yes      | Given name                                |
| lastName       | String       | Yes      | Family name                               |
| login          | String       | Yes      | System login ID                           |
| employeeNo     | String       | Yes      | Employee number                           |
| specialization | String       | Yes      | Medical specialty (e.g., Ophthalmology)   |
| department     | String       | Yes      | Department name                           |
| designation    | String       | Yes      | Job title (e.g., Senior Consultant)       |
| mobileNumber   | String       | Yes      | Phone number                              |
| email          | String       | Yes      | Email address                             |
| status         | String       | Yes      | ACTIVE / INACTIVE                         |
| unitCode       | String       | Yes      | Hospital unit code                        |
| isActive       | bool         | Yes      | Whether currently available               |
| photo          | String       | Yes      | Profile photo URL                         |
| qualifications | List<String> | Yes      | Degrees (e.g., MBBS, MD, FRCS)           |

### 8.5 PatientRegistrationRequestModel

The request body sent when registering a patient. Note the mixed naming conventions (camelCase and snake_case).

| Field                | Type   | Nullable | Naming    | Description                           |
|----------------------|--------|----------|-----------|---------------------------------------|
| campId               | String | No       | camelCase | Target camp                           |
| campScheduleId       | String | No       | camelCase | Target schedule                       |
| patientId            | String | Yes      | camelCase | MPI ID (existing patients only)       |
| patientMrn           | String | Yes      | camelCase | UHID (existing patients only)         |
| patientFirstName     | String | No       | camelCase | First name                            |
| patientMiddleName    | String | Yes      | camelCase | Middle name                           |
| patientLastName      | String | No       | camelCase | Last name                             |
| patientName          | String | No       | camelCase | Full concatenated name                |
| gender               | String | No       | camelCase | MALE / FEMALE / OTHER                 |
| dateOfBirth          | String | No       | camelCase | ISO date format (YYYY-MM-DD)          |
| mobileNo             | String | No       | camelCase | 10-digit phone                        |
| email                | String | Yes      | camelCase | Email address                         |
| consultantId         | String | No       | camelCase | Assigned doctor ID                    |
| consultantName       | String | No       | camelCase | Assigned doctor name                  |
| address              | String | Yes      | camelCase | Street address                        |
| city                 | String | No       | camelCase | City name                             |
| state                | String | No       | camelCase | State name                            |
| district             | String | No       | camelCase | District name                         |
| country              | String | No       | camelCase | Country name                          |
| zipcode              | String | No       | camelCase | 6-digit pincode                       |
| aadhaarNumber        | String | Yes      | camelCase | 12-digit Aadhaar (if verified)        |
| document_front_image | String | Yes      | **snake_case** | Base64 or URL of Aadhaar front   |
| document_back_image  | String | Yes      | **snake_case** | Base64 or URL of Aadhaar back    |
| tempNumber           | String | Yes      | camelCase | Temp ID (server may assign)           |
| patientType          | String | No       | camelCase | `NEW` or `EXISTING`                   |

**Watch out:** The `document_front_image` and `document_back_image` fields use snake_case while everything else is camelCase. This is not a typo -- the backend API expects exactly these field names. If you "fix" the casing, the backend will silently ignore the images.

### 8.6 UpdateCoordinatorRequest

| Field          | Type                 | Description                               |
|----------------|----------------------|-------------------------------------------|
| campId         | String               | Target camp                               |
| campScheduleId | String               | Target schedule                           |
| coordinators   | List<CoordinatorModel>| Coordinator(s) to add or remove          |
| action         | String               | `ADD` or `REMOVE`                         |

### 8.7 RegistrationTempIdModel

| Field        | Type     | Description                                      |
|--------------|----------|--------------------------------------------------|
| tempId       | String   | Generated temporary ID (e.g., "Temp-042-001")    |
| patientName  | String   | Patient this temp ID belongs to                  |
| mobileNumber | String   | Patient's phone number                           |
| campId       | String   | Camp where this temp ID was generated            |
| createdAt    | DateTime | When the temp ID was generated                   |
| status       | String   | ACTIVE / CONVERTED (converted = MRN assigned)    |
| assignedUhid | String?  | The UHID once the temp ID is converted to a real MRN |

### 8.8 AadhaarResultModel

| Field                 | Type     | Description                                |
|-----------------------|----------|--------------------------------------------|
| aadhaarNumber         | String   | Extracted 12-digit Aadhaar number          |
| name                  | String   | Full name as on Aadhaar card               |
| dateOfBirth           | String   | DOB as on card (format varies)             |
| gender                | String   | MALE / FEMALE                              |
| address               | String   | Full address as on card (single string)    |
| photo                 | String   | Base64-encoded JPEG of Aadhaar photo       |
| verified              | bool     | Whether extraction was successful          |
| verificationTimestamp | DateTime | When the verification was performed        |

---

## 9. Address Cascading

### How It Works

The address section uses a cascading dropdown pattern. Each selection loads the options for the next level. The hierarchy is:

```
Country (top level)
  └── State
       └── District
            └── City
                 └── Pincode (bottom level)
```

### API Details

All address lookups use a single endpoint with different query parameters:

```
Endpoint: GET /mdm/api/_search/zipcodes
Query:    ?level=<level>&parent=<parentValue>&search=<searchTerm>
```

### Cascade Sequence

```
Step 1: User selects Country = "India"
        → Event: SearchZipCodesEvent(level: "state", parent: "India")
        → API: GET /mdm/api/_search/zipcodes?level=state&parent=India
        → Response: ["Telangana", "Andhra Pradesh", "Karnataka", ...]
        → State dropdown populated

Step 2: User selects State = "Telangana"
        → Event: SearchZipCodesEvent(level: "district", parent: "Telangana")
        → API: GET /mdm/api/_search/zipcodes?level=district&parent=Telangana
        → Response: ["Hyderabad", "Rangareddy", "Medchal-Malkajgiri", ...]
        → District dropdown populated

Step 3: User selects District = "Hyderabad"
        → Event: SearchZipCodesEvent(level: "city", parent: "Hyderabad")
        → API: GET /mdm/api/_search/zipcodes?level=city&parent=Hyderabad
        → Response: ["Hyderabad", "Secunderabad", ...]
        → City dropdown populated

Step 4: User selects City = "Hyderabad"
        → Event: SearchZipCodesEvent(level: "pincode", parent: "Hyderabad")
        → API: GET /mdm/api/_search/zipcodes?level=pincode&parent=Hyderabad
        → Response: ["500001", "500002", "500003", ..., "500100"]
        → Pincode dropdown populated

Step 5: User selects Pincode = "500028"
        → All address fields are now filled
        → Form validation for address section passes
```

### Reset Behavior

When a user changes an upstream value, all downstream values are cleared:

```
User changes Country → State, District, City, Pincode all reset to null
User changes State   → District, City, Pincode reset to null
User changes District→ City, Pincode reset to null
User changes City    → Pincode resets to null
```

This prevents invalid combinations (e.g., State=Telangana, City=Mumbai).

---

## 10. Complete API Reference

### 10.1 PRM Service (Patient Relationship Management) -- 7 Endpoints

#### GET /prm/api/outreach-health-camps

**Purpose:** Fetch list of all outreach health camps for the logged-in user's organization.

```
Headers:  Authorization: Bearer <token>
          X-Unit-Code: HYD01
Query:    ?status=<optional>&page=0&size=20
Response: {
  "data": [CampModel, CampModel, ...],
  "totalCount": 15,
  "page": 0,
  "size": 20
}
Errors:   401 Unauthorized, 500 Internal Server Error
BLoC:     OutreachCampsBloc → FetchOutreachCamps
```

#### GET /prm/api/outreach/patients

**Purpose:** Fetch patients registered in a specific camp.

```
Headers:  Authorization: Bearer <token>
Query:    ?campId=<campId>&page=0&size=20
Response: {
  "data": [CampPatientsModel, CampPatientsModel, ...],
  "totalCount": 47,
  "page": 0,
  "size": 20
}
Errors:   400 Bad Request (missing campId), 404 Camp Not Found
BLoC:     OutreachCampsBloc → FetchCampPatientsEvent
```

#### POST /prm/api/outreach/patients

**Purpose:** Register a patient at a camp.

```
Headers:  Authorization: Bearer <token>
          Content-Type: application/json
Body:     PatientRegistrationRequestModel (see Data Models section)
Response: {
  "campPatientId": "cp-uuid-123",
  "patientId": "pat-uuid-456",
  "tempId": "Temp-042-001",     // only for NEW patients
  "status": "REGISTERED"
}
Errors:   400 Validation Error, 409 Duplicate Registration, 404 Camp Not Found
BLoC:     PatientRegistrationBloc → RegisterPatientEvent
```

#### GET /prm/api/outreach/temp-numbers

**Purpose:** Fetch all generated temp IDs for a camp.

```
Headers:  Authorization: Bearer <token>
Query:    ?campId=<campId>
Response: {
  "data": [RegistrationTempIdModel, ...]
}
BLoC:     (used internally, no dedicated event)
```

#### POST /prm/api/outreach/temp-numbers

**Purpose:** Generate a new temporary ID for a newly registered patient.

```
Headers:  Authorization: Bearer <token>
          Content-Type: application/json
Body:     {
  "campId": "camp-123",
  "patientName": "Ramesh Babu",
  "mobileNumber": "9876543210"
}
Response: {
  "tempId": "Temp-042-001",
  "status": "ACTIVE"
}
Errors:   400 Bad Request
BLoC:     Called sequentially after successful patient registration
```

#### POST /prm/api/outreach-camp/create/work-pattern

**Purpose:** Create a work schedule for a camp (defines operating hours, days).

```
Headers:  Authorization: Bearer <token>
          Content-Type: application/json
Body:     {
  "campId": "camp-123",
  "startDate": "2026-04-22",
  "endDate": "2026-04-22",
  "workPattern": { ... }
}
Response: { "workPatternId": "wp-uuid-789" }
```

#### PUT /prm/api/outreach-camp/update/coordinators

**Purpose:** Add or remove coordinators from a camp.

```
Headers:  Authorization: Bearer <token>
          Content-Type: application/json
Body:     UpdateCoordinatorRequest (see Data Models section)
          {
            "campId": "camp-123",
            "campScheduleId": "sch-123",
            "coordinators": [{ ... }],
            "action": "ADD"    // or "REMOVE"
          }
Response: { "status": "SUCCESS", "coordinators": [...updated list...] }
Errors:   400 (removing last coordinator), 404 Camp Not Found
BLoC:     PatientRegistrationBloc → UpdateCoOrdinatorEvent
```

### 10.2 MPI Service (Master Patient Index) -- 1 Endpoint

#### POST /mpi/api/search/patients

**Purpose:** Search the hospital's central patient database.

```
Headers:  Authorization: Bearer <token>
          Content-Type: application/json
Body:     {
  "searchCriteria": "name",      // name | phone | mrn | aadhaar
  "searchValue": "Lakshmi"
}
Response: {
  "patients": [
    {
      "patientId": "pat-uuid-234",
      "uhid": "UHID-HYD-00234",
      "firstName": "Lakshmi",
      "lastName": "Devi",
      "gender": "FEMALE",
      "dateOfBirth": "1964-03-15",
      "mobileNumber": "8765432109",
      "status": "ACTIVE",           // ACTIVE | BLOCKED | DECEASED | MERGED
      "address": { ... }
    }
  ],
  "totalCount": 1
}
Errors:   400 Bad Request (invalid search criteria)
BLoC:     PatientRegistrationBloc → SearchPatientEvent
```

### 10.3 MDM Service (Master Data Management) -- 1 Endpoint

#### GET /mdm/api/_search/zipcodes

**Purpose:** Address hierarchy lookup (country/state/district/city/pincode).

```
Headers:  Authorization: Bearer <token>
Query:    ?level=state&parent=India&search=Tel
Response: {
  "data": ["Telangana"]
}
Errors:   400 Invalid level parameter
BLoC:     PatientRegistrationBloc → SearchZipCodesEvent
```

### 10.4 AMB Service (Ambulatory / Appointments) -- 2 Endpoints

#### POST /amb/api/_create/appointments/external

**Purpose:** Create an appointment for a camp patient at the main hospital (for follow-ups).

```
Headers:  Authorization: Bearer <token>
          Content-Type: application/json
Body:     {
  "patientId": "pat-uuid-456",
  "consultantId": "doc-uuid-789",
  "appointmentDate": "2026-04-25",
  "appointmentType": "OUTREACH_FOLLOWUP",
  "campId": "camp-123"
}
Response: { "appointmentId": "apt-uuid-012", "status": "SCHEDULED" }
```

#### GET /amb/api/resource-calendars/over-booking

**Purpose:** Check if a consultant's calendar allows overbooking (useful when camp generates more patients than normal slots allow).

```
Headers:  Authorization: Bearer <token>
Query:    ?resourceCalendarId=<id>&date=2026-04-25
Response: {
  "allowOverBooking": true,
  "maxOverBookingSlots": 5,
  "currentBookings": 12,
  "maxCapacity": 15
}
BLoC:     PatientRegistrationBloc → FetchOverBookingSlotsEvent
```

### 10.5 DMS Service (Document Management) -- 2 Endpoints

#### POST /dms/api/document-records/upload

**Purpose:** Upload Aadhaar card images (front/back).

```
Headers:  Authorization: Bearer <token>
          Content-Type: multipart/form-data
Body:     file: <binary image data>
          metadata: { "documentType": "AADHAAR", "patientId": "...", "side": "FRONT" }
Response: { "documentId": "doc-uuid-345", "url": "https://...", "status": "UPLOADED" }
BLoC:     PatientRegistrationBloc → FileUploadEvent
```

#### GET /dms/api/document-records/download

**Purpose:** Download a previously uploaded document.

```
Headers:  Authorization: Bearer <token>
Query:    ?documentId=<documentId>
Response: Binary file data (image/jpeg or image/png)
BLoC:     PatientRegistrationBloc → FileDownloadEvent
```

### 10.6 Veri5 Digital (External) -- 1 Endpoint

#### POST https://sandbox.veri5digital.com/video-id-kyc/api/1.0/docInfoExtract

**Purpose:** Extract information from Aadhaar card images using OCR + AI.

```
Headers:  X-API-Key: <veri5-api-key>
          Content-Type: multipart/form-data
Body:     front_image: <binary>
          back_image: <binary>
Response: AadhaarResultModel (see Data Models section)
Errors:   400 Invalid image, 401 Invalid API key, 422 Unprocessable (blurry image),
          429 Rate limited, 500 Veri5 server error
BLoC:     AadharBloc → AuthenticateAadhar
```

**Important:** This is a SANDBOX URL. Production deployments must use the production Veri5 endpoint. The API key is different per environment and must NOT be hardcoded in the app.

---

## 11. Screen Navigation Flow

### Complete Navigation Map

```
┌────────────────┐
│   HomeScreen   │
│   (app root)   │
└───────┬────────┘
        │ Tap "Outreach Health Camps" module
        ▼
┌──────────────────────────┐
│ OutreachHealthCampsScreen│
│ (camp list)              │
│                          │
│ Actions:                 │
│ - Tap camp card          │─────────────────────────────────────┐
│ - Pull to refresh        │                                     │
└──────────────────────────┘                                     │
                                                                 ▼
                                                    ┌────────────────────────┐
                                                    │    CampScreen          │
                                                    │    (camp card detail)  │
                                                    │                        │
                                                    │ Actions:               │
                                       ┌────────────│ - View details         │
                                       │            │ - Start camp           │
                                       │            │ - View patients        │
                                       │            └────────────────────────┘
                                       │                        │
                                       ▼                        │
                          ┌────────────────────────┐            │
                          │   CampDetailScreen     │            │
                          │   (full camp info)     │            │
                          │                        │            │
                          │ Actions:               │            │
                          │ - Manage coordinators  │──┐         │
                          │ - Start/Complete camp  │  │         │
                          └────────────────────────┘  │         │
                                                      │         │
                          ┌───────────────────────────┘         │
                          ▼                                     │
               ┌──────────────────────────┐                     │
               │ ManageCoordinatorsSheet  │                     │
               │ (bottom sheet overlay)   │                     │
               │                          │                     │
               │ Actions:                 │                     │
               │ - Search staff           │                     │
               │ - Add coordinator (+)    │                     │
               │ - Remove coordinator (x) │                     │
               │ - Dismiss sheet          │                     │
               └──────────────────────────┘                     │
                                                                │
                                                                ▼
                                                   ┌────────────────────────┐
                                                   │ OutreachPatientsScreen │
                                                   │ (patient list)        │
                                                   │                        │
                                                   │ Actions:               │
                                                   │ - View patient cards   │
                                              ┌────│ - Add patient (+)      │
                                              │    │ - Load more            │
                                              │    └────────────────────────┘
                                              │
                                              ▼
                                 ┌────────────────────────────┐
                                 │ PatientRegistrationScreen  │
                                 │ (search + form)            │
                                 │                             │
                                 │ Actions:                    │
                                 │ - Search MPI                │
                                 │ - Select existing patient   │
                                 │ - Fill new patient form     │
                                 │ - Select consultant         │
                                 │ - Verify Aadhaar (optional) │──┐
                                 │ - Submit registration        │  │
                                 └─────────────────────────────┘  │
                                                                   │
                                              ┌────────────────────┘
                                              ▼
                                 ┌────────────────────────────┐
                                 │    AadharAuthScreen        │
                                 │    (Aadhaar capture)       │
                                 │                             │
                                 │ Actions:                    │
                                 │ - Enter Aadhaar number      │
                                 │ - Capture front image       │
                                 │ - Capture back image        │
                                 │ - Submit for verification   │
                                 │ - Return with extracted data│
                                 └─────────────────────────────┘
```

### Navigation Method

All navigation uses Flutter's `Navigator.push` / `Navigator.pop` pattern. Data is passed forward via constructor arguments and returned backward via `Navigator.pop(context, result)`.

```
Forward data flow:
  CampModel → passed to CampDetailScreen, OutreachPatientsScreen
  CampModel + ConsultantList → passed to PatientRegistrationScreen
  (nothing) → AadharAuthScreen creates its own BLoC

Backward data flow:
  AadharAuthScreen → pops with AadhaarResultModel → PatientRegistrationScreen auto-fills form
  PatientRegistrationScreen → pops with success flag → OutreachPatientsScreen refreshes list
```

---

## 12. Validation Rules Matrix

### Patient Fields

| Field       | Rule                              | Error Message                               | When Checked       |
|-------------|-----------------------------------|---------------------------------------------|--------------------|
| First Name  | Min 3 characters, alpha only      | "First name must be at least 3 characters"  | Form submit        |
| Last Name   | Min 3 characters, alpha only      | "Last name must be at least 3 characters"   | Form submit        |
| Gender      | Must be selected                  | "Please select gender"                      | Form submit        |
| DOB         | Must be in the past               | "Date of birth must be in the past"         | Date picker close  |
| Phone       | 10 digits, starts with 6/7/8/9   | "Enter a valid 10-digit mobile number"      | Form submit        |
| Country     | Must be selected                  | "Please select country"                     | Form submit        |
| State       | Must be selected                  | "Please select state"                       | Form submit        |
| District    | Must be selected                  | "Please select district"                    | Form submit        |
| City        | Must be selected                  | "Please select city"                        | Form submit        |
| Pincode     | 6 digits                          | "Enter a valid 6-digit pincode"             | Form submit        |
| Consultant  | Must be selected                  | "Please select a consultant"                | Form submit        |

### Camp Fields

| Field        | Rule                             | Error Message                               | When Checked       |
|--------------|----------------------------------|---------------------------------------------|--------------------|
| Coordinators | Min 1 required                   | "At least one coordinator is required"      | Start camp         |
| Status       | Forward-only transitions         | (blocked by UI -- buttons hidden)           | State transition   |

### Aadhaar Fields

| Field        | Rule                             | Error Message                               | When Checked       |
|--------------|----------------------------------|---------------------------------------------|--------------------|
| Aadhaar No   | Exactly 12 digits, numeric       | "Enter a valid 12-digit Aadhaar number"     | Submit             |
| Front Image  | JPG/PNG, max 5MB                 | "Image must be JPG or PNG, under 5MB"       | Image capture      |
| Back Image   | JPG/PNG, max 5MB                 | "Image must be JPG or PNG, under 5MB"       | Image capture      |
| Front before back | Front must be captured first | "Please capture front side first"            | Back capture tap   |

### Phone Number Validation Logic

```dart
bool isValidPhone(String phone) {
    if (phone.length != 10) return false;
    if (!RegExp(r'^[6-9]').hasMatch(phone)) return false;
    if (!RegExp(r'^\d{10}$').hasMatch(phone)) return false;
    return true;
}
// Indian mobile numbers: 10 digits, first digit must be 6, 7, 8, or 9.
// Landlines and international numbers are not accepted.
```

---

## 13. Error Handling Matrix

### Camp-Level Errors (18 error scenarios)

| #  | Scenario                           | Source    | User Message                                    | Recovery Action                    |
|----|------------------------------------|-----------|-------------------------------------------------|------------------------------------|
| 1  | Camp list fetch fails              | API 500   | "Unable to load camps. Please try again."       | Pull-to-refresh                    |
| 2  | Camp list fetch timeout            | Network   | "Connection timed out. Check your network."     | Pull-to-refresh                    |
| 3  | Camp list empty                    | API 200   | "No camps found."                               | Informational, no action needed    |
| 4  | Start camp fails (no coordinators) | Client    | "At least one coordinator is required to start" | Add coordinator first              |
| 5  | Start camp fails (wrong status)    | Client    | (button hidden -- should not occur)             | --                                 |
| 6  | Start camp API error               | API 500   | "Failed to start camp. Please try again."       | Retry button                       |
| 7  | Complete camp API error            | API 500   | "Failed to complete camp. Please try again."    | Retry button                       |
| 8  | Patient list fetch fails           | API 500   | "Unable to load patients."                      | Pull-to-refresh                    |
| 9  | Patient list timeout               | Network   | "Connection timed out."                         | Pull-to-refresh                    |
| 10 | Patient list empty                 | API 200   | "No patients registered yet."                   | Informational                      |
| 11 | Add coordinator fails              | API 400   | "Failed to add coordinator."                    | Retry                              |
| 12 | Remove coordinator fails           | API 400   | "Failed to remove coordinator."                 | Retry                              |
| 13 | Remove last coordinator            | Client    | "Cannot remove the last coordinator."           | Blocked in UI                      |
| 14 | Coordinator search empty           | API 200   | "No staff found matching your search."          | Try different search term          |
| 15 | Coordinator search fails           | API 500   | "Search failed. Please try again."              | Retry search                       |
| 16 | Camp not found                     | API 404   | "Camp not found."                               | Navigate back to list              |
| 17 | Unauthorized                       | API 401   | Redirect to login                               | Re-authenticate                    |
| 18 | Session expired                    | API 403   | "Session expired. Please log in again."         | Re-authenticate                    |

### Registration-Level Errors (14 error scenarios)

| #  | Scenario                            | Source    | User Message                                     | Recovery Action                  |
|----|-------------------------------------|-----------|--------------------------------------------------|----------------------------------|
| 1  | MPI search fails                    | API 500   | "Patient search failed. Try again."              | Retry search                     |
| 2  | MPI search timeout                  | Network   | "Search timed out. Check connection."            | Retry search                     |
| 3  | MPI search empty                    | API 200   | "No patients found."                             | Register new patient             |
| 4  | Select BLOCKED patient              | Client    | "Cannot select blocked MRN patient."             | Select different patient         |
| 5  | Select DECEASED patient             | Client    | "Cannot select deceased MRN patient."            | Select different patient         |
| 6  | Select MERGED patient               | Client    | "Cannot select merged MRN patient."              | Select different patient         |
| 7  | Duplicate registration              | Client    | "Patient already registered in this camp."       | Go back to patient list          |
| 8  | No consultants available            | API 200   | "No consultants assigned to this camp."          | Admin must assign consultants    |
| 9  | Registration API fails              | API 500   | "Registration failed. Please try again."         | Retry (form data preserved)      |
| 10 | Registration validation error       | API 400   | Show server validation message                   | Fix form fields                  |
| 11 | Temp ID generation fails            | API 500   | "Could not generate temp ID."                    | Registration still saved; retry temp ID |
| 12 | Document upload fails               | API 500   | "Document upload failed."                        | Registration saved; retry upload |
| 13 | Aadhaar verification fails          | Veri5     | "Unable to extract Aadhaar details."             | Manual entry fallback            |
| 14 | Aadhaar invalid image               | Client    | "Image must be JPG or PNG, under 5MB."           | Re-capture image                 |

### BLoC Error States (10 states)

| BLoC                     | Error State                           | Triggers                                       |
|--------------------------|---------------------------------------|-------------------------------------------------|
| OutreachCampsBloc        | OutreachCampsError                    | Camp list fetch failure                         |
| OutreachCampsBloc        | StartCampStateError4                  | Camp start failure                              |
| OutreachCampsBloc        | FetchCampPatientsStateError           | Patient list fetch failure                      |
| PatientRegistrationBloc  | SearchPatientFailure                  | MPI search failure                              |
| PatientRegistrationBloc  | PatientRegistrationFailure            | Registration submission failure                 |
| PatientRegistrationBloc  | FetchConsultantsFailure               | Consultant list fetch failure                   |
| PatientRegistrationBloc  | SearchCoOrdinatorsStateError          | Coordinator search failure                      |
| PatientRegistrationBloc  | UpdateCoOrdinatorsStateError          | Coordinator add/remove failure                  |
| PatientRegistrationBloc  | SearchZipCodeError                    | Address lookup failure                          |
| AadharBloc               | AadharFailure                         | Aadhaar verification failure                    |

**Note on StartCampStateError4:** The "4" suffix is present in the actual decompiled code. It is likely a naming artifact from code generation or iteration. Do not "fix" it -- match the exact state name.

---

## 14. Offline Support

### What Is Confirmed

| Capability                    | Status    | Evidence                                                       |
|-------------------------------|-----------|----------------------------------------------------------------|
| Read cached camp list         | Confirmed | App shows previously loaded camps when offline                 |
| Read cached patient list      | Confirmed | Previously fetched patient lists remain visible                |
| Temp ID generation offline    | Inferred  | Temp IDs exist partly to handle offline scenarios              |
| Queue registrations for sync  | Inferred  | Temp ID model has `status: ACTIVE/CONVERTED` lifecycle         |
| Full offline-first CRUD       | NOT confirmed | No evidence of local database (ObjectBox/SQLite) for camps |

### Offline Behavior

```
ONLINE:
  All API calls execute normally.
  Data is cached in memory (BLoC state).

OFFLINE:
  Camp list: Shows last-fetched data from BLoC state.
  Patient list: Shows last-fetched data from BLoC state.
  New registration: LIKELY queued with temp ID for later sync.
  Start/Complete camp: BLOCKED (requires server state change).
  Coordinator changes: BLOCKED (requires server confirmation).
  Aadhaar KYC: BLOCKED (requires Veri5 API call).
  Address lookup: BLOCKED (requires MDM API call).

RECONNECT:
  Pull-to-refresh triggers fresh data fetch.
  Queued registrations (if any) sync to server.
  Temp IDs may be converted to real MRNs.
```

### Temp ID as Offline Bridge

The temp ID system appears designed to bridge the online/offline gap:

1. Patient walks into camp. No internet available.
2. Coordinator fills registration form and submits.
3. App generates a local temp ID (format: `Temp-{campCode}-{sequence}`).
4. Patient receives the temp ID as their "receipt" for the camp visit.
5. When internet is restored, registration syncs to server.
6. Server assigns a real UHID and the temp ID status changes to `CONVERTED`.
7. `assignedUhid` field on `RegistrationTempIdModel` is populated.

This is inferred from the data model structure. The exact offline queueing mechanism is not fully confirmed from the decompiled code.

---

## 15. Edge Cases

### Camp Lifecycle Edge Cases

| #  | Scenario                                        | Expected Behavior                                                        |
|----|-------------------------------------------------|--------------------------------------------------------------------------|
| 1  | User tries to start a camp with 0 coordinators  | UI blocks the action with error message. `StartCampEvent` not dispatched. |
| 2  | Two users start the same camp simultaneously    | First request succeeds. Second gets 409 Conflict or silent success (idempotent). |
| 3  | Camp end date is in the past but status is NOT_STARTED | Camp can still be started (no date-based auto-cancellation confirmed). |
| 4  | User force-kills app while camp is transitioning | Camp remains in previous state. Retry on next app open.                  |
| 5  | Backend status uses alias (PLANNED vs NOT_STARTED) | UI maps both to the same display. BLoC normalizes internally.           |

### Patient Registration Edge Cases

| #  | Scenario                                                | Expected Behavior                                                    |
|----|---------------------------------------------------------|----------------------------------------------------------------------|
| 6  | MPI search returns patient with status=MERGED           | Error: "Cannot select merged MRN patient". User must find the target MRN. |
| 7  | Patient has same name + phone but different person       | Duplicate check uses patientId, not name. Both can register if different patientIds. |
| 8  | Same patient registers at two different camps same day   | Allowed. Duplicate check is per-camp, not global.                    |
| 9  | Consultant becomes unavailable after selection           | Registration may fail on submission. User re-selects another consultant. |
| 10 | All consultants removed from camp after patient form opened | FetchConsultants returns empty. User cannot submit. Must add consultants first. |
| 11 | Aadhaar extraction returns name in different script (Hindi) | Name is used as-is. May need manual correction for English-only systems. |
| 12 | Aadhaar image is blurry                                 | Veri5 returns 422 or partial data. Fallback to manual entry.         |
| 13 | Patient registers, then camp is cancelled               | Patient record persists. No cascading delete of registrations.       |
| 14 | Phone number field gets international format (+91)       | Validation rejects. App expects 10-digit without country code.       |
| 15 | DOB entered as today's date                             | Validation may accept (newborn). Edge case -- consider UX guidance.  |

### Coordinator Edge Cases

| #  | Scenario                                                | Expected Behavior                                                    |
|----|---------------------------------------------------------|----------------------------------------------------------------------|
| 16 | Remove coordinator while camp is IN_PROGRESS            | Allowed (if not last coordinator). Does not affect existing registrations. |
| 17 | Same person added as coordinator twice                  | Backend should reject or deduplicate. Client should also check.      |
| 18 | Coordinator is also assigned as a consultant            | Allowed. Different roles, no conflict.                               |

### Aadhaar Edge Cases

| #  | Scenario                                    | Expected Behavior                                           |
|----|---------------------------------------------|-------------------------------------------------------------|
| 19 | Veri5 API is down                           | AadharFailure state. User falls back to manual entry.       |
| 20 | Aadhaar card is expired format (old design) | Veri5 may fail extraction. Manual entry fallback.           |
| 21 | Feature flag toggled mid-session            | Already-open screens keep current state. New navigations respect new flag value. |

---

## 16. Implementation Checklist

Use this checklist to track progress when building the Outreach Health Camps module from scratch.

### Phase 1: Data Models and Services

- [ ] Create `CampModel` with `fromJson` / `toJson`
- [ ] Create `CampPatientsModel` with `fromJson` / `toJson`
- [ ] Create `CoordinatorModel` with `fromJson` and `fromJsonForSearch` factories
- [ ] Create `ConsultantModel` with `fromJson` / `toJson`
- [ ] Create `PatientRegistrationRequestModel` with `toJson` (note snake_case fields)
- [ ] Create `UpdateCoordinatorRequest` with `toJson`
- [ ] Create `RegistrationTempIdModel` with `fromJson`
- [ ] Create `AadhaarResultModel` with `fromJson`
- [ ] Create `AgeDTO` model (years, months, days)
- [ ] Implement PRM API service (7 endpoints)
- [ ] Implement MPI API service (1 endpoint)
- [ ] Implement MDM API service (1 endpoint, zipcode search)
- [ ] Implement AMB API service (2 endpoints)
- [ ] Implement DMS API service (2 endpoints, multipart upload)
- [ ] Implement Veri5 API service (1 endpoint, external)
- [ ] Write unit tests for all model `fromJson` / `toJson` methods
- [ ] Write unit tests for API service methods (mock HTTP client)

### Phase 2: BLoC Layer

- [ ] Implement `OutreachCampsBloc` with 3 events and all state classes
- [ ] Implement `PatientRegistrationBloc` with 9 events and all state classes
- [ ] Implement `AadharBloc` with 1 event and all state classes
- [ ] Write BLoC unit tests (event → state transitions)
- [ ] Verify `StartCampStateError4` naming matches decompiled source exactly

### Phase 3: Screens -- Camp Management

- [ ] Build `OutreachHealthCampsScreen` (camp list with status-based action buttons)
- [ ] Build `CampScreen` (camp card detail, navigation hub)
- [ ] Build `CampDetailScreen` (full camp info, coordinator/consultant lists)
- [ ] Build `ManageCoordinatorsSheet` (bottom sheet, search + add/remove)
- [ ] Implement camp lifecycle buttons (START, COMPLETE) with precondition checks
- [ ] Implement pull-to-refresh on camp list
- [ ] Implement status badge coloring (grey/blue/green/red)

### Phase 4: Screens -- Patient Registration

- [ ] Build `OutreachPatientsScreen` (patient list with temp ID / UHID display)
- [ ] Build `PatientRegistrationScreen` (MPI search + registration form)
- [ ] Implement MPI search with 4 search types (name, phone, MRN, Aadhaar)
- [ ] Implement existing patient selection with eligibility checks (BLOCKED/DECEASED/MERGED)
- [ ] Implement new patient form with all required fields
- [ ] Implement address cascading (Country → State → District → City → Pincode)
- [ ] Implement cascading dropdown reset behavior
- [ ] Implement consultant dropdown (mandatory selection)
- [ ] Implement duplicate prevention check (per-camp)
- [ ] Implement form validation (all rules from Section 12)
- [ ] Implement registration submission (3 sequential API calls)
- [ ] Implement temp ID generation for new patients
- [ ] Implement success/error snackbar after registration

### Phase 5: Aadhaar KYC

- [ ] Set up Firebase Remote Config for `enable_aadhaar_registration` flag
- [ ] Build `AadharAuthScreen` (disclaimer, number input, image capture)
- [ ] Implement camera/gallery image picker
- [ ] Implement image validation (format, size, capture order)
- [ ] Implement Veri5 API integration
- [ ] Implement auto-fill from Aadhaar extraction result
- [ ] Implement manual entry fallback on extraction failure
- [ ] Conditionally show/hide Aadhaar section based on feature flag
- [ ] Implement document upload to DMS after registration

### Phase 6: Error Handling and Edge Cases

- [ ] Implement all 18 camp-level error scenarios
- [ ] Implement all 14 registration-level error scenarios
- [ ] Implement all 10 BLoC error states with appropriate UI feedback
- [ ] Handle network timeout gracefully (show retry options)
- [ ] Handle 401/403 with redirect to login
- [ ] Implement form data preservation on registration failure (no data loss)
- [ ] Test all edge cases from Section 15

### Phase 7: Offline Support

- [ ] Implement in-memory caching of camp list and patient list
- [ ] Investigate and implement temp ID offline generation (if confirmed)
- [ ] Implement network status detection
- [ ] Disable server-dependent actions when offline (start camp, coordinator changes, Aadhaar)
- [ ] Implement sync-on-reconnect for queued registrations (if applicable)

### Phase 8: Integration Testing

- [ ] End-to-end test: Browse camps → Start camp → Register existing patient → Complete camp
- [ ] End-to-end test: Register new patient with Aadhaar KYC → Verify auto-fill → Submit
- [ ] End-to-end test: Add coordinator → Remove coordinator → Verify min-1 enforcement
- [ ] End-to-end test: Address cascading → Change state midway → Verify downstream reset
- [ ] Test with feature flag `enable_aadhaar_registration` = true and false
- [ ] Test with no network connectivity (offline scenarios)
- [ ] Test concurrent camp operations (multiple users)

---

*This document was generated from decompiled analysis of the AHAM Flutter application. Field names, state class names (including `StartCampStateError4`), and API paths are exact matches from the source code. Implementation should preserve these exact names for compatibility.*
