import type { DocCategory } from './types';

export interface CategoryMetaItem {
  title: string;
  shortLabel: string;
  colorKey: string;
  gradientFrom: string;
  gradientTo: string;
}

export type CategoryMetaKey = DocCategory | 'all';

export const CATEGORY_META: Record<CategoryMetaKey, CategoryMetaItem> = {
  preop_pics: {
    title: 'Pre-operative',
    shortLabel: 'Pre-op',
    colorKey: 'blue',
    gradientFrom: '#3b82f6',
    gradientTo: '#2563eb',
  },
  lab_reports: {
    title: 'Lab Reports',
    shortLabel: 'Labs',
    colorKey: 'green',
    gradientFrom: '#16a34a',
    gradientTo: '#15803d',
  },
  radiology: {
    title: 'Radiology',
    shortLabel: 'Radio',
    colorKey: 'purple',
    gradientFrom: '#8b5cf6',
    gradientTo: '#7c3aed',
  },
  intraop_pics: {
    title: 'Intra-operative',
    shortLabel: 'Intra',
    colorKey: 'red',
    gradientFrom: '#ef4444',
    gradientTo: '#dc2626',
  },
  ot_notes: {
    title: 'OT Notes',
    shortLabel: 'Notes',
    colorKey: 'orange',
    gradientFrom: '#f97316',
    gradientTo: '#ea580c',
  },
  postop_pics: {
    title: 'Post-operative',
    shortLabel: 'Post',
    colorKey: 'teal',
    gradientFrom: '#14b8a6',
    gradientTo: '#0d9488',
  },
  discharge_pics: {
    title: 'Discharge',
    shortLabel: 'Disc',
    colorKey: 'indigo',
    gradientFrom: '#6366f1',
    gradientTo: '#4f46e5',
  },
  unorganized: {
    title: 'Unorganized',
    shortLabel: 'Unsorted',
    colorKey: 'gray',
    gradientFrom: '#6b7280',
    gradientTo: '#9ca3af',
  },
  all: {
    title: 'All Documents',
    shortLabel: 'All',
    colorKey: 'gray',
    gradientFrom: '#6b7280',
    gradientTo: '#4b5563',
  },
};
