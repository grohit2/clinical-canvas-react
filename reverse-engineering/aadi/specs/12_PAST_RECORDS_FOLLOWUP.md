# AADI App - Past Records & Follow-Up System

**Source:** `aadi_src/src/app/pages/past-records*/`, `follow-up/`, `followup-investigations/`
**Services:** `services/past-records/`, `services/followup-investigations/`

---

## 1. Past Records System (6 pages)

### 1.1 Main Page (past-records.page.ts)

**Two segments:**
- **Overview** — Consultation summaries organized by date (newest first), paginated (5 per page, infinite scroll)
- **Tests** — Sub-segmented: LAB, RAD, OTHER (diagnostic), ATTACHMENT

### 1.2 Overview Display per Consultation

```typescript
ConsultationOverview {
    visitDisplay: "OP" | "IP";
    appointmentType?: "VIDEO_CONSULT" | string;
    department: string;
    summary: {
        document: {
            startDate, consultationDate,
            consultant: { displayName }
        }
    };
    chiefComplaint?: {
        records: Array<{ concept: { chiefComplaint: { name, hpi } } }>;
        notes?: string;
    };
    diagnosis?: {
        records: Array<{ concept: { diagnosis: { name, date } } }>;
        notes?: string;
    };
    notes?: {
        records: Array<{ concept: { notes: { label, text } } }>;
        notes?: string;
    };
    Investigation?: InvestigationRecord[];
    medication?: MedicationRecord;
    attachment?: AttachmentRecord[];
    initialAssessment?: boolean;
    opSummary?: any;
    ipSummary?: any;
}
```

### 1.3 Sub-Pages

| Page | Purpose | Data Source |
|------|---------|-------------|
| `past-records-summary` | OP or IP consultation detail modal | opSummary or ipSummary from consultation |
| `past-records-investigation` | Investigation reports with gallery | Generates gallery data for LAB/RAD/DIAGNOSTIC reports |
| `past-records-medication` | Medication history | Brand (B) / Generic (G) badges, status, instructions |
| `past-records-lab-result-details-view` | Drill-down lab result parameters | Flag-based abnormal indicators |
| `past-records-attachments` | Document/image viewer | Downloads via EHR_096 with ATHMA token |

### 1.4 Investigation Record Structure

```typescript
InvestigationRecord {
    id: string;
    type: "LAB" | "RAD" | "DIAGNOSTIC";
    concept: {
        labResult?: {
            name, investigationDisplayName, orderDate, orderedNumber,
            report: Array<{
                reportType: "ATTACHMENT_REPORT" | "EXTERNAL_REPORT" | "DIAGNOSTIC_REPORT" | "LIS_REPORT" | "RIS_REPORT" | "SRM_REPORT";
                fileAttachmentReport?: { documentName, extension, originalFileName };
                externalReport?: { fileName, extension };
                diagnosticReport?: { report: { pdfReport } };
                lisReportFile?: { fileName };
                risReportFile?: { fileName };
                srmReportFile?: { fileName };
            }>;
        };
        radResult?: {
            serviceName, orderedDate,
            report: ReportObject[],
            media: { id, imageMediaDetailsDTOList: ImageMediaDetails[] }
        };
        diagnosticResult?: {
            serviceName, orderedDate, report: ReportObject[]
        };
    };
}
```

### 1.5 Past Records APIs

| Code | Method | Query | Purpose |
|------|--------|-------|---------|
| EHR_017 | POST | `document.patient.mrn AND !document.encounter.documentNumber AND document.consultationStatus:(DONE OR IN_PROGRESS)&size=5&page={n}&sort=document.consultationDate,desc` | Consultation list (paginated) |
| EHR_018 | GET | By encounter | OP (outpatient) summary |
| DS_001 | GET | By admission | IP (inpatient) summary |
| EHR_015 | POST | `encounter.documentNumber AND patient.mrn AND active:true&sort=createdOn,desc` | Encounter attachments |
| EHR_092 | POST | `patient.mrn [AND encounter.documentNumber] AND active:true&size=100&sort=createdOn,desc` | Past record attachment files |
| EHR_096 | GET | `/{attachmentId}` | Download attachment file (via athma-file-with-token) |
| DMS_001 | POST | Patient query | Document management system attachments |
| Direct GET | `api/_search/investigation-order-records?encounterNumber={enc}&size=100&sort=createdOn,desc` | Investigation orders |

