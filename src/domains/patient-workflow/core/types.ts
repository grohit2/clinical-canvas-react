// Patient Workflow Types
// Pure TypeScript (NO React/RN imports)

export type WorkflowStepId =
  | 'admission'
  | 'pre-op'
  | 'ot'
  | 'post-op'
  | 'discharge';

export type WorkflowStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export interface WorkflowStep {
  id: WorkflowStepId;
  label: string;
  shortLabel: string;
  description: string;
  order: number;
  status: WorkflowStepStatus;
  completedAt?: string;
  completedBy?: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  completed: boolean;
  required: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface ChecklistSection {
  id: string;
  title: string;
  items: ChecklistItem[];
}

export interface WorkflowState {
  patientId: string;
  currentStep: WorkflowStepId;
  steps: WorkflowStep[];
  startedAt: string;
  completedAt?: string;
}

// Zone color mapping for workflow steps
export const STEP_ZONE_MAP: Record<WorkflowStepId, 'blue' | 'yellow' | 'red' | 'green'> = {
  'admission': 'blue',
  'pre-op': 'yellow',
  'ot': 'red',
  'post-op': 'yellow',
  'discharge': 'green',
};
