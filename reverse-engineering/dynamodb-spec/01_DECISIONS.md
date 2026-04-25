# Design Decisions & Rationale

> Every non-obvious design choice documented with context, alternatives considered, and trade-offs accepted.

---

## Decision 1: Multi-Table vs. Single-Table Design

**Decision**: Use 16 separate tables instead of a single-table design.

**Context**: The platform spans two apps (AADI + AHAM) with 67+ data models across 11 microservices. A single-table design would create:
- Item collections exceeding 10GB for active hospitals
- Hot partitions from mixing vitals time-series with patient demographics
- Impossible-to-manage IAM policies (clinical data alongside billing data)

**Alternatives Considered**:
1. **Single table**: Maximum query flexibility but operational nightmare at this scale
2. **3-4 domain tables**: Moderate isolation but still mixes concerns (e.g., medications + vitals + notes in one "clinical" table)
3. **16 tables (chosen)**: One table per bounded context, clean ownership boundaries

**Trade-offs Accepted**:
- Cross-table joins require application-level orchestration (acceptable -- the original app already does this via separate API calls)
- More tables to manage operationally (mitigated by Infrastructure-as-Code)
- Some denormalization needed (patient name, MRN copied across tables)

---

## Decision 2: Encounter-Centric Clinical Data Partitioning

**Decision**: Use `encounterNumber` as the primary partition key for clinical tables (Medications, Labs, Clinical Documents, Vitals).

**Context**: The existing AADI app organizes all clinical data by encounter. Every API call includes `encounterNumber` as a required parameter. This is the natural access pattern.

**Why Not Patient MRN?**:
- A patient with 20 admissions would create a massive item collection
- Most queries are "medications for THIS encounter", not "all medications ever"
- Patient-level queries supported via GSI on `patientMrn`

**Why Not Document Number?**:
- Too granular; would require knowing the document ID upfront
- Encounter-level queries are the primary pattern

---

## Decision 3: Separate Vitals Table

**Decision**: Vitals get their own table rather than being part of ClinicalDocumentTable.

**Context**: Vitals are fundamentally different from other clinical documents:
- **Volume**: 50M+ readings vs. 3M clinical documents
- **Write pattern**: Continuous writes from monitoring devices (every 5-15 minutes per patient)
- **Query pattern**: Time-range queries (last 2 days, last 48 hours) vs. document-level queries
- **TTL**: 2-year retention vs. permanent retention for clinical documents
- **Partitioning**: Time-series partitioning needed to avoid hot partitions

**Trade-off**: Extra table to manage, but prevents vitals from overwhelming the clinical document table.

---

## Decision 4: Separate Message Tables (PatientMessage vs. Chat)

**Decision**: Two separate tables for messaging -- `PatientMessageTable` for clinical context messages and `ChatTable` for ACS-powered chat conversations.

**Context**: These are fundamentally different systems:

| Aspect | PatientMessage (AADI) | Chat (AHAM) |
|--------|----------------------|-------------|
| Context | Always tied to a patient/encounter | May or may not have patient context |
| Transport | WebSocket (STOMP) + sync | Azure Communication Services |
| Categories | 16 clinical categories (LAB_RESULT, MEDICATION_ORDER, etc.) | Free-form text + attachments |
| Storage | SQLite offline + server sync | ObjectBox + ACS sync |
| Lifecycle | Permanent clinical record | Conversation-based, can be closed |

**Alternative**: Single messaging table with type discrimination. Rejected because access patterns are completely different.

---

## Decision 5: Billing as Single Table with Item Type Discrimination

**Decision**: Invoices, Receipts, Refunds, Unbilled Documents, and Authorizations share one `BillingTable` using composite sort keys.

**Context**: These entities have a natural parent-child hierarchy:
```
Invoice → Receipt → Refund
Invoice → Authorization
Invoice → Discount
```

**Key Design**:
- PK: `PAT#{patientId}` -- all billing for a patient
- SK: `INV#{invoiceNo}`, `INV#{invoiceNo}#REC#{receiptNo}`, `INV#{invoiceNo}#REC#{receiptNo}#REF#{refundNo}`

This enables:
- Get all billing for a patient: `PK = PAT#123`
- Get invoice with all receipts: `PK = PAT#123, SK begins_with INV#INV001`
- Get specific receipt: `PK = PAT#123, SK = INV#INV001#REC#REC001`

---

## Decision 6: Task Table Unifies AADI + AHAM Tasks

**Decision**: Single `TaskWorkflowTable` for both AADI clinical tasks (6 types) and AHAM billing tasks (13 types).

**Context**: Both apps use the same task lifecycle (OPEN → CLAIMED → IN_PROGRESS → DONE) and the same query patterns (tasks by assignee, tasks by status, tasks by type). The jBPM backend already unifies them.

