# AADI App - Vital Trends, Viewers, Tasks & Settings

**Source:** `aadi_src/src/app/pages/vital-trends/`, `patient-ecg/`, `ct-scorecard/`, `tasks-*/`, `notification-preferences/`, `whats-new/`, `faq/`, `feedback/`, `image-editing-modal/`, `html-viewer/`, `pdfview/`, `log-messages/`, `send-for-review/`, `inpatient-filter-sortby/`

---

## 1. Vital Trends (D3.js Charts)

### 1.1 Supported Vitals (11 parameters)

| Vital | Color | Notes |
|-------|-------|-------|
| Blood Pressure (Systolic) | #1f77b4 | Split from combined "Blood Pressure" or individual fields |
| Blood Pressure (Diastolic) | #00A88F | |
| Heart Rate | #E3BC02 (golden) | |
| Temperature | #ce5252 (red) | Auto C→F conversion if unit=="C": `(C * 9/5 + 32)` |
| SpO2 | #772F67 (purple) | |
| Respiratory Rate | #5a359c (deep purple) | |
| Arterial Pressure (Sys/Dia) | #429ede, #08e0c0 | |
| BP Lying (Sys/Dia) | #5fb5c9, #bfdd34 | |
| BP Standing (Sys/Dia) | #acee94, #26697e | |
| BP Sitting (Sys/Dia) | #d56fc3, #6700ff | |
| CRT | #9d9df6 | Capillary Refill Time |
| CHEWS Score | #f6a001 (orange) | Clinical early warning |

### 1.2 D3.js Chart Configuration

```
Library: D3.js v4+
Line stroke: 1.5px default, 2.5px hover
Circle radius: 3px default, 6px hover
Hover effect: Selected line opacity 1.0, others 0.1
X-axis: Time scale, 5 ticks, format "HH:MM DD/MM"
Y-axis: Dynamic range, 20-unit intervals for combined view
Grid: Horizontal lines, light gray
Margins: 50px default, 30px SVG translate
```

### 1.3 View Modes

| Mode | Description |
|------|-------------|
| **Combined Graph** | All vitals overlaid with legend toggle control |
| **Individual Charts** | 11 separate scrollable line charts |
| **Table** | Horizontal scrolling table with data values |

### 1.4 Date Range

- **From Date**: Default = admission date or 0-4 days before today (ICU=0 days, non-ICU=4 days)
- **To Date**: Default = today 23:59:59
- Calendar picker via CalendarModalPage
- Validation: fromDate cannot exceed toDate, cannot be before admission

### 1.5 Auto-scroll

Charts auto-scroll right on load (1000ms delay) to show most recent data. Scroll button appears for partial scroll.

### 1.6 API

```
ATHMA EHR_033 GET
  ?patient.mrn.raw:{mrn}
  &encounter.documentNumber.raw:{enc}
  &otherDetails.recordedTime:[{fromDate} TO {toDate}]
  &size=1000
Response: { data[], services[], dates[] }
```

### 1.7 Orientation

- Landscape: width = screen.availWidth - 80
- Portrait: width = screen.availWidth - 15
- Re-renders chart on orientation change

---

## 2. Patient ECG Viewer

```typescript
// Embedded iframe viewer for cardiac monitoring
Input: { mainURL, grpcURL, apiURL, patchId, token }
→ Lock to landscape
→ Load iframe with sanitized mainURL
→ PostMessage API sends: { patchId, token, apiURL, grpcURL }
→ Iframe renders real-time waveforms
```

**API:** `GET api/athma/_search/patient-vitals-device_info?mrn={mrn}&encounterNumber={enc}`

---

## 3. CT Scorecard (Clinical Tracking)

### 3.1 Score: 0-25 integer scale

### 3.2 Data Model

