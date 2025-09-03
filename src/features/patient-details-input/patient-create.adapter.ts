// patient-create.adapter.ts - Normalize form data for patient creation API

export interface CreatePayloadInput {
  name: string;
  age: string | number;
  sex: string; // "M" | "F" | "Other"
  mrn: string;
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
  pathway?: string;
  diagnosis?: string;
  comorbidities?: string[];
  assignedDoctorId?: string;
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
    registrationNumber: input.mrn.trim(),
    name: input.name.trim(),
    department: input.department.trim(),
    age,
    sex: normalizedSex,
    pathway: input.pathway || undefined,
    diagnosis: input.diagnosis?.trim() || undefined,
    comorbidities: input.comorbidities?.filter(c => c.trim()) || undefined,
    assignedDoctorId: input.assignedDoctorId?.trim() || undefined,
  };
}