# Flow 08: Vital Trends, Past Records, Gallery/Image Editing, Offline Architecture & Platform Features

**App:** AADI (org.nh.app.aadi) v2.35.0
**Framework:** Ionic 7 / Capacitor 5 / Angular 17+
**Source files:** `vital-trends.page.ts` (2026 lines), `past-records.page.ts` (1037 lines), `past-records-medication.page.ts`, `past-records-investigation.page.ts`, `past-records-attachments.page.ts`, `past-records-summary.page.ts`, `gallery-view.page.ts` (244 lines), `image-editing-modal.page.ts` (390 lines), `notification-preferences.page.ts`, `discharged-patients.page.ts`, `patient-ecg.page.ts`, `calendar-modal.page.ts`, `lab-result-processer.util.ts`

---

## 1. Overview

This document covers the remaining systems in AADI that complete the clinical data visualization, historical record access, file handling, and platform-level feature set. These systems fall into five functional areas:

1. **Vital Trends** -- a D3.js-powered charting system that renders 13 vital parameters across three view modes (combined graph, individual charts, table view) with date-range filtering, BP merge logic, and temperature unit conversion.

2. **Past Records** -- a consultation history browser with four sub-segments (Lab, RAD, Other, Attachments) that reuses the LabResultProcesserUtil pipeline from Flow 04, supports six report download types, and renders 30+ clinical concept types in a discharge/OP summary view.

3. **Gallery View & Image Editing** -- file viewing (PDF + images) with pinch-zoom, multi-file navigation, and a crop/rotate image editor with an 8-image cap.

4. **Offline Architecture** -- the cross-cutting storage and sync layer: encrypted SQLite, SecureStorage with 63 cached keys, Capacitor Network monitoring, 5-minute message sync, and online-vs-offline feature gating.

5. **Platform Features** -- notification preferences (mandatory vs optional toggles), feedback/survey system, downtime detection, FAQ, version checking ("What's New"), and discharged patient access.

### 1.1 Component Dependency Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                    VITAL TRENDS & CLINICAL DATA VISUALIZATION                                  │
│                                                                                                │
│  ┌──────────────────────────────┐  ┌──────────────────────────────┐  ┌───────────────────────┐ │
│  │    VITAL TRENDS              │  │    PAST RECORDS              │  │  GALLERY & IMAGE EDIT │ │
│  │                              │  │                              │  │                       │ │
│  │  VitalTrendsPage (2026 LOC)  │  │  PastRecordsPage (1037 LOC) │  │  GalleryViewPage      │ │
│  │  CalendarModalPage (picker)  │  │  PastRecordsMedicationPage  │  │  ImageEditingModal     │ │
│  │  PatientEcgPage (iframe)     │  │  PastRecordsInvestigation   │  │  ng2-pdf-viewer        │ │
│  │                              │  │  PastRecordsAttachmentsPage │  │  ngx-pinch-zoom-16     │ │
│  │  D3.js v4+ charting          │  │  PastRecordsSummaryPage     │  │  angular-cropperjs     │ │
│  │  13 vital parameters         │  │                              │  │                       │ │
│  │  3 view modes                │  │  LabResultProcesserUtil      │  │  Capacitor Camera      │ │
│  │  EHR_033 API                 │  │  6 report download types     │  │  Capacitor Filesystem  │ │
│  └──────────┬───────────────────┘  └──────────┬───────────────────┘  └──────────┬────────────┘ │
│             │                                  │                                 │              │
│  ┌──────────▼──────────────────────────────────▼─────────────────────────────────▼────────────┐ │
│  │                          ATHMA PROXY GATEWAY + REST API                                     │ │
│  │        EHR_033, EHR_096, EHR_104, MDM_002 + direct REST endpoints                         │ │
│  └──────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                          OFFLINE ARCHITECTURE (cross-cutting)                                │ │
│  │                                                                                              │ │
│  │  SQLite DB "aadi" (encrypted)  │  SecureStorage (63 keys)  │  Network Plugin (BehaviorSubj) │ │
│  │  patient_info table            │  In-memory cache           │  5-min sync interval           │ │
│  │  messages table                │  Android Keystore backing  │  Online/offline feature gate   │ │
│  │  care_team table               │  Migration from localStorage│                               │ │
│  │  error_messages table          │                            │                                │ │
│  └──────────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                          PLATFORM FEATURES                                                   │ │
│  │                                                                                              │ │
│  │  NotificationPreferencesPage  │  FeedbackPage  │  FAQ  │  What's New  │  DischargedPatients │ │
│  │  Mandatory vs Optional        │  Survey URLs    │  1 Q  │  Version cmp │  Name/MRN search   │ │
│  │  JSON.stringify diff          │  Pending list   │  Email│  Play Store  │  → DischargeSummary │ │
│  │                               │                 │       │              │                     │ │
│  │  DowntimeService              │                 │       │              │                     │ │
│  │  Maintenance window check     │                 │       │              │                     │ │
│  └──────────────────────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Navigation Hierarchy

```
PatientChatPage (clinical encounter context)
  │
  ├── VitalTrendsPage (combined / individual / table views)
  │     ├── CalendarModalPage (modal -- date range picker)
  │     └── PatientEcgPage (modal -- iframe ECG viewer, online-only)
  │
  ├── PastRecordsPage (overview + tests segments)
  │     ├── PastRecordsMedicationPage (modal -- brand/generic medication view)
  │     ├── PastRecordsInvestigationPage (modal -- 6 report type downloads)
  │     ├── PastRecordsAttachmentsPage (modal -- EHR_096 download)
  │     └── PastRecordsSummaryPage (modal -- 30+ clinical concept types)
  │
  ├── GalleryViewPage (PDF/image viewer with navigation)
  │     └── ImageEditingModalPage (modal -- crop/rotate/save)
  │
  └── (context-dependent modals share GalleryView and ImageEditing)

LandingPage (dashboard)
  │
  ├── DischargedPatientsPage (list with search)
  │     └── DischargeSummaryPage (read-only)
  │
  ├── NotificationPreferencesPage (toggle settings)
  │
  ├── FeedbackPage (survey list + external URL)
  │
  ├── FAQPage (static content)
  │
  └── What's New (version comparison + update prompt)
```

### 1.3 Key Numbers

| Metric | Value |
|---|---|
| Vital parameters tracked | 13 (with hex color codes) |
| Vital Trends view modes | 3 (Combined, Individual, Table) |
| Vital Trends source file | 2,026 lines |
| Past Records source file | 1,037 lines |
| Past Records consultation parallel API calls | 3-4 per consultation |
| Past Records report download types | 6 |
| Past Records clinical concept types (summary) | 30+ |
| Gallery/Image Editing max images | 8 |
| Offline SQLite tables | 4 (patient_info, messages, care_team, error_messages) |
| SecureStorage cached keys | 63 |
| Offline message sync interval | 300,000ms (5 minutes) |
| Notification preference types | 2 (Mandatory locked, Optional toggleable) |

---

## 2. Vital Trends -- 13 Parameters & 3 Views

### 2.1 The 13 Vital Parameters

Each vital parameter has a fixed hex color used consistently across all three view modes (combined graph, individual charts, table).

| # | Parameter | Hex Color | Display Name | Notes |
|---|-----------|-----------|--------------|-------|
| 1 | BP Systolic | `#1f77b4` | BP Sys | Combined with Diastolic as "120/80" or separate |
| 2 | BP Diastolic | `#00A88F` | BP Dia | Paired with Systolic |
| 3 | Heart Rate | `#E3BC02` | HR | Beats per minute |
| 4 | Temperature | `#ce5252` | Temp | Primary sensor, C/F conversion |
| 5 | Temperature T1 | `#1C629B` | Temp T1 | Secondary sensor |
| 6 | SpO2 | `#772F67` | SpO2 | Oxygen saturation % |
| 7 | Respiratory Rate | `#5a359c` | RR | Breaths per minute |
| 8 | Arterial Systolic | `#429ede` | Arterial Sys | Invasive BP measurement |
| 9 | Arterial Diastolic | `#08e0c0` | Arterial Dia | Invasive BP measurement |
| 10 | BP Lying (Sys/Dia) | `#5fb5c9` / `#bfdd34` | BP Lying | Positional BP -- two colors for sys/dia |
| 11 | BP Standing (Sys/Dia) | `#acee94` / `#26697e` | BP Standing | Positional BP -- two colors for sys/dia |
| 12 | BP Sitting (Sys/Dia) | `#d56fc3` / `#6700ff` | BP Sitting | Positional BP -- two colors for sys/dia |
| 13 | CRT | `#9d9df6` | CRT | Capillary Refill Time |

**Additional parameter (non-graph):**
| Parameter | Hex Color | Notes |
|-----------|-----------|-------|
| CHEWS Score | `#f6a001` | Children's Early Warning Score -- table view only |

### 2.2 Three View Modes

The page uses an `ion-segment` to switch between three rendering modes. Each mode shares the same data source (EHR_033 API response) but renders it through a different pipeline.

