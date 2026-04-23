# Lab Results & Investigations

> How tests are ordered, results are viewed, and trends are tracked.

---

## 1. Ordering an Investigation

### Flow

```
Doctor opens Investigation Orders
    |
    v
+----- Select from FAVORITES (frequently ordered tests)
|      (Sorted by name, personal to each doctor)
|
+----- OR SEARCH by name/code (min 3 characters)
|      Results from hospital's test catalogue
|
    v
Select one or more tests
    |
    v
For each test:
  - Set Priority: [Normal] or [URGENT] (flag icon toggles)
  - Add Instructions: optional text (max 250 characters)
    |
    v
Review selected tests
    |
    v
[Submit Order]
    |
    v
Tests sent to lab/radiology for processing
```

### Investigation Order Status

```
ADDED --> ORDERED --> IN PROGRESS --> REPORT READY --> PROCESSED
                          |
                    [APPROVAL REQUIRED]  (needs authorization)
                          |
                    [CANCELLED] or [REJECTED]
```

### Duplicate Detection

If the same test was already ordered for this encounter, the system shows a confirmation: "This test has already been ordered. Do you want to order again?"

---

## 2. Viewing Lab Results

### How Results Appear

Lab results are **automatically posted to the patient's chat** as system messages. Doctors see them in real-time.

### Result Card Display

```
+--------------------------------------------------+
|  Complete Blood Count (CBC)        15 Apr 10:30  |
|                                                  |
|  Hemoglobin      13.5 g/dL    [12-16]     [OK]  |
|  WBC Count       15200 /uL    [4000-11000] [!H] |
|  Platelets       180000 /uL   [150k-400k]  [OK]  |
|  RBC             4.8 M/uL     [4.5-5.5]    [OK]  |
|                                                  |
|  [View Report PDF]                               |
+--------------------------------------------------+
```

### Abnormal Flagging System

| Flag | Meaning | Visual Indicator | Color |
|------|---------|------------------|-------|
| N | Normal | No indicator | Green |
| H | High | Arrow UP | Red |
| L | Low | Arrow DOWN | Red |
| PH | Panic High | Arrow UP (urgent) | Bright Red |
| PL | Panic Low | Arrow DOWN (urgent) | Bright Red |
| AH | Alert High | Arrow UP | Red |
| AL | Alert Low | Arrow DOWN | Red |

### Result Types

**General Result** (single value):
```
Blood Glucose:  142 mg/dL  [70-110]  [!H]
```

**Parameter Result** (panel with multiple values):
```
Liver Function Test
  - SGPT (ALT):    45 U/L    [7-56]     [OK]
  - SGOT (AST):    72 U/L    [10-40]    [!H]
  - Bilirubin:     0.8 mg/dL [0.1-1.2]  [OK]
  - Albumin:       3.2 g/dL  [3.5-5.5]  [!L]
```

### "On Hold" Results

If a result has `reportHoldStatus = Y`, it shows as "On Hold" and no values are displayed. This means the lab hasn't released the result yet.

---

## 3. Result Views

### List View (Default)

Results grouped by date, newest first:

```
TODAY
  CBC                    10:30   Single value: WBC 15200 [!H]
  Renal Function Test    09:15   [View Details]

YESTERDAY
  Blood Glucose          14:00   142 mg/dL [!H]
  Urine Routine          11:30   [View Report]

15 APRIL 2026
  Liver Function Test    16:00   [View Details]
```

### Detail/Matrix View

Shows all results for a test over time in a grid:

```
                    10:30    09:15    Yesterday   15-Apr
                    Today    Today    14:00       16:00
Test Name            |        |        |           |
---------------------------------------------------------
Hemoglobin          13.5              12.8        11.2
WBC Count          *15200*            9800        8500
Platelets          180000            195000      210000
---------------------------------------------------------
                  * = current (highlighted column)
```

Tapping any cell opens the trend graph for that parameter.

### Trend Graph

Interactive D3.js line chart:

```
    Value
    ^
    |
 16 |                                    *
    |                              *
 14 |          *             *
    |    *          *
 12 |
    |
 10 +----+----+----+----+----+----+----+---> Time
      12  15   18   21   00   03   06
     Apr  Apr  Apr  Apr  Apr  Apr  Apr

 * Green dots = Normal range
 * Red dots = Abnormal
 Reference range shown as horizontal band
```

**Features:**
- Pan and scroll through historical data
- Auto-scrolls to most recent data on open
- Dropdown to switch between different test parameters
- Responsive: adjusts height in landscape mode

---

## 4. Filtering Results

