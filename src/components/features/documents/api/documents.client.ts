import { getDocuments, DocumentsProfile } from "@/lib/filesApi"; // keep your current API
import { DocItem, DocCategory, FolderSummary } from "./documents.types";

export const CATEGORY_KEYS: DocCategory[] = [
  "preop_pics",
  "lab_reports",
  "radiology",
  "intraop_pics",
  "ot_notes",
  "postop_pics",
  "discharge_pics",
];

export async function fetchProfile(uid: string): Promise<DocumentsProfile> {
  return await getDocuments(uid);
}

export function getItemsForCategory(
  profile: DocumentsProfile,
  category: DocCategory
): DocItem[] {
  const src: any[] =
    category === "preop_pics"   ? (profile.preopPics ?? [])  :
    category === "lab_reports"  ? (profile.labReports ?? []) :
    category === "radiology"    ? (profile.radiology ?? [])  :
    category === "intraop_pics" ? (profile.intraopPics ?? []) :
    category === "ot_notes"     ? (profile.otNotes ?? [])    :
    category === "postop_pics"  ? (profile.postopPics ?? []) :
    /* discharge */                (profile.dischargePics ?? []);

  return src.map((raw) => normalizeRawItem(raw, category));
}

export function getFolderSummaries(profile: DocumentsProfile): FolderSummary[] {
  return CATEGORY_KEYS.map((cat) => {
    const items = getItemsForCategory(profile, cat);
    const count = items.length;
    const lastUpdatedAt = maxIso(items.map((i) => i.uploadedAt));
    return { category: cat, count, lastUpdatedAt };
  });
}

/* ───────────── helpers ───────────── */

function normalizeRawItem(raw: any, category: DocCategory): DocItem {
  const uploadedAt: string =
    raw?.uploadedAt || raw?.createdAt || raw?.date || raw?.created_at || raw?.timestamp || new Date().toISOString();

  const fileUrl: string = raw?.url || raw?.fileUrl || raw?.imageUrl || raw?.src || "";
  const thumbUrl: string = raw?.thumbUrl || raw?.thumbnailUrl || fileUrl;

  const name: string =
    raw?.name || raw?.title || fileBaseName(fileUrl) || "Document";

  const id = String(raw?.id ?? `${fileUrl}-${uploadedAt}`);
  const contentType: string | undefined = raw?.contentType || raw?.mime;
  const isImage = detectImage(fileUrl, contentType);

  return {
    id,
    category,
    name,
    uploadedAt,
    fileUrl,
    thumbUrl,
    contentType,
    isImage,
    size: raw?.size,
    uploaderName: raw?.uploader?.name ?? raw?.uploadedBy ?? undefined,
  };
}

function detectImage(url: string, contentType?: string) {
  if (contentType?.startsWith?.("image/")) return true;
  const ext = (url.split("?")[0].split(".").pop() || "").toLowerCase();
  return ["png","jpg","jpeg","gif","webp","bmp","tiff","svg","heic","heif"].includes(ext);
}

function fileBaseName(url: string) {
  try {
    const u = new URL(url, window.location.origin);
    const base = u.pathname.split("/").pop() || "";
    const raw = base.replace(/\.[a-z0-9]+$/i, "");
    return decodeURIComponent(raw).replace(/[_-]+/g, " ").trim();
  } catch {
    const p = url.split("?")[0].split("#")[0];
    const base = p.split("/").pop() || "";
    return base.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ").trim();
  }
}

function maxIso(isoList: (string | undefined)[]) {
  const ts = isoList
    .map((s) => (s ? new Date(s).getTime() : NaN))
    .filter((n) => !Number.isNaN(n));
  if (!ts.length) return undefined;
  return new Date(Math.max(...ts)).toISOString();
}
