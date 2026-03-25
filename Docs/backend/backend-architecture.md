# HMS Backend Architecture

## Overview

The HMS (Hospital Management System) backend is a **serverless** application deployed on AWS using:
- **AWS Lambda** (Node.js 22.x ESM) — single function handling all API routes
- **DynamoDB** — single-table design with GSIs for multi-access patterns
- **S3** — patient file storage with presigned URL uploads
- **CloudFront** — CDN for serving patient files
- **SAM/CloudFormation** — infrastructure-as-code deployment

The backend exposes a Lambda Function URL (not API Gateway) with full CORS support.

---

## Architecture Diagram

```
┌─────────────┐     ┌───────────────────┐     ┌──────────────┐
│   Frontend   │────▶│  Lambda Function  │────▶│  DynamoDB    │
│  (React/Vite)│     │  URL (router.mjs) │     │  (HMS-HYD)   │
└─────────────┘     └───────┬───────────┘     └──────────────┘
                            │
                    ┌───────▼───────────┐     ┌──────────────┐
                    │   S3 (Patient     │────▶│  CloudFront  │
                    │   Files Bucket)   │     │  (CDN)       │
                    └───────────────────┘     └──────────────┘
```

## Lambda Handler Flow

1. HTTP request arrives at Lambda Function URL
2. `index.mjs` re-exports the handler from `router.mjs`
3. CORS preflight (OPTIONS) returns 204 immediately
4. Router creates shared `ctx` with DynamoDB client, table name, indexes, and utilities
5. Feature modules mount their routes onto the router
6. Router matches request path/method against registered regex patterns
7. First matching route handler executes and returns response

## Module Organization

| Module | File | Purpose |
|--------|------|---------|
| Entry point | `index.mjs` | Re-exports handler from router |
| Router | `router.mjs` | DDB client, CORS, routing, shared utils |
| Patients | `patients.mjs` | Patient CRUD, state transitions, MRN management |
| Doctors | `doctors.mjs` | Doctor profiles, department listing |
| Tasks | `tasks.mjs` | Task CRUD, department dashboard via GSI2 |
| Notes | `notes.mjs` | Clinical notes CRUD with file attachments |
| Medications | `meds.mjs` | Medication CRUD with soft-stop deletion |
| Timeline | `timeline.mjs` | Read-only patient state timeline |
| Documents | `documents.mjs` | Per-category document registry |
| Files | `files.mjs` | S3 presigned URLs, file listing, deletion |
| Discharge | `discharge.mjs` | Versioned discharge summaries |
| Checklists | `checklists.mjs` | Placeholder (not yet implemented) |
| ID Resolution | `ids.mjs` | Resolve patient UID or MRN to canonical ID |
| S3 Events | `s3_events.mjs` | Separate Lambda: S3 upload → DynamoDB sync |

---

## API Endpoints

### Patients
| Method | Path | Description |
|--------|------|-------------|
| GET | `/patients` | List active patients (?department=) |
| GET | `/patients/:id` | Get patient by UID or MRN |
| POST | `/patients` | Create patient |
| PUT | `/patients/:id` | Update patient fields |
| DELETE | `/patients/:id` | Soft delete (set INACTIVE) |
| PATCH | `/patients/:id/state` | Transition patient state |
| PATCH | `/patients/:id/registration` | Switch MRN/scheme |
| PATCH | `/patients/:id/mrn-history` | Rewrite MRN history |
| PATCH | `/patients/:id/mrn-overwrite` | Replace history + switch active MRN |

### Tasks
| Method | Path | Description |
|--------|------|-------------|
| GET | `/patients/:id/tasks` | List patient tasks (?status=&limit=) |
| POST | `/patients/:id/tasks` | Create task |
| PATCH | `/patients/:id/tasks/:taskId` | Update task |
| DELETE | `/patients/:id/tasks/:taskId` | Soft cancel task |
| GET | `/tasks` | Dashboard: tasks by dept/status (?department=&status=) |

### Notes
| Method | Path | Description |
|--------|------|-------------|
| GET | `/patients/:id/notes` | List notes (paginated) |
| POST | `/patients/:id/notes` | Create note |
| PATCH | `/patients/:id/notes/:noteId` | Update note |
| DELETE | `/patients/:id/notes/:noteId` | Soft delete note |
| POST | `/patients/:id/notes/:noteId/files/attach` | Attach file to note |
| POST | `/patients/:id/notes/:noteId/files/detach` | Detach file from note |

### Medications
| Method | Path | Description |
|--------|------|-------------|
| GET | `/patients/:id/meds` | List medications (paginated) |
| POST | `/patients/:id/meds` | Create medication |
| PATCH | `/patients/:id/meds/:medId` | Update medication |
| DELETE | `/patients/:id/meds/:medId` | Soft stop (set end date) |

### Doctors
| Method | Path | Description |
|--------|------|-------------|
| GET | `/doctors` | List doctors (?department= required) |
| GET | `/doctors/:doctorId` | Get doctor |
| POST | `/doctors` | Create doctor |
| PATCH | `/doctors/:doctorId` | Update doctor |
| DELETE | `/doctors/:doctorId` | Soft delete doctor |

