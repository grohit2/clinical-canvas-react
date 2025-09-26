// Centralized transforms so both forms can post the same payload.

export type PathwayApi = "surgical" | "emergency" | "consultation";
export type SexApi = "male" | "female" | "other";

export function mapSexToApi(sex: string): SexApi {
  const s = (sex || "").toLowerCase();
  if (s === "m" || s === "male") return "male";
  if (s === "f" || s === "female") return "female";
  return "other";
}

// Accepts either exact API values or tries to normalize common phrases.
export function normalizePathway(input?: string): PathwayApi {
  const s = (input || "").toLowerCase().trim();
  if (["surg", "surgical", "ot", "or"].some(k => s.includes(k))) return "surgical";
  if (["emer", "ed", "er", "emergency"].some(k => s.includes(k))) return "emergency";
  if (["consult", "opd", "clinic"].some(k => s.includes(k))) return "consultation";
  if (["surgical", "emergency", "consultation"].includes(s)) return s as PathwayApi;
  return "consultation";
}

export function normalizeComorbidities(list: string[] | string | undefined): string[] {
  if (!list) return [];
  if (Array.isArray(list)) return [...new Set(list.map(x => x.trim()).filter(Boolean))];
  return [...new Set(list.split(",").map(x => x.trim()).filter(Boolean))];
}

export type MrnHistoryEntry = {
  mrn: string;
  scheme: 'ASP' | 'NAM' | 'Paid' | 'Unknown' | string;
  date: string; // ISO8601 string
};

export type CreatePatientPayload = {
  registrationNumber: string;
  name: string;
  department: string;
  age: number;
  sex: SexApi;
  pathway: PathwayApi;
  diagnosis: string;
  comorbidities: string[];
  assignedDoctorId?: string;
  assignedDoctor?: string;
  latestMrn?: string;
  mrnHistory?: MrnHistoryEntry[];
  currentState?: string;
  isUrgent?: boolean;
  urgentReason?: string;
  urgentUntil?: string;
  emergencyContact?: {
    name: string;
    relationship?: string;
    phone?: string;
  };
  filesUrl?: string;
  vitals?: {
    hr?: number;
    systolic?: number;
    diastolic?: number;
    spo2?: number;
    temp?: number;
    updatedAt?: string;
  };
  // New optional registration fields
  tidNumber?: string;
  tidStatus?: string; // 'DONE' | 'PENDING'
  surgeryCode?: string;
};

export type NewFormData = {
  name: string;
  age: string;                 // numeric string
  sex: string;                 // "M" | "F" | "Other"
  mrn: string;                 // for backward compatibility
  department: string;
  pathway?: string;            // free text or enum
  diagnosis?: string;
  comorbidities?: string[];    // array in new form
  assignedDoctor?: string;
  assignedDoctorId?: string;
  latestMrn?: string;
  mrnHistory?: MrnHistoryEntry[];
  currentState?: string;
  isUrgent?: boolean;
  urgentReason?: string;
  urgentUntil?: string;
  emergencyContact?: {
    name: string;
    relationship?: string;
    phone?: string;
  };
  filesUrl?: string;
  vitals?: {
    hr?: string;
    systolic?: string;
    diastolic?: string;
    spo2?: string;
    temp?: string;
  };
  // New optional registration fields for create form
  tidNumber?: string;
  tidStatus?: string; // 'DONE' | 'PENDING'
  surgeryCode?: string;
};

export function toCreatePayload(d: NewFormData): CreatePatientPayload {
  const ageNum = Number.parseInt(d.age, 10);
  if (Number.isNaN(ageNum)) {
    throw new Error("Invalid age");
  }

  return {
    registrationNumber: (d.mrn || d.latestMrn || "").trim(),
    name: (d.name || "").trim(),
    department: (d.department || "General").trim(),
    age: ageNum,
    sex: mapSexToApi(d.sex),
    pathway: normalizePathway(d.pathway),
    diagnosis: (d.diagnosis || "").trim(),
    comorbidities: normalizeComorbidities(d.comorbidities),
    assignedDoctor: (d.assignedDoctor || "").trim() || undefined,
    assignedDoctorId: (d.assignedDoctorId || d.assignedDoctor || "").trim() || undefined,
    latestMrn: (d.latestMrn || d.mrn || "").trim(),
    mrnHistory: d.mrnHistory || [],
    currentState: (d.currentState || "").trim() || undefined,
    isUrgent: d.isUrgent || false,
    urgentReason: (d.urgentReason || "").trim() || undefined,
    urgentUntil: (d.urgentUntil || "").trim() || undefined,
    emergencyContact: d.emergencyContact && (d.emergencyContact.name || d.emergencyContact.phone) 
      ? d.emergencyContact 
      : undefined,
    filesUrl: (d.filesUrl || "").trim() || undefined,
    vitals: d.vitals && (d.vitals.hr || d.vitals.systolic || d.vitals.spo2 || d.vitals.temp) ? {
      hr: d.vitals.hr ? Number(d.vitals.hr) : undefined,
      systolic: d.vitals.systolic ? Number(d.vitals.systolic) : undefined,
      diastolic: d.vitals.diastolic ? Number(d.vitals.diastolic) : undefined,
      spo2: d.vitals.spo2 ? Number(d.vitals.spo2) : undefined,
      temp: d.vitals.temp ? Number(d.vitals.temp) : undefined,
      updatedAt: new Date().toISOString(),
    } : undefined,
    // pass through new optional fields
    tidNumber: (d.tidNumber || "").trim() || undefined,
    tidStatus: (d.tidStatus || "").trim() || undefined,
    surgeryCode: (d.surgeryCode || "").trim() || undefined,
  };
}
