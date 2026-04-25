import {
  Camera,
  FileText,
  Stethoscope,
  Scissors,
  ClipboardList,
  Activity,
  FileCheck,
  FolderOpen,
  Inbox,
  type LucideIcon,
} from 'lucide-react';
import { CATEGORY_META } from '../core/categoryMeta';
import type { DocCategory } from '../core/types';

export interface CategoryConfigItem {
  title: string;
  shortLabel: string;
  icon: LucideIcon;
  color: string;
  bgFrom: string;
  bgTo: string;
}

const COLOR_CLASSES: Record<string, Pick<CategoryConfigItem, 'color' | 'bgFrom' | 'bgTo'>> = {
  blue: { color: 'text-blue-600', bgFrom: 'from-blue-500', bgTo: 'to-blue-600' },
  green: { color: 'text-green-600', bgFrom: 'from-green-500', bgTo: 'to-green-600' },
  purple: { color: 'text-purple-600', bgFrom: 'from-purple-500', bgTo: 'to-purple-600' },
  red: { color: 'text-red-600', bgFrom: 'from-red-500', bgTo: 'to-red-600' },
  orange: { color: 'text-orange-600', bgFrom: 'from-orange-500', bgTo: 'to-orange-600' },
  teal: { color: 'text-teal-600', bgFrom: 'from-teal-500', bgTo: 'to-teal-600' },
  indigo: { color: 'text-indigo-600', bgFrom: 'from-indigo-500', bgTo: 'to-indigo-600' },
  gray: { color: 'text-gray-600', bgFrom: 'from-gray-500', bgTo: 'to-gray-600' },
};

const CATEGORY_ICONS: Record<DocCategory | 'all', LucideIcon> = {
  preop_pics: Camera,
  lab_reports: FileText,
  radiology: Activity,
  intraop_pics: Scissors,
  ot_notes: ClipboardList,
  postop_pics: Stethoscope,
  discharge_pics: FileCheck,
  unorganized: Inbox,
  all: FolderOpen,
};

function toConfig(category: DocCategory | 'all'): CategoryConfigItem {
  const meta = CATEGORY_META[category];
  const classes = COLOR_CLASSES[meta.colorKey] || COLOR_CLASSES.gray;

  return {
    title: meta.title,
    shortLabel: meta.shortLabel,
    icon: CATEGORY_ICONS[category],
    color: classes.color,
    bgFrom: classes.bgFrom,
    bgTo: classes.bgTo,
  };
}

export const CATEGORY_CONFIG: Record<DocCategory | 'all', CategoryConfigItem> = {
  preop_pics: toConfig('preop_pics'),
  lab_reports: toConfig('lab_reports'),
  radiology: toConfig('radiology'),
  intraop_pics: toConfig('intraop_pics'),
  ot_notes: toConfig('ot_notes'),
  postop_pics: toConfig('postop_pics'),
  discharge_pics: toConfig('discharge_pics'),
  unorganized: toConfig('unorganized'),
  all: toConfig('all'),
};

export function getCategoryConfig(category: DocCategory | 'all'): CategoryConfigItem {
  return CATEGORY_CONFIG[category];
}

export function getCategoryIcon(category: DocCategory | 'all'): LucideIcon {
  return CATEGORY_CONFIG[category].icon;
}
