import { useQuery } from '@tanstack/react-query';
import { enrichPatient } from '@clinical-canvas/core';
import type { Patient } from '@clinical-canvas/core';
import { api } from '../lib/api';

export function usePatients(department?: string) {
  return useQuery({
    queryKey: ['patients', department],
    queryFn: async () => {
      const data = await api.patients.list(department);
      // Enrich patients with normalized data
      return data.map((p) => enrichPatient(p as Patient));
    },
  });
}

export function usePatient(uid: string) {
  return useQuery({
    queryKey: ['patient', uid],
    queryFn: async () => {
      const data = await api.patients.get(uid);
      return enrichPatient(data as Patient);
    },
    enabled: !!uid,
  });
}
