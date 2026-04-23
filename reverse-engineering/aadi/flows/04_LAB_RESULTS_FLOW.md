# Flow 04: Lab Results & Investigation System

**App:** AADI (org.nh.app.aadi) v2.35.0
**Framework:** Ionic 7 / Capacitor 5 / Angular 17+
**Source files:** `investigation-list.page.ts`, `investigation-orders.page.ts`, `followup-investigations.page.ts`, `lab-result-details.page.ts`, `result-trend-graph.page.ts`, `lab-result-processer.util.ts`, `followup-request.model.ts`

---

## 1. Overview

The Lab Results & Investigation system spans the full lifecycle of clinical lab work: ordering investigations, processing raw results through a normalization pipeline, rendering them as a 2D matrix and interactive trend graphs, and scheduling follow-up appointments. It is one of the most data-intensive flows in AADI, touching 17 API endpoints and handling deeply nested service hierarchies (up to 3 levels).

### 1.1 System Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│                        INVESTIGATION ORDERING                            │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────────┐  ┌──────────────────────┐  │
│  │  Entry Point A   │  │  Entry Point B       │  │  Entry Point C       │  │
│  │  InvestigationList│  │  InvestigationOrders│  │  FollowupInvestig-  │  │
│  │  Page (Inpatient)│  │  Page (Prev Orders) │  │  ationsPage (D/C)   │  │
│  └────────┬─────────┘  └─────────┬───────────┘  └──────────┬──────────┘  │
│           │                      │                         │             │
└───────────┼──────────────────────┼─────────────────────────┼─────────────┘
            │                      │                         │
            ▼                      ▼                         ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      REST API (Spring Boot)                              │
│  EHR_105, EHR_104, EHR_024, MDM_003, MDM_004, AMB_001-003, etc.        │
└─────────────────────────────────┬────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                       RESULT PROCESSING                                  │
│                                                                          │
│  ┌──────────────────────┐   ┌─────────────────────┐                     │
│  │ LabResultProcesser   │   │ Abnormal Flag System │                     │
│  │ Util (5-step pipeline)│──▶│ (7 flag types)       │                     │
│  └──────────┬───────────┘   └─────────────────────┘                     │
│             │                                                            │
│  ┌──────────▼──────────────────────────────────────────────────┐        │
│  │                PRESENTATION LAYER                            │        │
│  │                                                              │        │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌───────────┐  │        │
│  │  │ Result Matrix    │  │ D3.js Trend      │  │ Report    │  │        │
│  │  │ View (2D table)  │  │ Graph (SVG)      │  │ Downloads │  │        │
│  │  │ LabResultDetails │  │ ResultTrendGraph │  │ (6 types) │  │        │
│  │  └──────────────────┘  └──────────────────┘  └───────────┘  │        │
│  └──────────────────────────────────────────────────────────────┘        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
            │
            ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     FOLLOW-UP SCHEDULING                                 │
│  FollowUpRequestModel → AMB_001 slots → AMB_003 create → EHR_028 save  │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Key Numbers

| Metric | Value |
|---|---|
| API endpoints | 17 |
| Ordering entry points | 3 (Inpatient, Previous Orders, Discharge Follow-up) |
| Abnormal flag types | 7 (N, H, L, PH, PL, AH, AL) |
| Max nesting depth (profiles) | 3 levels |
| Report types | 6 |
| Processing pipeline steps | 5 |
| Trend graph library | D3.js v7 |

---

## 2. Investigation Ordering -- Inpatient (Entry Point A)

### 2.1 Screen: InvestigationListPage (modal)

This is the primary ordering interface, opened from the patient chat screen as a modal when the doctor wants to order a lab test for a currently admitted (inpatient) patient.

```
┌─────────────────────────────────────────────────────┐
│  [X]  Order Investigations                          │
│─────────────────────────────────────────────────────│
│  [🔍 Search investigations...              ]        │
│                                                      │
│  ── FAVORITES ──────────────────────────────────────│
│  [ ] Complete Blood Count (CBC)                      │
│  [ ] Liver Function Test (LFT)                       │
│  [ ] Renal Function Test (RFT)                       │
│  [ ] Lipid Profile                                   │
│  [ ] HbA1c                                           │
│  [ ] Thyroid Profile                                 │
│  ...                                                 │
│                                                      │
│  ── SELECTED (3) ───────────────────────────────────│
│  [✓] CBC            [NORMAL ▼] [+ Instructions]     │
│  [✓] LFT            [URGENT ▼] [+ Instructions]     │
│  [✓] Lipid Profile   [NORMAL ▼] [+ Instructions]     │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │             ORDER (3 investigations)          │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 2.2 Favorites Loading

```
API:     ATHMA EHR_105
Query:   consultant.login == currentUser.login
         AND type == "investigation-order"
         AND encounterClass == "IMP"
Size:    50
Sort:    by usage frequency (server-side)
```

The favorites list is personalized per consultant. It shows the doctor's most-used investigation orders for inpatient encounters. Each favorite item contains the full service metadata needed for ordering.

### 2.3 Search

```
API:       ATHMA EHR_104
Trigger:   min 3 characters typed
Searches:  code, name, shortName across:
           - serviceMaster collection
           - packageMaster collection
Filter:    unitId == currentUnit
Size:      100
Debounce:  standard input debounce
```

Search results replace the favorites list while the search field has content. Clearing the search field restores the favorites view.

### 2.4 Item Data Structure

Each selectable investigation item carries:

```typescript
interface InvestigationItem {
  code: string;          // Service code (e.g., "SRV001")
  groupCode: string;     // Group classification
  id: string;            // Unique service ID
  name: string;          // Display name
  profile: boolean;      // true if this is a panel/profile (e.g., CBC, LFT)
  serviceType: string;   // "LAB", "DIAGNOSTIC", etc.
  spItemType: string;    // Sub-type classifier
}
```

### 2.5 Selection Logic

- **Toggle:** Checkbox toggles selection on/off
- **Duplicate detection:** Before adding, checks against existing orders for the same encounter to prevent re-ordering. Comparison uses the `code` field
- **Visual feedback:** Selected items appear in a separate "SELECTED" section below the search/favorites list

### 2.6 Priority Assignment

Each selected investigation can be assigned a priority:

| Priority | Color | Badge |
|---|---|---|
| NORMAL | `#BDBDBD` (gray) | Default |
| URGENT | `#F44336` (red) | Red highlight |

