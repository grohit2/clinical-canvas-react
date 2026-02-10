import {
  Activity,
  Camera,
  ClipboardList,
  FileCheck,
  FileText,
  FolderOpen,
  Scissors,
  Stethoscope,
} from 'lucide-react-native';
import type { ComponentType } from 'react';
import type { ColorValue } from 'react-native';
import type { DocCategory } from './types';

export interface CategoryConfigItem {
  title: string;
  shortLabel: string;
  icon: ComponentType<{ size?: string | number; color?: ColorValue }>;
  gradient: [string, string];
}

export const CATEGORY_CONFIG: Record<DocCategory | 'all', CategoryConfigItem> = {
  preop_pics: {
    title: 'Pre-operative',
    shortLabel: 'Pre-op',
    icon: Camera,
    gradient: ['#3b82f6', '#2563eb'],
  },
  lab_reports: {
    title: 'Lab Reports',
    shortLabel: 'Labs',
    icon: FileText,
    gradient: ['#16a34a', '#15803d'],
  },
  radiology: {
    title: 'Radiology',
    shortLabel: 'Radio',
    icon: Activity,
    gradient: ['#8b5cf6', '#7c3aed'],
  },
  intraop_pics: {
    title: 'Intra-operative',
    shortLabel: 'Intra',
    icon: Scissors,
    gradient: ['#ef4444', '#dc2626'],
  },
  ot_notes: {
    title: 'OT Notes',
    shortLabel: 'Notes',
    icon: ClipboardList,
    gradient: ['#f97316', '#ea580c'],
  },
  postop_pics: {
    title: 'Post-operative',
    shortLabel: 'Post',
    icon: Stethoscope,
    gradient: ['#14b8a6', '#0d9488'],
  },
  discharge_pics: {
    title: 'Discharge',
    shortLabel: 'Disc',
    icon: FileCheck,
    gradient: ['#6366f1', '#4f46e5'],
  },
  all: {
    title: 'All Documents',
    shortLabel: 'All',
    icon: FolderOpen,
    gradient: ['#6b7280', '#4b5563'],
  },
};
