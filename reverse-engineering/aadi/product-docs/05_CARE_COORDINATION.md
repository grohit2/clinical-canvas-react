# Care Coordination

> How clinical teams are organized, tasks assigned, and handovers managed.

---

## 1. Care Team Management

### What Is a Care Team?

Every patient has a care team — the group of doctors, nurses, and paramedics responsible for their care. AADI manages two types of care teams:

| Type | Assigned By | Example |
|------|-------------|---------|
| **Consultant-Based** | Primary Consultant | "Dr. Sharma's Cardiology Team" |
| **Location-Based** | Ward/HSC | "ICU Bed 1-10 Team" |

### Team Roles

```
+--------------------------------------------------+
|  CARE TEAM for John Smith (MRN: 123456)          |
|                                                  |
|  PRIMARY CONSULTANT                              |
|    [Crown] Dr. Sharma (cannot change)            |
|    Last seen: Today 08:30 AM                     |
|                                                  |
|  TEAM MEMBERS                                    |
|    [Crown] Dr. Patel (Admin)         [Remove]   |
|    Nurse Priya (Nurse)               [Remove]   |
|    Dr. Kumar (Doctor)                [Remove]   |
|    Physiotherapist Raj (Paramedics)  [Remove]   |
|                                                  |
|    [+ Search and add member]                     |
|                                                  |
|  LOCK TEAM  [Toggle Switch]                      |
|  (When locked, only PC can modify)               |
|                                                  |
|  [Exit Group]                                    |
+--------------------------------------------------+
```

### Admin Capabilities

Users with the **Admin** crown icon can:
- Add new team members
- Remove team members
- Toggle admin status for others

The **Primary Consultant** additionally can:
- Lock/unlock the care team (preventing modifications by others)
- Cannot be removed from the team

### Adding a Team Member

```
Tap [+] Search
    |
    v
Type name (min 3 characters)
    |
    v
Results filtered by unit and role (Doctor/Nurse/Paramedics)
    |
    v
Tap to add --> Member appears with auto-detected role
    |
    v
Duplicate check: "Dr. Patel already exists" (toast if duplicate)
```

### Team Template Management (Admin Feature)

Hospital administrators can create reusable team templates:

```
Admin opens Care Team Management
    |
    +---> User-Wise Templates
    |     (Templates per primary consultant)
    |
    +---> Location-Wise Templates
    |     (Templates per ward/HSC)
    |
    +---> [Create New Template]
          |
          v
          Select Unit --> Select Consultant or Location
          --> Add team members --> Save template
```

Templates auto-apply when patients are admitted under the relevant consultant or location.

### Concurrency Protection

If two people edit the same care team simultaneously:
```
User A opens care team at 10:00 (modifiedOn: 10:00)
User B opens care team at 10:01 (modifiedOn: 10:00)
User A saves at 10:05 (modifiedOn updated to 10:05)
User B tries to save at 10:06
    |
    v
System detects modifiedOn mismatch (10:00 != 10:05)
    |
    v
"Team was modified by another user. Reloading..."
    |
    v
Latest version loaded for User B
```

---

## 2. Consultant Handover

### When Does Handover Happen?

At shift changes, doctors transfer patient responsibility:

```
OUTGOING DOCTOR                      INCOMING DOCTOR

Opens patient list
    |
Long-press to multi-select
patients for handover
    |
Search for incoming doctor
    |
[Submit Handover]
    |
    +--------- Notification -------->  Sees "Handover Request"
                                          |
                                     +----+----+
                                     |         |
                                  [Accept]  [Reject]
                                     |         |
                                     v         v
                                  Patient    Patient stays
                                  transfers  with original
                                  to new     doctor
                                  doctor
```

### Handover Request Display

