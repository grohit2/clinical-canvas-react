// Category configuration for document UI components
import {
  Camera,
  FileText,
  Stethoscope,
  Scissors,
  ClipboardList,
  Activity,
  FileCheck,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";
import type { DocCategory } from "../model/types";

export interface CategoryConfigItem {
  title: string;
  shortLabel: string;
  icon: LucideIcon;
  color: string; // tailwind text-* color
  bgFrom: string; // gradient start
  bgTo: string; // gradient end
}

export const CATEGORY_CONFIG: Record<DocCategory | "all", CategoryConfigItem> = {
  preop_pics: {
    title: "Pre-operative",
    shortLabel: "Pre-op",
    icon: Camera,
    color: "text-blue-600",
    bgFrom: "from-blue-500",
    bgTo: "to-blue-600",
  },
  lab_reports: {
    title: "Lab Reports",
    shortLabel: "Labs",
    icon: FileText,
    color: "text-green-600",
    bgFrom: "from-green-500",
    bgTo: "to-green-600",
  },
  radiology: {
    title: "Radiology",
    shortLabel: "Radio",
    icon: Activity,
    color: "text-purple-600",
    bgFrom: "from-purple-500",
    bgTo: "to-purple-600",
  },
  intraop_pics: {
    title: "Intra-operative",
    shortLabel: "Intra",
    icon: Scissors,
    color: "text-red-600",
    bgFrom: "from-red-500",
    bgTo: "to-red-600",
  },
  ot_notes: {
    title: "OT Notes",
    shortLabel: "Notes",
    icon: ClipboardList,
    color: "text-orange-600",
    bgFrom: "from-orange-500",
    bgTo: "to-orange-600",
  },
  postop_pics: {
    title: "Post-operative",
    shortLabel: "Post",
    icon: Stethoscope,
    color: "text-teal-600",
    bgFrom: "from-teal-500",
    bgTo: "to-teal-600",
  },
  discharge_pics: {
    title: "Discharge",
    shortLabel: "Disc",
    icon: FileCheck,
    color: "text-indigo-600",
    bgFrom: "from-indigo-500",
    bgTo: "to-indigo-600",
  },
  all: {
    title: "All Documents",
    shortLabel: "All",
    icon: FolderOpen,
    color: "text-gray-600",
    bgFrom: "from-gray-500",
    bgTo: "to-gray-600",
  },
};

export function getCategoryConfig(category: DocCategory | "all"): CategoryConfigItem {
  return CATEGORY_CONFIG[category];
}

export function getCategoryIcon(category: DocCategory | "all"): LucideIcon {
  return CATEGORY_CONFIG[category].icon;
}
