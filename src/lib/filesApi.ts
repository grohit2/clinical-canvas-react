// src/lib/filesApi.ts
const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export type HttpError = Error & { status?: number; body?: unknown };

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

export async function presignUpload(uid: string, body: PresignUploadRequest): Promise<PresignUploadResponse> {
  return requestWithStatus<PresignUploadResponse>(
    `${API_BASE}/patients/${encodeURIComponent(uid)}/files/presign-upload`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
}

export interface FilesListItem {
  key: S3Key;
  size?: number | null;
  etag?: string | null;
  lastModified?: string | null;
  uid?: string | null;
  target?: string | null;
  kind?: string | null;
  docType?: string | null;
  refId?: string | null;
  filename?: string | null;
  url?: string | null;
  cdnUrl?: string | null;
  expiresIn?: number | null;
}
export interface FilesListResponse {
  prefix: string;
  items: FilesListItem[];
  nextCursor?: string | null;
  total?: number | null;
}

export async function listFiles(
  uid: string,
  opts: {
    scope?: FilesScope;
    kind?: FilesKind;
    docType?: DocType;
    refId?: string;
    limit?: number;
    cursor?: string;
    presign?: boolean;
  } = {}
): Promise<FilesListResponse> {
  const q = new URLSearchParams();
  const { scope, kind, docType, refId, limit, cursor, presign } = opts;
  if (scope) q.set("scope", scope);
  if (kind) q.set("kind", kind);
  if (docType) q.set("docType", docType);
  if (refId) q.set("refId", refId);
  if (limit) q.set("limit", String(limit));
  if (cursor) q.set("cursor", cursor);
  if (presign) q.set("presign", "1");
  const r = await fetch(`${API_BASE}/patients/${encodeURIComponent(uid)}/files?${q.toString()}`);
  if (!r.ok) throw await r.json().catch(() => ({ error: "list failed" }));
  return r.json();
}

export interface PresignDownloadResponse {
  url: string;
  method: "GET";
  key: S3Key;
  expiresIn: number;
}
export async function presignDownload(uid: string, key: S3Key): Promise<PresignDownloadResponse> {
  const r = await fetch(`${API_BASE}/patients/${encodeURIComponent(uid)}/files/presign-download`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!r.ok) throw await r.json().catch(() => ({ error: "download presign failed" }));
  return r.json();
}

export async function deleteFiles(
  uid: string,
  keys: S3Key[],
  opts: { invalidate?: boolean; includeSiblings?: boolean } = { invalidate: true, includeSiblings: true }
): Promise<{ ok: boolean; deleted: number; invalidationId?: string | null; warning?: string }>
{
  return requestWithStatus(
    `${API_BASE}/patients/${encodeURIComponent(uid)}/files/delete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keys, invalidate: opts.invalidate !== false, includeSiblings: opts.includeSiblings !== false }),
    }
  );
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
  uid: string;
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
  cdnUrl?: string | null;
  stamp?: { label?: string | null; stampedAt?: string | null; stampedBy?: string | null } | null;
}

export async function getDocuments(uid: string): Promise<DocumentsProfile> {
  const r = await fetch(`${API_BASE}/patients/${encodeURIComponent(uid)}/documents`);
  if (!r.ok) throw await r.json().catch(() => ({ error: "get documents failed" }));
  return r.json();
}

export async function initDocuments(uid: string): Promise<{ message: "created" | "exists"; documents: DocumentsProfile }> {
  const r = await fetch(`${API_BASE}/patients/${encodeURIComponent(uid)}/documents/init`, { method: "POST" });
  if (!r.ok) throw await r.json().catch(() => ({ error: "init docs failed" }));
  return r.json();
}

export async function attachDocument(
  uid: string,
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
    `${API_BASE}/patients/${encodeURIComponent(uid)}/documents/attach`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
}

export async function detachDocument(
  uid: string,
  body: { category: DocumentsCategory; key: S3Key }
): Promise<{ message: string; documents: DocumentsProfile }> {
  const r = await fetch(`${API_BASE}/patients/${encodeURIComponent(uid)}/documents/detach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw await r.json().catch(() => ({ error: "detach failed" }));
  return r.json();
}

export async function attachNoteFile(uid: string, noteId: string, key: S3Key) {
  const r = await fetch(`${API_BASE}/patients/${encodeURIComponent(uid)}/notes/${encodeURIComponent(noteId)}/files/attach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!r.ok) throw await r.json().catch(() => ({ error: "note attach failed" }));
  return r.json();
}
export async function detachNoteFile(uid: string, noteId: string, key: S3Key) {
  const r = await fetch(`${API_BASE}/patients/${encodeURIComponent(uid)}/notes/${encodeURIComponent(noteId)}/files/detach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!r.ok) throw await r.json().catch(() => ({ error: "note detach failed" }));
  return r.json();
}

export async function attachMedFile(uid: string, medId: string, key: S3Key) {
  const r = await fetch(`${API_BASE}/patients/${encodeURIComponent(uid)}/meds/${encodeURIComponent(medId)}/files/attach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!r.ok) throw await r.json().catch(() => ({ error: "med attach failed" }));
  return r.json();
}
export async function detachMedFile(uid: string, medId: string, key: S3Key) {
  const r = await fetch(`${API_BASE}/patients/${encodeURIComponent(uid)}/meds/${encodeURIComponent(medId)}/files/detach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!r.ok) throw await r.json().catch(() => ({ error: "med detach failed" }));
  return r.json();
}

export async function attachTaskFile(uid: string, taskId: string, key: S3Key) {
  const r = await fetch(`${API_BASE}/patients/${encodeURIComponent(uid)}/tasks/${encodeURIComponent(taskId)}/files/attach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!r.ok) throw await r.json().catch(() => ({ error: "task attach failed" }));
  return r.json();
}
export async function detachTaskFile(uid: string, taskId: string, key: S3Key) {
  const r = await fetch(`${API_BASE}/patients/${encodeURIComponent(uid)}/tasks/${encodeURIComponent(taskId)}/files/detach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  if (!r.ok) throw await r.json().catch(() => ({ error: "task detach failed" }));
  return r.json();
}