Priority is toggled per individual item, not globally. Default is NORMAL.

### 2.7 Instructions

- Optional free-text field per investigation
- Maximum 250 characters
- Accessed via context menu: long-press or "..." menu shows:
  - **Add Instructions** -- opens text input
  - **Delete** -- removes item from selection

### 2.8 Submit Flow

```
Step 1: Build payload
        {
          action: 'ADD_AND_ORDER',
          investigations: [{
            code, name, id, groupCode,
            priority: 'NORMAL' | 'URGENT',
            instructions: string | null,
            serviceType, spItemType, profile
          }],
          encounter: { number, class: 'IMP' },
          consultant: { login, displayName },
          unit: { id, name }
        }

Step 2: POST api/investigation-order-record-action

Step 3: On success → create PatientMessage
        {
          category: 'INVESTIGATION_ORDER',
          content: summary text,
          metadata: { orderIds, investigations }
        }

Step 4: Send message via WebSocket (ACS)

Step 5: Dismiss modal, refresh orders list
```

### 2.9 Error Handling for Ordering

- Network failure: toast "Unable to place order. Please try again."
- Duplicate order: prevented client-side before submission
- Empty selection: ORDER button disabled when selection count is 0
- Discharged patient: modal cannot be opened (FAB hidden)

---

## 3. Investigation Ordering -- Previous Orders (Entry Point B)

### 3.1 Screen: InvestigationOrdersPage

Displays the history of all investigation orders for the current encounter, grouped by date.

```
┌─────────────────────────────────────────────────────┐
│  [<]  Investigation Orders                          │
│─────────────────────────────────────────────────────│
│                                                      │
│  ── 22 Apr 2026 ────────────────────────────────────│
│  CBC                    [REPORT_READY]  ●            │
│  LFT                    [INPROGRESS]    ●            │
│  Lipid Profile          [ORDERED]       ●            │
│                                                      │
│  ── 21 Apr 2026 ────────────────────────────────────│
│  RFT                    [REPORT_READY]  ●            │
│  HbA1c                  [REPORT_READY]  ●            │
│  Thyroid Profile        [CANCELLED]     ●            │
│                                                      │
│  ── 20 Apr 2026 ────────────────────────────────────│
│  CBC                    [REPORT_READY]  ●            │
│  Urine Culture          [REJECTCED]     ●            │
│                                                      │
│                                            [+ FAB]   │
└─────────────────────────────────────────────────────┘
```

### 3.2 Data Loading

```
API:    GET api/_search/investigation-order-records
Params: encounterNumber={encounterNumber}
        size=100
        sort=createdOn,desc
```

### 3.3 Grouping

Results are grouped by `orderDate` (date portion only, time stripped). Groups are displayed in reverse chronological order (newest first).

### 3.4 Status Badges

| Status | Description | Visual |
|---|---|---|
| `ORDERED` | Order placed, not yet started | Gray badge |
| `INPROGRESS` | Sample collected or processing | Blue badge |
| `REPORT_READY` | Results available | Green badge |
| `CANCELLED` | Order cancelled | Strikethrough + gray |
| `REJECTCED` | Rejected by lab (note: typo preserved from backend) | Red badge |
| `ADDED` | Added but not yet ordered | Light gray |
| `PROCESSED` | Processing complete | Teal badge |
| `APPROVAL_REQUIRED` | Needs supervisor approval | Orange badge |

**Important:** The `REJECTCED` status is a known backend typo. The frontend matches this exact string -- do NOT "fix" it or results will not render.

### 3.5 FAB Button

- Visible only if patient is NOT discharged (`encounterStatus !== 'DISCHARGED'`)
- Opens InvestigationListPage (Entry Point A) as a modal
- After modal dismisses with a result, refreshes the orders list

---

## 4. Investigation Ordering -- Discharge Follow-up (Entry Point C)

### 4.1 Screen: FollowupInvestigationsPage

Used during discharge summary preparation to schedule investigations the patient should complete after leaving the hospital.

```
┌─────────────────────────────────────────────────────┐
│  [<]  Follow-up Investigations                      │
│─────────────────────────────────────────────────────│
│  [ Favorites ] [ Order Sets ] [ Search ]            │
│─────────────────────────────────────────────────────│
│                                                      │
│  ── TAB: FAVORITES ─────────────────────────────────│
│  [🔍 Search favorites...               ]            │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │  CBC                                   [✓]  │    │ ← selected: green #EBFAF9
│  ├─────────────────────────────────────────────┤    │
│  │  Lipid Profile                         [ ]  │    │
│  ├─────────────────────────────────────────────┤    │
│  │  HbA1c                                 [✓]  │    │
│  ├─────────────────────────────────────────────┤    │
│  │  Thyroid Profile                       [ ]  │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │              DONE (2 selected)                │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 4.2 Three Tabs

#### Tab 1: Favorites (API: EHR_024)

```
Query:  consultant.login == currentUser.login
        encounterClass == currentEncounterClass
        searchText (optional, for filtering)
```

Personal favorites list, similar to inpatient favorites but scoped to follow-up context.

#### Tab 2: Order Sets (API: MDM_003)

```
Query:  _exists_:services AND !_exists_:drugs
        (filters to investigation-only order sets, excludes medication sets)
