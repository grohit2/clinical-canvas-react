// useUpdatePatient - TanStack Query mutation hook for patient updates

import { useMutation, useQueryClient } from '@tanstack/react-query';
// TODO: Update import path after shared lib migration
// import { api } from '@/shared/lib/api';

export interface UpdatePatientPayload {
  // TODO: Define update payload structure
  [key: string]: unknown;
}

export function useUpdatePatient(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdatePatientPayload) => {
      // TODO: Implement actual API call
      // return api.patch(`/patients/${patientId}`, payload);
      throw new Error('Not implemented');
    },
    onSuccess: () => {
      // Invalidate patient query to refetch
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}
