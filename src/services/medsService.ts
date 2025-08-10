import { fetchWithFallback } from "@/services/api";

export type MedRow = { name: string; dose?: string; route?: string; schedule?: string };

export async function getMedsByPatient(mrn: string): Promise<MedRow[]> {
  return fetchWithFallback(
    async () => { throw new Error("meds API not ready"); },
    [],
  );
}

export const medsService = { getMedsByPatient };