```

- Displayed as expandable accordions
- Each order set expands to show its constituent services
- Selecting the set selects all services; individual services can be toggled

#### Tab 3: Master Search (API: MDM_004)

```
API:    MDM_004 service-masters
Limit:  20 results
Query:  searchText (free-form search)
```

Free-form search across all available service masters.

### 4.3 Selection Behavior

- **Toggle:** Tap to select/deselect
- **Selected highlight:** Background color `#EBFAF9` (light green)
- **Cross-tab persistence:** Selections persist across tab switches
- **Output model:** Builds `FollowUpRequestModel.investigation[]`

```typescript
interface FollowUpInvestigation {
  name: string;    // Display name of the investigation
  code: string;    // Service code
  type: string;    // Service type (LAB, DIAGNOSTIC, etc.)
}
```

### 4.4 Return Flow

On "DONE," the selected investigations array is returned to the discharge summary page via modal dismiss, where they are embedded in the discharge follow-up instructions.

---

## 5. Lab Result Processing Pipeline (LabResultProcesserUtil)

### 5.1 Overview

`LabResultProcesserUtil` is a pure-function utility that transforms raw API lab result objects into a normalized, display-ready structure. It handles the complexity of nested service hierarchies (profiles within profiles) and normalizes inconsistent backend data.

### 5.2 Input

Raw lab result object from the API, which may contain:
- A flat list of parameters (simple test)
- A nested tree of services/profiles up to 3 levels deep
- A report attachment (PDF) with no inline values
- A mix of both values and report attachments

### 5.3 Output

```typescript
interface ProcessedLabResult {
  name: string;           // Top-level test name (display)
  showReport: boolean;    // true = show PDF download link (only if no inline values)
  id: any;                // Original result ID
  JSON: LabItem[];        // Array of normalized parameter rows
  singleService: boolean; // true if only one parameter (no profile nesting)
  onHold: boolean;        // true if result is held and should not be shown
}

interface LabItem {
  name: string;              // Parameter/test display name
  flag: string;              // 'N' | 'H' | 'L' | 'PH' | 'PL' | 'AH' | 'AL'
  value: any;                // The result value (numeric or string)
  unit: string | null;       // Unit of measurement (e.g., "mg/dL")
  referenceRange: string | null;  // Normal range as "min - max"
  subHeader: boolean;        // true = section header row, no value displayed
}
```

### 5.4 The 5 Steps

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RAW LAB RESULT FROM API                          │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: Extract Display Name                                       │
│  name = investigationDisplayName || name                            │
│  (prefer the formatted display name over the raw code/name)        │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: Check Report Hold                                          │
│  if reportHoldStatus === 'Y':                                       │
│    → set onHold = true                                              │
│    → RETURN immediately (do not process further)                    │
│  Purpose: Lab has flagged this result for review before release     │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ (reportHoldStatus !== 'Y')
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: Check Report Availability                                  │
│  if report[].length > 0:                                            │
│    → set showReport = true                                          │
│  (tentatively show download link; may be overridden in Step 5)     │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: Process Services Tree (recursive, up to 3 levels)         │
│                                                                     │
│  Level 1 (root services):                                           │
│    if no children → fetchServiceData() directly                    │
│    if has children → reverse services[], iterate:                  │
│                                                                     │
│  Level 2 (sub-services):                                            │
│    if no grandchildren → fetchServiceData()                        │
│    if has grandchildren → add subHeader, iterate:                  │
│                                                                     │
│  Level 3 (leaf services):                                           │
│    → fetchServiceData() for each                                   │
│                                                                     │
│  fetchServiceData() calls getJSONLabItem() for normalization       │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5: Post-Process                                               │
│  if showReport === true AND JSON.length > 0:                        │
│    → set showReport = false                                         │
│  RULE: Inline values always win over report download link.          │
│  If we extracted values, hide the PDF link.                         │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │ ProcessedLabResult │
                  │ (ready for UI)     │
                  └───────────────────┘
```

### 5.5 Service Tree Traversal Detail

The `services[]` array on a lab result can be nested up to 3 levels. Example for a Complete Blood Count (CBC):

```
CBC (Profile)
├── RBC Parameters (Sub-profile)
│   ├── Hemoglobin          → fetchServiceData()
│   ├── RBC Count           → fetchServiceData()
│   └── Hematocrit          → fetchServiceData()
├── WBC Parameters (Sub-profile)
│   ├── Total WBC           → fetchServiceData()
│   └── Differential Count (Sub-sub-profile)
│       ├── Neutrophils      → fetchServiceData()
│       ├── Lymphocytes      → fetchServiceData()
│       ├── Monocytes        → fetchServiceData()
│       ├── Eosinophils      → fetchServiceData()
│       └── Basophils        → fetchServiceData()
└── Platelet Count           → fetchServiceData()
```

**Critical detail:** Level 1 services are **reversed** before iteration (`services.reverse()`). This corrects a backend ordering inconsistency where the API returns services in reverse display order.

Sub-profiles at levels 2 and 3 generate `subHeader` rows in the output JSON, which render as section dividers in the UI with no value column.

### 5.6 Normalization in getJSONLabItem()

The `getJSONLabItem()` function normalizes each leaf-level parameter into a consistent `LabItem`:

#### Display Name Priority (first non-empty wins):
1. `investigationDisplayName`
2. `investigationShortName`
3. `shortName`
4. `name`

#### Abnormal Flag Normalization:
```
undefined  → "N" (Normal)
""         → "N" (Normal)
null       → "N" (Normal)
"N"        → "N" (Normal, pass-through)
"H"/"L"/"PH"/"PL"/"A"/"AL" → pass-through
```

#### Unit Normalization:
```
undefined  → null
""         → null
otherwise  → pass-through
```

#### Reference Range Normalization:
```
undefined  → null
""         → null
null       → null
"10-20"    → "10 - 20"   (adds spaces around hyphen)
"10 - 20"  → "10 - 20"   (already formatted, pass-through)
```

---

## 6. Abnormal Flag System

### 6.1 The 7 Flag Types

| Flag | Full Name | Severity | Clinical Meaning |
|---|---|---|---|
| `N` | Normal | None | Value within reference range |
| `H` | High | Moderate | Above reference range upper limit |
| `L` | Low | Moderate | Below reference range lower limit |
| `PH` | Panic High | Critical | Dangerously above range -- immediate action |
| `PL` | Panic Low | Critical | Dangerously below range -- immediate action |
| `AH` | Alert High | High | Significantly above range -- attention needed |
| `AL` | Alert Low | High | Significantly below range -- attention needed |

### 6.2 Color Mapping

| Context | Normal (N) | Abnormal (H/L/PH/PL/AH/AL) |
|---|---|---|
| **Matrix View** (text color) | `#717171` (gray) | `#E35241` (red) |
| **Trend Graph** (data point fill) | `#7dc9b8` (green) | `#F43636` (red) |

