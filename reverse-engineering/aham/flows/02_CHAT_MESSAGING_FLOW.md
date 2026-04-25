# AHAM Chat & Messaging System -- Implementation Flow

> **Audience:** Junior developers building this system from scratch.
> **Stack:** Flutter/Dart, BLoC pattern, Azure Communication Services (ACS), ObjectBox, REST APIs.
> **Module:** "NH Care Assistant" -- hospital staff-to-patient real-time messaging.
> **Last updated:** 2026-04-22

---

## Table of Contents

1. [Overview](#1-overview)
2. [Screen Mockups](#2-screen-mockups)
3. [BLoC State Machine](#3-bloc-state-machine)
4. [ACS Native Plugin](#4-acs-native-plugin)
5. [Conversation Lifecycle](#5-conversation-lifecycle)
6. [Send Message Flow](#6-send-message-flow)
7. [File Attachment Flow](#7-file-attachment-flow)
8. [Receive Message Flow](#8-receive-message-flow)
9. [Delegation & Assignment](#9-delegation--assignment)
10. [Message Types](#10-message-types)
11. [ObjectBox Storage](#11-objectbox-storage)
12. [Offline Behavior & Sync](#12-offline-behavior--sync)
13. [Complete API Reference](#13-complete-api-reference)
14. [Notification Integration](#14-notification-integration)
15. [Error Handling Matrix](#15-error-handling-matrix)
16. [Edge Cases](#16-edge-cases)
17. [Implementation Checklist](#17-implementation-checklist)

---

## 1. Overview

### What This System Does

NH Care Assistant is a real-time messaging module inside the AHAM hospital app. It enables hospital staff (doctors, nurses, coordinators) to chat with patients. Patients message via their own portal. Staff see those messages land in a shared queue, claim conversations, respond, delegate to colleagues, and eventually close them out.

Think of it as a customer-support chat -- but for a hospital. Conversations start when a patient sends a message. Staff members assign themselves to respond. When the medical query is resolved, staff close the conversation. If a patient messages again after closure, a brand-new conversation is created.

### Why Three Layers?

The system has three distinct architectural layers. This is not a design preference -- it is forced by Azure Communication Services, which only offers native Android/iOS SDKs (no Dart SDK exists).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     AHAM CHAT & MESSAGING ARCHITECTURE                      │
│                                                                             │
│  LAYER 1: Flutter UI (Dart)                                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  ChatAssistantBloc                                                    │  │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────┐   │  │
│  │  │ ConversationList  │  │   ChatScreen     │  │  DelegateDialog   │   │  │
│  │  │   (ALL / MY)      │  │  (messages +     │  │  (user search +   │   │  │
│  │  │                   │  │   input bar)     │  │   reason)         │   │  │
│  │  └──────────────────┘  └──────────────────┘  └───────────────────┘   │  │
│  └────────────────────────────────┬──────────────────────────────────────┘  │
│                                   │                                         │
│                          Method Channel +                                   │
│                          Event Channel                                      │
│                                   │                                         │
│  LAYER 2: Native Plugin (Java/Kotlin)                                       │
│  ┌────────────────────────────────┴──────────────────────────────────────┐  │
│  │  flutter_acs plugin (11 Java files)                                   │  │
│  │  ┌──────────────────────┐  ┌──────────────────────────────────────┐   │  │
│  │  │ ACSCommunication     │  │  Data Models (Kotlin data classes)   │   │  │
│  │  │ - ChatAsyncClient    │  │  - ChatMessageDTO                    │   │  │
│  │  │ - ChatThreadClient   │  │  - ChatMessageReceived               │   │  │
│  │  │ - Event handlers     │  │  - ChatMessageDeleted                │   │  │
│  │  └──────────────────────┘  └──────────────────────────────────────┘   │  │
│  └────────────────────────────────┬──────────────────────────────────────┘  │
│                                   │                                         │
│                            ACS SDK (native)                                 │
│                                   │                                         │
│  LAYER 3: Azure Communication Services (Cloud)                              │
│  ┌────────────────────────────────┴──────────────────────────────────────┐  │
│  │  Azure-hosted chat infrastructure                                     │  │
│  │  - Thread management        - Real-time message delivery              │  │
│  │  - Participant management   - Push notification relay                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  BACKEND: PRM Service + DMS                                                 │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  /prm/api/  - conversation CRUD, assignment, message relay            │  │
│  │  /dms/api/  - file upload/download (document management)              │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  LOCAL STORAGE: ObjectBox + 4-Layer Cache                                   │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  L0: MemoryCache (in-process Dart maps)                               │  │
│  │  L1: ImageCache (Flutter's built-in image cache)                      │  │
│  │  L2: ObjectBox (structured message records)                           │  │
│  │  L3: Filesystem (downloaded attachments as raw files)                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Single BLoC for everything.** `ChatAssistantBloc` handles all 8 events and 16 states. There is no separate BLoC for conversation list vs. active chat. This keeps the widget tree simple but means the BLoC file is large.

2. **ACS for real-time, PRM for persistence.** Messages flow through ACS for real-time delivery but are also stored on the PRM backend. ObjectBox provides the local cache layer between them.

3. **Soft-delete only.** Messages are never physically removed from ObjectBox. A delete sets `isDeleted=true` and `deletedAt=now`. The UI filters them. Hard deletes only happen during scheduled cleanup of old messages.

4. **No offline send.** The app does NOT queue messages for later delivery. If the device is offline, the send button should be disabled or fail immediately. Offline mode only supports reading cached messages and viewing cached attachments.

---

## 2. Screen Mockups

### 2.1 Conversation List Screen (Two Tabs)

```
┌──────────────────────────────────────────────────────┐
│  ← NH Care Assistant                          🔍     │
│ ─────────────────────────────────────────────────────│
│  ┌────────────┐  ┌────────────┐                      │
│  │  ALL (47)   │  │   MY (5)   │                     │
│  └────────────┘  └────────────┘                      │
│ ─────────────────────────────────────────────────────│
│  ┌───────────────────────────────────────────────┐   │
│  │ 🟢 Rajesh Kumar                    10:32 AM   │   │
│  │ UHID: NH-HYD-2026-1234                        │   │
│  │ "Can I take my medication with food?"          │   │
│  │ Status: UNASSIGNED                    ●        │   │
│  └───────────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────────┐   │
│  │ 🟡 Priya Sharma                     9:45 AM   │   │
│  │ UHID: NH-HYD-2026-5678                        │   │
│  │ "Thank you, I will follow the schedule"        │   │
│  │ Status: ACTIVE  →  Dr. Reddy         ●        │   │
│  └───────────────────────────────────────────────┘   │
│  ┌───────────────────────────────────────────────┐   │
│  │ ⚪ Arun Mehta                      Yesterday   │   │
│  │ UHID: NH-HYD-2026-9012                        │   │
│  │ "Discharge summary received"                   │   │
│  │ Status: CLOSED                                 │   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
│              ↕  Pull to refresh / Scroll             │
└──────────────────────────────────────────────────────┘

ALL tab: Shows ALL conversations (UNASSIGNED + ACTIVE + CLOSED).
         Paginated. Search by patient name/UHID. Filter by status.
         API: POST /prm/_search/user/all-chat-conversation

MY tab:  Shows only conversations assigned to the current user.
         API: GET /prm/chat-conversations/user/chats
```

### 2.2 Chat Screen (Active Conversation)

```
┌──────────────────────────────────────────────────────┐
│  ← Rajesh Kumar                                      │
│    UHID: NH-HYD-2026-1234                            │
│    Status: ACTIVE          [Delegate] [Close]        │
│ ─────────────────────────────────────────────────────│
│                                                      │
│          ┌─────────────────────────────┐             │
│          │  Conversation assigned to   │             │
│          │  Dr. Reddy on 22 Apr 2026   │             │
│          └─────────────────────────────┘             │
│                                                      │
│  ┌─────────────────────────────┐                     │
│  │ Can I take my medication    │         10:30 AM    │
│  │ with food?                  │                     │
│  └─────────────────────────────┘                     │
│                                                      │
│                    ┌─────────────────────────────┐   │
│       10:32 AM     │ Yes, you can take it with   │   │
│                    │ food. Avoid dairy products   │   │
│                    │ for 30 minutes after.        │   │
│                    └─────────────────────────────┘   │
│                                                      │
│  ┌─────────────────────────────┐                     │
│  │ 📎 prescription_scan.pdf    │         10:35 AM    │
│  │ [Tap to download]          │                     │
│  └─────────────────────────────┘                     │
│                                                      │
│  ┌─────────────────────────────┐                     │
│  │ 🖼️ [Image Thumbnail]       │         10:36 AM    │
│  │ [Tap for full-screen]      │                     │
│  └─────────────────────────────┘                     │
│                                                      │
│  ┌─────────────────────────────┐                     │
│  │ 🔊 ▶ ████████░░░░ 0:12     │         10:37 AM    │
│  │   Audio Message             │                     │
│  └─────────────────────────────┘                     │
│                                                      │
│          ┌─────────────────────────────┐             │
│          │  This message has been      │             │
│          │  deleted                    │             │
│          └─────────────────────────────┘             │
│                                                      │
│ ─────────────────────────────────────────────────────│
│  📎  │ Type a message...                  │  ➤      │
│      │                                    │          │
└──────────────────────────────────────────────────────┘

- Left-aligned bubbles: patient messages
- Right-aligned bubbles: staff messages
- Center-aligned: system messages (assign, delegate, close, deleted)
- Bottom bar: attachment button + text field + send button
- Bottom bar DISABLED when conversation status is CLOSED or UNASSIGNED
- [Delegate] and [Close] buttons in app bar (only when ACTIVE)
```

### 2.3 Chat Screen (Unassigned Conversation)

```
┌──────────────────────────────────────────────────────┐
│  ← Rajesh Kumar                                      │
│    UHID: NH-HYD-2026-1234                            │
│    Status: UNASSIGNED      [Assign to Self]          │
│ ─────────────────────────────────────────────────────│
│                                                      │
│  ┌─────────────────────────────┐                     │
│  │ I have a question about my  │         10:30 AM    │
│  │ medication schedule.        │                     │
│  └─────────────────────────────┘                     │
│                                                      │
│ ─────────────────────────────────────────────────────│
│  ┌───────────────────────────────────────────────┐   │
│  │        💬 Assign to start chatting             │   │
│  │     Text input disabled for unassigned         │   │
│  └───────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### 2.4 Delegate Dialog

```
┌──────────────────────────────────────────────────────┐
│              Delegate Conversation                    │
│ ─────────────────────────────────────────────────────│
│                                                      │
│  Search staff member:                                │
│  ┌───────────────────────────────────────────────┐   │
│  │ 🔍 Type name to search...                     │   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
│  ○ Dr. Anand (Cardiology)                            │
│  ● Dr. Meena (General Medicine)    ← selected        │
│  ○ Nurse Lakshmi (Ward 3B)                           │
│                                                      │
│  Reason (optional):                                  │
│  ┌───────────────────────────────────────────────┐   │
│  │ Patient needs specialist opinion              │   │
│  └───────────────────────────────────────────────┘   │
│                                                      │
│            [Cancel]        [Delegate]                 │
└──────────────────────────────────────────────────────┘
```

---

## 3. BLoC State Machine

### 3.1 ChatAssistantBloc -- Single BLoC, 8 Events, 16 States

There is exactly one BLoC for the entire chat system. No sub-BLoCs, no nested state management. Every chat-related action dispatches an event to `ChatAssistantBloc`.

### 3.2 Event Registry

```
CHAT EVENTS REGISTRY
=====================

 #  │ Event Class                     │ Parameters                                           │ Triggers
────┼─────────────────────────────────┼──────────────────────────────────────────────────────┼──────────────────────
  1 │ FetchAllConversation            │ page, size, searchText?, status?                     │ ALL tab load/refresh
  2 │ FetchMyConversation             │ page, size                                           │ MY tab load/refresh
  3 │ FetchChatDataToView             │ threadId, conversationId                             │ Open chat screen
  4 │ FetchUserChatConversationSummary│ userId                                               │ Badge counts
  5 │ SendChatMessage                 │ threadId, content, metadata                          │ Send button tap
  6 │ DeleteChatMessage               │ messageId, threadId                                  │ Long-press → delete
  7 │ AssignChatConversation          │ conversationId, threadId, targetUserId,              │ Assign/Delegate/
    │                                 │ assignType (ASSIGN|DELEGATE|REASSIGN), reason?       │ Reassign actions
  8 │ CloseChatConversation           │ conversationId, threadId                             │ Close button tap
```

### 3.3 State Machine Diagram

```
                        ┌─────────────────────────┐
                        │  ChatAssistantInitial    │
                        └────────────┬────────────┘
                                     │
               ┌─────────────────────┼─────────────────────┐
               │                     │                     │
               ▼                     ▼                     ▼
    ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │ CONVERSATION     │  │ ASSIGNMENT       │  │ MESSAGING        │
    │ LOADING FLOW     │  │ FLOW             │  │ FLOW             │
    └──────────────────┘  └──────────────────┘  └──────────────────┘


CONVERSATION LOADING FLOW
──────────────────────────
FetchAllConversation ─┐
FetchMyConversation ──┤
FetchChatDataToView ──┤
FetchUserChat...    ──┘
                      │
                      ▼
            ConversationsLoadingState
                      │
              ┌───────┴───────┐
              │               │
              ▼               ▼
ConversationsLoadedState  ConversationsErrorState
(conversations, totalCount)  (message)


ASSIGNMENT FLOW (3 sub-flows share common pattern)
───────────────────────────────────────────────────

AssignChatConversation(assignType: ASSIGN)
    │
    ▼
AssignLoadingState
    │
    ├──► AssignSuccessState(conversation, assignType)
    │       → shows "Conversation assigned successfully"
    │       → conversation moves to MY queue
    │
    └──► AssignErrorState(message)
            → shows error snackbar


AssignChatConversation(assignType: DELEGATE)
    │
    ▼
DelegateLoadingState
    │
    ├──► DelegateSuccessState(conversation)
    │       → shows "Conversation delegated successfully"
    │       → conversation moves to target user's queue
    │       → system message injected into chat
    │
    └──► DelegateErrorState(message)


AssignChatConversation(assignType: REASSIGN)
    │
    ▼
DelegateLoadingState          ← NOTE: reuses Delegate loading state
    │
    ├──► DelegateSuccessState(conversation)    ← reuses Delegate success
    │
    └──► DelegateErrorState(message)           ← reuses Delegate error


CLOSE FLOW
──────────
CloseChatConversation
    │
    ▼
CloseLoadingState
    │
    ├──► CloseSuccessState(conversationId)
    │       → disables text input
    │       → injects system message "Conversation closed"
    │
    └──► CloseErrorState(message)


SEND MESSAGE FLOW
──────────────────
SendChatMessage
    │
    ▼
SendMessageLoadingState
    │
    ├──► SendMessageSuccessState(messageId)
    │       → clears text field
    │       → message appears in chat (via ACS real-time)
    │
    └──► SendMessageErrorState(message)
            → shows "Failed to send message" snackbar
```

**Key insight:** REASSIGN reuses the `DelegateLoadingState` and `DelegateSuccessState`. This is intentional -- from the UI perspective, delegate and reassign look identical. The difference is only in who can perform the action (conversation owner vs. supervisor).

### 3.4 State Class Reference

```
STATE CLASS REGISTRY
====================

 #  │ State Class                  │ Properties                        │ Emitted By
────┼──────────────────────────────┼───────────────────────────────────┼──────────────────────
  1 │ ChatAssistantInitial         │ (none)                            │ BLoC constructor
  2 │ ConversationsLoadingState    │ (none)                            │ FetchAll/My/View/Summary
  3 │ ConversationsLoadedState     │ conversations, totalCount         │ FetchAll/My/View/Summary
  4 │ ConversationsErrorState      │ message                           │ FetchAll/My/View/Summary
  5 │ AssignLoadingState           │ (none)                            │ Assign
  6 │ AssignSuccessState           │ conversation, assignType          │ Assign
  7 │ AssignErrorState             │ message                           │ Assign
  8 │ DelegateLoadingState         │ (none)                            │ Delegate, Reassign
  9 │ DelegateSuccessState         │ conversation                      │ Delegate, Reassign
 10 │ DelegateErrorState           │ message                           │ Delegate, Reassign
 11 │ CloseLoadingState            │ (none)                            │ Close
 12 │ CloseSuccessState            │ conversationId                    │ Close
 13 │ CloseErrorState              │ message                           │ Close
 14 │ SendMessageLoadingState      │ (none)                            │ Send
 15 │ SendMessageSuccessState      │ messageId                         │ Send
 16 │ SendMessageErrorState        │ message                           │ Send
```

---

## 4. ACS Native Plugin

### 4.1 Why a Native Plugin?

Azure Communication Services has Java/Swift SDKs but no Dart SDK. The `flutter_acs` plugin bridges this gap with 11 Java/Kotlin files that wrap the ACS Chat SDK and expose it to Flutter via platform channels.

### 4.2 Plugin File Structure

```
flutter_acs/
├── ACSCommunication.java          ← Core: client management, method handlers
├── FlutterAcsPlugin.java          ← Flutter plugin registration, channel setup
├── ChatMessageDTO.kt              ← Wrapper: eventType + threadId + payload
├── ChatMessageReceived.kt         ← Parsed incoming message
├── ChatMessageDeleted.kt          ← Parsed delete notification
├── ChatParticipantsModel.kt       ← Participant list updates
├── ChatThreadDeletedModel.kt      ← Thread deletion event
├── CustomChatMessageType.kt       ← Enum: 8 message event types
├── ChatHistoryMessages.kt         ← History fetch response wrapper
├── ChatTypingIndicator.kt         ← Typing indicator (registered but unused)
└── Constants.kt                   ← Shared string constants
```

### 4.3 Method Channel: "flutter_acs" (Flutter → Native)

These are synchronous-style calls from Flutter into the native layer. Each returns a result via the method channel callback.

```
METHOD CHANNEL REFERENCE
========================

Method: initACS
─────────────────────────────────────────────────────────────────
Purpose:   Create ACS clients and register real-time event listeners
Arguments: { endPoint: String, accessToken: String, threadId: String }
Behavior:
  1. Create CommunicationTokenCredential from accessToken
  2. Create ChatAsyncClient(endPoint, credential)
  3. Create ChatThreadAsyncClient for threadId
  4. Store both in LinkedHashMap<String, *> keyed by threadId
  5. Register CHAT_MESSAGE_RECEIVED listener
  6. Register CHAT_MESSAGE_DELETED listener
  7. Call startRealtimeNotifications() on ChatAsyncClient
Returns:   Success/failure indicator


Method: resubscribeToACS
─────────────────────────────────────────────────────────────────
Purpose:   Tear down existing connection and rebuild with fresh token
Arguments: { endPoint: String, accessToken: String, threadId: String }
Behavior:
  1. Call unsubscribeACS(threadId) internally
  2. Call initACS(endPoint, accessToken, threadId)
Use case:  Token refresh -- ACS tokens expire; this re-establishes the session
Returns:   Success/failure indicator


Method: unsubscribeACS
─────────────────────────────────────────────────────────────────
Purpose:   Stop listening and clean up resources
Arguments: { threadId: String }
Behavior:
  1. Stop real-time notifications on ChatAsyncClient
  2. Remove ChatAsyncClient from map
  3. Remove ChatThreadAsyncClient from map
Returns:   Success/failure indicator


Method: allMessages
─────────────────────────────────────────────────────────────────
Purpose:   Fetch all messages in a thread (initial load)
Arguments: { threadId: String }
Behavior:
  1. Use ChatThreadAsyncClient to list all messages
  2. Filter: only TEXT and HTML types (skip system messages)
  3. Package as ChatMessageDTO with chatType = "ACTIVE_HISTORY"
  4. Send via event channel (NOT return value)
Returns:   Sends data via event channel, not direct return


Method: getAllHistoryMessages
─────────────────────────────────────────────────────────────────
Purpose:   Fetch paginated history (older messages)
Arguments: { endPoint, accessToken, threadId, page, startTime }
Behavior:
  1. Create temporary ChatAsyncClient + ChatThreadAsyncClient
  2. Fetch messages before startTime cursor
  3. Filter: only TEXT and HTML types
  4. Package as ChatMessageDTO with chatType = "HISTORY"
  5. Send via event channel
Returns:   Sends data via event channel, not direct return
```

### 4.4 Event Channel: "flutter_acs_event_channel_stream" (Native → Flutter)

This is a one-way stream from native code to Flutter. All data flows as JSON strings.

```
EVENT CHANNEL PAYLOAD FORMAT
════════════════════════════

{
  "chatType": "ACTIVE" | "ACTIVE_HISTORY" | "HISTORY",
  "chats": "<JSON string of message(s)>"
}

chatType meanings:
──────────────────
ACTIVE          → Real-time incoming message (someone just sent/deleted something NOW)
ACTIVE_HISTORY  → Bulk fetch result from allMessages() (initial thread load)
HISTORY         → Paginated older messages from getAllHistoryMessages()
```

### 4.5 Event Handlers (Only 2 of 8 Registered)

ACS supports 8 event types. The plugin only registers listeners for 2 of them:

```
ACS EVENT TYPES (CustomChatMessageType enum)
════════════════════════════════════════════

 #  │ Enum Value                    │ Registered? │ What It Does
────┼───────────────────────────────┼─────────────┼────────────────────────────
  1 │ CHAT_MESSAGE_RECEIVED         │ ✅ YES      │ New message arrived
  2 │ CHAT_MESSAGE_DELETED          │ ✅ YES      │ Message was deleted
  3 │ CHAT_MESSAGE_EDITED           │ ❌ NO       │ Message was edited
  4 │ TYPING_INDICATOR_RECEIVED     │ ❌ NO       │ Someone is typing
  5 │ READ_RECEIPT_RECEIVED         │ ❌ NO       │ Message was read
  6 │ CHAT_THREAD_CREATED           │ ❌ NO       │ New thread created
  7 │ CHAT_THREAD_DELETED           │ ❌ NO       │ Thread was deleted
  8 │ PARTICIPANTS_ADDED            │ ❌ NO       │ New participants joined
```

**Design implication:** No typing indicators, no read receipts, no real-time thread creation notifications. The app relies on pull-based refresh for conversation list updates.

### 4.6 Event Handler Processing Pipeline

```
ACS Cloud Event
    │
    ▼
ChatAsyncClient.addEventHandler(CHAT_MESSAGE_RECEIVED, handler)
    │
    ▼
handler receives ChatMessageReceivedEvent
    │
    ├── Extract sender as CommunicationUserIdentifier
    │   (cast from ChatEventModel.getSender())
    │
    ├── Extract fields:
    │   - messageId     = event.getId()
    │   - content       = event.getContent()
    │   - type          = event.getType() → must be TEXT or HTML
    │   - createdOn     = event.getCreatedOn() → format "yyyy-MM-dd'T'HH:mm:ss"
    │   - senderDisplay = event.getSenderDisplayName()
    │   - senderId      = communicationUserIdentifier.getId()
    │
    ├── Filter: if type is NOT "text" and NOT "html" → SKIP (ignore system messages)
    │
    ├── Wrap in ChatMessageReceived data class
    │
    ├── Wrap in ChatMessageDTO:
    │   - eventType = "CHAT_MESSAGE_RECEIVED"
    │   - threadId  = current threadId
    │   - payload   = ChatMessageReceived (serialized via Gson)
    │   - metadata  = null
    │
    ├── Serialize entire DTO to JSON via Gson
    │
    └── Post to UI thread:
        Handler(Looper.getMainLooper()).post {
            eventSink.success(json)    ← fires into Flutter event channel
        }
```

### 4.7 Native Data Models

```kotlin
// ChatMessageDTO.kt -- the envelope
data class ChatMessageDTO(
    val eventType: String,     // "CHAT_MESSAGE_RECEIVED" | "CHAT_MESSAGE_DELETED"
    val threadId: String,
    val groupId: String?,      // unused in current implementation
    val payload: Any,          // ChatMessageReceived or ChatMessageDeleted
    val metadata: Map<String, String>?
)

// ChatMessageReceived.kt -- a new message
data class ChatMessageReceived(
    val senderId: String,          // ACS CommunicationUserIdentifier ID
    val messageId: String,         // unique ACS message ID
    val content: String,           // message text or HTML
    val type: String,              // "text" or "html"
    val createdOn: String,         // "yyyy-MM-dd'T'HH:mm:ss"
    val deletedOn: String?,        // null unless deleted
    val senderDisplayName: String  // human-readable sender name
)

// ChatMessageDeleted.kt -- a delete notification
data class ChatMessageDeleted(
    val messageId: String,         // which message was deleted
    val deletedOn: String          // when it was deleted
)
```

### 4.8 Client Management

```
ACSCommunication manages clients in two LinkedHashMaps:
─────────────────────────────────────────────────────────

LinkedHashMap<String, ChatAsyncClient>       chatClients
LinkedHashMap<String, ChatThreadAsyncClient> threadClients

Key = threadId (a single user may have multiple active threads)

Lifecycle:
  initACS(threadId)        → creates both clients, adds to maps
  unsubscribeACS(threadId) → removes both from maps, stops notifications
  resubscribeToACS(...)    → calls unsubscribe then init (token refresh)

Why LinkedHashMap? Preserves insertion order. When iterating threads
(e.g., cleanup on logout), they are processed in the order they were opened.
```

---

## 5. Conversation Lifecycle

### 5.1 State Machine

```
                    Patient sends
                    first message
                         │
                         ▼
               ┌──────────────────┐
               │    UNASSIGNED     │
               │                  │
               │  Visible in ALL  │
               │  tab only        │
               │  Text input OFF  │
               └────────┬─────────┘
                        │
                Staff taps "Assign to Self"
                POST /prm/_assign
                        │
                        ▼
               ┌──────────────────┐
               │     ACTIVE        │◄──────────────────────────────────┐
               │                  │                                    │
               │  Visible in ALL  │    DELEGATE: POST /prm/_delegate  │
               │  + MY tabs       │    REASSIGN: POST /prm/_reassign  │
               │  Text input ON   │                                    │
               │  Can delegate    │    (moves to new owner's MY queue, │
               │  Can close       │     but status stays ACTIVE)       │
               └────────┬─────────┘────────────────────────────────────┘
                        │
                Staff taps "Close"
                POST /prm/_close (implied via CloseChatConversation)
                        │
                        ▼
               ┌──────────────────┐
               │     CLOSED        │
               │                  │
               │  Visible in ALL  │
               │  tab only        │
               │  Text input OFF  │
               │  Read-only view  │
               └──────────────────┘
                        │
                Patient sends new
                message after close
                        │
                        ▼
               ┌──────────────────┐
               │  NEW UNASSIGNED   │  (completely new conversation,
               │  CONVERSATION     │   new conversationId, may reuse threadId)
               └──────────────────┘
```

### 5.2 Status Rules

| Status | Visible in ALL? | Visible in MY? | Text Input | Actions Available |
|---|---|---|---|---|
| UNASSIGNED | Yes | No | Disabled | Assign to Self |
| ACTIVE | Yes | Yes (owner only) | Enabled | Send, Delegate, Reassign, Close |
| CLOSED | Yes | No | Disabled | View only (read-only) |

### 5.3 Conversation vs. Thread

Two concepts that are easy to confuse:

- **conversationId**: The PRM backend's identifier. Tracks lifecycle (UNASSIGNED → ACTIVE → CLOSED). One conversation = one lifecycle.
- **threadId**: The ACS identifier. Represents the actual chat channel. A thread can outlive a conversation -- when a patient messages after close, a new conversationId is created but the threadId may be reused.

Both IDs are needed for most operations. The BLoC event `FetchChatDataToView` takes both.

---

## 6. Send Message Flow

### 6.1 Text Message -- Step by Step

```
Step 1: User types message and taps Send
        ──────────────────────────────────
        → UI validates: message is not empty, conversation status is ACTIVE
        → UI dispatches: SendChatMessage(
              threadId: "19:abc123...",
              content: "Yes, take it with food. Avoid dairy for 30 min.",
              metadata: { "senderName": "Dr. Reddy", "senderId": "user-456" }
          )

Step 2: BLoC receives SendChatMessage event
        ──────────────────────────────────────
        → Emits: SendMessageLoadingState
        → Calls: PRM API POST /prm/_send/message
          Request body:
          {
              "threadId": "19:abc123...",
              "content": "Yes, take it with food. Avoid dairy for 30 min.",
              "metadata": {
                  "senderName": "Dr. Reddy",
                  "senderId": "user-456"
              }
          }

Step 3: PRM backend processes
        ──────────────────────
        → PRM validates sender is ACTIVE participant in conversation
        → PRM calls ACS API to send the message into the thread
        → ACS delivers the message to all thread participants
        → PRM returns response: { "messageId": "msg-789" }

Step 4: BLoC receives success response
        ────────────────────────────────
        → Emits: SendMessageSuccessState(messageId: "msg-789")
        → UI clears the text input field

Step 5: Message appears in chat (via ACS real-time, NOT via send response)
        ──────────────────────────────────────────────────────────────────
        → ACS fires CHAT_MESSAGE_RECEIVED event in native plugin
        → Event channel streams it to Flutter as chatType "ACTIVE"
        → Message is checked against ObjectBox (dedup via messageId)
        → If new: saved to ObjectBox, appended to message list, UI rebuilds
        → See Section 8 for full receive flow

Step 6: Error case
        ──────────
        → If API returns error: BLoC emits SendMessageErrorState(message)
        → UI shows snackbar: "Failed to send message. Please try again."
        → Text field retains the message (user does not lose their draft)
```

**Critical detail:** The sent message does NOT appear in the chat via the send response. It appears via the ACS real-time event channel. This means there is a brief delay between tapping Send and seeing the message appear. The UI should show `SendMessageLoadingState` (e.g., a small spinner on the send button) during this window.

### 6.2 Send Flow Sequence Diagram

```
  Flutter UI          ChatAssistantBloc         PRM API            ACS Cloud          Native Plugin
      │                      │                     │                   │                    │
      │ SendChatMessage      │                     │                   │                    │
      │─────────────────────>│                     │                   │                    │
      │                      │ POST /prm/_send/    │                   │                    │
      │                      │ message             │                   │                    │
      │                      │────────────────────>│                   │                    │
      │                      │                     │  send to ACS      │                    │
      │                      │                     │──────────────────>│                    │
      │                      │                     │                   │                    │
      │                      │    200 { messageId }│                   │                    │
      │                      │<────────────────────│                   │                    │
      │ SendMessageSuccess   │                     │                   │                    │
      │<─────────────────────│                     │                   │                    │
      │                      │                     │                   │                    │
      │                      │                     │                   │ CHAT_MESSAGE_      │
      │                      │                     │                   │ RECEIVED           │
      │                      │                     │                   │───────────────────>│
      │                      │                     │                   │                    │
      │                      │                     │      Event Channel (chatType: ACTIVE)  │
      │<─────────────────────┼─────────────────────┼───────────────────┼────────────────────│
      │                      │                     │                   │                    │
      │ dedup + save to      │                     │                   │                    │
      │ ObjectBox + render   │                     │                   │                    │
```

---

## 7. File Attachment Flow

### 7.1 Upload Flow (Send Attachment)

```
Step 1: User taps attachment button (📎)
        ──────────────────────────────────
        → File picker opens (image, PDF, audio, generic file)
        → User selects a file
        → Preview shown (image thumbnail, file name, size)

Step 2: User confirms send
        ───────────────────
        → UI creates multipart/form-data request
        → API call: POST /prm/_send/attachment
          Multipart body:
          {
              "file": <binary file data>,
              "threadId": "19:abc123...",
              "metadata": {
                  "senderName": "Dr. Reddy",
                  "senderId": "user-456",
                  "fileName": "prescription_scan.pdf",
                  "fileType": "application/pdf"
              }
          }

Step 3: PRM backend processes
        ──────────────────────
        → PRM uploads file to DMS (POST /dms/api/document-records/upload)
        → DMS returns: { documentId, downloadUrl }
        → PRM creates message in ACS thread with attachment metadata
        → PRM returns: { messageId, attachmentId, fileUrl }

Step 4: Success
        ───────
        → Attachment message appears in chat (via ACS real-time event)
        → Message type detected as "image", "audio", "pdf", or "document"
          based on MIME type of the attachment

Step 5: Error
        ─────
        → UI shows: "Unable to upload file. Please try again."
        → File selection is cleared
```

### 7.2 Download Flow (Receive Attachment)

```
Step 1: Message with attachment rendered in chat
        ──────────────────────────────────────────
        → Detection logic (Section 10) identifies type from MIME:
          image/* → image thumbnail
          audio/* → audio player
          application/pdf → PDF icon + filename
          everything else → generic file icon + filename

Step 2: User taps attachment (or auto-download for images)
        ──────────────────────────────────────────────────
        → Check L3 cache (filesystem): is attachmentLocalPath set in ObjectBox?
          ├── YES → Load from local file, skip download
          └── NO  → Proceed to download

Step 3: Download from server
        ────────────────────
        → API call: GET /prm/_download/attachments?attachmentId=ATT-123&threadId=19:abc123
        → Response: binary file data
        → Save to device filesystem (L3 cache)
        → Update ObjectBox record: set attachmentLocalPath to saved file path

Step 4: Display
        ───────
        → Image: render inline thumbnail, tap opens full-screen viewer
        → Audio: render AudioPlayerWidget with play/pause + progress bar
        → PDF: render icon + filename, tap opens external PDF viewer
        → Document: render icon + filename, tap opens with system handler
```

### 7.3 Caching Strategy for Attachments

```
4-LAYER CACHE HIERARCHY
════════════════════════

L0: MemoryCache (Dart in-process maps)
    ├── Holds recently accessed data in memory
    ├── Lost on app restart
    └── Used for: conversation list data, message metadata

L1: ImageCache (Flutter framework)
    ├── Flutter's built-in image caching (ImageProvider/ImageCache)
    ├── Holds decoded image widgets
    └── Used for: image thumbnails already displayed in current session

L2: ObjectBox (structured database)
    ├── StoreChatDataModel entities
    ├── Indexed on messageId, threadId, chatConversationId, timestamp
    ├── Stores metadata + attachmentLocalPath (pointer to L3)
    └── Used for: message history, offline message viewing

L3: Filesystem (raw binary files)
    ├── Downloaded attachments saved as files on device storage
    ├── Referenced by ObjectBox attachmentLocalPath field
    ├── Survives app restarts
    └── Used for: offline attachment viewing, avoiding re-downloads

Lookup order: L0 → L1 → L2 → L3 → Network
```

---

## 8. Receive Message Flow

### 8.1 Real-Time Pipeline (End to End)

This is the most complex flow in the system. A message sent by a patient traverses 6 layers before appearing on a staff member's screen.

```
Step 1: Patient sends message via their portal
        ────────────────────────────────────────
        → Patient's app/web portal calls ACS API to send message to thread

Step 2: ACS cloud processes and broadcasts
        ────────────────────────────────────
        → ACS stores message
        → ACS pushes real-time event to all connected participants

Step 3: Native ACS SDK receives event
        ──────────────────────────────
        → ChatAsyncClient's registered event handler fires
        → Event type: ChatMessageReceivedEvent

Step 4: ACSCommunication.java processes event
        ──────────────────────────────────────
        → Cast sender to CommunicationUserIdentifier
        → Extract: senderId, messageId, content, type, createdOn, senderDisplayName
        → Filter: only process TEXT and HTML types (ignore system messages)
        → Wrap in ChatMessageReceived → ChatMessageDTO
        → Serialize to JSON via Gson
        → Set chatType = "ACTIVE"
        → Post to UI thread: Handler(Looper.getMainLooper()).post { eventSink.success(json) }

Step 5: Flutter receives via Event Channel
        ────────────────────────────────────
        → EventChannel("flutter_acs_event_channel_stream") fires
        → JSON decoded: check chatType field
        → chatType "ACTIVE" → this is a real-time message

Step 6: BLoC/Handler processes message
        ────────────────────────────────
        → Parse ChatMessageReceived from JSON payload
        → Check ObjectBox: isMessagePresent(messageId)?
          ├── YES → duplicate, skip (message already cached from history fetch)
          └── NO  → proceed
        → Save to ObjectBox via addMessage()
        → Map to UI model (determine message type via detection logic in Section 10)
        → Add to message list (in-memory)
        → Rebuild UI → new message appears at bottom of chat
        → Auto-scroll to bottom
```

### 8.2 Three Chat Types Explained

```
chatType: "ACTIVE"
──────────────────
When: Real-time incoming message (someone sent something RIGHT NOW)
Source: ACS event handler (CHAT_MESSAGE_RECEIVED or CHAT_MESSAGE_DELETED)
Contains: Single message
Processing: Dedup check → save to ObjectBox → append to UI list

chatType: "ACTIVE_HISTORY"
──────────────────────────
When: User opens a chat thread, all existing messages are fetched
Source: allMessages(threadId) method call
Contains: Array of all messages in thread
Processing: Batch dedup → save new ones to ObjectBox → render full chat

chatType: "HISTORY"
───────────────────
When: User scrolls up to load older messages
Source: getAllHistoryMessages(threadId, page, startTime) method call
Contains: Paginated batch of older messages
Processing: Batch dedup → save new ones to ObjectBox → prepend to top of list
```

### 8.3 Delete Message Real-Time Flow

```
Step 1: Someone deletes a message (via their client)
        → ACS fires CHAT_MESSAGE_DELETED event

Step 2: Native handler extracts: messageId, deletedOn
        → Wraps in ChatMessageDeleted → ChatMessageDTO
        → chatType = "ACTIVE"

Step 3: Flutter receives delete event
        → Finds message in ObjectBox by messageId
        → Soft-delete: sets isDeleted=true, deletedAt=now
        → UI rebuilds: message bubble replaced with "This message has been deleted"
```

---

## 9. Delegation & Assignment

### 9.1 Three Assignment Types

All three types use the same BLoC event (`AssignChatConversation`) but with different `assignType` values and hit different API endpoints.

```
ASSIGNMENT TYPE MATRIX
══════════════════════

Type       │ assignType   │ Who Can Do It     │ API Endpoint        │ What Happens
───────────┼──────────────┼───────────────────┼─────────────────────┼─────────────────────
ASSIGN     │ "ASSIGN"     │ Any staff member  │ POST /prm/_assign   │ UNASSIGNED → ACTIVE
           │              │                   │                     │ Appears in MY queue
───────────┼──────────────┼───────────────────┼─────────────────────┼─────────────────────
DELEGATE   │ "DELEGATE"   │ Current owner     │ POST /prm/_delegate │ Moves to target's
           │              │ of conversation   │                     │ MY queue. System msg
           │              │                   │                     │ injected.
───────────┼──────────────┼───────────────────┼─────────────────────┼─────────────────────
REASSIGN   │ "REASSIGN"   │ Supervisor only   │ POST /prm/_reassign │ Same as DELEGATE but
           │              │                   │                     │ done by supervisor
```

### 9.2 Assign Flow (Claim Unassigned Conversation)

```
Step 1: Staff member is on ALL tab, sees UNASSIGNED conversation
        → Taps conversation card → opens ChatScreen

Step 2: ChatScreen shows "Assign to Self" button (because status = UNASSIGNED)
        → Text input is disabled

Step 3: Staff taps "Assign to Self"
        → Dispatches: AssignChatConversation(
              conversationId: "conv-123",
              threadId: "19:abc123...",
              targetUserId: currentUser.id,
              assignType: "ASSIGN",
              reason: null
          )

Step 4: BLoC emits AssignLoadingState

Step 5: API call: POST /prm/_assign
        Request body:
        {
            "conversationId": "conv-123",
            "threadId": "19:abc123...",
            "targetUserId": "user-456",
            "assignType": "ASSIGN"
        }

Step 6: Success response
        → BLoC emits AssignSuccessState(conversation: updated, assignType: "ASSIGN")
        → Conversation status changes to ACTIVE
        → Text input becomes enabled
        → Conversation now appears in staff's MY tab
        → System message injected: "Conversation assigned to Dr. Reddy on 22 Apr 2026"
```

### 9.3 Delegate Flow (Transfer to Another Staff Member)

```
Step 1: Current owner is in an ACTIVE conversation
        → Taps "Delegate" button in app bar

Step 2: Delegate dialog opens
        → Staff searches for target user by name
        → Selects target user from results
        → Optionally enters reason: "Patient needs cardiology specialist"

Step 3: Staff taps "Delegate" in dialog
        → Dispatches: AssignChatConversation(
              conversationId: "conv-123",
              threadId: "19:abc123...",
              targetUserId: "user-789",   ← target staff member
              assignType: "DELEGATE",
              reason: "Patient needs cardiology specialist"
          )

Step 4: BLoC emits DelegateLoadingState

Step 5: API call: POST /prm/_delegate
        Request body:
        {
            "conversationId": "conv-123",
            "threadId": "19:abc123...",
            "targetUserId": "user-789",
            "assignType": "DELEGATE",
            "reason": "Patient needs cardiology specialist"
        }

Step 6: Success response
        → BLoC emits DelegateSuccessState(conversation: updated)
        → Conversation moves from current owner's MY queue to target's MY queue
        → System message injected into chat:
          "Conversation delegated to Dr. Anand by Dr. Reddy.
           Reason: Patient needs cardiology specialist"
        → Original owner can still see the conversation in ALL tab
        → Current owner's ChatScreen navigates back to conversation list
```

### 9.4 Reassign Flow (Supervisor Override)

Identical to Delegate in terms of UI flow, but:
- Only supervisors can perform this action (enforced server-side)
- Uses POST /prm/_reassign endpoint
- Reuses `DelegateLoadingState` / `DelegateSuccessState` (no separate states)
- System message says "Conversation reassigned to..." instead of "delegated to..."

---

## 10. Message Types

### 10.1 The 8 Message Types

```
MESSAGE TYPE REGISTRY
═════════════════════

 #  │ Type       │ Rendering                           │ Widget
────┼────────────┼─────────────────────────────────────┼──────────────────────
  1 │ text       │ Standard chat bubble with text       │ Text bubble widget
  2 │ attachment │ File icon + filename + "Download"    │ ChatAttachmentWidget
  3 │ audio      │ Inline player: ▶ progress bar 0:12  │ AudioPlayerWidget
  4 │ pdf        │ PDF icon + filename + "Download"     │ ChatAttachmentWidget
  5 │ image      │ Inline thumbnail, tap → fullscreen   │ Image widget + viewer
  6 │ system     │ Centered gray text, no bubble        │ System message widget
  7 │ deleted    │ "This message has been deleted"       │ Deleted message widget
  8 │ delegated  │ System message with action details   │ System message widget
```

### 10.2 Detection Logic (Priority Order)

Message type detection follows a strict priority waterfall. This order matters -- a deleted message with an image attachment should show "deleted", not the image thumbnail.

```
DETECTION WATERFALL
═══════════════════

Given a message record, determine its display type:

    ┌─── Is isDeleted == true?
    │       └── YES → type = "deleted"
    │              → render: "This message has been deleted"
    │              → STOP
    │
    ├─── Is it a system message? (content matches system patterns)
    │       └── YES → type = "system" or "delegated"
    │              → "delegated" if content contains delegation info
    │              → "system" for generic system messages
    │              → render: centered gray text
    │              → STOP
    │
    ├─── Does it have a MIME type? Check attachment metadata:
    │       │
    │       ├── MIME starts with "image/*"
    │       │       → type = "image"
    │       │       → render: inline thumbnail
    │       │       → STOP
    │       │
    │       ├── MIME starts with "audio/*"
    │       │       → type = "audio"
    │       │       → render: AudioPlayerWidget
    │       │       → STOP
    │       │
    │       ├── MIME is "application/pdf"
    │       │       → type = "pdf"
    │       │       → render: ChatAttachmentWidget with PDF icon
    │       │       → STOP
    │       │
    │       └── Any other MIME type
    │               → type = "attachment"
    │               → render: ChatAttachmentWidget with generic file icon
    │               → STOP
    │
    └─── Default: no special conditions met
            → type = "text"
            → render: standard text bubble
            → STOP
```

**In pseudocode:**

```dart
String detectMessageType(StoreChatDataModel msg) {
  if (msg.isDeleted) return "deleted";
  if (isSystemMessage(msg)) return isDelegation(msg) ? "delegated" : "system";
  if (msg.messageType == "image" || mimeStartsWith(msg, "image/")) return "image";
  if (msg.messageType == "audio" || mimeStartsWith(msg, "audio/")) return "audio";
  if (msg.messageType == "document" && isPdf(msg)) return "pdf";
  if (msg.attachmentUrl != null) return "attachment";
  return "text";
}
```

### 10.3 Rendering Details

**Text messages:**
- Left-aligned bubble: patient (based on senderId != currentUserId)
- Right-aligned bubble: current staff member
- Timestamp below bubble
- Long-press context menu: Copy, Delete (if own message)

**Image messages:**
- Inline thumbnail (cached via L1 ImageCache)
- Tap opens full-screen image viewer with pinch-to-zoom
- Download indicator while fetching from network
- Falls back to placeholder icon if download fails

**Audio messages (AudioPlayerWidget):**
- Play/pause toggle button
- Progress bar showing current position
- Duration label (e.g., "0:12")
- `isVoiceMessage` flag distinguishes voice recordings from audio files
- Audio data from `voiceUrl` (network) or `attachmentLocalPath` (L3 cache)

**PDF and generic attachment (ChatAttachmentWidget):**
- Icon (PDF icon for PDFs, generic file icon for others)
- Filename text
- "Download" action / tap to open
- Download status indicator

**System messages:**
- No bubble, centered in chat
- Gray text, smaller font
- Content: "Conversation assigned to...", "Conversation closed", etc.

**Deleted messages:**
- Italic text: "This message has been deleted"
- No bubble decoration or reduced opacity
- Original content is NOT shown

**Delegated messages:**
- System message subtype
- Shows: "Conversation delegated to [name] by [name]. Reason: [reason]"

---

## 11. ObjectBox Storage

### 11.1 Entity Schema

```
OBJECTBOX ENTITY: StoreChatDataModel
═════════════════════════════════════

Field                 │ Type    │ Index?   │ Notes
──────────────────────┼─────────┼──────────┼────────────────────────────────────
id                    │ int     │ AUTO     │ ObjectBox auto-increment primary key
messageId             │ String  │ UNIQUE   │ ACS message ID. Used for dedup.
threadId              │ String  │ YES      │ ACS thread ID. Query key.
chatConversationId    │ String  │ YES      │ PRM conversation ID.
senderId              │ String  │ NO       │ ACS user identifier.
messageText           │ String  │ NO       │ Raw message content.
messageType           │ String  │ NO       │ "text" | "image" | "audio" | "document"
isVoiceMessage        │ bool    │ NO       │ True for voice recordings.
attachmentLocalPath   │ String? │ NO       │ L3 cache: local file path.
attachmentUrl         │ String? │ NO       │ Remote download URL.
voiceUrl              │ String? │ NO       │ Remote voice message URL.
timestamp             │ int     │ YES      │ Unix milliseconds. Sort key.
isDeleted             │ bool    │ NO       │ Soft-delete flag.
deletedAt             │ int?    │ NO       │ When soft-deleted (Unix ms).
conversationStatus    │ String  │ NO       │ "UNASSIGNED"|"ACTIVE"|"CLOSED"
senderDisplayName     │ String  │ NO       │ Human-readable sender name.
```

### 11.2 Seven Database Operations

```
ChatHistoryDbManager OPERATIONS
════════════════════════════════

1. addMessage(StoreChatDataModel)
   ──────────────────────────────
   Purpose: Insert a new message into ObjectBox
   Guard:   Check isMessagePresent(messageId) FIRST
            If duplicate → skip insert, return existing record
   Why:     ACS may deliver the same message via real-time AND history fetch.
            Without this guard, duplicates appear in the chat.

2. getMessagesByThreadId(threadId) → List<StoreChatDataModel>
   ──────────────────────────────────────────────────────────
   Purpose: Load all messages for a chat thread
   Query:   WHERE threadId == $threadId
            AND isDeleted == false
            ORDER BY timestamp ASC
   Used by: ChatScreen initial load, refresh after reconnect

3. getLatestMessageIdByThreadId(threadId) → String?
   ──────────────────────────────────────────────────
   Purpose: Get the most recent messageId for sync cursor
   Query:   WHERE threadId == $threadId
            ORDER BY timestamp DESC
            LIMIT 1
   Used by: Sync on reconnect -- "give me everything after this message"

4. isMessagePresent(messageId) → bool
   ──────────────────────────────────
   Purpose: Check if a message already exists (dedup guard)
   Query:   WHERE messageId == $messageId
            COUNT > 0
   Used by: addMessage() guard, real-time receive handler

5. updateMessage(StoreChatDataModel)
   ─────────────────────────────────
   Purpose: Update an existing record by ObjectBox id
   Used by: Setting attachmentLocalPath after download,
            updating conversationStatus

6. deleteMessage(messageId)
   ────────────────────────
   Purpose: Soft-delete a message
   Behavior: SET isDeleted = true, deletedAt = DateTime.now().millisecondsSinceEpoch
   NOT:      Does NOT physically remove the record
   Used by:  CHAT_MESSAGE_DELETED real-time event handler

7. deleteOldMessages(cutoffTimestamp)
   ──────────────────────────────────
   Purpose: Hard-delete old messages to manage storage
   Query:   WHERE timestamp < $cutoffTimestamp
   Behavior:
     a) Find all matching records
     b) For each: if attachmentLocalPath != null → delete file from filesystem (L3 cleanup)
     c) Physically remove ObjectBox records
   Used by:  Scheduled maintenance (e.g., delete messages older than 30 days)
   Important: This is the ONLY operation that physically removes records.
              It cascades to L3 filesystem cleanup.
```

### 11.3 Indexing Strategy

```
INDEX USAGE MAP
═══════════════

Index on messageId (UNIQUE):
  → isMessagePresent() - O(1) lookup for dedup
  → addMessage() - duplicate check before insert

Index on threadId:
  → getMessagesByThreadId() - primary query for loading a chat
  → getLatestMessageIdByThreadId() - sync cursor lookup

Index on chatConversationId:
  → Query messages by PRM conversation (less frequent)

Index on timestamp:
  → ORDER BY in getMessagesByThreadId() - chronological display
  → WHERE clause in deleteOldMessages() - cleanup by age
```

---

## 12. Offline Behavior & Sync

### 12.1 What Works Offline

```
OFFLINE CAPABILITY MATRIX
═════════════════════════

Feature                        │ Works Offline? │ How
───────────────────────────────┼────────────────┼──────────────────────────────
View cached messages           │ ✅ YES          │ ObjectBox (L2) query
View cached image attachments  │ ✅ YES          │ Filesystem (L3) + ImageCache (L1)
View cached audio attachments  │ ✅ YES          │ Filesystem (L3)
View cached PDF/doc files      │ ✅ YES          │ Filesystem (L3)
Send text message              │ ❌ NO           │ Requires PRM API
Send attachment                │ ❌ NO           │ Requires PRM + DMS API
Receive real-time messages     │ ❌ NO           │ Requires ACS connection
Load conversation list         │ ❌ NO           │ Requires PRM API
Assign/Delegate/Reassign       │ ❌ NO           │ Requires PRM API
Close conversation             │ ❌ NO           │ Requires PRM API
Download new attachments       │ ❌ NO           │ Requires DMS API
```

**Key decision: No offline send queue.** The app does not buffer outgoing messages for later delivery. If the network is down, the send fails immediately. This is a deliberate choice -- in a medical context, delayed message delivery could be dangerous (e.g., medication instructions arriving hours late without the staff member knowing).

### 12.2 Reconnection Sync Flow

```
Step 1: App detects network restored (or comes to foreground)
        ──────────────────────────────────────────────────────

Step 2: For each active thread, get sync cursor
        ─────────────────────────────────────────
        → latestMessageId = ChatHistoryDbManager.getLatestMessageIdByThreadId(threadId)

Step 3: Fetch new messages from server
        ────────────────────────────────
        → Call ACS (via native plugin) or PRM API with cursor
        → GET /prm/_read/messages?threadId=...&before=<latestMessageId>
        → Returns messages newer than the cursor

Step 4: Deduplicate and merge
        ──────────────────────
        → For each received message:
          → isMessagePresent(messageId)?
            ├── YES → skip
            └── NO  → addMessage() to ObjectBox

Step 5: Rebuild UI
        ──────────
        → getMessagesByThreadId() returns complete sorted list
        → UI rebuilds with all messages including newly synced ones
```

### 12.3 Cursor-Based Pagination

The message fetch API uses cursor-based pagination, not page numbers:

```
GET /prm/_read/messages?threadId=19:abc123&before=msg-500

Returns: messages with IDs BEFORE msg-500 (older messages)

First call:  before = null → returns most recent messages
Next call:   before = oldest messageId from previous result
Continue:    until response returns empty array (no more history)
```

---

## 13. Complete API Reference

### 13.1 PRM Service Endpoints (/prm/api/)

```
ENDPOINT 1: GET /prm/chat-conversations/user/chats
═══════════════════════════════════════════════════
Purpose: Fetch MY conversations (assigned to current user)
Auth:    Bearer token
Query:   ?page=0&size=20
Response:
{
    "content": [
        {
            "conversationId": "conv-123",
            "threadId": "19:abc123...",
            "patientName": "Rajesh Kumar",
            "patientUhid": "NH-HYD-2026-1234",
            "status": "ACTIVE",
            "assignedTo": "user-456",
            "assignedToName": "Dr. Reddy",
            "lastMessage": "Can I take my medication with food?",
            "lastMessageTime": "2026-04-22T10:30:00",
            "unreadCount": 3
        },
        ...
    ],
    "totalElements": 5,
    "totalPages": 1,
    "pageNumber": 0,
    "pageSize": 20
}
BLoC Event: FetchMyConversation(page, size)


ENDPOINT 2: POST /prm/_search/user/all-chat-conversation
═════════════════════════════════════════════════════════
Purpose: Search/filter ALL conversations
Auth:    Bearer token
Request:
{
    "page": 0,
    "size": 20,
    "searchText": "Rajesh",        // optional - patient name/UHID search
    "status": "UNASSIGNED"          // optional - filter by status
}
Response: Same structure as Endpoint 1 but includes ALL conversations
BLoC Event: FetchAllConversation(page, size, searchText?, status?)


ENDPOINT 3: POST /prm/_send/message
════════════════════════════════════
Purpose: Send a text message
Auth:    Bearer token
Request:
{
    "threadId": "19:abc123...",
    "content": "Yes, take it with food.",
    "metadata": {
        "senderName": "Dr. Reddy",
        "senderId": "user-456"
    }
}
Response:
{
    "messageId": "msg-789",
    "status": "SENT"
}
BLoC Event: SendChatMessage(threadId, content, metadata)


ENDPOINT 4: POST /prm/_send/attachment
══════════════════════════════════════
Purpose: Send a file attachment
Auth:    Bearer token
Content-Type: multipart/form-data
Fields:
  - file: binary file data
  - threadId: "19:abc123..."
  - metadata: JSON string with senderName, senderId, fileName, fileType
Response:
{
    "messageId": "msg-790",
    "attachmentId": "ATT-123",
    "fileUrl": "https://dms.example.com/files/ATT-123"
}
BLoC Event: (handled via send flow, not a separate BLoC event)


ENDPOINT 5: GET /prm/_read/messages
════════════════════════════════════
Purpose: Fetch messages for a thread (cursor-based pagination)
Auth:    Bearer token
Query:   ?threadId=19:abc123&before=msg-500
         "before" is the cursor — returns messages older than this ID
         Omit "before" for most recent messages
Response:
{
    "messages": [
        {
            "messageId": "msg-499",
            "threadId": "19:abc123...",
            "senderId": "user-456",
            "senderDisplayName": "Dr. Reddy",
            "content": "Take medication with food.",
            "messageType": "text",
            "createdOn": "2026-04-22T10:32:00",
            "isDeleted": false,
            "attachmentUrl": null,
            "metadata": { ... }
        },
        ...
    ]
}
BLoC Event: FetchChatDataToView(threadId, conversationId)


ENDPOINT 6: GET /prm/_download/attachments
══════════════════════════════════════════
Purpose: Download attachment binary
Auth:    Bearer token
Query:   ?attachmentId=ATT-123&threadId=19:abc123
Response: Binary file data (Content-Type matches file MIME type)
Note:    Response is raw bytes, not JSON. Save directly to filesystem.


ENDPOINT 7: DELETE /prm/_delete/message
═══════════════════════════════════════
Purpose: Delete a message
Auth:    Bearer token
Query:   ?messageId=msg-789&threadId=19:abc123
Response:
{
    "status": "DELETED",
    "messageId": "msg-789"
}
BLoC Event: DeleteChatMessage(messageId, threadId)
Note:    This triggers ACS CHAT_MESSAGE_DELETED event to all participants


ENDPOINT 8: POST /prm/_assign
═════════════════════════════
Purpose: Assign an unassigned conversation to a staff member
Auth:    Bearer token
Request:
{
    "conversationId": "conv-123",
    "threadId": "19:abc123...",
    "targetUserId": "user-456",
    "assignType": "ASSIGN"
}
Response:
{
    "conversationId": "conv-123",
    "status": "ACTIVE",
    "assignedTo": "user-456",
    "assignedToName": "Dr. Reddy"
}
BLoC Event: AssignChatConversation(... assignType: "ASSIGN")


ENDPOINT 9: POST /prm/_delegate
═══════════════════════════════
Purpose: Delegate conversation from current owner to another staff member
Auth:    Bearer token
Request:
{
    "conversationId": "conv-123",
    "threadId": "19:abc123...",
    "targetUserId": "user-789",
    "assignType": "DELEGATE",
    "reason": "Patient needs specialist opinion"
}
Response:
{
    "conversationId": "conv-123",
    "status": "ACTIVE",
    "assignedTo": "user-789",
    "assignedToName": "Dr. Anand"
}
BLoC Event: AssignChatConversation(... assignType: "DELEGATE")


ENDPOINT 10: POST /prm/_reassign
════════════════════════════════
Purpose: Supervisor reassigns conversation to a different staff member
Auth:    Bearer token
Request: Same as Endpoint 9 but with assignType: "REASSIGN"
Response: Same as Endpoint 9
BLoC Event: AssignChatConversation(... assignType: "REASSIGN")


ENDPOINT 11: GET /prm/_user/participant-info
════════════════════════════════════════════
Purpose: Get participant details for a conversation
Auth:    Bearer token
Query:   ?conversationId=conv-123
Response:
{
    "participants": [
        {
            "userId": "user-456",
            "displayName": "Dr. Reddy",
            "role": "STAFF"
        },
        {
            "userId": "patient-001",
            "displayName": "Rajesh Kumar",
            "role": "PATIENT"
        }
    ]
}
```

### 13.2 DMS Endpoints (/dms/api/)

```
ENDPOINT: POST /dms/api/document-records/upload
═══════════════════════════════════════════════
Purpose: Upload file to document management system
Auth:    Bearer token
Content-Type: multipart/form-data
Fields:  file (binary), metadata (JSON)
Response:
{
    "documentId": "DOC-456",
    "downloadUrl": "https://dms.example.com/download/DOC-456"
}
Note: Called by PRM backend during attachment send, NOT directly by app.


ENDPOINT: GET /dms/api/document-records/download
════════════════════════════════════════════════
Purpose: Download file from DMS
Auth:    Bearer token
Query:   ?documentId=DOC-456
Response: Binary file data
Note: May be called directly by app for some attachment types.
```

---

## 14. Notification Integration

### 14.1 FCM Registration

```
Step 1: After login, app registers FCM token with backend
        → POST /com/api/_store/fcm-user-token
        → Body: { "userId": "user-456", "fcmToken": "dXyz..." }

Step 2: Backend stores token mapping: userId → fcmToken

Step 3: When a new message arrives for a user who is NOT in the chat:
        → ACS notifies PRM backend
        → PRM looks up FCM token for target userId
        → PRM sends push notification via Firebase
```

### 14.2 Deep Link from Notification

```
User taps notification
    │
    ▼
App opens (or comes to foreground)
    │
    ▼
Notification payload parsed:
{
    "threadId": "19:abc123...",
    "conversationId": "conv-123",
    "type": "CHAT_MESSAGE"
}
    │
    ▼
Navigation: route directly to ChatScreen
    → Dispatches: FetchChatDataToView(threadId: "19:abc123", conversationId: "conv-123")
    → If ACS connection is stale: resubscribeToACS(threadId) with fresh token
```

### 14.3 Unread Count Tracking

```
- Each conversation has an unreadCount field from the API
- Badge shown on conversation card in the list
- Real-time updates via ACS: when a new message arrives for a thread
  the app is subscribed to, the count increments locally
- Count resets when user opens the specific chat thread
- Summary counts fetched via: FetchUserChatConversationSummary(userId)
```

---

## 15. Error Handling Matrix

### 15.1 User-Facing Errors (12 Messages)

```
ERROR HANDLING MATRIX
═════════════════════

 #  │ Scenario                        │ User-Facing Message                                │ Recovery Action
────┼─────────────────────────────────┼────────────────────────────────────────────────────┼─────────────────────
  1 │ Send to closed conversation     │ "This conversation has been closed. You cannot     │ Navigate back to
    │                                 │  send messages."                                   │ conversation list
────┼─────────────────────────────────┼────────────────────────────────────────────────────┼─────────────────────
  2 │ Deleted/invalid interaction     │ "This interaction has been deleted or is no         │ Navigate back,
    │                                 │  longer available."                                │ refresh list
────┼─────────────────────────────────┼────────────────────────────────────────────────────┼─────────────────────
  3 │ Delegation success              │ "Conversation delegated successfully."              │ (info, not error)
    │                                 │                                                    │ Navigate to list
────┼─────────────────────────────────┼────────────────────────────────────────────────────┼─────────────────────
  4 │ Send message failure            │ "Failed to send message. Please try again."         │ Retain draft text,
    │                                 │                                                    │ user can retry
────┼─────────────────────────────────┼────────────────────────────────────────────────────┼─────────────────────
  5 │ Load messages failure           │ "Unable to load messages. Pull down to refresh."    │ Pull-to-refresh
    │                                 │                                                    │ or back + re-enter
────┼─────────────────────────────────┼────────────────────────────────────────────────────┼─────────────────────
  6 │ Assign failure                  │ "Unable to assign conversation. Please try again."  │ Retry button
────┼─────────────────────────────────┼────────────────────────────────────────────────────┼─────────────────────
  7 │ Delegate failure                │ "Unable to delegate conversation. Please try        │ Retry from dialog
    │                                 │  again."                                           │
────┼─────────────────────────────────┼────────────────────────────────────────────────────┼─────────────────────
  8 │ Close failure                   │ "Unable to close conversation. Please try again."   │ Retry button
────┼─────────────────────────────────┼────────────────────────────────────────────────────┼─────────────────────
  9 │ Upload attachment failure       │ "Unable to upload file. Please try again."          │ File picker reset,
    │                                 │                                                    │ user can retry
────┼─────────────────────────────────┼────────────────────────────────────────────────────┼─────────────────────
 10 │ Download attachment failure     │ "Unable to download file. Tap to retry."            │ Tap attachment to
    │                                 │                                                    │ retry download
────┼─────────────────────────────────┼────────────────────────────────────────────────────┼─────────────────────
 11 │ Empty conversation list         │ "No conversations found."                           │ Check filters,
    │                                 │                                                    │ pull to refresh
────┼─────────────────────────────────┼────────────────────────────────────────────────────┼─────────────────────
 12 │ Connection lost                 │ "Connection lost. Messages will load when            │ Automatic retry
    │                                 │  connection is restored."                           │ on reconnect
```

### 15.2 ObjectBox Internal Errors (10 Types)

These are logged internally and NOT shown to the user:

```
INTERNAL ERROR LOG CATEGORIES
═════════════════════════════

 #  │ Error                          │ Logging Level │ Notes
────┼────────────────────────────────┼───────────────┼────────────────────────────
  1 │ ObjectBox put failure          │ ERROR         │ Disk full, schema mismatch
  2 │ ObjectBox query failure        │ ERROR         │ Invalid query construction
  3 │ Duplicate messageId insert     │ WARNING       │ Expected during dedup
  4 │ File delete failure (L3)       │ WARNING       │ File already deleted or locked
  5 │ ACS event parse failure        │ ERROR         │ Malformed JSON from native
  6 │ ACS connection failure         │ ERROR         │ Token expired or network issue
  7 │ Event channel stream error     │ ERROR         │ Native plugin crash
  8 │ Message type detection failure │ WARNING       │ Unknown MIME, defaults to text
  9 │ Timestamp parse failure        │ WARNING       │ Invalid date format from ACS
 10 │ ObjectBox store open failure   │ CRITICAL      │ App cannot function, restart
```

---

## 16. Edge Cases

### 16.1 Race Conditions

```
EDGE CASE 1: Duplicate Message via ACS + History
─────────────────────────────────────────────────
Scenario:  User opens chat. allMessages() fetches history. While loading,
           ACS fires CHAT_MESSAGE_RECEIVED for a message that's also in history.
Guard:     isMessagePresent(messageId) check before every addMessage() call.
Result:    Second insert is silently skipped. No duplicate in UI.


EDGE CASE 2: Token Expiry Mid-Conversation
───────────────────────────────────────────
Scenario:  User is chatting. ACS token expires. Real-time events stop.
Detection: ACS SDK fires error. Native plugin catches it.
Recovery:  Call resubscribeToACS(endPoint, newToken, threadId).
           This tears down the old connection and builds a new one.
           Sync flow runs to catch missed messages.


EDGE CASE 3: Two Staff Members Assign Same Conversation
───────────────────────────────────────────────────────
Scenario:  Conversation is UNASSIGNED. Two staff members tap "Assign to Self"
           nearly simultaneously.
Guard:     Server-side: POST /prm/_assign is atomic. Second request gets 409 Conflict.
Result:    First wins. Second sees AssignErrorState with message
           "Conversation is already assigned to another user."


EDGE CASE 4: Message Arrives for Closed Conversation
────────────────────────────────────────────────────
Scenario:  Staff closes conversation. Patient sends new message before their
           app reflects the closure.
Behavior:  Backend creates a NEW conversation (new conversationId).
           Old conversation stays CLOSED.
           New conversation appears as UNASSIGNED in ALL tab.


EDGE CASE 5: Large Attachment Upload Timeout
────────────────────────────────────────────
Scenario:  User uploads a large file (e.g., 10MB X-ray image). Network is slow.
Behavior:  Multipart upload has timeout. If exceeded:
           → Error #9: "Unable to upload file. Please try again."
           → No partial upload state -- server rejects incomplete uploads.


EDGE CASE 6: Delegate While Target User Is Offline
──────────────────────────────────────────────────
Scenario:  Staff delegates to Dr. Anand, but Dr. Anand's app is closed.
Behavior:  Backend processes delegation normally.
           → Conversation appears in Dr. Anand's MY queue next time they load it.
           → Push notification sent to Dr. Anand's FCM token.
           → System message visible in chat history.


EDGE CASE 7: App Killed During Message Send
───────────────────────────────────────────
Scenario:  User taps Send. App is killed before response arrives.
Behavior:  If PRM received the request → message was sent (will appear on reopen).
           If PRM did NOT receive → message is lost (no offline queue).
           On reopen: sync flow fetches latest messages. If sent, it appears.
           If not sent, user must retype and resend.


EDGE CASE 8: ObjectBox Store Corruption
──────────────────────────────────────
Scenario:  ObjectBox database file is corrupted (rare, but possible on crash).
Behavior:  ObjectBox store open failure → CRITICAL error logged.
           App should catch this and delete + recreate the store.
           All cached messages are lost (will be re-fetched from server).
           L3 filesystem attachments are NOT affected (separate from ObjectBox).
```

### 16.2 Pagination Edge Cases

```
EDGE CASE 9: Conversation List Reaches End
─────────────────────────────────────────
Scenario:  User scrolls to bottom of ALL tab. totalCount = 47, loaded = 47.
Behavior:  API returns empty page. UI hides "load more" indicator.
           totalCount in ConversationsLoadedState matches loaded count.

EDGE CASE 10: Search Returns Zero Results
─────────────────────────────────────────
Scenario:  User searches for "xyz123" in ALL tab.
Behavior:  API returns empty content array, totalElements = 0.
           UI shows: "No conversations found." (Error #11)

EDGE CASE 11: History Scroll to Very Old Messages
─────────────────────────────────────────────────
Scenario:  User scrolls up repeatedly in a long thread.
Behavior:  getAllHistoryMessages() called with cursor from oldest loaded message.
           Each page returns older messages.
           When server returns empty → no more history → hide "load more".
           All fetched messages saved to ObjectBox for future offline access.
```

---

## 17. Implementation Checklist

### Phase 1: Foundation

- [ ] **ObjectBox setup**
  - [ ] Define `StoreChatDataModel` entity with all fields
  - [ ] Configure indexes on `messageId` (unique), `threadId`, `chatConversationId`, `timestamp`
  - [ ] Implement `ChatHistoryDbManager` with all 7 operations
  - [ ] Write unit tests for dedup logic (`addMessage` + `isMessagePresent`)
  - [ ] Write unit tests for soft-delete (`deleteMessage` sets flags, does NOT remove)
  - [ ] Write unit tests for hard-delete cascade (`deleteOldMessages` cleans L3 files)

### Phase 2: Native Plugin (flutter_acs)

- [ ] **Method Channel**
  - [ ] Create `FlutterAcsPlugin.java` with method channel registration
  - [ ] Implement `initACS`: create `ChatAsyncClient` + `ChatThreadAsyncClient`
  - [ ] Implement `LinkedHashMap` storage keyed by `threadId`
  - [ ] Register `CHAT_MESSAGE_RECEIVED` event handler
  - [ ] Register `CHAT_MESSAGE_DELETED` event handler
  - [ ] Implement message filtering (TEXT and HTML only, skip system messages)
  - [ ] Implement `CommunicationUserIdentifier` sender extraction
  - [ ] Implement `resubscribeToACS` (tear down + rebuild)
  - [ ] Implement `unsubscribeACS` (cleanup + map removal)
  - [ ] Implement `allMessages` (full thread fetch → ACTIVE_HISTORY)
  - [ ] Implement `getAllHistoryMessages` (paginated → HISTORY)
- [ ] **Event Channel**
  - [ ] Create `flutter_acs_event_channel_stream` EventChannel
  - [ ] Serialize payloads as JSON via Gson
  - [ ] Post to UI thread via `Handler(Looper.getMainLooper())`
  - [ ] Define `chatType` enum: ACTIVE, ACTIVE_HISTORY, HISTORY
- [ ] **Data Models (Kotlin)**
  - [ ] `ChatMessageDTO` (envelope)
  - [ ] `ChatMessageReceived` (new message)
  - [ ] `ChatMessageDeleted` (delete event)
  - [ ] `CustomChatMessageType` (8-value enum)
  - [ ] Ensure date format: `"yyyy-MM-dd'T'HH:mm:ss"`

### Phase 3: BLoC Architecture

- [ ] **ChatAssistantBloc**
  - [ ] Define all 8 event classes with parameters
  - [ ] Define all 16 state classes with properties
  - [ ] Implement `FetchAllConversation` handler → POST /prm/_search/user/all-chat-conversation
  - [ ] Implement `FetchMyConversation` handler → GET /prm/chat-conversations/user/chats
  - [ ] Implement `FetchChatDataToView` handler → load thread messages
  - [ ] Implement `FetchUserChatConversationSummary` handler → badge counts
  - [ ] Implement `SendChatMessage` handler → POST /prm/_send/message
  - [ ] Implement `DeleteChatMessage` handler → DELETE /prm/_delete/message
  - [ ] Implement `AssignChatConversation` handler → route to assign/delegate/reassign API
  - [ ] Implement `CloseChatConversation` handler → close API
  - [ ] REASSIGN should reuse `DelegateLoadingState`/`DelegateSuccessState`
- [ ] **Repository Layer**
  - [ ] `ChatRepository` wrapping all 11 PRM API calls
  - [ ] `DmsRepository` wrapping upload/download
  - [ ] Error mapping: HTTP errors → user-facing messages (Error Matrix #1-12)

### Phase 4: UI Screens

- [ ] **Conversation List Screen**
  - [ ] Two tabs: ALL and MY
  - [ ] Conversation card: patient name, UHID, last message, timestamp, status badge, unread count
  - [ ] Pull-to-refresh on both tabs
  - [ ] Infinite scroll pagination
  - [ ] Search bar in ALL tab (searchText parameter)
  - [ ] Status filter in ALL tab (UNASSIGNED/ACTIVE/CLOSED)
  - [ ] Empty state: "No conversations found"
- [ ] **Chat Screen**
  - [ ] Message list with scroll (sorted by timestamp ASC)
  - [ ] Left/right bubble alignment (patient vs. staff)
  - [ ] Message type detection (Section 10.2 waterfall)
  - [ ] Text bubble rendering
  - [ ] Image inline thumbnail + full-screen viewer
  - [ ] Audio player widget (play/pause, progress bar, duration)
  - [ ] PDF/document attachment widget (icon + filename + download)
  - [ ] System message rendering (centered, gray)
  - [ ] Deleted message rendering (italic placeholder)
  - [ ] Delegated message rendering (system message with details)
  - [ ] Text input bar (disabled when UNASSIGNED or CLOSED)
  - [ ] Attachment button (file picker)
  - [ ] Send button
  - [ ] "Assign to Self" button (when UNASSIGNED)
  - [ ] "Delegate" button (when ACTIVE, in app bar)
  - [ ] "Close" button (when ACTIVE, in app bar)
  - [ ] Auto-scroll to bottom on new message
  - [ ] Scroll-up to load history (HISTORY pagination)
- [ ] **Delegate Dialog**
  - [ ] Staff member search input
  - [ ] Search results list with radio selection
  - [ ] Reason text field (optional)
  - [ ] Cancel and Delegate buttons
  - [ ] Loading state during API call

### Phase 5: Real-Time Integration

- [ ] **Event Channel listener in Flutter**
  - [ ] Parse JSON payload from `flutter_acs_event_channel_stream`
  - [ ] Route by `chatType`: ACTIVE → real-time, ACTIVE_HISTORY → initial load, HISTORY → pagination
  - [ ] Dedup via `isMessagePresent()` before saving
  - [ ] Save new messages to ObjectBox
  - [ ] Update UI message list and trigger rebuild
- [ ] **Token refresh flow**
  - [ ] Detect ACS token expiry
  - [ ] Fetch new ACS token from backend
  - [ ] Call `resubscribeToACS` with fresh token
  - [ ] Run sync flow to catch missed messages
- [ ] **Notification deep link**
  - [ ] Parse notification payload for `threadId` + `conversationId`
  - [ ] Navigate to ChatScreen with these parameters
  - [ ] Initialize ACS connection if not already connected

### Phase 6: File Handling

- [ ] **Upload flow**
  - [ ] File picker integration (image, PDF, audio, generic)
  - [ ] Preview before send (image thumbnail, file info)
  - [ ] Multipart upload to POST /prm/_send/attachment
  - [ ] Loading indicator during upload
  - [ ] Error handling (timeout, file too large)
- [ ] **Download flow**
  - [ ] Check L3 cache (`attachmentLocalPath`) before network request
  - [ ] GET /prm/_download/attachments for uncached files
  - [ ] Save to filesystem (L3 cache)
  - [ ] Update ObjectBox `attachmentLocalPath`
  - [ ] Download progress indicator
  - [ ] Retry on failure (tap to retry)
- [ ] **Cache management**
  - [ ] L0: In-memory conversation data
  - [ ] L1: Flutter ImageCache for thumbnails
  - [ ] L2: ObjectBox for structured message data
  - [ ] L3: Filesystem for attachment binaries
  - [ ] Scheduled cleanup: `deleteOldMessages()` with L3 cascade

### Phase 7: Edge Cases & Polish

- [ ] Duplicate message guard (Edge Case 1)
- [ ] Token refresh mid-conversation (Edge Case 2)
- [ ] Concurrent assign conflict handling - 409 (Edge Case 3)
- [ ] New conversation after close (Edge Case 4)
- [ ] Upload timeout handling (Edge Case 5)
- [ ] Offline delegate push notification (Edge Case 6)
- [ ] App kill during send recovery (Edge Case 7)
- [ ] ObjectBox corruption recovery (Edge Case 8)
- [ ] Pagination boundary handling (Edge Cases 9-11)
- [ ] Connection lost banner (Error #12)
- [ ] All 12 user-facing error messages implemented
- [ ] All 10 internal error categories logging correctly

---

*Document reconstructed from binary analysis of AHAM app (org.nh.prod.aham). API request/response schemas are inferred from decompiled code and may have additional fields not captured here.*
