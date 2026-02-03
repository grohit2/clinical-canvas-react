// Vitals - Pure TypeScript (NO React/RN imports)
// Vital sign calculations, ranges, and formatting

import type { VitalSign } from './types';

export interface VitalRange {
  min: number;
  max: number;
  unit: string;
}

export const VITAL_RANGES: Record<VitalSign['type'], VitalRange> = {
  temperature: { min: 36.1, max: 37.2, unit: '°C' },
  bloodPressure: { min: 90, max: 120, unit: 'mmHg' }, // systolic
  heartRate: { min: 60, max: 100, unit: 'bpm' },
  respiratoryRate: { min: 12, max: 20, unit: '/min' },
  oxygenSaturation: { min: 95, max: 100, unit: '%' },
};

export function getVitalRange(type: VitalSign['type']): VitalRange {
  return VITAL_RANGES[type];
}

export function isVitalNormal(type: VitalSign['type'], value: number): boolean {
  const range = VITAL_RANGES[type];
  return value >= range.min && value <= range.max;
}

export function formatVital(type: VitalSign['type'], value: number): string {
  const range = VITAL_RANGES[type];
  return `${value}${range.unit}`;
}
