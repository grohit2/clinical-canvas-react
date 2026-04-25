# AHAM - Chat Conversations

The Chat module lets hospital staff manage real-time conversations with patients. Staff can pick up unassigned chats, delegate complex cases to specialists, and close resolved conversations -- all from a single dashboard.

---

## Table of Contents

1. [Chat Dashboard](#chat-dashboard)
2. [Conversation Card](#conversation-card)
3. [Chat Actions](#chat-actions)
4. [Message Types](#message-types)
5. [Real-Time Updates](#real-time-updates)
6. [User Journeys](#user-journeys)

---

## Chat Dashboard

The chat dashboard has two tabs: **All Conversations** and **My Conversations**.

### All Conversations

Shows every active conversation across the department -- assigned, unassigned, and delegated.

```
+--------------------------------------------------+
|  CONVERSATIONS                                    |
|                                                   |
|  [ ALL CONVERSATIONS ]   MY CONVERSATIONS         |
|  ---------------------                            |
|                                                   |
|  +----------------------------------------------+ |
|  | Rajesh Kumar                      2 min ago  | |
|  | "Can you tell me when my reports             | |
|  |  will be ready?"                             | |
|  | [Unassigned]                    3 unread      | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | Priya Sharma                      5 min ago  | |
|  | "Thank you for the update"                   | |
|  | [Assigned to: Kavita]           0 unread      | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | Meena Devi                       12 min ago   | |
|  | "I need to speak with the                    | |
|  |  billing department"                         | |
|  | [Delegated to: Finance Team]    1 unread      | |
|  +----------------------------------------------+ |
|                                                   |
+--------------------------------------------------+
```

### My Conversations

Shows only the conversations assigned to **you**.

```
+--------------------------------------------------+
|  CONVERSATIONS                                    |
|                                                   |
|  ALL CONVERSATIONS   [ MY CONVERSATIONS ]         |
|                      -------------------          |
|                                                   |
|  +----------------------------------------------+ |
|  | Priya Sharma                      5 min ago  | |
|  | "Thank you for the update"                   | |
|  | [Assigned to: You]             0 unread       | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  | Gopal Rao                        20 min ago   | |
|  | (attachment) discharge_summary.pdf            | |
|  | [Assigned to: You]             1 unread       | |
|  +----------------------------------------------+ |
|                                                   |
|  No more conversations.                           |
+--------------------------------------------------+
```

---

## Conversation Card

Each conversation appears as a card on the dashboard. Here is what each element means:

```
+--------------------------------------------------+
|  [Patient Photo/Avatar]                           |
|                                                   |
|  Patient Name                        Time Ago     |
|  Last message preview text (truncated             |
|  if too long to fit one line)                     |
|  [Status Badge]                   Unread Count    |
|                                                   |
+--------------------------------------------------+
```

### Status Badges

| Badge | Meaning | Color |
|-------|---------|-------|
| **Unassigned** | No staff member has picked up this chat yet | Grey |
| **Assigned to: [Name]** | A specific staff member is handling this chat | Green |
| **Delegated to: [Name/Team]** | Chat has been forwarded to another person or team | Blue |

### Unread Count

A number badge showing how many messages the patient has sent that you have not yet read. Disappears when you open the conversation.

---

## Chat Actions

When you open a conversation, you can perform four actions:

### 1. Assign to Self

Pick up an unassigned conversation so you can respond to the patient.

```
+--------------------------------------------------+
|  Rajesh Kumar - Chat                              |
|                                                   |
|  [Patient]: Can you tell me when my reports       |
|             will be ready?                        |
|                                                   |
|  [Patient]: I've been waiting since morning       |
|                                                   |
|  [Patient]: Hello?                                |
|                                                   |
|                                                   |
|  +----------------------------------------------+ |
|  |         Assign to Self                       | |
|  +----------------------------------------------+ |
|                                                   |
|  +----------------------------------------------+ |
|  |  "Are you sure you want to assign this       | |
|  |   conversation to yourself?"                 | |
|  |                                              | |
|  |        [ Cancel ]    [ Yes, Assign ]         | |
|  +----------------------------------------------+ |
|                                                   |
+--------------------------------------------------+
```

After confirming, the chat status changes to "Assigned to: You" and you can start typing replies.

---

### 2. Delegate

Forward the conversation to another staff member or team who is better suited to help.

```
+--------------------------------------------------+
|  Delegate Conversation                            |
|                                                   |
|  Select a person or team:                         |
|                                                   |
|  +----------------------------------------------+ |
|  | Dr. Anita - Finance Team                     | |
|  +----------------------------------------------+ |
|  | Rajan - Pharmacy                             | |
|  +----------------------------------------------+ |
|  | Sunita - Billing                             | |
|  +----------------------------------------------+ |
|  | Kavita - Front Office                        | |
|  +----------------------------------------------+ |
|                                                   |
|  [ Cancel ]              [ Delegate ]             |
+--------------------------------------------------+
```

When delegated, a system message appears in the chat:

```
  "This chat has been delegated to Dr. Anita (Finance Team)"
```

---

### 3. Reassign

Transfer an already-assigned conversation to a different staff member. This is used when workload needs to be rebalanced or when a shift ends.

```
+--------------------------------------------------+
|  Reassign Conversation                            |
|                                                   |
|  Currently assigned to: Kavita                    |
|                                                   |
|  Reassign to:                                     |
|                                                   |
|  +----------------------------------------------+ |
|  | Sunita - Billing                             | |
|  +----------------------------------------------+ |
|  | Prakash - Finance                            | |
|  +----------------------------------------------+ |
|                                                   |
|  [ Cancel ]              [ Reassign ]             |
+--------------------------------------------------+
```

---

### 4. Close

End the conversation when the patient's query has been resolved.

```
+--------------------------------------------------+
|  Close Conversation                               |
|                                                   |
|  "Are you sure you want to close this             |
|   conversation?"                                  |
|                                                   |
|  [ Cancel ]              [ Close ]                |
+--------------------------------------------------+
```

After closing, a system message appears:

```
  "This chat has been closed!"
```

The conversation moves out of the active queue. If the patient sends a new message later, a new conversation is created.

---

## Message Types

The chat supports several message types:

### Text Message

Standard typed message from either patient or staff.

```
  [Patient]: When will my discharge be processed?

  [Staff - You]: Hi Rajesh, your discharge papers
                 are being prepared. It should be
                 ready within the next 2 hours.

  [Patient]: Thank you!
```

### Attachment

Files shared in the conversation. Tapping opens a preview or downloads the file.

```
  [Patient]: Here are my previous reports
  [Patient]: (attachment) blood_test_results.pdf
  [Patient]: (attachment) xray_chest_front.jpg
```

### Audio Message

Voice recordings sent by either party.

```
  [Patient]: (audio) 0:23  [>  -----o------------ ]
```

### PDF Document

PDF files appear with a document icon and filename.

```
  [Staff - You]: Please find your discharge summary
  [Staff - You]: (PDF) discharge_summary_rajesh.pdf
```

### Image

Photos shared in the chat. Appear as thumbnails that can be tapped to view full-size.

```
  [Patient]: Here is a photo of the rash
  [Patient]: (image) [thumbnail preview]
```

### Deleted Message

When a message is removed, it is replaced with a placeholder.

```
  [Patient]: "This message has been deleted"
```

The original content is no longer visible to either party.

### System Messages

Automated messages that appear when certain actions happen.

```
  --- "This chat has been delegated to Dr. Anita (Finance Team)" ---

  --- "This chat has been closed!" ---

  --- "Conversation reassigned to Sunita (Billing)" ---
```

---

## Real-Time Updates

The chat system provides real-time updates so staff always see the latest information:

| What Updates | How It Works |
|-------------|-------------|
| **New messages** | Appear instantly at the bottom of the chat thread |
| **Unread count** | Badge updates on the conversation card as new messages arrive |
| **Typing indicator** | Shows when the patient is typing a message |
| **Assignment changes** | Status badge updates when a chat is assigned, delegated, or reassigned |
| **Message deletion** | Deleted messages are immediately replaced with the "deleted" placeholder |
| **Chat closure** | Closed chat shows the system message and disables the input field |

Messages are also cached locally on the device, so previously loaded conversations are available even when the network is temporarily unavailable.

---

## User Journeys

### Journey 1: Managing an Incoming Patient Query

**Scenario:** Front office staff member Kavita handles an incoming question from patient Rajesh Kumar about his lab reports.

```
Step 1: Kavita opens AHAM and taps "Conversations"
        |
        v
Step 2: In "All Conversations" she sees an unassigned
        chat from Rajesh Kumar with 3 unread messages
        |
        v
Step 3: She taps the conversation card
        and sees Rajesh's messages:
        - "Can you tell me when my reports will be ready?"
        - "I've been waiting since morning"
        - "Hello?"
        |
        v
Step 4: She taps "Assign to Self"
        Confirmation dialog: "Are you sure you want
        to assign this conversation to yourself?"
        She taps "Yes, Assign"
        |
        v
Step 5: The status changes to "Assigned to: Kavita"
        The text input field becomes active
        |
        v
Step 6: Kavita types:
        "Hi Rajesh, I'm checking on your reports now.
         Your blood work results are ready and the
         radiology report should be available by 3 PM."
        |
        v
Step 7: Rajesh replies: "Thank you!"
        |
        v
Step 8: Kavita taps "Close"
        Confirms: "Are you sure?"
        System message: "This chat has been closed!"
        |
        v
Step 9: The conversation moves out of her active queue
        Kavita returns to the dashboard to handle
        the next unassigned chat
```

**Total time:** ~3 minutes

---

### Journey 2: Delegating a Complex Case

**Scenario:** Kavita receives a chat from patient Meena Devi asking about a billing discrepancy. Kavita is front office staff and cannot answer billing questions -- she needs to delegate to the finance team.

```
Step 1: Kavita sees Meena Devi's chat in
        "All Conversations" (Unassigned, 1 unread)
        |
        v
Step 2: She opens the conversation
        Meena's message: "I need to speak with the
        billing department. My invoice shows charges
        for a procedure I didn't have."
        |
        v
Step 3: Kavita assigns to self first so she can
        acknowledge the patient
        |
        v
Step 4: She types:
        "Hi Meena, I understand your concern about
         the billing. Let me connect you with our
         finance team who can look into this."
        |
        v
Step 5: She taps the "Delegate" action
        A list of staff members appears
        She selects "Dr. Anita - Finance Team"
        Taps "Delegate"
        |
        v
Step 6: System message appears in the chat:
        "This chat has been delegated to
         Dr. Anita (Finance Team)"
        |
        v
Step 7: The conversation disappears from Kavita's
        "My Conversations" and appears in
        Dr. Anita's queue
        |
        v
Step 8: Dr. Anita opens the conversation,
        sees the full history including Kavita's
        message and Meena's original complaint,
        and continues the conversation:
        "Hi Meena, I'm looking at your invoice now.
         Can you share the invoice number?"
```

**Total time:** ~2 minutes for Kavita, then Dr. Anita takes over

---

*Previous: [Task Management](./01_TASK_MANAGEMENT.md) | Next: [Outreach Camps](./03_OUTREACH_CAMPS.md)*
