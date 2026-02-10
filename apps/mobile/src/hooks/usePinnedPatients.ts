import { useState, useCallback, useMemo } from 'react';
import { createPinnedPatientsStore } from '@clinical-canvas/core';
import { mmkvStorageAdapter } from '../lib/storage';

const store = createPinnedPatientsStore(mmkvStorageAdapter);

export function usePinnedPatients() {
  const [, forceUpdate] = useState({});

  const pinnedPatients = useMemo(() => store.getPinnedPatients(), []);
  const pinnedIds = useMemo(
    () => pinnedPatients.map((p) => p.id),
    [pinnedPatients]
  );

  const isPinned = useCallback((patientId: string) => {
    return store.isPinned(patientId);
  }, []);

  const togglePin = useCallback((patientId: string) => {
    const newState = store.togglePin(patientId);
    forceUpdate({}); // Trigger re-render
    return newState;
  }, []);

  const pinPatient = useCallback((patientId: string) => {
    store.pinPatient(patientId);
    forceUpdate({});
  }, []);

  const unpinPatient = useCallback((patientId: string) => {
    store.unpinPatient(patientId);
    forceUpdate({});
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