```
+----------------------------------------------------------+
|  HANDOVER REQUESTS (3)                                   |
|                                                          |
|  +----------------------------------------------------+ |
|  | [Avatar] Jane Doe  F | 62y | 58kg    RS: 28        | |
|  |          Dr. ABC  | Ward 3 Bed 7                    | |
|  |          [MFD]                                      | |
|  |                                                      | |
|  |  [Reject]                            [Accept]       | |
|  +----------------------------------------------------+ |
|                                                          |
|  +----------------------------------------------------+ |
|  | [Avatar] Bob Brown  M | 35y | 80kg   RS: 15        | |
|  |          Dr. ABC  | ICU Bed 2                       | |
|  |                                                      | |
|  |  [Reject]                            [Accept]       | |
|  +----------------------------------------------------+ |
+----------------------------------------------------------+
```

---

## 3. Surgical Checklists

### What Are Checklists?

Standardized safety protocols (like the WHO Surgical Safety Checklist) that must be completed and witnessed before procedures.

### Checklist Features

| Feature | Description |
|---------|-------------|
| **Templates** | Pre-configured by hospital (e.g., "Pre-Op Checklist", "Time-Out Checklist") |
| **Two response types** | Yes/No (radio buttons) or Tick (checkboxes) |
| **Sequential mode** | Questions must be answered in order (can't skip ahead) |
| **Mandatory questions** | Marked with red asterisk, must be answered before submit |
| **Default answers** | Some questions have expected "correct" answers |
| **Remarks** | Optional notes per question |
| **Witness requirement** | Some checklists require a witness doctor |

### Checklist Workflow

```
Nurse/Doctor opens Checklist
    |
    v
Select template from available list
    |
    v
System creates checklist linked to surgery (if OT request exists)
    |
    v
Answer questions one by one (if sequential)
    |
    +--- Yes/No type:
    |    Answer must match expected answer to proceed
    |    Wrong answer shows: "Please choose the correct answer"
    |
    +--- Tick type:
    |    Check items in order
    |    Unchecking cascades removal of all subsequent items
    |
    v
Assign Witness (if mandatory)
    - Search doctors in unit (min 3 characters)
    - Cannot select yourself as witness
    |
    v
[Save Draft] -- save and continue later
    |
[Submit]
    |
    +--- Review required?
    |        |
    |      YES --> Status: PENDING APPROVAL
    |        |        |
    |        |     Witness reviews
    |        |        |
    |        |     +--+--+
    |        |     |     |
    |        |  [Approve]  [Reject]
    |        |     |          |
    |        |     v          v
    |        |  COMPLETED   REJECTED
    |        |              (with reason)
    |        |                 |
    |        |              Re-edit possible
    |        |                 |
    |        |              Re-submit --> PENDING APPROVAL
    |        |
    |      NO --> Status: COMPLETED (immediate)
```

### Rejection Flow

```
Witness taps [Reject]
    |
    v
Modal opens: "Enter rejection reason"
    |
    v
Type reason (max 255 characters, required)
    |
    v
[Submit Rejection]
    |
    v
Original creator sees REJECTED status with reason
    |
    v
Can edit answers and re-submit
```

### Checklist List View

```
+--------------------------------------------------+
|  CHECKLISTS          |  PENDING APPROVAL          |
|                      |                            |
|  TODAY               |  +----------------------+  |
|  Pre-Op Checklist    |  | Time-Out Checklist   |  |
|  [COMPLETED]         |  | [PENDING APPROVAL]   |  |
|  By: Nurse Priya     |  | Witness: Dr. Kumar   |  |
|  10:30 AM            |  | By: Nurse Priya      |  |
|                      |  | 11:00 AM             |  |
|  YESTERDAY           |  +----------------------+  |
|  Pre-Op Checklist    |                            |
|  [REJECTED]          |                            |
|  By: Nurse Priya     |                            |
+--------------------------------------------------+
```

---

## 4. Task Management

### What Are Tasks?

Tasks are actionable items assigned to nursing staff. The primary task type is "Nursing Capture Notes" — bite-sized clinical observations.

### Task Creation

```
+------------------------------------------+
|  CREATE TASK                             |
|                                          |
|  Title:  [Wound dressing check] (25 max) |
|                                          |
|  Description:                            |
|  [Check surgical site for signs of       |
|   infection. Document drainage color.]   |
|                                          |
|  Starts On:  [18 Apr 2026  08:00]       |
|  Due On:     [18 Apr 2026  14:00]       |
|                                          |
|  Priority:                               |
|    [Low] [Medium] [HIGH] [Urgent]        |
|                                          |
|  Assigned To: Nurse Priya (auto)         |
|                                          |
|  [Create Task]                           |
+------------------------------------------+
```

### Task Status: OPEN or CLOSED

- Only the creator can edit or delete an OPEN task
- Deletion is soft (task becomes inactive, not removed)

### Activity Area (Task Dashboard)

The Activity Area shows **6 task categories** across all patients:

```
+--------------------------------------------------+
|  ACTIVITY AREA                                   |
|                                                  |
|  Progress Notes Acknowledgment       [12]        |
|  Discharge Summary Creation          [ 3]        |
|  Discharge Summary Signoff           [ 2]        |
|  Review Initial Assessment           [ 5]        |
|  Checklist Approval                  [ 4]        |
|  Cross-Consultation                  [ 7]        |
+--------------------------------------------------+

Tap category --> See patients with pending tasks
    --> Tap patient --> Open specific task for action
```

---

## 5. Cross-Consultation

### What Is It?

A formal request from one doctor to another specialist for clinical opinion.

### Flow

```
Attending Doctor
    |
    v
"I need a Cardiology opinion on this patient"
    |
    v
Opens Cross-Consultation
    |
    v
Search unit: "Cardiology"
    |
    v
Search doctor: "Dr. Mehta"
    |
    v
Add remarks: "Patient has new onset chest pain,
              ECG shows ST changes. Please review."
    |
    v
Set priority: [Normal] or [URGENT]
    |
    v
[Submit]
    |
    v
Dr. Mehta receives notification
    |
    v
Cross-consultation appears in both doctors' patient views
    |
    v
Specialist reviews patient and documents findings
```

### Validation Rules

- Cannot request consultation from yourself
- Cannot select same doctor as primary consultant
- Unit must be selected before searching doctors
- Remarks are optional but recommended

### Cross-Consultation in Progress Notes

Cross-consultations can be **linked directly inside progress notes**, so they become part of the clinical documentation with a single submission.

---

## Key User Journeys

### Journey: Shift Handover

```
Evening Shift Doctor (Dr. A):
1. Opens patient list at 7:00 PM
2. Long-presses all 8 patients
3. Searches "Dr. B" (night shift doctor)
4. Submits handover request

Night Shift Doctor (Dr. B):
1. Opens app at 7:30 PM
2. Sees "8 Handover Requests" notification
3. Reviews each patient briefly
4. Accepts 7 patients, rejects 1 (not their unit)
5. 7 patients now appear in Dr. B's list
6. Rejected patient stays with Dr. A (or their backup)
```

### Journey: Surgical Safety Checklist

```
Before Surgery:
1. Nurse opens "Pre-Op Checklist" for patient
2. Questions appear one by one (sequential mode):
   - "Patient identity confirmed?" --> YES
   - "Site marked?" --> YES
   - "Allergies reviewed?" --> YES
   - "Blood products available?" --> YES
3. Assigns witness: Dr. Kumar
4. Submits checklist
5. Dr. Kumar receives "Pending Approval" notification
6. Reviews all answers
7. Approves --> Checklist COMPLETED
8. Surgery can proceed

After Surgery:
9. Nurse opens "Post-Op Checklist"
10. Completes questions about procedure outcome
11. Submits --> Auto-completed (no review required)
```

### Journey: Cross-Consultation for Difficult Case

```
1. Attending physician notices patient's kidney function declining
2. Opens Cross-Consultation
3. Selects Nephrology department
4. Searches for "Dr. Reddy" (nephrologist)
5. Writes: "Creatinine rising from 1.2 to 2.8 over 48 hours.
            Please advise on dialysis need."
6. Priority: URGENT
7. Submits
8. Dr. Reddy gets push notification
9. Reviews patient's lab trends in AADI
10. Writes progress note with recommendations
11. Both doctors see the consultation in patient's timeline
```