```
┌──────────────────────────────────────────────────────────────┐
│  [<]  Vital Trends                          [Calendar 📅]    │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────────┬──────────────┬──────────────┐              │
│  │  Combined    │  Individual  │    Table      │              │  ← ion-segment
│  └──────────────┴──────────────┴──────────────┘              │
│                                                              │
│  From: 18-Apr-2026    To: 22-Apr-2026   [ECG]               │  ← date range + ECG button
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │                                                          ││
│  │             (selected view renders here)                 ││
│  │                                                          ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

#### 2.2.1 Combined Graph View

All 13 parameters overlaid on a single D3.js SVG canvas with an interactive legend.

```
┌──────────────────────────────────────────────────────────────┐
│  LEGEND:                                                      │
│  [All] [●BP Sys] [●BP Dia] [●HR] [●Temp] [●SpO2] [●RR]     │
│  [●Art Sys] [●Art Dia] [●BP Lying] [●BP Stand] [●BP Sit]    │
│  [●CRT] [●Temp T1]                                           │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Y-axis │                                                    │
│  (fixed)│    ╭──●──╮            ●                            │
│   200 ──│────╯     ╰──●──╮    ╱ ╲                           │
│   180 ──│               ╰──●╯   ╲                           │
│   160 ──│                        ╰──●                       │
│   140 ──│          ╭──●──╮                                   │
│   120 ──│──●──╮   ╱      ╰──●                               │
│   100 ──│     ╰──●                                           │
│    80 ──│                                                    │
│    60 ──│                                                    │
│         └──────────────────────────────────────────────────── │
│           08:00    12:00    16:00    20:00    08:00           │
│           18/04    18/04    18/04    18/04    19/04           │
└──────────────────────────────────────────────────────────────┘
```

**Legend behavior:**
- Each legend item is a colored circle + label, toggleable
- Clicking a parameter toggles its dataset on/off from the graph
- **"All" button:** toggles all datasets on or off (if any are off, "All" turns them all on; if all are on, "All" turns them all off)
- Active legend items render at full opacity; inactive items render greyed out

**Hover interaction:**
- Hovering/tapping a data point on any line:
  - The selected line increases to 2.5px stroke width (from 1.5px default)
  - The selected circle increases to 6px radius (from 3px default)
  - All OTHER lines dim to 0.1 opacity (from 1.0)
  - A tooltip shows the parameter name, value, and timestamp
- Clicking the background resets all lines to default appearance

#### 2.2.2 Individual Charts View

Renders 11 separate scrollable cards, each containing one parameter's chart. The user scrolls vertically through the cards.

```
┌──────────────────────────────────────────────────────────────┐
│  ┌────────────────────────────────────────────────────────┐  │
│  │  BP Systolic / Diastolic                               │  │
│  │  ╭──●──╮            ●                                  │  │
│  │  │     ╰──●──╮    ╱ ╲                                 │  │
│  │  │          ╰──●╯   ╰──●                              │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Heart Rate                                            │  │
│  │  ──●──╮     ╭──●──╮                                   │  │
│  │       ╰──●╯      ╰──●                                │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Temperature                                           │  │
│  │  ...                                                   │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ... (8 more cards: SpO2, RR, Arterial, Lying, Standing,    │
│       Sitting, CRT, Temp T1)                                │
└──────────────────────────────────────────────────────────────┘
```

**Individual chart specifics:**
- Each card has its own Y-axis range tuned to the parameter's clinical range
- BP cards render both Systolic and Diastolic on the same card (two lines)
- Same D3.js rendering pipeline as combined view, but isolated per parameter

#### 2.2.3 Table View

A horizontally scrollable data table with vital parameters as rows and recorded timestamps as columns.

```
┌──────────────────────────────────────────────────────────────────────────┐
│              │  08:00  │  12:00  │  16:00  │  20:00  │  08:00  │       │
│  Parameter   │  18/04  │  18/04  │  18/04  │  18/04  │  19/04  │  ...  │
├──────────────┼─────────┼─────────┼─────────┼─────────┼─────────┼───────┤
│  BP          │ 120/80  │ 118/76  │ 130/85  │ 122/78  │ 125/82  │       │
│  HR          │   72    │   78    │   80    │   76    │   74    │       │
│  Temp (°F)   │  98.6   │  99.1   │  98.8   │  98.6   │  98.4   │       │
│  SpO2        │   98    │   97    │   98    │   99    │   98    │       │
│  RR          │   16    │   18    │   17    │   16    │   15    │       │
│  Arterial BP │ 130/85  │  --     │ 128/82  │  --     │ 132/86  │       │
│  BP Lying    │ 118/74  │  --     │  --     │  --     │  --     │       │
│  BP Standing │ 125/80  │  --     │  --     │  --     │  --     │       │
│  BP Sitting  │ 120/76  │  --     │  --     │  --     │  --     │       │
│  CRT         │   2     │   2     │   3     │   2     │   2     │       │
│  Temp T1     │  37.0   │  37.2   │  37.1   │  37.0   │  36.9   │       │
│  CHEWS       │   1     │   2     │   1     │   0     │   1     │       │
│  Pain Score  │  3/Lt   │  2/Rt   │  --     │  1/Ab   │  --     │       │
│  ...         │         │         │         │         │         │       │
│  (24 rows)   │         │         │         │         │         │       │
└──────────────┴─────────┴─────────┴─────────┴─────────┴─────────┴───────┘
```

**Table-specific logic:**
- **24 desired test rows:** The table renders up to 24 rows covering all tracked parameters
- **DOM injection:** Table cells are rendered via direct DOM manipulation (innerHTML injection) rather than Angular template binding, for performance with large datasets
- **BP merge:** Systolic and Diastolic values are merged into a single "120/80" cell for compact display
- **Pain Score:** Renders as `{value}/{location}` (e.g., "3/Lt" for intensity 3, left side)
- **Temperature C to F inline:** If `default_temperature_to_be_celsius` is false, the C value is converted to F for display: `°F = (°C × 9/5) + 32`
- **Horizontal scroll:** Timestamps flow left-to-right; parameter labels remain fixed on the left as a sticky column

### 2.3 Date Range Selection

```
Page Load
  │
  ├── Determine default "from" date:
  │     if (wardCapability === 'ICU'):
  │       from = today (current day)
  │     else:
  │       from = today - 4 days
  │
  ├── Clamp to admission:
  │     if (from < admissionDate):
  │       from = admissionDate
  │
  └── to = today (always current day)

Calendar Button Tap
  │
  └── Open CalendarModalPage (modal)
        │
        ├── Two date pickers: "From" and "To"
        │
        ├── Validation Rules:
        │     1. from <= to                    (cannot select future range)
        │     2. from >= admissionDate         (cannot go before admission)
        │     3. to <= today                   (implicit -- calendar max date)
        │
        ├── On Apply:
        │     Dismiss modal with { from, to }
        │     Page re-fetches EHR_033 with new date range
        │     All three views re-render
        │
        └── On Cancel:
              Dismiss modal, no changes
```

---

## 3. Vital Trends -- D3.js Chart Configuration

### 3.1 D3.js Rendering Pipeline

```
EHR_033 API Response (raw vital records)
  │
  ├── 1. Parse & normalize:
  │     - Extract parameter values from nested response objects
  │     - Parse timestamps (recordedTime) → Date objects
  │     - Split combined BP "120/80" format by "/" into separate sys/dia values
  │     - Convert temperature C→F if configured
  │
  ├── 2. Build datasets:
  │     - Group by parameter type
  │     - Assign hex color from parameter config table
  │     - Sort by timestamp ascending within each dataset
  │
  ├── 3. D3.js scale setup:
  │     - X-axis: d3.scaleTime() spanning from-date to to-date
  │     - Y-axis: d3.scaleLinear() with 20-unit intervals
  │     - Margin: { top, right, bottom, left } per view mode
  │
  ├── 4. Render SVG elements:
  │     - Lines: d3.line() with dataset color
  │     - Circles: data points at each measurement
  │     - Axes: X with 5 ticks, Y duplicated in fixed div
  │     - Legend: interactive colored circles + labels
  │
  └── 5. Post-render:
        - Auto-scroll right after 1000ms delay (show most recent data)
        - Attach hover/tap event listeners
        - Listen for orientation change → full re-render
```

### 3.2 SVG Element Specifications

| Element | Property | Default | Hover/Selected |
|---------|----------|---------|----------------|
| Line (path) | stroke-width | 1.5px | 2.5px |
| Circle (data point) | radius | 3px | 6px |
| Selected line | opacity | 1.0 | 1.0 (maintained) |
| Other lines (on hover) | opacity | 1.0 | 0.1 (dimmed) |
| Background click | -- | -- | Resets all to default |

### 3.3 Axis Configuration

**X-Axis:**
- Tick count: 5 ticks (D3 auto-distributes across time range)
- Format: Two-line display -- `"HH:MM"` on line 1, `"DD/MM"` on line 2
- The two-line format is achieved via SVG tspan elements with dy offset

**Y-Axis:**
- Interval: 20 units between gridlines (e.g., 60, 80, 100, 120, 140, 160...)
- **Fixed position trick:** The Y-axis labels are rendered in a separate fixed-position `<div>` that does not scroll horizontally. This ensures Y-axis labels remain visible when the user scrolls the chart content to the right.
- Range: Auto-calculated from min/max values in the dataset, rounded to nearest 20

### 3.4 Responsive Behavior

```
Window resize / orientation change event
  │
  ├── Debounce (prevent rapid re-renders)
  │
  ├── Recalculate SVG dimensions from container size
  │
  ├── Remove existing SVG elements
  │
  └── Full re-render with new dimensions
        (same data, new scales, new layout)
