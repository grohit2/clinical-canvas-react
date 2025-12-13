// Patient types for React Native app

export type Stage =
  | 'onboarding'
  | 'preop'
  | 'intraop'
  | 'postop'
  | 'discharge-init'
  | 'discharge';

export type Pathway = 'surgical' | 'consultation' | 'emergency';

export type SchemeOption = 'ASP' | 'NAM' | 'EHS' | 'PAID' | 'OTHERS' | string;

export type PatientStatus = 'ACTIVE' | 'INACTIVE';

export type Priority = 'routine' | 'important' | 'critical';

export interface MrnHistoryEntry {
  mrn: string;
  scheme: SchemeOption;
  date: string; // ISO8601 string
}

export interface Vitals {
  hr?: number;
  bp?: number | string;
  systolic?: number;
  diastolic?: number;
  spo2?: number;
  temp?: number;
  temperature?: number;
  updatedAt?: string;
}

export interface EmergencyContact {
  name: string;
  relationship?: string;
  phone?: string;
}

export interface Patient {
  id: string; // ULID
  latestMrn?: string;
  mrnHistory?: MrnHistoryEntry[];
  govShare?: boolean;
  name: string;
  department: string;
  status: PatientStatus;
  pathway?: Pathway;
  currentState?: Stage;
  diagnosis?: string;
  age?: number;
  sex?: string;
  comorbidities?: string[];
  scheme?: SchemeOption;
  roomNumber?: string;
  procedureName?: string;
  surgeryCode?: string;
  surgeryDate?: string | null;
  assignedDoctor?: string;
  assignedDoctorId?: string;
  isUrgent?: boolean;
  urgentReason?: string;
  urgentUntil?: string;
  emergencyContact?: EmergencyContact;
  filesUrl?: string | null;
  lastUpdated?: string;
  qrCode?: string;
  updateCounter?: number;
  vitals?: Vitals;
}

// Filter types
export interface PatientFilters {
  searchQuery: string;
  selectedPathway: Pathway | null;
  selectedStage: Stage | null;
  showUrgentOnly: boolean;
  activeTab: 'all' | 'my';
}
