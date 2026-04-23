# Patient Hub

> The central screen where doctors and nurses manage their assigned patients.

---

## 1. Landing Dashboard

When a user logs in, they see 4 cards:

```
+---------------------+  +---------------------+
|   INPATIENTS        |  |   APPOINTMENTS      |
|   12 patients       |  |   5 today           |
|   [Tap to open]     |  |   [Tap to open]     |
+---------------------+  +---------------------+
+---------------------+  +---------------------+
|   ACTIVITY AREA     |  |   DISCHARGED        |
|   8 pending tasks   |  |   3 recent          |
|   [Tap to open]     |  |   [Tap to open]     |
+---------------------+  +---------------------+
```

**Business logic:**
- Inpatients = patients assigned to this doctor/nurse
- Appointments = today's video/physical consultations
- Activity Area = pending tasks across 6 categories (notes acknowledgment, discharge summary, initial assessment review, checklist approval, cross-consultation, discharge signoff)
- Discharged = recently discharged patients (for follow-up documentation)

---

## 2. Patient List (Home Screen)

### What the user sees

Each patient card shows:

```
+----------------------------------------------------------+
| [Avatar]  John Smith  M | 45y | 72kg           [Pin] [3] |
|           Dr. ABC  |  ICU Bed 5                           |
|           MRN: 123456                          RS: 42     |
|           [MFD] [MLC] [ER]  [Diabetes] [Hypertension]    |
+----------------------------------------------------------+
```

| Element | Meaning |
|---------|---------|
| Avatar | Color-coded: Red = ICU, Blue = General ward |
| Name | Patient name (titles like Mr./Dr. stripped) |
| M/45y/72kg | Gender, Age, Weight |
| Dr. ABC | Primary consultant (3-letter abbreviation) |
| ICU Bed 5 | Current ward and bed location |
| MRN | Medical Record Number (unique ID) |
| RS: 42 | Risk Score (red if >= 33, black if < 33) |
| Pin icon | Pinned patients always appear at top |
| [3] badge | Unread message count |
| MFD | Marked For Discharge |
| MLC | Medico-Legal Case |
| ER | Emergency admission (DC = Daycare) |
| Comorbidity badges | Up to 3 shown, "+N" for more |

### Sorting (4 options)

User taps sort icon and cycles through:

```
Sort by Name        A→Z  |  Z→A
Sort by Admission   Old→New | New→Old
Sort by Bed Number  Low→High | High→Low
Sort by Risk Score  Low→High | High→Low
```

Each column has 3 states: None → Ascending → Descending → None

### Filtering (9 dimensions)

The filter panel lets users narrow the patient list:

```
FILTER PANEL
|-- Location (multi-select wards/beds)
|-- Ward (ICU vs General)
|-- Unit (department/organization)
|-- Primary Consultant (multi-select doctors)
|-- Attending Consultant (multi-select)
|-- Visit Type (Daycare / Emergency / Regular)
|-- Discharge Intimation (Yes / No)
|-- MLC / MFD (toggle)
|-- Dead / Absconded (toggle)
```

Each filter has: Select All, Search, Indeterminate state (partially selected).
Filters persist across sessions.

### Search

Real-time search as user types. Matches on:
- Patient name
- MRN
- Consultant name

### Adding a Patient

```
Doctor taps [+] button
    |
    v
Search by name/MRN  ----OR----  Scan QR barcode
    |                               |
    v                               v
Select from results          Camera scans barcode
    |                               |
    +-------------------------------+
    |
    v
Swipe to confirm add
    |
    v
Patient appears in list
(Messages and data download in background)
```

### Patient Handover

When a doctor goes off-shift, they can transfer patients:

```
Doctor long-presses patient(s)
    |
    v
Multi-select mode activated
    |
    v
Tap "Handover" button
    |
    v
Search for receiving consultant
    |
    v
Confirm handover
    |
    v
Receiving doctor sees "Handover Request"
    |
    +----> [Accept] --> Patient transfers to new doctor
    |
    +----> [Reject] --> Patient stays with original doctor
```

---

## 3. Patient Chat

Tapping a patient opens their chat view — the primary interaction screen.

### Message Types Supported

| Type | What it looks like | Who sends it |
|------|-------------------|-------------|
| **Text** | Plain text bubble | Doctor/Nurse |
| **Image** | Photo thumbnail (tap to zoom) | Doctor/Nurse |
| **Audio** | Play button with waveform | Doctor/Nurse |
| **Video** | Video thumbnail with play | Doctor/Nurse |
| **PDF/Document** | File icon with name | Doctor/Nurse |
| **Lab Result** | Test name + value + flag | System (auto) |
| **Radiology Result** | Study name + images | System (auto) |
| **Medication Order** | Drug name + dosage | System (auto) |
| **Progress Notes** | Note preview + status badge | System (auto) |
| **Discharge Summary** | Summary preview + status | System (auto) |
| **Admission Message** | Admission details | System (auto) |
| **Discharge Intimation** | Discharge notification | System (auto) |
| **Cross-Consultation** | Referral with priority | System (auto) |
| **Bed Transfer** | Transfer notification | System (auto) |

### Message Actions

```
Long-press on message
    |
    +----> [Star]    -- Bookmark for quick access
    +----> [Reply]   -- Reply with context card showing original
    +----> [Delete]  -- Soft delete (cannot delete starred messages)
```