**Key Design**:
- PK: `UNIT#{unitCode}` -- tasks scoped to hospital unit
- SK: `TASK#{taskId}`
- GSI1: PK=`ASSIGNEE#{userId}`, SK=`STATUS#{status}#TASK#{taskId}` -- my tasks by status
- GSI2: PK=`UNIT#{unitCode}`, SK=`TYPE#{taskName}#CREATED#{timestamp}` -- tasks by type

---

## Decision 7: Geography/Master Data in SystemConfigTable

**Decision**: Geography data (Country, State, District, City, Zipcode) stored in `SystemConfigTable` rather than a dedicated table.

**Context**: Geography data is:
- Small (~50K items total across all hierarchies)
- Read-only (updated by admin, not by app users)
- Queried infrequently (only during patient registration)
- Well-suited to aggressive caching (DAX or application-level)

**Key Design**:
- PK: `GEO#COUNTRY`, SK: `IN` → India
- PK: `GEO#STATE`, SK: `IN#KA` → Karnataka
- PK: `GEO#DISTRICT`, SK: `IN#KA#BLR` → Bangalore Urban
- PK: `GEO#CITY`, SK: `IN#KA#BLR#BANG` → Bangalore
- PK: `GEO#ZIPCODE`, SK: `560001` → specific zipcode

---

## Decision 8: Denormalization Strategy

**Decision**: Copy frequently-accessed patient attributes (name, MRN, gender, age) into every table that references a patient.

**Context**: In DynamoDB, there are no JOINs. Every query should be self-contained. The cost of storing 100 extra bytes per item is negligible compared to the cost of a second read.

**What Gets Denormalized**:
| Attribute | Copied To | Update Strategy |
|-----------|-----------|-----------------|
| Patient name, MRN, gender, DOB | All clinical tables, messaging, billing | DynamoDB Streams + Lambda propagation |
| Consultant name, login | Clinical documents, care teams | DynamoDB Streams + Lambda propagation |
| Unit code, unit name | Tasks, billing, camps | Rarely changes; manual update acceptable |

**Update Propagation**: DynamoDB Streams on `PatientTable` triggers a Lambda function that updates denormalized copies across other tables. This is eventually consistent (seconds of lag) which is acceptable for display-name changes.

---

## Decision 9: Composite Sort Key Convention

**Decision**: Use a consistent sort key naming convention across all tables.

**Format**: `{TYPE}#{subtype}#{identifier}#{timestamp}`

**Examples**:
- `PROFILE` -- singleton metadata item
- `MED#{medicationId}` -- medication order
- `LAB#{orderCode}#RESULT#{resultId}` -- lab result within an order
- `MSG#{timestamp}#{messageId}` -- message sorted by time
- `DOC#PN#{documentNumber}` -- progress note document
- `DOC#DS#{documentNumber}` -- discharge summary document

**Benefits**:
- Consistent prefix enables `begins_with` queries by type
- Hierarchical structure enables drill-down queries
- Timestamp suffix enables time-ordered retrieval

---

## Decision 10: GSI Strategy

**Decision**: Limit to 2-3 GSIs per table, using sparse GSIs where possible.

**Rationale**: Each GSI doubles the write cost for attributes projected to it. We minimize GSIs by:
1. Designing partition keys to serve the primary access pattern
2. Using composite sort keys to serve secondary patterns within the same partition
3. Only adding GSIs for truly cross-partition queries

**Sparse GSI Pattern**: For rare queries like "discharge summaries pending sign-off", we use a sparse GSI where only items with a `pendingAction` attribute appear in the index. This means the GSI contains only actionable items, not the full table.

---

## Decision 11: No DynamoDB Streams for Real-Time Chat

**Decision**: Chat messages use direct DynamoDB writes, not DynamoDB Streams, for the real-time path.

**Context**: Azure Communication Services (ACS) is the source of truth for real-time chat. DynamoDB serves as the persistence/search layer. The flow is:
1. ACS delivers message via WebSocket
2. App writes to DynamoDB for persistence
3. App reads from DynamoDB for history/search

DynamoDB Streams would add unnecessary latency to the real-time path. Streams are used only for:
- Denormalization propagation (patient name changes)
- Analytics pipeline (message volume metrics)
- Audit logging (compliance)

---

## Decision 12: Camp-Patient Many-to-Many via Adjacency List

**Decision**: Use adjacency list pattern in `CampOutreachTable` for the camp-patient relationship.

**Context**: A patient can be registered in multiple camps, and a camp has many patients. The adjacency list pattern handles this naturally:

- `PK = CAMP#{campId}, SK = METADATA` → camp details
- `PK = CAMP#{campId}, SK = PAT#{patientId}` → patient in camp
- GSI1: `PK = PAT#{patientId}, SK = CAMP#{campId}` → camps for patient (inverted)

This avoids a separate join table while supporting both directions of the relationship.
