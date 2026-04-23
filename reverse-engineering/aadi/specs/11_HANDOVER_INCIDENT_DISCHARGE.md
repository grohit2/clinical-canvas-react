# AADI App - Handover, Incident Report & Discharge Intimation

**Source:** `aadi_src/src/app/pages/handover-request/`, `incident-report/`, `discharge-intimation/`
**Services:** `services/handover-request/`, `services/incident-report/`

---

## 1. Handover Request System

### 1.1 Data Model

```typescript
HandoverRequest {
    name: "Consultant Handover";
    description: "Consultant handover request";
    patient: { mrn: string, displayName: string };
    encounter: { documentNumber: string };
    taskDefinition: {
        id: 2,
        code: "IP-CONSULTANT-HANDOVER",
        name: "Inpatient Consultant handover"
    };
    priority: "HIGH";
    taskStatus: "REQUESTED" | "ACCEPTED" | "REJECTED";
    assignee: { id, login, displayName, employeeNo };
    createdBy: { id, login, displayName, employeeNo };
}
```

### 1.2 Status Flow

```
[REQUESTED] ──→ Accept ──→ [ACCEPTED] (patient transferred to accepting consultant)
      │
      └──→ Reject ──→ [REJECTED] (patient stays with original consultant)
```

### 1.3 Handover List Display

- Modal with patient cards showing: avatar, name, gender/age/weight, consultant, location, risk score, badges (MFD/MLC/visit type)
- **Accept button**: Sets taskStatus="ACCEPTED" → `POST api/consultant/handover-tasks`
  - On success: DB update `consultant_handover_status = 'ACCEPTED'`, toast "Patient added successfully"
- **Reject button**: Sets taskStatus="REJECTED" → same API
  - On success: DB update `consultant_handover_status = 'REJECTED'`, toast "Patient rejected successfully"

### 1.4 Data Source
```sql
-- Handover requests for current user
SELECT * FROM PatientInfo
WHERE accepting_consultant_login = {loginId}
AND consultant_handover_status = 'REQUESTED'
```

### 1.5 API
| Method | Endpoint | Body | Purpose |
|--------|----------|------|---------|
| POST | `api/consultant/handover-tasks` | `[handoverObj, ...]` (array) | Submit accept/reject |

---

## 2. Incident Report System

### 2.1 Data Model

```typescript
IncidentReport {
    createdBy: string;                          // login
    createdOn: ISO8601;                         // YYYY-MM-DDTHH:mm:ss.SSS
    description: string;                        // Max 2000 chars, REQUIRED
    mrno: string;
    encounterNo: string;
    reportedOn: ISO8601;
    reporterLogin: string;
    reporterName: string;                       // firstName
    reporterType: "STAFF";
    status: "NEW";
    type: "PATIENT";
    party: "PATIENT";
    documents: string[];                        // File names array
    documentsDetails: Array<{
        id: null;
        "aadi-filePath": string;                // Server path from upload response
        documentName: string;
        uploadedBy: string;
        active: true;
        documentType: "IMAGE";
        source: { documentType: "AADI", referenceNumber: null };
    }>;
}
```

### 2.2 Form Fields

| Field | Type | Validation | Required |
|-------|------|-----------|----------|
| Description | Textarea | Max 2000 chars, non-empty | YES |
| Attachments | Image/PDF array | Max 5 files, quality 50 | NO |

### 2.3 File Upload Flow

```
1. User selects image (camera or gallery, quality: 50)
2. Convert blob to File: new File([blob], 'image_${Date.now()}.jpg')
3. FileReader → base64 data
4. POST api/athma/_upload/base64FileDataWithChecksum
   FormData: { data: base64, mrn, fileName, dirName: encounterNo, documentType: "IMAGE", md5Checksum: "dummy" }
   Response: { filePath: string, fileName: string }
5. Collect all upload responses
6. PUT api/athma/_upload/incident-reports (headers: athmaToken)
   Body: Full IncidentReport object with documentsDetails populated
```

### 2.4 Image Management
- **Sources**: Camera capture or Gallery (max 8 selectable at once, total limit 5)
- **Remove**: Click X on thumbnail; if already uploaded (has ID), show confirmation alert
- **Preview**: Tap thumbnail for full-screen modal

### 2.5 APIs

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `api/athma/_upload/base64FileDataWithChecksum` | Upload individual file (FormData) |
| PUT | `api/athma/_upload/incident-reports` | Submit incident report (headers: athmaToken) |

---

## 3. Discharge Intimation (Standalone Page)

### 3.1 Status Flow

```
UNDER_IP_CARE ──intimate──→ DISCHARGE_INTIMATED ──discharge──→ DISCHARGED
                                   │
                                   └──revert──→ UNDER_IP_CARE
```

### 3.2 Intimate Discharge Flow

```
1. Load inpatient details via encounter number
2. Pre-populate with primary consultant + department
3. User selects:
   - Expected discharge date/time (SimplePicker, must be > current time)
   - Consultant (search by name, min 3 chars, auto-populates department)
4. Submit → DS_012 PUT (inPatientDetails with dischargeIntimation object)
5. Success → "Discharge intimation is successful", modal dismiss
```

### 3.3 Revert Intimation Flow

```
1. Page loads with status = DISCHARGE_INTIMATED → switches to revert mode
2. User selects consultant (pre-populated with primary)
3. User enters remarks (REQUIRED, non-empty)
4. Submit → ADT_002 PUT (dischargeIntimation.reverted=true, remarks populated)
5. Success → "Intimation reverted successfully", modal dismiss
```

### 3.4 Discharge Intimation Data Model

```typescript
DischargeIntimation {
    consultant: { id, login, displayName, employeeNo };
    department: { id, name, code };
    expectedDateOfDischarge: ISO8601;      // YYYY-MM-DDTHH:mm:ss
    updatedBy: UserRef;
    updatedDate: ISO8601;
    requestSource: "AADI";
    reverted: boolean;
    remarks: string;                        // Only for reverted intimations
}
```

### 3.5 Consultant Search
- Unit IDs fetched from `api/care-team/user-mapping?login={login}`
- Search: `api/care-team/employees?unitIds={ids}&searchTerm={term}`
- Debounce: 500ms, min 3 chars

### 3.6 APIs

| Code/Method | Endpoint | Purpose |
|-------------|----------|---------|
| DS_012 PUT | ATHMA | Intimate discharge |
| ADT_002 PUT | ATHMA | Revert discharge intimation |
| Direct GET | `api/patient/inpatient-details?query=encounter.documentNumber:{enc}` | Get inpatient details |
| Direct GET | `api/care-team/user-mapping?login={login}` | Get user's unit mappings |
| Direct GET | `api/care-team/employees?unitIds={ids}&searchTerm={term}` | Search consultants |
