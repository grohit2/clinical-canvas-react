# Feature: Patient Management

> Table: `PatientTable`
> Owners: MPI Service (AHAM), Patient Management (AADI)

---

## Domain Overview

Central patient record shared between AADI (clinical, uses MRN) and AHAM (admin, uses UHID). A patient is identified by `patientId` (internal), `mrn` (clinical), and `uhid` (universal health ID).

## Entity Types in This Table

| Entity | SK Pattern | Description |
|--------|-----------|-------------|
| Patient Profile | `PROFILE` | Core demographics |
| Aadhaar Verification | `AADHAAR` | KYC verification result |

## Key Access Patterns

### Patient Lookup (Critical Path)
1. **By patientId** (primary): GetItem `PAT#{patientId}` + `PROFILE` -- used internally
2. **By MRN** (AADI): GSI1 query `MRN#{mrn}` -- every clinical operation starts here
3. **By UHID** (AHAM): GSI2 query `UHID#{uhid}` -- admin/billing operations
4. **By phone** (registration): GSI3 query `PHONE#{mobileNumber}` -- patient search during registration

### Patient Registration (AHAM)
1. Search existing by phone/name: GSI3 query
2. If new: PutItem with generated patientId
3. Aadhaar KYC: PutItem `PAT#{id}` + `AADHAAR`
4. Assign UHID from MPI

### Patient List (AADI)
Doctor's patient list is driven by `EncounterTable` (GSI2: encounters by doctor), not PatientTable. PatientTable provides demographic enrichment via BatchGetItem after encounter query.

## Data Flow

```
AHAM Registration:
  Search MPI → GSI3 by phone or GSI2 by UHID
  → If found: return existing patient
  → If not: PutItem new patient + Aadhaar verification
  → Assign UHID via MPI service

AADI Patient Load:
  GET /api/my-patient-list → EncounterTable GSI2 by doctor
  → BatchGetItem PatientTable for demographics
  → Merge into patient list view
```

## Capacity Estimates

| Operation | Peak RCU | Peak WCU | Notes |
|-----------|----------|----------|-------|
| Patient lookup (MRN/UHID) | 200 | 0 | Every clinical action |
| Patient search (phone) | 20 | 0 | Registration flow |
| Patient creation | 0 | 10 | Camp registration surges |
| Profile update | 0 | 5 | Address/contact changes |
| BatchGetItem (patient list) | 100 | 0 | Doctor login, 50 patients avg |

## Consistency Requirements

- **Patient lookup**: Strongly consistent for clinical operations
- **Phone search**: Eventually consistent (registration can retry)
- **Demographic reads for display**: Eventually consistent

## HIPAA Considerations

- PatientTable contains PHI (Protected Health Information)
- IAM policies restrict access to authorized services only
- Aadhaar number stored masked (last 4 digits visible)
- Audit all reads/writes via DynamoDB Streams -> CloudTrail
- Consider AWS KMS customer-managed key for extra control

## Denormalization Impact

Patient name/MRN/gender/DOB are copied to 10+ tables. When a patient name changes:
1. DynamoDB Stream captures the change
2. Lambda function queries affected tables (EncounterTable GSI1, MedicationOrderTable GSI1, etc.)
3. BatchWriteItem updates denormalized copies
4. Expected propagation time: <5 seconds for a single patient
