# AADI App - Lab Results & Investigation System

**Source:** `aadi_src/src/app/pages/investigation-*/`, `result-*/`, `lab-result-*/`, `provisional-lab/`

---

## 1. Investigation Order Flow

### Ordering Sequence

```
1. LOAD FAVORITES
   → ATHMA EHR_105 GET
     query: document.consultant.login.raw:{login} AND type:investigation-order
            AND document.name:(*) AND document.encounterClass:IMP
     size=50, sort=version,desc&sort=document.name.sort,asc

2. SEARCH SERVICES
   → ATHMA EHR_104 GET (by unit)
     query: serviceMaster.code/name/shortName OR packageMaster.code/name/abbreviation
     unitId={unitId}, size=100
   → Or direct: GET api/_search/services?serviceMasterSearchParam={query}&unitId={unitId}&size=100

3. SELECT SERVICES
   → Checkbox multi-select
   → Set priority: NORMAL (default) or URGENT (red flag icon)
   → Add instructions: 0-250 characters per service

4. LOAD EXISTING ORDERS
   → GET api/_search/investigation-order-records?encounterNumber={enc}&size=100&sort=createdOn,desc
   → Duplicate detection: alert if same service already ordered

5. SUBMIT ORDER
   → POST api/investigation-order-record-action
   Body: {
       concept: {
           investigationOrder: [{
               priority: "NORMAL" | "URGENT",
               servicePackageDTO: { code, name, id, profile, serviceType, spItemType },
               status: "ADDED",
               instructions: "optional text",
               orderDate: ISO datetime
           }]
       },
       action: "ADD_AND_ORDER",
       mrn: string,
       encounterNumber: string,
       actionBy: string
   }
```

### Investigation Order Status

```
ADDED → ORDERED → INPROGRESS → REPORT_READY → PROCESSED
                                    ↓
                            APPROVAL_REQUIRED
ORDERED → CANCELLED
ORDERED → REJECTCED (sic - typo in source)
```

### Investigation Service Model

```typescript
interface InvestigationService {
    code: string;                      // Service code
    id: number;                        // Service ID
    name: string;                      // Display name
    groupCode: string;                 // Group/category code
    profile: boolean;                  // Is a package/panel of tests?
    serviceType: { code: string };     // Service type
    spItemType: string;                // Item type
    // Frontend additions:
    isChecked?: boolean;               // Selection state
    instructions?: string;             // User instructions (0-250 chars)
    priority?: 'NORMAL' | 'URGENT';    // Set during ordering
}
```

---

## 2. Lab Result Data Model

### Core Structure

```typescript
interface LabResult {
    // Identification
    code: string;
    name: string;
    investigationDisplayName: string;
    investigationShortName: string;
    shortName: string;

    // Result values
    value: string | number | null;
    resultType: 'GENERAL' | 'PARAMETER';

    // Units and reference
    unit: string | null;
    referenceRange: string | null;      // Format: "min - max"

    // Abnormality flags
    abnormalFlag: 'N' | 'H' | 'L' | 'PH' | 'PL' | 'AH' | 'AL' | null;
    // N=Normal, H=High, L=Low
    // PH=Panic High, PL=Panic Low, AH=Alert High, AL=Alert Low

    // Report status
    reportHoldStatus: 'Y' | 'N' | null;
    reportStatus: string | null;

    // Timestamps
    orderDate: string;                  // ISO datetime
    collectedDate?: string;             // Actual collection time
    orderedNumber: string;              // Order reference

    // Multi-parameter results
    parameter: Array<{
        name: string;
        value: string | number;
        unit: string;
        referenceRange: string;
        abnormalFlag: string;
        investigationDisplayName: string;
        investigationShortName: string;
        reportHoldStatus: string;
    }>;

    // Report attachments
    report: Array<{
        reportType: 'ATTACHMENT_REPORT' | 'DIAGNOSTIC_REPORT' |
                    'EXTERNAL_REPORT' | 'LIS_REPORT' | 'SRM_REPORT';
        fileAttachmentReport?: { documentName: string; extension: string; originalFileName: string };
        externalReport?: { fileName: string; extension: string };
        diagnosticReport?: { report: { pdfReport: string } };
        lisReportFile?: { fileName: string; documentType: string };
        srmReportFile?: { fileName: string; documentType: string };
    }>;
}
```