```

### 3.5 Auto-Scroll Behavior

```
Chart render complete
  │
  └── setTimeout(1000ms)
        │
        └── Scroll chart container to rightmost position
              (shows most recent vital measurements first)
              scrollLeft = scrollWidth - clientWidth
```

---

## 4. Vital Trends -- BP Processing & Temperature Conversion

### 4.1 BP Processing Modes

The BP display format is controlled by the `enable_bp_as_individual` configuration key from MDM_002.

```
MDM_002 GET → key: "enable_bp_as_individual"
  │
  ├── enable_bp_as_individual = false (COMBINED mode, default):
  │     │
  │     ├── Raw data format: "120/80" (single string field)
  │     │
  │     ├── Parsing:
  │     │     value.split("/")
  │     │     systolic = parseInt(parts[0])    // 120
  │     │     diastolic = parseInt(parts[1])   // 80
  │     │
  │     ├── Graph: Two separate lines plotted (BP Sys + BP Dia)
  │     │          but sourced from the same combined field
  │     │
  │     └── Table: Single cell showing "120/80"
  │
  └── enable_bp_as_individual = true (INDIVIDUAL mode):
        │
        ├── Raw data format: Two separate fields
        │     "Systolic BP" = 120
        │     "Diastolic BP" = 80
        │
        ├── Graph: Two separate lines plotted directly
        │
        └── Table: Merged back to "120/80" for compact display
```

### 4.2 Positional BP Processing

Positional BPs (Lying, Standing, Sitting) each have dedicated Systolic/Diastolic pairs with distinct color codes:

```typescript
// Each positional BP uses TWO hex colors (sys color / dia color)
BP_LYING:    { sys: '#5fb5c9', dia: '#bfdd34' }
BP_STANDING: { sys: '#acee94', dia: '#26697e' }
BP_SITTING:  { sys: '#d56fc3', dia: '#6700ff' }

// Same split logic as standard BP
// Combined format: "120/80" → split by "/"
// Individual format: separate Systolic/Diastolic fields
```

### 4.3 Temperature Conversion

```
MDM_002 GET → key: "default_temperature_to_be_celsius"
  │
  ├── default_temperature_to_be_celsius = true:
  │     Display in Celsius (no conversion)
  │     Label: "°C"
  │
  └── default_temperature_to_be_celsius = false:
        Convert to Fahrenheit:
          °F = (°C × 9/5) + 32
        Label: "°F"

// Conversion applied to both:
//   - Temp (primary sensor, color #ce5252)
//   - Temp T1 (secondary sensor, color #1C629B)
```

**Inline table conversion:** In table view, the conversion happens at render time. The raw data always comes from the server in Celsius. The C-to-F formula is applied per-cell before DOM injection.

### 4.4 ECG Viewer

```
[ECG] button tap (requires online connection)
  │
  ├── Network check:
  │     if (offline): show toast "ECG requires internet connection", return
  │
  └── Open PatientEcgPage as modal
        │
        ├── Fetch ECG data:
        │     GET api/athma/_search/patient-vitals-device_info
        │     Params: patient MRN, encounter number
        │
        └── Render:
              iframe-based ECG viewer
              External ECG rendering service URL loaded in iframe
              Patient context passed as URL parameters
```

---

## 5. Past Records -- Consultation History

### 5.1 Two-Segment Layout

```
┌──────────────────────────────────────────────────────────────┐
│  [<]  Past Records                                           │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────────────┬──────────────────┐                     │
│  │    Overview       │      Tests       │                     │  ← ion-segment
│  └──────────────────┴──────────────────┘                     │
│                                                              │
│  SEGMENT CONTENT AREA                                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 Overview Segment -- Consultation History

Displays past consultations (visits) with pagination: 5 per page, infinite scroll for more.

```
┌──────────────────────────────────────────────────────────────┐
│  OVERVIEW                                                    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  📋 OP Visit -- 15 Apr 2026                            │  │
│  │  Dr. Sharma (Cardiology)                               │  │
│  │  Chief Complaint: Chest pain                           │  │
│  │  [View Summary] [Medications] [Investigations]         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  🏥 IP Visit -- 02 Mar 2026                            │  │
│  │  Dr. Reddy (General Surgery)                           │  │
│  │  Admission Reason: Appendicitis                        │  │
│  │  [View Summary] [Medications] [Investigations]         │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ... (infinite scroll loads next 5)                          │
└──────────────────────────────────────────────────────────────┘
```

#### 5.2.1 Visit Type Classification

The visit type is determined from `encounterClass.code` in the consultation response:

| encounterClass.code | Display Label | Data Source | Summary Type |
|---------------------|---------------|-------------|--------------|
| `OP` | Outpatient Visit | EHR consultation data | OP summary |
| `IP` | Inpatient Visit | Discharge summary | IP discharge summary |
| `ER` | Emergency Visit | ER records | ER summary |
| `DC` | Daycare Visit | Daycare records | DC summary |

#### 5.2.2 Per-Consultation API Loading

Each consultation card triggers 3-4 parallel API calls to load its data:

```
Consultation card appears (via scroll or page load)
  │
  ├── Call 1: OP/IP Summary
  │     OP → GET EHR consultation summary
  │     IP → GET discharge summary
  │
  ├── Call 2: Investigations
  │     GET investigation list for encounter
  │
  ├── Call 3: Attachments
  │     GET attachments list for encounter
  │
  └── Call 4 (conditional): IA Check
        GET initial assessment existence check
        (determines if "View IA" button is shown)

All 4 calls execute in parallel (Promise.all / forkJoin pattern)
Results populate the consultation card once all resolve
```

### 5.3 Tests Segment

The Tests segment has four sub-segments (sub-tabs within the Tests tab):

```
┌──────────────────────────────────────────────────────────────┐
│  TESTS                                                       │
│                                                              │
│  ┌───────┬───────┬───────┬──────────────┐                   │
│  │  LAB  │  RAD  │ Other │  Attachment   │                   │  ← sub-segments
│  └───────┴───────┴───────┴──────────────┘                   │
│                                                              │
│  (sub-segment content)                                       │
└──────────────────────────────────────────────────────────────┘
```

| Sub-Segment | Content | Source |
|-------------|---------|--------|
| LAB | Laboratory test results | Same LabResultProcesserUtil pipeline as Flow 04 |
| RAD | Radiology reports and images | Investigation reports with RAD type |
| Other | Other investigation reports | Non-LAB, non-RAD results |
| Attachment | Uploaded documents/files | EHR_096 attachment download |

---

## 6. Past Records -- Lab/RAD/Other/Attachment Views

### 6.1 Lab Result Processing

Lab results in Past Records reuse the same `LabResultProcesserUtil` 5-step pipeline documented in Flow 04:

```
Raw EHR response
  │
  ├── Step 1: Flatten nested service hierarchies (up to 3 levels)
  ├── Step 2: Group by orderDate
  ├── Step 3: Sort groups descending (most recent first)
  ├── Step 4: Apply abnormal flag classification
  └── Step 5: Render result matrix
```

**Abnormal flag rendering:**

| Flag Code | Classification | Icon | CSS Class |
|-----------|---------------|------|-----------|
| `N` | Normal | (none -- default styling) | default |
| `L` | Low | `low-result.svg` | `abnormal-color` |
| `PL` | Panic Low | `low-result.svg` | `abnormal-color` |
| `AL` | Abnormally Low | `low-result.svg` | `abnormal-color` |
| `H` | High | `high-result.svg` | `abnormal-color` |
| `PH` | Panic High | `high-result.svg` | `abnormal-color` |
| `AH` | Abnormally High | `high-result.svg` | `abnormal-color` |

### 6.2 PastRecordsInvestigationPage (Modal)

Handles 6 distinct report types with different download endpoints:

```
Report tap → open PastRecordsInvestigationPage modal
  │
  ├── Determine reportType from investigation record:
  │
  │   ┌─────────────┬────────────────────────────────────────────────────────┐
  │   │ Report Type │ Download Endpoint                                      │
  │   ├─────────────┼────────────────────────────────────────────────────────┤
  │   │ ATTACHMENT  │ api/_download/investigationreport/{id}?reportType=ATTACHMENT │
  │   │ EXTERNAL    │ api/_download/investigationreport/{id}?reportType=EXTERNAL   │
  │   │ DIAGNOSTIC  │ api/_download/investigationreport/{id}?reportType=DIAGNOSTIC │
  │   │ LIS         │ api/_download/investigationreport/{id}?reportType=LIS        │
  │   │ RIS         │ api/_download/investigationreport/{id}?reportType=RIS        │
  │   │ SRM         │ api/_download/investigationreport/{id}?reportType=SRM        │
  │   └─────────────┴────────────────────────────────────────────────────────┘
  │
  │   All use: Authorization: Bearer {token} (no athmaToken needed)
  │
  ├── RAD image download (separate endpoint):
  │     GET api/media/download?filePath={encodedPath}
  │     Authorization: Bearer {token}
  │     De-duplication: RAD images are deduplicated by filePath before display
  │
  └── Render in GalleryViewPage or inline viewer
```

### 6.3 PastRecordsMedicationPage (Modal)

