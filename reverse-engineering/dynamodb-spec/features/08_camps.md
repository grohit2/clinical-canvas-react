# Feature: Outreach Camp Management

> Table: `CampOutreachTable`
> Owners: PRM Service (Patient Relationship Management)

---

## Domain Overview

Health outreach camps for community healthcare. Camps are organized by hospital units, staffed by coordinators and consultants, and serve as patient registration points for rural/underserved communities.

## Camp Lifecycle

```
NOT_STARTED ──→ IN_PROGRESS ──→ DONE
     │
     └──→ CANCELLED
```

- Only `NOT_STARTED` camps can be started
- Only `IN_PROGRESS` camps can be completed
- `CANCELLED` and `DONE` are terminal states

## Entity Types in This Table

| Entity | SK Pattern | Description |
|--------|-----------|-------------|
| Camp Metadata | `METADATA` | Camp details, status, dates |
| Camp Patient | `PAT#{patientId}` | Patient registered in camp |
| Temp Registration | `TEMP#{tempId}` | Pre-formal registration |
| Coordinator | `COORD#{coordinatorId}` | Assigned coordinator |
| Consultant | `CONS#{consultantId}` | Assigned doctor |
| Work Pattern | `WPAT#{workPatternId}` | Overbooking config |

## Adjacency List Pattern

The camp-patient relationship is many-to-many:
- A camp has many patients
- A patient can attend multiple camps

### Forward Direction (Camp → Patients)

```
PK = CAMP#CMP-001, SK = METADATA        → Camp details
PK = CAMP#CMP-001, SK = PAT#P-100234    → Patient registration
PK = CAMP#CMP-001, SK = PAT#P-100235    → Another patient
PK = CAMP#CMP-001, SK = COORD#C-001     → Coordinator
PK = CAMP#CMP-001, SK = CONS#DR-001     → Consultant
```

Query: `PK = CAMP#CMP-001, SK begins_with PAT#` → All patients in this camp

### Reverse Direction (Patient → Camps) via GSI2

```
GSI2PK = PAT#P-100234, GSI2SK = CAMP#CMP-001  → Patient's camp
GSI2PK = PAT#P-100234, GSI2SK = CAMP#CMP-002  → Another camp
```

Query: `GSI2PK = PAT#P-100234` → All camps this patient attended

## Patient Registration Flow

### With UHID (Existing Patient)

```
1. Staff searches MPI → finds patient with UHID
2. PutItem: PK = CAMP#CMP-001, SK = PAT#{patientId}
   → uhid = UHID-001, tempId = null
3. GSI2PK set for reverse lookup
```

### Without UHID (New/Temp Registration)

```
1. Staff registers at camp → no MPI match
2. PutItem: PK = CAMP#CMP-001, SK = TEMP#TMP-001
   → patientName, mobileNumber, tempId = TMP-001
3. Later: MPI registration assigns UHID
4. PutItem: PK = CAMP#CMP-001, SK = PAT#{newPatientId}
   → uhid = UHID-NEW, tempId = TMP-001
5. DeleteItem: PK = CAMP#CMP-001, SK = TEMP#TMP-001
```

## GSI Design

### GSI1: Camps by Unit and Status

```
GSI1PK = UNIT#NH-BLR-01#STATUS#IN_PROGRESS
GSI1SK = DATE#2026-04-20

→ Active camps for a unit, sorted by start date
→ Used in AHAM camp list view
```

Only camp METADATA items have GSI1PK populated (sparse for patient/coordinator items).

### GSI2: Camps for Patient (Reverse Lookup)

```
GSI2PK = PAT#P-100234
GSI2SK = CAMP#CMP-001

→ All camps a patient has been registered in
→ Useful for patient history view
```

## Capacity Estimates

| Operation | Peak RCU | Peak WCU | Notes |
|-----------|----------|----------|-------|
| Camp list by unit | 10 | 0 | AHAM camp view |
| Patients in camp | 20 | 0 | During active camp |
| Patient registration | 0 | 10 | Camp registration surge |
| Camp status update | 0 | 2 | Start/complete camp |
| Coordinator update | 0 | 2 | Admin operation |

## Camp Patient Registration Surge

During an active camp, patient registrations can spike (50-100 registrations per hour). All writes go to the same partition (`CAMP#{campId}`). At ~500 bytes per item and 100 writes/hour, this is well within DynamoDB's 1000 WCU per partition limit.

## Appointment Booking from Camp

After camp registration, staff can book follow-up appointments:

```
POST /amb/_create/appointments/external
→ Creates appointment in VideoConsultationTable
→ Links back to camp via metadata
```

This is a cross-table reference, not stored in CampOutreachTable.
