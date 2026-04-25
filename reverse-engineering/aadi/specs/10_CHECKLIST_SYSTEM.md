# AADI App - Checklist System

**Source:** `aadi_src/src/app/pages/add-checklist/`, `edit-checklist/`, `list-checklist/`, `checklist-reject-reason/`
**Service:** `services/checklist/checklist.service.ts`

---

## 1. Checklist Data Model

```typescript
ChecklistInstance {
    // Identity
    id: number;
    code: string;
    name: string;
    type: string;
    applicableFor: string;
    version: number;
    latest: boolean;
    checkListNumber: string | null;

    // Patient Context
    patient: {
        mrn: string;
        name: string;
        birthDate: string;
        gender: string;
        weight: number;
        patientDetails: object;
    };
    encounter: {
        documentNumber: string;
        patient: object;
        type: string;
    };
    otRequestNumber: string | null;

    // Care Team
    consultant: { displayName, login, employeeNo };
    unit: { id, name };

    // Response Configuration
    responseType: {
        code: "yes/no" | "tick";
        displayName: string;
    };
    sequentialAnswering: boolean;
    witness: "MANDATORY" | "OPTIONAL" | null;

    // Questions
    questions: Question[];

    // Workflow
    status: "PENDING" | "DRAFT" | "PENDING_APPROVAL" | "COMPLETED" | "REJECTED";
    createdBy: UserRef;
    createdOn: ISO8601;
    submittedBy: UserRef | null;
    submittedOn: ISO8601 | null;
    witnessedBy: UserRef | null;
    witnessedOn: ISO8601 | null;
    remarks: string;
    rejectReason: string | null;
    reviewRequired: boolean;
}

Question {
    question: string;
    displayOrder: number;
    mandatory: boolean;
    defaultResponse: string | null;    // Expected correct answer
    enableRemarks: boolean;
    answer: "YES" | "NO" | null;       // For yes/no type
    remarks: string | null;
}

UserRef { displayName, login, employeeNo }
```

---

## 2. Status Lifecycle

```
PENDING ──→ DRAFT (save without submitting)
   │
   └──→ SUBMIT
         ├── reviewRequired=true  → PENDING_APPROVAL
         │                              ├── Witness APPROVES → COMPLETED
         │                              └── Witness REJECTS  → REJECTED
         │                                                        │
         │                                                        └── Re-edit → DRAFT → SUBMIT → PENDING_APPROVAL
         │
         └── reviewRequired=false → COMPLETED (immediate)
```

### Permission Matrix

| Status | Creator Can | Witness Can | Others |
|--------|------------|-------------|--------|
| PENDING | Edit, Save Draft, Submit | — | — |
| DRAFT | Edit, Save Draft, Submit | — | — |
| PENDING_APPROVAL | Read-only | Approve, Reject | Read-only |
| COMPLETED | Read-only | Read-only | Read-only |
| REJECTED | Edit, Save Draft, Re-Submit | — | — |

---

## 3. Response Types

### Yes/No Type (`responseType.code === 'yes/no'`)

- Radio buttons: YES / NO per question
- If `defaultResponse` set and answer mismatches → warning: "Please choose the correct answer"
- Sequential mode: Correct answer on Q(n) enables Q(n+1); incorrect disables all subsequent
- Non-sequential: All mandatory questions must have correct answers before submit

### Tick Type (`responseType.code === 'tick'`)

- Checkboxes with blue highlight on selection (`bg-item-blue`)
- Sequential mode: Unchecking Q(n) cascades removal of Q(n+1) through Q(end)
- Non-sequential: Independent selection, any order

---

## 4. Sequential Answering Logic

### Yes/No Sequential Flow
```
Q0 always enabled
User answers Q0:
  → answer matches defaultResponse (or default is null/NA) → enable Q1
  → answer mismatches → show warning, disable Q1..Qn, call removeRemainingChecks(1)

Q1 enabled:
User answers Q1:
  → same logic → enable/disable Q2
  ...repeat
```