---

## 2. Follow-Up System

### 2.1 Follow-Up Request Model

```typescript
FollowUpRequestModel {
    mode: "DURATION" | "DATE";
    date?: string;                      // ISO datetime
    duration?: string;                  // e.g., "5 Days"
    consultant: {
        id, name, code,
        resourceType: "USER",
        displayName
    };
    department: { id, name, code };
    unit: { id, name, code };
    appointment: {
        id, number,
        appointmentType: "APPOINTMENT" | "VIDEO_CONSULT" | "TELE_CONSULT"
    };
    investigation: Array<{ name, code, type }>;
    notes?: string;
    status?: string;                    // default: "BOOKED"
}
```

### 2.2 Two Scheduling Modes

**Duration Mode:**
```
1. Select duration: 1-7 days (quick buttons) or custom value (max 2 digits, <100)
2. Select unit: Days / Weeks / Months / Years
3. Select appointment type: Physical / Video / Tele
4. System calculates date = encounterDate + duration
5. Category: "FU" (Follow-up)
6. Save → EHR_028 POST (createFollowupRecord)
```

**Date Mode:**
```
1. Select date via CalendarModalPage
2. Fetch available slots → AMB_001 GET (resourceIds, date, unitId)
3. Filter slots by:
   - status = AVAILABLE
   - endTime > current time
   - Not overbooked
   - slotType includes selected appointment type
4. Group by Healthcare Service Center (HSC)
5. Display in 3 time blocks:
   - Morning: 06:00-12:00
   - Afternoon: 12:01-18:00
   - Evening: 18:01-23:59
6. User selects slot (validates consecutive availability for longer consultations)
7. Book → AMB_003 POST (create appointment)
8. Save → EHR_028 POST (createFollowupRecord with appointment details)
```

### 2.3 Slot Model

```typescript
Slot {
    id: string;
    status: "AVAILABLE" | string;
    startTime: Date;
    endTime: Date;
    slotType: string[];                 // ["APPOINTMENT", "VIDEO_CONSULT", ...]
    healthcareServiceCenter: { id, name, code, tariffClass };
    resource: { id, resourceType };
    unit, department: object;
    overBooked?: boolean;
    workPatternId?: string;
}

WorkPattern {
    id: string;
    slotDurations: Array<{
        duration: number;               // minutes
        consultationCategory?: { code };
    }>;
}
```

### 2.4 Investigation Selection Modal (3 modes)

| Mode | API Code | Description |
|------|----------|-------------|
| Favorites | EHR_024 | Consultant's favorite investigations (by login + encounter class) |
| Order Sets | MDM_003 | Pre-defined investigation bundles (expandable/collapsible) |
| Master Search | MDM_004 | Global investigation search (min 3 chars) |

### 2.5 Follow-Up APIs

| Code | Method | Purpose |
|------|--------|---------|
| EHR_024 | POST | Favorite investigations |
| EHR_027 | POST | Get existing follow-ups for encounter (excl. CANCELLED_BY_DOCTOR) |
| EHR_027 | GET | Get specific follow-up by ID |
| EHR_028 | POST | Create follow-up record |
| EHR_028 | PUT | Update follow-up record |
| AMB_001 | GET | Available appointment slots (`?resourceIds&date&unitId&resourceType=USER`) |
| AMB_002 | GET | Consultant work patterns/durations (`?resourceId&unitId&resourceType=USER`) |
| AMB_003 | POST | Create appointment |
| MDM_001 | GET | Configuration: `follow_up_additional_consultation_type` (video/tele) |
| MDM_003 | GET | Order set list |
| MDM_004 | GET | Investigation master search |

### 2.6 Existing Follow-Up Display

Shows all follow-ups for current encounter (excl. CANCELLED_BY_DOCTOR):
- Mode (Duration/Date)
- Appointment type
- Consultant name
- Unit
- Notes
- Helps prevent duplicate follow-ups

### 2.7 Validation

| Check | Message |
|-------|---------|
| Missing unit | "Please check the unit name." |
| Missing consultant | "Please check the consultant name." |
| Invalid duration | "Please check the duration." (must be >0, <100) |
| No slot selected | "Please select the appointment time." |
| Duplicate appointment | "Another active appointment is available..." |
