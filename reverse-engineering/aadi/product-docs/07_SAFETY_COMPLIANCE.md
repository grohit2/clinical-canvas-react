# Safety & Compliance

> Patient safety features: pre-anesthesia assessment, incident reporting, drug safety, and discharge management.

---

## 1. Pre-Anesthesia Checkup (PAC)

### What Is PAC?

A comprehensive assessment done before any surgery requiring anesthesia. It evaluates the patient's fitness for the procedure and the anesthetic plan.

### Assessment Sections

```
PRE-ANESTHESIA CHECKUP
|
|-- General Examination
|   (Records, abnormality detection, notes)
|
|-- Systemic Examination (6 systems)
|   |-- Respiratory
|   |-- CNS & Musculoskeletal
|   |-- Endocrine
|   |-- Cardiovascular
|   |-- Hepatic & Renal
|   |-- Others
|
|-- Airway Assessment
|   |-- Mouth Opening
|   |-- Teeth (normal/remarks)
|   |-- Neck Movements & Spine
|   |-- Intubation Difficulty
|   |-- MET Score
|   |-- DVT Risk Assessment
|   |-- ASA Score (I through VI)
|
|-- Impressions
|   |-- ECG Impression
|   |-- Echo Impression
|   |-- X-ray Impression
|   |-- Previous Anesthesia History
|
|-- Anesthesia Plan
|   |-- Plan Type (from value set)
|   |-- Post-Op ICU Required? (yes/no + remarks)
|   |-- Blood Products Required? (yes/no + remarks)
|   |-- NPO Hours (nil per os)
|
|-- Advice & Remarks
|
|-- Final Status: CLEARED / RE-EVALUATION REQUIRED / NOT CLEARED
```

### ASA Classification Reference

| Score | Description | Example |
|-------|-------------|---------|
| **I** | Normal healthy patient | Healthy 25-year-old |
| **II** | Mild systemic disease | Controlled hypertension |
| **III** | Severe systemic disease | Poorly controlled diabetes |
| **IV** | Constant threat to life | Recent heart attack |
| **V** | Moribund, may not survive | Ruptured aortic aneurysm |
| **VI** | Brain-dead | Organ donation |

### Version Control

Every PAC update creates a **new version**:

```
V.1 (15 Apr) - Initial assessment by Dr. Kumar
V.2 (16 Apr) - Updated after new lab results
V.3 (17 Apr) - Final clearance (Current)

User can view any historical version
Only latest version is editable
```

### Permission Control

Only users with specific PAC authorities can edit. Others see read-only view.

---

## 2. Incident Reporting

### What Can Be Reported?

Any patient safety incident, near-miss, or adverse event.

### Report Form

```
+------------------------------------------+
|  INCIDENT REPORT                         |
|                                          |
|  Patient: John Smith (MRN: 123456)       |
|  Gender: M | Age: 45y | Weight: 72kg    |
|                                          |
|  UPLOAD ATTACHMENTS (0/5)                |
|    [+ Take Photo]  [+ From Gallery]      |
|                                          |
|    (No attachments yet)                  |
|                                          |
|  DESCRIPTION *                           |
|  +------------------------------------+  |
|  | Patient experienced a fall while   |  |
|  | attempting to walk to bathroom     |  |
|  | unassisted at approximately        |  |
|  | 3:30 AM. No visible injuries.      |  |
|  | Patient alert and oriented.        |  |
|  +------------------------------------+  |
|  (Max 2000 characters)                   |
|                                          |
|  [Cancel]                  [Complete]    |
+------------------------------------------+
```

### Photo Evidence Upload

```
Tap [+ Take Photo] or [+ From Gallery]
    |
    v
Capture/Select image(s) (max 5 total, quality: 50)
    |
    v
Images shown as thumbnails with [x] remove button
    |
    v
On submit: each image uploaded with Base64 encoding
    |
    v
Server stores files and links to incident report
```

### Report Metadata (Auto-captured)

| Field | Value |
|-------|-------|
| Reporter Type | STAFF |
| Reporter Name | Current user's first name |
| Reporter Login | Current user's login ID |
| Status | NEW |
| Type | PATIENT |
| Party | PATIENT |
| Reported On | Current timestamp |
| Patient MRN | From context |
| Encounter Number | From context |

---

## 3. Discharge Intimation

### What Is It?

A formal notification that a patient is ready for discharge. It triggers downstream processes (pharmacy, billing, nursing preparation).

### Two Modes

**Mode 1: Intimate Discharge** (patient ready to leave)

