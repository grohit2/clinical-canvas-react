// useCreateMedication - TanStack Query mutation hook for creating medications

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Medication, MedRoute, MedFrequency, MedPriority } from '../core/types';
// TODO: Update import path after shared lib migration
// import { api } from '@/shared/lib/api';

export interface CreateMedicationPayload {
  patientId: string;
  name: string;
  dose: string;
  unit: string;
  route: MedRoute;
  frequency: MedFrequency;
  priority: MedPriority;
  startDate: string;
  endDate?: string;
  instructions?: string;
  scheduleTimes?: string[];
}

export function useCreateMedication() {
  const queryClient = useQueryClient();

  return useMutation<Medication, Error, CreateMedicationPayload>({
    mutationFn: async (payload) => {
      // TODO: Implement actual API call
      // return api.meds.create(payload);
      throw new Error('Not implemented');
    },
    onSuccess: (newMed) => {
      // Invalidate medications list for this patient
      queryClient.invalidateQueries({
        queryKey: ['medications', { patientId: newMed.patientId }],
      });

      // Also invalidate general medications query
      queryClient.invalidateQueries({ queryKey: ['medications'] });
    },
  });
}
