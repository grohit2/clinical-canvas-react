import { File, Directory, Paths } from 'expo-file-system';
import { sanitizeFileName } from '../../core/utils';

export type CachedVariant = 'full' | 'thumb';

const DOC_CACHE_DIR = new Directory(Paths.document, 'patient-docs');

export function getPatientCacheDirectory(patientId: string): string {
  return new Directory(DOC_CACHE_DIR, patientId).uri;
}

export async function ensurePatientCacheDirectory(patientId: string): Promise<string> {
  const dir = new Directory(DOC_CACHE_DIR, patientId);
  dir.create();
  return dir.uri;
}

export function getDocLocalPath(args: {
  patientId: string;
  docId: string;
  name: string;
  variant: CachedVariant;
}): string {
  const safe = sanitizeFileName(args.name || 'file');
  const filename = `${args.docId}__${args.variant}__${safe}`;
  return new File(new Directory(DOC_CACHE_DIR, args.patientId), filename).uri;
}

export function fileExists(uri: string): boolean {
  return new File(uri).exists;
}

export async function getLocalUriIfExists(uri: string): Promise<string | null> {
  return new File(uri).exists ? uri : null;
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
  new File(args.fromUri).copy(new File(target));
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

  if (new File(target).exists) {
    return target;
  }

  const tempDir = new Directory(Paths.cache, 'doc-download-tmp');
  tempDir.create();
  const downloaded = await File.downloadFileAsync(args.remoteUrl, tempDir);
  downloaded.move(new File(target));
  return target;
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
  const file = new File(uri);
  if (!file.exists) return;
  file.delete();
}
