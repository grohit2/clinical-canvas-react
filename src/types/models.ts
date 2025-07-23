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
  type: 'lab' | 'medication' | 'procedure' | 'assessment' | 'discharge';
  due: string;
  assigneeId: string;
  status: 'open' | 'in-progress' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  recurring: boolean;
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