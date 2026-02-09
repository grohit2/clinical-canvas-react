# Architecture

**Analysis Date:** 2026-02-09

## Pattern Overview

**Overall:** Domain-Driven Design (DDD) with feature-based separation and shared infrastructure

**Key Characteristics:**
- Feature modules organized as domain directories with clear internal structure
- Each domain is self-contained with its own components, hooks, API, and types
- Shared UI components, utilities, and types in a centralized `shared` layer
- React Router for navigation with route definitions centralized in `src/app`
- TanStack Query for server state management (React Query)
- React Hook Form for form state management

## Layers

**App Layer:**
- Purpose: Application bootstrap, routing, and top-level provider configuration
- Location: `src/app`
- Contains: Root React component, route definitions, layout shells, navigation guards
- Depends on: All feature domains, shared components/hooks, React Router, providers
- Used by: Browser entry point (index.html → main.tsx)

**Feature Domains:**
- Purpose: Feature-specific business logic, screens, and components
- Location: `src/domains/[domain-name]` (e.g., `src/domains/patient-registration`)
- Contains: Screens, components, API hooks, business logic, types, core utilities
- Depends on: Shared layer, other domains (via exports), external libraries
- Used by: App layer for route elements

**Shared Layer:**
- Purpose: Cross-cutting concerns and reusable utilities
- Location: `src/shared`
- Contains: UI components, custom hooks, API client, utility functions, type definitions
- Depends on: External libraries only (React, UI libs, utilities)
- Used by: All feature domains and app layer

## Data Flow

**Page Load Flow:**

1. Browser loads `/index.html`
2. Vite entry point: `src/app/main.tsx` creates React root
3. App initializes with providers (QueryClientProvider, BrowserRouter, TooltipProvider, Toaster)
4. BrowserRouter matches URL to route defined in `src/app/App.tsx`
5. Route renders a feature domain Page component (e.g., `PatientRegistrationPage`)
6. Page component fetches data via TanStack Query hooks (e.g., `usePatient()`)
7. API calls go through `src/shared/lib/api.ts` to backend at `VITE_API_BASE_URL`

**Mutation Flow:**

1. User submits form in feature domain (e.g., patient registration)
2. Form uses React Hook Form for client-side state
3. On submit, calls mutation hook (e.g., `useCreatePatient()`)
4. Hook uses TanStack Query's `useMutation()` with `src/shared/lib/api.ts`
5. API sends request to backend
6. On success, query cache is invalidated and UI updates
7. Navigation occurs via `react-router-dom` (e.g., `navigate(paths.patient(id))`)

**State Management:**
- Server state: TanStack Query (caching, synchronization)
- Client state: React Hook Form (form inputs), React hooks (UI state)
- Navigation state: React Router (URL, route params)
- No Redux or Zustand - keep it simple

## Key Abstractions

**Domain Module:**
- Purpose: Encapsulate a feature with screens, logic, and API
- Examples: `src/domains/patient-registration`, `src/domains/patient-notes`, `src/domains/dashboard`
- Pattern: Each domain exports public API (screens, types, hooks) via `index.ts`

**Screen Component:**
- Purpose: Page-level component that handles routing params and orchestrates sub-components
- Examples: `src/domains/patient-registration/screens/RegistrationScreen.tsx`
- Pattern: Named as `*Screen.tsx` internally, exported as `*Page` function for app routing

**API Hook:**
- Purpose: Encapsulate API calls and data fetching with TanStack Query
- Examples: `src/domains/patient-notes/api/useNotes.ts`, `src/shared/lib/api.ts`
- Pattern: Use `useQuery()` for reads, `useMutation()` for writes

**Component:**
- Purpose: Reusable UI elements within a domain
- Examples: `src/domains/patient-registration/components/PatientIdentitySection.tsx`
- Pattern: Accept props, compose other components, no data fetching logic

**Core/Business Logic:**
- Purpose: Domain-specific utilities, validation, type definitions
- Examples: `src/domains/patient-detail/core/vitals.ts` (vital ranges, formatters)
- Pattern: Pure functions, constants, type definitions

## Entry Points

**Application Entry:**
- Location: `src/app/main.tsx`
- Triggers: Browser loads index.html
- Responsibilities: Create React root, render App component with providers

**Route Entry (App Component):**
- Location: `src/app/App.tsx`
- Triggers: BrowserRouter mounts routes
- Responsibilities: Define all application routes, provider setup (QueryClient, Toaster, Router)

**Domain Entry (Feature Screen):**
- Location: `src/domains/*/screens/*.tsx` (exported as `*Page` functions)
- Triggers: React Router matches route
- Responsibilities: Read route params, fetch data via hooks, manage page-level state, layout

**Layout Entry:**
- Location: `src/app/layout/AppShell.tsx`
- Triggers: Routes needing header/bottom bar
- Responsibilities: Provide consistent layout (header, content area, bottom navigation)

## Error Handling

**Strategy:** Error boundaries where needed, try-catch in API layer, user-facing toasts for errors

**Patterns:**
- API errors: `src/shared/lib/api.ts` checks response status, throws Error on failure
- Query errors: TanStack Query captures in hook's error state
- Form errors: React Hook Form manages validation errors
- User feedback: `src/shared/components/ui/sonner` or `src/shared/components/ui/toaster` for notifications

## Cross-Cutting Concerns

**Logging:** Console logging in API layer for debugging requests/responses (see `src/shared/lib/api.ts` lines 24-52)

**Validation:**
- Form: React Hook Form with custom validators
- API payloads: `src/domains/patient-detail/core/payload.ts` has transformation functions

**Authentication:** Not yet implemented - auth context/provider would go in `src/app` layer

**API Communication:**
- Base URL: `VITE_API_BASE_URL` env var, defaults to `/api`
- Client: `src/shared/lib/api.ts` exports `api` object with typed methods
- Snake-case conversion: Automatic transformation in request function (camelCase to snake_case)

**Navigation:**
- Type-safe route names: `src/app/navigation.ts` exports `paths` object (referenced as `paths.patient(id)`)
- Router: `react-router-dom` with BrowserRouter
- Guarding: `UnsavedChangesGuard` component in `src/app/guards` for preventing loss of form data

---

*Architecture analysis: 2026-02-09*