### 6.3 Flag Evaluation Logic

```typescript
function getValueColor(flag: string): string {
  if (flag === 'N' || flag === null || flag === undefined) {
    return '#717171';  // gray for normal
  }
  return '#E35241';    // red for ANY abnormal
}

function getTrendPointColor(flag: string): string {
  if (flag === 'N' || flag === null || flag === undefined) {
    return '#7dc9b8';  // green for normal
  }
  return '#F43636';    // red for ANY abnormal
}
```

**Design decision:** All abnormal flags (H, L, PH, PL, AH, AL) share the same color. There is no visual distinction between "High" and "Panic High" in the current implementation -- both render as red. The severity distinction exists only in the flag text label.

---

## 7. Result Matrix View (LabResultDetailsPage)

### 7.1 Screen Layout

The matrix view displays lab results as a 2D table where:
- **Y-axis (rows):** Service parameters (test components)
- **X-axis (columns):** Order dates (each column is one result instance)

```
┌─────────────────────────────────────────────────────────────────────┐
│  [<]  CBC - Lab Results                           [📈 Trend]       │
│─────────────────────────────────────────────────────────────────────│
│                                                                     │
│  Parameter       │ 08:30  │ 14:15  │ 09:00  │ 11:45  │            │
│                  │ 22/04  │ 21/04  │ 20/04  │ 19/04  │            │
│  ────────────────┼────────┼────────┼────────┼────────┤            │
│  ── RBC Parameters ──────────────────────────────────              │
│  Hemoglobin      │ 14.2   │ 13.8   │ *12.1* │ *11.5* │            │
│  (g/dL)          │        │        │  LOW   │  LOW   │            │
│  RBC Count       │  4.8   │  4.6   │  4.2   │  4.0   │            │
│  (mill/cu.mm)    │        │        │        │        │            │
│  Hematocrit      │ 42.5   │ 41.0   │ *36.2* │ *34.8* │            │
│  (%)             │        │        │  LOW   │  LOW   │            │
│                  │        │        │        │        │            │
│  ── WBC Parameters ──────────────────────────────────              │
│  Total WBC       │  8.2   │  8.5   │ *15.6* │ *18.2* │            │
│  (thou/cu.mm)    │        │        │  HIGH  │  HIGH  │            │
│  ...                                                               │
│                                                                     │
│  *red text* = abnormal value                                       │
│  [highlighted column] = current/selected result (bg: #FFFDE7)     │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Profile Detection

The system determines whether a result is a simple test or a nested profile:

```typescript
function isProfile(obj: any): boolean {
  return obj.isProfile === true || (obj.services && obj.services.length > 0);
}
```

### 7.3 Result Type Handling

| resultType | Structure | Value Location |
|---|---|---|
| `PARAMETER` | Has `parameter[]` array | Each parameter object has `.value` |
| `GENERAL` | Single value | `labResult.value` directly |

### 7.4 3-Level Nesting Support

The matrix supports up to 3 levels of nested profiles. Sub-profile names render as section header rows (gray background, spanning all columns, no value cells).

```
Level 1: Profile name (e.g., "CBC")           → top-level header
Level 2: Sub-profile name (e.g., "RBC Params") → section header row
Level 3: Parameter (e.g., "Hemoglobin")        → data row with values
```

### 7.5 Visual Styling

| Element | Style |
|---|---|
| Current result column background | `#FFFDE7` (light yellow) |
| Normal value text | `#717171` (gray) |
| Abnormal value text | `#E35241` (red) |
| Date header line 1 | `HH:MM` (time) |
| Date header line 2 | `DD/MM` (date) |
| Section headers (sub-profiles) | Bold, gray background, full row span |

### 7.6 ViewEncapsulation

```typescript
@Component({
  encapsulation: ViewEncapsulation.None  // Global CSS injection
})
```

`ViewEncapsulation.None` is used to allow the component's styles to affect the scrollable table DOM globally. This is necessary because the matrix table uses complex `position: sticky` headers that break under Angular's default shadow DOM encapsulation.

### 7.7 Auto-Scroll

On load, the matrix auto-scrolls horizontally to the highlighted (current result) column so the doctor immediately sees the latest values without manual scrolling.

---

## 8. D3.js Trend Graph (ResultTrendGraphPage)

### 8.1 Overview

The trend graph renders a time-series line chart of a single lab parameter across multiple result dates, using D3.js for SVG rendering. It supports scrolling for large datasets, fixed Y-axis during horizontal scroll, and interactive parameter selection.

