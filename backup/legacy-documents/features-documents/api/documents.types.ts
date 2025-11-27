// Normalized types for the Documents feature
export type DocCategory =
  | "preop_pics"
  | "lab_reports"
  | "radiology"
  | "intraop_pics"
  | "ot_notes"
  | "postop_pics"
  | "discharge_pics";

export interface DocItem {
  id: string;
  category: DocCategory;
  name: string;
  uploadedAt: string; // ISO
  fileUrl: string; // CloudFront URL
  thumbUrl: string; // CloudFront URL
  contentType?: string;
  isImage: boolean;
  size?: number;
  uploaderName?: string;
  isShared?: boolean;
  version?: number;
}

export interface FolderSummary {
  category: DocCategory;
  count: number; // from backend; for now bridged from existing API
  lastUpdatedAt?: string; // ISO
}

export type SortOrder = "asc" | "desc";

export const CATEGORY_LABELS: Record<DocCategory, string> = {
  preop_pics: "Pre-op",
  lab_reports: "Lab Reports",
  radiology: "Radiology",
  intraop_pics: "Intra-op",
  ot_notes: "OT Notes",
  postop_pics: "Post-op",
  discharge_pics: "Discharge",
};

