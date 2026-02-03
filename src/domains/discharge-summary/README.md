# Discharge Summary Domain

## Purpose
Manages patient discharge summary creation, editing, versioning, and export.
Provides structured form for clinical documentation with DOCX export capability.

## Screens
- `DischargeSummaryScreen` — Main discharge summary form/view

## Routes
- `/(app)/patient/[id]/discharge-summary` — Discharge summary for patient

## Components
| Component | Description |
|-----------|-------------|
| DischargeSummaryForm | Multi-section discharge form |

## Core Logic (Pure TypeScript)
- `types.ts` — DischargeSummaryData, DischargeMedicationItem, version types
- `sections.ts` — Section definitions and adapters
- `export/structuredDischargeDocx.ts` — DOCX generation from structured data
- `export/sectionsToDocx.ts` — Section-to-DOCX conversion utilities

## Discharge Sections
| Section | Required | Description |
|---------|----------|-------------|
| Admission Details | Yes | Date, diagnosis, procedures |
| Hospital Course | Yes | Treatment summary |
| Discharge Medications | Yes | Medication list with instructions |
| Follow-up | Yes | Follow-up appointments, instructions |
| Condition at Discharge | Yes | Patient status |
| Instructions | No | Patient/family instructions |

## Export Formats
- DOCX — Structured Word document with sections
- PDF — (Future) PDF generation

## Cross-Domain Consumers
- `patient-detail` — Imports `buildStructuredDischargeDocxBlob` for export
- `patient-detail` — Imports `SECTION_DEFINITIONS`, `adaptSections` for notes display
