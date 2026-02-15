import { ulid } from './ids';

const DEVICE_ID_KEY = 'device_id';
const ACTIVE_ACTOR_ID_KEY = 'active_actor_id';

function readLocalStorage(key: string): string | null {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(key);
}

function writeLocalStorage(key: string, value: string): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }
  window.localStorage.setItem(key, value);
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
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }

  if (!actorId) {
    window.localStorage.removeItem(ACTIVE_ACTOR_ID_KEY);
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
