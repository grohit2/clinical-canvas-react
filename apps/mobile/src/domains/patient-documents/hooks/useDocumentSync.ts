import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { DOC_CATEGORIES } from '../core/types';
import { refreshPatientDocuments, runSyncQueueOnce } from '../offline/sync';
import { getDocumentFoldersKey } from './useDocumentFolders';
import { getCategoryDocumentsKey } from './useCategoryDocuments';

function invalidateDocumentQueries(queryClient: ReturnType<typeof useQueryClient>, patientId: string) {
  queryClient.invalidateQueries({ queryKey: getDocumentFoldersKey(patientId) });
  for (const category of DOC_CATEGORIES) {
    queryClient.invalidateQueries({
      queryKey: getCategoryDocumentsKey(patientId, category),
    });
  }
}

export function useDocumentSync(patientId: string) {
  const queryClient = useQueryClient();
  const netInfo = useNetInfo();
  const inFlightRef = useRef(false);

  const syncNow = useCallback(async () => {
    if (!patientId || inFlightRef.current) return;

    inFlightRef.current = true;
    try {
      await refreshPatientDocuments(patientId);
      await runSyncQueueOnce();
      invalidateDocumentQueries(queryClient, patientId);
    } catch (error) {
      console.warn('document sync failed', error);
    } finally {
      inFlightRef.current = false;
    }
  }, [patientId, queryClient]);

  useEffect(() => {
    if (!patientId) return;

    void syncNow();
  }, [patientId, syncNow]);

  useEffect(() => {
    if (!patientId) return;
    if (!netInfo.isConnected) return;

    void syncNow();
  }, [netInfo.isConnected, patientId, syncNow]);

  useEffect(() => {
    if (!patientId) return;

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void syncNow();
      }
    });

    return () => sub.remove();
  }, [patientId, syncNow]);

  return {
    syncNow,
    isOnline: !!netInfo.isConnected,
  };
}
