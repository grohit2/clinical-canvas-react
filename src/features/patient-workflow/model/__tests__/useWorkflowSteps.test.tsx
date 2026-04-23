import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { useWorkflowSteps } from "../useWorkflowSteps";

// Mock react-router-dom's useLocation
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useLocation: () => ({
      pathname: "/patients/test-id/pre-op",
      search: "",
      hash: "",
      state: null,
      key: "default",
    }),
  };
});

describe("useWorkflowSteps", () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <BrowserRouter>{children}</BrowserRouter>
  );

  const patientId = "test-patient-123";

  it("should return all workflow steps", () => {
    const { result } = renderHook(() => useWorkflowSteps(patientId), {
      wrapper,
    });

    expect(result.current.steps).toHaveLength(5);
    expect(result.current.steps.map((s) => s.id)).toEqual([
      "admission",
      "pre-op",
      "ot",
      "post-op",
      "discharge",
    ]);
  });

  it("should generate correct paths for each step", () => {
    const { result } = renderHook(() => useWorkflowSteps(patientId), {
      wrapper,
    });

    expect(result.current.steps[0].to).toBe(`/patients/${patientId}/admission`);
    expect(result.current.steps[1].to).toBe(`/patients/${patientId}/pre-op`);
    expect(result.current.steps[2].to).toBe(`/patients/${patientId}/ot`);
    expect(result.current.steps[3].to).toBe(`/patients/${patientId}/post-op`);
    expect(result.current.steps[4].to).toBe(`/patients/${patientId}/discharge`);
  });

  it("should have correct labels for each step", () => {
    const { result } = renderHook(() => useWorkflowSteps(patientId), {
      wrapper,
    });

    expect(result.current.steps[0].label).toBe("Admission");
    expect(result.current.steps[0].shortLabel).toBe("ADM");
    expect(result.current.steps[2].label).toBe("OT");
    expect(result.current.steps[2].shortLabel).toBe("OT");
    expect(result.current.steps[4].label).toBe("Discharge");
    expect(result.current.steps[4].shortLabel).toBe("DC");
  });

  it("should detect current step from pathname", () => {
    const { result } = renderHook(() => useWorkflowSteps(patientId), {
      wrapper,
    });

    // Based on our mock, pathname is /patients/test-id/pre-op
    expect(result.current.currentStepId).toBe("pre-op");
    expect(result.current.currentStep?.label).toBe("Pre-Op");
    expect(result.current.currentStepIndex).toBe(1);
  });

  it("should return next step correctly", () => {
    const { result } = renderHook(() => useWorkflowSteps(patientId), {
      wrapper,
    });

    const nextFromAdmission = result.current.getNextStep("admission");
    expect(nextFromAdmission?.id).toBe("pre-op");

    const nextFromOt = result.current.getNextStep("ot");
    expect(nextFromOt?.id).toBe("post-op");

    const nextFromDischarge = result.current.getNextStep("discharge");
    expect(nextFromDischarge).toBeNull();
  });

  it("should return previous step correctly", () => {
    const { result } = renderHook(() => useWorkflowSteps(patientId), {
      wrapper,
    });

    const prevFromAdmission = result.current.getPrevStep("admission");
    expect(prevFromAdmission).toBeNull();

    const prevFromPreOp = result.current.getPrevStep("pre-op");
    expect(prevFromPreOp?.id).toBe("admission");

    const prevFromDischarge = result.current.getPrevStep("discharge");
    expect(prevFromDischarge?.id).toBe("post-op");
  });

  it("should determine step completion based on patient stage", () => {
    const { result } = renderHook(() => useWorkflowSteps(patientId), {
      wrapper,
    });

    // Patient at onboarding - no steps complete
    expect(result.current.isStepComplete("admission", "onboarding")).toBe(false);

    // Patient at preop - admission complete
    expect(result.current.isStepComplete("admission", "preop")).toBe(true);
    expect(result.current.isStepComplete("pre-op", "preop")).toBe(true);
    expect(result.current.isStepComplete("ot", "preop")).toBe(false);

    // Patient at intraop - admission, pre-op complete
    expect(result.current.isStepComplete("admission", "intraop")).toBe(true);
    expect(result.current.isStepComplete("pre-op", "intraop")).toBe(true);
    expect(result.current.isStepComplete("ot", "intraop")).toBe(true);
    expect(result.current.isStepComplete("post-op", "intraop")).toBe(false);

    // Patient at discharge - all complete
    expect(result.current.isStepComplete("discharge", "discharge")).toBe(true);
  });
});
