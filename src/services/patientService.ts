// Patient Service - handles patient data management
import { apiService, fetchWithFallback } from "./api";
import { API_CONFIG, FEATURE_FLAGS } from "@/config/api";
import { PatientMeta, TimelineEntry, PatientDemographics } from "@/types/models";
import { MOCK_PATIENT_DEMOGRAPHICS, MOCK_TIMELINES } from "@/mocks/patientExtras";

// Mock patient data
const mockPatients: PatientMeta[] = [
  {
    id: "27e8d1ad",
    name: "Jane Doe",
    mrn: "MRN001234",
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
const mockTimelines: Record<string, unknown[]> = {
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

type ListParams = { department?: string };

export const patientService = {
  async getPatients(params?: ListParams): Promise<PatientMeta[]> {
    return fetchWithFallback(
      async () => {
        const { data } = await apiService.get<PatientMeta[]>(API_CONFIG.PATIENTS.LIST, params);
        return { data, success: true };
      },
      mockPatients,
      FEATURE_FLAGS.ENABLE_PATIENTS_API,
    );
  },

  async getPatientById(mrn: string): Promise<PatientMeta | null> {
    const mockPatient = mockPatients.find((p) => p.id === mrn || p.mrn === mrn) || null;

      return fetchWithFallback(
        async () => {
          const { data } = await apiService.get<PatientMeta>(
            API_CONFIG.PATIENTS.DETAIL,
            { id: mrn }
          );
          return { data, success: true };
        },
        mockPatient,
        FEATURE_FLAGS.ENABLE_PATIENTS_API,
      );
    },

  // QR temporarily disabled
  // async getPatientQRData(patientId: string): Promise<unknown> {
  //   const mockData =
  //     mockPatientData[patientId as keyof typeof mockPatientData] || null;
  //   return fetchWithFallback(
  //     () => apiService.get(API_CONFIG.PATIENTS.QR_DATA, { id: patientId }),
  //     mockData,
  //     FEATURE_FLAGS.ENABLE_PATIENTS_API,
  //   );
  // },

  // Updated: typed timeline with fallback to mocks
  async getPatientTimeline(patientId: string): Promise<TimelineEntry[]> {
    const mockTimeline = MOCK_TIMELINES[patientId] || [];

    return fetchWithFallback(
      () =>
        apiService.get<TimelineEntry[]>(API_CONFIG.PATIENTS.TIMELINE, { id: patientId }),
      mockTimeline,
      FEATURE_FLAGS.ENABLE_PATIENTS_API,
    );
  },

  // New: demographics with fallback to mocks
  async getPatientDemographics(mrn: string): Promise<PatientDemographics> {
    const mock =
      MOCK_PATIENT_DEMOGRAPHICS[mrn] ?? {
        mrn,
        age: undefined,
        room: undefined,
        allergies: [],
        nextMilestone: undefined,
        nextMilestoneTime: undefined,
        lengthOfStay: undefined,
        admissionDate: undefined,
        emergencyContact: undefined,
      };

    return fetchWithFallback(
      async () => {
        const r = await apiService.get<PatientDemographics>(API_CONFIG.PATIENTS.DEMOGRAPHICS, { id: mrn });
        return r;
      },
      mock,
      FEATURE_FLAGS.ENABLE_PATIENTS_API,
    );
  },

  async createPatient(
    payload: {
      mrn: string;
      name: string;
      department: string;
    } & Partial<PatientMeta>,
  ): Promise<PatientMeta> {
    const fallbackPatient: PatientMeta = {
      id: payload.mrn,
      name: payload.name,
      mrn: payload.mrn,
      pathway: payload.pathway || "consultation",
      currentState: payload.currentState || "stable",
      diagnosis: payload.diagnosis || "",
      comorbidities: payload.comorbidities || [],
      updateCounter: 0,
      lastUpdated: new Date().toISOString(),
      assignedDoctor: payload.assignedDoctor || "",
      department: payload.department,
      status: "ACTIVE",
    };

    return fetchWithFallback(
      async () => {
        type CreateResponse = { message?: string; mrn: string; patient?: PatientMeta };
        const { data } = await apiService.post<CreateResponse>(
          API_CONFIG.PATIENTS.CREATE,
          payload
        );
        if (data.patient) {
          return { data: data.patient, success: true };
        }
        const { data: fetched } = await apiService.get<PatientMeta>(
          API_CONFIG.PATIENTS.DETAIL,
          { id: data.mrn || payload.mrn }
        );
        return { data: fetched, success: true };
      },
      fallbackPatient,
      FEATURE_FLAGS.ENABLE_PATIENTS_API,
    );
  },

  async updatePatient(mrn: string, updates: Partial<PatientMeta>): Promise<PatientMeta> {
    const mockUpdatedPatient = {
      ...mockPatients.find((p) => p.id === mrn || p.mrn === mrn)!,
      ...updates,
      lastUpdated: new Date().toISOString(),
    };

    return fetchWithFallback(
      async () => {
        const { data } = await apiService.put<PatientMeta>(
          API_CONFIG.PATIENTS.UPDATE,
          updates,
          { id: mrn }
        );
        return { data, success: true };
      },
      mockUpdatedPatient,
      FEATURE_FLAGS.ENABLE_PATIENTS_API,
    );
  },

  async deletePatient(mrn: string): Promise<void> {
    return fetchWithFallback(
      async () => {
        await apiService.delete(API_CONFIG.PATIENTS.DELETE, { id: mrn });
        return { data: undefined, success: true };
      },
      undefined as unknown as void,
      FEATURE_FLAGS.ENABLE_PATIENTS_API,
    );
  },

};
