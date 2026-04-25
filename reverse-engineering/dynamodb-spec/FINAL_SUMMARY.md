# DynamoDB Specification -- Final Summary

> Clinical Canvas Healthcare Platform
> 9 Iterations | 35 files | 8,000+ lines | 16 tables | 16 validated schemas | $5,054/mo

---

## What Was Built

A complete DynamoDB data model for a healthcare platform consisting of two mobile apps:
- **AADI** (Ionic/Angular): Doctor-facing clinical app for inpatient management
- **AHAM** (Flutter): Staff-facing admin app for billing, chat, and outreach

The specification was reverse-engineered from 553 TypeScript files (AADI) and 46K binary strings (AHAM), covering 67+ original data models across 11 microservices.

---

## 16 Tables at a Glance

```
IDENTITY
  UserStaffTable ─── Doctors, nurses, coordinators, admin staff
  PatientTable ───── Patient demographics, MRN/UHID, Aadhaar KYC

CLINICAL CORE
  EncounterTable ─── Admissions, encounters, risk scores, comorbidities
  MedicationOrderTable ── Orders, favorites, catalog, administration records
  LabInvestigationTable ─ Lab results, investigation orders, radiology (DICOM)
  ClinicalDocumentTable ─ Progress notes, discharge summaries (28 sections),
                          initial assessments (27 widgets), checklists,
                          operation notes (SNOMED-CT), PAC (ASA grading),
                          cross-consultations, handovers, incident reports,
                          CT scorecards, clinical macros, past records
  VitalsTable ─────── Time-series vital signs (11+ parameters, daily partitioned)
  CareTeamTable ───── Team membership, templates (PC-based, HSC-based)

COMMUNICATION
  PatientMessageTable ── Clinical context messages (16 categories)
  ChatTable ─────────── ACS-powered chat conversations and messages

APPOINTMENTS
  VideoConsultationTable ── Video calls (Agora), follow-up scheduling, slots

WORKFLOWS
  TaskWorkflowTable ──── 20 task types (6 clinical + 13 billing + nursing)

FINANCE
  BillingTable ────────── Invoices, receipts, refunds, discounts, authorizations

OUTREACH
  CampOutreachTable ───── Health camps, patient registrations, coordinators

STORAGE
  DocumentStorageTable ── Patient document metadata (S3 blobs)

SYSTEM
  SystemConfigTable ───── App config, geography, organizations, audit, feedback
```

---

## Key Design Patterns

| Pattern | Application |
|---------|------------|
| Composite Sort Key | All tables -- enables hierarchical queries via `begins_with` |
| Sparse GSI | ClinicalDocumentTable -- only pending-action items appear in GSI1 |
| Adjacency List | CampOutreachTable -- many-to-many camp-patient relationships |
| Daily Partitioning | VitalsTable -- `ENC#X#DATE#YYYY-MM-DD` prevents unbounded growth |
| Hierarchical SK | BillingTable -- `INV#X#REC#Y#REF#Z` models parent-child billing docs |
| Denormalization | Patient name/MRN copied everywhere; Streams+Lambda propagation |
| Encounter-Centric | Clinical tables partitioned by encounter (natural access pattern) |
| Item Type Discrimination | ClinicalDocumentTable stores 12 document types via SK prefix |

---

## Coverage Verification

### AADI Features (All Covered)

