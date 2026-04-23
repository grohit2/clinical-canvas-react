# AADI App - Operation Notes (OT) & Pre-Anesthesia Checkup (PAC)

**Source:** `aadi_src/src/app/pages/operation-note*/`, `pre-anesthesia-checkup/`, `asa/`, `add-operation/`
**Services:** `services/operation-note/`, `services/pac/`

---

## 1. OT Notes Data Model

```typescript
OTNotes {
    id: string | null;
    otRequestNo: string;
    draft: boolean;                    // true=WIP, false=finalized
    source: "AADI";

    inPatient: {
        admissionDetails: { admissionDate: DateTime, admissionNumber: string };
        patientDetails: PatientInfo;
        ward: { id: number, name: string };
        bed: { id: number, name: string };
    };
    scheduledDateTime: DateTime;
    unit: { id: number };

    formTemplateReport: {
        result: {
            patientDetail: PatientInfo;
            concept: {
                report: OperationNoteReport;
            };
        };
    };
}

OperationNoteReport {
    // Surgical Team
    surgeons: Employee[];              // Primary surgeon(s)
    assistantSurgeons: Employee[];     // Assistant surgeon(s)
    anaesthetists: Employee[];         // Anesthesiologist(s)
    scrubNurse: Employee[];            // Scrub nurse(s)
    floorNurse: Employee[];            // Floor/circulating nurse(s)

    // Diagnosis
    preOperativeDiagnosis: DiagnosisTerm[];   // SNOMED-CT coded
    diagnosis: DiagnosisTerm[];               // Post-operative diagnosis
    preOperativeDiagnosisNotes: string;       // Free text
    diagnosisNotes: string;                   // Post-op free text

    // Procedures
    operations: Operation[];
    operationType: "NORMAL" | "EMERGENCY";
    operationNotes: string;                   // CKEditor HTML

    // Clinical Documentation
    findings: string;                          // CKEditor HTML
    perioperativeComplications: string;        // CKEditor HTML
    detailsOfProcedure: string;               // CKEditor HTML
    surgicalSpecimenSentForExamination: string; // CKEditor HTML
    postOpNotes: string;                       // Post-operative advice, CKEditor HTML
}

Employee {
    id: number;
    displayName: string;
    newlyAdded: boolean;               // Tracks newly added team members
}

Operation {
    surgery: {
        id: number;
        name: string;
        code: string;
        newAdded: boolean;
        print: boolean;
    };
    snomed: {
        name: string;
        identifier: {
            code: string;
            standardCodes: [{ system: "SNOMED-CT", code: string }];
        };
        print: boolean;
    };
}

DiagnosisTerm {
    term: string;
    concept: { conceptId: string };
}
```

---

## 2. OT Notes Workflow

### Status Values
- `IN_PROGRESS` — Active surgery/documentation
- `ON_HOLD` — Temporarily paused
- `DEFERRED` — Postponed
- `COMPLETED` — Finished and finalized

### Notes Status
- `draft = true` — Work in progress
- `draft = false` — Published/finalized

### Flow
```
OT Notes List (/operation-note)
  → View existing notes (grouped by date: Today/Yesterday/DD-MM-YYYY)
  → Create new note → /operation-note-create
       ├── Select surgical team (search by unit, min 3 chars, MDM_007)
       ├── Select operation (hospital DB: MDM_008 + SNOMED-CT: SM_001)
       ├── Select diagnosis (SNOMED-CT: SM_001, semantic tags: disorder, procedure, finding)
       ├── Fill clinical sections (CKEditor5: bold, italic, lists)
       ├── Validate mandatory sections (per-unit config via MDM_002)
       └── Save → OT_006 POST (new) or PUT (update)
  → View note details → /operation-note-details
       ├── Read-only view of all sections
       └── Download PDF → OT_003 GET (returns blob)
```

### Mandatory Sections (15, configurable per unit via MDM_002)
```
SURGEON, ASSISTANT SURGEON, ANAESTHETISTS, SCRUB NURSE, FLOOR NURSE,
PRE OPERATIVE DIAGNOSIS, POST OPERATIVE DIAGNOSIS,
TYPE OF OPERATION, OPERATION TYPE, OPERATION,
FINDINGS, PERIOPERATIVE COMPLICATIONS, DETAILS OF PROCEDURE,
SURGICAL SPECIMEN SENT FOR EXAMINATION, Post Operative Advice
```

**Validation:** On save, checks each mandatory section is non-empty (arrays have length > 0 or text fields are non-blank).

---

## 3. Add Operation Modal

### Dual Search
1. **Surgery Name/Code** — MDM_008 GET, searches hospital database by unit
2. **SNOMED-CT** — SM_001 GET, semanticTag=procedure, limit=50

### Duplicate Prevention
Checks both surgery and SNOMED lists for existing operations before adding.

### Output Structure
```typescript
{
    surgery: { name, code, id, newAdded: true, print: true },
    snomed: {
        name: operationObj.term,
        identifier: {
            code: operationObj.term,
            standardCodes: [{ system: "SNOMED-CT", code: operationObj.concept.id }]
        },
        print: true
    }
}
```

---

## 4. OT API Endpoints