### Tick Sequential Flow
```
Q0 always enabled
User checks Q0:
  → checked=true → enable Q1, add styling
  → checked=false → removeAllTickFromIndex(0), disable Q1..Qn

Q1 enabled:
User checks Q1:
  → same logic
```

### Non-Sequential
All questions enabled from start. Mandatory questions validated on submit.

---

## 5. Witness Workflow

### Configuration
- `witness === 'MANDATORY'` → Witness MUST be assigned before submit
- `witness === 'OPTIONAL'` → Witness assignment optional
- `witness === null` → No witness section shown

### Witness Selection
```
User types in witness search (min 3 chars)
  → MDM_007 GET: Excludes current user, filters by unit and DOCTOR role
  → Dropdown shows matching doctors (max 20)
  → User selects → witnessedBy and witnessedOn populated
```

### Witness Actions (when status === PENDING_APPROVAL)
- **Approve** → status = COMPLETED, toast: "Checklist approved"
- **Reject** → Opens ChecklistRejectReasonPage modal
  → User enters reason (max 255 chars, non-empty required)
  → status = REJECTED, rejectReason stored

### Witness Validation
```typescript
witnessMandatoryCheck(): boolean {
    if (witness === 'MANDATORY' && (!witnessedBy || witnessedBy == null)) {
        return false;  // Block submit
    }
    return true;
}
```

---

## 6. Surgery Tracker Integration

When creating a new checklist:
1. Fetch surgery tracker: `CL_001 GET` with patient MRN and admission number
2. Find OT request with status REQUESTED or SCHEDULED
3. Associate: `otRequestNumber = surgeryTracker.requestNumber`
4. Inherit: consultant, unit, encounter from surgery/inpatient records

---

## 7. API Endpoints

| Code | Method | Purpose | Query |
|------|--------|---------|-------|
| MDM_017 | GET | All checklist templates | `?query=active:true applicableFor.code:patient&size=100&sort=name.sort,asc` |
| EHR_036 | POST | Create checklist | ChecklistInstance body |
| EHR_036 | PUT | Update checklist | ChecklistInstance body (with id) |
| EHR_036 | GET | Get checklist by ID | `/{id}` |
| EHR_066 | GET | Patient checklists (excl. pending) | `active:true patient.mrn encounter.documentNumber !(status:PENDING_APPROVAL)&size=100&sort=id,desc` |
| EHR_066 | GET | Pending approval checklists | `active:true patient.mrn encounter.documentNumber status:PENDING_APPROVAL&size=100&sort=id,desc` |
| CL_001 | GET | Surgery tracker | `patient.mrn AND inPatient.admissionDetails.admissionNumber&sort=id,desc` |
| ADT_001 | GET | Inpatient details | `encounter.documentNumber.raw:{encounterNumber}` |
| MDM_007 | GET | Search witness doctors | Excludes self, filters unit + DOCTOR role |

---

## 8. Validation Rules

### Submit Validation
```typescript
// Sequential: ALL questions must have valid answers matching defaultResponse
// Non-sequential: All MANDATORY questions must have valid answers
// Witness: Must be assigned if witness === 'MANDATORY'
// Remarks: tempRemarks merged into questions before save

showSubmit = isAllQuestionsValid() && witnessMandatoryCheck();
```

### Error Messages
| Scenario | Toast Message |
|----------|---------------|
| Invalid answers | "Please Provide Valid Answers to all Questions" |
| Missing witness | "Please Select Witnessed By" |
| No OT request | "OT request is not available for this patient." |
| API error | `error.error.title` or "Checklist already exists" |
| Empty reject reason | "Reject reason is empty." |

---

## 9. List View

### Two Tabs
1. **Checklist** — All checklists excluding PENDING_APPROVAL (EHR_066)
2. **Pending Approval** — Only PENDING_APPROVAL checklists (EHR_066)

### Display per checklist
- Status badge (color-coded CSS class)
- Creation date (grouped: Today/Yesterday/date)
- Submitted by name
- Witnessed by name
- Click → opens EditChecklistPage modal