### 8.2 Screen Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  [<]  Trend Graph                              [🔄 Rotate]         │
│─────────────────────────────────────────────────────────────────────│
│  Parameter: [ Hemoglobin (g/dL)          ▼ ]                       │
│─────────────────────────────────────────────────────────────────────│
│                                                                     │
│   16 ┤                                                              │
│      │                                                              │
│   14 ┤                              ●──────●                       │
│      │                            /         14.2                    │
│   12 ┤              ●────────●  /                                  │
│      │            /  12.1    13.8                                   │
│   10 ┤     ●────/                                                  │
│      │    11.5                                                      │
│    8 ┤                                                              │
│      │                                                              │
│    6 ┤                                                              │
│      ├──────┬──────┬──────┬──────┬──────                           │
│      09:00  11:45  09:00  14:15  08:30                             │
│      19/04  19/04  20/04  21/04  22/04                             │
│                                                                     │
│   ● = green (normal)    ● = red (abnormal)                         │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.3 D3.js Configuration

```typescript
const CHART_CONFIG = {
  margins: { top: 20, right: 40, bottom: 60, left: 60 },
  baseDimensions: { width: 900, height: 500 },

  // Date parsing
  dateParse: d3.utcParse("%Y-%m-%dT%H:%M:%S.%L"),
  // Fallback parser used if primary fails (handles missing milliseconds)

  // Scales
  xScale: d3.scaleTime(),    // Padded ±12 hours beyond data range
  yScale: d3.scaleLinear(),  // Padded ±2 beyond data range, .nice()

  // Line
  line: d3.line(),
  lineStroke: '#666666',
  lineWidth: '1px',

  // Data points
  pointRadius: 4,  // px
  normalColor: '#7dc9b8',    // green
  abnormalColor: '#F43636',  // red

  // Labels on data points
  labelFont: '10px',
  labelRotation: -45,        // degrees
  labelOffsetX: 3,           // px right
  labelOffsetY: -8,          // px above (negative = up)

  // Grid
  verticalGrid: { stroke: '#ededed', dasharray: '4,4' },   // dashed
  horizontalGrid: { stroke: '#ededed', dasharray: null },   // solid

  // Axis ticks
  xAxisTicks: (width) => Math.max(3, Math.floor(width / 100)),
  xAxisFormat: 'HH:MM\nDD/MM',  // Two-line tick label
  yAxisTicks: 8,  // maximum

  // Scrolling
  minPxPerPoint: 50,
  maxVisiblePoints: 10,      // Beyond this, chart scrolls horizontally
  autoScrollDelay: 500       // ms before auto-scroll to rightmost
};
```

### 8.4 Y-Axis Fixed Position

The Y-axis is rendered in a **separate SVG element** that stays fixed during horizontal scrolling. This ensures the scale labels remain visible as the user scrolls through the time axis.

```
┌──────────┬────────────────────────────────────────────┐
│ Y-Axis   │  Chart SVG (scrollable horizontally)       │
│ SVG      │  ┌──────────────────────────────────────┐  │
│ (fixed)  │  │  line + points + labels + grid       │  │
│          │  └──────────────────────────────────────┘  │
└──────────┴────────────────────────────────────────────┘
```

### 8.5 Rendering Pipeline

```
1. Filter data: only numeric values eligible for charting
2. Parse dates: utcParse with fallback
3. Sort by date ascending
4. Calculate chart width: max(baseWidth, dataPoints * minPxPerPoint)
5. Build scales: xScale (time), yScale (linear with .nice())
6. Draw grid: vertical dashed + horizontal solid
7. Draw line: d3.line() connecting all points
8. Draw points: circles, colored by flag
9. Draw labels: value text, rotated -45°
10. Draw axes: x-axis (time ticks), y-axis (in separate SVG)
11. Auto-scroll: setTimeout(scrollToRight, 500)
```

### 8.6 Interactions

| Action | Behavior |
|---|---|
| **Parameter dropdown** | Select which parameter to chart; only parameters with numeric values appear in the dropdown |
| **Screen rotation** | Toggle between portrait and landscape; chart redraws with new dimensions |
| **Horizontal scroll** | Chart scrolls when data points exceed `maxVisiblePoints` (10); Y-axis stays fixed |
| **Half-screen mode** | When opened from lab result detail page, chart renders in bottom half of screen |

### 8.7 Data Point Eligibility

Only parameters with **numeric** values can be charted. Non-numeric values (e.g., "Positive", "Reactive", "Normal flora") are excluded from the parameter dropdown entirely.

---

## 9. Report Types (6)

### 9.1 Report Type Resolution

When `showReport` is true (i.e., result has a report attachment but no inline values), the system determines the download file path based on the report type:

| Report Type | File Name Construction | Applicable To |
|---|---|---|
| `ATTACHMENT_REPORT` | `documentName` | All |
| `DIAGNOSTIC_REPORT` | `pdfReport + ".pdf"` | All |
| `EXTERNAL_REPORT` | `fileName + "." + extension` | All |
| `OUTSOURCE_REPORT` | `fileName + "." + extension` | LAB only |
| `LIS_REPORT` | `fileName + ".pdf"` | LAB only |
| `SRM_REPORT` | `fileName` | DIAGNOSTIC only |

### 9.2 Download Flow

```
1. Determine report type from result metadata
2. Construct file name using the rules above
3. Build download URL: baseUrl + "/api/reports/" + fileName
4. Open in InAppBrowser or system PDF viewer
5. If download fails: fallback to showing raw data if available
```

### 9.3 Type-Category Constraints

- `OUTSOURCE_REPORT` and `LIS_REPORT` are restricted to `LAB` category results. If a DIAGNOSTIC result has these types, they are ignored.
- `SRM_REPORT` is restricted to `DIAGNOSTIC` category. If a LAB result has this type, it is ignored.

---

## 10. Result Filtering

### 10.1 Dual Filter: Name AND Date

The lab results list supports two simultaneous filters:

```
┌─────────────────────────────────────────────────────┐
│  [🔍 Search by name...                    ]         │
│  [📅 Filter by date...                    ]         │
│─────────────────────────────────────────────────────│
│  Results matching both filters:                      │
│  ...                                                 │
└─────────────────────────────────────────────────────┘
```

