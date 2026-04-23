import type { DocCategory, DocumentItem, FolderSummary } from "./types";

// Helper to extract filename from S3 key
function filenameFromKey(key?: string): string {
  if (!key) return "file";
  const parts = key.split("/");
  return parts[parts.length - 1] || "file";
}

// Helper to detect if file is an image
function isImageByMimeOrExt(mime?: string, name?: string): boolean {
  if (mime?.startsWith("image/")) return true;
  const ext = name?.split(".").pop()?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "heic", "heif"].includes(ext);
}

// Raw API document shape (from backend)
export interface ApiDocument {
  key?: string;
  id?: string;
  name?: string;
  title?: string;
  cdnUrl?: string;
  url?: string;
  thumbUrl?: string;
  thumbnailUrl?: string;
  uploadedAt?: string;
  createdAt?: string;
  date?: string;
  timestamp?: string;
  mimeType?: string;
  size?: number;
  uploadedBy?: string;
  version?: number;
  isShared?: boolean;
  caption?: string;
}

// Raw documents profile from API (all categories)
export interface ApiDocumentsProfile {
  preopPics?: ApiDocument[];
  labReports?: ApiDocument[];
  radiology?: ApiDocument[];
  intraopPics?: ApiDocument[];
  otNotes?: ApiDocument[];
  postopPics?: ApiDocument[];
  dischargePics?: ApiDocument[];
}

/**
 * Maps a raw API document to our canonical DocumentItem type
 */
export function mapDocumentFromApi(
  raw: ApiDocument,
  category: DocCategory
): DocumentItem {
  const uploadedAt =
    raw.uploadedAt ||
    raw.createdAt ||
    raw.date ||
    raw.timestamp ||
    new Date().toISOString();

  const fileUrl = raw.cdnUrl || raw.url || "";
  const thumbUrl = raw.thumbUrl || raw.thumbnailUrl || fileUrl;
  const id = String(raw.key ?? raw.id ?? `${fileUrl}-${uploadedAt}`);
  const name = raw.name || raw.title || raw.caption || filenameFromKey(raw.key) || "file";
  const contentType = raw.mimeType;
  const isImage = isImageByMimeOrExt(contentType, name);

  return {
    id,
    category,
    name,
    uploadedAt,
    fileUrl,
    thumbUrl,
    contentType,
    isImage,
    size: raw.size,
    uploaderName: raw.uploadedBy,
    isShared: raw.isShared,
    version: raw.version,
  };
}

/**
 * Maps an API documents profile to an array of folder summaries
 */
export function mapFolderSummariesFromApi(
  profile: ApiDocumentsProfile
): FolderSummary[] {
  const categories: { key: DocCategory; arr: ApiDocument[] | undefined }[] = [
    { key: "preop_pics", arr: profile.preopPics },
    { key: "lab_reports", arr: profile.labReports },
    { key: "radiology", arr: profile.radiology },
    { key: "intraop_pics", arr: profile.intraopPics },
    { key: "ot_notes", arr: profile.otNotes },
    { key: "postop_pics", arr: profile.postopPics },
    { key: "discharge_pics", arr: profile.dischargePics },
  ];

  return categories.map(({ key, arr }) => {
    const count = arr?.length ?? 0;
    let lastUpdatedAt: string | undefined;

    if (count && arr) {
      const sorted = [...arr].sort((a, b) => {
        const ta = new Date(a.uploadedAt || a.createdAt || 0).getTime();
        const tb = new Date(b.uploadedAt || b.createdAt || 0).getTime();
        return tb - ta;
      });
      lastUpdatedAt = sorted[0]?.uploadedAt || sorted[0]?.createdAt;
    }

    return { category: key, count, lastUpdatedAt };
  });
}

/**
 * Maps API documents profile to document items for a specific category
 */
export function mapCategoryDocumentsFromApi(
  profile: ApiDocumentsProfile,
  category: DocCategory,
  sortOrder: "asc" | "desc" = "desc"
): DocumentItem[] {
  const categoryMap: Record<DocCategory, ApiDocument[] | undefined> = {
    preop_pics: profile.preopPics,
    lab_reports: profile.labReports,
    radiology: profile.radiology,
    intraop_pics: profile.intraopPics,
    ot_notes: profile.otNotes,
    postop_pics: profile.postopPics,
    discharge_pics: profile.dischargePics,
  };

  const raw = categoryMap[category] ?? [];
  const items = raw.map((doc) => mapDocumentFromApi(doc, category));

  items.sort((a, b) => {
    const ta = new Date(a.uploadedAt).getTime();
    const tb = new Date(b.uploadedAt).getTime();
    return sortOrder === "asc" ? ta - tb : tb - ta;
  });

  return items;
}

/**
 * Maps API documents profile to all document items (all categories)
 */
export function mapAllDocumentsFromApi(
  profile: ApiDocumentsProfile,
  sortOrder: "asc" | "desc" = "desc"
): DocumentItem[] {
  const allDocs: DocumentItem[] = [];

  const categories: { key: DocCategory; arr: ApiDocument[] | undefined }[] = [
    { key: "preop_pics", arr: profile.preopPics },
    { key: "lab_reports", arr: profile.labReports },
    { key: "radiology", arr: profile.radiology },
    { key: "intraop_pics", arr: profile.intraopPics },
    { key: "ot_notes", arr: profile.otNotes },
    { key: "postop_pics", arr: profile.postopPics },
    { key: "discharge_pics", arr: profile.dischargePics },
  ];

  categories.forEach(({ key, arr }) => {
    (arr ?? []).forEach((doc) => {
      allDocs.push(mapDocumentFromApi(doc, key));
    });
  });

  allDocs.sort((a, b) => {
    const ta = new Date(a.uploadedAt).getTime();
    const tb = new Date(b.uploadedAt).getTime();
    return sortOrder === "asc" ? ta - tb : tb - ta;
  });

  return allDocs;
}
