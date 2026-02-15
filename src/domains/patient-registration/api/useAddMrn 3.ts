// useAddMrn - TanStack Query mutation hook for adding MRN to patient

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MrnData } from '../core/validation';
// TODO: Update import path after shared lib migration
// import { api } from '@/shared/lib/api';

export interface AddMrnResponse {
  success: boolean;
  uid: string;
}

export function useAddMrn(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: MrnData): Promise<AddMrnResponse> => {
      // TODO: Implement actual API call
      // return api.post(`/patients/${patientId}/mrns`, data);
      throw new Error('Not implemented');
    },
    onSuccess: () => {
      // Invalidate patient query to refetch with new MRN
      queryClient.invalidateQueries({ queryKey: ['patient', patientId] });
    },
  });
}
