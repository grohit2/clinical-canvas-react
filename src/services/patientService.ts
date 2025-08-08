// Patient Service - handles patient data management
import { apiService, fetchWithFallback } from "./api";
import { API_CONFIG, FEATURE_FLAGS } from "@/config/api";
import { PatientMeta } from "@/types/models";
import { patientAssignments } from "@/data/authData";

// Mock patient data
const mockPatients: PatientMeta[] = [
  {
    id: "27e8d1ad",
    name: "Jane Doe",
    mrn: "MRN001234",
    qrCode: `${window.location.origin}/qr/27e8d1ad`,
    pathway: "surgical",
    currentState: "post-op",
    diagnosis: "Cholecystitis",
    comorbidities: ["HTN", "DM"],
    updateCounter: 5,
    lastUpdated: "2025-07-19T14:30:09Z",
    assignedDoctor: "Dr. Sarah Wilson",
    department: "surgery1",
    status: "ACTIVE",
  },
  {
    id: "3b9f2c1e",
    name: "John Smith",
    mrn: "MRN005678",
    qrCode: `${window.location.origin}/qr/3b9f2c1e`,
    pathway: "emergency",
    currentState: "ICU",
    diagnosis: "Acute MI",
    comorbidities: ["CAD", "HTN"],
    updateCounter: 12,
    lastUpdated: "2025-07-19T16:45:22Z",
    assignedDoctor: "Dr. Johnson",
    department: "cardiology",
    status: "ACTIVE",
  },
  {
    id: "8c4d5e2f",
    name: "Maria Garcia",
    mrn: "MRN009012",
    qrCode: `${window.location.origin}/qr/8c4d5e2f`,
    pathway: "consultation",
    currentState: "stable",
    diagnosis: "Osteoarthritis",
    comorbidities: ["Obesity"],
    updateCounter: 2,
    lastUpdated: "2025-07-19T11:20:45Z",
    assignedDoctor: "Dr. Sarah Wilson",
    department: "orthopedics",
    status: "ACTIVE",
  },
  {
    id: "9d6e7f3g",
    name: "Robert Wilson",
    mrn: "MRN003456",
    qrCode: `${window.location.origin}/qr/9d6e7f3g`,
    pathway: "surgical",
    currentState: "pre-op",
    diagnosis: "Appendicitis",
    comorbidities: [],
    updateCounter: 1,
    lastUpdated: "2025-07-19T09:15:30Z",
    assignedDoctor: "Dr. Sarah Wilson",
    department: "surgery1",
    status: "INACTIVE",
  },
  {
    id: "1a2b3c4d",
    name: "Sarah Johnson",
    mrn: "MRN007890",
    qrCode: `${window.location.origin}/qr/1a2b3c4d`,
    pathway: "emergency",
    currentState: "stable",
    diagnosis: "Pneumonia",
    comorbidities: ["Asthma"],
    updateCounter: 8,
    lastUpdated: "2025-07-19T13:50:18Z",
    assignedDoctor: "Dr. Johnson",
    department: "emergency",
    status: "ACTIVE",
  },
];

// Mock patient QR data
const mockPatientData = {
  "27e8d1ad": {
    id: "27e8d1ad",
    name: "Jane Doe",
    age: 45,
    gender: "Female",
    diagnosis: "Cholecystitis",
    currentState: "post-op",
    pathway: "surgical",
    admissionDate: "2025-07-15",
    assignedDoctor: "Dr. Sarah Wilson",
    room: "Room 302",
    allergies: ["Penicillin", "Latex"],
    medications: ["Ibuprofen 400mg", "Omeprazole 20mg"],
    vitals: {
      heartRate: "72 bpm",
      bloodPressure: "120/80 mmHg",
      temperature: "98.6°F",
      oxygenSaturation: "98%",
    },
  },
  "3b9f2c1e": {
    id: "3b9f2c1e",
    name: "John Smith",
    age: 58,
    gender: "Male",
    diagnosis: "Acute MI",
    currentState: "ICU",
    pathway: "emergency",
    admissionDate: "2025-07-17",
    assignedDoctor: "Dr. Johnson",
    room: "ICU-05",
    allergies: ["Aspirin"],
    medications: ["Metoprolol 25mg", "Atorvastatin 40mg", "Clopidogrel 75mg"],
    vitals: {
      heartRate: "85 bpm",
      bloodPressure: "140/90 mmHg",
      temperature: "99.1°F",
      oxygenSaturation: "95%",
    },
  },
};

