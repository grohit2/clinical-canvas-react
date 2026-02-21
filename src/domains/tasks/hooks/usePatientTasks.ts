import { useQuery } from '@tanstack/react-query';
import type { Task } from '../core/types';
import { listPatientTasks } from '../data/api-client/patientTasks';

export function usePatientTasks(patientId: string, options: { enabled?: boolean } = {}) {
  return useQuery<Task[]>({
    queryKey: ['patient-tasks', patientId],
    queryFn: () => listPatientTasks(patientId),
    enabled: options.enabled !== false && !!patientId,
  });
}
