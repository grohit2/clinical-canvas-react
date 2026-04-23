# Clinical Documentation

> How doctors create, review, and finalize clinical records in AADI.

---

## 1. Progress Notes

### What Are Progress Notes?

Daily clinical notes written by doctors during patient rounds. Each note captures:
- **Clinical observations** (free-form rich text)
- **Vital signs** (heart rate, BP, temperature, SpO2)
- **Medication orders** (linked to pharmacy)
- **Investigation orders** (linked to lab/radiology)
- **Cross-consultations** (linked to specialist referrals)

### Creation Flow

```
Doctor opens Progress Notes from patient chat
    |
    v
System generates unique Document Number
    |
    v
Select Department (remembers last used)
    |
    v
+------------------------------------------+
|  PROGRESS NOTE FORM                      |
|                                          |
|  Vitals (optional):                      |
|    HR: [  72  ] bpm                      |
|    BP: [ 120 ] / [  80  ] mmHg          |
|    Temp: [ 98.6 ] F                      |
|    SpO2: [  98  ] %                      |
|                                          |
|  Notes:                                  |
|  +------------------------------------+  |
|  | Patient stable. Appetite improved. |  |
|  | Wound healing well. Continue       |  |
|  | current antibiotics.               |  |
|  +------------------------------------+  |
|  [Bold] [Italic] [Bullets] [Numbers]    |
|  [Expand to Full Screen] [Use Macro]    |
|                                          |
|  Linked Orders:                          |
|    [+ Add Medication]                    |
|    [+ Add Investigation]                 |
|    [+ Add Cross-Consultation]            |
|                                          |
|  [Save Draft]         [Submit]           |
+------------------------------------------+
```

### Macros (Templates)

Doctors can save frequently used text as macros:

```
Doctor writes detailed antibiotics note
    |
    v
Taps "Save as Macro"
    |
    v
Names it: "Standard Antibiotics Note"
    |
    v
Next time: Taps "Use Macro" --> Select --> Text auto-fills
```

Macros are personal (per doctor) and searchable.

### Acknowledgment Workflow

```
Junior Doctor writes Progress Note
    |
    v
[Submit]
    |
    +--- Is author the Primary Consultant?
    |        |
    |        YES --> Auto-acknowledged (done)
    |        |
    |        NO  --> Status: PENDING ACKNOWLEDGMENT
    |                    |
    |                    v
    |              Primary Consultant sees task
    |                    |
    |                    v
    |              Reviews note
    |                    |
    |                    v
    |              [Acknowledge] --> Status: ACKNOWLEDGED
    |
    +--- [Save Draft] --> Can resume later
```

### Previous Notes

```
Tap history icon --> Previous Notes List
    |
    v
Filter by:
  - Date range (from / to)
  - Specific consultant
  - Acknowledgment status (all / acknowledged only)
    |
    v
Tap any note --> Preview (read-only)
    |
    v
If author = current user --> [Edit] available
```

---

## 2. Discharge Summary

### What Is It?

The comprehensive document created when a patient leaves the hospital. It contains the patient's entire clinical journey: why they were admitted, what was found, what treatment was given, and what they should do after discharge.

### 28 Clinical Sections

```
1.  Admission Reason          15. Medication at Discharge
2.  Chief Complaint            16. Cross-Consultation
3.  Medical History            17. Urgent Care Instructions
4.  Surgical History           18. Condition at Discharge
5.  Family History             19. Discharge Advice
6.  Social History             20. Dietary Advice
7.  Past Medication History    21. Therapy Advice
8.  Vital Signs                22. Operation & Procedure
9.  Allergies                  23. Follow-Up
10. General Examination        24. Diagnosis
11. Systemic Examination       25. Cause of Death
12. Investigation Results      26. Active Medication
13. Provisional Diagnosis      27. Comorbidities
14. Final Diagnosis            28. Emergency Management
```

Each section uses a rich text editor (bold, italic, lists).

### 7-State Workflow

```
                    +----------+
                    |  CREATE  |
                    +----+-----+
                         |
                    +----v-----+
              +---->|  DRAFT   |<---------+
              |     +----+-----+          |
              |          |                |
              |     +----v-----------+    |
              |     | SENT FOR       |    |
              |     | REVIEW         |    |
              |     +----+-----------+    |
              |          |                |
              |     +----v-----------+    |
              |     | UNDER          |    |
              |     | REVIEW         |    |
              |     +----+-----------+    |
              |          |                |
              |     Comments &            |
              |     Feedback              |
              |          |                |
              |     +----v-----------+    |
              +-----| AMENDMENT      |----+
                    | (changes       |
                    |  requested)    |
                    +----------------+
                         |
                    +----v-----+
                    | SIGN OFF |
                    +----+-----+
                         |
                    +----v-----+
                    | COMPLETE |
                    | (final)  |
                    +----------+
```

### Comments & Review

Multiple doctors can add review comments:

```
Reviewer opens Discharge Summary
    |
    v
Reads all sections
    |
    v
Adds comment: "Please add post-op wound care instructions"
    |
    v
Comment appears with reviewer name + timestamp
    |
    v
Original author sees comment, makes amendments
    |
    v
Re-submits for review
```

### AI-Powered Discharge Summary

```
Doctor taps "AI Summary" button
    |
    v
Microphone activates (screen stays awake)
    |
    v
Doctor dictates clinical summary aloud
    |
    v
Speech-to-text converts to transcript
    |
    v
AI processes transcript
    |
    v
Auto-populates relevant sections of discharge summary
    |
    v
Doctor reviews and edits AI-generated content
```