```
Doctor opens Discharge Intimation
    |
    v
System loads inpatient details
    |
    v
+------------------------------------------+
|  DISCHARGE INTIMATION                    |
|                                          |
|  Expected Discharge Date & Time:         |
|    [18 Apr 2026  14:00]  [Calendar]     |
|    (Must be in the future)               |
|                                          |
|  Discharging Consultant:                 |
|    [Search doctor...         ]           |
|    Dr. Sharma - Cardiology (auto)        |
|                                          |
|  [Cancel]                     [Done]     |
+------------------------------------------+
    |
    v
Submit --> Status changes to DISCHARGE_INTIMATED
    |
    v
Nursing staff see "Discharge Intimated" badge on patient
    |
    v
Pharmacy, billing, and discharge processes begin
```

**Mode 2: Revert Intimation** (plans changed, patient staying)

```
Doctor opens Discharge Intimation (patient already intimated)
    |
    v
Page shows in "Revert" mode
    |
    v
+------------------------------------------+
|  REVERT DISCHARGE INTIMATION             |
|                                          |
|  Consultant:                             |
|    Dr. Sharma - Cardiology               |
|                                          |
|  Remarks: *                              |
|  +------------------------------------+  |
|  | Patient developed fever overnight. |  |
|  | Discharge postponed for            |  |
|  | further evaluation.                |  |
|  +------------------------------------+  |
|  (Required field)                        |
|                                          |
|  [Cancel]                     [Done]     |
+------------------------------------------+
    |
    v
Submit --> Status reverts to UNDER_IP_CARE
    |
    v
Discharge badge removed from patient list
```

### Status Flow

```
UNDER_IP_CARE
    |
    |--[Intimate]--> DISCHARGE_INTIMATED
    |                    |
    |                    |--[Revert]--> UNDER_IP_CARE
    |                    |
    |                    |--[Discharge]--> DISCHARGED
```

---

## 4. Drug Safety Features

### Drug Monograph

When a doctor is prescribing or reviewing medications, they can access the full drug reference:

```
Tap info icon on any medication
    |
    v
Full monograph loads (HTML, powered by CIMS database):
  - Indications
  - Contraindications
  - Dosage & Administration
  - Side Effects
  - Drug Interactions
  - Pregnancy/Lactation warnings
  - Storage information
```

### Drug Interaction Check

```
Doctor orders a new medication
    |
    v
System automatically checks against ALL current medications
    |
    v
If interactions found:
    +------------------------------------------+
    |  DRUG INTERACTION WARNING                |
    |                                          |
    |  Warfarin + Aspirin                      |
    |  Severity: HIGH                          |
    |  Risk: Increased bleeding risk           |
    |  Recommendation: Monitor INR closely     |
    |                                          |
    |  [Acknowledge and Continue]              |
    +------------------------------------------+
```

### Look-Alike / Sound-Alike (LASA) Warning

Medications with similar names or packaging get a special warning badge to prevent mix-ups:

```
LASA medications marked with special icon:
  Hydroxyzine vs Hydralazine
  Metformin vs Metronidazole
  Prednisolone vs Prednisone
```

---

## 5. Comorbidity Tracking

### Why Track Comorbidities?

Chronic conditions affect treatment decisions, drug interactions, and risk assessment. AADI tracks 8 standard comorbidity categories:

| Code | Condition | Clinical Impact |
|------|-----------|----------------|
| **C** | Cancer | Affects drug selection, immune status |
| **H** | Hypertension | BP monitoring, anesthesia risk |
| **K** | Kidney Impairment | Drug dose adjustment, contrast avoidance |
| **L** | Liver Impairment | Drug metabolism, coagulation |
| **T** | Thyroid Disease | Metabolic monitoring |
| **P** | Pulmonary Impairment | Ventilation planning |
| **D** | Diabetes | Blood sugar management, wound healing |
| **S** | Stroke | Anticoagulation, neuro monitoring |

### Visual Display

Active comorbidities appear as color-coded badges on the patient card:

```
ICU Patient:    [D] [H] [K] (Red badges)
General Ward:   [D] [H] (Blue badges)
More than 3:    [D] [H] [K] +2 (overflow counter)
```

### Managing Comorbidities

```
Open Patient Details --> Comorbidities tab
    |
    v
Toggle ON/OFF for each condition
    |
    v
Changes saved to Initial Assessment record
    |
    v
Patient card badges update automatically
```

---

## 6. Risk Score System

### Mortality Prediction

AI-powered risk assessment showing probability of adverse outcomes:

```
+------------------------------------------+
|  RISK SCORE: 42%                         |
|                                          |
|         ___________                      |
|       /    42%      \                    |
|      |   [needle]    |                   |
|       \             /                    |
|        \___________/                     |
|      Low   Avg   High                   |
|      0-30  30-70  70-100                |
|                                          |
|  AI Prediction:                          |
|    Length of Stay: 5 days                |
|    Summary: "Patient shows elevated      |
|    inflammatory markers..."              |
|                                          |
|  CONTRIBUTING FACTORS:                   |
|    WBC Count:        Score 8  (!)        |
|    Creatinine:       Score 5  (!)        |
|    Heart Rate:       Score 3             |
|    Age:              Score 2             |
|    Hemoglobin:       Score 1             |
+------------------------------------------+
```

