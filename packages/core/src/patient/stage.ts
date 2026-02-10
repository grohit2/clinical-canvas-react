import type { StageVariant } from './types';

export const STAGE_LABEL_MAP: Record<string, string> = {
  onboarding: 'Onboarding',
  preop: 'Pre-Op',
  intraop: 'Intra-Op',
  postop: 'Post-Op',
  'discharge-init': 'Discharge Init',
  discharge: 'Discharge',
};

export const STAGE_ALIASES: Record<string, string[]> = {
  onboarding: ['onboarding'],
  preop: ['preop', 'pre-op'],
  intraop: ['intraop', 'intra-op', 'surgery'],
  postop: ['postop', 'post-op', 'recovery', 'stable'],
  'discharge-init': ['discharge-init', 'discharge init'],
  discharge: ['discharge'],
};

export function normalizeStageKey(stage: string): string {
  const key = (stage || '').toLowerCase();
  if (key === 'pre-op') return 'preop';
  if (key === 'intra-op' || key === 'surgery') return 'intraop';
  if (key === 'post-op') return 'postop';
  return key;
}

export function getStageVariant(stage: string): StageVariant['variant'] {
  const compact = normalizeStageKey(stage);
  if (compact === 'intraop') return 'urgent';
  if (compact === 'preop') return 'caution';
  if (compact === 'postop' || compact === 'discharge') return 'stable';
  return 'default';
}

export function getStageLabel(stage: string): string {
  const compact = normalizeStageKey(stage);
  return STAGE_LABEL_MAP[compact] || stage || 'Unknown';
}

export function getStageColorClass(stage: string): string {
  const variant = getStageVariant(stage);
  switch (variant) {
    case 'urgent':
      return 'border-l-urgent';
    case 'caution':
      return 'border-l-caution';
    case 'stable':
      return 'border-l-stable';
    default:
      return 'border-l-medical';
  }
}

export function matchesStage(patientStage: string | undefined, filterStage: string): boolean {
  if (filterStage === 'all') return true;
  const patientStageLower = (patientStage || '').toLowerCase();
  const aliases = STAGE_ALIASES[filterStage];
  if (aliases) {
    return aliases.includes(patientStageLower);
  }
  return patientStageLower === filterStage;
}
