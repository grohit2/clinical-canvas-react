# DynamoDB Architecture Overview

> Clinical Canvas Healthcare Platform -- Multi-Table DynamoDB Design
> Version: 1.0 (Initial Iteration)
> Date: 2026-04-23

---

## System Context

Clinical Canvas is a healthcare platform consisting of two applications:

1. **AADI** -- Doctor-facing clinical app (Ionic/Angular) for inpatient management, medication ordering, lab results, progress notes, discharge summaries, video consultations, and care team coordination.
2. **AHAM** -- Staff-facing admin/outreach app (Flutter) for task management, billing approvals, chat conversations, outreach camp management, and patient registration.

Both apps share a common backend with microservices: Gateway, Registry, MDM, jBPM, AMB, MPI, PRM, COM, DMS, UAA.

---

## Design Philosophy

### Multi-Table Strategy

We adopt a **multi-table design** with each table owning a distinct domain bounded context. This prioritizes:

- **Team autonomy**: Different teams can own and evolve their tables independently
- **Capacity isolation**: Hot tables (messaging, vitals) don't affect cold tables (config, geography)
- **Security boundaries**: HIPAA-sensitive clinical data separated from admin/billing data
- **Operational clarity**: Each table has its own backup, TTL, and scaling policies

### When Tables Are Merged

Tables are only merged when:
- Entities share the exact same partition key and are always queried together
- The combined item collection stays under 10GB (DynamoDB partition limit)
- Access patterns naturally overlap (e.g., invoice + receipt + refund)

### When Tables Are Separated

Tables are separated when:
- Data has different read/write ratios (vitals = write-heavy, config = read-heavy)
- Data has different TTL requirements (audit logs = 90 days, patient records = permanent)
- Security/compliance requires isolation (PII, PHI)
- Hot partition risk exists from combining high-cardinality entities

---

## Table Inventory (16 Tables)

| # | Table Name | Domain | Items/Scale | R/W Profile | TTL |
|---|-----------|--------|-------------|-------------|-----|
| 1 | `UserStaffTable` | Identity | ~10K users | Read-heavy | None |
| 2 | `PatientTable` | Patient Demographics | ~500K patients | Read-heavy | None |
| 3 | `EncounterTable` | Admissions & Encounters | ~1M encounters | Read-heavy | None |
| 4 | `MedicationOrderTable` | Medication Orders | ~5M orders | Mixed | None |
| 5 | `LabInvestigationTable` | Lab Results & Investigations | ~10M results | Write-heavy | None |
| 6 | `ClinicalDocumentTable` | Progress Notes, DS, IA, Checklists, Ops | ~3M docs | Mixed | None |
| 7 | `VitalsTable` | Vital Signs Time-Series | ~50M readings | Write-heavy | 2 years |
| 8 | `CareTeamTable` | Care Team Membership | ~50K teams | Read-heavy | None |
| 9 | `PatientMessageTable` | Clinical Context Messages | ~20M messages | Mixed | None |
| 10 | `ChatTable` | ACS Chat Conversations & Messages | ~10M messages | Write-heavy | 1 year |
| 11 | `VideoConsultationTable` | VC Sessions & Appointments | ~500K sessions | Read-heavy | None |
| 12 | `TaskWorkflowTable` | Clinical & Billing Tasks | ~2M tasks | Mixed | 1 year |
| 13 | `BillingTable` | Invoices, Receipts, Refunds | ~5M documents | Mixed | None |
| 14 | `CampOutreachTable` | Outreach Camps & Registrations | ~100K camps | Read-heavy | None |
| 15 | `DocumentStorageTable` | Patient Document Metadata | ~5M documents | Read-heavy | None |
| 16 | `SystemConfigTable` | Config, Geography, FCM, Audit | ~100K items | Read-heavy | Varies |

---

## Cross-Table Relationships

