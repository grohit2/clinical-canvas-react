# Feature: Document Storage & System Configuration

> Tables: `DocumentStorageTable`, `SystemConfigTable`
> Owners: DMS Service, Registry Service, MDM Service

---

## 9A: DocumentStorageTable

### Domain Overview

Metadata store for patient-uploaded documents. Actual files reside in S3. This table provides the lookup layer.

### Key Design

**PK = `PAT#{patientId}`**: Documents always accessed in patient context.
**SK = `DOC#{documentId}`**: Each document uniquely identified.

### Document Types

| Type | Description | Source |
|------|-------------|--------|
| PRESCRIPTION | Prescription uploads | AADI (post-VC upload) |
| LAB_REPORT | Lab report files | LIS integration |
| IMAGING | Radiology images/reports | RIS integration |
| CONSENT | Consent forms | AHAM registration |
| ID_PROOF | Identity documents | AHAM registration |
| REFERRAL | Referral letters | AHAM outreach |
| GENERAL | General documents | Both apps |

### S3 Integration

```
S3 Bucket: clinical-canvas-documents-{env}
S3 Key Pattern: {patientId}/{documentType}/{YYYY}/{MM}/{documentId}.{ext}

Example: P-100234/PRESCRIPTION/2026/04/DOC-001.pdf
```

The `fileUrl` in DynamoDB points to a pre-signed S3 URL generator endpoint, not directly to S3. This ensures access control.

### Tag-Based Search (GSI1)

Documents can be tagged for search:

```
GSI1PK = TAG#lab-report
GSI1SK = PAT#P-100234#DOC#DOC-001

→ Find all documents with a specific tag
→ KEYS_ONLY projection: returns document references, app does BatchGetItem for details
```

### Capacity

Low volume table. ~5 RCU, ~5 WCU at peak. Most access is read (viewing document list).

---

## 9B: SystemConfigTable

### Domain Overview

Catch-all table for system-level data that doesn't belong in domain-specific tables: app configuration, geography master data, FCM tokens, organizations, FAQ, and audit events.

### Key Patterns

#### App Configuration

```
PK = CONFIG#APP, SK = LATEST
→ Current app configuration (version, feature flags, endpoints)
→ Heavily cached (DAX or application-level with 5-minute TTL)
```

```json
{
  "PK": "CONFIG#APP",
  "SK": "LATEST",
  "appVersion": "2.35.0",
  "forceUpdate": false,
  "maintenanceMode": false,
  "features": {
    "chatEnabled": true,
    "campEnabled": true,
    "aiDischarge": true,
    "vcEnabled": true
  },
  "apiBaseUrl": "https://api.hospital.com/",
  "acsEndpoint": "https://acs.azure.com/endpoint"
}
```

#### Server Downtime

```
PK = CONFIG#DOWNTIME, SK = LATEST
→ Active downtime notification (if any)
```

#### Organizations & Units

```
PK = CONFIG#ORG,          SK = ORG#NH              → Narayana Health org
PK = CONFIG#ORG#NH,       SK = UNIT#NH-BLR-01      → Bangalore unit
PK = CONFIG#ORG#NH,       SK = UNIT#NH-BLR-02      → Bangalore unit 2
PK = CONFIG#ORG#NH,       SK = UNIT#NH-MYS-01      → Mysore unit
```

#### FAQ Categories

```
PK = CONFIG#FAQ, SK = CAT#billing    → Billing FAQ
PK = CONFIG#FAQ, SK = CAT#chat       → Chat FAQ
PK = CONFIG#FAQ, SK = CAT#general    → General FAQ
```

### Geography Master Data

Hierarchical geography data for patient registration address lookup:

```
Country → State → District → City → Zipcode
```

#### Key Patterns

```
PK = GEO#COUNTRY, SK = IN                           → India
PK = GEO#STATE,   SK = IN#KA                        → Karnataka
PK = GEO#STATE,   SK = IN#TN                        → Tamil Nadu
PK = GEO#DISTRICT, SK = IN#KA#BLR                   → Bangalore Urban
PK = GEO#CITY,    SK = KA#BANGALORE                 → Bangalore city
PK = GEO#ZIPCODE, SK = 560001                       → Specific zipcode
```

