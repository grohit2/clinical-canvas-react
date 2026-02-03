// useUpdateMedication - TanStack Query mutation hook for updating medications

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Medication, MedRoute, MedFrequency, MedPriority, MedStatus } from '../core/types';
// TODO: Update import path after shared lib migration
// import { api } from '@/shared/lib/api';

export interface UpdateMedicationPayload {
  name?: string;
  dose?: string;
  unit?: string;
  route?: MedRoute;
  frequency?: MedFrequency;
  priority?: MedPriority;
  status?: MedStatus;
  endDate?: string;
  instructions?: string;
  scheduleTimes?: string[];
}

export function useUpdateMedication(medicationId: string) {
  const queryClient = useQueryClient();

  return useMutation<Medication, Error, UpdateMedicationPayload>({
    mutationFn: async (payload) => {
      // TODO: Implement actual API call
      // return api.meds.update(medicationId, payload);
      throw new Error('Not implemented');
    },
    onSuccess: (updatedMed) => {
      // Update the specific medication in cache
      queryClient.setQueryData(['medication', medicationId], updatedMed);

      // Invalidate medications list for this patient
      queryClient.invalidateQueries({
        queryKey: ['medications', { patientId: updatedMed.patientId }],
      });
    },
  });
}

export function useDiscontinueMedication(medicationId: string, patientId: string) {
  const updateMed = useUpdateMedication(medicationId);

  return {
    ...updateMed,
    mutate: () => updateMed.mutate({ status: 'discontinued', endDate: new Date().toISOString() }),
    mutateAsync: () => updateMed.mutateAsync({ status: 'discontinued', endDate: new Date().toISOString() }),
  };
}