```
UserStaffTable -----> CareTeamTable (team membership)
       |
       +-----------> TaskWorkflowTable (task assignment)
       |
       +-----------> ChatTable (conversation assignment)

PatientTable -------> EncounterTable (admissions)
       |
       +-----------> PatientMessageTable (clinical messages)
       |
       +-----------> DocumentStorageTable (uploaded docs)
       |
       +-----------> CampOutreachTable (camp registrations)
       |
       +-----------> BillingTable (invoices/receipts)

EncounterTable -----> MedicationOrderTable (medication orders)
       |
       +-----------> LabInvestigationTable (lab results)
       |
       +-----------> ClinicalDocumentTable (notes, summaries)
       |
       +-----------> VitalsTable (vital readings)
       |
       +-----------> CareTeamTable (encounter care team)
       |
       +-----------> VideoConsultationTable (VC sessions)

SystemConfigTable --- standalone reference data
```

---

## Key Design Patterns Used

| Pattern | Where Applied | Why |
|---------|--------------|-----|
| **Composite Sort Key** | All tables | Enables hierarchical queries (e.g., `DOC#PN#2026-04-23`) |
| **GSI Overloading** | TaskWorkflowTable, BillingTable | Multiple entity types share GSI with different key structures |
| **Sparse GSI** | ClinicalDocumentTable (pending acknowledgment) | Only items needing action appear in the index |
| **Write Sharding** | VitalsTable, PatientMessageTable | Distribute hot partitions across shards |
| **Denormalization** | All tables | Patient name, MRN copied to avoid cross-table lookups |
| **Adjacency List** | CareTeamTable, CampOutreachTable | Model many-to-many relationships |
| **Time-Series Partitioning** | VitalsTable, PatientMessageTable | Partition by time window to manage item collections |

---

## Capacity Planning

### On-Demand Mode (Recommended for Initial Launch)

All tables start in on-demand mode to handle unpredictable traffic patterns. Switch to provisioned mode with auto-scaling once traffic patterns stabilize (typically 2-4 weeks post-launch).

### Estimated Traffic (Per Hospital Unit)

| Table | Peak WCU | Peak RCU | Notes |
|-------|----------|----------|-------|
| VitalsTable | 500 | 200 | Continuous monitoring devices |
| PatientMessageTable | 300 | 1000 | Shift change spikes |
| MedicationOrderTable | 200 | 500 | Morning medication rounds |
| LabInvestigationTable | 300 | 800 | Lab result batch uploads |
| ClinicalDocumentTable | 100 | 300 | Progress note rounds |
| BillingTable | 50 | 200 | Billing cycles |
| Others | <50 | <100 | Low traffic |

---

## Security & Compliance

### HIPAA Considerations

- **Encryption at rest**: All tables use AWS-managed KMS keys (default)
- **Encryption in transit**: TLS 1.2+ enforced
- **Fine-grained access**: IAM policies scope access by table (clinical vs. billing vs. admin)
- **Audit logging**: CloudTrail + DynamoDB Streams for all write operations
- **PHI isolation**: Patient demographics in dedicated table with stricter IAM policies
- **Data retention**: TTL policies enforce retention schedules

### Multi-Tenancy (Hospital Units)

- `unitCode` included in GSI keys for unit-level data isolation
- No cross-unit queries without explicit authorization
- Organization-level aggregation via separate GSI

---

## Integration Points

| Integration | Pattern | Details |
|------------|---------|---------|
| **ATHMA EHR** | API Gateway + Lambda | ATHMA proxy calls translated to DynamoDB operations |
| **Azure Communication Services** | DynamoDB Streams + Lambda | Sync chat state bidirectionally |
| **jBPM Workflow** | API Gateway + Lambda | Task state changes written to TaskWorkflowTable |
| **Firebase (FCM/Analytics)** | Direct write | FCM tokens stored in SystemConfigTable |
| **S3 (Documents)** | Reference pattern | DocumentStorageTable stores metadata; S3 stores blobs |
| **OpenSearch** | DynamoDB Streams | Full-text search for patients, medications, notes |