Displays medication details from a past consultation.

```
┌──────────────────────────────────────────────────────────────┐
│  [X]  Past Medications                                       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  (B) Clopidogrel 75mg                    [ACTIVE]     │  │
│  │  Route: Oral | Frequency: OD                          │  │
│  │  Instructions: Take after food                        │  │
│  │  IP Notes: Continue post discharge                    │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  (G) Atorvastatin 20mg                   [STOPPED]    │  │
│  │  Route: Oral | Frequency: HS                          │  │
│  │  Instructions: Take at bedtime                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Display details:**
- **Brand/Generic icon:** `(B)` for brand medications, `(G)` for generic medications
- **Medication status:** ACTIVE, STOPPED, CANCELLED, etc.
- **Instruction text:** Dosing instructions from the prescribing doctor
- **IP notes:** Inpatient-specific notes (only shown if present, IP encounters only)

### 6.4 PastRecordsAttachmentsPage (Modal)

Downloads attachments using a different auth pattern than investigation reports:

```
Attachment download flow:
  │
  ├── Endpoint: GET api/athma/_download/athma-file-with-token
  │     Query: athmaUrlCode=EHR_096
  │     Headers:
  │       Authorization: Bearer {accessToken}
  │       athmaToken: {athmaToken}               ← DUAL auth required
  │
  ├── Filename cleanup:
  │     Remove server-generated prefixes/suffixes from filename
  │     Extract original filename for display
  │
  └── Open in GalleryViewPage or system file viewer
```

### 6.5 "View Similar Reports" in GalleryView

The Gallery View page (used by both Past Records and other contexts) supports a "View Similar Reports" toggle via the `groupParam` mechanism:

```
Toggle "View Similar Reports"
  │
  ├── ON: Filter displayed files to same report group
  │       (e.g., all CBC reports across dates)
  │       groupParam matches against report type/category
  │
  └── OFF: Show all reports in chronological order
```

---

## 7. Past Records -- Summary Card (30+ Clinical Concepts)

### 7.1 PastRecordsSummaryPage (Modal)

This modal renders the full clinical summary for a past consultation. It supports 30+ clinical concept types, each rendered as a distinct section.

```
┌──────────────────────────────────────────────────────────────┐
│  [X]  Clinical Summary -- OP Visit 15 Apr 2026              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ── Chief Complaints ──────────────────────────────────────  │
│  Chest pain, radiating to left arm, onset 2 hours ago       │
│                                                              │
│  ── History of Present Illness ────────────────────────────  │
│  Patient reports acute onset chest pain...                   │
│                                                              │
│  ── Vital Signs ───────────────────────────────────────────  │
│  BP: 140/90 | HR: 92 | Temp: 98.6°F | SpO2: 97%           │
│                                                              │
│  ── Allergies ─────────────────────────────────────────────  │
│  Penicillin (Severe - Anaphylaxis)                          │
│                                                              │
│  ── Past Medical History ──────────────────────────────────  │
│  Hypertension (5 years), Diabetes Mellitus Type 2           │
│                                                              │
│  ── Diagnosis ─────────────────────────────────────────────  │
│  Acute Coronary Syndrome (ICD-10: I21.9)                    │
│                                                              │
│  ── Medications ───────────────────────────────────────────  │
│  1. Aspirin 325mg STAT                                      │
│  2. Clopidogrel 300mg STAT                                  │
│                                                              │
│  ── Investigations ────────────────────────────────────────  │
│  CBC, Troponin I, ECG, Chest X-Ray                          │
│                                                              │
│  ... (30+ sections based on available data)                 │
│                                                              │
│  ── Obstetrics / Gynaecology ──────────────────────────────  │
│  (rendered only if OB/GYN data exists)                      │
│  LMP: 15-Mar-2026 | Gravida: 2 | Para: 1                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 7.2 Clinical Concept Types (30+)

The summary page iterates over a list of clinical concept type codes returned by the server. Each type maps to a specific rendering template:

| # | Concept Type | Rendering Notes |
|---|-------------|-----------------|
| 1 | Chief Complaints | Text list |
| 2 | History of Present Illness (HPI) | Rich text block |
| 3 | Allergies | Name + severity + reaction |
| 4 | Past Medical History | Condition list with duration |
| 5 | Surgical History | Procedure + date |
| 6 | Family History | Relation + condition |
| 7 | Social History | Substance use, occupation |
| 8 | Personal History | Lifestyle factors |
| 9 | Vital Signs | BP special handling (see below) |
| 10 | General Examination | Free text findings |
| 11 | Systemic Examination | Organ-system findings |
| 12 | Provisional Diagnosis | ICD codes + description |
| 13 | Final Diagnosis | ICD codes + description |
| 14 | Differential Diagnosis | Ranked alternatives |
| 15 | Investigations Advised | Test names + priority |
| 16 | Medications | Drug + dose + frequency + route |
| 17 | Treatment Plan | Free text |
| 18 | Discharge Planning | Instructions + follow-up |
| 19 | Comorbidities | Condition list |
| 20 | Communicable Diseases | Assessment data |
| 21 | Lines and Tubes | Type + insertion date + site |
| 22 | Implantable Devices | Device type + details |
| 23 | Psychological Assessment | Screening results |
| 24 | Obstetrics History | LMP, gravida, para, EDD |
| 25 | Gynaecology History | Menstrual history, procedures |
| 26 | Radiation Oncology | Treatment protocol |
| 27 | General Impression | Clinical assessment |
| 28 | MLC (Medico-Legal Case) | Legal documentation |
| 29 | Primary Survey | Trauma assessment (ABCDE) |
| 30 | Past Medication & Reconciliation | Medication reconciliation |
| ... | (additional types per facility) | Dynamically rendered |

### 7.3 Vital BP Special Handling in Summary

```
Vital Signs section rendering:
  │
  ├── Standard vitals: HR, Temp, SpO2, RR → direct value display
  │
  └── BP: Special merge/display logic
        │
        ├── If combined format "120/80":
        │     Display as-is: "BP: 120/80 mmHg"
        │
        ├── If individual format (separate sys/dia fields):
        │     Merge: "BP: {systolic}/{diastolic} mmHg"
        │
        └── Positional BPs (if present):
              "BP Lying: 118/74"
              "BP Standing: 125/80"
              "BP Sitting: 120/76"
```

### 7.4 Obstetrics/Gynaecology Section

This section is conditionally rendered only when OB/GYN data exists in the consultation:

```
if (summary.hasObstetricsData || summary.hasGynaecologyData):
  │
  ├── Obstetrics:
  │     LMP (Last Menstrual Period)
  │     Gravida / Para / Aborta
  │     EDD (Expected Date of Delivery)
  │     Gestational Age
  │     ANC (Antenatal Care) details
  │
  └── Gynaecology:
        Menstrual History
        Pap Smear results
        Previous gynaecological procedures
```

---

## 8. Gallery View & Image Editing

### 8.1 GalleryViewPage (244 lines)

A multi-format file viewer that handles both PDFs and images, with file-to-file navigation and authentication-aware downloads.

```
┌──────────────────────────────────────────────────────────────┐
│  [<]  Report Viewer                    [1 / 5]  [< ] [> ]   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │                                                        │  │
│  │              (PDF or Image rendered here)              │  │
│  │                                                        │  │
│  │          PDF: ng2-pdf-viewer component                 │  │
│  │          Image: ngx-pinch-zoom-16 component            │  │
│  │                                                        │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  [View Similar Reports]  (toggle)                            │
└──────────────────────────────────────────────────────────────┘
```

#### 8.1.1 Download Pipeline

```
File URL received (from Past Records / Investigation / Attachment)
  │
  ├── Download via fetch():
  │     Headers:
  │       Authorization: Bearer {accessToken}
  │       athmaToken: {athmaToken}      ← optional, only for EHR_096 attachments
  │
  ├── Convert response to base64:
  │     Response → ArrayBuffer → Uint8Array → base64 string
  │
  ├── Write to device filesystem:
  │     Directory: Directory.Data/gv/
  │     Filename: original filename or generated
  │     Content: base64-encoded data
  │
  └── Render:
        ├── PDF files → ng2-pdf-viewer component
        │     Renders PDF pages with scroll
        │
        └── Image files → ngx-pinch-zoom-16 component
              Pinch-to-zoom and pan gestures
```

#### 8.1.2 File Navigation

```
Navigation controls: [BACK] and [NEXT] buttons with counter display

Current file: index N of total M files
  │
  ├── [BACK] → index = max(0, index - 1)
  │     Downloads and renders previous file
  │
  ├── [NEXT] → index = min(M-1, index + 1)
  │     Downloads and renders next file
  │
  └── Counter: "{current} / {total}" (e.g., "3 / 7")
```

### 8.2 ImageEditingModalPage (390 lines)

A modal-based image editor used for capturing and editing images before upload (e.g., for incident reports, attachments).

#### 8.2.1 Image Capture

```
┌──────────────────────────────────────────────────────────────┐
│  [X]  Edit Image                                [Save]       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                                                        │  │
│  │              angular-cropperjs component               │  │
│  │              (free aspect ratio, autoCrop: false)      │  │
│  │                                                        │  │
│  │         ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐                 │  │
│  │         │                           │                 │  │
│  │         │    (crop selection box)    │                 │  │
│  │         │                           │                 │  │
│  │         └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘                 │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  [Camera] [Gallery]     [Rotate ↻] [Rotate ↺]              │
│                                                              │
│  Images: [img1] [img2] [img3] ... (max 8)                   │
└──────────────────────────────────────────────────────────────┘
```

