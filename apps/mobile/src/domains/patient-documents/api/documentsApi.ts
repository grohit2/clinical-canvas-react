import type { DocCategory } from '../core/types';
import { getApiBaseUrl } from '../../../lib/api';

export interface ApiDocEntry {
  key: string;
  uploadedAt: string;
  uploadedBy?: string | null;
  mimeType?: string | null;
  size?: number | null;
  caption?: string | null;
  cdnUrl?: string | null;
}

export interface ApiDocumentsProfile {
  uid: string;
  preopPics: ApiDocEntry[];
  labReports: ApiDocEntry[];
  radiology: ApiDocEntry[];
  intraopPics: ApiDocEntry[];
  otNotes: ApiDocEntry[];
  postopPics: ApiDocEntry[];
  dischargePics: ApiDocEntry[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PresignUploadResponse {
  key: string;
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
  contentType: string;
  expiresIn: number;
}

interface HttpError extends Error {
  status?: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, init);
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    const err = new Error((body as { error?: string }).error || response.statusText) as HttpError;
    err.status = response.status;
    throw err;
  }
  return response.json();
}

export function categoryToDocType(category: DocCategory): string {
  switch (category) {
    case 'preop_pics':
      return 'preop';
    case 'lab_reports':
      return 'lab';
    case 'radiology':
      return 'radiology';
    case 'intraop_pics':
      return 'intraop';
    case 'ot_notes':
      return 'otnotes';
    case 'postop_pics':
      return 'postop';
    case 'discharge_pics':
      return 'discharge';
  }
}

export async function getDocuments(patientId: string): Promise<ApiDocumentsProfile> {
  return request<ApiDocumentsProfile>(`/patients/${encodeURIComponent(patientId)}/documents`);
}

export async function initDocuments(patientId: string): Promise<{ message: string; documents: ApiDocumentsProfile }> {
  return request<{ message: string; documents: ApiDocumentsProfile }>(
    `/patients/${encodeURIComponent(patientId)}/documents/init`,
    { method: 'POST' }
  );
}

export async function presignUpload(patientId: string, args: {
  filename: string;
  mimeType: string;
  category: DocCategory;
}): Promise<PresignUploadResponse> {
  return request<PresignUploadResponse>(
    `/patients/${encodeURIComponent(patientId)}/files/presign-upload`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: args.filename,
        mimeType: args.mimeType,
        target: 'optimized',
        kind: 'doc',
        docType: categoryToDocType(args.category),
      }),
    }
  );
}

export async function attachDocument(patientId: string, args: {
  category: DocCategory;
  key: string;
  uploadedBy?: string;
  mimeType?: string;
  size?: number;
  caption?: string;
}): Promise<{ message: string; documents: ApiDocumentsProfile }> {
  return request<{ message: string; documents: ApiDocumentsProfile }>(
    `/patients/${encodeURIComponent(patientId)}/documents/attach`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    }
  );
}

export async function detachDocument(patientId: string, args: {
  category: DocCategory;
  key: string;
}): Promise<{ message: string; documents: ApiDocumentsProfile }> {
  return request<{ message: string; documents: ApiDocumentsProfile }>(
    `/patients/${encodeURIComponent(patientId)}/documents/detach`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    }
  );
}
