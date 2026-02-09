# Codebase Structure

**Analysis Date:** 2026-02-09

## Directory Layout

```
clinical-canvas-react/
├── src/                           # Main application source code
│   ├── app/                       # Application shell and routing
│   │   ├── App.tsx                # Root component with route definitions
│   │   ├── main.tsx               # Vite entry point, React root creation
│   │   ├── NotFound.tsx           # 404 fallback page
│   │   ├── navigation.ts          # Type-safe route definitions (paths.patient(), etc.)
│   │   ├── layout/                # Shared layout components
│   │   │   ├── AppShell.tsx       # Main layout with header and bottom bar
│   │   │   └── index.ts           # Layout exports
│   │   └── guards/                # Route guards and protection
│   │       └── UnsavedChangesGuard.tsx  # Prevent navigation with unsaved changes
│   │
│   ├── domains/                   # Feature modules (Domain-Driven Design)
│   │   ├── patient-registration/  # Patient creation/editing feature
│   │   │   ├── index.ts           # Public API exports
│   │   │   ├── screens/           # Page-level components
│   │   │   │   ├── RegistrationScreen.tsx  # Patient registration form
│   │   │   │   └── AddMrnScreen.tsx        # Add MRN to patient
│   │   │   ├── components/        # Sub-components
│   │   │   │   ├── sections/
│   │   │   │   └── *.tsx
│   │   │   ├── api/               # TanStack Query hooks
│   │   │   │   ├── useCreatePatient.ts
│   │   │   │   └── useAddMrn.ts
│   │   │   ├── hooks/             # Custom hooks
│   │   │   │   └── usePatientRegistrationForm.ts
│   │   │   ├── core/              # Business logic and types
│   │   │   │   ├── types.ts
│   │   │   │   ├── payload.ts     # API request/response transformations
│   │   │   │   └── validation.ts
│   │   │   ├── __tests__/         # Domain tests
│   │   │   ├── README.md          # Domain documentation
│   │   │   └── DEPENDENCIES.md    # Domain dependencies
│   │   │
│   │   ├── patient-detail/        # Patient view and edit details
│   │   │   ├── index.ts
│   │   │   ├── screens/PatientDetailScreen.tsx
│   │   │   ├── components/        # Tabs, cards, editors (MrnEditor, NotesTab, etc.)
│   │   │   ├── api/               # usePatient, useUpdatePatient
│   │   │   ├── hooks/
│   │   │   ├── core/              # Vitals, labs, types, payload transformations
│   │   │   └── zones/             # Zone-specific UI components
│   │   │
│   │   ├── patient-notes/         # Note creation and management
│   │   │   ├── screens/
│   │   │   │   ├── AddNoteScreen.tsx
│   │   │   │   ├── EditNoteScreen.tsx
│   │   │   │   └── NoteDetailScreen.tsx
│   │   │   ├── components/NoteCard.tsx, NoteForm.tsx
│   │   │   ├── api/useNotes.ts, useCreateNote.ts, etc.
│   │   │   └── core/types.ts      # Note types, categories
│   │   │
│   │   ├── patient-medications/   # Medication management
│   │   ├── patient-tasks/         # Task management
│   │   ├── patient-workflow/      # Workflow stages (admission, pre-op, etc.)
│   │   ├── patient-documents/     # Document viewing/uploading
│   │   ├── patient-list/          # Patient listing and search
│   │   ├── dashboard/             # Dashboard overview
│   │   ├── tasks/                 # Global task views
│   │   ├── referrals/             # Referral management
│   │   ├── profile/               # User profile
│   │   └── discharge-summary/     # Discharge document generation
│   │
│   ├── shared/                    # Shared utilities and components
│   │   ├── components/            # Reusable UI components
│   │   │   ├── ui/                # Shadcn/ui base components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── toaster.tsx    # Toast notifications
│   │   │   │   ├── sonner.tsx     # Alternative toaster
│   │   │   │   └── *.tsx          # 27 UI component files total
│   │   │   ├── layout/            # Layout components
│   │   │   │   ├── Header.tsx     # Page header
│   │   │   │   └── BottomBar.tsx  # Bottom navigation
│   │   │   ├── common/            # Common shared components
│   │   │   ├── qr/                # QR code components
│   │   │   ├── notifications/     # Notification components
│   │   │   ├── ImageUploader.tsx
│   │   │   ├── ImageUploadS3.tsx
│   │   │   ├── FileGrid.tsx
│   │   │   └── AttachBar.tsx
│   │   │
│   │   ├── lib/                   # Utility functions
│   │   │   ├── api.ts             # API client with typed methods
│   │   │   ├── filesApi.ts        # File upload/download utilities
│   │   │   ├── image.ts           # Image processing (compression, format conversion)
│   │   │   ├── s3upload.ts        # S3 upload utilities
│   │   │   ├── pinnedPatients.ts  # Local storage for pinned patients
│   │   │   ├── flags.ts           # Feature flags
│   │   │   ├── support.ts         # Support/help utilities
│   │   │   ├── utils.ts           # General utilities (cn for classnames)
│   │   │   └── docsWaitForEvent.ts # Document upload event handling
│   │   │
│   │   ├── hooks/                 # Custom React hooks
│   │   │   ├── use-mobile.tsx     # Mobile detection
│   │   │   ├── use-toast.ts       # Toast notification hook
│   │   │   ├── use-unsaved-guard.ts # Unsaved changes detection
│   │   │   └── useUploader.ts     # File upload hook
│   │   │
│   │   ├── types/                 # Type definitions
│   │   │   ├── api.ts             # API response/request types
│   │   │   └── models.ts          # Domain models
│   │   │
│   │   └── .gitkeep
│   │
│   ├── test/                      # Test utilities
│   │   └── setup.ts               # Vitest/testing-library setup
│   │
│   ├── App.css                    # Global application styles
│   ├── index.css                  # Tailwind CSS imports
│   ├── vite-env.d.ts              # Vite type definitions
│   └── document.md                # Project documentation
│
├── public/                        # Static assets
│   └── manifest.json              # PWA manifest
│
├── dist/                          # Build output (generated)
│
├── e2e/                           # End-to-end tests
│   └── fixtures/                  # Test fixtures
│
├── apps/mobile/                   # React Native mobile app
│   ├── src/
│   └── app/
│
├── packages/core/                 # Shared business logic (monorepo structure)
│
├── Configuration files:
│   ├── vite.config.ts             # Vite configuration with aliases
│   ├── tsconfig.json              # TypeScript compiler options
│   ├── package.json               # Dependencies and scripts
│   ├── tailwind.config.ts         # Tailwind CSS config
│   ├── playwright.config.ts       # E2E test configuration
│   └── index.js                   # Node.js entry point
│
└── Documentation:
    ├── MIGRATION.md               # Migration notes
    └── Framework/                 # Development framework docs
```

