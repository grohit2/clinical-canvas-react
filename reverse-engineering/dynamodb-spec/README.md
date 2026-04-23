# DynamoDB Specification -- Clinical Canvas Healthcare Platform

> Multi-table DynamoDB design for AADI (doctor app) + AHAM (staff app)
> Version: 5.0 (Final) | Date: 2026-04-23 | 5 Iterations

---

## File Index

### Core Documents

| File | Description |
|------|-------------|
| [00_ARCHITECTURE.md](./00_ARCHITECTURE.md) | System context, 16-table inventory, design patterns, capacity planning, security |
| [01_DECISIONS.md](./01_DECISIONS.md) | 12 design decisions with rationale, alternatives, and trade-offs |
| [02_USECASES.md](./02_USECASES.md) | 150+ use cases across 15 feature domains |
| [03_ACCESS_PATTERNS.md](./03_ACCESS_PATTERNS.md) | 100+ access patterns with DynamoDB operations, keys, GSIs, and frequency |
| [04_TABLE_DESIGN.md](./04_TABLE_DESIGN.md) | Complete schema for all 16 tables with keys, GSIs, attributes, and examples |
| [05_CRITIQUE.md](./05_CRITIQUE.md) | Self-critique: 15 issues tracked, 8 resolved, 5 accepted, 2 open |
| [FINAL_SUMMARY.md](./FINAL_SUMMARY.md) | Consolidated summary with full coverage verification |
| [dynamodb_data_model.md](./dynamodb_data_model.md) | Formal data model for AWS DynamoDB MCP tooling |
| [dynamodb_requirement.md](./dynamodb_requirement.md) | Requirements document for MCP data modeling tool |

### Feature-Specific Deep Dives

| File | Tables Covered | Features |
|------|---------------|----------|
| [features/01_user_staff.md](./features/01_user_staff.md) | UserStaffTable | Auth, user search, FCM tokens |
| [features/02_patient.md](./features/02_patient.md) | PatientTable | Demographics, MRN/UHID lookup, Aadhaar KYC |
| [features/03_encounter.md](./features/03_encounter.md) | EncounterTable | Admissions, patient list, 9-filter system, discharge |
| [features/04_clinical.md](./features/04_clinical.md) | MedicationOrderTable, LabInvestigationTable, ClinicalDocumentTable, VitalsTable | Medications, labs, progress notes, discharge summaries, initial assessments, checklists, vitals |
| [features/05_messaging.md](./features/05_messaging.md) | PatientMessageTable, ChatTable | Clinical messages (16 categories), ACS chat, offline sync |
| [features/06_billing.md](./features/06_billing.md) | BillingTable | Invoices, receipts, refunds, discounts, authorizations |
| [features/07_tasks.md](./features/07_tasks.md) | TaskWorkflowTable | 19 task types (6 clinical + 13 billing), 3-queue model |
| [features/08_camps.md](./features/08_camps.md) | CampOutreachTable | Camp lifecycle, patient registration, adjacency list |
| [features/09_documents_config.md](./features/09_documents_config.md) | DocumentStorageTable, SystemConfigTable, VideoConsultationTable | Document metadata, geography, config, video consultations |

---

## Quick Stats

| Metric | Count |
|--------|-------|
| Tables | 16 |
| GSIs | 38 (2-3 per table) |
| Use Cases | 175+ |
| Access Patterns | 120+ |
| Entity Types | 75+ |
| Attributes Modeled | ~430 |
| Design Decisions | 12 |
| Critiques | 15 (8 resolved, 5 accepted, 2 open) |
| Monthly Cost (On-Demand) | $5,054 (34 patterns, 16 tables) |
| Storage | 240 GB across tables + GSIs |
| Iteration | 5 (Final) |

---

## Table Summary

| # | Table | PK Pattern | Primary Purpose |
|---|-------|-----------|----------------|
| 1 | UserStaffTable | `USER#{userId}` | All human actors |
| 2 | PatientTable | `PAT#{patientId}` | Patient demographics |
| 3 | EncounterTable | `ENC#{encounterNumber}` | Admissions & visits |
| 4 | MedicationOrderTable | `ENC#{encounterNumber}` | Medication orders |
| 5 | LabInvestigationTable | `ENC#{encounterNumber}` | Lab results & investigations |
| 6 | ClinicalDocumentTable | `ENC#{encounterNumber}` | PN, DS, IA, checklists, OT notes, PAC, past records |
| 7 | VitalsTable | `ENC#{enc}#DATE#{date}` | Time-series vitals |
| 8 | CareTeamTable | `PAT#{mrn}#ENC#{enc}` | Team membership |
| 9 | PatientMessageTable | `PAT#{mrn}#ENC#{enc}` | Clinical messages |
| 10 | ChatTable | `THREAD#{threadId}` | ACS chat |
| 11 | VideoConsultationTable | `APT#{appointmentNo}` | Video calls |
| 12 | TaskWorkflowTable | `TASK#{taskId}` | Clinical + billing tasks |
| 13 | BillingTable | `PAT#{patientId}` | Invoices, receipts, refunds |
| 14 | CampOutreachTable | `CAMP#{campId}` | Outreach camps |
| 15 | DocumentStorageTable | `PAT#{patientId}` | Document metadata |
| 16 | SystemConfigTable | Various | Config, geography, audit |

---

## MCP Tools Status

| Tool | Status | Output |
|------|--------|--------|
| `dynamodb_data_modeling` | Used (Iteration 1) | Expert prompt reviewed, patterns applied |
| `dynamodb_data_model_schema_converter` | Loaded (Iteration 2) | Schema format understood, `dynamodb_data_model.md` created |
| `compute_performances_and_costs` | Run (Iteration 3) | **$5,054/mo** -- cost report appended to data model |
| `dynamodb_data_model_validation` | Pending | Requires `dynamodb_data_model.json` |
| `generate_resources` | Pending | CDK app generation |
| `generate_data_access_layer` | Pending | Type-safe Python DAL |

## Next Steps

1. ~~Cost Analysis~~ DONE ($5,054/mo on-demand)
2. Generate `schema.json` per table via MCP schema converter
3. Validate via MCP `dynamodb_data_model_validation`
4. Generate CDK via `generate_resources`
5. Generate DAL via `generate_data_access_layer`
6. Implement DAX cache for hot queries (saves ~$300/mo)
7. OpenSearch integration for full-text search
8. DynamoDB Streams event processing architecture
