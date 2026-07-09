// API service for patient data
import { Patient } from '../types/patient';

// Mock data for development and demo purposes
const mockPatients: Patient[] = [
  {
    id: '01HXYZ123ABC',
    name: 'John Smith',
    latestMrn: 'MRN001',
    department: 'Cardiology',
    status: 'ACTIVE',
    pathway: 'surgical',
    currentState: 'preop',
    diagnosis: 'Coronary artery disease - Triple vessel disease',
    age: 65,
    sex: 'Male',
    comorbidities: ['DM', 'HTN', 'CKD'],
    scheme: 'EHS',
    roomNumber: '101',
    procedureName: 'CABG',
    surgeryDate: '2024-12-15',
    assignedDoctor: 'Dr. Sharma',
    isUrgent: false,
    updateCounter: 2,
    vitals: {
      hr: 78,
      systolic: 140,
      diastolic: 90,
      spo2: 98,
      temp: 98.4,
    },
  },
  {
    id: '01HXYZ456DEF',
    name: 'Mary Johnson',
    latestMrn: 'MRN002',
    department: 'Orthopedics',
    status: 'ACTIVE',
    pathway: 'surgical',
    currentState: 'postop',
    diagnosis: 'Femur fracture - Right leg',
    age: 45,
    sex: 'Female',
    comorbidities: ['Osteoporosis'],
    scheme: 'PAID',
    roomNumber: '205',
    procedureName: 'ORIF',
    surgeryDate: '2024-12-08',
    assignedDoctor: 'Dr. Patel',
    isUrgent: true,
    urgentReason: 'Post-op monitoring',
    updateCounter: 5,
    vitals: {
      hr: 85,
      systolic: 120,
      diastolic: 80,
      spo2: 99,
      temp: 98.6,
    },
  },
  {
    id: '01HXYZ789GHI',
    name: 'Robert Williams',
    latestMrn: 'MRN003',
    department: 'General Surgery',
    status: 'ACTIVE',
    pathway: 'emergency',
    currentState: 'intraop',
    diagnosis: 'Acute appendicitis',
    age: 32,
    sex: 'Male',
    comorbidities: [],
    scheme: 'ASP',
    roomNumber: 'OT-3',
    procedureName: 'Appendectomy',
    surgeryDate: '2024-12-09',
    assignedDoctor: 'Dr. Kumar',
    isUrgent: true,
    urgentReason: 'Emergency surgery in progress',
    updateCounter: 8,
  },
  {
    id: '01HXYZ012JKL',
    name: 'Susan Davis',
    latestMrn: 'MRN004',
    department: 'Neurology',
    status: 'ACTIVE',
    pathway: 'consultation',
    currentState: 'onboarding',
    diagnosis: 'Chronic migraine - Evaluation',
    age: 38,
    sex: 'Female',
    comorbidities: ['Anxiety'],
    scheme: 'NAM',
    assignedDoctor: 'Dr. Gupta',
    isUrgent: false,
    updateCounter: 0,
  },
  {
    id: '01HXYZ345MNO',
    name: 'James Brown',
    latestMrn: 'MRN005',
    department: 'Cardiology',
    status: 'ACTIVE',
    pathway: 'surgical',
    currentState: 'discharge-init',
    diagnosis: 'Mitral valve regurgitation - Post MVR',
    age: 58,
    sex: 'Male',
    comorbidities: ['HTN', 'DM', 'AF'],
    scheme: 'EHS',
    roomNumber: '302',
    procedureName: 'MVR',
    surgeryDate: '2024-12-01',
    assignedDoctor: 'Dr. Sharma',
    isUrgent: false,
    updateCounter: 12,
    vitals: {
      hr: 72,
      systolic: 118,
      diastolic: 76,
      spo2: 97,
      temp: 98.2,
    },
  },
  {
    id: '01HXYZ678PQR',
    name: 'Patricia Garcia',
    latestMrn: 'MRN006',
    department: 'Gynecology',
    status: 'ACTIVE',
    pathway: 'surgical',
    currentState: 'discharge',
    diagnosis: 'Uterine fibroids - Post hysterectomy',
    age: 48,
    sex: 'Female',
    comorbidities: ['Anemia'],
    scheme: 'PAID',
    roomNumber: '108',
    procedureName: 'TAH',
    surgeryDate: '2024-12-03',
    assignedDoctor: 'Dr. Reddy',
    isUrgent: false,
    updateCounter: 15,
  },
];

// Simulated network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// API configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

export const patientApi = {
  // Get all patients
  async getPatients(): Promise<Patient[]> {
    // In production, replace with actual API call:
    // const response = await fetch(`${API_BASE_URL}/patients`);
    // return response.json();

    await delay(500); // Simulate network delay
    return [...mockPatients];
  },

  // Get single patient by ID
  async getPatient(id: string): Promise<Patient | null> {
    // In production:
    // const response = await fetch(`${API_BASE_URL}/patients/${id}`);
    // return response.json();

    await delay(300);
    return mockPatients.find(p => p.id === id) || null;
  },

  // Search patients
  async searchPatients(query: string): Promise<Patient[]> {
    await delay(200);
    const lowerQuery = query.toLowerCase();
    return mockPatients.filter(
      p =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.latestMrn?.toLowerCase().includes(lowerQuery) ||
        p.diagnosis?.toLowerCase().includes(lowerQuery)
    );
  },
};

export default patientApi;
