# Clinical Canvas - React Native

React Native implementation of Patient List and Patient Details screens.

## Features

- **Patient List Screen**
  - Search patients by name, MRN, or diagnosis
  - Filter by stage, pathway, and urgent status
  - Tab switching between "All Patients" and "My Patients" (pinned)
  - Pull to refresh
  - Stage-based color coding
  - Days since surgery badge

- **Patient Detail Screen**
  - Comprehensive patient information display
  - Vitals display with icons
  - Comorbidities badges
  - Urgent patient highlighting
  - Emergency contact information
  - Quick action buttons

## Project Structure

```
react-native/
├── App.tsx                    # Main entry point
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
└── src/
    ├── components/            # Reusable UI components
    │   ├── Header.tsx
    │   ├── PatientCard.tsx
    │   ├── StageChip.tsx
    │   ├── FilterChip.tsx
    │   └── index.ts
    ├── screens/               # Screen components
    │   ├── PatientListScreen.tsx
    │   ├── PatientDetailScreen.tsx
    │   └── index.ts
    ├── navigation/            # Navigation setup
    │   ├── RootNavigator.tsx
    │   ├── types.ts
    │   └── index.ts
    ├── services/              # API and services
    │   └── api.ts
    ├── types/                 # TypeScript types
    │   └── patient.ts
    ├── hooks/                 # Custom hooks
    └── utils/                 # Utility functions
```

## Setup

1. Install dependencies:
   ```bash
   cd react-native
   npm install
   ```

2. For iOS (macOS only):
   ```bash
   cd ios && pod install && cd ..
   npx react-native run-ios
   ```

3. For Android:
   ```bash
   npx react-native run-android
   ```

## Dependencies

- `@react-navigation/native` - Navigation library
- `@react-navigation/native-stack` - Native stack navigator
- `react-native-screens` - Native screen containers
- `react-native-safe-area-context` - Safe area handling

## Customization

### API Integration

Replace the mock API in `src/services/api.ts` with your actual backend:

```typescript
export const patientApi = {
  async getPatients(): Promise<Patient[]> {
    const response = await fetch(`${API_BASE_URL}/patients`);
    return response.json();
  },
  // ...
};
```

### Styling

The app uses a consistent color scheme:
- Primary: `#3B82F6` (blue)
- Success: `#10B981` (green)
- Warning: `#F59E0B` (amber)
- Error: `#EF4444` (red)
- Background: `#F3F4F6` (gray)

## Stage Colors

| Stage | Color |
|-------|-------|
| Onboarding | Indigo |
| Pre-Op | Yellow |
| OT (Intraop) | Red |
| Post-Op | Orange |
| Discharge Init | Green |
| Discharge | Green |