### Copy Previous Notes

For patients with repeat admissions:

```
Doctor opens new Discharge Summary
    |
    v
Taps "Copy Previous"
    |
    v
System finds previous admission's discharge summary
    |
    v
Copies all sections as starting point
    |
    v
Doctor updates for current admission
```

### Print as PDF

```
Tap print icon --> System generates PDF
    |
    v
PDF opens in viewer (can download/share)
```

---

## 3. Operation Notes (OT Notes)

### What Are They?

Detailed documentation of surgical procedures, created by the surgical team after an operation.

### Creation Flow

```
Surgeon opens Operation Notes
    |
    v
Sees list of surgeries (grouped by date)
    |
    v
Taps [+] to create new note
    |
    v
+-------------------------------------------------+
|  OPERATION NOTE FORM                            |
|                                                 |
|  SURGICAL TEAM:                                 |
|    Surgeon:          [Search & select]          |
|    Asst. Surgeon:    [Search & select]          |
|    Anaesthetist:     [Search & select]          |
|    Scrub Nurse:      [Search & select]          |
|    Floor Nurse:      [Search & select]          |
|                                                 |
|  Ward: ICU-5 (auto)   Bed: 12 (auto)          |
|  Admission Date: 15-Apr (auto)                  |
|  Operation Date: 18-Apr (auto)                  |
|  Type: [Normal] [Emergency]                     |
|                                                 |
|  PRE-OPERATIVE DIAGNOSIS:                       |
|    [Search SNOMED-CT terms...]                  |
|    [Acute appendicitis] [x]                     |
|    Free-text notes: [________________]          |
|                                                 |
|  POST-OPERATIVE DIAGNOSIS:                      |
|    [Search SNOMED-CT terms...]                  |
|    [Perforated appendicitis] [x]                |
|                                                 |
|  OPERATION:                                     |
|    Search hospital DB: [Appendectomy___]        |
|    Search SNOMED-CT:   [________________]       |
|                                                 |
|  CLINICAL SECTIONS:                             |
|    Findings:                    [Rich text]     |
|    Perioperative Complications: [Rich text]     |
|    Details of Procedure:        [Rich text]     |
|    Surgical Specimen:           [Rich text]     |
|    Post-operative Advice:       [Rich text]     |
|                                                 |
|  [Cancel]                        [Done]         |
+-------------------------------------------------+
```

### Key Features

- **SNOMED-CT integration**: Standardized medical coding for diagnoses and procedures
- **Dual search**: Both hospital-specific surgery names AND international SNOMED codes
- **Configurable mandatory sections**: Each hospital unit decides which sections are required
- **Duplicate prevention**: Cannot add same operation twice
- **Team member search**: Min 3 characters, filtered by unit and role (Doctor/Nurse)
- **PDF download**: Generate formatted PDF of completed notes

---

## 4. Initial Assessment

### What Is It?

A comprehensive admission assessment completed when a patient first arrives. Built as a **widget-based form** with 27 configurable sections.

### Widget Categories

```
HISTORY
  - Allergy
  - Chief Complaints & HPI
  - Past Medical History
  - Surgical History
  - Family History
  - Social History & Occupational Details
  - Past Medication & Reconciliation

EXAMINATION
  - Vital Signs
  - General Examination
  - Systemic Examination
  - General Impression

CLINICAL ASSESSMENT
  - Provisional Diagnosis
  - Investigations Advised
  - Treatment Plan
  - Discharge Planning
  - Comorbidities

SPECIALIZED
  - Maternal & Child Health
  - Psychological Assessment
  - Communicable Disease Assessment
  - Radiation Oncology
  - MLC (Medico-Legal Case)
  - Primary Survey
  - Lines & Tubes
  - Implantable Devices
```

### How Widgets Work

Each widget supports:
1. **Search** — Find existing terms/conditions from medical database
2. **Favorites** — Quick-add from frequently used items
3. **Free text** — Additional notes
4. **Save** — Persist individually
5. **Delete** — Remove entries

### Submission

```
Doctor completes relevant widgets
    |
    v
Taps [Submit]
    |
    v
System creates "Initial Assessment Review" task
    |
    v
Senior doctor reviews and approves
    |
    v
Assessment locked (read-only)
    |
    v
PDF downloadable for medical records
```

---

## Key User Journeys

### Journey: Discharging a Patient

```
1. Doctor reviews patient's progress notes history
2. Opens Discharge Summary
3. System pre-fills some sections from EHR
4. Doctor dictates summary using AI voice-to-text
5. Reviews AI-generated text, makes corrections
6. Adds discharge medications and follow-up plan
7. Sends for review to senior consultant
8. Senior adds comment: "Add dietary restrictions"
9. Doctor amends the summary
10. Re-submits for review
11. Senior approves (Sign Off)
12. Summary is COMPLETE
13. PDF generated for patient
14. Discharge intimation sent to nursing staff
```

### Journey: Post-Surgery Documentation

```
1. Surgery completed at 2:30 PM
2. Surgeon opens Operation Notes on phone
3. Selects today's OT request from list
4. Adds surgical team members (search by name)
5. Searches SNOMED-CT: "Laparoscopic appendectomy"
6. Adds diagnosis: "Acute perforated appendicitis"
7. Types findings, procedure details, complications
8. Submits note
9. Downloads PDF for medical records
10. Writes progress note with post-op orders
```
