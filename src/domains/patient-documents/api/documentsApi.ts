import { categoryToDocType, type DocType } from '../core/categories';
import type { DocCategory } from '../core/types';
import type { ApiDocumentsProfile } from '../core/mapFromApi';

export type HttpError = Error & { status?: number; body?: unknown };

export interface PresignUploadRequest {
  filename: string;
  mimeType: string;
  category: DocCategory;
  target?: 'optimized' | 'originals' | 'thumb';
  kind?: 'doc';
  quality?: number;
  maxW?: number;
  needsOptimization?: boolean;
  label?: string;
}

export interface PresignUploadResponse {
  key: string;
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
  contentType: string;
  expiresIn: number;
  hints?: {
    optimizedKey: string;
    originalKey: string;
    thumbKey: string;
  };
}

export interface PresignDownloadResponse {
  url: string;
  method: 'GET';
  key: string;
  expiresIn: number;
}

export interface AttachDocumentRequest {
  category: DocCategory;
  key: string;
  uploadedBy?: string;
  mimeType?: string;
  size?: number;
  caption?: string;
  replaceOldest?: boolean;
}

export interface DetachDocumentRequest {
  category: DocCategory;
  key: string;
}

export interface MoveDocumentRequest extends Omit<AttachDocumentRequest, 'category'> {
  fromCategory: DocCategory;
  toCategory: DocCategory;
}

export interface DeleteFilesOptions {
  invalidate?: boolean;
  includeSiblings?: boolean;
}

export interface DeleteFilesResponse {
  ok: boolean;
  deleted: number;
  invalidationId?: string | null;
  warning?: string;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

async function requestWithStatus<T>(baseUrl: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, init);
  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ error: response.statusText || 'request failed' }));

    const err: HttpError = Object.assign(
      new Error((body as { error?: string }).error || response.statusText),
      { status: response.status, body }
    );

    throw err;
  }

  return response.json();
}

export function createDocumentsApi(baseUrl: string) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  const getDocuments = (patientId: string): Promise<ApiDocumentsProfile> => {
    return requestWithStatus<ApiDocumentsProfile>(
      normalizedBaseUrl,
      `/patients/${encodeURIComponent(patientId)}/documents`
    );
  };

  const initDocuments = (patientId: string): Promise<{ message: 'created' | 'exists'; documents: ApiDocumentsProfile }> => {
    return requestWithStatus<{ message: 'created' | 'exists'; documents: ApiDocumentsProfile }>(
      normalizedBaseUrl,
      `/patients/${encodeURIComponent(patientId)}/documents/init`,
      { method: 'POST' }
    );
  };

  const presignUpload = (patientId: string, args: PresignUploadRequest): Promise<PresignUploadResponse> => {
    const docType: DocType = categoryToDocType(args.category);

    return requestWithStatus<PresignUploadResponse>(
      normalizedBaseUrl,
      `/patients/${encodeURIComponent(patientId)}/files/presign-upload`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: args.filename,
          mimeType: args.mimeType,
          target: args.target || 'optimized',
          kind: args.kind || 'doc',
          docType,
          quality: args.quality,
          maxW: args.maxW,
          needsOptimization: args.needsOptimization,
          label: args.label,
        }),
      }
    );
  };

  const presignDownload = (patientId: string, key: string): Promise<PresignDownloadResponse> => {
    return requestWithStatus<PresignDownloadResponse>(
      normalizedBaseUrl,
      `/patients/${encodeURIComponent(patientId)}/files/presign-download`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      }
    );
  };

  const attachDocument = (
    patientId: string,
    args: AttachDocumentRequest
  ): Promise<{ message: string; documents: ApiDocumentsProfile }> => {
    return requestWithStatus<{ message: string; documents: ApiDocumentsProfile }>(
      normalizedBaseUrl,
      `/patients/${encodeURIComponent(patientId)}/documents/attach`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      }
    );
  };

  const detachDocument = (
    patientId: string,
    args: DetachDocumentRequest
  ): Promise<{ message: string; documents: ApiDocumentsProfile }> => {
    return requestWithStatus<{ message: string; documents: ApiDocumentsProfile }>(
      normalizedBaseUrl,
      `/patients/${encodeURIComponent(patientId)}/documents/detach`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(args),
      }
    );
  };

  const deleteFiles = (
    patientId: string,
    keys: string[],
    opts: DeleteFilesOptions = { invalidate: true, includeSiblings: true }
  ): Promise<DeleteFilesResponse> => {
    return requestWithStatus<DeleteFilesResponse>(
      normalizedBaseUrl,
      `/patients/${encodeURIComponent(patientId)}/files/delete`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keys,
          invalidate: opts.invalidate !== false,
          includeSiblings: opts.includeSiblings !== false,
        }),
      }
    );
  };

  return {
    getDocuments,
    initDocuments,
    presignUpload,
    presignDownload,
    attachDocument,
    detachDocument,
    moveDocument(patientId: string, args: MoveDocumentRequest): Promise<{ message: string; documents: ApiDocumentsProfile }> {
      return requestWithStatus<{ message: string; documents: ApiDocumentsProfile }>(
        normalizedBaseUrl,
        `/patients/${encodeURIComponent(patientId)}/documents/move`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args),
        }
      );
    },
    deleteFiles,
  };
}

export type DocumentsApi = ReturnType<typeof createDocumentsApi>;
