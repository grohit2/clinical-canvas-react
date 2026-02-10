import type { StorageAdapter, PinnedPatient } from './types';

const PINNED_PATIENTS_KEY = 'pinnedPatients';

export function createPinnedPatientsStore(storage: StorageAdapter) {
  function getPinnedPatients(): PinnedPatient[] {
    try {
      const stored = storage.getItem(PINNED_PATIENTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  function isPinned(patientId: string): boolean {
    const pinned = getPinnedPatients();
    return pinned.some((p) => p.id === patientId);
  }

  function pinPatient(patientId: string): void {
    const pinned = getPinnedPatients();
    if (!pinned.some((p) => p.id === patientId)) {
      pinned.push({
        id: patientId,
        pinnedAt: new Date().toISOString().slice(0, 10),
      });
      storage.setItem(PINNED_PATIENTS_KEY, JSON.stringify(pinned));
    }
  }

  function unpinPatient(patientId: string): void {
    const pinned = getPinnedPatients();
    const filtered = pinned.filter((p) => p.id !== patientId);
    storage.setItem(PINNED_PATIENTS_KEY, JSON.stringify(filtered));
  }

  function togglePin(patientId: string): boolean {
    if (isPinned(patientId)) {
      unpinPatient(patientId);
      return false;
    } else {
      pinPatient(patientId);
      return true;
    }
  }

  return {
    getPinnedPatients,
    isPinned,
    pinPatient,
    unpinPatient,
    togglePin,
  };
}
