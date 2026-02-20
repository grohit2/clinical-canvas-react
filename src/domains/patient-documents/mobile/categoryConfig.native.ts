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
import { CATEGORY_META } from '../core/categoryMeta';
import type { DocCategory } from '../core/types';

export interface CategoryConfigItem {
  title: string;
  shortLabel: string;
  icon: ComponentType<{ size?: string | number; color?: ColorValue }>;
  gradient: [string, string];
}

const CATEGORY_ICONS: Record<DocCategory | 'all', CategoryConfigItem['icon']> = {
  preop_pics: Camera,
  lab_reports: FileText,
  radiology: Activity,
  intraop_pics: Scissors,
  ot_notes: ClipboardList,
  postop_pics: Stethoscope,
  discharge_pics: FileCheck,
  all: FolderOpen,
};

export const CATEGORY_CONFIG: Record<DocCategory | 'all', CategoryConfigItem> = {
  preop_pics: {
    title: CATEGORY_META.preop_pics.title,
    shortLabel: CATEGORY_META.preop_pics.shortLabel,
    icon: CATEGORY_ICONS.preop_pics,
    gradient: [CATEGORY_META.preop_pics.gradientFrom, CATEGORY_META.preop_pics.gradientTo],
  },
  lab_reports: {
    title: CATEGORY_META.lab_reports.title,
    shortLabel: CATEGORY_META.lab_reports.shortLabel,
    icon: CATEGORY_ICONS.lab_reports,
    gradient: [CATEGORY_META.lab_reports.gradientFrom, CATEGORY_META.lab_reports.gradientTo],
  },
  radiology: {
    title: CATEGORY_META.radiology.title,
    shortLabel: CATEGORY_META.radiology.shortLabel,
    icon: CATEGORY_ICONS.radiology,
    gradient: [CATEGORY_META.radiology.gradientFrom, CATEGORY_META.radiology.gradientTo],
  },
  intraop_pics: {
    title: CATEGORY_META.intraop_pics.title,
    shortLabel: CATEGORY_META.intraop_pics.shortLabel,
    icon: CATEGORY_ICONS.intraop_pics,
    gradient: [CATEGORY_META.intraop_pics.gradientFrom, CATEGORY_META.intraop_pics.gradientTo],
  },
  ot_notes: {
    title: CATEGORY_META.ot_notes.title,
    shortLabel: CATEGORY_META.ot_notes.shortLabel,
    icon: CATEGORY_ICONS.ot_notes,
    gradient: [CATEGORY_META.ot_notes.gradientFrom, CATEGORY_META.ot_notes.gradientTo],
  },
  postop_pics: {
    title: CATEGORY_META.postop_pics.title,
    shortLabel: CATEGORY_META.postop_pics.shortLabel,
    icon: CATEGORY_ICONS.postop_pics,
    gradient: [CATEGORY_META.postop_pics.gradientFrom, CATEGORY_META.postop_pics.gradientTo],
  },
  discharge_pics: {
    title: CATEGORY_META.discharge_pics.title,
    shortLabel: CATEGORY_META.discharge_pics.shortLabel,
    icon: CATEGORY_ICONS.discharge_pics,
    gradient: [CATEGORY_META.discharge_pics.gradientFrom, CATEGORY_META.discharge_pics.gradientTo],
  },
  all: {
    title: CATEGORY_META.all.title,
    shortLabel: CATEGORY_META.all.shortLabel,
    icon: CATEGORY_ICONS.all,
    gradient: [CATEGORY_META.all.gradientFrom, CATEGORY_META.all.gradientTo],
  },
};
