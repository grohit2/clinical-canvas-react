// src/lib/filesApi.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export type HttpError = Error & { status?: number; body?: any };

async function requestWithStatus<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const r = await fetch(path, init);
  if (!r.ok) {
    const body = await r
      .json()
      .catch(() => ({ error: r.statusText || "request failed" }));
    const err: HttpError = Object.assign(new Error(body.error || r.statusText), {
      status: r.status,
      body,
    });
    throw err;
  }
  return r.json();
}

export type DocType = "preop" | "lab" | "radiology" | "intraop" | "otnotes" | "postop" | "discharge";
export type FilesScope = "optimized" | "originals" | "thumb";
export type FilesKind = "doc" | "note" | "med" | "task";

export interface PresignUploadRequest {
  filename: string;
  mimeType: "image/avif" | "image/webp" | "image/jpeg" | "image/png";
  target?: "optimized" | "originals" | "thumb";
  kind?: FilesKind;
  docType?: DocType;
  refId?: string;
  quality?: number;
  maxW?: number;
  needsOptimization?: boolean;
  label?: string;
}

export type S3Key = string;
export interface PresignUploadResponse {
  key: S3Key;
  uploadUrl: string;
  method: "PUT";
  headers: Record<string, string>;
  contentType: string;
  expiresIn: number;
  hints: { optimizedKey: S3Key; originalKey: S3Key; thumbKey: S3Key };
}

