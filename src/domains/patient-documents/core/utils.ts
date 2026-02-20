export function filenameFromKey(key?: string): string {
  if (!key) return 'file';
  const parts = key.split('/');
  return parts[parts.length - 1] || 'file';
}

export function isImageByMimeOrExt(mime?: string, name?: string): boolean {
  if (mime?.startsWith('image/')) return true;
  const ext = name?.split('.').pop()?.toLowerCase() ?? '';
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic', 'heif'].includes(ext);
}

export function inferMimeType(fileName: string, fallback?: string): string {
  if (fallback) return fallback;

  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'heif') return 'image/heif';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'bmp') return 'image/bmp';
  return 'image/jpeg';
}

export function inferFileName(uri: string): string {
  const parts = uri.split('/');
  return parts[parts.length - 1] || `file-${Date.now()}`;
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

export function normalizeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

export function formatUpdatedAt(value?: string): string {
  if (!value) return 'No uploads yet';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No uploads yet';

  return `Updated ${date.toLocaleDateString()}`;
}
