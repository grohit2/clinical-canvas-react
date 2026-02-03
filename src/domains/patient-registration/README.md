# Patient Registration Domain

## Purpose
Handles new patient registration and MRN (Medical Record Number) management.
Multi-step form for collecting patient identity, medical details, emergency contacts,
and file uploads.

## Screens
- `RegistrationScreen` — Main multi-step registration form
- `AddMrnScreen` — Add additional MRN to existing patient

## Routes
- `/(app)/patient/new` — New patient registration
- `/(app)/patient/[id]/add-mrn` — Add MRN to patient

## Components
| Component | Description |
|-----------|-------------|
| PatientIdentitySection | Name, DOB, gender, photo |
| MedicalDetailsSection | Diagnosis, comorbidities, allergies |
| EmergencyContactSection | Emergency contact info |
| FilesPrioritySection | Document uploads, priority level |
| RegistrationSection | Registration date/time |
| ButtonGroup | Form action buttons |
| SubmitBar | Form submission bar |
| PhotoUploader | Patient photo capture/upload |

## Core Logic (Pure TypeScript)
- `types.ts` — Form data types, step definitions
- `validation.ts` — Zod schemas for form validation

## Form Sections Flow
1. Patient Identity (required)
2. Medical Details (required)
3. Emergency Contact (optional)
4. Files & Priority (optional)
5. Registration Info (auto-filled)

## Validation
Uses Zod schemas for:
- Patient name (required, min 2 chars)
- Date of birth (required, valid date)
- Gender (required, enum)
- Phone number (optional, valid format)
- Email (optional, valid format)