```typescript
CTScore {
    id: string;
    score: number;                     // 0-25, no decimals
    recordDate: string;                // YYYY-MM-DD
    createdDate: ISO8601;
    createdBy: string;
    createdByName: string;
    modifyDate: ISO8601 | null;
    modifyBy: string | null;
    modifiedByName: string;
    patientInfo: { id };
    active: boolean;
}
```

### 3.3 Operations

| Action | Validation |
|--------|-----------|
| Create | Integer 0-25 only, no duplicates per date |
| Delete | Soft delete (active=false), confirmation modal |
| View | Sorted by recordDate desc, then id desc |

### 3.4 API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `api/_search/ct-scores?patientInfoId={id}&sort=recordDate,desc&sort=id,desc` | Fetch scores |
| POST | `api/ct-scores` | Create score |
| PUT | `api/ct-scores` | Delete (sets active=false, modifyDate, modifyBy) |

---

## 4. Task Management (Nursing Capture Notes)

### 4.1 Task Model

```typescript
Task {
    name: string;                      // Max 25 chars
    description: string;
    patient: { id, mrn };
    encounter: { documentNumber };
    taskDefinition: { id: 1, code: "NURSING-CAPTURE-NOTES", name: "Capture Note" };
    priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
    workflowStatus: "OPEN";
    taskStatus: "OPEN" | "CLOSED";
    assignee: { id, login, displayName, employeeNo };  // Auto from accepting nurse
    startsOn: ISO8601;
    dueOn: ISO8601;
    createdBy: { id, login, displayName, employeeNo };
    active: boolean;
}
```

### 4.2 Validation

- Title: non-empty, max 25 chars
- startsOn: cannot be < current time (create) or creation time (edit)
- dueOn: must be >= startsOn (min 1 hour difference)
- Priority: defaults to MEDIUM

### 4.3 Task History

- Sorted by ID desc (newest first)
- Edit/Delete: Only if taskStatus=OPEN AND user is creator
- Description: Truncated at 70 chars with "Read more..." expansion
- Delete: Confirmation modal, sets active=false

### 4.4 API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `api/_search/task-dtos?query=active:true AND encounter.documentNumber AND taskDefinition.code:"NURSING-CAPTURE-NOTES"&size=100&sort=id,desc` | Fetch tasks |
| POST | `api/tasks` | Create task (observe: response) |
| PUT | `api/tasks/{id}` | Update/delete task (observe: response) |
| GET | `api/task-enabled/{unitCode}` | Check feature flag |
| GET | `api/patient-infos/{patientId}` | Get patient info (accepting nurse) |
| GET | `api/_search/user?login={login}` | Get user info |

---

## 5. Notification Preferences

### 5.1 Categories

| Category | Behavior |
|----------|----------|
| **Mandatory** | Lock icon, toggle disabled, always enabled |
| **Optional** | Toggle enabled, user can disable |

### 5.2 Change Detection

Deep comparison: `JSON.stringify(original) !== JSON.stringify(current)` → enables Save button

### 5.3 API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `api/_search/user-notification-preferences/{login}` | Fetch preferences |
| PUT | `api/_update/user-notification-preferences/{login}` | Save preferences (observe: response) |

---

## 6. What's New Changelog

### 6.1 Data Structure

```typescript
{ version, ReleaseDate, features: [{ description }], playstoreLink }
```

### 6.2 App Version Check

```
Capacitor App.getInfo() → current version
Compare with stored APP_VERSION
If outdated → alert with "Update" (opens Play Store) / "No Thanks"
```

### 6.3 API: `GET api/fetch/app-feature-info`

---

## 7. FAQ

- Single hardcoded FAQ: "How do I delete my account?"
- Dynamic email: `PatientInfoService.getFaqClientEmail(client)` → fallback: `it.appsupport@athma.health`

---

## 8. Feedback Surveys

### 8.1 Model

