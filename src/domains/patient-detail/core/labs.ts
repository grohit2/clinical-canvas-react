// Labs - Pure TypeScript (NO React/RN imports)
// Lab value parsing, normal ranges, and grouping

import type { LabResult } from './types';

export interface LabCategory {
  name: string;
  labs: LabResult[];
}

export function isLabNormal(lab: LabResult): boolean {
  return !lab.isAbnormal;
}

export function formatLabValue(lab: LabResult): string {
  return `${lab.value} ${lab.unit}`;
}

export function groupLabsByCategory(labs: LabResult[]): LabCategory[] {
  // TODO: Implement grouping logic based on lab types
  // For now, return all labs in a single category
  return [
    {
      name: 'All Labs',
      labs,
    },
  ];
}

export function getAbnormalLabs(labs: LabResult[]): LabResult[] {
  return labs.filter((lab) => lab.isAbnormal);
}
