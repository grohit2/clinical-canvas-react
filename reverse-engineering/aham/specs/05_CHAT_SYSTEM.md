# 05 - Chat System

**Module:** Azure Communication Services native plugin, real-time messaging, BLoC architecture, ObjectBox caching, conversation management
**Source:** Reverse-engineered from `libapp.so` string table + decompiled Dart BLoC/model/service classes + 11 Java native plugin files
**BLoC:** ChatAssistantBloc
**Services:** ChatAssistantService, ChatAssistantRepository
**Native Plugin:** flutter_acs (FlutterAcsPlugin.java, ACSCommunication.java)
**Backend:** PRM Service (`/prm/api/`), DMS Service (`/dms/api/`)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Native Plugin Layer (Java)](#2-native-plugin-layer)
3. [CustomChatMessageType Enum (8 Values)](#3-customchatmessagetype-enum)
4. [Message Data Structures (Java)](#4-message-data-structures)
5. [Real-Time Event Handling](#5-real-time-event-handling)
6. [ChatAssistantBloc State Machine](#6-chatassistantbloc-state-machine)
7. [ChatAssistantService & Repository](#7-chatassistantservice--repository)
8. [ObjectBox Caching (StoreChatDataModel)](#8-objectbox-caching)
9. [Chat API Endpoints (11)](#9-chat-api-endpoints)
10. [Message Threading Model](#10-message-threading-model)
11. [Assign / Delegate / Reassign Flows](#11-assign--delegate--reassign-flows)
12. [Message Types (8)](#12-message-types)
13. [Chat Conversation Models](#13-chat-conversation-models)
14. [Screen Layouts](#14-screen-layouts)
15. [Validation Rules](#15-validation-rules)
16. [Error Messages](#16-error-messages)

---

## 1. Architecture Overview

The AHAM chat system ("NH Care Assistant") is built on **Azure Communication Services (ACS)** with a custom native Android plugin bridging the ACS Java SDK to the Flutter UI layer. Messages are stored locally via **ObjectBox** for offline access and synchronized with the backend **PRM** service.

### 1.1 Stack Diagram

```
+---------------------------------------------------------------+
|                     Flutter UI Layer                            |
|  ChatAssistantScreen / ChatScreen                              |
|         |                                                      |
|         v                                                      |
|  ChatAssistantBloc <--> ChatAssistantRepository                |
|         |                      |                               |
|         v                      v                               |
|  ObjectBox (local)        PRM API Client (remote)              |
|  (StoreChatDataModel)     (/prm/ endpoints)                    |
+------------------+--------------------------------------------+
                   | Method Channel / Event Channel
                   v
+---------------------------------------------------------------+
|                  Native Plugin Layer (Java)                     |
|                                                                |
|  FlutterAcsPlugin.java                                         |
|      |                                                         |
|      v                                                         |
|  ACSCommunication.java                                         |
|      |                                                         |
|      v                                                         |
|  Azure Communication Services SDK                              |
|  (ChatAsyncClient, ChatThreadAsyncClient)                      |
|      |                                                         |
|      v                                                         |
|  ACS Cloud (real-time messaging infrastructure)                |
+---------------------------------------------------------------+
```

### 1.2 Key Identifiers

| Identifier | Value | Purpose |
|------------|-------|---------|
| App ID | `"NH_Care_assistant"` | Application identifier in ACS |
| Method Channel | `"flutter_acs"` | Request/response calls (Flutter -> Native) |
| Event Channel | `"flutter_acs_event_channel_stream"` | Real-time event streaming (Native -> Flutter) |

---

## 2. Native Plugin Layer

### 2.1 FlutterAcsPlugin.java

The Flutter platform plugin that registers method and event channels with the Flutter engine.

**Registration:**
```java
MethodChannel methodChannel = new MethodChannel(messenger, "flutter_acs");
EventChannel eventChannel = new EventChannel(messenger, "flutter_acs_event_channel_stream");
```

**Method Channel Handlers:**

| # | Method Name | Direction | Parameters | Returns | Description |
|---|-------------|-----------|------------|---------|-------------|
| 1 | `initACS` | Flutter -> Native | `endPoint: String`, `accessToken: String`, `threadId: String` | Success/failure | Initialize ACS client with endpoint, access token, and thread ID (verified against Java source) |
| 2 | `resubscribeToACS` | Flutter -> Native | `endPoint: String`, `accessToken: String`, `threadId: String` | Success/failure | Re-establish real-time event subscriptions with new credentials (verified against Java source) |
| 3 | `unsubscribeACS` | Flutter -> Native | `threadId: String` | Success/failure | Unsubscribe from ACS events for a specific thread, clean up resources |
| 4 | `allMessages` | Flutter -> Native | `threadId: String` | `List<ChatMessageDTO>` | Fetch all messages for a thread from ACS |
| 5 | `getAllHistoryMessages` | Flutter -> Native | `endPoint: String`, `accessToken: String`, `threadId: String`, `page: int`, `startTime: String` | `List<ChatMessageDTO>` | Fetch full paginated message history from ACS (verified against Java source) |

### 2.2 ACSCommunication.java

Core communication class managing ACS connections, event subscriptions, and message operations.

**Key Components:**

| Component | Type | Purpose |
|-----------|------|---------|
| `ChatAsyncClient` | ACS SDK | Top-level async chat client for ACS operations |
| `ChatThreadAsyncClient` | ACS SDK | Thread-specific async client for message CRUD |
| `LinkedHashMap<String, ChatThreadAsyncClient>` | Cache | Thread client cache keyed by threadId |
| App ID constant | `String` | `"NH_Care_assistant"` |

**Initialization Lifecycle:**

```
initACS() called from Flutter via Method Channel
    |
    v
Create ChatAsyncClient with endpoint + access token
    |
    v
Register real-time event listeners (only 2 of 8 enum values have handler code):
    +-- chatMessageReceived    --> parse --> stream via EventChannel  [REGISTERED]
    +-- chatMessageDeleted     --> parse --> stream via EventChannel  [REGISTERED]
    +-- chatMessageEdited      --> (enum exists, NO handler registered)
    +-- chatThreadCreated      --> (enum exists, NO handler registered)
    +-- chatThreadDeleted      --> (enum exists, NO handler registered)
    +-- participantsAdded      --> (enum exists, NO handler registered)
    +-- participantsRemoved    --> (enum exists, NO handler registered)
    +-- topicUpdated           --> (enum exists, NO handler registered)
    |
    v
ACS real-time connection established
    |
    v
Events flow continuously via EventChannel until unsubscribeACS()
```

**Token Refresh:**

```
Access token approaching expiry
    |
    v
Flutter calls resubscribeToACS(newToken)
    |
    v
Native code:
    1. Unsubscribe existing event listeners
    2. Create new ChatAsyncClient with new token
    3. Re-register all event listeners
    4. Resume event streaming
```

**Cleanup (Logout / App Termination):**

```
unsubscribeACS() called
    |
    v
1. Remove all event listeners
2. Close ChatAsyncClient
3. Clear thread client cache
4. Notify Flutter of disconnection
```

---

## 3. CustomChatMessageType Enum

8 event types used for real-time event classification in the native plugin layer. Each ACS event is mapped to one of these types before being sent to Flutter via the EventChannel.

| # | Value | ACS Event Source | Description |
|---|-------|-----------------|-------------|
| 1 | `TOPIC_UPDATED` | `topicUpdated` | Chat thread topic/title was changed |
| 2 | `CHAT_MESSAGE_RECEIVED` | `chatMessageReceived` | New message received in a thread |
| 3 | `CHAT_MESSAGE_EDITED` | `chatMessageEdited` | An existing message was edited |
| 4 | `CHAT_MESSAGE_DELETED` | `chatMessageDeleted` | A message was deleted |
| 5 | `CHAT_THREAD_CREATED` | `chatThreadCreated` | A new chat thread was created |
| 6 | `CHAT_THREAD_DELETED` | `chatThreadDeleted` | A chat thread was deleted |
| 7 | `PARTICIPANTS_ADDED` | `participantsAdded` | Participants were added to a thread |
| 8 | `PARTICIPANTS_REMOVED` | `participantsRemoved` | Participants were removed from a thread |

### Event-to-Model Mapping

| CustomChatMessageType | Payload Model | Key Fields |
|-----------------------|---------------|------------|
| `CHAT_MESSAGE_RECEIVED` | `ChatMessageReceived` | senderId, messageId, content, type, createdOn |
| `CHAT_MESSAGE_EDITED` | `ChatMessageReceived` | senderId, messageId, content (updated), createdOn |
| `CHAT_MESSAGE_DELETED` | `ChatMessageDeleted` | messageId, deletedOn |
| `CHAT_THREAD_CREATED` | (thread metadata) | threadId, topic |
| `CHAT_THREAD_DELETED` | `ChatThreadDeletedModel` | versionNumber, content |
| `PARTICIPANTS_ADDED` | `ChatParticipantsModel` | senderId, content (participant IDs) |
| `PARTICIPANTS_REMOVED` | `ChatParticipantsModel` | senderId, content (participant IDs) |
| `TOPIC_UPDATED` | (topic data) | threadId, new topic |

---

## 4. Message Data Structures

### 4.1 ChatMessageDTO (Java -- Transport Envelope)

The universal data transfer envelope for all chat events crossing the native-Flutter boundary.

```java
public class ChatMessageDTO {
    CustomChatMessageType eventType;  // Enum type, not plain String
    String threadId;                  // ACS thread identifier
    String groupId;                   // Group identifier
    Object payload;                   // Event data (Object, not String)
    Object metadata;                  // Metadata (Object, not typed Map)
}
```

| Field | Type | Description |
|-------|------|-------------|
| `eventType` | `CustomChatMessageType` | One of 8 `CustomChatMessageType` enum values (not a plain String) |
| `threadId` | `String` | ACS thread ID this event belongs to |
| `groupId` | `String` | Group/conversation identifier |
| `payload` | `Object` | Event data -- structure depends on `eventType` (typed as Object, not String) |
| `metadata` | `Object` | Additional metadata from ACS (typed as Object, not Map<String, String>) |

### 4.2 ChatMessageReceived (Java)

Parsed from `payload` when `eventType` is `CHAT_MESSAGE_RECEIVED` or `CHAT_MESSAGE_EDITED`.

```java
public class ChatMessageReceived {
    String senderId;
    String messageId;
    String content;
    String type;
    String createdOn;
    String deletedOn;
    String senderDisplayName;
}
```

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `senderId` | `String` | No | Sender's ACS raw user ID |
| `messageId` | `String` | No | Unique message identifier |
| `content` | `String` | No | Message body (text or HTML) |
| `type` | `String` | No | Content MIME type |
| `createdOn` | `String` | No | Creation timestamp (ISO-8601) |
| `deletedOn` | `String` | Yes | Deletion timestamp; null if message is active. Note: always `null` for real-time `CHAT_MESSAGE_RECEIVED` events; only populated in history responses. |
| `senderDisplayName` | `String` | No | Display name of the sender |

### 4.3 ChatMessageDeleted (Java)

Parsed from `payload` when `eventType` is `CHAT_MESSAGE_DELETED`.

```java
public class ChatMessageDeleted {
    String messageId;
    String deletedOn;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `messageId` | `String` | ID of the deleted message |
| `deletedOn` | `String` | ISO-8601 timestamp of deletion |

### 4.4 ChatParticipantsModel (Java)

Parsed from `payload` when `eventType` is `PARTICIPANTS_ADDED` or `PARTICIPANTS_REMOVED`.

```java
public class ChatParticipantsModel {
    String senderId;
    String messageId;
    List<String> content;
    String type;
    String createdOn;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `senderId` | `String` | User who triggered the participant change |
| `messageId` | `String` | System message ID for this event |
| `content` | `List<String>` | List of participant user IDs added/removed |
| `type` | `String` | Participant event type |
| `createdOn` | `String` | Event timestamp |

### 4.5 ChatThreadDeletedModel (Java)

Parsed from `payload` when `eventType` is `CHAT_THREAD_DELETED`.

```java
public class ChatThreadDeletedModel {
    String versionNumber;
    String content;
}
```

| Field | Type | Description |
|-------|------|-------------|
| `versionNumber` | `String` | Thread version number at deletion |
| `content` | `String` | Deletion reason or content |

### 4.6 ACSListener Interface (Undocumented)

Callback interface used by the native plugin layer:

```java
interface ACSListener {
    void eventChannelFailure(Exception exc);
    void eventChannelSuccess(Object obj, String str);
    void methodChannelFailure(Exception exc);
    void methodChannelSuccess(boolean z4);
}
```

### 4.7 ChatMessageDTOKt Utility Class

Kotlin utility class containing helper methods for chat message processing:

```kotlin
// ChatMessageDTOKt.kt
fun getParticipantIds(participants: List<ChatParticipant>): List<String>
```

Extracts participant user IDs from ACS `ChatParticipant` objects.

### 4.8 Event Channel Envelope Format

Events sent from native to Flutter via the event channel are wrapped in this envelope:

```json
{
  "chatType": "ACTIVE" | "ACTIVE_HISTORY" | "HISTORY",
  "chats": "<serialized payload>"
}
```

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `chatType` | `String` | `ACTIVE`, `ACTIVE_HISTORY`, `HISTORY` | Indicates the source/nature of the chat data |
| `chats` | `String` | Serialized JSON | The actual chat message payload |

---

## 5. Real-Time Event Handling

### 5.1 CHAT_MESSAGE_RECEIVED Processing

```
ACS chatMessageReceived event fires in native layer
    |
    v
ACSCommunication.java extracts fields:
    senderId       <-- event.getSender().getRawId()
    messageId      <-- event.getId()
    content        <-- event.getContent()
    type           <-- event.getType().toString()
    createdOn      <-- event.getCreatedOn().toString()
    deletedOn      <-- event.getDeletedOn()  (may be null)
    senderDisplayName <-- event.getSenderDisplayName()
    |
    v
Construct ChatMessageReceived object
    |
    v
Wrap in ChatMessageDTO:
    eventType  = "CHAT_MESSAGE_RECEIVED"
    threadId   = event.getChatThreadId()
    groupId    = derived from thread
    payload    = JSON.stringify(ChatMessageReceived)
    metadata   = event metadata map
    |
    v
Send via EventChannel --> Flutter
    |
    v
Flutter EventChannel listener receives ChatMessageDTO
    |
    v
ChatAssistantBloc processes:
    1. Parse eventType == "CHAT_MESSAGE_RECEIVED"
    2. Deserialize payload --> ChatMessageReceived
    3. Check ObjectBox: dbManager.isPresent(messageId)
    4. If new: save to ObjectBox as StoreChatDataModel
    5. If thread is currently open: mark as read
    6. If thread is not open: increment unread count on conversation
    7. Emit updated state --> UI rebuilds with new message
```

### 5.2 CHAT_MESSAGE_DELETED Processing

```
ACS chatMessageDeleted event fires in native layer
    |
    v
ACSCommunication.java extracts:
    messageId  <-- event.getId()
    deletedOn  <-- event.getDeletedOn().toString()
    |
    v
Construct ChatMessageDeleted, wrap in ChatMessageDTO
    |
    v
Send via EventChannel --> Flutter
    |
    v
Flutter processes:
    1. Find message in ObjectBox by messageId
    2. Set deletedOn = timestamp
    3. Update ObjectBox record
    4. Emit state --> UI replaces message with "This message has been deleted"
```

### 5.3 PARTICIPANTS_ADDED / PARTICIPANTS_REMOVED Processing

```
ACS participant event fires
    |
    v
Extract participant IDs and action type
    |
    v
Wrap in ChatMessageDTO with appropriate eventType
    |
    v
Flutter processes:
    1. Update participant list in conversation model
    2. If PARTICIPANTS_ADDED: show system message "[User] joined the conversation"
    3. If PARTICIPANTS_REMOVED: show system message "[User] left the conversation"
    4. Refresh participant info
```

### 5.4 TOPIC_UPDATED Processing

```
ACS topicUpdated event fires
    |
    v
Extract new topic text and threadId
    |
    v
Flutter processes:
    1. Update conversation topic in local model
    2. Refresh conversation list display
```

---

## 6. ChatAssistantBloc State Machine

### 6.1 Events

| # | Event | Parameters | Description |
|---|-------|------------|-------------|
| 1 | `FetchAllConversation` | `page: int`, `size: int`, `searchText: String?`, `status: String?` | Load ALL conversations queue |
| 2 | `FetchMyConversation` | `page: int`, `size: int` | Load MY conversations queue |
| 3 | `FetchChatDataToView` | `threadId: String`, `conversationId: String` | Load full chat data for a thread |
| 4 | `SendChatMessage` | `threadId: String`, `content: String`, `metadata: ChatSendMetadata` | Send a text message |
| 5 | `DeleteChatMessage` | `messageId: String`, `threadId: String` | Delete a message |
| 6 | `AssignChatConversation` | `conversationId: String`, `threadId: String`, `targetUserId: String`, `assignType: ChatAssignType`, `reason: String?` | Assign, delegate, or reassign |
| 7 | `CloseChatConversation` | `conversationId: String`, `threadId: String` | Close a conversation |
| 8 | `FetchUserChatConversationSummary` | `userId: String` | Fetch conversation summary counts |

### 6.2 States

| # | State | Payload | Description |
|---|-------|---------|-------------|
| 1 | `ChatAssistantInitial` | (none) | Initial state, no data loaded |
| 2 | `ConversationsLoadingState` | (none) | Loading conversations from API |
| 3 | `ConversationsLoadedState` | `conversations: List<ChatConversationModel>`, `totalCount: int` | Conversations loaded |
| 4 | `ConversationsErrorState` | `message: String` | Conversation fetch failed |
| 5 | `AssignLoadingState` | (none) | Assign/delegate/reassign in progress |
| 6 | `AssignSuccessState` | `conversation: ChatConversationModel`, `assignType: ChatAssignType` | Assignment succeeded |
| 7 | `AssignErrorState` | `message: String` | Assignment failed |
| 8 | `DelegateLoadingState` | (none) | Delegation in progress |
| 9 | `DelegateSuccessState` | `conversation: ChatConversationModel` | Delegation succeeded |
| 10 | `DelegateErrorState` | `message: String` | Delegation failed |
| 11 | `CloseLoadingState` | (none) | Close conversation in progress |
| 12 | `CloseSuccessState` | `conversationId: String` | Close succeeded |
| 13 | `CloseErrorState` | `message: String` | Close failed |
| 14 | `SendMessageLoadingState` | (none) | Sending message |
| 15 | `SendMessageSuccessState` | `messageId: String` | Message sent |
| 16 | `SendMessageErrorState` | `message: String` | Send failed |

### 6.3 State Transition Diagram

```
FetchConversationsEvent --> ConversationsLoadingState --> ConversationsLoadedState
                                                     +-> ConversationsErrorState

AssignConversationEvent --> AssignLoadingState --> AssignSuccessState
                                              +-> AssignErrorState

DelegateConversationEvent --> DelegateLoadingState --> DelegateSuccessState
                                                  +-> DelegateErrorState

CloseConversationEvent --> CloseLoadingState --> CloseSuccessState
                                            +-> CloseErrorState

SendMessageEvent --> SendMessageLoadingState --> SendMessageSuccessState
                                             +-> SendMessageErrorState
```

### 6.4 Full Event-State Flow

```
ChatAssistantInitial
    |
    +-- FetchAllConversation
    |       |
    |       v
    |   ConversationsLoadingState
    |       |
    |       +-- success --> ConversationsLoadedState
    |       +-- error   --> ConversationsErrorState
    |
    +-- FetchMyConversation
    |       |
    |       v
    |   ConversationsLoadingState
    |       +-- success --> ConversationsLoadedState
    |       +-- error   --> ConversationsErrorState
    |
    +-- FetchChatDataToView
    |       |
    |       v
    |   ConversationsLoadingState
    |       +-- success --> ConversationsLoadedState (with chat data)
    |       +-- error   --> ConversationsErrorState
    |
    +-- SendChatMessage
    |       |
    |       v
    |   SendMessageLoadingState (optimistic update to UI)
    |       +-- success --> SendMessageSuccessState
    |       +-- error   --> SendMessageErrorState
    |
    +-- DeleteChatMessage
    |       |
    |       v
    |   (immediate ObjectBox update)
    |       +-- success --> ConversationsLoadedState (updated)
    |       +-- error   --> ConversationsErrorState
    |
    +-- AssignChatConversation (assignType: ASSIGN)
    |       |
    |       v
    |   AssignLoadingState
    |       +-- success --> AssignSuccessState
    |       +-- error   --> AssignErrorState
    |
    +-- AssignChatConversation (assignType: DELEGATE)
    |       |
    |       v
    |   DelegateLoadingState
    |       +-- success --> DelegateSuccessState
    |       +-- error   --> DelegateErrorState
    |
    +-- CloseChatConversation
            |
            v
        CloseLoadingState
            +-- success --> CloseSuccessState
            +-- error   --> CloseErrorState
```

---

## 7. ChatAssistantService & Repository

### 7.1 ChatAssistantService

```dart
class ChatAssistantService {
  Future<List<ChatConversationModel>> fetchMyConversations(
      String userId, int page, int size, {String? status});

  Future<List<ChatConversationModel>> searchAllConversations(
      String unitCode, int page, int size,
      {String? searchText, String? status, String? assignedTo});

  Future<Map<String, dynamic>> sendMessage(ChatMessageSendDto dto);

  Future<Map<String, dynamic>> sendAttachment(
      String threadId, File file, String fileName, String mimeType,
      ChatSendMetadata? metadata);

  Future<List<Map<String, dynamic>>> readMessages(
      String threadId, int page, int size, {String? before});

  Future<Map<String, dynamic>> deleteMessage(
      String messageId, String threadId);

  Future<Map<String, dynamic>> assignConversation(
      String conversationId, String threadId,
      String assignTo, String assignType);

  Future<Map<String, dynamic>> delegateConversation(
      String conversationId, String threadId,
      String delegateTo, {String? reason});

  Future<Map<String, dynamic>> reassignConversation(
      String conversationId, String threadId,
      String reassignTo, {String? reason});

  Future<List<Map<String, dynamic>>> getParticipantInfo(String threadId);

  Future<Uint8List> downloadAttachment(String attachmentId, String threadId);
}
```

### 7.2 ChatAssistantRepository

```dart
class ChatAssistantRepository {
  final ChatAssistantService _service;
  final ChatHistoryDbManager _dbManager;

  Future<List<ChatConversationModel>> getMyConversations(
      String userId, int page, int size);

  Future<List<ChatConversationModel>> getAllConversations(
      String unitCode, int page, int size, {String? searchText});

  Future<ChatDataModel> getChatData(String threadId, String conversationId);

  Future<void> sendMessage(String threadId, String content,
      ChatSendMetadata metadata);

  Future<void> sendAttachment(String threadId, File file,
      String fileName, String mimeType);

  Future<void> deleteMessage(String messageId, String threadId);

  Future<void> assignConversation(String conversationId, String threadId,
      String targetUserId, ChatAssignType assignType, {String? reason});

  Future<void> closeConversation(String conversationId, String threadId);

  // Local storage operations
  Future<void> cacheMessage(StoreChatDataModel message);
  Future<List<StoreChatDataModel>> getCachedMessages(String threadId);
  Future<void> syncMessages(String threadId);
}
```

### 7.3 Error Handling Pattern

```dart
// Repository pattern
try {
  final result = await _service.sendMessage(dto);
  // Update local cache
  await _dbManager.add(storeChatModel);
  return result;
} catch (e) {
  // Mark message as unsent in local cache
  throw ChatException(message: e.toString());
}

// BLoC pattern
on<SendChatMessage>((event, emit) async {
  emit(SendMessageLoadingState());
  try {
    await _repository.sendMessage(event.threadId, event.content, event.metadata);
    emit(SendMessageSuccessState(messageId: result['messageId']));
  } catch (e) {
    emit(SendMessageErrorState(message: e.toString()));
  }
});
```

---

## 8. ObjectBox Caching

### 8.1 StoreChatDataModel Entity

ObjectBox entity for offline-first chat message storage.

```dart
@Entity()
class StoreChatDataModel {
  @Id()
  int id;                          // ObjectBox auto-generated ID

  String? messageId;               // ACS message ID (unique)
  String? threadId;                // Chat thread identifier
  String? chatConversationId;      // Internal conversation ID
  String? senderId;                // User ID of message sender
  String? messageText;             // Message body text
  String? messageType;             // "text", "image", "audio", "document"
  bool? isVoiceMessage;            // true if audio/voice message
  String? attachmentLocalPath;     // Local filesystem path for cached attachment
  String? attachmentUrl;           // Remote URL for attachment download
  String? voiceUrl;                // Remote URL for voice message audio
  int? timestamp;                  // Unix timestamp (milliseconds)
  bool? isDeleted;                 // Soft delete flag
  int? deletedAt;                  // Unix timestamp of deletion
  String? conversationStatus;      // Conversation status at time of message
}
```

### 8.2 Index Strategy

| Field | Indexed | Purpose |
|-------|---------|---------|
| `messageId` | Yes (Unique) | Unique lookup, duplicate prevention |
| `threadId` | Yes | Query all messages in a thread |
| `chatConversationId` | Yes | Query by conversation |
| `timestamp` | Yes | Ordering, range queries, cleanup |

### 8.3 ChatHistoryDbManager CRUD Operations

| # | Operation | Method | Description |
|---|-----------|--------|-------------|
| 1 | **addMessage** | `Future<void> addMessage(StoreChatDataModel)` | Insert with dedup check on `messageId`. Skips if exists. |
| 2 | **getMessagesByThreadId** | `Future<List<StoreChatDataModel>> getMessagesByThreadId(String)` | Fetch all, sorted by `timestamp` asc, excludes soft-deleted. |
| 3 | **getLatestMessageIdByThreadId** | `Future<String?> getLatestMessageIdByThreadId(String)` | Most recent `messageId` in thread. Used as sync cursor. |
| 4 | **isMessagePresent** | `Future<bool> isMessagePresent(String)` | Check existence by `messageId`. Used before insert. |
| 5 | **updateMessage** | `Future<void> updateMessage(StoreChatDataModel)` | Update by ObjectBox `id`. For attachment paths, delete flags. |
| 6 | **deleteMessage** (soft) | `Future<void> deleteMessage(String)` | Sets `isDeleted=true`, `deletedAt=now`. Does NOT remove record. |
| 7 | **deleteOldMessages** (hard) | `Future<void> deleteOldMessages(int olderThanTimestamp)` | Permanently removes messages + cleans up attachment files. |

### 8.4 ObjectBox Error Messages

| # | Message | Operation | Trigger |
|---|---------|-----------|---------|
| 1 | `"Message added to the database"` | addMessage | Success log |
| 2 | `"Failed to add message to database"` | addMessage | Write failure |
| 3 | `"Failed to fetch messages"` | getMessagesByThreadId | Query failure |
| 4 | `"Failed to get latest message ID"` | getLatestMessageIdByThreadId | Query failure |
| 5 | `"Failed to check message presence"` | isMessagePresent | Query failure |
| 6 | `"Failed to update message"` | updateMessage | Write failure |
| 7 | `"Failed to delete message"` | deleteMessage | Soft delete failure |
| 8 | `"Failed to delete old messages"` | deleteOldMessages | Bulk delete failure |

### 8.5 Cache Flow

```
Message received from ACS (real-time event)
    |
    v
Check ObjectBox: isMessagePresent(messageId)?
    |
    +-- Yes: skip (dedup)
    |
    +-- No: store in ObjectBox
            |
            v
        Has attachment?
            |
            +-- No --> Done
            |
            +-- Yes
                    |
                    v
                Download attachment to filesystem (L3 cache)
                    |
                    v
                Update StoreChatDataModel.attachmentLocalPath
                    |
                    v
                Display: load from local path
```

---

## 9. Chat API Endpoints (11)

### 9.1 GET `/prm/chat-conversations/user/chats`

Fetch MY conversations (assigned to current user).

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | String | Yes | Current user ID |
| `status` | String | No | Filter by status |
| `page` | int | No | Page number |
| `size` | int | No | Page size |

**Response `200`:**
```json
{
  "data": [
    {
      "threadId": "acs-thread-001",
      "conversationId": "conv-001",
      "topic": "Patient Query - Rajesh Kumar",
      "patientName": "Rajesh Kumar",
      "uhid": "NH-2026-00451",
      "assignedTo": "kavita.frontoffice",
      "assignedToName": "Kavita",
      "lastMessage": "Thank you for the update",
      "lastMessageOn": "2026-04-22T10:30:00Z",
      "unreadCount": 3,
      "status": "ACTIVE"
    }
  ],
  "totalCount": 25
}
```

### 9.2 POST `/prm/_search/user/all-chat-conversation`

Search ALL conversations with filters.

**Request:**
```json
{
  "searchText": "Rajesh",
  "status": "ACTIVE",
  "assignedTo": null,
  "unitCode": "UNIT3",
  "page": 0,
  "size": 20
}
```

**Response:** Same format as 9.1.

### 9.3 POST `/prm/_send/message`

Send a text message to a chat thread.

**Request:**
```json
{
  "threadId": "acs-thread-001",
  "content": "Hi Rajesh, your reports are ready.",
  "type": "text",
  "metadata": {
    "senderDisplayName": "Kavita",
    "patientId": "PAT-001",
    "conversationId": "conv-001"
  }
}
```

**Response `200`:**
```json
{
  "messageId": "msg-001",
  "threadId": "acs-thread-001",
  "createdOn": "2026-04-22T10:35:00Z",
  "status": "SENT"
}
```

### 9.4 POST `/prm/_send/attachment`

Send a file attachment. Uses `multipart/form-data`.

**Form Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `threadId` | String | Target thread |
| `file` | Binary | File data |
| `fileName` | String | Original file name |
| `mimeType` | String | MIME type |
| `metadata` | JSON String | ChatSendMetadata as JSON |

**Response `200`:**
```json
{
  "messageId": "msg-002",
  "attachmentId": "att-001",
  "fileUrl": "https://dms.example.com/files/att-001",
  "threadId": "acs-thread-001",
  "createdOn": "2026-04-22T10:36:00Z"
}
```

### 9.5 GET `/prm/_read/messages`

Fetch messages from a chat thread.

**Query Parameters:**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `threadId` | String | Yes | Thread identifier |
| `page` | int | No | Page number |
| `size` | int | No | Page size |
| `before` | String | No | ISO timestamp cursor for pagination |

**Response `200`:**
```json
{
  "messages": [
    {
      "messageId": "msg-001",
      "senderId": "kavita.frontoffice",
      "senderDisplayName": "Kavita",
      "content": "Hi Rajesh, your reports are ready.",
      "type": "text",
      "createdOn": "2026-04-22T10:35:00Z",
      "deletedOn": null,
      "metadata": {}
    }
  ],
  "hasMore": true,
  "nextCursor": "2026-04-22T10:30:00Z"
}
```

### 9.6 GET `/prm/_download/attachments`

Download a chat attachment file.

**Query Parameters:** `attachmentId`, `threadId`

**Response:** Binary stream with appropriate `Content-Type` header.

### 9.7 DELETE `/prm/_delete/message`

Delete a message from a thread.

**Query Parameters:** `messageId`, `threadId`

**Response `200`:**
```json
{
  "messageId": "msg-001",
  "deletedOn": "2026-04-22T11:00:00Z",
  "status": "DELETED"
}
```

### 9.8 POST `/prm/_assign`

Assign a conversation to a user.

**Request:**
```json
{
  "conversationId": "conv-001",
  "threadId": "acs-thread-001",
  "assignTo": "kavita.frontoffice",
  "assignType": "ASSIGN"
}
```

**Response `200`:**
```json
{
  "conversationId": "conv-001",
  "assignedTo": "kavita.frontoffice",
  "assignedToName": "Kavita",
  "status": "ASSIGNED"
}
```

### 9.9 POST `/prm/_delegate`

Delegate a conversation to another user.

**Request:**
```json
{
  "conversationId": "conv-001",
  "threadId": "acs-thread-001",
  "delegateTo": "dr.anita",
  "assignType": "DELEGATE",
  "reason": "Billing query - needs finance expertise"
}
```

**Response `200`:**
```json
{
  "conversationId": "conv-001",
  "assignedTo": "dr.anita",
  "assignedToName": "Dr. Anita",
  "status": "DELEGATED"
}
```

### 9.10 POST `/prm/_reassign`

Reassign a conversation from one user to another.

**Request:**
```json
{
  "conversationId": "conv-001",
  "threadId": "acs-thread-001",
  "reassignTo": "sunita.billing",
  "assignType": "REASSIGN",
  "reason": "Shift change"
}
```

**Response `200`:**
```json
{
  "conversationId": "conv-001",
  "assignedTo": "sunita.billing",
  "assignedToName": "Sunita",
  "status": "REASSIGNED"
}
```

### 9.11 GET `/prm/_user/participant-info`

Fetch participant information for a chat thread.

**Query Parameters:** `threadId`

**Response `200`:**
```json
{
  "participants": [
    {
      "userId": "kavita.frontoffice",
      "displayName": "Kavita",
      "role": "AGENT",
      "joinedOn": "2026-04-22T09:00:00Z",
      "isActive": true
    },
    {
      "userId": "patient-rajesh",
      "displayName": "Rajesh Kumar",
      "role": "PATIENT",
      "joinedOn": "2026-04-22T08:55:00Z",
      "isActive": true
    }
  ]
}
```

---

## 10. Message Threading Model

### 10.1 Thread Hierarchy

```
ChatConversationModel (top-level conversation)
    |
    +-- threadId: ACS thread identifier (1:1 with conversation)
    |
    +-- ChatDataModel (composite view model)
    |       |
    |       +-- messages: List<ChatMessageDTO> (ordered by createdOn)
    |       +-- participants: List<ChatParticipantsModel>
    |       +-- conversationDetails: ChatConversationModel
    |       +-- accessToken: ChatAccessTokenModel?
    |
    +-- StoreChatDataModel (ObjectBox, per message)
            |
            +-- threadId (indexed)
            +-- messageId (unique)
            +-- ordered by timestamp
```

### 10.2 ChatDataModel (Composite View)

| Field | Type | Description |
|-------|------|-------------|
| `threadId` | `String` | Thread identifier |
| `topic` | `String` | Thread topic / title |
| `messages` | `List<ChatMessageDTO>` | All messages in thread |
| `participants` | `List<ChatParticipantsModel>` | Thread participants |
| `conversationDetails` | `ChatConversationModel` | Parent conversation metadata |
| `accessToken` | `ChatAccessTokenModel?` | ACS access token for this thread |

### 10.3 ChatAccessTokenModel

| Field | Type | Description |
|-------|------|-------------|
| `token` | `String` | ACS access token |
| `expiresOn` | `String` | Token expiry timestamp |
| `userId` | `String` | ACS user ID |
| `endpoint` | `String` | ACS endpoint URL |

### 10.4 Message Ordering

Messages within a thread are ordered by `createdOn` timestamp ascending (oldest first, newest at bottom). The UI auto-scrolls to the newest message when the thread is opened and when new messages arrive.

---

## 11. Assign / Delegate / Reassign Flows

### 11.1 ChatAssignType Enum

| Value | Description | Use Case |
|-------|-------------|----------|
| `ASSIGN` | Initial assignment to a user | Unassigned conversation picked up |
| `DELEGATE` | Temporary delegation to another user | Current assignee forwards to colleague |
| `REASSIGN` | Permanent reassignment to a different user | Supervisor redistributes workload |

### 11.2 Assignment Flow

```
Unassigned Conversation (assignedTo = null)
    |
    v
User opens conversation, taps "Assign to Self"
    |
    v
Confirmation: "Are you sure you want to assign this conversation to yourself?"
    |
    v
POST /prm/_assign
    { conversationId, threadId, assignTo: currentUserId, assignType: "ASSIGN" }
    |
    v
Conversation.assignedTo = currentUserId
Conversation appears in user's MY CONVERSATIONS queue
Text input field becomes active (can now send messages)
```

### 11.3 Delegation Flow

```
Assigned Conversation (assignedTo = UserA)
    |
    v
UserA taps "Delegate" action
    |
    v
User search dialog appears (MDM user search)
    |
    v
UserA selects UserB, optionally enters reason
    |
    v
POST /prm/_delegate
    { conversationId, threadId, delegateTo: UserB, assignType: "DELEGATE", reason: "..." }
    |
    v
Conversation.assignedTo = UserB
Conversation.assignType = DELEGATE
    |
    v
System message posted in thread: "This chat has been delegated to {UserB}"
    |
    v
Conversation moves from UserA's queue to UserB's queue
UserA's info toast: "Chat conversation successfully delegated"
```

### 11.4 Reassignment Flow

```
Assigned Conversation (assignedTo = UserA)
    |
    v
Supervisor/Admin taps "Reassign" action
    |
    v
User search dialog appears
    |
    v
Supervisor selects UserC, optionally enters reason
    |
    v
POST /prm/_reassign
    { conversationId, threadId, reassignTo: UserC, assignType: "REASSIGN", reason: "..." }
    |
    v
Conversation.assignedTo = UserC
Conversation.assignType = REASSIGN
    |
    v
System message: "Conversation reassigned to {UserC}"
    |
    v
Conversation appears in UserC's MY queue
```

### 11.5 Close Conversation Flow

```
User taps "Close" action
    |
    v
Confirmation: "Are you sure you want to close this conversation?"
    |
    v
POST (close API)
    |
    v
System message: "This chat has been closed!"
    |
    v
Conversation status = CLOSED
Text input disabled
Conversation moves out of active queues
```

---

## 12. Message Types

### 12.1 Supported Types

| # | Type | Content | Rendering | Widget |
|---|------|---------|-----------|--------|
| 1 | **text** | Plain text | Standard chat bubble | Default |
| 2 | **attachment** | Generic file | File icon + name + download | `ChatAttachmentWidget` |
| 3 | **audio** | Voice recording | Inline audio player with progress bar | `AudioPlayerWidget` |
| 4 | **pdf** | PDF document | PDF icon + filename + preview/download | `ChatAttachmentWidget` |
| 5 | **image** | Photo/image | Inline thumbnail, tap for full-screen | `ChatAttachmentWidget` |
| 6 | **system** | System event | Centered text, gray styling | Custom |
| 7 | **deleted** | Deleted message | "This message has been deleted" placeholder | Custom |
| 8 | **delegated** | Delegation event | System message with action details | Custom |

### 12.2 Message Type Detection Logic

```
if (message.deletedOn != null)
    --> render as "deleted"
else if (message.type == "system")
    --> render as "system"
else if (message.type == "delegated")
    --> render as "delegated"
else if (message.attachments != null && message.attachments.isNotEmpty)
    --> detect subtype from mimeType:
        image/*          --> render as "image"
        audio/*          --> render as "audio"
        application/pdf  --> render as "pdf"
        *                --> render as "attachment"
else
    --> render as "text"
```

### 12.3 ChatMessageSendDto

DTO for sending a chat message.

| Field | Type | Description |
|-------|------|-------------|
| `threadId` | `String` | Target thread |
| `content` | `String` | Message body |
| `type` | `String` | Content type (text / attachment) |
| `metadata` | `ChatSendMetadata?` | Send metadata |
| `attachments` | `List<ChatAttachments>?` | Attached files |

### 12.4 ChatSendMetadata

| Field | Type | Description |
|-------|------|-------------|
| `senderDisplayName` | `String` | Display name of sender |
| `patientId` | `String?` | Associated patient |
| `conversationId` | `String?` | Conversation reference |
| `priority` | `String?` | Message priority |
| `customType` | `String?` | Custom message type tag |

### 12.5 ChatAttachments

| Field | Type | Description |
|-------|------|-------------|
| `attachmentId` | `String` | Attachment identifier |
| `fileName` | `String` | Original file name |
| `fileUrl` | `String` | Download URL |
| `mimeType` | `String` | MIME type |
| `fileSize` | `int` | Size in bytes |
| `thumbnailUrl` | `String?` | Thumbnail URL for images |

---

## 13. Chat Conversation Models

### 13.1 ChatConversationModel (Full Reference)

| Field | Type | Description |
|-------|------|-------------|
| `threadId` | `String` | ACS thread identifier |
| `conversationId` | `String` | Internal conversation ID |
| `topic` | `String` | Thread topic / title |
| `patientId` | `String?` | Associated patient ID |
| `patientName` | `String?` | Patient display name |
| `uhid` | `String?` | Patient UHID |
| `assignedTo` | `String?` | Currently assigned user ID |
| `assignedToName` | `String?` | Assigned user display name |
| `assignType` | `ChatAssignType?` | Last assignment action type |
| `status` | `String` | Conversation status |
| `createdOn` | `String` | Creation timestamp |
| `lastMessageOn` | `String?` | Timestamp of last message |
| `lastMessage` | `String?` | Preview text of last message |
| `unreadCount` | `int` | Number of unread messages |
| `participants` | `List<String>?` | List of participant user IDs |
| `metadata` | `Map<String, dynamic>?` | Additional metadata |

### 13.2 Conversation Status Values

| Status | Description |
|--------|-------------|
| `ACTIVE` | Conversation is open and active |
| `CLOSED` | Conversation has been closed |
| `UNASSIGNED` | No staff member assigned |

### 13.3 ChatHistoryModel

Historical conversation summary model.

| Field | Type | Description |
|-------|------|-------------|
| `conversationId` | `String` | Conversation identifier |
| `patientName` | `String` | Patient name |
| `totalMessages` | `int` | Total message count |
| `lastActivity` | `String` | Last activity timestamp |
| `resolvedBy` | `String?` | User who closed the conversation |
| `resolvedAt` | `String?` | Closure timestamp |

---

## 14. Screen Layouts

### 14.1 ChatAssistantScreen (Conversation List)

```
+----------------------------------------------+
|  Conversations                            Q  |
+----------------------------------------------+
|  [MY CONVERSATIONS]  ALL CONVERSATIONS       |
|  -------------------                         |
+----------------------------------------------+
| +------------------------------------------+ |
| | [Avatar] Rajesh Kumar          2 min ago | |
| | "Can you tell me when my reports..."     | |
| | [Unassigned]                 3 unread    | |
| +------------------------------------------+ |
| +------------------------------------------+ |
| | [Avatar] Priya Sharma          5 min ago | |
| | "Thank you for the update"              | |
| | Assigned to: Kavita          0 unread    | |
| +------------------------------------------+ |
| +------------------------------------------+ |
| | [Avatar] Meena Devi           12 min ago | |
| | "I need to speak with billing..."       | |
| | Delegated to: Finance Team  1 unread    | |
| +------------------------------------------+ |
+----------------------------------------------+
```

Widget: `ConversationInfoTileWidget` renders each conversation card.

### 14.2 ChatScreen (Individual Conversation)

```
+----------------------------------------------+
|  <- Rajesh Kumar               [...]         |
+----------------------------------------------+
|                                              |
|      +-------------------------------+       |
|      | Rajesh Kumar                  |       |
|      | Can you tell me when my       |       |
|      | reports will be ready?        |       |
|      | 10:28 AM                      |       |
|      +-------------------------------+       |
|                                              |
|      +-------------------------------+       |
|      | I've been waiting since       |       |
|      | morning                       |       |
|      | 10:30 AM                      |       |
|      +-------------------------------+       |
|                                              |
|                  +---------------------------+|
|                  | Hi Rajesh, your reports   ||
|                  | are ready. Please visit   ||
|                  | the front desk.           ||
|                  | 10:35 AM  checkmarks      ||
|                  +---------------------------+|
|                                              |
|      +-------------------------------+       |
|      | Thank you!                    |       |
|      | 10:36 AM                      |       |
|      +-------------------------------+       |
|                                              |
+----------------------------------------------+
| [Attach] [Type a message...        ] [Send]  |
+----------------------------------------------+
```

### 14.3 Action Menu (three-dot menu in ChatScreen)

| Action | Availability | Description |
|--------|-------------|-------------|
| Assign to Self | Unassigned conversations only | Pick up the conversation |
| Delegate | Assigned conversations | Forward to another user |
| Reassign | Assigned conversations (supervisor) | Transfer to different user |
| Close | Assigned conversations | Close resolved conversation |

### 14.4 Chat Widgets

| Widget | Purpose | Used In |
|--------|---------|---------|
| `ConversationInfoTileWidget` | Conversation list item with status, unread count | `ChatAssistantScreen` |
| `ChatAttachmentWidget` | Attachment preview (image/doc/audio) in chat | `ChatScreen` |
| `ChatTimeWidget` | Formatted timestamp display | `ChatScreen` |
| `AudioPlayerWidget` | Inline audio playback controls | `ChatScreen` |
| `NoConversationFoundWidget` | Empty state for no conversations | `ChatAssistantScreen` |
| `SelectedImageToSendScreen` | Preview image before sending | Navigation target |
| `SelectedDocToSendScreen` | Preview document before sending | Navigation target |

---

## 15. Validation Rules

| # | Rule | Error/Behavior | Context |
|---|------|----------------|---------|
| 1 | Cannot send message to closed conversation | `"This chat has been closed"` | ChatScreen |
| 2 | Cannot interact with deleted message | `"This message has been deleted"` | ChatScreen |
| 3 | Must assign before sending messages | Text input disabled until assigned | ChatScreen |
| 4 | Attachment file size limit | Platform-dependent (DMS limit) | Send attachment |
| 5 | Supported attachment types | image/*, audio/*, application/pdf, document types | Send attachment |
| 6 | Duplicate message prevention | ObjectBox `isPresent` check | Real-time event handler |
| 7 | ACS token must be valid | Auto-refresh via `resubscribeToACS` | All real-time operations |

---

## 16. Error Messages

| # | Message | Context |
|---|---------|---------|
| 1 | `"This chat has been closed"` | Send attempt on closed conversation |
| 2 | `"This message has been deleted"` | Interaction with deleted message |
| 3 | `"Chat conversation successfully delegated"` | Info: delegation success toast |
| 4 | `"Failed to send message"` | ACS / PRM message send failure |
| 5 | `"Failed to load conversations"` | Conversation list API failure |
| 6 | `"Failed to assign conversation"` | Assignment API failure |
| 7 | `"Failed to delegate conversation"` | Delegation API failure |
| 8 | `"Failed to close conversation"` | Close API failure |
| 9 | `"Failed to upload attachment"` | DMS upload failure |
| 10 | `"Failed to download attachment"` | DMS download failure |
| 11 | `"No conversations found"` | Empty conversation list |
| 12 | `"Connection lost. Reconnecting..."` | ACS WebSocket disconnected |

### Screen-to-BLoC Mapping

| Screen | BLoC | Events Used |
|--------|------|-------------|
| `ChatAssistantScreen` | `ChatAssistantBloc` | `FetchAllConversation`, `FetchMyConversation` |
| `ChatScreen` | `ChatAssistantBloc` | `FetchChatDataToView`, `SendChatMessage`, `DeleteChatMessage`, `AssignChatConversation`, `CloseChatConversation` |
| `SelectedImageToSendScreen` | `ChatAssistantBloc` | `SendChatMessage` (with attachment) |
| `SelectedDocToSendScreen` | `ChatAssistantBloc` | `SendChatMessage` (with attachment) |

---

*End of Chat System Specification*
