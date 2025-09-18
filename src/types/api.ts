// API models based on HMS API spec

export interface MrnHistoryEntry {
  mrn: string;
  scheme: 'ASP' | 'NAM' | 'Paid' | 'Unknown' | string;
  date: string; // ISO8601 string
}

export interface Patient {
  id: string; // uid (ULID)
  latestMrn?: string;
  mrnHistory?: MrnHistoryEntry[];
  name: string;
  department: string;
  status: 'ACTIVE' | 'INACTIVE';
  pathway?: 'surgical' | 'consultation' | 'emergency';
  currentState?: string;
  diagnosis?: string;
  age?: number;
  sex?: string;
  comorbidities?: string[];
  assignedDoctor?: string;
  assignedDoctorId?: string;
  isUrgent?: boolean;
  urgentReason?: string;
  urgentUntil?: string;
  emergencyContact?: {
    name: string;
    relationship?: string;
    phone?: string;
  };
  filesUrl?: string | null;
  lastUpdated?: string;
  // UI-specific optional fields
  qrCode?: string;
  updateCounter?: number;
  vitals?: {
    hr?: number;
    bp?: number | string;
    systolic?: number;
    diastolic?: number;
    spo2?: number;
    temp?: number;
    temperature?: number;
    updatedAt?: string;
  };
}

export interface Task {
  taskId: string;
  patientId: string;
  title: string;
  type: 'lab' | 'medication' | 'procedure' | 'assessment' | 'discharge';
  due: string;
  assigneeId: string;
  status: 'open' | 'in-progress' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  recurring: boolean;
  recurrence?: {
    frequency: string;
    until?: string;
    daysOfWeek?: string[];
  } | null;
  details?: Record<string, unknown> | null;
  department?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  noteId: string;
  patientId: string;
  authorId: string;
  category: 'doctorNote' | 'nurseNote' | 'pharmacy' | 'discharge';
  content: string;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
}

export interface Medication {
  medId: string;
  patientId: string;
  name: string;
  dose: string;
  route: string;
  freq: string;
  start: string;
  end?: string | null;
  priority: 'routine' | 'important' | 'critical';
  scheduleTimes: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Doctor {
  doctorId: string;
  name: string;
  role: string;
  department?: string | null;
  avatar?: string | null;
  contactInfo: Record<string, string>;
  permissions: string[];
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimelineEntry {
  timelineId: string;
  patientId: string;
  state: string;
  dateIn: string;
  dateOut?: string | null;
  requiredIn: string[];
  requiredOut: string[];
  checklistIn: string[];
  checklistOut: string[];
  actorId?: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