| Code | Method | Purpose | Query Pattern |
|------|--------|---------|---------------|
| OT_001 | GET | Performed surgery list | `?page=0&query={otRequestNo}` |
| OT_002 | GET | OT notes list | `status:(IN_PROGRESS OR ON_HOLD OR DEFERRED OR COMPLETED) AND patient.mrn AND inPatient.admissionDetails.admissionNumber`, sort=wheelInTime,desc |
| OT_003 | GET | Print PDF | `?otRequestNo={no}&serviceCode={code}&printLogoWithHeaderAndFooter=false` → blob |
| OT_005 | GET | Get OT notes by request | `?otRequestNo={number}` |
| OT_006 | POST | Create OT notes | Full OTNotes object |
| OT_006 | PUT | Update OT notes | Full OTNotes object |
| MDM_002 | GET | Mandatory sections config | `key:ot_notes_mandatory_section AND (applicableType:system OR unit OR global OR local)` |
| MDM_007 | GET | Search team members | `unit.id:{unitId} AND (group.code:({DOCTOR/NURSE})) AND employee.displayName:*{search}*` |
| MDM_008 | GET | Search surgeries | `serviceMaster.serviceType.code.raw:(Operation OR Procedure OR Surgery) AND *{search}*`, unitId, size=20 |
| MDM_009 | GET | Form template config | `serviceMaster.id:({ids}) AND unit.id:{unitId} AND formTemplates.formPrintTemplate.templateName:"operation-note.ftl"` |
| SM_001 | GET | SNOMED-CT search | `limit=50&conceptActive=true&active=true&semanticTags=disorder,procedure,finding,morphologic abnormality,tumor staging&term={search}` |

---

## 5. Pre-Anesthesia Checkup (PAC) Data Model

```typescript
PAC {
    id: string;
    version: number;
    concept: {
        preAnaesthesia: {
            status: "Cleared" | "Re-evaluation Required" | "Not Cleared";
            source: "AADI";

            // Physical Examination
            generalExamination: {
                records: ExaminationRecord[];
                noAbnormalityDetected: boolean;
                notes: string;
            };

            // Systemic Review (6 systems)
            systemicExamination: {
                respiratorySystems: { records[], noAbnormalityDetected, notes };
                cnsMusculoskeletal: { records[], noAbnormalityDetected, notes };
                endocrine: { records[], noAbnormalityDetected, notes };
                cardioVascularSystems: { records[], noAbnormalityDetected, notes };
                hepaticRenal: { records[], noAbnormalityDetected, notes };
                others: { records[], noAbnormalityDetected, notes };
            };

            // Airway Assessment
            airwayAssessment: {
                mouthOpening: { records[] };
                teeth: { normal: boolean, remarks: string };
                neckMovementsSpineEvaluation: { normal: boolean, remarks: string };
                intubationDifficulty: { check: boolean, remarks: string };
                met: { score: number };
                deepVeinThrombosisRiskAssessment: { score: number, text: string };
                asa: { score: "I"|"II"|"III"|"IV"|"V"|"VI", text: string };
            };

            // Impressions
            ecgImpression: string;
            echoImpression: string;
            xrayImpression: string;
            previousAnaesthesia: string;

            // Plan
            anaesthesiaPlan: {
                planType: ValueSetItem[];
                postOpICURequired: { check: boolean, remarks: string };
                bloodProductRequired: { check: boolean, remarks: string };
                npo: string;           // NPO hours (Nil Per Os)
            };

            advice: string;
            remarks: string;
        };
    };
}
```

### ASA Classification (American Society of Anesthesiologists)
| Score | Description |
|-------|-------------|
| I | Normal healthy patient |
| II | Mild systemic disease |
| III | Severe systemic disease limiting activity |
| IV | Severe systemic disease, constant threat to life |
| V | Moribund patient, not expected to survive without operation |
| VI | Brain-dead patient for organ donation |

### PAC Version Control
- Each update creates new version
- Historical versions accessible via dropdown
- Cannot edit non-current versions
- Display: `V.{version}` with "(Current)" label
- Only users with `USER_PAC_AUTHORITIES` can edit

---

## 6. PAC API Endpoints

| Code | Method | Purpose |
|------|--------|---------|
| EHR_097 | GET | Get PAC data (`?mrn={mrn}&formType=PRE_ANAESTHESIA_CHECKUP&referenceDate={date}`) |
| EHR_098 | GET | Get admission details for PAC (`?encounterNumber={enc}`) |
| EHR_099 | GET | Get PAC with ID and version (`/{id}/{versionId}`) |
| EHR_099 | PUT | Save PAC (PAC object body) |
| EHR_100 | GET | Get PAC version list (`/{id}`) |
| UAA_003 | GET | Get user authorities (PAC edit permissions) |
| MDM_001 | GET | Value sets: PAC_ANAESTHESIA_PLAN, PAC_CHECKUP_STATUS, PAC_ASA_FORM |

---

## 7. Surgery Tracker Integration

Checklists and OT Notes are linked to surgery tracker records:
```
CL_001 GET → patient.mrn AND inPatient.admissionDetails.admissionNumber
→ Returns: { requestNumber, status: REQUESTED|SCHEDULED, primaryConsultant, unit }
→ Used to associate checklist/OT note with specific surgical case
```
