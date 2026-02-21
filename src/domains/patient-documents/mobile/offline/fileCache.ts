import { File, Directory, Paths } from 'expo-file-system';
import { sanitizeFileName } from '../../core/utils';

export type CachedVariant = 'full' | 'thumb';

const DOC_CACHE_DIR = new Directory(Paths.document, 'patient-docs');

function toSafeDocKey(docId: string): string {
  const normalized = sanitizeFileName(docId || 'doc').slice(0, 48) || 'doc';
  let hash = 0;
  for (let i = 0; i < docId.length; i += 1) {
    hash = (hash * 31 + docId.charCodeAt(i)) >>> 0;
  }
  return `${normalized}_${hash.toString(16)}`;
}

// ------------------------------------------------------------------------------
// Path helpers
// ------------------------------------------------------------------------------

export function getPatientCacheDirectory(patientId: string): string {
  return new Directory(DOC_CACHE_DIR, patientId).uri;
}

function ensureDocCacheRootDirectory(): string {
  try {
    DOC_CACHE_DIR.create({ idempotent: true, intermediates: true });
    return DOC_CACHE_DIR.uri;
  } catch (error) {
    // If a file somehow exists at the cache root path, remove it and recreate as a directory.
    try {
      const rootFile = new File(Paths.document, 'patient-docs');
      if (rootFile.exists) {
        rootFile.delete();
        DOC_CACHE_DIR.create({ idempotent: true, intermediates: true });
        return DOC_CACHE_DIR.uri;
      }
    } catch {
      // Ignore fallback errors and throw the original context below.
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not create document cache root: ${message}`);
  }
}

export function ensurePatientCacheDirectory(patientId: string): string {
  ensureDocCacheRootDirectory();
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
  const safeDoc = toSafeDocKey(args.docId);
  const safeName = sanitizeFileName(args.name || 'file').slice(0, 80) || 'file';
  const filename = `${safeDoc}__${args.variant}__${safeName}`;
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
  const targetFile = new File(target);

  // Already cached - skip download.
  if (targetFile.exists && targetFile.size > 0) {
    return target;
  }

  // Remove any stale empty file before writing the new download.
  if (targetFile.exists && targetFile.size === 0) {
    try {
      targetFile.delete();
    } catch {
      // Best-effort cleanup.
    }
  }

  try {
    // Download directly to the final target file path to avoid move/path issues.
    let downloaded: File;
    try {
      downloaded = await File.downloadFileAsync(args.remoteUrl, targetFile, {
        idempotent: true,
      });
    } catch (firstError) {
      const firstMessage = firstError instanceof Error ? firstError.message : String(firstError);
      if (!/destination path does not exist/i.test(firstMessage)) {
        throw firstError;
      }

      // Android occasionally reports missing destination path during concurrent
      // writes; recreate the cache path and retry once.
      ensurePatientCacheDirectory(args.patientId);
      try {
        targetFile.create({ overwrite: true, intermediates: true });
      } catch {
        // Best-effort bootstrap before retry.
      }

      downloaded = await File.downloadFileAsync(args.remoteUrl, targetFile, {
        idempotent: true,
      });
    }

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

    // Final sanity check.
    const final = new File(target);
    if (!final.exists || final.size === 0) {
      throw new Error(`File placement failed: target ${target} missing or empty after download`);
    }

    return target;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    let remoteHost = 'unknown';
    try {
      remoteHost = new URL(args.remoteUrl).host;
    } catch {
      // Ignore URL parsing errors in diagnostics.
    }

    console.warn('[fileCache] ensureDownloaded failed', {
      docId: args.docId,
      name: args.name,
      target,
      remoteHost,
      error: errorMessage,
    });

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
      if (error.message.startsWith('Download produced') || error.message.startsWith('File placement failed')) {
        throw error;
      }
      throw new Error(`Download failed for ${args.name}: ${error.message}`);
    }
    throw new Error(`Download failed for ${args.name}: ${String(error)}`);
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
