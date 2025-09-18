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
  uploadedAt: string;       // ISO
  fileUrl: string;
  thumbUrl: string;
  contentType?: string;
  isImage: boolean;
  size?: number;
  uploaderName?: string;
}

export interface FolderSummary {
  category: DocCategory;
  count: number;
  lastUpdatedAt?: string;   // ISO
}