```typescript
Feedback {
    id: string;
    name: string;                      // Survey title
    description: string;
    createdOn: ISO8601;
    feedbackLink: string;              // External survey URL
    viewedParticipants: [{ login }];
    surveyDone: boolean;               // Computed: current user in viewedParticipants
}
```

### 8.2 Flow

1. Click survey link → `Browser.open(feedbackLink)` externally
2. Simultaneously mark as done → `POST api/_update/customer-feedback-view-status/{login}`
3. Reload list to refresh status

### 8.3 API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `api/_load/my-customer-feedback-list/{login}` | All surveys |
| POST | `api/_update/customer-feedback-view-status/{login}` | Mark done |
| GET | `api/_load/my-pending-customer-feedback-list/{login}` | Pending surveys |
| GET | `api/_load/down-time-info` | Server downtime info |

### 8.4 Downtime Model

```typescript
{ startTime, expiry, description (with <START_TIME> and <EXPIRY_TIME> placeholders), active }
```

---

## 9. Image Editing Modal

### 9.1 Capabilities

| Feature | Implementation |
|---------|---------------|
| Camera capture | Capacitor Camera, quality 50, 800x1250px |
| Gallery select | Multi-select up to 8, quality 50, 800x1250px |
| Crop | angular-cropperjs: dragMode=none, aspectRatio=NaN, autoCrop=false, autoCropArea=0.8 |
| Rotate | Left/right with degree tracking, active state CSS |
| Delete | Per-image with confirmation |
| Retake | Replace current image via camera |
| Max images | 8 per session |

### 9.2 Output

```typescript
Array<{ src: webURL, rawSrc: filePath, name: filename, path: fullPath, data: base64 }>
```

---

## 10. HTML Viewer

### 10.1 Two Display Modes

**Drug Monograph** (`modalFor: "MONOGRAPH"`):
- API: `medicationService.showMonograph(drugCode)` → EHR_115
- Content: HTML extracted via `data["body"].getHTML()`

**Drug Interaction** (`modalFor: "DRUGINTERACTION"`):
- API: `medicationService.showDrugInteraction(encounterNo, mrn)` → EHR_119
- Logo replacement: `D:\Local\CIMS_Logo.png` → `assets/CIMS_integrated_logo.png`
- H3 height cap: 150px via regex
- jQuery tabs initialization script injected

### 10.2 Footer Branding

CIMS integrated logo (28px) + copyright notice (8px font)

---

## 11. PDF/Image Viewer (pdfview)

### 11.1 Supported Formats

PDF (.pdf), JPEG (.jpeg/.jpg), PNG (.png)

### 11.2 Report Types Handled

ATTACHMENT_REPORT, DIAGNOSTIC_REPORT, EXTERNAL_REPORT, OUTSOURCE_REPORT, LIS_REPORT, SRM_REPORT

### 11.3 Features

- Download with Bearer + athmaToken headers
- Write to `Directory.Data/{mrn}/` as base64
- Convert via `Capacitor.convertFileSrc()` for display
- Navigation: Previous/Next pagination with "N/M Files" counter
- Pinch zoom for mobile

---

## 12. Log Messages (Debug Viewer)

```sql
-- Data source
SELECT * FROM ErrorMessage ORDER BY eventtimer DESC
-- Columns: url, description, eventtimer

-- Clear operation
DELETE FROM ErrorMessage
```

- HTML table: dark header, alternating row colors, 11px font
- Refresh + Clear buttons

---

## 13. Send for Review (Discharge Summary)

### 13.1 Doctor Search

- API: `careTeamManagementService.getEmployeeListFromUnits(unitIds, searchTerm)`
- Min 2 chars trigger
- Selection: `{ doctor: { displayName }, department: { name }, createdOn }`

### 13.2 Swipe-to-Confirm Gesture

```
0%   → "Swipe to confirm" (teal border #2FB7B1)
30%  → "Swipe to add" (green #8DA378)
60%  → "Confirmed" (orange #FF8A33, checkmark icon)
100% → Execute submission

Touch events: touchstart (reset), touchmove (calculate), touchend (finalize/reset)
Container: screen.availWidth - 84
Validation: Doctor name must match selected object
```