// Mock timeline data
const mockTimelines: Record<string, any[]> = {
  "27e8d1ad": [
    {
      id: "1",
      timestamp: "2025-07-19T14:30:09Z",
      type: "medication",
      description: "Administered pain medication",
      staff: "Dr. Sarah Wilson",
      category: "treatment",
    },
    {
      id: "2",
      timestamp: "2025-07-19T12:00:00Z",
      type: "surgery",
      description: "Laparoscopic cholecystectomy completed successfully",
      staff: "Dr. Sarah Wilson",
      category: "procedure",
    },
  ],
  "3b9f2c1e": [
    {
      id: "3",
      timestamp: "2025-07-19T16:45:22Z",
      type: "vitals",
      description: "Vital signs monitoring - stable condition",
      staff: "Nurse Johnson",
      category: "monitoring",
    },
  ],
};

export const patientService = {
  async getPatients(): Promise<PatientMeta[]> {
    return fetchWithFallback(
      () => apiService.get<PatientMeta[]>(API_CONFIG.PATIENTS.LIST),
      mockPatients,
      FEATURE_FLAGS.ENABLE_PATIENTS_API,
    );
  },

  async getPatientById(patientId: string): Promise<PatientMeta | null> {
    const mockPatient = mockPatients.find((p) => p.id === patientId) || null;

    return fetchWithFallback(
      () =>
        apiService.get<PatientMeta>(API_CONFIG.PATIENTS.DETAIL, {
          id: patientId,
        }),
      mockPatient,
      FEATURE_FLAGS.ENABLE_PATIENTS_API,
    );
  },

  async getPatientQRData(patientId: string): Promise<any> {
    const mockData =
      mockPatientData[patientId as keyof typeof mockPatientData] || null;

    return fetchWithFallback(
      () => apiService.get(API_CONFIG.PATIENTS.QR_DATA, { id: patientId }),
      mockData,
      FEATURE_FLAGS.ENABLE_PATIENTS_API,
    );
  },

  async getPatientTimeline(patientId: string): Promise<any[]> {
    const mockTimeline = mockTimelines[patientId] || [];

    return fetchWithFallback(
      () =>
        apiService.get<any[]>(API_CONFIG.PATIENTS.TIMELINE, { id: patientId }),
      mockTimeline,
      FEATURE_FLAGS.ENABLE_PATIENTS_API,
    );
  },

  async createPatient(
    patientData: Omit<PatientMeta, "id" | "qrCode">,
  ): Promise<PatientMeta> {
    const newPatient: PatientMeta = {
      ...patientData,
      id: Math.random().toString(36).substr(2, 8),
      qrCode: `${window.location.origin}/qr/${Math.random().toString(36).substr(2, 8)}`,
    };

    return fetchWithFallback(
      () =>
        apiService.post<PatientMeta>(API_CONFIG.PATIENTS.CREATE, patientData),
      newPatient,
      FEATURE_FLAGS.ENABLE_PATIENTS_API,
    );
  },

  async updatePatient(
    patientId: string,
    updates: Partial<PatientMeta>,
  ): Promise<PatientMeta> {
    const mockUpdatedPatient = {
      ...mockPatients.find((p) => p.id === patientId)!,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };

    return fetchWithFallback(
      () =>
        apiService.put<PatientMeta>(API_CONFIG.PATIENTS.UPDATE, updates, {
          id: patientId,
        }),
      mockUpdatedPatient,
      FEATURE_FLAGS.ENABLE_PATIENTS_API,
    );
  },

  async deletePatient(patientId: string): Promise<void> {
    return fetchWithFallback(
      () =>
        apiService.delete<void>(API_CONFIG.PATIENTS.DELETE, { id: patientId }),
      undefined,
      FEATURE_FLAGS.ENABLE_PATIENTS_API,
    );
  },

  async getPatientAssignments(): Promise<Record<string, string>> {
    return fetchWithFallback(
      () =>
        apiService.get<Record<string, string>>(API_CONFIG.PATIENTS.ASSIGNMENTS),
      patientAssignments,
      FEATURE_FLAGS.ENABLE_PATIENTS_API,
    );
  },
};
