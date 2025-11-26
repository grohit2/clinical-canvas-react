// Document entity types - canonical types for the document domain

export type DocCategory =
  | "preop_pics"
  | "lab_reports"
  | "radiology"
  | "intraop_pics"
  | "ot_notes"
  | "postop_pics"
  | "discharge_pics";

export interface DocumentItem {
  id: string;
  category: DocCategory;
  name: string;
  uploadedAt: string; // ISO datetime
  fileUrl: string; // CloudFront URL for full size
  thumbUrl: string; // CloudFront URL for thumbnail
  contentType?: string;
  isImage: boolean;
  size?: number;
  uploaderName?: string;
  isShared?: boolean;
  version?: number;
}

export interface FolderSummary {
  category: DocCategory;
  count: number;
  lastUpdatedAt?: string; // ISO datetime
}

export type SortOrder = "asc" | "desc";

export const DOC_CATEGORIES: DocCategory[] = [
  "preop_pics",
  "lab_reports",
  "radiology",
  "intraop_pics",
  "ot_notes",
  "postop_pics",
  "discharge_pics",
];

export const CATEGORY_LABELS: Record<DocCategory, string> = {
  preop_pics: "Pre-op",
  lab_reports: "Lab Reports",
  radiology: "Radiology",
  intraop_pics: "Intra-op",
  ot_notes: "OT Notes",
  postop_pics: "Post-op",
  discharge_pics: "Discharge",
};

export const CATEGORY_FULL_LABELS: Record<DocCategory, string> = {
  preop_pics: "Pre-operative",
  lab_reports: "Lab Reports",
  radiology: "Radiology",
  intraop_pics: "Intra-operative",
  ot_notes: "OT Notes",
  postop_pics: "Post-operative",
  discharge_pics: "Discharge",
};

export function isValidCategory(value: unknown): value is DocCategory {
  return DOC_CATEGORIES.includes(value as DocCategory);
}
