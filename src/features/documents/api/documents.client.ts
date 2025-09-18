import { CATEGORY_LABELS, DocCategory, DocItem, FolderSummary, SortOrder } from "./documents.types";
import { getDocuments, DocumentsProfile, DocumentsCategory } from "@/lib/filesApi";
import { filenameFromKey, isImageByMimeOrExt } from "../utils/format";

// Bridge existing backend to normalized types.

export async function fetchFolderSummaries(uid: string): Promise<FolderSummary[]> {
  const docs = await getDocuments(uid);
  const categories: { key: DocCategory; arr: any[] | undefined }[] = [
    { key: "preop_pics", arr: docs.preopPics },
    { key: "lab_reports", arr: docs.labReports },
    { key: "radiology", arr: docs.radiology },
    { key: "intraop_pics", arr: docs.intraopPics },
    { key: "ot_notes", arr: docs.otNotes },
    { key: "postop_pics", arr: docs.postopPics },
    { key: "discharge_pics", arr: docs.dischargePics },
  ];

  return categories.map(({ key, arr }) => {
    const count = arr?.length ?? 0;
    let lastUpdatedAt: string | undefined = undefined;
    if (count) {
      const latest = [...(arr as any[])].sort((a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime())[0];
      lastUpdatedAt = latest?.uploadedAt;
    }
    return { category: key, count, lastUpdatedAt };
  });
}

export async function fetchCategoryItems(
  uid: string,
  category: DocCategory,
  order: SortOrder = "desc"
): Promise<DocItem[]> {
  const docs: DocumentsProfile = await getDocuments(uid);
  const src = pickArray(docs, category) ?? [];
  const items: DocItem[] = src.map((it) => normalizeDocItem(it, category));
  items.sort((a, b) => {
    const ta = new Date(a.uploadedAt).getTime();
    const tb = new Date(b.uploadedAt).getTime();
    return order === "asc" ? ta - tb : tb - ta;
  });
  return items;
}

function pickArray(docs: DocumentsProfile, cat: DocCategory) {
  const map: Record<DocCategory, any[] | undefined> = {
    preop_pics: docs.preopPics,
    lab_reports: docs.labReports,
    radiology: docs.radiology,
    intraop_pics: docs.intraopPics,
    ot_notes: docs.otNotes,
    postop_pics: docs.postopPics,
    discharge_pics: docs.dischargePics,
  };
  return map[cat];
}

function normalizeDocItem(raw: any, category: DocCategory): DocItem {
  const uploadedAt = raw?.uploadedAt || raw?.createdAt || raw?.date || raw?.timestamp || new Date().toISOString();
  const cfUrl = raw?.cdnUrl || raw?.url || "";
  const thumbUrl = raw?.thumbUrl || raw?.thumbnailUrl || cfUrl;
  const id = String(raw?.key ?? raw?.id ?? `${cfUrl}-${uploadedAt}`);
  const name = raw?.name || raw?.title || filenameFromKey(raw?.key) || "file";
  const contentType: string | undefined = raw?.mimeType || undefined;
  const isImage = isImageByMimeOrExt(contentType, name);

  return {
    id,
    category,
    name,
    uploadedAt,
    fileUrl: cfUrl,
    thumbUrl,
    contentType,
    isImage,
    size: raw?.size,
    uploaderName: raw?.uploadedBy || undefined,
    version: raw?.version || undefined,
  };
}

export const CATEGORY_ORDER: DocCategory[] = [
  "preop_pics",
  "lab_reports",
  "radiology",
  "intraop_pics",
  "ot_notes",
  "postop_pics",
  "discharge_pics",
];

