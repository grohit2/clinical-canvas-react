export function filenameFromKey(key?: string): string {
  if (!key) return 'file';
  const parts = key.split('/');
  return parts[parts.length - 1] || 'file';
}

function extensionFromName(name?: string): string {
  if (!name) return '';
  const clean = name.split('?')[0]?.split('#')[0] || '';
  const ext = clean.split('.').pop();
  return ext ? ext.toLowerCase() : '';
}

const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'svg',
  'heic',
  'heif',
  'tif',
  'tiff',
  'avif',
]);

const VIDEO_EXTENSIONS = new Set([
  'mp4',
  'mov',
  'm4v',
  'webm',
  'avi',
  'mkv',
  '3gp',
  'mpeg',
  'mpg',
]);

export function isImageByMimeOrExt(mime?: string, name?: string): boolean {
  if (mime?.toLowerCase().startsWith('image/')) return true;
  return IMAGE_EXTENSIONS.has(extensionFromName(name));
}

export function isVideoByMimeOrExt(mime?: string, name?: string): boolean {
  if (mime?.toLowerCase().startsWith('video/')) return true;
  return VIDEO_EXTENSIONS.has(extensionFromName(name));
}

export type DocumentKind =
  | 'image'
  | 'video'
  | 'pdf'
  | 'word'
  | 'spreadsheet'
  | 'presentation'
  | 'dicom'
  | 'text'
  | 'document'
  | 'other';

export function getDocumentKind(mime?: string, name?: string): DocumentKind {
  const normalizedMime = mime?.toLowerCase();
  const ext = extensionFromName(name);

  if (isImageByMimeOrExt(normalizedMime, name)) return 'image';
  if (isVideoByMimeOrExt(normalizedMime, name)) return 'video';

  if (normalizedMime === 'application/pdf' || ext === 'pdf') return 'pdf';

  if (
    normalizedMime === 'application/msword' ||
    normalizedMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    normalizedMime === 'application/vnd.oasis.opendocument.text' ||
    ext === 'doc' ||
    ext === 'docx' ||
    ext === 'odt'
  ) {
    return 'word';
  }

  if (
    normalizedMime === 'application/vnd.ms-excel' ||
    normalizedMime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    normalizedMime === 'application/vnd.oasis.opendocument.spreadsheet' ||
    normalizedMime === 'text/csv' ||
    ext === 'xls' ||
    ext === 'xlsx' ||
    ext === 'ods' ||
    ext === 'csv'
  ) {
    return 'spreadsheet';
  }

  if (
    normalizedMime === 'application/vnd.ms-powerpoint' ||
    normalizedMime ===
      'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    normalizedMime === 'application/vnd.oasis.opendocument.presentation' ||
    ext === 'ppt' ||
    ext === 'pptx' ||
    ext === 'odp'
  ) {
    return 'presentation';
  }

  if (
    normalizedMime === 'application/dicom' ||
    normalizedMime === 'application/dicom+json' ||
    ext === 'dcm' ||
    ext === 'dicom'
  ) {
    return 'dicom';
  }

  if (
    normalizedMime === 'text/plain' ||
    normalizedMime === 'text/rtf' ||
    normalizedMime === 'application/rtf' ||
    ext === 'txt' ||
    ext === 'rtf'
  ) {
    return 'text';
  }

  if (
    normalizedMime?.startsWith('application/') ||
    normalizedMime?.startsWith('text/') ||
    normalizedMime === 'message/rfc822'
  ) {
    return 'document';
  }

  return normalizedMime ? 'other' : 'document';
}

export function inferMimeType(fileName: string, fallback?: string): string {
  const normalizedFallback = fallback?.trim().toLowerCase();
  if (
    normalizedFallback &&
    normalizedFallback !== 'application/octet-stream' &&
    normalizedFallback !== 'binary/octet-stream'
  ) {
    return fallback as string;
  }

  const ext = extensionFromName(fileName);

  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'heif') return 'image/heif';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'bmp') return 'image/bmp';
  if (ext === 'svg') return 'image/svg+xml';
  if (ext === 'tif' || ext === 'tiff') return 'image/tiff';
  if (ext === 'avif') return 'image/avif';

  if (ext === 'mp4' || ext === 'm4v') return 'video/mp4';
  if (ext === 'mov') return 'video/quicktime';
  if (ext === 'webm') return 'video/webm';
  if (ext === 'avi') return 'video/x-msvideo';
  if (ext === 'mkv') return 'video/x-matroska';
  if (ext === '3gp') return 'video/3gpp';
  if (ext === 'mpg' || ext === 'mpeg') return 'video/mpeg';

  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'doc') return 'application/msword';
  if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (ext === 'odt') return 'application/vnd.oasis.opendocument.text';
  if (ext === 'xls') return 'application/vnd.ms-excel';
  if (ext === 'xlsx') {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  if (ext === 'ods') return 'application/vnd.oasis.opendocument.spreadsheet';
  if (ext === 'ppt') return 'application/vnd.ms-powerpoint';
  if (ext === 'pptx') {
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  }
  if (ext === 'odp') return 'application/vnd.oasis.opendocument.presentation';
  if (ext === 'csv') return 'text/csv';
  if (ext === 'txt') return 'text/plain';
  if (ext === 'rtf') return 'application/rtf';
  if (ext === 'xml') return 'application/xml';
  if (ext === 'json') return 'application/json';
  if (ext === 'zip') return 'application/zip';
  if (ext === 'dcm' || ext === 'dicom') return 'application/dicom';

  return 'application/octet-stream';
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