## Directory Purposes

**src/app:**
- Purpose: Application bootstrap, root routing, layout management
- Contains: Root React component, route definitions, route guards, layout shells
- Key files: `App.tsx` (routes), `main.tsx` (entry), `navigation.ts` (route helpers)

**src/domains/[domain-name]:**
- Purpose: Self-contained feature module following Domain-Driven Design
- Contains: Feature-specific screens, components, business logic, API hooks, types
- Key files: `index.ts` (public exports), `screens/*.tsx` (pages), `api/*.ts` (hooks), `core/*.ts` (logic)

**src/shared:**
- Purpose: Cross-cutting concerns and utilities used by multiple domains
- Contains: UI components, API client, utilities, custom hooks, type definitions
- Key files: `lib/api.ts` (backend communication), `components/` (UI), `hooks/` (custom hooks)

**src/test:**
- Purpose: Testing configuration and utilities
- Contains: Test setup for Vitest and Testing Library

**public/**
- Purpose: Static assets served by Vite
- Contains: manifest.json for PWA

**e2e/**
- Purpose: End-to-end tests using Playwright
- Contains: Test specs and fixtures

## Key File Locations

**Entry Points:**
- `index.html`: HTML entry point (loads `/src/app/main.tsx`)
- `src/app/main.tsx`: React root creation and initialization
- `src/app/App.tsx`: Root component with all routes defined

**Configuration:**
- `vite.config.ts`: Vite server/build config, path aliases (@app, @shared, @features, @entities)
- `tsconfig.json`: TypeScript paths configuration
- `tailwind.config.ts`: Tailwind CSS theme configuration

**Core Logic:**
- `src/app/App.tsx`: Route definitions and provider setup
- `src/app/navigation.ts`: Type-safe route path helpers
- `src/shared/lib/api.ts`: API client with type-safe methods (main backend communication)

**Testing:**
- `src/test/setup.ts`: Vitest and Testing Library configuration
- `playwright.config.ts`: E2E test runner configuration

## Naming Conventions

**Files:**
- Component files: PascalCase (e.g., `PatientDetailScreen.tsx`, `MrnEditor.tsx`)
- Utility/hook files: camelCase (e.g., `usePatient.ts`, `api.ts`)
- Test files: `*.test.ts` or `*.spec.ts` suffix (in `__tests__` directories)

**Directories:**
- Domain directories: kebab-case (e.g., `patient-registration`, `patient-notes`)
- Feature sub-directories: lowercase (e.g., `screens`, `components`, `api`, `hooks`, `core`)

**Exports:**
- Screens: Named exports (e.g., `export function PatientRegistrationPage()`)
- Components: Named exports (e.g., `export function NoteCard()`)
- Hooks: Named exports (e.g., `export function usePatient()`)
- Types: Exported as types (e.g., `export type Patient = {...}`)

## Where to Add New Code

**New Feature/Domain:**
1. Create directory: `src/domains/[feature-name]/`
2. Create subdirectories: `screens/`, `components/`, `api/`, `hooks/`, `core/`, `__tests__/`
3. Create `index.ts` exporting public API (screens, types, hooks)
4. Create screen component in `screens/*.tsx`
5. Add route to `src/app/App.tsx` pointing to the screen
6. Create API hooks in `api/*.ts` using TanStack Query
7. Create types in `core/types.ts`

**New Component (Reusable):**
- If used by multiple domains: `src/shared/components/[category]/ComponentName.tsx`
- If domain-specific: `src/domains/[domain]/components/ComponentName.tsx`
- If UI primitive from shadcn: `src/shared/components/ui/component.tsx`

**New Utility Function:**
- If used by multiple domains: `src/shared/lib/[utility-name].ts`
- If domain-specific: `src/domains/[domain]/core/[utility-name].ts`
- Pure functions without side effects

**New API Hook:**
- Location: `src/domains/[domain]/api/use[Resource].ts`
- Use `useQuery` for reads, `useMutation` for writes
- Call `src/shared/lib/api.ts` methods for actual requests

**New Page/Screen:**
- Location: `src/domains/[domain]/screens/[Feature]Screen.tsx`
- Export as `[Feature]Page` function (naming convention for routing)
- Add route to `src/app/App.tsx`

## Special Directories

**src/domains/[domain]/__tests__/:**
- Purpose: Unit tests for domain components and logic
- Generated: No
- Committed: Yes

**dist/:**
- Purpose: Production build output
- Generated: Yes (by `npm run build`)
- Committed: No (in .gitignore)

**node_modules/:**
- Purpose: NPM dependencies
- Generated: Yes (by package manager)
- Committed: No (in .gitignore)

**apps/mobile/:**
- Purpose: React Native mobile application
- Generated: No
- Committed: Yes (separate application)

---

*Structure analysis: 2026-02-09*
