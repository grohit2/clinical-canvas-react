# Telemedicine (Video Consultation)

> How doctors conduct remote consultations, manage appointments, and document visits.

---

## 1. Appointment Dashboard (Home-VC)

### What Doctors See

```
+----------------------------------------------------------+
|  TODAY  18 Apr 2026              [Calendar] [Filter]      |
|                                                           |
|  [Today's] [Upcoming] [Past]                              |
|                                                           |
|  09:00  [BOOKED]   Rahul Verma  M | 32y                 |
|         Video Consultation                    [Start VC]  |
|                                               [Notes]     |
|                                                           |
|  09:30  [ARRIVED]  Priya Sharma  F | 28y                 |
|         Follow-up Appointment                [Start VC]  |
|         2 attachments                        [Notes]     |
|                                                           |
|  10:00  [DONE]     Amit Patel   M | 55y                  |
|         Video Consultation                   [Summary]   |
|                                               [Chat]     |
|                                                           |
|  10:30  [CANCELLED] Neha Singh   F | 42y                 |
|         Cancelled by patient                              |
+----------------------------------------------------------+
```

### Appointment Statuses

```
SCHEDULED --> BOOKED --> ARRIVED --> IN_PROGRESS --> DONE --> COMPLETED
                                        |
                            +-----------+
                            |
                    CANCELLED_BY_DOCTOR
                    CANCELLED_BY_PATIENT
                    CANCELLED_BY_SYSTEM
                    NO_SHOW
                    REJECTED
```

### Appointment Types

| Type | Icon | Description |
|------|------|-------------|
| VIDEO_CONSULT | Camera icon | Live video call |
| APPOINTMENT | Building icon | In-person visit |
| TELE_CONSULT | Phone icon | Phone consultation |
| WALK_IN | Person icon | Walk-in patient |

### Filtering

```
Filter by:
  - Appointment Type: [Video Only] [Others]
  - Status: [Pending] [Completed]
  - Unit: [Multi-select departments]
```

### Calendar Navigation

```
Tap calendar icon
    |
    v
Date picker opens
    |
    v
Select date
    |
    v
Appointments reload for selected date
    |
    v
[Today's] tab = selected date
[Upcoming] tab = future dates
[Past] tab = historical dates
```

---

## 2. Video Consultation Flow

### Starting a Call

```
Doctor taps [Start VC] on appointment
    |
    v
System initializes video session
    |
    v
+----------------------------------------------------------+
|                                                          |
|                                                          |
|              REMOTE VIDEO (Patient)                      |
|              Full screen                                 |
|                                                          |
|                                                          |
|                                      +--------+         |
|                                      | LOCAL  |         |
|                                      | VIDEO  |         |
|                                      | (You)  |         |
|                                      +--------+         |
|                                                          |
|  Patient: Online                          [3 unread]    |
|                                                          |
|  +------+  +------+  +------+  +------+                |
|  | Swap |  | Mic  |  |Camera|  | End  |                |
|  |Camera|  |On/Off|  |On/Off|  | Call |                |
|  +------+  +------+  +------+  +------+                |
+----------------------------------------------------------+
```

### Controls

| Button | Action |
|--------|--------|
| Swap Camera | Switch front/back camera |
| Mic On/Off | Mute/unmute microphone |
| Camera On/Off | Show/hide your video |
| End Call | Leave consultation, navigate to OPD Notes |

### Connection States

```
Connecting...
    |
    v
Patient joins --> "Online" status shown
    |
    v
[During call]
    |
    v
Patient disconnects --> "Offline" status
    |
    v
Patient reconnects --> "Online" again
    |
    v
Doctor ends call --> Navigate to post-call documentation
```

### Video Technology

| Provider | Status | Quality |
|----------|--------|---------|
| **Agora RTC** | Current (primary) | VP8 codec, adaptive bitrate |
| **OpenTok** | Legacy (fallback) | 320x240, 7fps |

---

## 3. In-Call Chat

### Quick Replies

During a video call, doctors can send pre-set messages with one tap:

```
[Rejoin] --> "There is disturbance in your audio/video.
              Can you please end the call and rejoin."

[IVR Call] --> "You will be receiving a call on phone.
                Please pick up the call."

[Prescription] --> "You will receive your prescription shortly"

[Admission] --> "Our team will connect with you to plan the admission"

[Noise] --> "There is some noise coming from your side.
             Can you please go to a quiet place."
```

### Custom Messages

Doctors can also type custom messages using the chat panel that slides in from the right.

```
Tap chat icon (shows unread count badge)
    |
    v
Chat panel slides in
    |
    v
See message history for this consultation
    |
    v
Type message + Send
    |
    v
Patient receives in their app
```

### Technology: WebSocket (STOMP over SockJS)

Messages are real-time via WebSocket connection. Each consultation has its own message channel.

---

## 4. IVR Calls (India Only)

For patients with poor internet, doctors can initiate a phone bridge:

```
Doctor taps IVR icon
    |
    v
System calls doctor's registered phone number
    |
    v
System simultaneously calls patient's phone number
    |
    v
Both calls bridged together
    |
    v
Voice-only consultation over phone network
```

Available only when `countryCode === 'IN'`

---

## 5. Post-Call Documentation (OPD Notes)

After ending a video call, doctors document the consultation:

### Upload Prescriptions

```
Doctor ends video call
    |
    v
OPD Notes page opens automatically
    |
    v
+------------------------------------------+
|  OPD NOTES                               |
|                                          |
|  Upload Prescriptions:                   |
|    [Take Photo] [From Gallery] [Upload]  |
|                                          |
|  Uploaded Files:                         |
|    [Prescription_001.pdf]    [x]         |
|    [Lab_order.jpg]           [x]         |
|                                          |
|  Max 5 files allowed                     |
+------------------------------------------+
```

### File Upload Flow

```
Take Photo (camera)
    |
    v
Review captured image
    |
    v
Image compressed (quality: 50)
    |
    v
Converted to Base64 with MD5 checksum
    |
    v
Uploaded to server
    |
    v
Path stored for patient record
    |
    v
After all uploads: Consultation marked as DONE
```

### Supported Upload Sources

| Source | Limit | Formats |
|--------|-------|---------|
| Camera | 1 photo at a time | JPEG |
| Gallery | Up to 5 multi-select | JPEG, PNG |
| File Picker | 1 file at a time | PDF |

---

## 6. Past Consultations & Records

### Viewing Previous Consultations

```
Doctor opens Past Prescriptions for patient
    |
    v
List of previous consultations (filtered: DONE or IN_PROGRESS)
    |
    v
+------------------------------------------+
|  PAST CONSULTATIONS                      |
|                                          |
|  18 Apr 2026 - Video Consultation        |
|    Dr. Sharma | Cardiology               |
|    [View Prescriptions] [View Summary]   |
|                                          |
|  15 Mar 2026 - Follow-up                 |
|    Dr. Sharma | Cardiology               |
|    [View Prescriptions] [View Summary]   |
|                                          |
|  Navigate: [< Previous] [Next >]        |
+------------------------------------------+
```

### Patient-Uploaded Files

Doctors can also view files the patient uploaded before the consultation:

```
Open Past Uploads
    |
    v
Files grouped by appointment
    |
    v
Each file shows: consultant name, visit date, filename
    |
    v
Tap to view (PDF viewer or image gallery)
    |
    v
Navigate between attachments
```

---

## 7. Follow-Up Scheduling

After a consultation, doctors can schedule follow-ups:

### Two Scheduling Modes

**Mode 1: Duration-Based (Quick)**

```
"Come back in..."
    |
    v
Quick-select buttons:
  [1 day] [2 days] [3 days] [4 days] [5 days] [6 days] [7 days]
    |
    v
Or custom: [15] [Weeks v]
    |
    v
Select type: [Physical] [Video] [Tele]
    |
    v
System calculates follow-up date
    |
    v
[Save]
```

**Mode 2: Date-Based (Specific Slot)**

```
"Come on a specific date..."
    |
    v
Open calendar --> Select date
    |
    v
System fetches available slots for that date
    |
    v
+------------------------------------------+
|  AVAILABLE SLOTS - 25 Apr 2026           |
|                                          |
|  Cardiology OPD:                         |
|                                          |
|  Morning (06:00-12:00):                  |
|    [09:00] [09:30] [10:00] [10:30]      |
|                                          |
|  Afternoon (12:00-18:00):                |
|    [14:00] [14:30] [15:00]              |
|                                          |
|  Evening (18:00-23:59):                  |
|    [No slots available]                  |
|                                          |
|  Selected: 09:30                [Book]   |
+------------------------------------------+
```

### Adding Follow-Up Investigations

```
During follow-up scheduling:
    |
    v
Tap [+ Add Investigation]
    |
    v
Three search modes:
  1. Favorites (doctor's frequent orders)
  2. Order Sets (pre-defined bundles)
  3. Master Search (all available tests)
    |
    v
Select tests to order at follow-up
    |
    v
Tests linked to follow-up appointment
```

### Existing Follow-Ups

The follow-up page shows previously scheduled follow-ups to prevent duplicates:

```
FOLLOW-UP DUE:
  - 25 Apr: Physical visit, Dr. Sharma, Cardiology
    Note: "Review echo results"
  - 10 May: Video follow-up, Dr. Sharma
    Note: "Medication adjustment review"
```

---

## Key User Journeys

### Journey: Complete Video Consultation

```
1.  Doctor sees appointment at 09:00 (BOOKED status)
2.  Patient arrives in app (status: ARRIVED)
3.  Doctor taps [Start VC]
4.  Video call connects (status: IN_PROGRESS)
5.  Doctor examines patient via video
6.  Uses quick reply: "Please show me the wound closer"
7.  Notices patient needs lab work
8.  During call, reviews past prescriptions
9.  Ends call
10. OPD Notes page opens
11. Takes photo of handwritten prescription
12. Uploads prescription PDF
13. Consultation marked DONE
14. Schedules follow-up: "2 weeks, Video consultation"
15. Adds investigation: "Blood glucose fasting"
16. Patient receives follow-up details
```

### Journey: IVR Fallback

```
1. Video call started but patient has poor internet
2. Video keeps buffering, audio drops
3. Doctor sends quick reply: [IVR Call]
4. Patient sees message about incoming phone call
5. Doctor taps IVR icon
6. Both receive phone calls
7. Voice consultation proceeds over phone
8. Doctor documents findings in OPD Notes after call
```