---

## 3. Lab Result Processing (LabResultProcesserUtil)

**File:** `util/LabResultProcesserUtil.ts`

### Processing Pipeline

```
Input: Raw lab result object (from PatientMessage.content)
  ↓
Step 1: Extract display name
  → investigationDisplayName || investigationShortName || shortName || name
  ↓
Step 2: Check report hold
  → if reportHoldStatus === 'Y' → set onHold=true, return early
  ↓
Step 3: Check report availability
  → if report.length > 0 → set showReport=true
  ↓
Step 4: Process services tree (recursive, up to 3 levels)
  → If no child services: fetchServiceData(obj) directly
  → If has children: reverse services, recurse each child
  ↓
Step 5: Single service optimization
  → if JSON.length==1 && resultType=GENERAL && value!=null → singleService=true
  ↓
Output: DisplayData { name, showReport, id, JSON[], singleService, onHold }
```

### Result Type Handling

**GENERAL (single value):**
```
→ Extract: value, unit, referenceRange, abnormalFlag
→ Create single display row
```

**PARAMETER (multi-value panel):**
```
→ Add subheader with service name
→ For each parameter with non-null value:
  → Create display row with name, flag, value, unit, referenceRange
```

### Output Format

```typescript
{
    name: string,
    showReport: boolean,
    id: string,
    JSON: Array<{
        name: string,
        flag: 'N' | 'H' | 'L' | 'PH' | 'PL' | 'AH' | 'AL',
        value: any,
        unit: string | null,
        referenceRange: string | null,    // Formatted: "5 - 10"
        subHeader: boolean                // true for section headers
    }>,
    singleService: boolean,
    onHold: boolean
}
```

### Normalization Rules

- Abnormal flag: `null/undefined` → `'N'`
- Unit: empty string → `null`
- Reference range: replace `"-"` → `" - "` for readability
- Display name priority: investigationDisplayName > investigationShortName > shortName > name

---

## 4. Abnormal Flag Color Coding