#### 8.2.2 Capture Sources

| Source | Capacitor API | Configuration |
|--------|--------------|---------------|
| Camera | `Camera.getPhoto()` | quality: 50, width: 800, height: 1250, correctOrientation: true |
| Gallery | `Camera.getPhoto()` (gallery source) | Multi-select, limit: 8 images total |

#### 8.2.3 Editing Operations

```
Crop:
  │
  ├── Library: angular-cropperjs
  ├── Aspect ratio: free (no constraint)
  ├── autoCrop: false (user must manually draw crop region)
  └── Apply: extracts cropped region as new image

Rotate:
  │
  ├── Rotate +90° (clockwise)
  ├── Rotate -90° (counter-clockwise)
  └── Implementation: CSS transform with correction
        The rotation is applied via CSS transform property
        Correction logic accounts for cropper coordinate system

Save:
  │
  ├── Format: JPEG
  ├── Quality: 80%
  ├── Filename: timestamp-based (e.g., "1713800000000.jpg")
  └── Output: base64-encoded JPEG string
```

#### 8.2.4 Image Limit & Close Behavior

```
Max images: 8 (hard limit)
  │
  ├── Adding 9th image: blocked, user cannot add more
  │
  └── UI: image thumbnails row shows all captured images
        Each thumbnail has [X] remove button

Close (X button):
  │
  ├── If unsaved changes exist:
  │     Show confirmation dialog:
  │       "Discard changes?"
  │       [Cancel] → stay in editor
  │       [Discard] → dismiss modal without saving
  │
  └── If no changes:
        Dismiss modal immediately
```

---

## 9. Offline Architecture

### 9.1 Storage Layer Overview

AADI uses three complementary storage mechanisms to support offline operation:

```
┌──────────────────────────────────────────────────────────────────────┐
│                         STORAGE ARCHITECTURE                         │
│                                                                      │
│  ┌──────────────────────┐  ┌─────────────────┐  ┌────────────────┐  │
│  │   SQLite DB "aadi"   │  │  SecureStorage   │  │   Filesystem   │  │
│  │   (encrypted)        │  │  (63 keys)       │  │   (cached)     │  │
│  │                      │  │                  │  │                │  │
│  │  patient_info        │  │  In-memory       │  │  Dir.Data/     │  │
│  │  messages            │  │  cache layer     │  │  ├── {MRN}/    │  │
│  │  care_team           │  │                  │  │  │  ├── IMAGE/ │  │
│  │  error_messages      │  │  Android         │  │  │  ├── AUDIO/ │  │
│  │                      │  │  Keystore        │  │  │  ├── VIDEO/ │  │
│  │  28-char cipher key  │  │  backing         │  │  │  ├── DOC/   │  │
│  │  (22 alpha + 6 num)  │  │                  │  │  │  └── PDF/   │  │
│  │                      │  │  Migration from  │  │  └── gv/       │  │
│  │  12 indices          │  │  localStorage    │  │     (gallery)  │  │
│  └──────────────────────┘  └─────────────────┘  └────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### 9.2 SQLite Encrypted Database

**Database name:** `aadi`
**Encryption:** SQLite cipher with a 28-character random key (22 alphanumeric characters + 6-digit number)
**Key storage:** The cipher key is stored in SecureStorage, which uses Android Keystore for hardware-backed encryption.

#### Tables

| Table | Columns | FK | Purpose |
|-------|---------|-----|---------|
| `patient_info` | 35+ columns (id PK, mrn, name, birth_date, gender, unit, unit_code, location, encounter_number, admission_number, primary_consultant, ip_activity_action, risk_score, ward_capability, comorbidities, unread_msg_count, pin_flag, pin_order, discharge_intimation, last_sync_time, ...) | -- | Patient roster with clinical context |
| `messages` | 21 columns (id, patient_info_id FK, mrn, category, sub_category, content_type, content, sender_login, sender_name, sent_time, action_id PK for dedup, msg_status, acs_message_id, read, ...) | patient_info_id → patient_info ON DELETE CASCADE | Chat and notification messages |
| `care_team` | 11 columns (patient_info_id FK, mrn, user_login, user_name, primary_consultant JSON, careTeam JSON array, active, ...) | patient_info_id → patient_info ON DELETE CASCADE | Care team membership |
| `error_messages` | 3+ columns (url, description, eventtimer) | -- | Auth error tracking |

#### Indices (12 total)

```
patient_info:
  idx_PI_mrn
  idx_PI_last_msg_time DESC
  idx_PI_location
  idx_PI_ip_activity_action
  idx_PI_pin_flag DESC
  idx_PI_ward_sort
  idx_pi_visit_type
  idx_pi_mlc
  idx_pi_primary_consultant
  idx_PI_attending_consultant_login
  idx_PI_consultant_handover_status
  idx_pi_discharge_intimation

messages:
  idx_PM_sent_time DESC
  idx_PM_category
  idx_PM_msg_delete
  idx_PM_msg_status
  idx_PM_message_id
  idx_PM_read
```

### 9.3 SecureStorage with In-Memory Cache

63 keys are stored in SecureStorage (Capacitor plugin backed by Android Keystore). The app maintains an in-memory cache to avoid repeated async reads:

```
SecureStorage Architecture:
  │
  ├── Write: SecureStorage.set(key, value) + memoryCache[key] = value
  │
  ├── Read:
  │     1. Check memoryCache[key]
  │     2. If miss → SecureStorage.get(key)
  │     3. Populate memoryCache on hit
  │
  └── Migration:
        On version upgrade, keys are migrated from
        localStorage → SecureStorage (one-time operation)
```

**Key categories (63 keys):**

| Category | Example Keys | Count |
|----------|-------------|-------|
| Auth | AUTHENTICATION_TOKEN, TOKEN_CONFIG, LOGIN_CREDENTIAL, LOGGED_IN, ATHMA_TOKEN, ATHMA_TOKEN_TIME | ~6 |
| Chat/ACS | USER_ACS_ID, USER_ACS_TOKEN, ACS_TOKEN_EXPIRY_DATE, LAST_MSG_INIT_TIME | ~4 |
| Device | FCM_TOKEN, DOMAIN, APP_VERSION | ~3 |
| Sync | LAST_SYNC_TIME, ALL_PATIENT_LIST_LOAD_FROM_SERVER_DONE, ALL_PATIENT_MSG_LOAD_DONE | ~3 |
| UI State | LAST_VIEW_MODULE, FILTER_SUBMIT, RESULT_FILTER_SUBMIT, SORT_BY_DETAIL | ~4 |
| Config | CLIENT, USER_GROUP, LOCALE, COUNTRY | ~4 |
| Clinical | Various cached clinical settings, MDM configs, feature flags | ~39 |

### 9.4 Network Monitoring

```
Capacitor Network Plugin
  │
  ├── Network.addListener('networkStatusChange', handler)
  │     handler updates BehaviorSubject<boolean> isOnline$
  │
  ├── Components subscribe to isOnline$:
  │     │
  │     ├── isOnline = true:
  │     │     Enable all features
  │     │     Trigger pending message sync
  │     │     Reconnect ACS WebSocket
  │     │
  │     └── isOnline = false:
  │           Disable online-only features
  │           Queue outgoing messages as NOT_SENT
  │           Show offline indicator
  │
  └── Initial check: Network.getStatus() on app launch
```

### 9.5 Online Sync (5-Minute Interval)

```
Message Sync Timer:
  │
  ├── Interval: 300,000ms (5 minutes)
  │
  ├── On tick (if online):
  │     1. Calculate offline duration since last sync
  │     2. Fetch missed messages from server
  │     3. Insert into SQLite messages table (dedup by action_id)
  │     4. Upload pending messages (msg_status = NOT_SENT)
  │     5. Update last_sync_time
  │     6. Reconnect ACS if needed
  │
  └── On app resume:
        Immediate sync (does not wait for next interval)
