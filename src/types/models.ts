// DynamoDB model types for the Patient Management System

export interface PatientMeta {
  id: string;
  name: string;
  qrCode: string;
  pathway: 'surgical' | 'consultation' | 'emergency';
  currentState: string;
  diagnosis: string;
  comorbidities: string[];
  updateCounter: number;
  lastUpdated: string;
  assignedDoctor?: string;
  assignedNurse?: string;
  room?: string;
  age?: number;
  mrn?: string;
  allergies?: string[];
  admissionDate?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface TimelineEntry {
  patientId: string;
  state: string;
  dateIn: string;
  dateOut?: string;
  checklistIn: string[];
  checklistOut: string[];
}

export interface Task {
  taskId: string;
  patientId: string;
  title: string;
  type: 'lab' | 'medication' | 'procedure' | 'assessment' | 'discharge' | 'doctor' | 'nurse';
  due: string;
  assigneeId: string;
  assigneeRole: 'doctor' | 'nurse' | 'lab' | 'pharmacist' | 'technician';
  status: 'open' | 'in-progress' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  recurring: boolean;
  recurringFreq?: 'daily' | 'weekly' | 'monthly';
  description?: string;
  estimatedDuration?: number; // minutes
}

export interface Medication {
  medId: string;
  patientId: string;
  name: string;
  dose: string;
  route: string;
  freq: string;
  start: string;
  end: string;
  priority: 'routine' | 'important' | 'critical';
  scheduleTimes: string[];
}

export interface LabResult {
  labId: string;
  patientId: string;
  name: string;
  values: Array<{
    date: string;
    value: number;
    unit: string;
    range: string;
  }>;
  abnormalFlag: boolean;
  resultStatus: 'pending' | 'completed' | 'cancelled';
  reportedAt: string;
}

export interface Note {
  noteId: string;
  patientId: string;
  authorId: string;
  category: 'doctorNote' | 'nurseNote' | 'pharmacy' | 'discharge';
  content: string;
  createdAt: string;
}

export interface MediaFile {
  fileId: string;
  patientId: string;
  url: string;
  mime: string;
  uploadedBy: string;
  timestamp: string;
  tags: string[];
}

export interface StaffProfile {
  id: string;
  name: string;
  role: 'doctor' | 'nurse' | 'pharmacist' | 'technician' | 'admin';
  avatar?: string;
  contactInfo: {
    phone?: string;
    email?: string;
  };
  permissions: string[];
}

// Pathway state definitions
export interface PathwayStates {
  surgical: ('onboard' | 'preop' | 'd-1-op' | 'op' | 'd+1-op' | 'post-op')[];
  consultation: ('onboard' | 'wait' | 'consult' | 'followup' | 'done')[];
  emergency: ('onboard' | 'triage' | 'treatment' | 'observation' | 'discharge')[];
}

export const PATHWAY_STATES: PathwayStates = {
  surgical: ['onboard', 'preop', 'd-1-op', 'op', 'd+1-op', 'post-op'],
  consultation: ['onboard', 'wait', 'consult', 'followup', 'done'],
  emergency: ['onboard', 'triage', 'treatment', 'observation', 'discharge']
};

// Notification types
export interface Notification {
  id: string;
  type: 'whatsapp' | 'lab' | 'task' | 'approval';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  patientId?: string;
  taskId?: string;
}

// UI-specific types
export interface FilterState {
  pathway?: string;
  stage?: string;
  urgent?: boolean;
  assignee?: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  tasks: Task[];
}