patinet details

Here you go — a compact field map with the JSON key (“jname”) and allowed/expected values based on the code.

| Column (UI) | jname        | Possible values / type (from code)                                                                                    |
| ----------- | ------------ | --------------------------------------------------------------------------------------------------------------------- |
| Patient ID  | `patientId`  | **string (ULID)**, 26-char time-sortable ID (e.g., `01J7M4X8Q4X6R3VJ8F7S3F5ZK2`)                                      |
| Latest MRN  | `latestMrn`  | **string** (current active MRN)                                                                                       |
| MRN History | `mrnHistory` | **Array** of `{ mrn: string, scheme: string ('ASP' \| 'NAM' \| 'Paid' \| 'Unknown' \| other), date: ISO8601 string }` |

| Column (UI)                      | jname                                 | Possible values / type (from code)                        |
| -------------------------------- | ------------------------------------- | --------------------------------------------------------- |
| Name                             | `name`                                | **string** (non-empty)                                    |
| Age                              | `age`                                 | **number** \| **null**                                    |
| Sex                              | `sex`                                 | **string** (e.g., `"M"`, `"F"`, `"Other"` — not enforced) |
| Emergency Contact (name)         | `emergencyContact.name`               | **string** \| **null**                                    |
| Emergency Contact (relationship) | `emergencyContact.relationship`       | **string** \| **null**                                    |
| Emergency Contact (phone)        | `emergencyContact.phone`              | **string** \| **null**                                    |
| Emergency Contact (alt phone)    | `emergencyContact.altPhone`           | **string** \| **null**                                    |
| Emergency Contact (email)        | `emergencyContact.email`              | **string** \| **null**                                    |
| Emergency Contact (addr line1)   | `emergencyContact.address.line1`      | **string** \| **null**                                    |
| Emergency Contact (addr line2)   | `emergencyContact.address.line2`      | **string** \| **null**                                    |
| Emergency Contact (city)         | `emergencyContact.address.city`       | **string** \| **null**                                    |
| Emergency Contact (state)        | `emergencyContact.address.state`      | **string** \| **null**                                    |
| Emergency Contact (postal code)  | `emergencyContact.address.postalCode` | **string** \| **null**                                    |
| Emergency Contact (country)      | `emergencyContact.address.country`    | **string** \| **null**                                    |

| Column (UI)           | jname              | Possible values / type (from code)                                                        |
| --------------------- | ------------------ | ----------------------------------------------------------------------------------------- |
| Scheme                | `scheme`           | **string**, typically `'ASP'` \| `'NAM'` \| `'Paid'` \| `'Unknown'`                       |
| MRN (current episode) | `mrn`              | **string**                                                                                |
| Department            | `department`       | **string** (e.g., `"Cardiology"`)                                                         |
| Status                | `status`           | **'ACTIVE'** \| **'INACTIVE'**                                                            |
| Pathway               | `pathway`          | **string** \| **null**                                                                    |
| Current State         | `currentState`     | **string** (workflow stage; default `"onboarding"`; must be a valid checklist transition) |
| Diagnosis             | `diagnosis`        | **string** \| **null**                                                                    |
| Comorbidities         | `comorbidities`    | **string\[]** (default `[]`)                                                              |
| Assigned Doctor       | `assignedDoctor`   | **string** \| **null**                                                                    |
| Assigned Doctor ID    | `assignedDoctorId` | **string** \| **null**                                                                    |
| Files URL             | `filesUrl`         | **string (URL)** \| **null**                                                              |
| Urgent?               | `isUrgent`         | **boolean** (default `false`)                                                             |
| Urgent Reason         | `urgentReason`     | **string** \| **null**                                                                    |
| Urgent Until          | `urgentUntil`      | **ISO8601 string** \| **null**                                                            |

