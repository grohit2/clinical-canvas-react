// Dashboard types - Pure TypeScript, no React/RN imports

export interface KPIData {
  totalPatients: number;
  tasksDue: number;
  urgentAlerts: number;
}

export interface StageEntry {
  stage: string;
  count: number;
  variant: 'default' | 'urgent' | 'stable' | 'caution';
}

export interface UpcomingProcedure {
  id: string;
  name: string;
  procedure?: string;
  when: Date;
}

// Stage label mapping
export const STAGE_LABEL_MAP: Record<string, string> = {
  onboarding: 'Onboarding',
  preop: 'Pre-Op',
  intraop: 'Intra-Op',
  postop: 'Post-Op',
  'discharge-init': 'Discharge Init',
  discharge: 'Discharge',
};

// Normalize stage key for consistent matching
export function normalizeStageKey(stage: string): string {
  const key = (stage || '').toLowerCase();
  if (key === 'pre-op') return 'preop';
  if (key === 'intra-op' || key === 'surgery') return 'intraop';
  if (key === 'post-op') return 'postop';
  return key;
}

// Get variant color based on stage
export function getStageVariant(compact: string): StageEntry['variant'] {
  if (compact === 'intraop') return 'urgent';
  if (compact === 'preop') return 'caution';
  if (compact === 'postop' || compact === 'discharge') return 'stable';
  return 'default';
}
