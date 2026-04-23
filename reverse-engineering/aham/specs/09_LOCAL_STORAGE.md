# 09 - Local Storage

**Module:** ObjectBox database, SharedPreferences, caching layers, offline support
**Source:** Reverse-engineered from `libapp.so` string table + decompiled Dart entity/manager classes + ObjectBox FFI operations
**Primary Entity:** StoreChatDataModel
**Manager:** ChatHistoryDbManager

---

## 1. ObjectBox Database

### StoreChatDataModel Entity

```dart
@Entity()
class StoreChatDataModel {
  @Id()
  int id;                          // ObjectBox auto-generated ID

  String? messageId;               // unique message identifier (ACS message ID)
  String? threadId;                // chat thread identifier
  String? chatConversationId;      // conversation identifier
  String? senderId;                // user ID of message sender
  String? messageText;             // message body text
  String? messageType;             // "text", "image", "audio", "document", etc.
  bool? isVoiceMessage;            // true if audio/voice message
  String? attachmentLocalPath;     // local filesystem path for cached attachment
  String? attachmentUrl;           // remote URL for attachment download
  String? voiceUrl;                // remote URL for voice message audio
  int? timestamp;                  // Unix timestamp (milliseconds)
  bool? isDeleted;                 // soft delete flag
  int? deletedAt;                  // Unix timestamp of deletion
  String? conversationStatus;      // conversation status at time of message
  String? senderDisplayName;       // display name of the message sender
}
```

### Index Strategy

| Field | Indexed | Purpose |
|-------|---------|---------|
| `messageId` | Yes | Unique lookup, duplicate prevention |
| `threadId` | Yes | Query all messages in a thread |
| `chatConversationId` | Yes | Query by conversation |
| `timestamp` | Yes | Ordering, range queries, cleanup |

---

## 2. ChatHistoryDbManager CRUD Operations

### addMessage

```dart
Future<void> addMessage(StoreChatDataModel message)
```

- Performs duplicate check on `messageId` before insertion
- If message already exists (same `messageId`), insertion is skipped
- On success, logs: `"Message added to the database"`
- Runs inside a write transaction

### getMessagesByThreadId

```dart
Future<List<StoreChatDataModel>> getMessagesByThreadId(String threadId)
```

- Queries all messages matching `threadId`
- Returns sorted by `timestamp` ascending (chronological order)
- Filters out soft-deleted messages (`isDeleted == true`)
- Runs inside a read transaction

### getLatestMessageIdByThreadId

```dart
Future<String?> getLatestMessageIdByThreadId(String threadId)
```

- Returns the `messageId` of the most recent message in the thread
- Used for pagination: fetch messages after this ID from the server
- Queries with `threadId` filter, ordered by `timestamp` descending, limit 1

### isMessagePresent

```dart
Future<bool> isMessagePresent(String messageId)
```

- Checks if a message with the given `messageId` exists in the store
- Used before `addMessage` for duplicate prevention
- Returns `true` if found, `false` otherwise

### updateMessage

```dart
Future<void> updateMessage(StoreChatDataModel message)
```

- Updates an existing message by ObjectBox `id`
- Used for: editing message text, updating attachment paths after download, status changes
- Runs inside a write transaction

### deleteMessage (soft delete)

```dart
Future<void> deleteMessage(String messageId)
```

- Sets `isDeleted = true` and `deletedAt = DateTime.now().millisecondsSinceEpoch`
- Does NOT remove the record from ObjectBox
- Soft-deleted messages are filtered out in query results
- Preserves data integrity for sync purposes

### deleteOldMessages (hard delete)

```dart
Future<void> deleteOldMessages(int olderThanTimestamp)
```

- Permanently removes messages where `timestamp < olderThanTimestamp`
- Used for storage cleanup and data retention enforcement
- Runs inside a write transaction
- Also cleans up associated attachment files from filesystem

---

## 3. Error Messages (10)

| # | Error Message | Operation | Trigger |
|---|---------------|-----------|---------|
| 1 | "Message added to the database : no of messages " | addMessage | Success log (not an error; includes count suffix) |
| 2 | "Message already exists in the database : no of messages" | addMessage | Duplicate detected, insertion skipped |
| 3 | "Failed to add message: " | addMessage | Write transaction failure |
| 4 | "Failed to get messages by thread ID: " | getMessagesByThreadId | Query execution failure |
| 5 | "Failed to get latest message ID by thread ID: " | getLatestMessageIdByThreadId | Query failure |
| 6 | "Failed to check if message is present: " | isMessagePresent | Query failure |
| 7 | "Failed to update message" | updateMessage | Write transaction failure |
| 8 | "Failed to delete message" | deleteMessage | Soft delete failure |
| 9 | "Failed to delete old messages" | deleteOldMessages | Bulk delete failure |
| 10 | "Old messages deleted" | deleteOldMessages | Success log after bulk cleanup |