### Timeline
| Method | Path | Description |
|--------|------|-------------|
| GET | `/patients/:id/timeline` | List timeline events |

### Documents
| Method | Path | Description |
|--------|------|-------------|
| GET | `/patients/:id/documents` | Get documents profile |
| POST | `/patients/:id/documents/init` | Initialize documents (idempotent) |
| POST | `/patients/:id/documents/attach` | Attach file to category |
| POST | `/patients/:id/documents/detach` | Detach file from category |
| PATCH | `/patients/:id/documents/gov-share` | Set government sharing flag |

### Files (S3)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/patients/:id/files/presign-upload` | Get presigned upload URL |
| GET | `/patients/:id/files` | List S3 files (?scope=&kind=&docType=) |
| POST | `/patients/:id/files/presign-download` | Get presigned download URL |
| POST | `/patients/:id/files/delete` | Delete S3 files |

### Discharge
| Method | Path | Description |
|--------|------|-------------|
| GET | `/patients/:id/discharge` | Get latest discharge summary |
| GET | `/patients/:id/discharge/versions` | List versions (paginated) |
| GET | `/patients/:id/discharge/versions/:versionId` | Get specific version |
| POST | `/patients/:id/discharge` | Create discharge version |
| PATCH | `/patients/:id/discharge/versions/:versionId` | Update version status |
| DELETE | `/patients/:id/discharge/versions/:versionId` | Soft delete version |

---

## DynamoDB Single-Table Design

### Table: HMS-HYD

**Primary Key:** PK (String) + SK (String)

### Entity Key Patterns

| Entity | PK | SK | Purpose |
|--------|----|----|---------|
| Patient | `PATIENT#{uid}` | `META_LATEST` | Patient master record |
| MRN Pointer | `MRN#{mrn}` | `MRN` | MRN → UID lookup |
| Timeline | `PATIENT#{uid}` | `TL#{timestamp}#{state}` | State transition log |
| Note | `PATIENT#{uid}` | `NOTE#{timestamp}#{noteId}` | Clinical note |
| Task | `PATIENT#{uid}` | `TASK#{taskId}` | Task record |
| Medication | `PATIENT#{uid}` | `MED#{medId}` | Medication record |
| Documents | `PATIENT#{uid}` | `DOCS#PROFILE` | Document registry |
| Discharge | `PATIENT#{uid}` | `DS#{timestamp}#{dsId}` | Discharge version |
| Discharge Latest | `PATIENT#{uid}` | `DS#LATEST` | Current discharge pointer |
| Doctor | `USER#{doctorId}` | `PROFILE` | Doctor profile |
| Checklist | `CHECKLIST` | `STAGE#{from}#TO#{to}` | State transition rules |

### Indexes

| Index | Type | PK | SK | Purpose |
|-------|------|----|----|---------|
| GSI1PK-index | GSI | GSI1PK | — | Patients by dept, doctors by dept |
| GSI2PK-GSI2SK-index | GSI | GSI2PK | GSI2SK | Tasks dashboard (dept+status+assignee) |
| LSI_CUR_MRN-index | LSI | PK | LSI_CUR_MRN | Patient by current MRN |

### GSI Key Patterns

| GSI1PK Pattern | Entity |
|----------------|--------|
| `DEPT#{dept}#ACTIVE` | Active patients in department |
| `DEPT#{dept}#INACTIVE` | Inactive patients |
| `DEPT#{dept}#ROLE#DOCTOR` | Doctors in department |

| GSI2PK Pattern | GSI2SK Pattern | Entity |
|----------------|----------------|--------|
| `TASK#{STATUS}#DEPT#{dept}` | `ASSIGNEE#{id}#RECURRING#{YES/NO}#TASK#{taskId}` | Tasks |

---

## S3 File Organization

```
patients/{uid}/
├── originals/          — Raw uploaded files
├── optimized/
│   ├── docs/{docType}/ — Clinical documents (preop, lab, radiology, etc.)
│   ├── notes/{noteId}/ — Note attachments
│   ├── meds/{medId}/   — Medication-related files
│   └── tasks/{taskId}/ — Task-related files
└── thumb/              — Thumbnails
```

Document types: `preop`, `lab`, `radiology`, `intraop`, `otnotes`, `postop`, `discharge`

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AWS_REGION` | `ap-south-1` | AWS region |
| `TABLE_NAME` | `HMS` | DynamoDB table name |
| `FILES_BUCKET` | — | S3 bucket for patient files |
| `PRESIGN_EXPIRES_SEC` | `900` | Presigned URL expiry (seconds) |
| `CDN_DOMAIN` | — | CloudFront distribution domain |
| `CF_DISTRIBUTION_ID` | — | CloudFront distribution ID |
| `CDN_SIGNED` | `false` | Use signed CloudFront URLs |
| `AWS_ENDPOINT` | — | Custom endpoint (for LocalStack) |

---

## Local Development

See [local-backend-runbook.md](./local-backend-runbook.md) for running the backend locally with LocalStack.
