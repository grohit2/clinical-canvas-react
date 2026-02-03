import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { paths } from "@/app/navigation";

export type WorkflowStepId = "admission" | "pre-op" | "ot" | "post-op" | "discharge";

export interface WorkflowStep {
  id: WorkflowStepId;
  label: string;
  shortLabel: string;
  to: string;
}

const WORKFLOW_STEP_ORDER: WorkflowStepId[] = [
  "admission",
  "pre-op",
  "ot",
  "post-op",
  "discharge",
];

export function useWorkflowSteps(patientId: string) {
  const location = useLocation();

  const steps = useMemo<WorkflowStep[]>(
    () => [
      {
        id: "admission",
        label: "Admission",
        shortLabel: "ADM",
        to: paths.patientAdmission(patientId),
      },
      {
        id: "pre-op",
        label: "Pre-Op",
        shortLabel: "PRE",
        to: paths.patientPreOp(patientId),
      },
      {
        id: "ot",
        label: "OT",
        shortLabel: "OT",
        to: paths.patientOt(patientId),
      },
      {
        id: "post-op",
        label: "Post-Op",
        shortLabel: "POST",
        to: paths.patientPostOp(patientId),
      },
      {
        id: "discharge",
        label: "Discharge",
        shortLabel: "DC",
        to: paths.patientDischarge(patientId),
      },
    ],
    [patientId]
  );

  const getCurrentStepFromPath = (pathname: string): WorkflowStepId | null => {
    if (pathname.includes("/admission")) return "admission";
    if (pathname.includes("/pre-op")) return "pre-op";
    if (pathname.includes("/ot")) return "ot";
    if (pathname.includes("/post-op")) return "post-op";
    if (pathname.includes("/discharge")) return "discharge";
    return null;
  };

  const currentStepId = getCurrentStepFromPath(location.pathname);

  const currentStep = useMemo(
    () => steps.find((s) => s.id === currentStepId) ?? null,
    [steps, currentStepId]
  );

  const currentStepIndex = useMemo(
    () => (currentStepId ? WORKFLOW_STEP_ORDER.indexOf(currentStepId) : -1),
    [currentStepId]
  );

  const getNextStep = (fromId: WorkflowStepId): WorkflowStep | null => {
    const idx = WORKFLOW_STEP_ORDER.indexOf(fromId);
    if (idx === -1 || idx >= WORKFLOW_STEP_ORDER.length - 1) return null;
    const nextId = WORKFLOW_STEP_ORDER[idx + 1];
    return steps.find((s) => s.id === nextId) ?? null;
  };

  const getPrevStep = (fromId: WorkflowStepId): WorkflowStep | null => {
    const idx = WORKFLOW_STEP_ORDER.indexOf(fromId);
    if (idx <= 0) return null;
    const prevId = WORKFLOW_STEP_ORDER[idx - 1];
    return steps.find((s) => s.id === prevId) ?? null;
  };

  const isStepComplete = (stepId: WorkflowStepId, patientStage?: string): boolean => {
    // Map patient currentState to workflow step completion
    // A step is complete if the patient has progressed past it
    const stageToStepMap: Record<string, number> = {
      onboarding: -1,
      preop: 1,
      intraop: 2,
      postop: 3,
      "discharge-init": 4,
      discharge: 5,
    };

    const stepIndexMap: Record<WorkflowStepId, number> = {
      admission: 0,
      "pre-op": 1,
      ot: 2,
      "post-op": 3,
      discharge: 4,
    };

    const patientProgress = stageToStepMap[patientStage ?? "onboarding"] ?? -1;
    const stepIndex = stepIndexMap[stepId];

    return patientProgress >= stepIndex;
  };

  return {
    steps,
    currentStep,
    currentStepId,
    currentStepIndex,
    getNextStep,
    getPrevStep,
    getCurrentStepFromPath,
    isStepComplete,
  };
}
