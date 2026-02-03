// Patient Detail Types
// TODO: Extract detail-specific types here

export interface PatientDetail {
  // TODO: Define patient detail structure
}

export interface LabResult {
  id: string;
  name: string;
  value: string;
  unit: string;
  normalRange: string;
  isAbnormal: boolean;
  timestamp: string;
}

export interface VitalSign {
  id: string;
  type: 'temperature' | 'bloodPressure' | 'heartRate' | 'respiratoryRate' | 'oxygenSaturation';
  value: string;
  unit: string;
  timestamp: string;
  isAbnormal: boolean;
}

export interface TimelineEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  userId?: string;
  userName?: string;
}

export interface ZoneData {
  zone: 'blue' | 'yellow' | 'red' | 'green';
  checklist: ChecklistItem[];
  completedCount: number;
  totalCount: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  required: boolean;
}
