# Testing Patterns

**Analysis Date:** 2026-02-09

## Test Framework

**Runner:**
- Vitest 4.0.14
- Config: `vite.config.ts` (test section)
- Environment: jsdom
- Globals: true (no need to import describe/it/expect)

**Assertion Library:**
- Vitest built-in (uses Chai)
- @testing-library/react for component testing
- @testing-library/jest-dom for DOM matchers

**Run Commands:**
```bash
npm run test              # Not configured - use vitest directly
vitest                    # Run all tests
vitest --watch           # Watch mode
vitest --coverage        # Coverage report (v8 provider)
```

**Setup Files:**
- `src/test/setup.ts` - Imported by vitest
- Imports `@testing-library/jest-dom/vitest`
- Polyfills `window.matchMedia` for components that read it

## Test File Organization

**Location:**
- Co-located with source code in `__tests__` directories
- Pattern: `src/domains/{domain}/__tests__/*.test.tsx` (components)
- Pattern: `src/domains/{domain}/core/__tests__/*.test.ts` (utilities)
- Example: `src/domains/patient-detail/__tests__/PatientDetailScreen.test.tsx`

**Naming:**
- Matches source file name with `.test.tsx` suffix
- Example: `PatientDetailScreen.tsx` → `PatientDetailScreen.test.tsx`
- Utility tests: `.test.ts` for non-component files

**Structure:**
```
src/domains/patient-detail/
├── screens/
│   └── PatientDetailScreen.tsx
├── components/
│   ├── PatientHeader.tsx
│   └── MrnOverview.tsx
├── core/
│   └── types.ts
└── __tests__/
    ├── PatientDetailScreen.test.tsx
    └── PatientTabs.test.tsx
```

## Test Structure

**Suite Organization:**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

describe("PatientDetailPage", () => {
  beforeEach(() => {
    // Setup before each test
    queryClient.clear();
  });

  afterEach(() => {
    // Cleanup after each test
    vi.restoreAllMocks();
  });

  it("should render something when conditions are met", () => {
    // Test implementation
  });
});
```

**Patterns:**
- **Setup:** `beforeEach()` for common test setup (QueryClient clear, mock reset)
- **Teardown:** `afterEach()` for cleanup (restore mocks)
- **Structure:** Nested `describe()` blocks for grouping related tests
- **Assertions:** Direct `expect()` calls without additional assertion libraries

## Mocking

**Framework:** Vitest's `vi` module

**Patterns:**

```typescript
// Module mocking with vi.mock()
vi.mock("@/lib/api", async (orig) => {
  const actual = await orig();
  return {
    api: {
      ...actual.api,
      patients: {
        ...actual.api.patients,
        get: vi.fn(),
      },
    },
  };
});

// Function mocking
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock setup and assertions
vi.mocked(api.patients.get).mockResolvedValueOnce({
  id: "p1",
  name: "Jane Roe",
  // ...
} as any);

expect(vi.mocked(api.patients.get)).toHaveBeenCalledWith("p1");
```

**What to Mock:**
- External API calls (api module)
- Router functions (useNavigate)
- Toast notifications
- Network dependencies
- Any imports from @/ path aliases

**What NOT to Mock:**
- React hooks from React itself
- Testing utilities (render, screen)
- Query providers and state management
- DOM/browser APIs (except matchMedia in setup)

## Fixtures and Factories

**Test Data:**

```typescript
// Factory function pattern
const baseFormValues = (overrides: Partial<PatientFormValues> = {}): PatientFormValues => ({
  name: "Jane Roe",
  age: 42,
  sex: "F",
  mrn: "ABC-123",
  scheme: "ASP",
  pathway: "surgical",
  status: "ACTIVE",
  department: "General",
  currentState: "onboarding",
  comorbidities: [],
  includeOtherComorbidity: false,
  otherComorbidity: "",
  isUrgent: false,
  ...overrides,
});

// Mock object pattern
const mockDocument: DocumentItem = {
  id: "doc-1",
  category: "preop_pics",
  name: "test-image.jpg",
  fileUrl: "https://cdn.example.com/test-image.jpg",
  thumbUrl: "https://cdn.example.com/test-thumb.jpg",
  uploadedAt: "2024-01-15T10:00:00Z",
  contentType: "image/jpeg",
  isImage: true,
  size: 1024,
};

