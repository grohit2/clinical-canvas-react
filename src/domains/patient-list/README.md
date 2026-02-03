# Patient List Domain

Displays the main patient list with filtering, search, and grid/list view toggle.

## Screens
- `PatientListScreen` - Main patient list view with tabs for different stages

## Components
- `PatientCard` - List view card for a patient
- `PatientGridCard` - Grid view card for a patient
- `StageChip` - Colored chip showing patient's workflow stage
- `FilterPopup` - Filter modal for patient attributes
- `ViewToggle` - Toggle between list/grid views
- `PatientsListFilters` - Search and filter bar
- `PatientsListTabs` - Stage tabs (All, Pre-Op, Post-Op, etc.)
- `EmptyState` - Empty state when no patients match filters

## Core (Pure Logic)
- `types.ts` - Patient TypeScript types
- `stage.ts` - Stage labels, colors, ordering
- `comorbidities.ts` - Comorbidity logic
- `normalize.ts` - API response normalization
- `validation.ts` - Zod schemas

## API
- `usePatients` - TanStack Query hook for fetching patient list

## Hooks
- `usePatientsFilters` - Filter state management