---

## 4. ObjectBox FFI Operations

### Query Builder

```
ObjectBox query operations (via FFI):
  - QueryBuilder<StoreChatDataModel>.equals(field, value)
  - QueryBuilder<StoreChatDataModel>.greaterThan(field, value)
  - QueryBuilder<StoreChatDataModel>.lessThan(field, value)
  - QueryBuilder<StoreChatDataModel>.order(field, Order.descending)
  - Query.find()           // returns List<StoreChatDataModel>
  - Query.findFirst()      // returns StoreChatDataModel?
  - Query.count()          // returns int
  - Query.remove()         // bulk delete, returns int (count removed)
```

### Transaction Management

```
Transaction types:
  - Read transaction:  store.runInTransaction(TxMode.read, callback)
  - Write transaction: store.runInTransaction(TxMode.write, callback)
  - Commit:            automatic on transaction callback return
  - Close:             store.close() on app termination

Locking:
  - ObjectBox handles concurrent read transactions (multiple readers)
  - Write transactions are serialized (single writer)
  - Read transactions do not block write transactions
```

### Entity Operations

```
Box<StoreChatDataModel> operations:
  - box.put(entity)        // insert or update
  - box.get(id)            // get by ObjectBox ID
  - box.getAll()           // get all entities
  - box.remove(id)         // hard delete by ID
  - box.removeAll()        // clear all entities
  - box.count()            // total entity count
```

### Reactive Observation

```
ObservableStore._watchAll(box)
  - Returns entityChanges stream (Stream<List<StoreChatDataModel>>)
  - Backed by obx_dart_observe FFI function
  - Emits on any put/remove/update to the observed Box
  - Used for real-time UI updates when chat messages change locally
```

---

## 5. SharedPreferences

### Stored Keys

| Key | Type | Purpose | Set When |
|-----|------|---------|----------|
| `fcm_token` | String | Firebase Cloud Messaging device token | FCM token received/refreshed |
| `access_token` | String | JWT access token for API auth | Login success, token refresh |
| `refresh_token` | String | JWT refresh token | Login success, token refresh |
| `logged-in-id` | String | Current logged-in user ID | Login success |
| `logged-in-login` | String | Current logged-in username | Login success |
| `logged-in-name` | String | Current logged-in display name | Login success |
| `logged-in-unit` | String | Current logged-in unit/facility | Login success |
| `logged-in-user` | String | Current logged-in user object (JSON) | Login success |
| `client_baseUrl` | String | Dynamic base URL for API calls | Client setup success |
| `appSharedPreferences` | String (JSON) | General app preferences blob | Preference save |

### Access Pattern

```dart
// Read
String? token = prefs.getString('access_token');

// Write
await prefs.setString('access_token', newToken);

// Clear (on logout)
await prefs.clear();  // removes all keys
```

All SharedPreferences operations are async. Token values are read on every API call by the Dio interceptor.

### AppSharedPreferences._purge

A `_purge` method exists on `AppSharedPreferences` for selective cleanup of stored keys. Unlike `clear()` which removes everything, `_purge` selectively removes session-related keys while preserving configuration data (e.g., `client_baseUrl`).

---

## 6. Caching Strategy (4 Layers)

### L0: MemoryCache (package:memory_cache)

```
Layer:    RAM
Scope:    Current app session only
Content:  Arbitrary object caching via CacheItem.create
Eviction: TTL-based (per cache item)
Lifetime: Cleared on app termination
Use:      Caching API responses, computed results, frequently accessed objects
API:      MemoryCache.instance.put(key, value, expiry: Duration)
          MemoryCache.instance.read<T>(key)
```

Separate from Flutter's ImageCache; provides general-purpose in-memory caching for any Dart object.

### L1: In-Memory ImageCache

```
Layer:    RAM
Scope:    Current app session only
Content:  Decoded image data (Flutter ImageCache)
Eviction: LRU (Least Recently Used), default 100 images / 100 MB
Lifetime: Cleared on app termination
Use:      Profile avatars, frequently accessed thumbnails
```

### L2: ObjectBox Persistent Cache

```
Layer:    Disk (ObjectBox database file)
Scope:    Persists across app sessions
Content:  StoreChatDataModel entities (chat messages)
Eviction: Manual via deleteOldMessages()
Lifetime: Until explicit cleanup or app uninstall
Use:      Chat message history, offline message access
```

### L3: Attachment Filesystem Cache

```
Layer:    Disk (app-specific directory)
Scope:    Persists across app sessions
Content:  Downloaded attachments (images, PDFs, audio files)
Path:     attachmentLocalPath in StoreChatDataModel
Eviction: Manual cleanup with deleteOldMessages() (cascading)
Lifetime: Until explicit cleanup or app uninstall
Use:      Chat attachments, downloaded documents
```

