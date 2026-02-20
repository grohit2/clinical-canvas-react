import { ulid } from './ids';

const DEVICE_ID_KEY = 'device_id';
const ACTIVE_ACTOR_ID_KEY = 'active_actor_id';
const memoryStorage = new Map<string, string>();

type StorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function getStorage(): StorageLike {
  const root = globalThis as unknown as { localStorage?: StorageLike };
  if (root.localStorage) {
    return root.localStorage;
  }

  if (typeof window !== 'undefined' && 'localStorage' in window && window.localStorage) {
    return window.localStorage as StorageLike;
  }

  return {
    getItem: (key: string) => memoryStorage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memoryStorage.set(key, value);
    },
    removeItem: (key: string) => {
      memoryStorage.delete(key);
    },
  };
}

function readLocalStorage(key: string): string | null {
  return getStorage().getItem(key);
}

function writeLocalStorage(key: string, value: string): void {
  getStorage().setItem(key, value);
}

export function getDeviceId(): string {
  const existing = readLocalStorage(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const created = `device_${ulid()}`;
  writeLocalStorage(DEVICE_ID_KEY, created);
  return created;
}

export function getActiveActorId(): string | null {
  return readLocalStorage(ACTIVE_ACTOR_ID_KEY);
}

export function setActiveActorId(actorId: string | null): void {
  const storage = getStorage();

  if (!actorId) {
    storage.removeItem(ACTIVE_ACTOR_ID_KEY);
    return;
  }

  writeLocalStorage(ACTIVE_ACTOR_ID_KEY, actorId);
}

export function getLocalDayFromIso(iso: string): string {
  const dt = new Date(iso);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getLocalDay(): string {
  return getLocalDayFromIso(new Date().toISOString());
}