// Default props pattern
const defaultProps = {
  document: mockDocument,
  currentIndex: 0,
  totalCount: 5,
  onClose: vi.fn(),
  onNavigate: vi.fn(),
  canNavigatePrev: true,
  canNavigateNext: true,
};
```

**Location:**
- Defined at the top of test files
- Shared fixtures in same test file
- Inline mock objects for one-off tests
- Factory functions for complex/reusable test data

## Coverage

**Requirements:** Not enforced
- No coverage threshold configured
- Coverage runs on-demand with `vitest --coverage`
- V8 provider configured in vite.config.ts

**View Coverage:**
```bash
vitest --coverage
```

## Test Types

**Unit Tests:**
- Test individual utility functions in isolation
- Located in `core/__tests__/` directories
- Example: `payload.test.ts` tests data transformation functions
- Scope: Pure functions with clear inputs/outputs
- Use direct function calls and expect assertions

```typescript
describe("mapSexToApi", () => {
  it("maps UI selections to API values", () => {
    expect(mapSexToApi("M")).toBe("male");
    expect(mapSexToApi("F")).toBe("female");
  });
});
```

**Component/Integration Tests:**
- Test React components with their dependencies
- Use Testing Library for user-centric testing
- Located in `__tests__/` directories at domain level
- Render components with required providers (Router, QueryClient)
- Test user interactions and rendered output

```typescript
function renderWithRouter(initialPath: string) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/patients/:id" element={<PatientDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("PatientDetailPage", () => {
  it("renders patient summary when data loads", async () => {
    vi.mocked(api.patients.get).mockResolvedValueOnce({ /* mock data */ } as any);
    renderWithRouter("/patients/p1");
    await waitFor(() => expect(screen.getByText("Jane Roe")).toBeInTheDocument());
  });
});
```

**E2E Tests:**
- Framework: Playwright (@playwright/test 1.57.0)
- Command: `npm run test:e2e`
- Tests run against live application
- No test files found in repository (likely external or in separate suite)

## Common Patterns

**Async Testing:**

```typescript
// Using waitFor for async assertions
await waitFor(() => {
  expect(screen.getByText("Jane Roe")).toBeInTheDocument();
});

// Using waitFor with custom timeout
await waitFor(
  () => {
    expect(result.current.form.formState.errors).toBeDefined();
  },
  { timeout: 3000 }
);

// Using renderHook for hook testing
const { result } = renderHook(() => usePatient(id));
await waitFor(() => {
  expect(result.current.data).toBeDefined();
});
```

**Error Testing:**

```typescript
describe("error handling", () => {
  it("displays error message on failure", async () => {
    vi.mocked(api.patients.get).mockRejectedValueOnce(new Error("Network error"));

    renderWithRouter("/patients/p1");

    await waitFor(() => {
      expect(screen.getByText(/Failed to load patient/)).toBeInTheDocument();
    });
  });
});
```

**Mock Assertions:**

```typescript
// Check if mock was called
expect(vi.mocked(api.patients.get)).toHaveBeenCalledWith("p1");

// Check how many times called
expect(addEventListenerSpy).toHaveBeenCalledWith(
  "beforeunload",
  expect.any(Function)
);

// Check call arguments
const handler = addEventListenerSpy.mock.calls.find(
  (call) => call[0] === "beforeunload"
)?.[1] as EventListener;
```

**Hook Testing with Wrappers:**

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>{children}</BrowserRouter>
  </QueryClientProvider>
);

const { result } = renderHook(() => usePatientRegistrationForm(), { wrapper });
```

**Spy Pattern for Browser APIs:**

```typescript
let addEventListenerSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  addEventListenerSpy = vi.spyOn(window, "addEventListener");
});

afterEach(() => {
  addEventListenerSpy.mockRestore();
});

it("adds beforeunload listener when mounted", () => {
  renderHook(() => useUnsavedGuard(true), { wrapper: RouterWrapper });
  expect(addEventListenerSpy).toHaveBeenCalledWith(
    "beforeunload",
    expect.any(Function)
  );
});
```

## Test Coverage Analysis

**Well-tested areas:**
- Data transformation functions (`payload.test.ts`, `mapFromApi.test.ts`)
- Hook behavior (`useRegistrationForm.test.tsx`, `use-unsaved-guard.test.tsx`)
- Component rendering with mocked data
- Router integration
- Form validation

**Lightly tested areas:**
- End-to-end user workflows
- Error boundary behavior
- Complex conditional rendering
- API error scenarios (partially covered)

---

*Testing analysis: 2026-02-09*