```
Tap filter icon
    |
    v
+------------------------------------------+
|  FILTER RESULTS                          |
|                                          |
|  By Name: (multi-select)                 |
|    [x] CBC                               |
|    [x] Liver Function Test               |
|    [ ] Renal Function Test               |
|    [ ] Blood Glucose                     |
|    [Search...]                           |
|                                          |
|  By Date: (multi-select)                 |
|    [x] Today                             |
|    [x] Yesterday                         |
|    [ ] 15 April 2026                     |
|                                          |
|  [Reset]                    [Apply]      |
+------------------------------------------+
```

**Logic:** Name AND Date filter combined. Either alone works as single filter.

### "Most Recent" Toggle

Shows only the latest result per test type. Useful for quick overview without scrolling through history.

---

## 5. Provisional Lab Results

Some results are released as "provisional" (validated but not finalized):

```
Doctor opens Provisional Lab tab
    |
    v
Results grouped by validation date
    |
    v
Tap any result --> View details
    |
    v
Tap PDF icon --> Download lab report PDF
```

---

## 6. Report Downloads

### Supported Report Types

| Type | Source | Format |
|------|--------|--------|
| Lab Report | LIS (Lab Information System) | PDF |
| Radiology Report | RIS (Radiology IS) | PDF |
| Diagnostic Report | Diagnostic system | PDF |
| External Report | Outside lab | PDF/JPEG |
| Attachment Report | Uploaded documents | PDF/JPEG/PNG |

### Download Flow

```
Tap report icon on any result
    |
    v
System downloads with authentication
    |
    v
File cached locally on device
    |
    v
Opens in built-in PDF/Image viewer
    |
    v
Navigate between multiple reports (Previous/Next)
    |
    v
Pinch-zoom for detailed viewing
```

---

## 7. Radiology Results

### What's Different

Radiology results may include:
- **Images** (X-ray, CT, MRI thumbnails)
- **AI Findings** (AI-detected abnormalities with heatmap overlays)
- **Reports** (radiologist interpretation)

```
+--------------------------------------------------+
|  Chest X-Ray PA View              18 Apr 14:30   |
|                                                  |
|  [Thumbnail 1] [Thumbnail 2] [Thumbnail 3]      |
|                                                  |
|  AI Finding: "Possible consolidation in          |
|               right lower lobe"                  |
|  [View Heatmap]                                  |
|                                                  |
|  [View Full Report PDF]                          |
+--------------------------------------------------+
```

---

## 8. Vital Trends (11 Parameters)

Separate from lab results but closely related. Shows physiological measurements over time.

### Supported Vitals

| Vital | Unit | Chart Color |
|-------|------|-------------|
| Blood Pressure (Systolic) | mmHg | Blue |
| Blood Pressure (Diastolic) | mmHg | Teal |
| Heart Rate | bpm | Golden |
| Temperature | F/C | Red |
| SpO2 | % | Purple |
| Respiratory Rate | /min | Deep Purple |
| Arterial Pressure | mmHg | Cyan |
| BP Lying | mmHg | Light Blue |
| BP Standing | mmHg | Green |
| BP Sitting | mmHg | Pink |
| CRT (Capillary Refill) | sec | Lavender |
| CHEWS Score | score | Orange |

### Three View Modes

| Mode | Best For |
|------|----------|
| **Combined Graph** | Comparing multiple vitals on one chart (with legend toggle) |
| **Individual Charts** | Deep-dive into one vital at a time (11 scrollable charts) |
| **Table View** | Quick numerical overview |

### Date Range

Default range depends on ward:
- **ICU patients**: From today (high-frequency monitoring)
- **General ward**: Last 4 days

Users can adjust with calendar date picker. Cannot go before admission date.

### ECG Viewer

For patients with cardiac monitors, a dedicated ECG waveform viewer:
- Opens in landscape mode
- Real-time waveform display via embedded viewer
- Connected to bedside monitor via hospital network

---

## Key User Journeys

### Journey: Abnormal Lab Alert

```
1. Lab completes CBC for patient in ICU
2. Result auto-posted to patient's chat: "WBC 15200 [!H]"
3. Doctor sees red high flag immediately
4. Taps to see detail matrix: WBC trending UP over 3 days
5. Opens trend graph: clear upward trajectory
6. Orders repeat CBC and blood culture
7. Adjusts antibiotic medication
8. Writes progress note documenting findings
```

### Journey: Pre-Surgery Investigation Review

```
1. Surgeon opens patient's past records
2. Checks Renal Function: all normal
3. Checks Coagulation: PT slightly high
4. Downloads Chest X-ray report: "Clear"
5. Opens ECG: Normal sinus rhythm
6. Approves patient for surgery
7. Creates Pre-Anesthesia Checkup record
```