---

## 14. Inpatient Sort-By Configuration

### 14.1 Sort Columns (4)

| Column | Field | Default Icon |
|--------|-------|-------------|
| Alphabetical | `name` | a-z.svg |
| Date of Admission | `admission_date` | 1-9.svg |
| Bed Number | `location` | 1-9.svg |
| Risk Score | `risk_score` | percent.svg |

### 14.2 Sort States

Empty → Ascending (light blue bg) → Descending (dark blue bg) → Empty (cycle)

### 14.3 Persistence

Storage key: `AppStorageKeys.SORT_BY_DETAIL`
Format: `{ sortByColumn: string, sortByOrder: "asc"|"desc"|null }`

---

## 15. Current Medication Dashboard (Supplement to 04_MEDICATION_SYSTEM.md)

### 15.1 Five Categories (auto-segmented by mode.code)

REGULAR, SOS, INFUSION, NARCOTIC, STAT + STOPPED (archived)

### 15.2 24-Hour Timeline

```
Night     (00-06): #E3E3FF (blue)    → late-night.svg
Morning   (06-11): #FFF8E9 (yellow)  → early-morning.svg
Afternoon (11-15): #FFF0E9 (orange)  → noon.svg
Evening   (15-20): #F9F0FF (purple)  → mid-evening.svg
Night     (20-24): #E3E3FF (blue)    → late-night.svg
```

### 15.3 Slot Status Colors

| Status | Background CSS Variable | Visual |
|--------|------------------------|--------|
| PENDING | --slot-pending-color | — |
| ADMINISTERED | --slot-adminstered-color | Checkmark |
| OVERDUE | --slot-overdue-bg-color | **!** |
| HOLD | — | **W** |
| REFUSED | — | **R** |
| REVIEWED | --slot-reviewed-color | Approved icon |
| PENDING_REVIEW | — | Pending icon |

Additional legend badges: V=Vomited, M=Modified, S=Stopped, A=Allergy

### 15.4 Three View Modes

- **default**: Full 24-hour grid, all hourly slots visible
- **minimised**: Empty slots hidden, infusion bars compressed to 15px
- **list**: Vertical list view

### 15.5 Infusion Progress Bar

```typescript
// Width calculation
width = ((endTime - startTime) / 60min) * slotWidth
// Capped at 60 minutes (SLOT_DURATION_MINUTES)
// Start/end slots marked with distinct styling
```

### 15.6 Medicine Reconciliation

```
Load → getReconciledMedicationList(encounterNumber)
  → continuosMedicationList (status != STOPPED)
  → stoppedMedicationList (status == STOPPED)
Select medications → checkboxes (pre-checked non-ADDED items locked)
Swipe to confirm → orderMedicationReconcileRecord(idArray)
```

### 15.7 Medicine Card Popups (Stop/Hold/Cancel)

| Modal Type | Action | API |
|-----------|--------|-----|
| STOP_MEDICATION | Stop active med | EHR_118 PUT (reason required) |
| WITHHOLD_MEDICATION | Temporarily hold | EHR_114 PUT (reason required) |
| CANCEL_MEDICATION | Cancel ordered med | medicationService.cancelMedication |
| MEDICATION_DETAILS | View full info | Read-only display |
| PROMPT_ORDER_SCREEN | Confirm continuing meds | orderMedicationReconcileRecord |

Reason field: max 2000 chars, required for stop/hold/cancel

### 15.8 Medicine Slots Selection (IV Timing)

- 24-hour vertical timeline with time-zone colored backgrounds
- Tap to add slot at specific hour
- customDose per slot if slideDose=true
- Remove individual slots
- Output: `slots: [{ slotTime: "08:00", qty: "1", dose: "500" }]`