### Trend Over Time

Interactive line chart showing risk score history:
- **Green points** when score < 33 (low risk)
- **Red points** when score >= 33 (elevated risk)
- Each parameter can be drilled down individually

### Clinical Impact

Risk scores appear on patient cards in the list view:
- **RS: 15** (black text = low risk)
- **RS: 42** (red text = elevated risk)

Helps doctors prioritize which patients to review first.

---

## 7. CT Scorecard (Clinical Tracking)

### What Is It?

A 0-25 point clinical tracking scale used to monitor patient deterioration or improvement over time.

```
+------------------------------------------+
|  CT SCORECARD                            |
|                                          |
|  New Score:                              |
|    CT Score: [  18  ] / 25               |
|    Date:     [18 Apr 2026] [Calendar]    |
|    [Add Score]                           |
|                                          |
|  PREVIOUS SCORES:                        |
|                                          |
|  18/25  |  18 Apr 2026  |  Dr. Sharma   |
|          10:30 AM                [Del]   |
|                                          |
|  15/25  |  17 Apr 2026  |  Dr. Patel    |
|          14:00 PM                [Del]   |
|                                          |
|  12/25  |  16 Apr 2026  |  Dr. Sharma   |
|          09:00 AM                [Del]   |
|                                          |
|  "No duplicate scores per date"          |
+------------------------------------------+
```

**Validation:**
- Integer only (0-25, no decimals)
- One score per date (duplicate detection)
- Delete = soft delete with confirmation

---

## Key User Journeys

### Journey: Pre-Surgery Safety Check

```
Timeline:

Day -2: PAC Assessment
  1. Anesthesiologist opens PAC for patient
  2. Reviews all systems (respiratory, cardiac, renal...)
  3. Performs airway assessment (mouth opening, teeth, neck)
  4. Assigns ASA Score: III (severe systemic disease)
  5. Plans: Regional anesthesia, ICU post-op required
  6. Status: CLEARED with conditions
  7. Saves as V.1

Day -1: Lab Review
  8. New lab results show improved kidney function
  9. Anesthesiologist updates PAC (V.2)
  10. Changes plan: "Blood products not required"

Day 0: Surgery Day
  11. Nurse opens Pre-Op Checklist
  12. Completes all safety questions sequentially
  13. Assigns witness (attending surgeon)
  14. Surgeon approves checklist
  15. Surgery proceeds

  During Surgery:
  16. Anesthesiologist monitors vitals
  17. Surgeon documents operation note

  Post-Surgery:
  18. Surgeon writes OT Notes with findings
  19. Post-op checklist completed
  20. Patient transferred to ICU (as planned in PAC)
```

### Journey: Incident Response

```
3:30 AM: Patient falls in bathroom
    |
    v
Nurse responds, ensures patient safety
    |
    v
Opens AADI --> Incident Report
    |
    v
Takes photo of any visible injuries
    |
    v
Writes description of incident:
  "Patient John Smith (MRN 123456) fell while
   walking to bathroom unassisted at approx 3:30 AM.
   No visible head injury. Patient alert, oriented.
   Vitals stable. Attending doctor notified."
    |
    v
Submits report (status: NEW)
    |
    v
Incident logged for quality review
    |
    v
Doctor reviews on morning round
    |
    v
Updates progress notes documenting fall
    |
    v
Orders head CT (investigation order with URGENT priority)
```

### Journey: Discharge Decision Reversal

```
Day 5: Doctor plans discharge
  1. Reviews patient progress - looks stable
  2. Opens Discharge Intimation
  3. Sets expected discharge: Tomorrow 2:00 PM
  4. Selects consultant: Dr. Sharma
  5. Submits --> Status: DISCHARGE_INTIMATED
  6. Nursing staff begins discharge prep
  7. Pharmacy prepares discharge medications

Night: Patient develops fever (38.5C)
  8. Night nurse documents vitals
  9. Night doctor reviews patient
  10. Decides discharge should be postponed

Day 6 Morning:
  11. Doctor opens Discharge Intimation
  12. Sees status: DISCHARGE_INTIMATED
  13. Enters "Revert" mode
  14. Selects consultant: Dr. Sharma
  15. Writes remarks: "Patient developed fever 38.5C
      overnight. Blood cultures sent. Discharge
      postponed for further evaluation."
  16. Submits --> Status reverts to UNDER_IP_CARE
  17. Discharge badge removed from patient list
  18. Discharge processes halted
```
