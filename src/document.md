# Clinical Canvas Frontend Documentation

## Overview
Clinical Canvas is a React-based healthcare management system built with TypeScript, Vite, and modern UI components. The frontend handles patient registration, MRN management, lab integration, and clinical workflows.

## Architecture

### Technology Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5.4+
- **Styling**: Tailwind CSS + shadcn/ui components
- **Routing**: React Router v6
- **State Management**: React hooks (useState, useEffect)
- **HTTP Client**: Fetch API with custom request wrapper
- **Form Handling**: React Hook Form + Zod validation
- **Testing**: Vitest + React Testing Library

### Project Structure
```
src/
├── components/          # Reusable UI components
│   ├── layout/         # Layout components (Header, BottomBar)
│   ├── patient/        # Patient-specific components
│   └── ui/            # shadcn/ui base components
├── pages/             # Route-level page components
├── types/             # TypeScript type definitions
├── lib/               # Utilities and API layer
├── hooks/             # Custom React hooks
└── document.md        # This documentation file
```

## Key Features

### 1. Patient Management
- **Patient Registration**: Multi-section form with validation
- **Patient List**: Filterable list with search and view modes
- **Patient Detail**: Comprehensive patient information view
- **Patient Editing**: Update patient information

### 2. MRN Management
- **Multiple MRN Support**: Handle ASP, NAM, Paid, Unknown schemes
- **MRN History Tracking**: Full audit trail with ISO8601 timestamps
- **Latest MRN Designation**: Mark current active MRN
- **External Lab Integration**: Direct links to LIS system

### 3. Clinical Workflow
- **State Tracking**: Onboarding → Pre-Op → Surgery → Post-Op → Recovery → Discharge
- **Task Management**: Create, assign, and track clinical tasks
- **Notes System**: Clinical notes with categories (doctor, nurse, pharmacy, discharge)
- **Medication Tracking**: Prescription management with scheduling

## API Integration

### Base Configuration
```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
```

### Patient API Structure
```typescript
// Patient Creation Payload
interface CreatePatientPayload {
  registrationNumber: string;      // Primary MRN for registration
  latestMrn?: string;             // Current active MRN
  mrnHistory?: MrnHistoryEntry[]; // Full MRN history
  name: string;
  department: string;
  age: number;
  sex: "male" | "female" | "other";
  pathway: "surgical" | "emergency" | "consultation";
  diagnosis: string;
  comorbidities: string[];
  currentState?: string;          // Patient journey state
  assignedDoctorId?: string;
}

// MRN History Entry
interface MrnHistoryEntry {
  mrn: string;                    // MRN number
  scheme: 'ASP' | 'NAM' | 'Paid' | 'Unknown' | string;
  date: string;                   // ISO8601 timestamp
}
```

### Backend Alignment
The frontend aligns with the backend documentation structure:
- `latestMrn`: Current active MRN (string)
- `mrnHistory`: Array of MRN entries with scheme and date
- Patient creation sends both fields to maintain compatibility

## Component Documentation

### Core Components

#### 1. PatientRegistrationForm
**Location**: `src/components/patient/patinet_form/PatientRegistrationForm.tsx`

**Purpose**: Multi-section patient registration form with MRN management

**Features**:
- **Sections**: Patient Details, Registration, Medical Details, Files & Priority
- **MRN Management**: Add/remove multiple MRN entries
- **Latest MRN**: Designate current active MRN with auto-date
- **State Management**: Track patient journey state
- **JSON Import**: Parse and populate form from JSON data
- **Validation**: Real-time validation with floating action button
- **API Integration**: Uses patient-create.adapter for backend compatibility

**Key Props**:
```typescript
interface PatientRegistrationFormProps {
  onAddPatient?: (patient: Patient) => void;
  onClose?: () => void;
}
```

**Form State Structure**:
```typescript
{
  // Patient Details
  name: string;
  age: string;
  sex: string; // "M" | "F" | "Other"
  
  // MRN Management (Backend-aligned)
  mrnHistory: MrnHistoryEntry[];
  latestMrn: string;
  
  // Registration
  department: string;
  status: "ACTIVE"; // Always ACTIVE
  currentState: string; // Journey state
  
  // Medical
  pathway: string;
  diagnosis: string;
  comorbidities: string[];
  assignedDoctor: string;
  assignedDoctorId: string;
  
  // Files & Priority
  filesUrl: string;
  isUrgent: boolean;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
}
```

