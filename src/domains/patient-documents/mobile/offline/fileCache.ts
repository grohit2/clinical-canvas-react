import { File, Directory, Paths } from 'expo-file-system';
import { sanitizeFileName } from '../../core/utils';

export type CachedVariant = 'full' | 'thumb';

const DOC_CACHE_DIR = new Directory(Paths.document, 'patient-docs');

// ------------------------------------------------------------------------------
// Path helpers
// ------------------------------------------------------------------------------

export function getPatientCacheDirectory(patientId: string): string {
  return new Directory(DOC_CACHE_DIR, patientId).uri;
}

export function ensurePatientCacheDirectory(patientId: string): string {
  const dir = new Directory(DOC_CACHE_DIR, patientId);
  dir.create({ idempotent: true, intermediates: true });
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
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------------------
// Copy local file into cache
// ------------------------------------------------------------------------------

export async function copyIntoCache(args: {
  fromUri: string;
  patientId: string;
  docId: string;
  name: string;
  variant: CachedVariant;
}): Promise<string> {
  ensurePatientCacheDirectory(args.patientId);
  const target = getDocLocalPath(args);

  const source = new File(args.fromUri);
  if (!source.exists) {
    throw new Error(`Source file does not exist: ${args.fromUri}`);
  }

  source.copy(new File(target));
  return target;
}

// ------------------------------------------------------------------------------
// Download remote file into cache
// ------------------------------------------------------------------------------

/**
 * Downloads a remote URL into the local document cache.
 *
 * Returns the local URI on success.
 * Throws a descriptive error on failure (network, expired URL, empty file, etc.).
 */
export async function ensureDownloaded(args: {
  patientId: string;
  docId: string;
  name: string;
  remoteUrl: string;
  variant: CachedVariant;
}): Promise<string> {
  ensurePatientCacheDirectory(args.patientId);
  const target = getDocLocalPath(args);

  // Already cached - skip download.
  const existing = new File(target);
  if (existing.exists && existing.size > 0) {
    return target;
  }

  // Use a unique temp directory per download to avoid filename collisions
  // when File.downloadFileAsync names the output based on the server response.
  const uniqueTmpName = `dl-${args.docId}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  const tempDir = new Directory(Paths.cache, uniqueTmpName);
  tempDir.create({ idempotent: true, intermediates: true });

  try {
    const downloaded = await File.downloadFileAsync(args.remoteUrl, tempDir);

    // Validate the downloaded file exists and has content.
    if (!downloaded.exists) {
      throw new Error(
        `Download produced no file for ${args.name} (URL may have returned an error page)`
      );
    }

    if (downloaded.size === 0) {
      downloaded.delete();
      throw new Error(
        `Download produced a 0-byte file for ${args.name} (URL may be expired or access denied)`
      );
    }

    // Move from temp into cache.
    downloaded.move(new File(target));

    // Final sanity check after move.
    const final = new File(target);
    if (!final.exists) {
      throw new Error(`File move failed: target ${target} does not exist after move`);
    }

    return target;
  } catch (error) {
    // Clean up partial/corrupt downloads.
    try {
      const targetFile = new File(target);
      if (targetFile.exists && targetFile.size === 0) {
        targetFile.delete();
      }
    } catch {
      // Cleanup is best-effort.
    }

    // Re-throw with context so callers can log meaningful errors.
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Download failed for ${args.name}: ${String(error)}`);
  } finally {
    // Always clean up the unique temp directory.
    try {
      if (tempDir.exists) {
        tempDir.delete();
      }
    } catch {
      // Best-effort cleanup.
    }
  }
}

// ------------------------------------------------------------------------------
// Batch prefetch with concurrency + progress
// ------------------------------------------------------------------------------

export interface PrefetchProgress {
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  /** Name of the item currently being processed (for UI display). */
  currentName?: string;
}

export type OnPrefetchProgress = (progress: PrefetchProgress) => void;

/**
 * Downloads multiple files concurrently, reporting progress via a callback.
 *
 * @param items  - Array of download descriptors.
 * @param onProgress - Optional callback fired after each item completes.
 * @param concurrency - Number of parallel downloads (default 3).
 * @returns Summary of results plus per-item error details.
 */
export async function prefetchMany(
  items: Array<{
    patientId: string;
    docId: string;
    name: string;
    remoteUrl: string;
    variant: CachedVariant;
  }>,
  onProgress?: OnPrefetchProgress,
  concurrency = 3
): Promise<{
  succeeded: number;
  failed: number;
  errors: Array<{ docId: string; name: string; error: string }>;
}> {
  if (!items.length) return { succeeded: 0, failed: 0, errors: [] };

  let index = 0;
  let succeeded = 0;
  let failed = 0;
  const errors: Array<{ docId: string; name: string; error: string }> = [];

  const report = (currentName?: string) => {
    onProgress?.({
      total: items.length,
      completed: succeeded + failed,
      succeeded,
      failed,
      currentName,
    });
  };

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      const item = items[currentIndex];

      report(item.name);

      try {
        await ensureDownloaded(item);
        succeeded += 1;
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ docId: item.docId, name: item.name, error: message });
        console.warn(`[fileCache] prefetch failed for ${item.name}:`, message);
      }

      report();
    }
  });

  await Promise.all(workers);
  return { succeeded, failed, errors };
}

// ------------------------------------------------------------------------------
// Cleanup
// ------------------------------------------------------------------------------

export async function removeCachedFile(uri?: string): Promise<void> {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch (error) {
    console.warn('[fileCache] removeCachedFile failed:', uri, error);
  }
}