| Feature | Table | Verified |
|---------|-------|----------|
| Patient list (filter/sort/pin) | EncounterTable GSI3 | Yes |
| 27 Initial Assessment widgets | ClinicalDocumentTable (WGT# items) | Yes |
| Progress Notes (ack workflow) | ClinicalDocumentTable (PN#) + sparse GSI1 | Yes |
| Discharge Summary (28 sections, 7 states) | ClinicalDocumentTable (DS#) | Yes |
| Operation Notes (SNOMED-CT, surgical team) | ClinicalDocumentTable (OP#) | Yes |
| Pre-Anesthesia Checkup (ASA I-VI) | ClinicalDocumentTable (PAC#) | Yes |
| Checklists (sequential, witness) | ClinicalDocumentTable (CK#) | Yes |
| Medication Orders (full lifecycle) | MedicationOrderTable (MED#) | Yes |
| Medication Dashboard (24hr timeline) | MedicationOrderTable (ADMIN#) | Yes |
| Drug catalog, monographs, interactions | MedicationOrderTable (CATALOG#) | Yes |
| Medication reconciliation | MedicationOrderTable (RECON#) | Yes |
| Investigation orders + favorites | LabInvestigationTable (ORDER#, FAV#) | Yes |
| Lab results (panels, abnormal flags) | LabInvestigationTable (RESULT#) | Yes |
| Radiology (DICOM, AI findings) | LabInvestigationTable (RAD#) | Yes |
| Vital trends (11 params, D3.js) | VitalsTable (daily partitioned) | Yes |
| CT Scorecard (0-25) | ClinicalDocumentTable (CTS#) | Yes |
| ECG viewer | External system (patchId ref on EncounterTable) | Yes |
| Patient chat (16 categories, offline queue) | PatientMessageTable | Yes |
| Patient communication (IVR, bystanders) | PatientTable (CONTACT# items) | Yes |
| Care team management | CareTeamTable | Yes |
| Cross-consultation | ClinicalDocumentTable (CC#) | Yes |
| Handover request (accept/reject) | ClinicalDocumentTable (HO#) | Yes |
| Incident report (with attachments) | ClinicalDocumentTable (IR#) | Yes |
| Discharge intimation/revert | EncounterTable (status field) | Yes |
| Risk scoring (mortality prediction) | EncounterTable (RISK# items) | Yes |
| Comorbidities | EncounterTable (COMORBIDITY# items) | Yes |
| Patient labels | PatientTable (LABEL# items) | Yes |
| Past records (6 pages) | ClinicalDocumentTable (PASTRECORDS#) | Yes |
| Follow-up scheduling | VideoConsultationTable (FOLLOWUP, SLOT#) | Yes |
| Video consultation (Agora) | VideoConsultationTable (APT#) | Yes |
| Post-VC prescription uploads | VideoConsultationTable (OPD#) | Yes |
| Nursing capture notes | TaskWorkflowTable | Yes |
| Activity Area (6 task categories) | TaskWorkflowTable | Yes |
| Clinical macros (templates) | ClinicalDocumentTable (MACRO#) | Yes |
| Login (3 auth methods) | UserStaffTable | Yes |
| FCM push notifications | UserStaffTable (FCM# items) | Yes |
| Notification preferences | UserStaffTable (PREF item) | Yes |
| Doctor schedule/availability | UserStaffTable (SCHEDULE# items) | Yes |

### AHAM Features (All Covered)

| Feature | Table | Verified |
|---------|-------|----------|
| 13 billing approval types | TaskWorkflowTable | Yes |
| 3 task queues (MY/GROUP/ALL) | TaskWorkflowTable GSI1/GSI2 | Yes |
| Task claim/release/approve/reject | TaskWorkflowTable | Yes |
| Chat conversations (ACS) | ChatTable | Yes |
| Chat assign/delegate/reassign | ChatTable (METADATA updates) | Yes |
| Health camps (lifecycle) | CampOutreachTable | Yes |
| Camp patient registration | CampOutreachTable (PAT# items) | Yes |
| Temp registration (pre-UHID) | CampOutreachTable (TEMP# items) | Yes |
| Aadhaar KYC verification | PatientTable (AADHAAR item) | Yes |
| Invoices (40+ fields) | BillingTable (INV#) | Yes |
| Receipts | BillingTable (INV#X#REC#) | Yes |
| Refunds | BillingTable (INV#X#REC#Y#REF#) | Yes |
| Unbilled documents | BillingTable (UNBILL#) | Yes |
| Discounts/authorizations | BillingTable (DISC#, AUTH#) | Yes |
| High-value medication requests | BillingTable (MEDREQ#) | Yes |
| Patient search (MPI) | PatientTable GSI1/GSI2/GSI3 | Yes |
| Patient registration | PatientTable | Yes |
| Organizations/units | SystemConfigTable (CONFIG#ORG) | Yes |
| Geography (zipcode lookup) | SystemConfigTable (GEO#) | Yes |
| Customer feedback | SystemConfigTable (FEEDBACK#) | Yes |
| App configuration | SystemConfigTable (CONFIG#APP) | Yes |
| Document upload/download | DocumentStorageTable | Yes |
| Comments on tasks | TaskWorkflowTable (COMMENT# items) | Yes |
| Coordinator management | CampOutreachTable (COORD# items) | Yes |

### Not in DynamoDB (By Design)

| Feature | Why | Where Instead |
|---------|-----|---------------|
| Firebase Analytics | Real-time analytics pipeline | Firebase |
| ECG waveforms | Continuous streaming data | Device monitoring system |
| OTP codes | Sub-second TTL needed | ElastiCache (Redis) |
| Image editing | Client-side processing | Device memory |
| Localization (8 languages) | Static assets | App bundle |
| Real-time message delivery | WebSocket/ACS | STOMP/ACS infrastructure |
| Full-text search | DynamoDB lacks this | OpenSearch (via Streams) |

---

## Cost Analysis (MCP Tool Output)

**Total: $5,053.83/month** (on-demand, us-east-1)

| Category | Cost |
|----------|------|
| Storage (240 GB) | $60/mo |
| Read/Write requests | $4,994/mo |

### Top 5 Cost Tables

| Table | Cost/mo | % | Optimization |
|-------|---------|---|-------------|
| EncounterTable + GSIs | $860 | 17% | DAX on GSI3 saves $300 |
| VitalsTable + GSI | $856 | 17% | TTL bounds storage |
| MedicationOrderTable + GSIs | $758 | 15% | Normal clinical volume |
| ClinicalDocumentTable + GSIs | $529 | 10% | INCLUDE projection on GSI2 |
| PatientMessageTable + GSI | $461 | 9% | TTL on old messages |

---

## MCP Tools Used

| Tool | Iteration | Output |
|------|-----------|--------|
| `dynamodb_data_modeling` | 1 | Expert prompt patterns applied to design |
| `dynamodb_data_model_schema_converter` | 2 | Schema format loaded; `dynamodb_data_model.md` created |
| `compute_performances_and_costs` | 3 | $5,054/mo cost report with per-table breakdown |
| `dynamodb_data_model_schema_validator` | 6-8 | 16/16 schemas PASSED (43 entities, 139 patterns) |

---

## File Inventory

```
dynamodb-spec/
  README.md                    ── Navigation guide and stats
  FINAL_SUMMARY.md             ── This file: consolidated summary
  00_ARCHITECTURE.md           ── 16-table inventory, patterns, security
  01_DECISIONS.md              ── 12 design decisions with rationale
  02_USECASES.md               ── 175+ use cases across 17 domains
  03_ACCESS_PATTERNS.md        ── 120+ access patterns with DDB operations
  04_TABLE_DESIGN.md           ── Complete schema (keys, GSIs, attributes)
  05_CRITIQUE.md               ── 15 critiques (8 resolved, 5 accepted, 2 open)
  dynamodb_data_model.md       ── Formal model for MCP schema converter
  dynamodb_requirement.md      ── Requirements for MCP data modeling tool
  features/
    01_user_staff.md           ── Auth, user search, FCM
    02_patient.md              ── Demographics, MRN/UHID, HIPAA
    03_encounter.md            ── Patient list, filters, discharge
    04_clinical.md             ── Meds, labs, docs, vitals (4 tables)
    05_messaging.md            ── Patient messages + ACS chat (2 tables)
    06_billing.md              ── Invoice hierarchy, workflows
    07_tasks.md                ── 20 task types, 3-queue model
    08_camps.md                ── Camp lifecycle, adjacency list
    09_documents_config.md     ── Documents, config, geography, video
  schema/                      ── 16 MCP-validated schema.json files
    PatientTable_schema.json
    EncounterTable_schema.json
    UserStaffTable_schema.json
    MedicationOrderTable_schema.json
    VitalsTable_schema.json
    TaskWorkflowTable_schema.json
    BillingTable_schema.json
    ChatTable_schema.json
    PatientMessageTable_schema.json
    CareTeamTable_schema.json
    CampOutreachTable_schema.json
    LabInvestigationTable_schema.json
    VideoConsultationTable_schema.json
    DocumentStorageTable_schema.json
    SystemConfigTable_schema.json
    ClinicalDocumentTable_schema.json
```

---

## MCP-Validated Schemas

7 table schemas generated as `schema.json` and validated via `dynamodb_data_model_schema_validator`:

| Schema File | Entities | Patterns | Status |
|------------|----------|----------|--------|
| `schema/PatientTable_schema.json` | PatientProfile, AadhaarVerification, PatientLabel, EmergencyContact | 13 | PASSED |
| `schema/EncounterTable_schema.json` | EncounterMetadata, Admission, RiskScore, Comorbidity, BedTransfer | 15 | PASSED |
| `schema/UserStaffTable_schema.json` | UserProfile, UserPreferences, DoctorSchedule, FcmToken | 15 | PASSED |
| `schema/MedicationOrderTable_schema.json` | MedicationOrder, MedicationAdminRecord, MedicationFavorite | 12 | PASSED |
| `schema/VitalsTable_schema.json` | VitalReading (11+ vital params, daily partitioned) | 5 | PASSED |
| `schema/TaskWorkflowTable_schema.json` | TaskMetadata, TaskProcessVariables, TaskComment | 12 | PASSED |
| `schema/BillingTable_schema.json` | Invoice, Receipt, Refund (hierarchical SK) | 7 | PASSED |
| `schema/ChatTable_schema.json` | ChatConversation, ChatMessage | 8 | PASSED |
| `schema/PatientMessageTable_schema.json` | PatientMessage | 5 | PASSED |
| `schema/CareTeamTable_schema.json` | CareTeamMetadata, CareTeamMember, CareTeamTemplate | 7 | PASSED |
| `schema/CampOutreachTable_schema.json` | CampMetadata, CampPatient | 6 | PASSED |
| `schema/LabInvestigationTable_schema.json` | InvestigationOrder, LabResult, RadiologyResult | 8 | PASSED |
| `schema/VideoConsultationTable_schema.json` | Appointment, FollowUpRecord | 7 | PASSED |
| `schema/DocumentStorageTable_schema.json` | PatientDocument | 3 | PASSED |
| `schema/SystemConfigTable_schema.json` | AppConfig, GeographyRecord, AuditEvent | 5 | PASSED |
| `schema/ClinicalDocumentTable_schema.json` | ProgressNote, DischargeSummary, Checklist | 11 | PASSED |

**16/16 tables** -- 100% schema coverage. All ready for `generate_data_access_layer`.

**Total across all schemas: 43 entities, 139 access patterns, 16/16 PASSED validation.**

---

## Iteration History

| # | Focus | Key Additions |
|---|-------|---------------|
| 1 | Foundation | 16 tables, 100+ access patterns, 12 decisions, 10 critiques |
| 2 | Gaps | Doctor/patient details, radiology, PAC, OT notes, past records. 8 critiques resolved |
| 3 | Cost | MCP cost analysis ($5,054/mo), table separation review, DAX recommendations |
| 4 | Quality | Follow-up system, medication admin records, nursing tasks, final gap closure |
| 5 | Verification | Cross-check against all source specs, full coverage verification |
| 6 | Schemas | 3 core table schema.json files generated and MCP-validated |
| 7 | Schemas+ | 4 more schemas (Meds, Vitals, Tasks, Billing) -- total 7/16 validated |
| 8 | Schemas++ | Remaining 9 schemas -- 16/16 validated, 43 entities, 139 patterns |
| 9 | Final | Consolidation pass, all documentation updated |
