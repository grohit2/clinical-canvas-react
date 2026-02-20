import * as FileSystem from 'expo-file-system/legacy';

export type CachedVariant = 'full' | 'thumb';

const DOC_CACHE_ROOT = `${FileSystem.documentDirectory || ''}patient-docs/`;

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

async function ensureDirectory(path: string): Promise<void> {
  await FileSystem.makeDirectoryAsync(path, { intermediates: true });
}

export function getPatientCacheDirectory(patientId: string): string {
  return `${DOC_CACHE_ROOT}${patientId}/`;
}

export async function ensurePatientCacheDirectory(patientId: string): Promise<string> {
  const dir = getPatientCacheDirectory(patientId);
  await ensureDirectory(dir);
  return dir;
}

export function getDocLocalPath(args: {
  patientId: string;
  docId: string;
  name: string;
  variant: CachedVariant;
}): string {
  const dir = getPatientCacheDirectory(args.patientId);
  const safe = sanitizeFileName(args.name || 'file');
  return `${dir}${args.docId}__${args.variant}__${safe}`;
}

export async function fileExists(uri: string): Promise<boolean> {
  const info = await FileSystem.getInfoAsync(uri);
  return !!info.exists;
}

export async function getLocalUriIfExists(uri: string): Promise<string | null> {
  const exists = await fileExists(uri);
  return exists ? uri : null;
}

export async function copyIntoCache(args: {
  fromUri: string;
  patientId: string;
  docId: string;
  name: string;
  variant: CachedVariant;
}): Promise<string> {
  await ensurePatientCacheDirectory(args.patientId);
  const target = getDocLocalPath(args);
  await FileSystem.copyAsync({ from: args.fromUri, to: target });
  return target;
}

export async function ensureDownloaded(args: {
  patientId: string;
  docId: string;
  name: string;
  remoteUrl: string;
  variant: CachedVariant;
}): Promise<string> {
  await ensurePatientCacheDirectory(args.patientId);
  const target = getDocLocalPath(args);

  if (await fileExists(target)) {
    return target;
  }

  const result = await FileSystem.downloadAsync(args.remoteUrl, target);
  return result.uri;
}

export async function prefetchMany(
  items: Array<{
    patientId: string;
    docId: string;
    name: string;
    remoteUrl: string;
    variant: CachedVariant;
  }>,
  concurrency = 2
): Promise<{ succeeded: number; failed: number }> {
  if (!items.length) return { succeeded: 0, failed: 0 };

  let index = 0;
  let succeeded = 0;
  let failed = 0;

  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;

      const item = items[currentIndex];
      try {
        await ensureDownloaded(item);
        succeeded += 1;
      } catch {
        failed += 1;
      }
    }
  });

  await Promise.all(workers);
  return { succeeded, failed };
}

export async function removeCachedFile(uri?: string): Promise<void> {
  if (!uri) return;
  const exists = await fileExists(uri);
  if (!exists) return;
  await FileSystem.deleteAsync(uri, { idempotent: true });
}
