import type { StorageAdapter } from '@clinical-canvas/core';

type MmkvLike = {
  getString: (key: string) => string | undefined;
  set: (key: string, value: string) => void;
  delete: (key: string) => void;
};

const memoryFallback = new Map<string, string>();

function createStorage(): MmkvLike | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MMKV } = require('react-native-mmkv') as {
      MMKV: new (config?: { id?: string }) => MmkvLike;
    };
    return new MMKV({ id: 'clinical-canvas-storage' });
  } catch {
    // Expo Go does not include react-native-mmkv; use in-memory fallback for dev runtime.
    return null;
  }
}

const storage = createStorage();

// StorageAdapter implementation with MMKV when available, fallback for Expo Go.
export const mmkvStorageAdapter: StorageAdapter = {
  getItem: (key: string) => {
    if (storage) return storage.getString(key) ?? null;
    return memoryFallback.get(key) ?? null;
  },
  setItem: (key: string, value: string) => {
    if (storage) {
      storage.set(key, value);
      return;
    }
    memoryFallback.set(key, value);
  },
  removeItem: (key: string) => {
    if (storage) {
      storage.delete(key);
      return;
    }
    memoryFallback.delete(key);
  },
};

// Export raw MMKV if available (null in Expo Go).
export const mmkv = storage;
