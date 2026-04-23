// Utility functions for managing pinned patients in local storage

const PINNED_PATIENTS_KEY = 'pinnedPatients';

export interface PinnedPatient {
  id: string;
  pinnedAt: string;
}

export function getPinnedPatients(): PinnedPatient[] {
  try {
    const stored = localStorage.getItem(PINNED_PATIENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function isPinned(patientId: string): boolean {
  const pinned = getPinnedPatients();
  return pinned.some(p => p.id === patientId);
}

export function pinPatient(patientId: string): void {
  const pinned = getPinnedPatients();
  if (!pinned.some(p => p.id === patientId)) {
    pinned.push({
      id: patientId,
      pinnedAt: new Date().toISOString().slice(0, 10)
    });
    localStorage.setItem(PINNED_PATIENTS_KEY, JSON.stringify(pinned));
  }
}

export function unpinPatient(patientId: string): void {
  const pinned = getPinnedPatients();
  const filtered = pinned.filter(p => p.id !== patientId);
  localStorage.setItem(PINNED_PATIENTS_KEY, JSON.stringify(filtered));
}

export function togglePin(patientId: string): boolean {
  if (isPinned(patientId)) {
    unpinPatient(patientId);
    return false;
  } else {
    pinPatient(patientId);
    return true;
  }
}