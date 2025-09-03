Patient Details Input (V2)

This feature provides a full-screen patient registration and edit experience with a left navigation rail and a JSON-assisted import flow.

Key files
- `PatientRegistrationForm.tsx`: Core UI for create/edit. Supports JSON paste import, section navigation, and a floating submit button.
- `patient-create.adapter.ts`: Maps the UI form values to the API create payload (normalizes sex/pathway/comorbidities) and validates required fields.

Usage
- Add New: Route `/patients/new` renders the full-screen form. On success, navigates to the new patient.
- Edit: Route `/patients/:id/edit` loads existing patient data, maps it into the form, and saves via `api.patients.update`.

Notes
- The left panel is fixed and non-scrollable; the right panel is the scroll container.
- JSON import is paste-only by design (no file chooser) to ensure consistent formatting and review.

