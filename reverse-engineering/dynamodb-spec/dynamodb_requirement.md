# DynamoDB Requirements -- Clinical Canvas Healthcare Platform

> Input requirements for the DynamoDB Data Modeling Expert System
> Generated from reverse-engineering analysis of AADI + AHAM apps

---

## 1. Application Overview

**Name**: Clinical Canvas Healthcare Platform
**Domain**: Healthcare / Hospital Management
**Architecture**: Multi-app platform with shared backend microservices

### Applications

| App | Tech Stack | Users | Purpose |
|-----|-----------|-------|---------|
| AADI | Ionic/Angular 17 | Doctors, Nurses | Inpatient clinical management -- medications, labs, notes, discharge, video consultation |
| AHAM | Flutter | Staff, Coordinators | Admin/outreach -- task approvals, billing, chat, camp management, patient registration |

### Backend Services (11 Microservices)

Gateway, Registry, MDM (Master Data), jBPM (Workflow), AMB (Billing), MPI (Patient Index), PRM (Patient Relations), COM (Comments), DMS (Documents), UAA (Auth), EHR (ATHMA proxy)

---

## 2. Entity Catalog (70+ Entities)

### Identity & Access
- User/Staff (doctors, nurses, paramedics, coordinators, admin)
- User preferences, notification settings
- FCM device tokens
- Doctor schedules and availability

### Patient
- Patient demographics (MRN, UHID, Aadhaar)
- Patient labels/attributes
- Emergency contacts / bystanders
- Insurance details

### Clinical Encounters
- Encounters (inpatient, OPD, emergency)
- Admissions (ward, bed, consultant, visit type)
- Bed transfers
- Risk scores (mortality prediction, AI)
- Comorbidities (individual records)
- Discharge tracking

### Medications
- Medication orders (full lifecycle: ADDED → CLOSED)
- Medication reconciliation
- Medication favorites (per doctor)
- Drug catalog (brand/generic)
- Drug interactions
- Drug monographs

### Lab & Investigations
- Investigation orders
- Lab results (general + panel/parameter)
- Radiology results (DICOM, AI findings)
- Investigation favorites
- Investigation catalog

### Clinical Documents (9 types)
- Progress notes (rich text + acknowledgment workflow)
- Discharge summaries (28 sections, review/signoff workflow)
- Initial assessments (27 widgets)
- Checklists (surgical, sequential answering)
- Operation notes (surgical team, SNOMED-CT diagnoses)
- Pre-anesthesia checkup (ASA grading)
- Cross-consultations
- Handover requests
- Incident reports
- Clinical macros/templates
- CT Scorecard
- Past record summaries

### Vitals
- Vital signs (11+ parameters)
- ECG data (device integration reference)

### Care Teams
- Team membership (adjacency list)
- Team templates (PC-based, HSC-based)

### Messaging
- Patient messages (16 clinical categories)
- Chat conversations (ACS-powered)
- Chat messages with attachments

### Video Consultation
- Appointments (Agora RTC)
- In-call chat
- Post-consultation uploads
- VC audit logs

### Tasks & Workflows
- Clinical tasks (6 types: PN ack, DS create/signoff, IA review, checklist approval, cross-consultation)
- Billing tasks (13 types: invoice, discount, receipt, refund, retrospect, authorization, LCHM)
- jBPM process variables
- Task comments

### Billing & Finance
- Invoices (40+ fields)
- Invoice line items
- Receipts
- Refunds
- Unbilled documents
- Authorizations
- Discounts
- Retrospect invoices
- Reversal invoices
- Medication requests (high-value)

### Outreach & Camps
- Health camps (lifecycle: NOT_STARTED → DONE)
- Camp-patient registrations
- Temporary registrations (pre-UHID)
- Coordinators
- Consultants
- Work patterns (overbooking)

### Documents
- Patient document metadata (S3 references)
- Document tags

### System & Config
- App configuration
- Geography master data (country → state → district → city → zipcode)
- Organizations and units
- FAQ categories
- Audit events
- Customer feedback/surveys
- Server downtime info

