// useCreatePatient - TanStack Query mutation hook for patient creation

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { FullRegistrationData } from '../core/validation';
// TODO: Update import path after shared lib migration
// import { api } from '@/shared/lib/api';

export interface CreatePatientResponse {
  id: string;
  mrn: string;
}

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: FullRegistrationData): Promise<CreatePatientResponse> => {
      // TODO: Implement actual API call
      // return api.post('/patients', data);
      throw new Error('Not implemented');
    },
    onSuccess: () => {
      // Invalidate patients list to refetch
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}