export async function presignUpload(mrn: string, body: PresignUploadRequest): Promise<PresignUploadResponse> {
  return requestWithStatus<PresignUploadResponse>(
    `${API_BASE}/patients/${encodeURIComponent(mrn)}/files/presign-upload`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
}

export interface FilesListItem {
  key: S3Key;
  size?: number | null;
  etag?: string | null;
  lastModified?: string | null;
  mrn?: string | null;
  target?: string | null;
  kind?: string | null;
  docType?: string | null;
  refId?: string | null;
  filename?: string | null;
  url?: string | null;
  expiresIn?: number | null;
}
export interface FilesListResponse {
  prefix: string;
  items: FilesListItem[];
  nextCursor?: string | null;
}

export async function listFiles(params: {
  mrn: string;
  scope?: FilesScope;
  kind?: FilesKind;
  docType?: DocType;
  refId?: string;
  limit?: number;
  cursor?: string;
  presign?: boolean;
}): Promise<FilesListResponse> {
  const q = new URLSearchParams();
  if (params.scope) q.set("scope", params.scope);
  if (params.kind) q.set("kind", params.kind);
  if (params.docType) q.set("docType", params.docType);
  if (params.refId) q.set("refId", params.refId);
  if (params.limit) q.set("limit", String(params.limit));
  if (params.cursor) q.set("cursor", params.cursor);
  if (params.presign) q.set("presign", "1");
  const r = await fetch(`${API_BASE}/patients/${encodeURIComponent(params.mrn)}/files?${q.toString()}`);
  if (!r.ok) throw await r.json().catch(() => ({ error: "list failed" }));
  return r.json();
}

export interface PresignDownloadResponse {
  url: string;
  method: "GET";
  key: S3Key;
  expiresIn: number;
}
export async function presignDownload(mrn: string, key: S3Key): Promise<PresignDownloadResponse> {
  const r = await fetch(`${API_BASE}/patients/${encodeURIComponent(mrn)}/files/presign-download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!r.ok) throw await r.json().catch(() => ({ error: "download presign failed" }));
  return r.json();
}

export type DocumentsCategory =
  | "preop_pics"
  | "lab_reports"
  | "radiology"
  | "intraop_pics"
  | "ot_notes"
  | "postop_pics"
  | "discharge_pics";

export interface DocumentsProfile {
  mrn: string;
  preopPics: DocEntry[];
  labReports: DocEntry[];
  radiology: DocEntry[];
  intraopPics: DocEntry[];
  otNotes: DocEntry[];
  postopPics: DocEntry[];
  dischargePics: DocEntry[];
  createdAt?: string | null;
  updatedAt?: string | null;
}
export interface DocEntry {
  key: S3Key;
  uploadedAt: string;
  uploadedBy?: string | null;
  mimeType?: string | null;
  size?: number | null;
  caption?: string | null;
  stamp?: { label?: string | null; stampedAt?: string | null; stampedBy?: string | null } | null;
}

export async function getDocuments(mrn: string): Promise<DocumentsProfile> {
  const r = await fetch(`${API_BASE}/patients/${encodeURIComponent(mrn)}/documents`);
  if (!r.ok) throw await r.json().catch(() => ({ error: "get documents failed" }));
  return r.json();
}

export async function initDocuments(mrn: string): Promise<{ message: "created" | "exists"; documents: DocumentsProfile }> {
  const r = await fetch(`${API_BASE}/patients/${encodeURIComponent(mrn)}/documents/init`, { method: "POST" });
  if (!r.ok) throw await r.json().catch(() => ({ error: "init docs failed" }));
  return r.json();
}

export async function attachDocument(
  mrn: string,
  body: {
    category: DocumentsCategory;
    key: S3Key;
    uploadedBy?: string;
    caption?: string;
    mimeType?: string;
    size?: number;
    stamp?: { label?: string; stampedAt?: string; stampedBy?: string };
    replaceOldest?: boolean;
  }
): Promise<{ message: string; documents: DocumentsProfile }> {
  return requestWithStatus<{ message: string; documents: DocumentsProfile }>(
    `${API_BASE}/patients/${encodeURIComponent(mrn)}/documents/attach`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
}

export async function detachDocument(
  mrn: string,
  body: { category: DocumentsCategory; key: S3Key }
): Promise<{ message: string; documents: DocumentsProfile }> {
  const r = await fetch(`${API_BASE}/patients/${encodeURIComponent(mrn)}/documents/detach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw await r.json().catch(() => ({ error: "detach failed" }));
  return r.json();
}

export async function attachNoteFile(mrn: string, noteId: string, key: S3Key) {
  const r = await fetch(`${API_BASE}/patients/${encodeURIComponent(mrn)}/notes/${encodeURIComponent(noteId)}/files/attach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!r.ok) throw await r.json().catch(() => ({ error: "note attach failed" }));
  return r.json();
}
export async function detachNoteFile(mrn: string, noteId: string, key: S3Key) {
  const r = await fetch(`${API_BASE}/patients/${encodeURIComponent(mrn)}/notes/${encodeURIComponent(noteId)}/files/detach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!r.ok) throw await r.json().catch(() => ({ error: "note detach failed" }));
  return r.json();
}

export async function attachMedFile(mrn: string, medId: string, key: S3Key) {
  const r = await fetch(`${API_BASE}/patients/${encodeURIComponent(mrn)}/meds/${encodeURIComponent(medId)}/files/attach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!r.ok) throw await r.json().catch(() => ({ error: "med attach failed" }));
  return r.json();
}
export async function detachMedFile(mrn: string, medId: string, key: S3Key) {
  const r = await fetch(`${API_BASE}/patients/${encodeURIComponent(mrn)}/meds/${encodeURIComponent(medId)}/files/detach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!r.ok) throw await r.json().catch(() => ({ error: "med detach failed" }));
  return r.json();
}

export async function attachTaskFile(mrn: string, taskId: string, key: S3Key) {
  const r = await fetch(`${API_BASE}/patients/${encodeURIComponent(mrn)}/tasks/${encodeURIComponent(taskId)}/files/attach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!r.ok) throw await r.json().catch(() => ({ error: "task attach failed" }));
  return r.json();
}
export async function detachTaskFile(mrn: string, taskId: string, key: S3Key) {
  const r = await fetch(`${API_BASE}/patients/${encodeURIComponent(mrn)}/tasks/${encodeURIComponent(taskId)}/files/detach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!r.ok) throw await r.json().catch(() => ({ error: "task detach failed" }));
  return r.json();
}
