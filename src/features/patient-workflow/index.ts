// Patient Workflow Feature
// Handles the in-patient journey: Admission -> Pre-Op -> OT -> Post-Op -> Discharge

export { AdmissionPage } from "./ui/AdmissionPage";
export { PreOpPage } from "./ui/PreOpPage";
export { OTPage } from "./ui/OTPage";
export { PostOpPage } from "./ui/PostOpPage";
export { DischargePage } from "./ui/DischargePage";
export { WorkflowStepper } from "./ui/WorkflowStepper";
export { WorkflowPageLayout } from "./ui/WorkflowPageLayout";

export { useWorkflowSteps } from "./model/useWorkflowSteps";
export type { WorkflowStep, WorkflowStepId } from "./model/useWorkflowSteps";
