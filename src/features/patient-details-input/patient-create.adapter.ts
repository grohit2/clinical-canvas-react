// patient-create.adapter.ts - Normalize form data for patient creation API

const SCHEME_OPTIONS = ['ASP', 'NAM', 'EHS', 'PAID', 'OTHERS'] as const;
type SchemeOption = typeof SCHEME_OPTIONS[number];

const normalizeScheme = (value?: string): SchemeOption => {
  const raw = (value || '').trim().toUpperCase();
  if (SCHEME_OPTIONS.includes(raw as SchemeOption)) {
    return raw as SchemeOption;
  }
  if (["UNKNOWN", "GENERAL", "OTHER", "OTHERS"].includes(raw)) {
    return 'OTHERS';
  }
  return 'OTHERS';
};

export interface CreatePayloadInput {
  name: string;
  age: string | number;
  sex: string; // "M" | "F" | "Other"
  mrn: string;
  scheme?: string;
  roomNumber?: string;
  department: string;
  pathway?: string;
  diagnosis?: string;
  comorbidities?: string[];
  assignedDoctor?: string;
  assignedDoctorId?: string;
}

export interface CreatePayloadOutput {
  registrationNumber: string;
  name: string;
  department: string;
  age: number;
  sex: string;
  scheme?: SchemeOption;
  roomNumber?: string;
  pathway?: string;
  diagnosis?: string;
  comorbidities?: string[];
  assignedDoctorId?: string;
  latestMrn?: string;
  mrnHistory?: { mrn: string; scheme: SchemeOption; date: string }[];
}

/**
 * Normalizes and validates patient creation form data for the API
 */
export function toCreatePayload(input: CreatePayloadInput): CreatePayloadOutput {
  // Normalize sex values
  let normalizedSex = input.sex;
  if (input.sex === "M") normalizedSex = "male";
  else if (input.sex === "F") normalizedSex = "female";
  else normalizedSex = "other";

  // Normalize age to number
  const age = typeof input.age === 'string' ? parseInt(input.age, 10) : input.age;
  if (isNaN(age) || age < 0 || age > 150) {
    throw new Error('Invalid age provided');
  }

  const registrationNumber = input.mrn?.trim() || '';
  const scheme = input.scheme ? normalizeScheme(input.scheme) : 'OTHERS';
  const roomNumber = input.roomNumber?.trim() || undefined;

  const mrnHistory = registrationNumber
    ? [{
        mrn: registrationNumber,
        scheme,
        date: new Date().toISOString(),
      }]
    : [];

  // Validate required fields
  if (!input.name?.trim()) {
    throw new Error('Patient name is required');
  }
  if (!input.mrn?.trim()) {
    throw new Error('MRN is required');
  }
  if (!input.department?.trim()) {
    throw new Error('Department is required');
  }

  return {
    registrationNumber,
    name: input.name.trim(),
    department: input.department.trim(),
    age,
    sex: normalizedSex,
    scheme,
    roomNumber,
    pathway: input.pathway || undefined,
    diagnosis: input.diagnosis?.trim() || undefined,
    comorbidities: input.comorbidities?.filter(c => c.trim()) || undefined,
    assignedDoctorId: input.assignedDoctorId?.trim() || undefined,
    latestMrn: registrationNumber || undefined,
    mrnHistory: mrnHistory.length ? mrnHistory : undefined,
  };
}
