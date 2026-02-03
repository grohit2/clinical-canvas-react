// useMedications - TanStack Query hook for fetching medications

import { useQuery } from '@tanstack/react-query';
import type { Medication, MedStatus } from '../core/types';
// TODO: Update import path after shared lib migration
// import { api } from '@/shared/lib/api';

export interface UseMedicationsOptions {
  patientId?: string;
  status?: MedStatus;
  enabled?: boolean;
}

export function useMedications(options: UseMedicationsOptions = {}) {
  const { patientId, status, enabled = true } = options;

  return useQuery<Medication[]>({
    queryKey: ['medications', { patientId, status }],
    queryFn: async () => {
      // TODO: Implement actual API call
      // return api.meds.list({ patientId, status });
      throw new Error('Not implemented');
    },
    enabled: enabled && !!patientId,
  });
}

export function useMedicationsByPatient(patientId: string, options: Omit<UseMedicationsOptions, 'patientId'> = {}) {
  return useMedications({
    ...options,
    patientId,
    enabled: options.enabled !== false && !!patientId,
  });
}

export function useActiveMedications(patientId: string, options: { enabled?: boolean } = {}) {
  return useMedications({
    patientId,
    status: 'active',
    enabled: options.enabled !== false && !!patientId,
  });
}

export function useMedication(medicationId: string, options: { enabled?: boolean } = {}) {
  return useQuery<Medication>({
    queryKey: ['medication', medicationId],
    queryFn: async () => {
      // TODO: Implement actual API call
      // return api.meds.get(medicationId);
      throw new Error('Not implemented');
    },
    enabled: options.enabled !== false && !!medicationId,
  });
}