```

### 9.6 Feature Availability by Network State

| Feature | Offline | Online |
|---------|---------|--------|
| View patient list | YES (SQLite) | YES (server + SQLite) |
| View cached messages | YES (SQLite) | YES (server + SQLite) |
| Compose messages (queued) | YES (stored as NOT_SENT) | YES (sent immediately) |
| View cached files | YES (Filesystem) | YES (Filesystem + server) |
| View care team | YES (SQLite) | YES (server + SQLite) |
| **Vital Trends** | NO (requires EHR_033) | YES |
| **Past Records** | NO (requires multiple APIs) | YES |
| **Lab Results** | NO (requires EHR_104/LIS_003) | YES |
| **Video Consultation** | NO (requires Agora/ACS) | YES |
| **Medication Ordering** | NO (requires EHR_021) | YES |
| **Progress Notes Create** | NO (requires EHR_034) | YES |
| **Discharge Summary** | NO (requires DS_001) | YES |
| **Image/File Upload** | NO (requires server) | YES |
| **ECG Viewer** | NO (iframe + external service) | YES |

---

## 10. Platform Features

### 10.1 Notification Preferences

```
┌──────────────────────────────────────────────────────────────┐
│  [<]  Notification Preferences                               │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  🔒 New Admission                        [━━━●]      │  │  ← mandatory (locked)
│  │  🔒 Lab Results Available                [━━━●]      │  │  ← mandatory (locked)
│  │  🔒 Critical Alert                       [━━━●]      │  │  ← mandatory (locked)
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │     Discharge Summary Ready              [━━━●]      │  │  ← optional (toggleable)
│  │     Medication Order Update              [●━━━]      │  │  ← optional (toggleable)
│  │     Progress Notes Published             [━━━●]      │  │  ← optional (toggleable)
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  [Save]  (enabled only when changes detected)                │
└──────────────────────────────────────────────────────────────┘
```

#### 10.1.1 Data Flow

```
Page Load:
  │
  └── GET api/_search/user-notification-preferences/{login}
        │
        ├── Response: array of preference objects
        │     { id, name, code, mandatory: boolean, enabled: boolean }
        │
        ├── Separate into:
        │     mandatory items → toggle disabled, lock icon shown
        │     optional items → toggle enabled
        │
        └── Store initial state as JSON.stringify(preferences)
              (used for change detection)

User toggles a preference:
  │
  ├── Update local preference object
  │
  └── Compare JSON.stringify(current) !== JSON.stringify(initial)
        │
        ├── Different → enable [Save] button
        └── Same → disable [Save] button

Save:
  │
  └── PUT api/_update/user-notification-preferences/{login}
        Body: updated preferences array
        observe: 'response' (to check HTTP status)
        │
        ├── 200 OK → toast "Preferences saved", update initial state
        └── Error → toast with server error message
```

### 10.2 Feedback / Survey System

```
Feedback Flow:
  │
  ├── Load completed feedback:
  │     GET api/_load/my-customer-feedback-list/{login}
  │     Returns: array of completed survey records
  │
  ├── Load pending feedback:
  │     GET api/_load/my-pending-customer-feedback-list/{login}
  │     Returns: array of pending survey URLs
  │
  ├── Display:
  │     List of feedback items with status (completed / pending)
  │
  ├── Open pending survey:
  │     Browser.open({ url: survey.externalUrl })
  │     Opens in system browser (not in-app webview)
  │
  └── Mark as viewed:
        POST api/_update/customer-feedback-view-status/{login}
        Body: feedback ID
        (prevents re-showing already viewed surveys)
```

### 10.3 Downtime Detection

```
App Startup / Periodic Check:
  │
  └── GET api/_load/down-time-info
        │
        ├── Response: { startTime, endTime, message }
        │
        ├── Store downtime window in local state
        │
        └── On any user action:
              │
              ├── Check: is current time within [startTime, endTime]?
              │
              ├── YES (maintenance active):
              │     Show toast: "{message}" (server-provided maintenance message)
              │     Block the action (API call is not made)
              │     Return without executing
              │
              └── NO (outside maintenance window):
                    Proceed normally
```

### 10.4 FAQ

A static FAQ page with minimal content:

```
┌──────────────────────────────────────────────────────────────┐
│  [<]  FAQ                                                    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Q: How do I delete my account?                              │
│                                                              │
│  A: To request account deletion, please send an email to:    │
│     {dynamic_email}@{facility_domain}                        │
│                                                              │
│     The email address varies per client facility.            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Details:**
- Single FAQ entry: "How do I delete my account?"
- The contact email is dynamically set based on the client facility configuration
- No server API call -- content is embedded in the page with dynamic email substitution

### 10.5 What's New (Version Check)

```
Version Check Flow:
  │
  ├── Compare versions:
  │     currentVersion = app's installed version (e.g., "2.35.0")
  │     latestVersion = server-reported latest version
  │
  ├── if (currentVersion < latestVersion):
  │     Show "What's New" card/banner:
  │       "A new version ({latestVersion}) is available!"
  │       [Update] button
  │
  └── [Update] tap:
        Open Google Play Store page for AADI app
        URL: market://details?id=org.nh.app.aadi
        (or HTTPS fallback for devices without Play Store app)
```

### 10.6 Discharged Patients

```
┌──────────────────────────────────────────────────────────────┐
│  [<]  Discharged Patients                                    │
├──────────────────────────────────────────────────────────────┤
│  [Search by name or MRN...]                                  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  John Smith (MRN: 123456)                              │  │
│  │  Discharged: 20-Apr-2026                               │  │
│  │  Unit: Cardiology                                      │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Jane Doe (MRN: 789012)                                │  │
│  │  Discharged: 19-Apr-2026                               │  │
│  │  Unit: Orthopedics                                     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### 10.6.1 Data Source

```
List:   GET api/_search/recent-discharge-patients
Count:  GET api/count/recent-discharge-patients
```

#### 10.6.2 Search

Client-side filtering on the loaded patient list. No server-side search API -- the full discharged patient list is loaded upfront, and the search input filters locally by patient name or MRN.

#### 10.6.3 Navigation

Tapping a discharged patient navigates to their `DischargeSummaryPage` in **read-only mode**. The discharge summary contains the complete clinical journey documentation.

---

## 11. Complete API Reference

### 11.1 Vital Trends APIs

| Code | Method | Endpoint | Purpose | Parameters |
|------|--------|----------|---------|------------|
| EHR_033 | GET | `api/athma/_search/athma-records-with-token` | Fetch vital records | `athmaUrlCode=EHR_033`, query: mrn + encounter + dateRange, `size=1000`, `sort=recordedTime,desc` |
| MDM_002 | GET | `api/athma/_search/athma-records-with-token` | BP/Temp config | `athmaUrlCode=MDM_002`, keys: `enable_bp_as_individual`, `default_temperature_to_be_celsius` |
| -- | GET | `api/athma/_search/patient-vitals-device_info` | ECG device data | Patient MRN + encounter |

### 11.2 Past Records APIs

| Code/Method | Endpoint | Purpose | Notes |
|-------------|----------|---------|-------|
| GET | `api/athma/_search/athma-records-with-token` | Consultation history | Various EHR codes for OP/IP/ER/DC summaries |
| GET | `api/_download/investigationreport/{id}` | Download investigation report | `?reportType={ATTACHMENT|EXTERNAL|DIAGNOSTIC|LIS|RIS|SRM}`, Bearer auth |
| GET | `api/media/download` | Download RAD images | `?filePath={encodedPath}`, Bearer auth |
| EHR_096 | GET | `api/athma/_download/athma-file-with-token` | Download attachments | `athmaUrlCode=EHR_096`, Bearer + athmaToken |
| EHR_104 | GET | `api/athma/_search/athma-records-with-token` | Search investigations | Lab/RAD/Other grouping |

### 11.3 Gallery & Image APIs

| Method | Endpoint | Purpose | Notes |
|--------|----------|---------|-------|
| GET (fetch) | Various download URLs | File download | Bearer + optional athmaToken |
| -- | Capacitor Filesystem | Write to Directory.Data/gv/ | base64 encoding |
| -- | Capacitor Camera | Capture/select images | quality: 50, 800x1250 |

### 11.4 Offline/Sync APIs

| Method | Endpoint | Purpose | Notes |
|--------|----------|---------|-------|
| GET | `api/my-patient-list` | Sync patient list | Results cached to SQLite |
| GET | `api/care-teams/patient/{mrn}` | Sync care team | Results cached to SQLite |
| -- | Capacitor Network | Monitor connectivity | BehaviorSubject isOnline$ |
| -- | SQLite queries | Local data access | Encrypted DB "aadi" |

### 11.5 Notification Preferences APIs

| Method | Endpoint | Purpose | Notes |
|--------|----------|---------|-------|
| GET | `api/_search/user-notification-preferences/{login}` | Fetch preferences | Returns mandatory + optional items |
| PUT | `api/_update/user-notification-preferences/{login}` | Save preferences | `observe: 'response'`, full preferences array body |

### 11.6 Feedback APIs

| Method | Endpoint | Purpose | Notes |
|--------|----------|---------|-------|
| GET | `api/_load/my-customer-feedback-list/{login}` | Completed feedback list | |
| GET | `api/_load/my-pending-customer-feedback-list/{login}` | Pending surveys | Returns survey URLs |
| POST | `api/_update/customer-feedback-view-status/{login}` | Mark feedback viewed | Prevents re-display |

### 11.7 Downtime API

| Method | Endpoint | Purpose | Notes |
|--------|----------|---------|-------|
| GET | `api/_load/down-time-info` | Get maintenance window | Returns startTime, endTime, message |

### 11.8 Discharged Patients APIs

| Method | Endpoint | Purpose | Notes |
|--------|----------|---------|-------|
| GET | `api/_search/recent-discharge-patients` | Full discharged patient list | Client-side search |
| GET | `api/count/recent-discharge-patients` | Count only | For badge display |

### 11.9 Version Check API

| Method | Endpoint | Purpose | Notes |
|--------|----------|---------|-------|
| -- | Play Store / server config | Get latest version | Compared against installed version |

---

## 12. Error Handling

### 12.1 Vital Trends Errors

| Scenario | HTTP | User Feedback | Recovery |
|----------|------|--------------|----------|
| EHR_033 returns empty dataset | 200 (empty) | "No vital data available for selected date range" | Adjust date range |
| Date validation: from > to | -- | "From date must be before To date" (client-side) | Fix date selection |
| Date validation: from < admission | -- | "Cannot select date before admission" (client-side) | Adjust from date |
| D3.js render failure | -- | Chart area blank, no SVG rendered | Refresh page |
| ECG offline | -- | "ECG requires internet connection" (toast) | Connect to network |
| ECG iframe load failure | -- | Blank iframe or error page | Retry with connectivity |
| MDM_002 config fetch failure | 4xx/5xx | Falls back to default: combined BP, Celsius | Retry |

### 12.2 Past Records Errors

| Scenario | HTTP | User Feedback | Recovery |
|----------|------|--------------|----------|
| No past consultations | 200 (empty) | Empty state message | Expected for new patients |
| Parallel API partial failure | Mixed | Failed sections show error/blank | Retry scroll (triggers re-fetch) |
| Investigation download failure | 4xx/5xx | "Failed to download report" (toast) | Retry download |
| RAD image not found | 404 | Image placeholder or skip | Check server availability |
| Attachment download (athmaToken expired) | 401/403 | Token refresh → retry | Auto-retry after token refresh |
| Infinite scroll error | 4xx/5xx | Stop loading indicator, show retry | Pull-to-refresh |

### 12.3 Gallery/Image Editing Errors

| Scenario | HTTP | User Feedback | Recovery |
|----------|------|--------------|----------|
| File download failure | 4xx/5xx | "Failed to load file" | Retry |
| PDF render failure | -- | Blank viewer area | Re-download file |
| Image capture cancelled | -- | No action (user-initiated) | Retry capture |
| Camera permission denied | -- | Platform permission dialog | Grant permission in settings |
| Max 8 images exceeded | -- | Add button disabled / blocked | Remove existing images |
| Filesystem write failure | -- | "Failed to save file" | Check device storage |
| Crop with no selection | -- | Save produces original (uncropped) | Select crop region |

### 12.4 Offline/Network Errors

| Scenario | HTTP | User Feedback | Recovery |
|----------|------|--------------|----------|
| Network lost during API call | timeout | "No internet connection" (toast) | Queue message, wait for reconnection |
| SQLite DB corruption | -- | App may crash or show empty data | Clear app data, re-login |
| SecureStorage read failure | -- | Falls back to empty/default | Re-login to repopulate |
| Message sync failure | 4xx/5xx | Silent (background process) | Auto-retry next 5-min interval |
| Pending message upload failure | 4xx/5xx | Message stays as NOT_SENT | Auto-retry on next sync |

### 12.5 Platform Feature Errors

| Scenario | HTTP | User Feedback | Recovery |
|----------|------|--------------|----------|
| Notification preferences load failure | 4xx/5xx | Empty preferences list | Retry page load |
| Notification preferences save failure | 4xx/5xx | Server error message (toast) | Retry save |
| Feedback list load failure | 4xx/5xx | Empty feedback list | Retry |
| Survey URL invalid/expired | -- | External browser shows error | Contact admin |
| Downtime info fetch failure | 4xx/5xx | No downtime blocking (fail-open) | Actions proceed normally |
| Play Store not available | -- | Fallback to HTTPS URL | Manual APK update |
| Discharged patients load failure | 4xx/5xx | Empty list | Retry |

---

## 13. Edge Cases

### 13.1 Vital Trends Edge Cases

1. **ICU vs non-ICU default range:** ICU patients default to `from = today` (single day view), while non-ICU patients default to `from = today - 4` (5-day view). This is because ICU patients have significantly more frequent vitals, and a wider range would create an overwhelming chart.

2. **Admission date clamping:** If `today - 4` is before the admission date, the from-date is clamped to admission. For a patient admitted yesterday, the default range is always `admission → today`, not `today - 4 → today`.

3. **BP combined format with missing diastolic:** If the combined BP string is "120" (no "/" separator), the split produces only a systolic value. The diastolic line has no data point for that timestamp (missing, not zero).

4. **Temperature T1 without primary:** The secondary temperature sensor (T1) can report values even when the primary sensor has no reading. Both datasets are independent.

5. **1000-record API limit:** EHR_033 returns a maximum of 1000 records sorted by `recordedTime desc`. For patients with high-frequency vitals (ICU), this may not cover the full date range. The oldest records are truncated silently.

6. **Empty combined chart:** If all 13 parameters have zero data points in the selected range, the chart renders with axes but no lines. The legend still shows all parameters as toggleable.

7. **Y-axis 20-unit interval with extreme outliers:** If a vital value is extremely high (e.g., HR=250 from artifact), the Y-axis extends to accommodate it, creating large empty gaps. No outlier filtering is applied.

8. **Orientation change during data load:** If the user rotates the device while EHR_033 is still loading, the chart renders correctly after data arrives (resize listener fires after render).

9. **CHEWS score in table only:** The CHEWS (Children's Early Warning Score) parameter appears only in table view, not in combined or individual chart views. It uses color `#f6a001` in the table.

