# Patient Medications Domain

## Purpose
Manages patient medication orders including prescribing, editing, and tracking.
Supports different routes, frequencies, and priority levels.

## Screens
| Screen | Route | Description |
|--------|-------|-------------|
| AddMedicationScreen | `/(app)/patient/[id]/meds/new` | Prescribe new medication |
| EditMedicationScreen | `/(app)/patient/[id]/meds/[medId]/edit` | Edit medication order |

## Components
| Component | Description |
|-----------|-------------|
| MedicationCard | Single medication display with priority badge |
| MedicationForm | Shared form between add/edit screens |

## Core Logic (Pure TypeScript)
| File | Purpose |
|------|---------|
| `types.ts` | MedRoute, MedFrequency, ROUTES, FREQUENCIES |
| `priorities.ts` | Priority config, colors, labels |

## Medication Priorities
| Priority | Color | Use Case |
|----------|-------|----------|
| STAT | Red | Immediate administration |
| Urgent | Orange | Within 1 hour |
| Routine | Blue | Scheduled administration |
| PRN | Gray | As needed |

## Routes
- Oral (PO), IV, IM, SC, Topical, Inhaled
- Rectal, Sublingual, Transdermal, Ophthalmic, Otic, Nasal

## Frequencies
- Once, Daily, BID, TID, QID
- Q4H, Q6H, Q8H, Q12H, Weekly, PRN

## Cross-Domain Consumers
- `patient-detail/MedsTab` — Shows patient-specific medications list
  - Can import `MedicationCard` for consistent rendering
  - Uses navigation to medication routes
- `patient-workflow/PostOpScreen` — Shows medications in post-op orders