#### 2. MrnOverview
**Location**: `src/components/patient/MrnOverview.tsx`

**Purpose**: Display patient MRN history with lab access

**Features**:
- **Toggle View**: Expandable/collapsible card
- **Latest MRN**: Highlighted current active MRN
- **Lab Integration**: Direct links to external LIS system
- **History Display**: All MRN entries with schemes and dates
- **Summary Stats**: MRN counts and scheme breakdowns

**Props**:
```typescript
interface MrnOverviewProps {
  patientId: string;
  mrnHistory?: MrnHistoryEntry[];
  latestMrn?: string;
}
```

**Lab Integration**:
```typescript
// External LIS System URL
const lisUrl = `http://115.241.194.20/LIS/Reports/Patient_Report.aspx?prno=${mrn}`;
window.open(lisUrl, '_blank');
```

#### 3. AddPatientPage
**Location**: `src/pages/AddPatientPage.tsx`

**Purpose**: Full-page patient registration interface

**Features**:
- **Navigation**: Back button and header
- **Form Container**: Wraps PatientRegistrationForm
- **Success Handling**: Redirects to patient list after creation
- **Responsive Design**: Mobile-friendly layout

### UI Component Library

#### ButtonGroup
**Location**: Inline component in PatientRegistrationForm

**Purpose**: Multiple choice selection with visual feedback

```typescript
interface ButtonGroupProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}
```

#### Floating Action Button
**Features**:
- **Always Visible**: Persistent in bottom-right corner
- **Smart States**: 
  - Incomplete: Gray, "Complete Form", disabled
  - Complete: Green, "Done", enabled
  - Submitting: Green, "Adding...", disabled

## Data Flow

### Patient Creation Flow
```
1. User fills PatientRegistrationForm
2. Form validates required fields
3. toCreatePayload() adapts form data
4. api.patients.create() sends to backend
5. Success: Navigate to patient list
6. Error: Display error message
```

### MRN Management Flow
```
1. Add MRN Entry: New entry added to mrnHistory[]
2. Set Latest: Updates latestMrn field + auto-date
3. Remove Entry: Filters from mrnHistory[] + updates latestMrn if needed
4. Lab Access: Opens external LIS with specific MRN
```

## Routing

### Route Configuration
```typescript
// Main Routes
<Route path="/" element={<Dashboard />} />
<Route path="/patients" element={<PatientsList />} />
<Route path="/patients/add" element={<AddPatientPage />} />
<Route path="/patients/:id" element={<PatientDetail />} />

// Patient Sub-routes
<Route path="/patients/:id/documents" element={<DocumentsPage />} />
<Route path="/patients/:id/edit" element={<EditPatient />} />
<Route path="/patients/:id/add-note" element={<AddNote />} />
<Route path="/patients/:id/notes/:noteId" element={<NoteDetail />} />
<Route path="/patients/:id/add-med" element={<AddMedication />} />
<Route path="/patients/:id/add-task" element={<AddTask />} />
```

### Navigation Patterns
- **Patient List → Add Patient**: Navigate to `/patients/add`
- **Add Patient → Patient List**: Navigate back to `/patients` on success
- **Patient List → Patient Detail**: Navigate to `/patients/:id`
- **Patient Detail → Edit**: Navigate to `/patients/:id/edit`

## Environment Configuration

### Environment Variables
```bash
# API Configuration
VITE_API_BASE_URL=/api
VITE_PROXY_TARGET=https://backend-url

