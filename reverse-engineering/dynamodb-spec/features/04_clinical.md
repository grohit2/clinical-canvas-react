# Feature: Clinical Documentation

> Tables: `MedicationOrderTable`, `LabInvestigationTable`, `ClinicalDocumentTable`, `VitalsTable`
> Owners: EHR Service (ATHMA), Clinical Services

---

## Domain Overview

Four tables handle the clinical data lifecycle. All are partitioned by encounter, reflecting the reality that clinical data is always accessed in the context of a specific patient visit.

---

## 4A: MedicationOrderTable

### Medication Order Lifecycle

```
ADDED → ORDERED → PENDING → DISPENSED → ISSUED → CLOSED
  |                            |            |
  → DELETE     ORDERED →    PARTIALLY_   PARTIALLY_   PARTIALLY_
               CANCELLED    DISPENSED     ISSUED       CLOSED
```

### Key Design Rationale

**PK = `ENC#{encounterNumber}`**: All medications for an encounter fetched together (the primary query). Average 10-30 medications per encounter.

**Favorites** stored with `PK = FAV#{consultantLogin}`: Each doctor has personal medication favorites, queried independently from encounter data.

**Drug catalog** stored with `PK = CATALOG#DRUG`: Reference data for medication search. Consider DAX cache for this partition since it's read-heavy.

### Medication Card Timeline

The medication card shows administration status across 4 time slots per day:
- Morning (00:00-06:00)
- Noon (06:00-12:00)
- Evening (12:00-18:00)
- Night (18:00-24:00)

This is rendered client-side from the `daywiseDosage` and status fields. No separate table needed.

### Drug Interaction Check

Query all ACTIVE medications for an encounter (`PK = ENC#X, SK begins_with MED#, filter status=ACTIVE`), then check interactions via business logic. The interaction rules themselves are reference data (could be in SystemConfigTable or an external service).

---

## 4B: LabInvestigationTable

### Investigation Order + Result Lifecycle

```
Investigation Order:
  ADDED → ORDERED → INPROGRESS → REPORT_READY → PROCESSED
                                                → CANCELLED

Lab Result (attached to order):
  Results arrive from LIS (Lab Information System)
  → Stored as RESULT items with abnormal flags
  → May have multiple parameters (panel tests like CBC)
```

### Key Design Rationale

**PK = `ENC#{encounterNumber}`**: Orders and results share the same partition. An encounter typically has 5-20 investigation orders and 10-50 result items.

**SK separation**: `ORDER#` prefix for orders, `RESULT#` prefix for results. This allows querying orders-only or results-only with begins_with.

**Result trend data**: GSI1 (`PAT#{mrn}`) enables cross-encounter result trends. The D3.js trend chart queries GSI1 with a date range to get all values for a specific test code.

### Abnormal Flag Logic