#### Zipcode Lookup Flow

```
User enters zipcode 560001
→ Query: PK = GEO#ZIPCODE, SK = 560001
→ Returns: area, cityCode, districtCode, stateCode, countryCode
→ Auto-populates city, state, country fields in registration form
```

### FCM Token Management

```
PK = FCM#USER#dr-sharma-01, SK = DEV#android-abc123
→ FCM token for a specific user-device combination
→ Updated on every app launch
→ Deleted on logout
```

**Note**: FCM tokens are also stored in UserStaffTable as SK=`FCM#{deviceId}`. The SystemConfigTable copy is for the push notification service to query efficiently by user ID without loading the full user profile.

### Audit Events

```
PK = AUDIT#2026-04-23, SK = 10:30:00.123#EVT-001
→ Daily partitioned audit trail
→ TTL: 90 days
```

**Why daily partitioning?** Audit events are write-heavy (every API call logged) and read-rarely (only during investigations). Daily partitioning prevents any single partition from growing too large.

### Capacity Estimates

| Operation | Peak RCU | Peak WCU | Notes |
|-----------|----------|----------|-------|
| App config read | 100 | 0 | Every app launch (cache this!) |
| Geography lookup | 10 | 0 | Registration only |
| Org/unit lookup | 5 | 0 | Settings screen |
| FCM token write | 10 | 10 | App launch |
| Audit event write | 0 | 50 | Every API call |

### Caching Strategy

| Data | Cache Layer | TTL | Invalidation |
|------|------------|-----|-------------|
| App config | DAX + app-level | 5 min | Manual flush on config change |
| Geography | DAX | 24 hours | Never (static data) |
| Organizations | App-level | 1 hour | Rare changes |
| FAQ | App-level | 1 hour | Rare changes |

---

## 9C: VideoConsultationTable

### Domain Overview

Video consultation sessions linking doctors to patients via Agora RTC.

### Key Design

**PK = `APT#{appointmentNumber}`**: Each appointment is the primary entity.

### Consultation Status Lifecycle

```
SCHEDULED → BOOKED → ARRIVED → IN_PROGRESS → DONE → COMPLETED
                                                   → CANCELLED_BY_DOCTOR
                                                   → CANCELLED_BY_PATIENT
                                                   → CANCELLED_BY_SYSTEM
                                                   → NO_SHOW
                                                   → REJECTED
```

### In-Call Chat

Chat messages during a video call are stored as items within the appointment partition:

```
PK = APT#APT-001, SK = CHAT#2026-04-23T10:30:00Z#msg-001
→ Message sent during video call
→ STOMP WebSocket message format: { appointmentNumber, messageId, content, userType, sender, sentTime }
```

### Quick Replies

5 pre-set templates stored on the METADATA item:

```json
{
  "quickReplies": [
    "Please rejoin the video call",
    "I will call you via IVR",
    "I am sending the prescription",
    "Please visit the hospital for admission",
    "There is background noise, please move to a quieter place"
  ]
}
```

### IVR Integration

India-only feature. Stored as metadata on the appointment:

```json
{
  "ivrCallInitiated": true,
  "ivrCallTime": "2026-04-23T10:35:00Z",
  "fromNumber": "+91-9876543210",
  "toNumber": "+91-9876543211"
}
```

### GSI Design

**GSI1 (Doctor's Schedule)**:
```
GSI1PK = DOC#dr.sharma
GSI1SK = DATE#2026-04-23#APT#APT-001

→ Doctor's appointment list for a date
→ begins_with DATE#2026-04-23 for day view
```

**GSI2 (Patient's Consultations)**:
```
GSI2PK = PAT#MRN001
GSI2SK = DATE#2026-04-23

→ Patient's consultation history
```

### Capacity

Low volume. ~20 RCU, ~10 WCU at peak. Video calls are bandwidth-intensive but DynamoDB operations are minimal.