- **Name filter:** Case-insensitive substring match against the investigation display name
- **Date filter:** Matches results from a specific date (ignores time)
- **Combined:** Both filters apply simultaneously (logical AND)

### 10.2 Most Recent Deduplication

When displaying results in the list view, duplicates (same investigation ordered multiple times) are deduplicated to show only the most recent result:

```typescript
// Pseudocode for Most Recent dedup
function deduplicateResults(results: LabResult[]): LabResult[] {
  const seen = new Map<string, LabResult>();

  // results are pre-sorted by date desc
  for (const result of results) {
    const key = result.investigationCode;  // dedup key
    if (!seen.has(key)) {
      seen.set(key, result);  // keep first (most recent) only
    }
  }

  return Array.from(seen.values());
}
```

This ensures the result list shows each investigation once (the latest), while the matrix view still shows all historical results across dates.

---

## 11. Follow-up Scheduling

### 11.1 FollowUpRequestModel

```typescript
interface FollowUpRequestModel {
  mode: 'DURATION' | 'DATE';      // Scheduling mode
  date: Date | null;               // Specific date (DATE mode)
  duration: string | null;         // Duration string e.g., "2 weeks" (DURATION mode)
  notes: string;                   // Free-text instructions
  status: 'BOOKED';               // Always 'BOOKED' on creation
  appointment: AppointmentRef;     // Reference to created appointment
  investigation: FollowUpInvestigation[];  // From Entry Point C
  consultant: ConsultantRef;       // Follow-up doctor
  department: DepartmentRef;       // Follow-up department
  unit: UnitRef;                   // Hospital unit
}
```

### 11.2 Scheduling Flow

```
Step 1: Doctor selects follow-up mode
        DURATION: "Come back in 2 weeks"
        DATE: "Come back on May 6, 2026"

Step 2: Load available appointment slots
        API: AMB_001 (resource-calendars)
        Query: consultant + department + unit + date range

Step 3: Load work patterns for selected consultant
        API: AMB_002 (active-work-patterns)
        Returns: available time blocks per day

Step 4: Doctor selects a slot from available options

Step 5: Create appointment
        API: AMB_003 (create appointment)
        Returns: appointmentId

Step 6: Create/update follow-up record
        API: EHR_028 (create/update follow-up)
        Payload: FollowUpRequestModel with appointmentId linked
```

### 11.3 Slot Display

Available slots are presented as time blocks based on the consultant's work pattern:

```
┌─────────────────────────────────────────────────────┐
│  Available Slots - Dr. Sharma - May 06, 2026       │
│─────────────────────────────────────────────────────│
│                                                      │
│  Morning                                             │
│  [09:00] [09:15] [09:30] [09:45] [10:00]            │
│  [10:15] [10:30] [10:45] [11:00] [11:15]            │
│                                                      │
│  Afternoon                                           │
│  [14:00] [14:15] [14:30] [14:45] [15:00]            │
│  [15:15] [15:30] -- booked -- [16:00]               │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 12. Complete API Reference

### 12.1 ATHMA Service APIs

| Code | Name | Method | Purpose | Key Parameters |
|---|---|---|---|---|
| `EHR_105` | Favorites (IP) | GET | Load consultant's investigation favorites for inpatient | `consultant.login`, `type:investigation-order`, `encounterClass:IMP`, `size=50` |
| `EHR_104` | Search Services | GET | Search serviceMaster + packageMaster | `searchText` (min 3 chars), `unitId`, `size=100` |
| `EHR_024` | Favorites (Follow-up) | GET | Load consultant's favorites for follow-up context | `consultant.login`, `encounterClass`, `searchText` |
| `EHR_027` | Follow-up Records | GET | Retrieve existing follow-up records | `encounterNumber` |
| `EHR_028` | Create/Update Follow-up | POST/PUT | Save follow-up scheduling record | `FollowUpRequestModel` payload |
| `MDM_001` | Value Set Master | GET | Lookup coded values (priorities, statuses) | `valueSetCode` |
| `MDM_003` | Order Sets | GET | Retrieve investigation order set templates | `_exists_:services AND !_exists_:drugs` |
| `MDM_004` | Service Masters | GET | Search all available service masters | `searchText`, `limit=20` |

### 12.2 Appointment APIs

| Code | Name | Method | Purpose | Key Parameters |
|---|---|---|---|---|
| `AMB_001` | Appointment Slots | GET | Fetch available resource calendars | `consultant`, `department`, `unit`, `dateRange` |
| `AMB_002` | Work Patterns | GET | Fetch active work patterns for consultant | `consultantId`, `status:active` |
| `AMB_003` | Create Appointment | POST | Book an appointment slot | `slot`, `patient`, `consultant`, `type` |

### 12.3 Direct REST APIs

| Endpoint | Method | Purpose | Key Parameters |
|---|---|---|---|
| `api/_search/investigation-order-records` | GET | Fetch existing orders for an encounter | `encounterNumber`, `size=100`, `sort=createdOn,desc` |
| `api/investigation-order-record-action` | POST | Create/submit investigation orders | `action:'ADD_AND_ORDER'`, `investigations[]` |
| `api/_search/fav-service` | GET | Alternative favorites endpoint | `consultant.login`, `type` |
| `api/_search/services` | GET | Alternative service search | `searchText`, `unitId` |

---

## 13. Data Models

### 13.1 Investigation Order Record

```typescript
interface InvestigationOrderRecord {
  id: string;
  orderNumber: string;
  orderDate: string;           // ISO date
  createdOn: string;           // ISO datetime
  status: 'ORDERED' | 'INPROGRESS' | 'REPORT_READY' | 'CANCELLED'
          | 'REJECTCED' | 'ADDED' | 'PROCESSED' | 'APPROVAL_REQUIRED';
  priority: 'NORMAL' | 'URGENT';
  instructions: string | null;
  encounter: {
    number: string;
    class: string;             // 'IMP', 'AMB', etc.
  };
  consultant: {
    login: string;
    displayName: string;
  };
  investigation: {
    code: string;
    name: string;
    id: string;
    groupCode: string;
    profile: boolean;
    serviceType: string;
    spItemType: string;
  };
  unit: {
    id: string;
    name: string;
  };
}
```

### 13.2 Raw Lab Result (API Response)

```typescript
interface RawLabResult {
  id: any;
  name: string;
  investigationDisplayName?: string;
  reportHoldStatus?: 'Y' | 'N' | null;
  report?: ReportAttachment[];
  services?: ServiceNode[];
  labResult?: {
    value: any;
    resultType: 'PARAMETER' | 'GENERAL';
    parameter?: ParameterValue[];
  };
  isProfile?: boolean;
}

