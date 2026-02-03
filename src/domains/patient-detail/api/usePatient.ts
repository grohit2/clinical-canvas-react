// usePatient - TanStack Query hook for fetching single patient

import { useQuery } from '@tanstack/react-query';
// TODO: Update import path after shared lib migration
// import { api } from '@/shared/lib/api';

export interface UsePatientOptions {
  enabled?: boolean;
}

export function usePatient(patientId: string, options: UsePatientOptions = {}) {
  return useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      // TODO: Implement actual API call
      // return api.get(`/patients/${patientId}`);
      throw new Error('Not implemented');
    },
    enabled: options.enabled !== false && !!patientId,
  });
}
