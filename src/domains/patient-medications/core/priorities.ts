// Medication Priorities
// Pure TypeScript (NO React/RN imports)
// Extracted from inline duplication in PatientMeds, AddMedicationPage, EditMedicationPage

import type { MedPriority } from './types';

export interface MedPriorityConfig {
  value: MedPriority;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  order: number;
}

export const PRIORITY_CONFIG: Record<MedPriority, MedPriorityConfig> = {
  stat: {
    value: 'stat',
    label: 'STAT',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    order: 0,
  },
  urgent: {
    value: 'urgent',
    label: 'Urgent',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    order: 1,
  },
  routine: {
    value: 'routine',
    label: 'Routine',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    order: 2,
  },
  prn: {
    value: 'prn',
    label: 'PRN',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    order: 3,
  },
};

export const PRIORITY_ORDER: MedPriority[] = ['stat', 'urgent', 'routine', 'prn'];

export function getPriorityConfig(priority: MedPriority): MedPriorityConfig {
  return PRIORITY_CONFIG[priority];
}

export function getPriorityColor(priority: MedPriority): string {
  return PRIORITY_CONFIG[priority].color;
}

export function getPriorityBgColor(priority: MedPriority): string {
  return PRIORITY_CONFIG[priority].bgColor;
}

export function getPriorityLabel(priority: MedPriority): string {
  return PRIORITY_CONFIG[priority].label;
}

export function comparePriority(a: MedPriority, b: MedPriority): number {
  return PRIORITY_CONFIG[a].order - PRIORITY_CONFIG[b].order;
}

// RN colors for badge rendering
export const PRIORITY_COLORS: Record<MedPriority, { bg: string; text: string; border: string }> = {
  stat: { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
  urgent: { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
  routine: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  prn: { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
};