interface ServiceNode {
  name: string;
  shortName?: string;
  investigationDisplayName?: string;
  investigationShortName?: string;
  isProfile?: boolean;
  services?: ServiceNode[];           // Recursive nesting
  labResult?: {
    value: any;
    resultType: 'PARAMETER' | 'GENERAL';
    parameter?: ParameterValue[];
    abnormalFlag?: string;
    unit?: string;
    referenceRange?: string;
  };
}

interface ParameterValue {
  name: string;
  value: any;
  abnormalFlag?: string;
  unit?: string;
  referenceRange?: string;
}

interface ReportAttachment {
  reportType: 'ATTACHMENT_REPORT' | 'DIAGNOSTIC_REPORT' | 'EXTERNAL_REPORT'
              | 'OUTSOURCE_REPORT' | 'LIS_REPORT' | 'SRM_REPORT';
  documentName?: string;
  pdfReport?: string;
  fileName?: string;
  extension?: string;
  category?: 'LAB' | 'DIAGNOSTIC';
}
```

### 13.3 Processed Lab Result (UI-Ready)

```typescript
interface ProcessedLabResult {
  name: string;
  showReport: boolean;
  id: any;
  JSON: LabItem[];
  singleService: boolean;
  onHold: boolean;
}

interface LabItem {
  name: string;
  flag: 'N' | 'H' | 'L' | 'PH' | 'PL' | 'AH' | 'AL';
  value: any;
  unit: string | null;
  referenceRange: string | null;
  subHeader: boolean;
}
```

### 13.4 Follow-Up Request Model

```typescript
interface FollowUpRequestModel {
  mode: 'DURATION' | 'DATE';
  date: Date | null;
  duration: string | null;
  notes: string;
  status: 'BOOKED';
  appointment: {
    id: string;
    slotTime: string;
    date: string;
  };
  investigation: Array<{
    name: string;
    code: string;
    type: string;
  }>;
  consultant: {
    login: string;
    displayName: string;
    id: string;
  };
  department: {
    code: string;
    name: string;
  };
  unit: {
    id: string;
    name: string;
  };
}
```

### 13.5 Trend Graph Data Point

```typescript
interface TrendDataPoint {
  date: Date;               // Parsed from ISO string
  value: number;            // Numeric value only
  flag: string;             // Abnormal flag for coloring
  label: string;            // Value as string for display on chart
  originalDateStr: string;  // Raw date string from API
}
```

---

## 14. Error Handling

### 14.1 API Failures

| Scenario | Handling |
|---|---|
| Favorites load fails (EHR_105/EHR_024) | Show empty list with "No favorites found" message; search still works |
| Search fails (EHR_104) | Show toast "Unable to search. Please try again." |
| Order submission fails | Show toast "Unable to place order. Please try again."; selection preserved for retry |
| Lab result load fails | Show toast; fall back to cached results if available |
| Appointment slot load fails (AMB_001) | Show "No slots available" with retry button |
| Report download fails | Show toast "Unable to download report"; no fallback |

### 14.2 Data Parsing Failures

| Scenario | Handling |
|---|---|
| Date parse fails (D3.js) | Fallback parser attempts alternate ISO format without milliseconds |
| Non-numeric value in trend graph | Parameter excluded from dropdown; cannot be charted |
| Missing abnormalFlag | Defaults to `'N'` (Normal) |
| Missing unit | Displays as blank (null) |
| Missing referenceRange | Displays as blank (null) |
| Empty services tree | `JSON` array empty, `singleService` = true |

### 14.3 Report Hold

When `reportHoldStatus === 'Y'`:
- Result is marked `onHold = true`
- No values or report link are displayed
- UI shows an indicator that results are being reviewed by the lab
- Processing pipeline terminates at Step 2 (no further processing)

---

## 15. Edge Cases

### 15.1 Ordering

| Edge Case | Behavior |
|---|---|
| Duplicate order for same investigation | Prevented client-side; item already in orders list is not selectable |
| Order for discharged patient | FAB button hidden; modal cannot be opened |
| Empty search (< 3 chars) | Search not triggered; favorites shown instead |
| Favorite not in current unit's service list | Still shown (favorites are consultant-level, not unit-filtered) |
| 250+ character instructions | Input truncated at 250 characters |

### 15.2 Result Processing

| Edge Case | Behavior |
|---|---|
| Result with both inline values AND report PDF | Inline values win; `showReport` forced to `false` (Step 5) |
| Result with only report PDF (no inline values) | `showReport = true`; PDF download link shown |
| Result with neither values nor report | Empty card shown; `JSON` array empty |
| 3+ levels of nesting | Only 3 levels traversed; deeper nesting silently ignored |
| Service list in reversed order | Level 1 services are `.reverse()`-d before processing |
| Result with `reportHoldStatus = 'Y'` | `onHold = true`; result not shown to doctor |
| Null/undefined flag | Normalized to `'N'` (Normal) |
| Reference range with inconsistent hyphen spacing | Normalized to `"min - max"` format |

### 15.3 Trend Graph

| Edge Case | Behavior |
|---|---|
| Single data point | Chart renders one point with no line; auto-scroll unnecessary |
| All values identical | Y-scale `.nice()` provides minimal padding (±2) |
| > 10 data points | Chart becomes scrollable; auto-scrolls to rightmost after 500ms |
| Non-numeric values mixed with numeric | Only numeric values charted; non-numeric excluded from dropdown |
| Date parse failure | Fallback parser used; if both fail, data point excluded |
| Zero data points for selected parameter | Empty chart with axes shown |

### 15.4 Matrix View

| Edge Case | Behavior |
|---|---|
| Single result (one date column) | Table renders with one column; no horizontal scroll |
| Parameter present in some dates but not others | Cell shows blank/dash for missing dates |
| Very long parameter names | Text truncated with ellipsis via CSS |
| Sub-profile with no leaf parameters | Section header row shown but empty section |

### 15.5 Follow-up Scheduling

| Edge Case | Behavior |
|---|---|
| No available appointment slots | "No slots available" message; doctor can change date |
| Consultant has no work pattern | AMB_002 returns empty; no slots displayed |
| Appointment creation fails | Toast error; follow-up record not created |
| Duplicate follow-up | System allows multiple follow-ups for same investigation |

---

## 16. Implementation Checklist

### Phase 1: Investigation Ordering

- [ ] Implement `InvestigationListPage` (modal)
  - [ ] Favorites loading via ATHMA EHR_105
  - [ ] Service search via ATHMA EHR_104 (min 3 chars, debounced)
  - [ ] Item selection with duplicate detection
  - [ ] Priority toggle (NORMAL/URGENT) per item
  - [ ] Instructions text input (max 250 chars)
  - [ ] Context menu (Add Instructions, Delete)
  - [ ] Submit via `api/investigation-order-record-action`
  - [ ] WebSocket chat message creation (category: INVESTIGATION_ORDER)

- [ ] Implement `InvestigationOrdersPage`
  - [ ] Load orders via `api/_search/investigation-order-records`
  - [ ] Group by orderDate (reverse chronological)
  - [ ] Render 8 status badges (including `REJECTCED` typo)
  - [ ] FAB button (hidden when discharged)

- [ ] Implement `FollowupInvestigationsPage`
  - [ ] Favorites tab (EHR_024)
  - [ ] Order Sets tab (MDM_003, expandable accordions)
  - [ ] Master Search tab (MDM_004, limit 20)
  - [ ] Cross-tab selection persistence
  - [ ] Build `FollowUpRequestModel.investigation[]`
  - [ ] Return to discharge summary

### Phase 2: Lab Result Processing

- [ ] Implement `LabResultProcesserUtil`
  - [ ] Step 1: Extract display name
  - [ ] Step 2: Report hold check
  - [ ] Step 3: Report availability check
  - [ ] Step 4: Recursive service tree traversal (3 levels)
    - [ ] Level 1 reversal
    - [ ] Sub-header generation for nested profiles
    - [ ] `fetchServiceData()` for leaf nodes
  - [ ] Step 5: Post-process (values win over report link)
  - [ ] `getJSONLabItem()` normalization
    - [ ] Display name priority chain (4 fallbacks)
    - [ ] Abnormal flag normalization (undefined/null/"" → "N")
    - [ ] Unit normalization
    - [ ] Reference range formatting (add spaces around hyphen)

### Phase 3: Result Display

- [ ] Implement `LabResultDetailsPage` (Matrix View)
  - [ ] 2D table: parameters (Y) × dates (X)
  - [ ] 3-level nested profile support
  - [ ] isProfile detection
  - [ ] PARAMETER vs GENERAL result type handling
  - [ ] Current column highlighting (#FFFDE7)
  - [ ] Abnormal value coloring (#E35241 red vs #717171 gray)
  - [ ] Date headers (HH:MM / DD/MM)
  - [ ] `ViewEncapsulation.None` for sticky headers
  - [ ] Auto-scroll to highlighted column

- [ ] Implement `ResultTrendGraphPage` (D3.js Chart)
  - [ ] D3.js setup (margins, dimensions, scales)
  - [ ] Date parsing with fallback
  - [ ] X scale (time, ±12h padding)
  - [ ] Y scale (linear, ±2 padding, .nice())
  - [ ] Grid (vertical dashed, horizontal solid)
  - [ ] Line rendering (d3.line(), #666666)
  - [ ] Data points (circles, radius 4px, colored by flag)
  - [ ] Value labels (10px, rotated -45°)
  - [ ] Fixed Y-axis (separate SVG)
  - [ ] Horizontal scrolling (50px/point min, 10 max visible)
  - [ ] Auto-scroll to right (500ms delay)
  - [ ] Parameter dropdown (numeric values only)
  - [ ] Screen rotation toggle
  - [ ] Half-screen mode support

### Phase 4: Reports & Downloads

- [ ] Report type resolution (6 types)
- [ ] File name construction per type
- [ ] Category constraints (LAB vs DIAGNOSTIC)
- [ ] Download via InAppBrowser or system viewer

### Phase 5: Filtering & Dedup

- [ ] Name filter (case-insensitive substring)
- [ ] Date filter (date-only match)
- [ ] Combined AND logic
- [ ] Most Recent deduplication by investigation code

### Phase 6: Follow-up Scheduling

- [ ] `FollowUpRequestModel` construction
- [ ] Mode selection (DURATION vs DATE)
- [ ] Slot loading via AMB_001
- [ ] Work pattern loading via AMB_002
- [ ] Appointment creation via AMB_003
- [ ] Follow-up record save via EHR_028
- [ ] Slot display with booked/available states

### Phase 7: Integration & Polish

- [ ] Error handling for all 17 API endpoints
- [ ] Loading states and skeletons
- [ ] Offline behavior (graceful degradation)
- [ ] Edge case handling (see Section 15)
- [ ] Performance: lazy-load D3.js only when trend graph opened
- [ ] Accessibility: color-blind safe indicators beyond red/green