### Starred Messages

Separate view accessible from patient chat header. Shows all bookmarked messages across the patient's history. Useful for flagging critical information.

### Chat Timeline

Messages grouped by date:
- **Today** / **Yesterday** / **15 April 2026**
- Each message shows: sender name, time (HH:MM), delivery status

### Offline Behavior

```
User sends message while offline
    |
    v
Message saved locally with "Pending" status
    |
    v
Phone reconnects to internet
    |
    v
All pending messages automatically sent
    |
    v
Status updates to "Sent"
```

---

## 4. Patient Details (Group Info)

Accessible from the chat screen header. Shows comprehensive patient information in tabs:

### Tab 1: Info (Read-only)

```
Patient Name:     John Smith
Gender / Age:     Male | 45 years
Weight:           72 kg
MRN:              123456
Primary Consultant: Dr. Sharma
Attending:        Dr. Patel
Admission Date:   15-Apr-2026 10:30
Admission Number: ADM-2026-789
Unit:             Cardiology ICU
Location:         Bed 5
```

### Tab 2: Tags (Editable)

Doctors can add up to **2 custom labels** per patient (max 30 characters each).
Examples: "NPO after 10pm", "Family meeting pending"

System labels (auto-generated) are read-only.

### Tab 3: Comorbidities (Editable)

Toggle chronic conditions on/off per patient:

| Code | Condition | Active? |
|------|-----------|---------|
| C | Cancer | No |
| H | Hypertension | Yes |
| K | Kidney Impairment | No |
| D | Diabetes | Yes |
| S | Stroke | No |
| T | Thyroid Disease | No |
| P | Pulmonary Impairment | No |
| L | Liver Impairment | No |

Changes save to the patient's initial assessment record.

### Tab 4: Patient Criticality (ICU only)

Dropdown: **None** / **Low** / **Medium** / **High**

Disabled for non-ICU patients. Helps prioritize attention.

### Tab 5: Care Team (Editable)

```
PRIMARY CONSULTANT
  Dr. Sharma (locked, cannot change here)

CARE TEAM MEMBERS
  [Crown] Dr. Patel (Admin)          [x]
  Nurse Priya (Nurse)                [x]
  Dr. Kumar (Doctor)                 [x]
  [+ Search and add member]

LOCK TEAM  [Toggle]
  (Only primary consultant can lock/unlock)

[Exit Group] -- Remove yourself from team
```

Roles: Doctor, Nurse, Paramedics
Admin flag: Crown icon, can manage other members
Lock: When locked, non-PC members cannot modify the team.

---

## 5. Risk Scoring

### Risk Score Display

Accessible from patient chat or patient list.

**Gauge View:**
```
        ___________
      /     42%     \
     |   [needle]    |
      \             /
       \___________/
     Low   Avg   High
     0-30  30-70  70-100

AI Prediction:
  Length of Stay: 5 days
  Summary: "Patient shows elevated..."
```

**Trend Graph (D3.js):**

Interactive line chart showing risk score over time.
- X-axis: Time (hours/dates)
- Y-axis: Score (0-100)
- Color: Green when < 33, Red when >= 33
- Scrollable to see historical data

**Parameter Drill-down:**

Each risk parameter can be explored individually:
- Heart Rate contribution
- Lab value contributions
- Vital sign contributions
- Each with its own trend line

---

## 6. Cross-Consultation

When a doctor needs a specialist opinion:

```
Doctor opens Cross-Consultation
    |
    v
Search for target department
    |
    v
Search for specialist doctor in that department
    |
    v
Add remarks (clinical reason)
    |
    v
Set priority: Normal or URGENT
    |
    v
Submit
    |
    v
Target doctor receives notification
    |
    v
Cross-consultation appears in both doctors' views
```

Validation: Cannot request consultation from yourself. Cannot select same doctor as primary consultant.

---

## 7. Patient Communication (Family Messaging)

For communicating with patient families:

```
Doctor opens Patient Communication
    |
    v
View message history (grouped by date)
    |
    v
Type message (max 150 characters)
    |
    v
Confirmation alert: "Are you sure?"
    |
    v
Message sent to patient/family
    |
    v
Auto-refresh every 10 seconds
```

**IVR Calls (India only):**

```
Doctor taps IVR icon
    |
    v
Select bystander from list
    |
    v
System initiates automated phone call
connecting doctor's number to family member's number
```

---

## Key User Journeys

### Journey 1: Morning Round

```
Login --> Landing (see 12 inpatients)
  --> Patient List (filter by ICU)
    --> Tap patient "John Smith"
      --> Read overnight lab results (auto-posted to chat)
      --> Check vital trends (chart shows BP trending up)
      --> Write progress notes
      --> Order new investigation
      --> Move to next patient
```

### Journey 2: Incoming Handover

```
Login --> Landing (notification: "3 handover requests")
  --> Handover modal
    --> Review patient "Jane Doe" details
    --> [Accept] -- Patient appears in my list
    --> Review patient "Bob Brown"
    --> [Reject] -- Patient stays with previous doctor
```

### Journey 3: Emergency Communication

```
Patient chat --> Take photo of wound
  --> Send image message
  --> Star the message for shift handover
  --> Request cross-consultation with Surgeon
  --> Set priority: URGENT
```
