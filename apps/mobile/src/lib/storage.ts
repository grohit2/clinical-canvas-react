import { MMKV } from 'react-native-mmkv';
import type { StorageAdapter } from '@clinical-canvas/core';

// Create MMKV instance
const storage = new MMKV({
  id: 'clinical-canvas-storage',
});

// StorageAdapter implementation for MMKV
export const mmkvStorageAdapter: StorageAdapter = {
  getItem: (key: string) => {
    return storage.getString(key) ?? null;
  },
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
};

// Export raw MMKV for direct access if needed
export { storage as mmkv };
