import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Patient } from "@/types/api";

const patientKeys = {
  all: ["patients"] as const,
  lists: () => [...patientKeys.all, "list"] as const,
  list: (filters?: { department?: string }) =>
    [...patientKeys.lists(), filters] as const,
  detail: (id: string) => [...patientKeys.all, id] as const,
  timeline: (id: string) => [...patientKeys.all, id, "timeline"] as const,
};

export function usePatients(filters?: { department?: string }) {
  return useQuery({
    queryKey: patientKeys.list(filters),
    queryFn: () => api.patients.list(filters?.department),
  });
}

export function usePatient(id?: string) {
  return useQuery({
    enabled: Boolean(id),
    queryKey: patientKeys.detail(id || ""),
    queryFn: () => api.patients.get(id!),
  });
}

export function usePatientTimeline(id?: string) {
  return useQuery({
    enabled: Boolean(id),
    queryKey: patientKeys.timeline(id || ""),
    queryFn: () => api.patients.timeline(id!),
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof api.patients.create>[0]) =>
      api.patients.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: patientKeys.lists() });
    },
  });
}

export function useUpdatePatient(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Patient>) => api.patients.update(id, payload),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: patientKeys.detail(id) });
      if ((vars as any)?.department) {
        qc.invalidateQueries({ queryKey: patientKeys.lists() });
      }
    },
  });
}

export const patientQueryKeys = patientKeys;
