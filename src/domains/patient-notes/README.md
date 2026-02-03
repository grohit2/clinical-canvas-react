# Patient Notes Domain

## Purpose
Manages clinical notes for patients including progress notes, nursing notes,
physician notes, consultation notes, and procedure notes. Supports CRUD
operations with attachments.

## Screens
| Screen | Route | Description |
|--------|-------|-------------|
| AddNoteScreen | `/(app)/patient/[id]/notes/new` | Create new note |
| EditNoteScreen | `/(app)/patient/[id]/notes/[noteId]/edit` | Edit existing note |
| NoteDetailScreen | `/(app)/patient/[id]/notes/[noteId]` | View note details |

## Components
| Component | Description |
|-----------|-------------|
| NoteCard | Single note display with category badge |
| NoteForm | Shared form between add/edit screens |

## Core Logic (Pure TypeScript)
| File | Purpose |
|------|---------|
| `types.ts` | NoteCategory, NOTE_CATEGORIES config, badge colors |

## Note Categories
| Category | Color | Use Case |
|----------|-------|----------|
| General | Gray | General observations |
| Progress | Blue | Daily progress notes |
| Nursing | Purple | Nursing assessments |
| Physician | Indigo | Physician orders/notes |
| Consultation | Teal | Specialist consultations |
| Procedure | Orange | Procedure documentation |
| Discharge | Green | Discharge notes |
| Other | Gray | Miscellaneous |

## Cross-Domain Consumers
- `patient-detail/NotesTab` — Shows patient-specific notes list
  - Can import `NoteCard` for consistent rendering
  - Uses navigation to note routes

## Attachments
Notes support file attachments via shared `filesApi`:
- `attachNoteFile(noteId, file)` — Add attachment
- `detachNoteFile(noteId, fileId)` — Remove attachment
- `listFiles(noteId)` — List attachments
