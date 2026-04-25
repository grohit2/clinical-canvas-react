# Feature: Encounter & Admission Management

> Table: `EncounterTable`
> Owners: ADT Service (Admission/Discharge/Transfer)

---

## Domain Overview

An encounter represents a patient's visit -- inpatient stay, OPD visit, or emergency visit. It is the central axis for all clinical data. Every medication, lab result, progress note, and vital is tied to an encounter.

## Entity Types in This Table

| Entity | SK Pattern | Description |
|--------|-----------|-------------|
| Encounter Metadata | `METADATA` | Core encounter info (status, consultant, ward) |
| Admission Details | `ADMISSION` | Detailed admission record |
| Bed Transfer | `TRANSFER#{timestamp}` | Transfer history |

## Key Access Patterns

### Doctor's Patient List (Critical Path)
The most important query in AADI. A doctor opens the app and sees their assigned patients:

1. **Active encounters by doctor+unit**: GSI2 query `DOC#{consultantLogin}#UNIT#{unitCode}`, SK desc by date
2. **Active encounters by unit (with sorting)**: GSI3 query `UNIT#{unitCode}#STATUS#ACTIVE`, SK sorted by `WARD#{wardSort}#TIME#{lastMsgTime}`
3. **Filtering**: 9 filter dimensions applied as FilterExpression on GSI3 results

### GSI3 Design for Patient List Sorting

The patient list requires complex sorting: pinned patients first, ICU before general, then by last message time. GSI3's sort key `WARD#{wardSort}#TIME#{lastMsgTime}` handles the ward+time sorting. Pin sorting is handled client-side after query (max 50-100 patients per doctor).

### Status Transitions

```
ACTIVE → MARK_FOR_DISCHARGE (MFD)
  → Update: GSI3PK changes from UNIT#X#STATUS#ACTIVE to UNIT#X#STATUS#ACTIVE (MFD is a flag, not a separate status)

ACTIVE → DISCHARGED
  → Update: GSI3PK changes to UNIT#X#STATUS#DISCHARGED
  → Separate partition for discharged patients

ACTIVE → MARK_DEAD / ABSCONDED
  → Update: ipActivityAction field set, GSI3PK stays ACTIVE with filter
```

### Discharged Patient List

GSI3 query `UNIT#{unitCode}#STATUS#DISCHARGED`, sorted by discharge date desc.

## Data Flow

```
New Admission:
  ADT Service → PutItem ENC#{encounterNumber} + METADATA
  → PutItem ENC#{encounterNumber} + ADMISSION
  → Create CareTeam entry
  → Notify assigned doctor (FCM)

Discharge:
  Doctor initiates → UpdateItem status to DISCHARGED
  → Update GSI3PK to reflect new status
  → Create discharge summary task
  → Notify care team

Bed Transfer:
  ADT Service → PutItem ENC#{enc} + TRANSFER#{timestamp}
  → UpdateItem METADATA (update location, ward fields)
  → Notify care team
```

## Capacity Estimates

| Operation | Peak RCU | Peak WCU | Notes |
|-----------|----------|----------|-------|
| Patient list (GSI2/GSI3) | 100 | 0 | App open, every 5 min auto-refresh |
| Get encounter details | 100 | 0 | Every patient selection |
| Status updates | 0 | 20 | Discharge rounds |
| New admissions | 0 | 10 | Throughout the day |

## Consistency Requirements

- **Patient list**: Eventually consistent (5-second lag acceptable)
- **Encounter details**: Strongly consistent (clinical decisions based on this)
- **Status transitions**: Strongly consistent (prevent double-discharge)

## Filter Dimensions Mapping

| Filter | DynamoDB Implementation |
|--------|----------------------|
| Location | FilterExpression on `location` attribute |
| Ward (ICU/General) | Part of GSI3 sort key (`wardSort`) |
| Unit | Part of GSI3 partition key |
| Primary Consultant | Part of GSI2 partition key |
| Attending Consultant | FilterExpression on `attendingConsultantLogin` |
| Visit Type | FilterExpression on `visitType` |
| Discharge Intimation | FilterExpression on `dischargeIntimation` |
| MLC/MFD | FilterExpression on `mlc`, `ipActivityAction` |
| Dead/Absconded | FilterExpression on `ipActivityAction` |

**Note**: With ~50-100 patients per doctor, FilterExpression on the GSI3 result set is efficient. No need for additional GSIs for filter dimensions.