# Feature Flags
VITE_PATIENT_FORM_V2=1  # 1=V2 form, 0=legacy form
```

### Feature Flags
```typescript
// src/lib/flags.ts
export const flags = {
  patientFormV2: (import.meta.env.VITE_PATIENT_FORM_V2 ?? "1") !== "0",
};
```

## External Integrations

### Laboratory Information System (LIS)
```typescript
// LIS Integration URL Pattern
const LIS_BASE = "http://115.241.194.20/LIS/Reports/Patient_Report.aspx";
const labUrl = `${LIS_BASE}?prno=${mrnNumber}`;
```

**Usage**: Direct links from MRN overview cards to view lab reports for specific MRN numbers.

## State Management

### Patient Journey States
```typescript
const patientStates = [
  "onboarding",    // Initial registration
  "pre-op",        // Pre-operative preparation
  "surgery",       // In surgery
  "post-op",       // Post-operative care
  "ICU",           // Intensive care
  "recovery",      // Recovery ward
  "stable",        // Stable condition
  "discharge"      // Ready for discharge
];
```

### MRN Schemes
```typescript
const mrnSchemes = [
  "ASP",      // Aarogyasri Scheme
  "NAM",      // Not Applicable to Mediclaim
  "Paid",     // Direct payment
  "Unknown"   // Unknown/other
];
```

## Validation & Error Handling

### Form Validation Rules
```typescript
// Required Fields
const requiredFields = [
  "name",           // Patient name
  "age",            // Patient age
  "sex",            // Patient sex
  "mrnHistory",     // At least one MRN entry with scheme & number
  "department",     // Hospital department
  "pathway"         // Treatment pathway
];
```

### Error Handling Patterns
```typescript
// API Error Handling
try {
  const result = await api.patients.create(payload);
  onSuccess(result.patient);
} catch (error) {
  toast({
    title: "Error",
    description: error.message || "Failed to create patient",
    variant: "destructive"
  });
}
```

## Testing Strategy

### Unit Tests
- **Adapter Functions**: Test MRN validation, pathway normalization
- **Component Rendering**: Test form sections, validation states
- **User Interactions**: Test form submission, MRN management

### Test Files
```
src/components/patient/__tests__/
├── patient-create.adapter.test.ts
├── PatientRegistrationForm.smoke.test.tsx
└── MrnOverview.test.tsx
```

## Performance Considerations

### Code Splitting
- **Route-level splitting**: Pages loaded on-demand
- **Component lazy loading**: Large components split when needed

### State Optimization
- **Minimal re-renders**: Careful useState and useEffect usage
- **Debounced validation**: Reduce validation frequency
- **Memoized components**: Prevent unnecessary re-renders

## Development Workflow

### Commands
```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run build:dev    # Development build
npm run preview      # Preview production build

# Quality Assurance
npm run typecheck    # TypeScript compilation
npm run lint         # ESLint checking
npm test            # Run tests
```

### Code Style
- **TypeScript**: Strict mode enabled
- **ESLint**: Enforced code standards
- **Prettier**: Consistent formatting
- **Husky**: Pre-commit hooks for quality

## Deployment

### Build Configuration
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET,
        changeOrigin: true
      }
    }
  }
});
```

### Environment Setup
1. **Development**: Uses local proxy to backend
2. **Production**: Direct API calls to deployed backend
3. **Testing**: Mock API responses for unit tests

## Maintenance & Updates

### Regular Tasks
- **Dependency Updates**: Monthly dependency updates
- **Type Definitions**: Keep API types in sync with backend
- **Feature Flags**: Clean up old feature flags after stable deployment
- **Documentation**: Update this file when adding new features

### Version Control
- **Conventional Commits**: Use conventional commit format
- **Feature Branches**: New features in separate branches
- **Code Reviews**: All changes require review before merge

---

## Quick Reference

### Important File Locations
```
src/
├── components/patient/patinet_form/PatientRegistrationForm.tsx  # Main registration form
├── components/patient/MrnOverview.tsx                          # MRN overview card
├── pages/AddPatientPage.tsx                                    # Full-page registration
├── types/api.ts                                               # API type definitions
├── lib/api.ts                                                 # API client functions
└── lib/flags.ts                                              # Feature flags
```

### Key API Endpoints
```
POST /patients          # Create new patient
GET  /patients          # List all patients  
GET  /patients/:id      # Get patient by ID
PUT  /patients/:id      # Update patient
DELETE /patients/:id    # Delete patient
```

### External URLs
```
LIS System: http://115.241.194.20/LIS/Reports/Patient_Report.aspx?prno={MRN}
```

---

*Last Updated: [Current Date] - Version 1.0*
*Next Review: Monthly updates recommended*