| Flag | Meaning | UI Color |
|------|---------|----------|
| N | Normal | Green (#5FBA63) |
| H | High | Red (#E35241) |
| L | Low | Red (#E35241) |
| PH | Panic High | Red + Alert |
| PL | Panic Low | Red + Alert |
| AH | Alert High | Red |
| AL | Alert Low | Red |

### Panel Results (PARAMETER type)

A panel test (e.g., CBC) has a parent result with nested parameters:

```json
{
  "PK": "ENC#EN-001",
  "SK": "RESULT#CBC#2026-04-23T10:00:00Z",
  "resultType": "PARAMETER",
  "resultName": "Complete Blood Count",
  "parameters": [
    { "name": "Hemoglobin", "value": "14.2", "unit": "g/dL", "referenceRange": "13.5-17.5", "abnormalFlag": "N" },
    { "name": "WBC", "value": "12000", "unit": "/mcL", "referenceRange": "4500-11000", "abnormalFlag": "H" },
    { "name": "Platelets", "value": "250000", "unit": "/mcL", "referenceRange": "150000-400000", "abnormalFlag": "N" }
  ]
}
```

---

## 4C: ClinicalDocumentTable

### Multi-Document Type Design

This table uses sort key discrimination to store 9 different clinical document types in a single table. They share the same partition (encounter) and many of the same attributes (patient context, creator, timestamps).

### Document Types and Their Workflows

| Type | SK Prefix | Workflow | Typical Count/Encounter |
|------|-----------|----------|------------------------|
| Progress Note | `DOC#PN#` | DRAFT → SUBMITTED → ACKNOWLEDGED | 5-20 |
| Discharge Summary | `DOC#DS#` | NEW → DRAFT → SENT_FOR_REVIEW → UNDER_REVIEW → SIGN_OFF → COMPLETE | 1 |
| Initial Assessment | `DOC#IA#` | Widget-by-widget fill → SUBMITTED → REVIEWED | 1 |
| IA Widget | `DOC#IA#X#WGT#` | Per-widget save | 27 per IA |
| Checklist | `DOC#CK#` | PENDING → DRAFT → PENDING_APPROVAL → COMPLETED/REJECTED | 1-5 |
| Operation Note | `DOC#OP#` | CREATE → EDIT → COMPLETE | 0-2 |
| Cross-Consultation | `DOC#CC#` | Created → Notified | 0-5 |
| Handover | `DOC#HO#` | REQUESTED → ACCEPTED/REJECTED | 0-1 |
| Incident Report | `DOC#IR#` | Created (one-way) | 0-1 |

### Sparse GSI1 for Pending Actions

The most powerful pattern in this table. Only documents needing action have `GSI1PK` populated:

**Example**: A progress note submitted by a junior doctor needs acknowledgment by the primary consultant:

```json
{
  "PK": "ENC#EN-001",
  "SK": "DOC#PN#PN-001",
  "GSI1PK": "PENDING#ACK#dr.sharma",    // ← Only present when unacknowledged
  "GSI1SK": "DATE#2026-04-23T10:00:00Z",
  "status": "SUBMITTED",
  ...
}
```

When Dr. Sharma acknowledges: UpdateItem removes `GSI1PK` and `GSI1SK` → item disappears from the sparse GSI automatically.

### Initial Assessment Widget Storage

Each of the 27 IA widgets is stored as a separate item:

```
PK = ENC#EN-001, SK = DOC#IA#IA-001#WGT#allergy         → allergy data
PK = ENC#EN-001, SK = DOC#IA#IA-001#WGT#vital_signs      → vitals data
PK = ENC#EN-001, SK = DOC#IA#IA-001#WGT#chiefComplaint   → chief complaint
... (27 widgets)
```

**Rationale**: Each widget is saved independently (individual POST/PUT calls). Storing as separate items avoids read-modify-write on a single large item.

### Macros (Clinical Templates)

Stored with `PK = MACRO#{userLogin}`:

```
PK = MACRO#dr.sharma, SK = TYPE#progress-notes#MAC-001   → "Patient stable, vitals normal..."
PK = MACRO#dr.sharma, SK = TYPE#discharge-summary#MAC-002 → "Patient discharged in stable condition..."
```

---

## 4D: VitalsTable

### Time-Series Design

Vitals are the highest-volume clinical data. A monitored ICU patient may have vitals recorded every 5-15 minutes.

### Daily Partitioning

**PK = `ENC#{encounterNumber}#DATE#{YYYY-MM-DD}`**: Each day gets its own partition. This prevents any single partition from growing unbounded during a long admission.

**Why daily, not hourly?**: A typical day has 96-288 vital readings (every 5-15 min). At ~500 bytes per reading, that's 48-144KB per day -- well under the 10GB partition limit. Daily partitioning balances query efficiency with partition management.

### Trend Visualization

The D3.js trend chart in AADI shows a 2-day rolling window:

```
Query 1: PK = ENC#EN-001#DATE#2026-04-22, SK between TIME#00:00:00 and TIME#23:59:59
Query 2: PK = ENC#EN-001#DATE#2026-04-23, SK between TIME#00:00:00 and TIME#23:59:59
```

Two queries, fully parallel, each hitting a separate partition. Maximum performance.

### Cross-Encounter Vitals

GSI1 (`PAT#{mrn}`) enables querying vitals across admissions for longitudinal patient history. The sort key `DATE#{date}#TIME#{time}` ensures chronological ordering.

### TTL

- 2-year TTL from recording date
- Before deletion, DynamoDB Streams triggers archival to S3 (Parquet format for analytics)
- Clinical requirement: vitals accessible for 2 years in real-time, then via S3/Athena

---

## Capacity Estimates (All Clinical Tables)

| Table | Peak RCU | Peak WCU | Hot Partition Risk |
|-------|----------|----------|-------------------|
| MedicationOrderTable | 500 | 200 | Low (spread across encounters) |
| LabInvestigationTable | 800 | 300 | Medium (batch result uploads from LIS) |
| ClinicalDocumentTable | 300 | 100 | Low |
| VitalsTable | 200 | 500 | Medium (ICU monitoring devices) |

### Hot Partition Mitigation

**LabInvestigationTable**: LIS batch uploads can spike writes for a single encounter. Mitigated by:
1. Write buffering in Lambda (batch from LIS → SQS → Lambda → DynamoDB)
2. On-demand capacity mode absorbs spikes

**VitalsTable**: Daily partitioning naturally distributes writes. An encounter with 100 devices still only writes to one daily partition, but the item size is small (~500 bytes) so this is manageable.
