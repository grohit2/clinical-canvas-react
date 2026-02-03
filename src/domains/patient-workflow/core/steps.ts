// Workflow Steps Configuration
// Pure TypeScript (NO React/RN imports)

import type { WorkflowStepId, WorkflowStep } from './types';

export interface WorkflowStepConfig {
  id: WorkflowStepId;
  label: string;
  shortLabel: string;
  description: string;
  order: number;
  route: string;
}

export const WORKFLOW_STEPS: WorkflowStepConfig[] = [
  {
    id: 'admission',
    label: 'Admission',
    shortLabel: 'ADM',
    description: 'Patient registration and initial assessment',
    order: 0,
    route: 'admission',
  },
  {
    id: 'pre-op',
    label: 'Pre-Op',
    shortLabel: 'PRE',
    description: 'Pre-operative preparation and clearance',
    order: 1,
    route: 'pre-op',
  },
  {
    id: 'ot',
    label: 'OT',
    shortLabel: 'OT',
    description: 'Operation theatre procedures',
    order: 2,
    route: 'ot',
  },
  {
    id: 'post-op',
    label: 'Post-Op',
    shortLabel: 'POST',
    description: 'Post-operative care and monitoring',
    order: 3,
    route: 'post-op',
  },
  {
    id: 'discharge',
    label: 'Discharge',
    shortLabel: 'DIS',
    description: 'Discharge preparation and summary',
    order: 4,
    route: 'discharge',
  },
];

export const WORKFLOW_STEP_ORDER: WorkflowStepId[] = WORKFLOW_STEPS.map((s) => s.id);

export function getStepConfig(stepId: WorkflowStepId): WorkflowStepConfig {
  return WORKFLOW_STEPS.find((s) => s.id === stepId) || WORKFLOW_STEPS[0];
}

export function getNextStep(currentStep: WorkflowStepId): WorkflowStepId | null {
  const currentIndex = WORKFLOW_STEP_ORDER.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex === WORKFLOW_STEP_ORDER.length - 1) {
    return null;
  }
  return WORKFLOW_STEP_ORDER[currentIndex + 1];
}

export function getPreviousStep(currentStep: WorkflowStepId): WorkflowStepId | null {
  const currentIndex = WORKFLOW_STEP_ORDER.indexOf(currentStep);
  if (currentIndex <= 0) {
    return null;
  }
  return WORKFLOW_STEP_ORDER[currentIndex - 1];
}

export function isFirstStep(stepId: WorkflowStepId): boolean {
  return stepId === WORKFLOW_STEP_ORDER[0];
}

export function isLastStep(stepId: WorkflowStepId): boolean {
  return stepId === WORKFLOW_STEP_ORDER[WORKFLOW_STEP_ORDER.length - 1];
}
