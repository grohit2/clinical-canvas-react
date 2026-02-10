/**
 * Storage interface that can be implemented for web (localStorage) or mobile (MMKV/AsyncStorage)
 */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PinnedPatient {
  id: string;
  pinnedAt: string;
}