10. **Pain Score dual-value display:** Pain Score shows both intensity and location in table view (e.g., "3/Lt"). This is NOT a BP-style fraction -- it is intensity followed by anatomical location abbreviation.

### 13.2 Past Records Edge Cases

1. **Parallel API partial failure:** Each consultation triggers 3-4 parallel API calls. If one fails (e.g., attachments returns 500), the consultation card still renders with the data that succeeded. The failed section shows as empty/missing.

2. **Visit type ER without discharge summary:** ER visits may not have a formal discharge summary. In that case, the summary button is hidden for ER-type consultations that lack DS data.

3. **RAD image deduplication:** Radiology images can appear multiple times in the investigation list (e.g., same image linked to multiple orders). `PastRecordsInvestigationPage` deduplicates by `filePath` before rendering the image gallery.

4. **Dual auth for attachments only:** Investigation reports (ATTACHMENT/EXTERNAL/DIAGNOSTIC/LIS/RIS/SRM) use only Bearer token. EHR_096 attachments require BOTH Bearer AND athmaToken. Confusing the auth pattern causes 403 errors.

5. **Filename cleanup for attachments:** Server-generated attachment filenames include prefixes like UUIDs or timestamps. The page strips these to display the original user-meaningful filename.

6. **Consultation infinite scroll + parallel calls:** When infinite scroll triggers loading 5 more consultations, all 5 trigger their 3-4 parallel API calls simultaneously. This creates 15-20 concurrent HTTP requests. The auth interceptor must handle token refresh across all of them.

7. **30+ concept types with missing data:** PastRecordsSummaryPage iterates over all concept types but only renders sections that have data. A summary with only 3 populated concept types shows only 3 sections, not 30 empty ones.

### 13.3 Gallery/Image Editing Edge Cases

1. **PDF vs Image detection:** The gallery view determines the file type from the filename extension or MIME type. If the extension is missing, it falls back to content sniffing (checking the first bytes of the base64 data).

2. **Large PDF rendering:** ng2-pdf-viewer loads the entire PDF into memory. Very large PDFs (50+ pages) may cause memory pressure on low-end devices.

3. **Pinch-zoom reset on navigation:** When navigating BACK/NEXT between images, the pinch-zoom state (scale, position) resets to default (fit-to-screen). There is no zoom-state persistence across file navigation.

4. **Image rotation coordinate correction:** After rotating an image 90 degrees, the angular-cropperjs coordinate system needs correction. The page applies a CSS transform correction to ensure the crop selection box aligns with the visual orientation.

5. **Crop with autoCrop false:** Since autoCrop is disabled, the user must manually draw the crop region. If they tap Save without drawing a region, the original image is saved unchanged.

6. **8-image limit across camera + gallery:** The 8-image limit is global across both capture sources. Taking 5 from camera and then trying to select 4 from gallery is blocked -- only 3 more are allowed.

7. **Gallery writes to Directory.Data/gv/:** Downloaded files for gallery viewing are written to the `gv/` subdirectory under `Directory.Data`. These files are not auto-cleaned and accumulate over time.

### 13.4 Offline Architecture Edge Cases

1. **SQLite DB key loss:** If the SecureStorage key for the SQLite cipher is lost (e.g., app reinstall on some devices), the encrypted database becomes inaccessible. The app must create a fresh database and re-sync from the server.

2. **In-memory cache stale after background kill:** If the OS kills the app in the background, the in-memory SecureStorage cache is lost. On next app launch, all keys are re-read from SecureStorage (slow path), then cached again.

3. **5-minute sync gap:** Messages sent by other users during the 5-minute interval between syncs are not visible until the next sync. In fast-moving clinical scenarios, this creates a perception of delayed communication.

4. **App resume immediate sync:** On app resume (foregrounding), the app performs an immediate sync rather than waiting for the next 5-minute tick. This reduces the effective gap for users who frequently switch apps.

5. **NOT_SENT message ordering:** Messages composed offline are stored with `msg_status = NOT_SENT`. When connectivity returns, they are uploaded in order of creation. However, the server assigns new timestamps, so the message ordering on the server may differ from the composition order if another user sent messages in between.

6. **Cascade delete on patient discharge:** When a patient is removed from `patient_info` (e.g., discharged), the `ON DELETE CASCADE` removes all associated messages and care team records. This data is not recoverable locally.

