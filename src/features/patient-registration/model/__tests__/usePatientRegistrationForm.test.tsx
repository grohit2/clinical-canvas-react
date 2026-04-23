import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { usePatientRegistrationForm } from "../usePatientRegistrationForm";
import type { ReactNode } from "react";

// Mock the API
vi.mock("@/lib/api", () => ({
  default: {
    patients: {
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock toast
vi.mock("@shared/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe("usePatientRegistrationForm", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  it("should initialize with default values in create mode", () => {
    const { result } = renderHook(() => usePatientRegistrationForm(), {
      wrapper,
    });

    expect(result.current.isEditMode).toBe(false);
    expect(result.current.form.getValues("name")).toBe("");
    expect(result.current.form.getValues("sex")).toBe("M");
    expect(result.current.form.getValues("scheme")).toBe("OTHERS");
    expect(result.current.form.getValues("pathway")).toBe("surgical");
    expect(result.current.form.getValues("status")).toBe("ACTIVE");
    expect(result.current.form.getValues("currentState")).toBe("onboarding");
  });

  it("should be in edit mode when patientId is provided", () => {
    const { result } = renderHook(
      () => usePatientRegistrationForm("test-patient-id"),
      { wrapper }
    );

    expect(result.current.isEditMode).toBe(true);
    expect(result.current.patientQuery).not.toBeNull();
  });

  it("should have onSubmit function", () => {
    const { result } = renderHook(() => usePatientRegistrationForm(), {
      wrapper,
    });

    expect(typeof result.current.onSubmit).toBe("function");
  });

  it("should expose loading state", () => {
    const { result } = renderHook(() => usePatientRegistrationForm(), {
      wrapper,
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("should have form validation errors for empty required fields", async () => {
    const { result } = renderHook(() => usePatientRegistrationForm(), {
      wrapper,
    });

    // Trigger validation
    await result.current.form.trigger();

    await waitFor(() => {
      const errors = result.current.form.formState.errors;
      expect(errors.name).toBeDefined();
      expect(errors.mrn).toBeDefined();
      expect(errors.department).toBeDefined();
    });
  });
});
