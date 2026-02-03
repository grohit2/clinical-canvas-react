# Patient Workflow Domain

## Purpose
Manages the clinical workflow stages for surgical patients from admission through
discharge. Each stage has its own screen with checklists, documentation requirements,
and navigation to the next stage.

## Screens
| Screen | Route | Description |
|--------|-------|-------------|
| AdmissionScreen | `/(app)/patient/[id]/workflow/admission` | Initial registration |
| PreOpScreen | `/(app)/patient/[id]/workflow/pre-op` | Pre-operative prep |
| OTScreen | `/(app)/patient/[id]/workflow/ot` | Operation theatre |
| PostOpScreen | `/(app)/patient/[id]/workflow/post-op` | Post-operative care |
| DischargeScreen | `/(app)/patient/[id]/workflow/discharge` | Discharge prep |

## Components
| Component | Description |
|-----------|-------------|
| WorkflowLayout | Common layout wrapper for all workflow screens |
| WorkflowStepper | Step indicator showing workflow progress |

## Core Logic (Pure TypeScript)
| File | Purpose |
|------|---------|
| `types.ts` | WorkflowStepId, ChecklistItem, WorkflowState |
| `steps.ts` | Step configuration, navigation helpers |
| `checklists.ts` | All checklist definitions by stage |

## Workflow Stages
| Stage | Zone Color | Purpose |
|-------|------------|---------|
| Admission | Blue | Registration, consent, initial assessment |
| Pre-Op | Yellow | NPO status, labs, anesthesia clearance |
| OT | Red | WHO surgical safety checklist |
| Post-Op | Yellow | Recovery, pain management, orders |
| Discharge | Green | Summary, prescriptions, follow-up |

## WHO Surgical Safety Checklist
The OT stage implements the WHO Surgical Safety Checklist:
1. **Sign In** — Before anesthesia induction
2. **Time Out** — Before skin incision
3. **Sign Out** — Before patient leaves OT

## Cross-Domain Imports
| From | What |
|------|------|
| `patient-detail` | LabsOverviewCard, PatientMeds, PatientTasks |
| `discharge-summary` | Navigation to discharge summary screen |