> Notes:
> • `latestMrn` is mirrored from the person record; `mrn` is the MRN of the currently viewed **episode** (defaults to the latest episode).
> • All datetime strings are ISO-8601 (`YYYY-MM-DDTHH:mm:ss.sssZ`).
> • Enums like Scheme/Status are not hard-enforced in code beyond what’s shown, but these are the expected values.
/**
 * patients.mjs — Patient API (CRUD + Timeline + Registration/MRN management)
 * ==============================================================
 *
 * ## Overview
 * This module manages **patient records** in a hospital information system.
 * It supports:
 *   - Stable patient identity (`patient_uid`, ULID).
 *   - Scheme-based MRN/REG NO. episodes (ASP → NAM → Paid).
 *   - MRN history and active MRN tracking.
 *   - Timeline lifecycle (onboarding → pre-op → intra-op → post-op).
 *   - Department/status GSIs for patient cohort queries.
 *   - Emergency contact details stored at person level.
 *
 * ## Data Model (DynamoDB, single-table)
 *
 * ### Person (stable patient, META row)
 *   PK = PATIENT#<patient_uid>
 *   SK = META_LATEST
 *   {
 *     patient_uid: string (ULID, stable ID),
 *     name: string,
 *     age: number?,
 *     sex: "M"|"F"|"Other"?,
 *     emergency_contact: {
 *       name?, relationship?, phone?, altPhone?, email?,
 *       address?: { line1?, line2?, city?, state?, postalCode?, country? }
 *     },
 *     active_reg_mrn: string (latest active MRN),
 *     active_scheme: string (scheme of latest active MRN),
 *     mrn_history: [{ mrn, scheme, date }],
 *     LSI_CUR_MRN: "CUR#<mrn>"  // supports LSI for current MRN lookup,
 *     created_at, updated_at, last_updated
 *   }
 *
 * ### Registration (episode, per MRN/scheme)
 *   PK = PATIENT#<patient_uid>
 *   SK = REG#<scheme>#<mrn>
 *   {
 *     patient_uid, scheme, mrn,
 *     department, status ("ACTIVE"|"INACTIVE"),
 *     pathway, current_state,
 *     diagnosis, comorbidities[],
 *     assigned_doctor, assigned_doctor_id,
 *     files_url,
 *     is_urgent, urgent_reason, urgent_until,
 *     state_dates: { [state]: timestamp },
 *     timeline_open_sk: "TL#..." (currently open timeline SK),
 *     GSI1PK: "DEPT#<department>#<status>"  // used for department list queries,
 *     created_at, updated_at, last_updated
 *   }
 *
 * ### MRN Pointer (lookup MRN → patient UID)
 *   PK = MRN#<mrn>
 *   SK = MRN
 *   {
 *     mrn, patient_uid, scheme, department, status, created_at
 *   }
 *
 * ### Timeline (state transitions, per MRN)
 *   PK = PATIENT#<patient_uid>
 *   SK = TL#<timestamp>#<state>#MRN#<mrn>
 *   {
 *     patient_uid, mrn, scheme,
 *     state, date_in, date_out?,
 *     checklist_in_done, checklist_out_done,
 *     required_in, required_out,
 *     actor_id, notes,
 *     created_at, updated_at
 *   }
 *
 * ## API Endpoints
 *
 * ### Create
 *   POST /patients
 *   Body: { name, age?, sex?, emergencyContact?, registration: { scheme, mrn, department, ... } }
 *   - Creates META + REG + MRN pointer.
 *   - Seeds first timeline row.
 *
 * ### Read
 *   GET /patients/{id}
 *     - {id} can be patient_uid or MRN.
 *     - Returns META + active REG (if UID) or that REG (if MRN).
 *
 *   GET /patients/by-mrn/{mrn}
 *     - Direct MRN lookup.
 *
 *   GET /patients?department=Cardiology
 *     - Returns all ACTIVE REGs in department (via GSI1PK).
 *
 *   GET /patients?mrn=...
 *     - Shortcut to GET by MRN.
 *
 * ### Update
 *   PUT /patients/{id}
 *     - General field updates (person + episode).
 *     - Does NOT handle state changes or MRN switches.
 *
 *   PATCH /patients/{id}/state
 *     - Handles state transitions.
 *     - Validates against CHECKLIST table.
 *     - Closes previous timeline row, opens new one, updates REG.current_state.
 *
 *   PATCH /patients/{id}/registration
 *     - Handles MRN/scheme switch.
 *     - Closes previous timeline, inactivates old REG.
 *     - Creates new REG + MRN pointer + new timeline.
 *     - Updates META.active_reg_mrn, META.active_scheme, mrn_history, and LSI_CUR_MRN.
 *
 * ### Delete
 *   DELETE /patients/{id}
 *     - Soft-delete (marks REG as INACTIVE).
 *     - {id} can be MRN (that REG) or UID (active REG).
 *
 * ## Indexes
 *
 *   - GSI1PK-index: "GSI1PK" on REG items → query patients by department + status.
 *   - LSI_CUR_MRN-index (optional): on META items → query by current MRN.
 *
 * ## UI JSON Response (example card)
 *
 * {
 *   "patientId": "01J7M4X8Q4X6R3VJ8F7S3F5ZK2",
 *   "mrn": "NAM-0023145",
 *   "scheme": "NAM",
 *   "latestMrn": "NAM-0023145",
 *   "mrnHistory": [
 *     { "mrn": "ASP-0009987", "scheme": "ASP", "date": "2025-07-01T10:05:00Z" },
 *     { "mrn": "NAM-0023145", "scheme": "NAM", "date": "2025-08-15T12:30:00Z" }
 *   ],
 *   "name": "Ravi Kumar",
 *   "age": 54,
 *   "sex": "M",
 *   "emergencyContact": { "name": "Anita Kumar", "relationship": "Spouse", "phone": "+91-98xxxxxxx" },
 *   "department": "Cardiology",
 *   "status": "ACTIVE",
 *   "pathway": "CABG",
 *   "currentState": "pre-op",
 *   "diagnosis": "Triple vessel disease",
 *   "comorbidities": ["DM2"],
 *   "assignedDoctor": "Dr. Rao",
 *   "assignedDoctorId": "dr_rao",
 *   "filesUrl": "https://.../patients/NAM-0023145/docs",
 *   "isUrgent": false,
 *   "urgentReason": null,
 *   "urgentUntil": null,
 *   "lastUpdated": "2025-08-31T19:20:43Z"
 * }
 *
 * ## Workflow Notes
 * - Patient’s **MRN changes** when scheme changes (ASP → NAM → Paid).
 *   Clinically same patient, but separate REG item for audits and billing.
 * - Timeline rows scoped per MRN: preserves clean episode boundaries.
 * - Department listings query REGs, not META.
 * - EmergencyContact stays at META level (same across episodes).
 * - LSI_CUR_MRN enables “current MRN” direct lookups if needed.
 *
 */
