// Patient Registration Types
// Pure TypeScript (NO React/RN imports)

export type RegistrationStep =
  | 'identity'
  | 'medical'
  | 'emergency'
  | 'files'
  | 'registration';

export interface RegistrationFormData {
  // Identity
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  photoUrl?: string;

  // Contact
  phone?: string;
  email?: string;
  address?: string;

  // Medical
  diagnosis?: string;
  comorbidities?: string[];
  allergies?: string[];
  bloodGroup?: string;

  // Emergency Contact
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;

  // Files
  documents?: UploadedFile[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';

  // Registration
  registrationDate?: string;
  registrationTime?: string;
  assignedDoctor?: string;
  ward?: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface MrnEntry {
  uid: string;
  hospital: string;
  isPrimary: boolean;
  addedAt: string;
}

export interface RegistrationStepConfig {
  id: RegistrationStep;
  label: string;
  description: string;
  required: boolean;
}

export const REGISTRATION_STEPS: RegistrationStepConfig[] = [
  {
    id: 'identity',
    label: 'Patient Identity',
    description: 'Basic patient information',
    required: true,
  },
  {
    id: 'medical',
    label: 'Medical Details',
    description: 'Diagnosis and medical history',
    required: true,
  },
  {
    id: 'emergency',
    label: 'Emergency Contact',
    description: 'Emergency contact information',
    required: false,
  },
  {
    id: 'files',
    label: 'Files & Priority',
    description: 'Documents and priority level',
    required: false,
  },
  {
    id: 'registration',
    label: 'Registration',
    description: 'Registration details',
    required: false,
  },
];