### Cache Flow

```
Message received from ACS
    │
    ▼
Store in ObjectBox (L2) ──→ messageText, metadata
    │
    ▼
Has attachment?
    │
    ├── No → Done
    │
    └── Yes
            │
            ▼
        Download attachment to filesystem (L3)
            │
            ▼
        Update StoreChatDataModel.attachmentLocalPath
            │
            ▼
        Display: load from L3, decode into L1 (if image)
```

---

## 6.5. File Upload Flow (Chat Attachments)

```
FileUploadEvent dispatched
    │
    ▼
FileUploadLoading state
    │
    ▼
POST /prm/api/_send/attachment/chat-conversation
    │
    ├── Success → FileUploadSuccess
    │
    └── Failure → FileUploadFailure
```

Endpoint: `/prm/api/_send/attachment/chat-conversation` handles chat attachment uploads via multipart form data.

---

## 7. Offline Availability

### What Works Offline

| Feature | Offline Support | Details |
|---------|----------------|---------|
| View cached chat messages | Yes | L2 ObjectBox cache |
| View cached attachments | Yes | L3 filesystem cache |
| Send new chat messages | No | Requires ACS connection |
| View task list | No | Requires API call |
| Patient registration | No | Requires MPI + PRM APIs |
| Login | No | Requires gateway API |

### Sync Strategy

```
App goes online
    │
    ▼
Fetch latest messages from ACS
    │
    ▼
Compare with local ObjectBox data
    │   (getLatestMessageIdByThreadId)
    │
    ▼
Insert new messages (addMessage with duplicate check)
    │
    ▼
Download new attachments to filesystem
    │
    ▼
Update local records with attachment paths
```

---

## 8. Data Retention Policy

### From Privacy Policy

- Medical records: retained for the legally required period under Cayman Islands law
- Chat messages: retained in ObjectBox until `deleteOldMessages` is invoked
- Session data: cleared on logout (`SharedPreferences.clear()`)
- Attachments: filesystem files cleaned up when corresponding messages are hard-deleted

### Automatic Cleanup

```
deleteOldMessages(olderThanTimestamp) performs:
  1. Query messages where timestamp < olderThanTimestamp
  2. For each message with attachmentLocalPath:
     - Delete file from filesystem (L3)
  3. Remove ObjectBox records (hard delete)
  4. L1 cache entries expire naturally via LRU
```

---

## 9. Store Corruption Recovery

### ObjectBox Exception Types

| Exception | Trigger |
|-----------|---------|
| `DbFileCorruptException` | Database file corruption detected on open |
| `DbPagesCorruptException` | Individual database pages are corrupt |
| `DbFullException` | Database file has reached maximum size |
| `DbMaxDataSizeExceededException` | Single data item exceeds size limit |
| `DbMaxReadersExceededException` | Too many concurrent read transactions |
| `DbShutdownException` | Operation attempted after store shutdown |
| `UniqueViolationException` | Unique constraint violated on insert |

### Detection

- ObjectBox throws specific exceptions (above) on store operations
- Symptoms: `store.close()` throws, queries return unexpected results, write transactions fail

### Recovery Strategy

```
1. Catch ObjectBoxException on store initialization
       │
       ▼
2. Delete ObjectBox database files from app directory
       │
       ▼
3. Reinitialize ObjectBox store (fresh database)
       │
       ▼
4. Chat history is lost locally
       │   (can be re-fetched from ACS server)
       │
       ▼
5. SharedPreferences remain intact (separate storage)
```

No explicit migration strategy was found in the decompiled code. Schema changes appear to be handled by ObjectBox's built-in schema migration (adding new fields is non-breaking; removing/renaming requires a fresh store).

---

## 10. Performance Characteristics

### Index Strategy

| Query Pattern | Index Used | Complexity |
|---------------|-----------|------------|
| Get messages by threadId | `threadId` index | O(log n) |
| Check message exists by messageId | `messageId` index | O(log n) |
| Get latest message in thread | `threadId` + `timestamp` | O(log n) |
| Delete old messages | `timestamp` index | O(log n + k) where k = deleted |
| Get all messages | Full scan | O(n) |

### Query Complexity

- Single-field equality: O(log n) via B+ tree index
- Range queries (timestamp): O(log n + k) where k = results in range
- Compound queries (threadId + timestamp): sequential index usage
- Count queries: O(1) if no filter, O(log n + k) with filter

### Storage Overhead

```
Per message (approximate):
  - ObjectBox record:     ~200-500 bytes (metadata + text)
  - Attachment file (L3): variable (KB to MB per file)
  - Image cache (L1):     variable (decoded bitmap size)

Typical usage:
  - 1000 messages ≈ 200-500 KB in ObjectBox
  - Attachments dominate storage usage
```