---

## 3. Scale Estimates

| Metric | Estimate | Notes |
|--------|----------|-------|
| Hospital units | 10-50 | Multi-campus deployment |
| Active users | 5,000-10,000 | Doctors, nurses, staff |
| Active patients | 50,000-100,000 | At any time across units |
| Total patients | 500,000+ | Historical + active |
| Encounters/year | 200,000+ | Admissions per year |
| Medications/day | 5,000-10,000 | Orders across all units |
| Lab results/day | 10,000-20,000 | Including panel results |
| Vitals/day | 50,000-100,000 | Continuous monitoring |
| Messages/day | 20,000-50,000 | Clinical + chat |
| Tasks/day | 500-1,000 | Clinical + billing |
| Invoices/day | 500-1,000 | Billing documents |

---

## 4. Access Pattern Summary (110+ Patterns)

### Read-Heavy Patterns (High Frequency)
- Doctor's patient list (filtered, sorted) -- 100+ RPS per unit
- Patient lookup by MRN/UHID -- 200+ RPS
- Medication list for encounter -- 100 RPS
- Lab results for encounter -- 100 RPS
- Vital signs for encounter -- 200 RPS (writes) + 100 RPS (reads)
- Message history for patient -- 100 RPS
- App config read -- 100 RPS (cache this!)

### Write-Heavy Patterns
- Vital signs recording -- 500 WCU peak
- Message writes -- 300 WCU peak
- Lab result batch uploads -- 300 WCU peak
- Medication order updates -- 200 WCU peak
- Audit event logging -- 50 WCU constant

### Mixed Patterns
- Task claim/release (read list + update item) -- 50 RPS
- Progress note create + acknowledge -- 20 RPS
- Invoice + receipt + refund lifecycle -- 50 RPS

---

## 5. Non-Functional Requirements

### Performance
- Patient list load: < 500ms (primary UX path)
- Single item reads: < 50ms (p99)
- Write operations: < 100ms (p99)

### Availability
- 99.99% uptime (DynamoDB SLA)
- Multi-AZ deployment

### Data Retention
- Patient records: Permanent
- Clinical documents: Permanent
- Vitals: 2 years online, then S3 archive
- Chat messages: 1 year online
- Audit events: 90 days online
- Completed tasks: 1 year online

### Security (HIPAA)
- Encryption at rest (KMS)
- Encryption in transit (TLS 1.2+)
- Fine-grained IAM per table
- PHI isolation (PatientTable stricter access)
- CloudTrail + DynamoDB Streams for audit

### Multi-Tenancy
- Unit-level data isolation via GSI keys
- No cross-unit queries without authorization
- Organization-level aggregation via separate GSI

---

## 6. Integration Requirements

| External System | Integration Pattern | Data Flow |
|----------------|-------------------|-----------|
| ATHMA EHR | API Gateway + Lambda | Bidirectional (EHR_001-EHR_169 codes) |
| Azure Communication Services | Streams + Lambda | Bidirectional chat sync |
| jBPM Workflow Engine | API Gateway + Lambda | Task state management |
| Firebase (FCM, Analytics) | Direct write | Push tokens, analytics events |
| Amazon S3 | Reference pattern | Document blob storage |
| Amazon OpenSearch | DynamoDB Streams | Full-text search indexing |
| ElastiCache (Redis) | Direct | OTP codes, session cache |
| Amazon DAX | Cache layer | Hot query caching |

---

## 7. Design Constraints

1. **No JOINs**: All queries must be self-contained (denormalization required)
2. **10GB partition limit**: No single partition can exceed 10GB
3. **400KB item limit**: Large items (discharge summaries) may need to split HTML sections
4. **GSI limit**: 20 GSIs per table (we use max 3)
5. **Billing accuracy**: Financial data requires strong consistency
6. **Clinical safety**: Medication interactions must be strongly consistent
7. **Offline support**: AADI app works offline; sync on reconnect
8. **Real-time not via DDB**: WebSocket/ACS for real-time; DDB for persistence only
