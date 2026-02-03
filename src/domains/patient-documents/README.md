# Patient Documents Domain

## Purpose
Manages patient document uploads, categorization, viewing, and organization.
Supports multiple document categories (lab reports, imaging, prescriptions, etc.)
with folder-based navigation and lightbox viewing.

## Screens
- `DocumentsRootScreen` — Overview of document folders/categories
- `DocumentsFolderScreen` — Documents within a specific category

## Routes
- `/(app)/patient/[id]/documents` — Document folders overview
- `/(app)/patient/[id]/documents/[category]` — Documents in category

## Components
| Component | Description |
|-----------|-------------|
| DocumentCard | Single document thumbnail with metadata |
| DocumentGrid | Grid layout of document cards |
| DocumentLightbox | Full-screen document viewer |
| CategoryChips | Category filter chips |
| FolderCard | Category folder card with count |

## Core Logic (Pure TypeScript)
- `types.ts` — DocumentItem, DocCategory, FolderSummary types
- `mapFromApi.ts` — Transform API response to domain types
- `CategoryConfig.ts` — Category definitions, icons, colors
- `waitForS3Event.ts` — Poll for S3 upload completion

## Document Categories
| Category | Description |
|----------|-------------|
| lab_reports | Laboratory test results |
| imaging | X-rays, CT, MRI, etc. |
| prescriptions | Medication prescriptions |
| discharge | Discharge summaries |
| consent | Consent forms |
| insurance | Insurance documents |
| other | Miscellaneous documents |

## Upload Flow
1. User selects file(s) via ImageUploader
2. Files uploaded to S3 via shared `filesApi`
3. `waitForS3Event` polls until upload confirmed
4. Document list refreshed via `usePatientDocuments`
