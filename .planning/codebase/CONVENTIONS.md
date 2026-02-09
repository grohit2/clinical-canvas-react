# Coding Conventions

**Analysis Date:** 2026-02-09

## Naming Patterns

**Files:**
- React components: PascalCase with `.tsx` extension (e.g., `PatientDetailScreen.tsx`, `Card.tsx`)
- Utility/library files: camelCase with `.ts` extension (e.g., `api.ts`, `utils.ts`, `cn.ts`)
- Hook files: kebab-case with `.ts` extension (e.g., `use-unsaved-guard.ts`, `use-toast.ts`)
- Test files: same name as source with `.test.tsx` or `.test.ts` suffix (e.g., `PatientDetailScreen.test.tsx`)
- Test directories: `__tests__` folder at domain or feature level

**Functions:**
- React components and exported functions: PascalCase
- Utility functions: camelCase
- Hook functions: camelCase with `use` prefix (e.g., `usePatient`, `useUnsavedGuard`, `useBeforeUnloadGuard`)
- Private/internal functions: camelCase

**Variables:**
- Constants: UPPER_SNAKE_CASE for immutable module-level constants
- Regular variables: camelCase
- Component props and state: camelCase
- Type/interface names: PascalCase

**Types:**
- Interfaces and type aliases: PascalCase (e.g., `Patient`, `DocumentItem`, `PatientFormValues`)
- Generic type parameters: Single letter uppercase (e.g., `T`)
- API response types: Prefix with `Api` (e.g., `ApiDocument`, `ApiDocumentsProfile`)

## Code Style

**Formatting:**
- Tool: ESLint (configured in `eslint.config.js`)
- Language features: TypeScript with ES2020 target
- JSX: `react-jsx` mode (no React import needed in files)
- No explicit formatter (Prettier not configured)

**Linting:**
- Runner: ESLint 9.9.0 with TypeScript ESLint
- Config: `eslint.config.js` (flat config format)
- Key rules enabled:
  - `react-hooks/rules-of-hooks`: Enforces rules of hooks
  - `react-refresh/only-export-components`: Warns on non-component exports (with allowConstantExport)
- Key rules disabled:
  - `@typescript-eslint/no-unused-vars`: Disabled (allows unused variables)

**TypeScript Settings:**
- Target: ES2020
- Module: ESNext
- Strict mode: FALSE (noImplicitAny, strictNullChecks, strict all false)
- Unused variables/parameters not enforced

## Import Organization

**Order:**
1. External dependencies (React, libraries like react-router-dom, @tanstack/react-query)
2. Path aliases (@/, @app/, @shared/, @entities/, @features/)
3. Relative imports (./components, ../types)
4. Type imports at end if needed

**Path Aliases:**
- `@/`: Base `./src` directory
- `@app/`: `./src/app` (routing, layout, guards)
- `@shared/`: `./src/shared` (UI components, hooks, utilities)
- `@entities/`: `./src/entities` (NOT FOUND - may be legacy reference)
- `@features/`: `./src/features` (domain features - NOT FOUND, actual structure uses `src/domains`)

**Note:** Codebase uses `src/domains` structure but imports reference `@features/`. This mismatch exists in the codebase.

## Error Handling

**Patterns:**
- Console logging for errors during development (used extensively)
- `console.error()` in catch blocks
- Emoji-prefixed logs for visual distinction (e.g., `❌`, `✅`, `🔄`)
- Error objects logged directly in most cases
- No custom error classes detected; uses standard `Error` constructor
- Error messages passed to toast notifications for user-facing errors

**Example from codebase:**
```typescript
try {
  // operation
} catch (error) {
  console.error("❌ Failed to add MRN - Full Error:", error);
  console.error("❌ Error Message:", error instanceof Error ? error.message : 'Unknown error');
  toast({ title: "Error", description: errorMessage });
}
```

## Logging

**Framework:** Console (console.log, console.error)

**Patterns:**
- Used extensively for debugging HTTP requests/responses
- Debug logs include emoji prefixes for clarity
- API logs conditional (only for patient-related PUT/PATCH requests)
- No structured logging library detected
- Logs appear in components, utilities, and API client

**Example:**
```typescript
if (path.includes('/patients/') && (options.method === 'PUT' || options.method === 'PATCH')) {
  console.log("🌍 HTTP Request Details:");
  console.log("  URL:", fullUrl);
  console.log("  Body:", options.body);
}
```

## Comments

**When to Comment:**
- Few comments in codebase
- Comments used for:
  - Route explanations (e.g., "QR view - no shell (fullscreen)")
  - Block separations in complex sections
  - Special behavior notes (e.g., "CORS preflights on GET")

**JSDoc/TSDoc:**
- Minimal usage
- Type annotations preferred over JSDoc
- When used, simple parameter descriptions

## Function Design

**Size:** Most functions are concise (under 30 lines), with longer functions used for:
- React components with rendering logic
- Mapping/transformation functions with multiple operations

**Parameters:**
- Components use props pattern with destructuring
- Utility functions use multiple parameters
- Objects preferred for grouped related parameters
- Type annotations on all parameters

**Return Values:**
- Explicit return types on all functions
- React components return JSX.Element
- Data transformation functions return typed data
- Hooks return arrays (e.g., `[state, setState]`) or objects

**Example component pattern:**
```typescript
export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: patient, isLoading, error } = usePatient(id);

  if (isLoading) { /* loading UI */ }
  if (error || !patient) { /* error UI */ }

  return (
    <div>
      {/* main content */}
    </div>
  );
}
```

## Module Design

**Exports:**
- Named exports preferred over default exports
- Components exported as named exports
- Utilities exported as named exports
- Some legacy default exports exist (e.g., App.tsx)

**Barrel Files:**
- Component composition files use sub-exports (e.g., Card with CardHeader, CardContent, etc.)
- Index files not commonly used for aggregation
- Direct imports from source files preferred

## Component Patterns

**React Component Structure:**
- Functional components only
- Using React hooks extensively
- Props destructured in function signature
- TypeScript types for all props
- Loading states typically show spinner or loading placeholder
- Error states show error message
- Main content rendered on success

**UI Component Library:**
- Radix UI components for functionality (@radix-ui/*)
- Tailwind CSS for styling (with clsx and tailwind-merge for class composition)
- Shadcn/ui component patterns (forwardRef with displayName)
- Icons from lucide-react

**Example UI Component:**
```typescript
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("rounded-lg border bg-card", className)} {...props} />
  )
);
Card.displayName = "Card";
```

## API Integration

**Client Library:** Fetch API with custom wrapper
- Located in `src/shared/lib/api.ts`
- Custom `request<T>()` function for type-safe requests
- Auto-converts camelCase to snake_case for API payloads
- Conditional logging for patient endpoints
- Error handling with fallback empty object parsing

**Query Management:** TanStack React Query
- QueryClient instantiated in `App.tsx`
- Used for all data fetching hooks
- Error handling via query result's `error` property

## Routing

**Router:** React Router v6
- BrowserRouter at app level (in `App.tsx`)
- Memory Router in tests
- Route parameter extraction with `useParams()`
- Navigation with `useNavigate()`
- Path aliases for route organization

---

*Convention analysis: 2026-02-09*