7. **Concurrent SQLite access:** Multiple Angular services may attempt SQLite reads/writes concurrently. The SQLite plugin serializes these operations, but this can cause brief UI freezes if many queries are queued.

### 13.5 Platform Feature Edge Cases

1. **Mandatory notification always on:** Mandatory notification preferences cannot be toggled off. The toggle is visually present but disabled. The lock icon indicates non-toggleable status.

2. **JSON.stringify change detection false positive:** If the server returns preferences in a different property order than the initial load, `JSON.stringify` comparison may falsely detect a change. This is mitigated by sorting properties before stringification.

3. **Feedback survey URL expiration:** Survey URLs may expire after a set period. If a user opens a pending survey after expiration, the external survey platform shows an error. The app has no way to detect this before opening.

4. **Downtime fail-open:** If the downtime API itself is unreachable (e.g., server is down), the app does NOT block actions. It fails open -- meaning users can still attempt API calls (which will likely fail individually).

5. **FAQ single entry:** The FAQ page currently contains only one question ("How do I delete my account?"). The architecture supports multiple entries, but only one is implemented.

6. **Version comparison string-based:** Version comparison uses string comparison logic. For versions like "2.35.0" vs "2.9.0", proper semantic versioning comparison is required (not lexicographic), or "2.9.0" would incorrectly appear greater.

7. **Discharged patients client-side search performance:** The full discharged patient list is loaded into memory for client-side filtering. For facilities with high discharge volumes, this list can be large, causing sluggish search input responsiveness.

---

## 14. Implementation Checklist

### 14.1 Vital Trends
- [ ] VitalTrendsPage with 3-segment view (Combined / Individual / Table)
- [ ] 13 vital parameter definitions with hex color codes
- [ ] D3.js chart rendering pipeline (lines, circles, axes, legend)
- [ ] Line: 1.5px default, 2.5px hover; Circle: 3px default, 6px hover
- [ ] Opacity: 1.0 selected, 0.1 others on hover
- [ ] X-axis: 5 ticks, "HH:MM" + "DD/MM" two-line format (tspan)
- [ ] Y-axis: 20-unit intervals, duplicated in fixed div (scroll-independent)
- [ ] Auto-scroll right after 1000ms delay
- [ ] Responsive re-render on orientation change
- [ ] Interactive legend with "All" toggle button
- [ ] Combined graph: all 13 parameters overlaid
- [ ] Individual charts: 11 scrollable cards (BP pairs combined per card)
- [ ] Table view: 24 rows, horizontal scroll, sticky parameter column
- [ ] Table DOM injection for performance (innerHTML, not Angular binding)
- [ ] BP merge logic in table ("120/80" single cell)
- [ ] Pain Score: "{value}/{location}" display
- [ ] Date range default: today-4 (non-ICU) or today (ICU), clamped to admission
- [ ] CalendarModalPage modal with from/to pickers
- [ ] Date validation: from <= to, from >= admissionDate
- [ ] BP processing: combined ("120/80" split) vs individual (separate fields)
- [ ] MDM_002 config: `enable_bp_as_individual`
- [ ] Temperature C→F conversion: (C * 9/5 + 32)
- [ ] MDM_002 config: `default_temperature_to_be_celsius`
- [ ] Temperature T1 secondary sensor support
- [ ] Positional BPs (Lying/Standing/Sitting) with dual color codes
- [ ] CHEWS score table-only display (color #f6a001)
- [ ] PatientEcgPage modal: iframe-based ECG viewer (online-only)
- [ ] ECG API: `api/athma/_search/patient-vitals-device_info`
- [ ] EHR_033 API integration (size=1000, sort=recordedTime,desc)

### 14.2 Past Records
- [ ] PastRecordsPage with 2-segment layout (Overview / Tests)
- [ ] Overview: consultation history list, 5 per page, infinite scroll
- [ ] Visit type classification: OP, IP, ER, DC from encounterClass.code
- [ ] Per-consultation parallel API loading (3-4 calls via forkJoin)
- [ ] OP consultations: EHR consultation data fetch
- [ ] IP consultations: discharge summary fetch
- [ ] Tests segment with 4 sub-segments (LAB / RAD / Other / Attachment)
- [ ] Lab results: LabResultProcesserUtil pipeline reuse
- [ ] Lab grouping by orderDate, sorted desc
- [ ] Abnormal flags: 7 types (N, L, PL, AL, H, PH, AH)
- [ ] Abnormal icons: low-result.svg, high-result.svg + abnormal-color CSS
- [ ] PastRecordsMedicationPage modal: brand(B)/generic(G) icons
- [ ] Medication status display + instruction text + IP notes
- [ ] PastRecordsInvestigationPage modal: 6 report type downloads
- [ ] Report download: `api/_download/investigationreport/{id}?reportType=X` (Bearer only)
- [ ] RAD image download: `api/media/download?filePath=X` (Bearer only)
- [ ] RAD image deduplication by filePath
- [ ] PastRecordsAttachmentsPage modal: EHR_096 download (Bearer + athmaToken)
- [ ] Filename cleanup for server-generated attachment names
- [ ] PastRecordsSummaryPage modal: 30+ clinical concept type rendering
- [ ] Obstetrics/Gynaecology conditional section
- [ ] Vital BP special handling in summary (merge/split logic)

### 14.3 Gallery View
- [ ] GalleryViewPage with download pipeline (fetch → base64 → Filesystem)
- [ ] Bearer + optional athmaToken header support
- [ ] Write to Directory.Data/gv/
- [ ] PDF rendering via ng2-pdf-viewer
- [ ] Image rendering via ngx-pinch-zoom-16
- [ ] File navigation: BACK/NEXT buttons with "{current}/{total}" counter
- [ ] "View Similar Reports" toggle via groupParam

### 14.4 Image Editing
- [ ] ImageEditingModalPage with camera + gallery capture
- [ ] Camera config: quality 50, 800x1250, correctOrientation true
- [ ] Gallery: multi-select, limit 8 images total
- [ ] Crop: angular-cropperjs, free aspect ratio, autoCrop false
- [ ] Rotate: +90° / -90° with CSS transform correction
- [ ] Save: JPEG 80% quality, timestamp filename
- [ ] Max 8 images hard limit enforcement
- [ ] Close confirmation dialog for unsaved changes
- [ ] Image thumbnail strip with [X] remove per image

### 14.5 Offline Architecture
- [ ] SQLite encrypted DB "aadi" with 28-char cipher key
- [ ] Key stored in SecureStorage (Android Keystore)
- [ ] 4 tables: patient_info (35+ cols), messages (21 cols), care_team (11 cols), error_messages
- [ ] 12+ indices across tables for query performance
- [ ] ON DELETE CASCADE from patient_info to messages and care_team
- [ ] SecureStorage: 63 keys with in-memory cache layer
- [ ] Write-through cache: set() writes to both memory and SecureStorage
- [ ] Read: memory-first, SecureStorage fallback
- [ ] Migration from localStorage on version upgrade
- [ ] Network monitoring: Capacitor Network plugin → BehaviorSubject isOnline$
- [ ] Network status change listener → enable/disable features
- [ ] 5-minute (300,000ms) message sync interval
- [ ] Sync logic: fetch missed → insert (dedup by action_id) → upload pending
- [ ] App resume: immediate sync (bypass interval)
- [ ] Feature gating: online-only features disabled when offline
- [ ] Offline-capable: patient list, cached messages, cached files
- [ ] Online-only: vital trends, past records, video consultation, lab results, medication ordering

### 14.6 Notification Preferences
- [ ] NotificationPreferencesPage with toggle list
- [ ] Mandatory items: lock icon, toggle disabled, always ON
- [ ] Optional items: toggle enabled, user-controlled
- [ ] Change detection via JSON.stringify comparison
- [ ] Save button enabled only when changes detected
- [ ] GET/PUT api/_search/user-notification-preferences/{login}

### 14.7 Feedback / Survey
- [ ] Feedback list page: completed + pending surveys
- [ ] GET api/_load/my-customer-feedback-list/{login} (completed)
- [ ] GET api/_load/my-pending-customer-feedback-list/{login} (pending)
- [ ] Open survey via Browser.open({ url }) (external browser)
- [ ] POST api/_update/customer-feedback-view-status/{login} (mark viewed)

### 14.8 Downtime
- [ ] GET api/_load/down-time-info on startup
- [ ] Store downtime window (startTime, endTime, message)
- [ ] Check current time against window before actions
- [ ] Block actions during maintenance with toast (server message)
- [ ] Fail-open: if downtime API unreachable, allow actions

### 14.9 FAQ
- [ ] Single FAQ page: "How do I delete my account?"
- [ ] Dynamic email per client facility configuration
- [ ] Static content (no server API call)

### 14.10 What's New / Version Check
- [ ] Version comparison: installed vs latest (semantic versioning)
- [ ] Update prompt with Play Store link
- [ ] Market URI: market://details?id=org.nh.app.aadi
- [ ] HTTPS fallback URL

### 14.11 Discharged Patients
- [ ] DischargedPatientsPage with patient list
- [ ] GET api/_search/recent-discharge-patients (full list load)
- [ ] GET api/count/recent-discharge-patients (count for badge)
- [ ] Client-side search filter by patient name or MRN
- [ ] Tap → navigate to DischargeSummaryPage (read-only mode)
