import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PinnedPatient } from '@clinical-canvas/core';
import {
  getPinnedStorageBackend,
  hydratePinnedStorageKey,
  mmkvStorageAdapter,
} from '../lib/storage';
import {
  debugBreadcrumb,
  debugBreadcrumbError,
} from '@patient-documents/mobile/debug/breadcrumbs';

const PINNED_PATIENTS_KEY = 'pinnedPatients';
const EMPTY_PINNED_PATIENTS: PinnedPatient[] = [];

const listeners = new Set<() => void>();
let pinnedCache: PinnedPatient[] | null = null;
let asyncHydrationStarted = false;

function isPinnedPatient(value: unknown): value is PinnedPatient {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<PinnedPatient>;
  return typeof candidate.id === 'string' && typeof candidate.pinnedAt === 'string';
}

function sanitizePinnedPatients(parsed: unknown): PinnedPatient[] {
  if (!Array.isArray(parsed)) return [];

  const deduped = new Map<string, PinnedPatient>();
  parsed.forEach((item) => {
    if (!isPinnedPatient(item)) return;
    deduped.set(item.id, {
      id: item.id,
      pinnedAt: item.pinnedAt,
    });
  });

  return Array.from(deduped.values());
}

function writeCacheToStorage(next: PinnedPatient[]): void {
  const serialized = JSON.stringify(next);
  mmkvStorageAdapter.setItem(PINNED_PATIENTS_KEY, serialized);
}

function loadFromStorage(): PinnedPatient[] {
  try {
    const raw = mmkvStorageAdapter.getItem(PINNED_PATIENTS_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    const sanitized = sanitizePinnedPatients(parsed);

    if (!Array.isArray(parsed) || sanitized.length !== parsed.length) {
      writeCacheToStorage(sanitized);
      debugBreadcrumb('pinned_storage.repaired_payload', {
        backend: getPinnedStorageBackend(),
        repairedCount: sanitized.length,
      });
    }

    return sanitized;
  } catch (error) {
    debugBreadcrumbError('pinned_storage.read_failed', error, {
      backend: getPinnedStorageBackend(),
    });

    try {
      mmkvStorageAdapter.removeItem(PINNED_PATIENTS_KEY);
    } catch {
      // Ignore secondary cleanup errors.
    }

    return [];
  }
}

function ensureCacheLoaded(): void {
  if (pinnedCache) return;
  pinnedCache = loadFromStorage();
}

function notifyListeners(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      debugBreadcrumbError('pinned_storage.listener_failed', error);
    }
  });
}

async function hydrateAsyncBackendIfNeeded(): Promise<void> {
  if (getPinnedStorageBackend() !== 'async') return;
  if (asyncHydrationStarted) return;

  asyncHydrationStarted = true;
  await hydratePinnedStorageKey(PINNED_PATIENTS_KEY);
  pinnedCache = loadFromStorage();

  debugBreadcrumb('pinned_storage.async_ready', {
    pinnedCount: pinnedCache.length,
  });

  notifyListeners();
}

function updatePinnedCache(next: PinnedPatient[]): void {
  pinnedCache = next;
  writeCacheToStorage(next);
  notifyListeners();
}

ensureCacheLoaded();

export function usePinnedPatients() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const listener = () => forceUpdate((value) => value + 1);
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    void hydrateAsyncBackendIfNeeded();
  }, []);

  const pinnedPatients = pinnedCache ?? EMPTY_PINNED_PATIENTS;
  const pinnedIds = useMemo(() => pinnedPatients.map((patient) => patient.id), [pinnedPatients]);
  const pinnedIdSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);

  const isPinned = useCallback(
    (patientId: string) => {
      return pinnedIdSet.has(patientId);
    },
    [pinnedIdSet]
  );

  const togglePin = useCallback((patientId: string) => {
    const current = pinnedCache || [];
    const exists = current.some((patient) => patient.id === patientId);

    const next = exists
      ? current.filter((patient) => patient.id !== patientId)
      : [
          ...current,
          {
            id: patientId,
            pinnedAt: new Date().toISOString().slice(0, 10),
          },
        ];

    updatePinnedCache(next);
    return !exists;
  }, []);

  const pinPatient = useCallback((patientId: string) => {
    const current = pinnedCache || [];
    if (current.some((patient) => patient.id === patientId)) return;

    updatePinnedCache([
      ...current,
      {
        id: patientId,
        pinnedAt: new Date().toISOString().slice(0, 10),
      },
    ]);
  }, []);

  const unpinPatient = useCallback((patientId: string) => {
    const current = pinnedCache || [];
    const next = current.filter((patient) => patient.id !== patientId);
    updatePinnedCache(next);
  }, []);

  return {
    pinnedPatients,
    pinnedIds,
    isPinned,
    togglePin,
    pinPatient,
    unpinPatient,
  };
}
