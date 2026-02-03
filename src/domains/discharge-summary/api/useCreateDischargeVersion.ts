// useCreateDischargeVersion - TanStack Query mutation hook for creating discharge summary

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DischargeSummaryData, DischargeSummaryVersion } from '../core/types';
// TODO: Update import path after shared lib migration
// import { api } from '@/shared/lib/api';

export interface CreateDischargePayload {
  patientId: string;
  data: DischargeSummaryData;
  status?: 'draft' | 'final';
}

export function useCreateDischargeVersion(patientId: string) {
  const queryClient = useQueryClient();

  return useMutation<DischargeSummaryVersion, Error, CreateDischargePayload>({
    mutationFn: async (payload) => {
      // TODO: Implement actual API call
      // return api.discharge.create(payload);
      throw new Error('Not implemented');
    },
    onSuccess: () => {
      // Invalidate discharge queries to refetch
      queryClient.invalidateQueries({ queryKey: ['discharge', patientId] });
    },
  });
}
