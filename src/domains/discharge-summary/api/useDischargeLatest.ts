// useDischargeLatest - TanStack Query hook for fetching latest discharge summary

import { useQuery } from '@tanstack/react-query';
import type { DischargeSummaryVersion } from '../core/types';
// TODO: Update import path after shared lib migration
// import { api } from '@/shared/lib/api';

export interface UseDischargeLatestOptions {
  enabled?: boolean;
}

export function useDischargeLatest(patientId: string, options: UseDischargeLatestOptions = {}) {
  return useQuery<DischargeSummaryVersion | null>({
    queryKey: ['discharge', patientId, 'latest'],
    queryFn: async () => {
      // TODO: Implement actual API call
      // return api.discharge.getLatest(patientId);
      throw new Error('Not implemented');
    },
    enabled: options.enabled !== false && !!patientId,
  });
}
