import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StorageAdapter } from '@clinical-canvas/core';
import {
  debugBreadcrumb,
  debugBreadcrumbError,
} from '@patient-documents/mobile/debug/breadcrumbs';

type MmkvLike = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
};

export type PinnedStorageBackend = 'mmkv' | 'memory' | 'async';

const memoryFallback = new Map<string, string>();
const asyncShadow = new Map<string, string>();
const asyncHydratedKeys = new Set<string>();

function resolvePinnedStorageBackend(): PinnedStorageBackend {
  const raw = (process.env.EXPO_PUBLIC_PINNED_STORAGE_BACKEND || '').trim().toLowerCase();
  if (raw === 'memory' || raw === 'async' || raw === 'mmkv') {
    return raw;
  }
  return 'mmkv';
}

const pinnedStorageBackend = resolvePinnedStorageBackend();

function createMmkvStorage(): MmkvLike | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MMKV } = require('react-native-mmkv') as {
      MMKV: new (config?: { id?: string }) => MmkvLike;
    };

    return new MMKV({ id: 'clinical-canvas-storage' });
  } catch (error) {
    // Expo Go does not include react-native-mmkv; use fallback backend.
    debugBreadcrumbError('pinned_storage.mmkv_unavailable', error);
    return null;
  }
}

const mmkvStorage = pinnedStorageBackend === 'mmkv' ? createMmkvStorage() : null;

if (pinnedStorageBackend === 'mmkv' && !mmkvStorage) {
  debugBreadcrumb('pinned_storage.backend_fallback', {
    requested: 'mmkv',
    resolved: 'memory',
  });
}

function getItemFromMmkv(key: string): string | null {
  if (!mmkvStorage) {
    return memoryFallback.get(key) ?? null;
  }

  try {
    const value = mmkvStorage.getString(key) ?? null;
    if (value === null) {
      memoryFallback.delete(key);
      return null;
    }

    memoryFallback.set(key, value);
    return value;
  } catch (error) {
    debugBreadcrumbError('pinned_storage.mmkv_get_failed', error, { key });
    return memoryFallback.get(key) ?? null;
  }
}

function setItemToMmkv(key: string, value: string): void {
  memoryFallback.set(key, value);

  if (!mmkvStorage) return;

  try {
    mmkvStorage.set(key, value);
  } catch (error) {
    debugBreadcrumbError('pinned_storage.mmkv_set_failed', error, { key });
  }
}

function removeItemFromMmkv(key: string): void {
  memoryFallback.delete(key);

  if (!mmkvStorage) return;

  try {
    mmkvStorage.delete(key);
  } catch (error) {
    debugBreadcrumbError('pinned_storage.mmkv_remove_failed', error, { key });
  }
}

function getItemFromAsyncShadow(key: string): string | null {
  if (asyncShadow.has(key)) {
    return asyncShadow.get(key) ?? null;
  }

  return memoryFallback.get(key) ?? null;
}

function setItemToAsyncShadow(key: string, value: string): void {
  asyncShadow.set(key, value);
  memoryFallback.set(key, value);

  void AsyncStorage.setItem(key, value).catch((error) => {
    debugBreadcrumbError('pinned_storage.async_set_failed', error, { key });
  });
}

function removeItemFromAsyncShadow(key: string): void {
  asyncShadow.delete(key);
  memoryFallback.delete(key);

  void AsyncStorage.removeItem(key).catch((error) => {
    debugBreadcrumbError('pinned_storage.async_remove_failed', error, { key });
  });
}

// StorageAdapter implementation with runtime backend selection.
export const mmkvStorageAdapter: StorageAdapter = {
  getItem: (key: string) => {
    if (pinnedStorageBackend === 'async') {
      return getItemFromAsyncShadow(key);
    }

    if (pinnedStorageBackend === 'memory') {
      return memoryFallback.get(key) ?? null;
    }

    return getItemFromMmkv(key);
  },
  setItem: (key: string, value: string) => {
    if (pinnedStorageBackend === 'async') {
      setItemToAsyncShadow(key, value);
      return;
    }

    if (pinnedStorageBackend === 'memory') {
      memoryFallback.set(key, value);
      return;
    }

    setItemToMmkv(key, value);
  },
  removeItem: (key: string) => {
    if (pinnedStorageBackend === 'async') {
      removeItemFromAsyncShadow(key);
      return;
    }

    if (pinnedStorageBackend === 'memory') {
      memoryFallback.delete(key);
      return;
    }

    removeItemFromMmkv(key);
  },
};

export function getPinnedStorageBackend(): PinnedStorageBackend {
  if (pinnedStorageBackend === 'mmkv' && !mmkvStorage) {
    return 'memory';
  }
  return pinnedStorageBackend;
}

export async function hydratePinnedStorageKey(key: string): Promise<void> {
  if (getPinnedStorageBackend() !== 'async') return;
  if (asyncHydratedKeys.has(key)) return;

  try {
    const value = await AsyncStorage.getItem(key);
    if (value === null) {
      asyncShadow.delete(key);
      memoryFallback.delete(key);
    } else {
      asyncShadow.set(key, value);
      memoryFallback.set(key, value);
    }

    debugBreadcrumb('pinned_storage.async_hydrated', {
      key,
      hasValue: value !== null,
      size: value?.length ?? 0,
    });
  } catch (error) {
    debugBreadcrumbError('pinned_storage.async_hydrate_failed', error, { key });
  } finally {
    asyncHydratedKeys.add(key);
  }
}

// Export raw MMKV if selected and available (null otherwise).
export const mmkv = mmkvStorage;
