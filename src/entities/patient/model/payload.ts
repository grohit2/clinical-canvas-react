import type { Patient } from "@/types/api";
import {
  type PatientFormValues,
  COMORBIDITY_OPTIONS,
  SCHEME_OPTIONS,
  patientSchema,
  STAGE_OPTIONS,
} from "./validation";

export type CreatePatientPayload = {
  registrationNumber: string;
  name: string;
  department: string;
  age?: number;
  sex: "male" | "female" | "other";
  scheme: (typeof SCHEME_OPTIONS)[number];
  roomNumber?: string;
  procedureName?: string;
  pathway: PatientFormValues["pathway"];
  diagnosis?: string;
  comorbidities?: string[];
  assignedDoctor?: string;
  assignedDoctorId?: string;
  currentState: (typeof STAGE_OPTIONS)[number];
  isUrgent: boolean;
  urgentReason?: string;
  urgentUntil?: string;
  filesUrl?: string;
  surgeryCode?: string;
  surgeryDate?: string;
  emergencyContact?: Patient["emergencyContact"];
  latestMrn?: string;
  mrnHistory?: Patient["mrnHistory"];
};

export type UpdatePatientPayload = Partial<CreatePatientPayload>;

const trimOrUndefined = (value?: string | null) => {
  if (value == null) return undefined;
  const trimmed = String(value).trim();
  return trimmed.length ? trimmed : undefined;
};

export const mapSexToApi = (sex: PatientFormValues["sex"]): CreatePatientPayload["sex"] => {
  if (sex === "M") return "male";
  if (sex === "F") return "female";
  return "other";
};

export const normalizeComorbidities = (values: Pick<PatientFormValues, "comorbidities" | "includeOtherComorbidity" | "otherComorbidity">) => {
  const tokens = new Set<string>();
  (values.comorbidities || []).forEach((c) => {
    const token = trimOrUndefined(c)?.toUpperCase();
    if (token) tokens.add(token);
  });
  if (values.includeOtherComorbidity) {
    const other = trimOrUndefined(values.otherComorbidity)?.toUpperCase();
    if (other) tokens.add(other);
  }
  return Array.from(tokens);
};

export const normalizePathway = (pathway: PatientFormValues["pathway"]) => pathway;

export const toCreatePayload = (values: PatientFormValues): CreatePatientPayload => {
  // Validate form values against schema to avoid silently accepting invalid shapes
  patientSchema.parse(values);

  const registrationNumber = values.mrn.trim();
  const scheme = values.scheme;
  const comorbidities = normalizeComorbidities(values);

  const base: CreatePatientPayload = {
    registrationNumber,
    name: values.name.trim(),
    department: values.department.trim(),
    age: values.age,
    sex: mapSexToApi(values.sex),
    scheme,
    roomNumber: trimOrUndefined(values.roomNumber),
    procedureName: trimOrUndefined(values.procedureName),
    pathway: normalizePathway(values.pathway),
    diagnosis: trimOrUndefined(values.diagnosis),
    comorbidities: comorbidities.length ? comorbidities : undefined,
    assignedDoctor: trimOrUndefined(values.assignedDoctor),
    assignedDoctorId: trimOrUndefined(values.assignedDoctorId),
    currentState: values.currentState,
    isUrgent: values.isUrgent ?? false,
    urgentReason: trimOrUndefined(values.urgentReason),
    urgentUntil: trimOrUndefined(values.urgentUntil),
    filesUrl: trimOrUndefined(values.filesUrl),
    surgeryCode: trimOrUndefined(values.surgeryCode),
    surgeryDate: trimOrUndefined(values.surgeryDate),
    emergencyContact: values.emergencyContact,
    latestMrn: registrationNumber || undefined,
    mrnHistory: registrationNumber
      ? [
          {
            mrn: registrationNumber,
            scheme,
            date: new Date().toISOString(),
          },
        ]
      : undefined,
  };

  return base;
};

export const toUpdatePayload = (values: PatientFormValues, existing: Patient): UpdatePatientPayload => {
  patientSchema.parse(values);

  const normalizedComorbidities = normalizeComorbidities(values);

  const normalized: UpdatePatientPayload = {
    name: values.name.trim(),
    age: values.age,
    sex: mapSexToApi(values.sex),
    scheme: values.scheme,
    roomNumber: trimOrUndefined(values.roomNumber),
    procedureName: trimOrUndefined(values.procedureName),
    pathway: normalizePathway(values.pathway),
    diagnosis: trimOrUndefined(values.diagnosis),
    comorbidities: normalizedComorbidities.length ? normalizedComorbidities : undefined,
    assignedDoctor: trimOrUndefined(values.assignedDoctor),
    assignedDoctorId: trimOrUndefined(values.assignedDoctorId),
    currentState: values.currentState,
    isUrgent: values.isUrgent ?? false,
    urgentReason: trimOrUndefined(values.urgentReason),
    urgentUntil: trimOrUndefined(values.urgentUntil),
    filesUrl: trimOrUndefined(values.filesUrl),
    surgeryCode: trimOrUndefined(values.surgeryCode),
    surgeryDate: trimOrUndefined(values.surgeryDate),
    emergencyContact: values.emergencyContact,
    latestMrn: existing.latestMrn ?? trimOrUndefined(values.mrn),
  };

  // Only include fields that differ from existing to play nicely with partial update semantics
  const result: UpdatePatientPayload = {};
  (Object.entries(normalized) as [keyof UpdatePatientPayload, unknown][]).forEach(([key, next]) => {
    const prev = (existing as Record<string, unknown>)[key];
    if (next !== undefined && next !== prev) {
      result[key] = next as never;
    }
  });

  return result;
};