| Flag | Meaning | Color | Icon |
|------|---------|-------|------|
| N | Normal | Green (#5FBA63) | None |
| H | High | Red (#E35241) | Arrow up |
| L | Low | Red (#E35241) | Arrow down |
| PH | Panic High | Red (#F43636) | Arrow up |
| PL | Panic Low | Red (#F43636) | Arrow down |
| AH | Alert High | Red | Arrow up |
| AL | Alert Low | Red | Arrow down |
| — | No flag | Gray (#717171) | None |

---

## 5. Result Display Views

### List View (result-list.page.ts)

- Grouped by result date (newest first)
- Each item shows: test name, last update time, value (if single), abnormal indicator
- File icon if report attached
- "On Hold" text if reportHoldStatus='Y'

### Detail/Matrix View (lab-result-details.page.ts)

- 2D matrix: Services (Y-axis) x Test Dates (X-axis)
- Left column: service names with units and reference ranges
- Top row: dates formatted as HH:MM / DD/MM
- Current result column highlighted (background #FFFDE7)
- Color-coded cells based on abnormal flags

### Trend Graph (result-trend-graph.page.ts)

**Library:** D3.js v4+

**Configuration:**
```
X-axis: d3.scaleTime() with 12-hour padding
Y-axis: d3.scaleLinear() with nice() rounding
Grid: light gray dashed (#ededed)
Points: radius 4px
  → Normal: Green (#7dc9b8)
  → Abnormal: Red (#F43636)
Labels: 10px font, rotated -45 degrees
```

**Data preparation:**
- Filter numeric values only
- Parse dates (handles millisecond precision 0-999)
- Create array: `[{ date: Date, value: number, abnormalFlag: string }]`

**Responsive:**
- Portrait: standard height
- Landscape: 200px height
- Auto-scroll to rightmost point
- Recalculates on orientation change

**Dropdown selection:** Only services with numeric values appear in selector

---

## 6. Result Filtering

**Page:** `result-filters.page.ts`

### Filter Dimensions

| Dimension | Type | Logic |
|-----------|------|-------|
| Result Name | Multi-select with search | Case-insensitive, master checkbox, indeterminate state |
| Result Date | Multi-select with search | DD/MM/YYYY format, master checkbox |

### Filter Combination

```
Name only → filter by selected names
Date only → filter by selected dates
Both → AND operation (name intersection date)
Neither → show all results
```

### Most Recent Logic

```typescript
// Deduplicates by service code, keeps newest per service
const seen = new Set();
results.filter(r => {
    const code = r.content.concept.labResult.code;
    if (seen.has(code)) return false;
    seen.add(code);
    return true;
});
```

---

## 7. Provisional Lab Results

**Page:** `provisional-lab.page.ts`

### API

```
ATHMA LIS_003 GET
  ?mrn={mrn}&status=VALIDATED&financialClearance=true&size=50&sort=collectionTime,desc
```

### Display

- Grouped by `validatedDate` (YYYY-MM-DD)
- Each section: date header + result items
- Newest first

### PDF Download

```
ATHMA LIS_004 GET → /{id}
Response: Blob (PDF)
→ Creates object URL → Opens in PdfsummaryPage modal
```

---

## 8. Report Download

### Report Types & File Formats

| Report Type | Supported Extensions |
|-------------|---------------------|
| ATTACHMENT_REPORT | pdf, jpeg, jpg, png |
| DIAGNOSTIC_REPORT | any (embedded pdfReport) |
| EXTERNAL_REPORT | pdf, jpeg, jpg, png |
| LIS_REPORT | pdf |
| SRM_REPORT | pdf |

### Download Endpoint

```
GET api/_download/investigationreport/{id}
  ?reportType={type}&documentName={name}&resultType={resultType}
Headers: Authorization: Bearer {token}
Optional: athmaToken header for ATHMA-sourced reports
```

### File Caching

```
Downloaded → Filesystem.writeFile(Directory.Data/{MRN}/{filename})
→ appCacheFilePath stored in message content
→ Subsequent renders use cached path
```

---

## 9. Pipes for Lab Results

| Pipe | Purpose |
|------|---------|
| `labResultGenerator` | Calls `LabResultProcesserUtil.process()` → returns display data |
| `pdfresultfilter` | Filters report array to displayable types (PDF/JPEG/PNG) |
| `reverselabresultservice` | Reverses array for newest-first display |

---

## 10. Result View Component

**Page:** `result-view-page.component.ts`

### Interaction Flow

```
ResultListPage (main container)
├── Filter (ResultFiltersPage modal)
├── Group by date
├── Display by category:
│   ├── LAB_RESULT → ResultViewPageComponent
│   │   ├── Result Matrix (LabResultDetailsPage modal)
│   │   │   └── Select test → ResultTrendGraphPage modal (D3)
│   │   └── Report → GalleryViewPage
│   │
│   ├── INVESTIGATION_REPORT (DIAGNOSTIC/RAD)
│   │   └── ResultViewPageComponent → GalleryViewPage
│   │
│   └── RAD_RESULT
│       └── ResultViewPageComponent → Gallery or ImageModalPage
│
├── Provisional Lab (ProvisionalLabPage modal)
│   └── Download PDF → PdfsummaryPage
│
└── Search + filter controls
```

---

## 11. API Endpoints Summary

| Operation | Endpoint | Method |
|-----------|----------|--------|
| Search services | `api/_search/services?serviceMasterSearchParam&unitId` | GET |
| Get favorites | ATHMA EHR_105 | GET |
| Search by unit | ATHMA EHR_104 | GET |
| Existing orders | `api/_search/investigation-order-records?encounterNumber` | GET |
| Save order | `api/investigation-order-record-action` | POST |
| Provisional results | ATHMA LIS_003 | GET |
| Download PDF | ATHMA LIS_004 | GET |
| Investigation by doc# | ATHMA EHR_014 | GET |
| Download report | `api/_download/investigationreport/{id}` | GET |
