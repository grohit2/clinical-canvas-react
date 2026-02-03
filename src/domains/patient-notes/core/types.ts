// Patient Notes Types
// Pure TypeScript (NO React/RN imports)
// Note: Base Note interface stays in shared/types/api.ts

export type NoteCategory =
  | 'general'
  | 'progress'
  | 'nursing'
  | 'physician'
  | 'consultation'
  | 'procedure'
  | 'discharge'
  | 'other';

export interface NoteCategoryConfig {
  value: NoteCategory;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const NOTE_CATEGORIES: NoteCategoryConfig[] = [
  {
    value: 'general',
    label: 'General',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
  },
  {
    value: 'progress',
    label: 'Progress Note',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
  },
  {
    value: 'nursing',
    label: 'Nursing Note',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-300',
  },
  {
    value: 'physician',
    label: 'Physician Note',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    borderColor: 'border-indigo-300',
  },
  {
    value: 'consultation',
    label: 'Consultation',
    color: 'text-teal-700',
    bgColor: 'bg-teal-100',
    borderColor: 'border-teal-300',
  },
  {
    value: 'procedure',
    label: 'Procedure Note',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
  },
  {
    value: 'discharge',
    label: 'Discharge Note',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
  },
  {
    value: 'other',
    label: 'Other',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
];

export function getCategoryConfig(category: NoteCategory): NoteCategoryConfig {
  return NOTE_CATEGORIES.find((c) => c.value === category) || NOTE_CATEGORIES[0];
}

export function getCategoryLabel(category: NoteCategory): string {
  return getCategoryConfig(category).label;
}

export function getCategoryColor(category: NoteCategory): string {
  return getCategoryConfig(category).color;
}

export function getCategoryBgColor(category: NoteCategory): string {
  return getCategoryConfig(category).bgColor;
}

// Map to RN colors for badge rendering
export const CATEGORY_COLORS: Record<NoteCategory, { bg: string; text: string; border: string }> = {
  general: { bg: '#f3f4f6', text: '#374151', border: '#d1d5db' },
  progress: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  nursing: { bg: '#f3e8ff', text: '#7c3aed', border: '#c4b5fd' },
  physician: { bg: '#e0e7ff', text: '#4338ca', border: '#a5b4fc' },
  consultation: { bg: '#ccfbf1', text: '#0f766e', border: '#5eead4' },
  procedure: { bg: '#ffedd5', text: '#c2410c', border: '#fdba74' },
  discharge: { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  other: { bg: '#f9fafb', text: '#4b5563', border: '#e5e7eb' },
};

// Re-export for convenience - actual type from shared
export interface Note {
  id: string;
  patientId: string;
  category: NoteCategory;
  content: string;
  author: string;
  authorId?: string;
  createdAt: string;
  updatedAt: string;
  attachments?: NoteAttachment[];
}

export interface NoteAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}
