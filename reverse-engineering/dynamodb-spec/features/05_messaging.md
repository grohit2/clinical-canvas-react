# Feature: Messaging & Communication

> Tables: `PatientMessageTable`, `ChatTable`
> Owners: Communication Service (AADI WebSocket), PRM Service (AHAM ACS)

---

## Domain Overview

Two distinct messaging systems serve different needs:

1. **PatientMessageTable** (AADI): Clinical context messages within a patient's encounter -- lab results, medication orders, progress notes, discharge summaries, and care team chat. Uses WebSocket (STOMP over SockJS) + Azure Communication Services.

2. **ChatTable** (AHAM): General-purpose care assistant chat -- patient inquiries, follow-ups, outreach coordination. Uses Azure Communication Services exclusively.

---

## 5A: PatientMessageTable

### Message Categories (16 Types)

| Category | Description | Typical Volume |
|----------|-------------|---------------|
| LAB_RESULT | Lab result notification | High |
| MEDICATION_ORDER | Medication order update | High |
| PROGRESS_NOTES | Progress note notification | Medium |
| DISCHARGE_SUMMARY | Discharge summary update | Low |
| CHAT | Direct care team text message | High |
| INVESTIGATION_ORDER | Investigation order | Medium |
| INVESTIGATION_REPORT | Investigation report | Medium |
| ADMISSION_MESSAGE | Admission notification | Low |
| CROSS_CONSULTATION | Cross-consultation request | Low |
| SYSTEM_REMINDER | System reminder | Medium |
| BED_TRANSFER | Bed transfer notification | Low |
| VITALS | Vital signs data | High |
| ASSESSMENT_FORM | Assessment notification | Low |
| DISCHARGE_INTIMATION | Discharge notification | Low |
| INITIAL_ASSESSMENT | IA notification | Low |
| RAD_RESULT | Radiology result | Low |

### Key Design

**PK = `PAT#{mrn}#ENC#{encounterNumber}`**: Messages are always viewed in context of a patient's current encounter. Average 100-500 messages per encounter.

**SK = `MSG#{timestamp}##{messageId}`**: Sorted by time, with messageId for uniqueness. Enables:
- Latest messages: Query desc, limit N
- Messages since sync: SK > `MSG#{lastSyncTime}`
- All messages: Full query

### Offline Queue Pattern

When the app is offline, messages are saved locally and queued. The sparse GSI1 tracks these:

```json
{
  "PK": "PAT#MRN001#ENC#EN-001",
  "SK": "MSG#2026-04-23T10:30:00Z#MSG-Q001",
  "GSI1PK": "PENDING#MSG#dr.sharma",     // ← Only present for NOT_SENT messages
  "GSI1SK": "TIME#2026-04-23T10:30:00Z",
  "messageStatus": "NOT_SENT",
  ...
}
```

When the app reconnects:
1. Query GSI1 for `PENDING#MSG#dr.sharma` → get all queued messages
2. Send each to server
3. Update each item: set `messageStatus = SUCCESS`, remove `GSI1PK`/`GSI1SK`

### Message Sync Flow

```
App Resume:
  1. Calculate offline duration
  2. Query PatientMessageTable: PK = PAT#MRN#ENC#EN, SK > MSG#lastSyncTime
  3. Merge with local SQLite
  4. Upload pending (NOT_SENT) messages
  5. Reconnect ACS WebSocket
```

### Unread Count

Unread count is maintained on `EncounterTable.unreadMsgCount` as a counter (UpdateItem with ADD). When a message is marked read, decrement the counter. This avoids scanning messages to count unreads.

---

## 5B: ChatTable

### Conversation + Message Co-location

Thread metadata and messages share the same partition (`THREAD#{threadId}`). This is optimal because:
- Opening a conversation loads metadata + recent messages in one query
- Sending a message writes to the same partition as the conversation

### Item Types in This Table

| SK Pattern | Type | Description |
|-----------|------|-------------|
| `METADATA` | Conversation | Thread topic, assignment, status, unread count |
| `MSG#{timestamp}##{messageId}` | Message | Chat message content |
| `PART#{userId}` | Participant | Thread participant info |

### My Conversations (GSI1)

```
GSI1PK = ASSIGNED#staff-user-01
GSI1SK = LAST_MSG#2026-04-23T10:30:00Z

→ Returns conversations sorted by most recent message
→ Updated whenever a new message arrives (UpdateItem on METADATA: lastMessageOn field)
```

### All Conversations (GSI2)

```
GSI2PK = UNIT#NH-BLR-01
GSI2SK = LAST_MSG#2026-04-23T10:30:00Z

→ Shows all conversations for a unit, sorted by recency
```

### Assignment Workflow

```
Assign:   UpdateItem METADATA → set assignedTo, assignType=ASSIGN
Delegate: UpdateItem METADATA → set assignedTo, assignType=DELEGATE, add reason
Reassign: UpdateItem METADATA → set assignedTo, assignType=REASSIGN, add reason

Each update also triggers GSI1PK change (old assignee loses it, new gets it)
```

### Message Attachments

File attachments are stored in S3. The ChatTable message item contains metadata:

```json
{
  "PK": "THREAD#th-001",
  "SK": "MSG#2026-04-23T10:30:00Z#msg-001",
  "type": "attachment",
  "attachments": [
    {
      "attachmentId": "att-001",
      "fileName": "prescription.pdf",
      "fileUrl": "s3://bucket/path/prescription.pdf",
      "mimeType": "application/pdf",
      "fileSize": 245760
    }
  ]
}
```

### TTL

Chat messages expire after 1 year. Before TTL deletion, DynamoDB Streams archives to S3 for compliance retention.

---

## Capacity Estimates

| Table | Peak RCU | Peak WCU | Hot Partition Risk |
|-------|----------|----------|-------------------|
| PatientMessageTable | 1000 | 300 | Medium (active patients) |
| ChatTable | 500 | 200 | Low (spread across threads) |

### PatientMessageTable Hot Partition Mitigation

Active encounters with many care team members can spike reads during shift changes. Mitigated by:
1. Application-level caching (5-second cache for message list)
2. On-demand capacity mode
3. Encounter-level partitioning naturally limits blast radius

### Real-Time Delivery

Neither table is in the real-time message delivery path:
- **AADI**: WebSocket (STOMP) delivers messages in real-time; DynamoDB is the persistence layer
- **AHAM**: ACS WebSocket delivers in real-time; DynamoDB is the persistence/search layer

DynamoDB writes happen asynchronously after message delivery, so write latency doesn't affect user-perceived performance.
