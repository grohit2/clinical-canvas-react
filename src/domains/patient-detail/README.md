# Patient Detail Domain

## Purpose
Displays comprehensive patient information including demographics,
clinical zones (Admission → Pre-Op → OT → Post-Op → Discharge),
labs, medications, notes, tasks, and timeline.

## Screens
- `PatientDetailScreen` — Main detail view with tabs

## Routes
- `/(app)/patient/[id]` — Patient detail by ID

## Components
| Component | Description |
|-----------|-------------|
| PatientHeader | Name, age, gender, MRN, stage chip |
| PatientTabs | Zone tabs (Blue/Yellow/Red/Green) |
| BlueZone | Admission checklist & data |
| YellowZone | Pre-op / Post-op checklist |
| RedZone | OT details |
| GreenZone | Discharge checklist |
| LabsOverviewCard | Latest lab results |
| MedsTab | Medications list |
| NotesTab | Clinical notes |
| TasksTab | Patient-specific tasks |
| Timeline | Chronological event list |
| ArcSpeedDial | Quick actions FAB |
| UpdateRing | Visual update indicator |
| MrnEditor | Inline MRN editing |
| PatientQRView | QR code for patient |

## Core Logic (Pure TypeScript)
- `payload.ts` — Build API payloads for updates
- `vitals.ts` — Vital sign ranges & formatting
- `labs.ts` — Lab value parsing & grouping
- `timeline.ts` — Event sorting & grouping

## Zone Color Mapping
| Zone | Stage | Token |
|------|-------|-------|
| Blue | Admission | `colors.zone.blue` |
| Yellow | Pre-Op, Post-Op | `colors.zone.yellow` |
| Red | OT | `colors.zone.red` |
| Green | Discharge, Discharged | `colors.zone.green` |
