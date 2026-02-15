// Discharge Summary Types
// Pure TypeScript (NO React/RN imports)

export interface DischargeSummaryData {
  patientId: string;
  patientName: string;
  uid: string;
  admissionDate: string;
  dischargeDate: string;
  diagnosis: string;
  procedures?: string[];
  hospitalCourse: string;
  dischargeCondition: string;
  followUpInstructions: string;
  medications: DischargeMedicationItem[];
  sections: DischargeSectionData[];
}

export interface DischargeMedicationItem {
  name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string;
  isNew?: boolean;
  isContinued?: boolean;
  isDiscontinued?: boolean;
}

export interface DischargeSectionData {
  id: string;
  title: string;
  content: string;
  order: number;
  isRequired: boolean;
}

export interface DischargeSummaryVersion {
  id: string;
  patientId: string;
  version: number;
  createdAt: string;
  createdBy: string;
  data: DischargeSummaryData;
  status: 'draft' | 'final' | 'amended';
}

export type DischargeExportFormat = 'docx' | 'pdf';
