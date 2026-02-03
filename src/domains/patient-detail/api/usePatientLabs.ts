// usePatientLabs - TanStack Query hook for fetching patient lab results

import { useQuery } from '@tanstack/react-query';
import type { LabResult } from '../core/types';
// TODO: Update import path after shared lib migration
// import { api } from '@/shared/lib/api';

export interface UsePatientLabsOptions {
  enabled?: boolean;
}

export function usePatientLabs(patientId: string, options: UsePatientLabsOptions = {}) {
  return useQuery<LabResult[]>({
    queryKey: ['patient', patientId, 'labs'],
    queryFn: async () => {
      // TODO: Implement actual API call
      // return api.get(`/patients/${patientId}/labs`);
      throw new Error('Not implemented');
    },
    enabled: options.enabled !== false && !!patientId,
  });
}
