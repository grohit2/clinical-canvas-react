// Server -> UI mapping for HMS Patients Lambda

// Server shape (subset from your OpenAPI)
export type HmsPatient = {
  mrn: string;
  name: string;
  department: string;
  status: "ACTIVE" | "INACTIVE";
  pathway?: string;
  current_state?: string;
  diagnosis?: string;
  age?: number;
  sex?: "M" | "F" | "X" | string;
  comorbidities?: string[];
  assigned_doctor?: string;
  qr_code?: string;
  files_url?: string;
  update_counter?: number;
  last_updated?: string;   // ISO
  state_dates?: Record<string, string>;
};

// UI shape (existing)
import { PatientMeta } from "@/types/models";

export function toPatientMeta(p: HmsPatient): PatientMeta {
  return {
    id: p.mrn,                      // <-- route by MRN
    name: p.name,
    mrn: p.mrn,
    qrCode: p.qr_code ?? "",
    pathway: (p.pathway as any) ?? "consultation",
    currentState: p.current_state ?? "stable",
    diagnosis: p.diagnosis ?? "",
    comorbidities: p.comorbidities ?? [],
    updateCounter: p.update_counter ?? 0,
    lastUpdated: p.last_updated ?? new Date().toISOString(),
    assignedDoctor: p.assigned_doctor ?? "",
    department: p.department,
    status: p.status,
  };
}

export function fromPatientMeta(p: Partial<PatientMeta>): Partial<HmsPatient> {
  return {
    mrn: p.mrn,
    name: p.name,
    department: p.department,
    status: p.status,
    pathway: p.pathway,
    current_state: p.currentState,
    diagnosis: p.diagnosis,
    comorbidities: p.comorbidities,
    assigned_doctor: p.assignedDoctor,
    qr_code: p.qrCode,
    update_counter: p.updateCounter,
    last_updated: p.lastUpdated,
  };
}