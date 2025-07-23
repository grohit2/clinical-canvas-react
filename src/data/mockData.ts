import { PatientMeta, StaffProfile, Task, TimelineEntry, LabResult, Medication, Note, Notification } from "@/types/models";

// Enhanced Patient Data with new pathway states
export const mockPatients: PatientMeta[] = [
  {
    id: '27e8d1ad',
    name: 'Sarah Johnson',
    qrCode: 'QR27e8d1ad',
    pathway: 'surgical',
    currentState: 'preop',
    diagnosis: 'Acute appendicitis',
    comorbidities: ['Type 2 diabetes', 'Hypertension'],
    updateCounter: 3,
    lastUpdated: '2025-07-23T14:30:00Z',
    assignedDoctor: 'Dr. Sarah Wilson',
    assignedNurse: 'Nurse Lisa Johnson',
    room: 'A-204',
    age: 34,
    mrn: 'MRN001234',
    allergies: ['Penicillin', 'Latex'],
    admissionDate: '2025-07-22T10:00:00Z',
    priority: 'high'
  },
  {
    id: '3b9f2c1e',
    name: 'Michael Brown',
    qrCode: 'QR3b9f2c1e',
    pathway: 'consultation',
    currentState: 'wait',
    diagnosis: 'Chronic back pain',
    comorbidities: ['Arthritis'],
    updateCounter: 1,
    lastUpdated: '2025-07-23T10:15:00Z',
    assignedDoctor: 'Dr. Michael Chen',
    room: 'B-102',
    age: 56,
    mrn: 'MRN001235',
    allergies: [],
    admissionDate: '2025-07-23T08:30:00Z',
    priority: 'medium'
  },
  {
    id: '8c4d5e2f',
    name: 'Emily Davis',
    qrCode: 'QR8c4d5e2f',
    pathway: 'emergency',
    currentState: 'treatment',
    diagnosis: 'Cardiac arrhythmia',
    comorbidities: ['Coronary artery disease', 'Hyperlipidemia'],
    updateCounter: 5,
    lastUpdated: '2025-07-23T16:45:00Z',
    assignedDoctor: 'Dr. Robert Patel',
    assignedNurse: 'Nurse Maria Garcia',
    room: 'ER-3',
    age: 68,
    mrn: 'MRN001236',
    allergies: ['Aspirin'],
    admissionDate: '2025-07-23T15:20:00Z',
    priority: 'urgent'
  },
  {
    id: '5a7f1b3c',
    name: 'Robert Wilson',
    qrCode: 'QR5a7f1b3c',
    pathway: 'surgical',
    currentState: 'post-op',
    diagnosis: 'Hip replacement',
    comorbidities: ['Osteoarthritis'],
    updateCounter: 2,
    lastUpdated: '2025-07-23T12:20:00Z',
    assignedDoctor: 'Dr. Sarah Wilson',
    assignedNurse: 'Nurse Lisa Johnson',
    room: 'C-301',
    age: 72,
    mrn: 'MRN001237',
    allergies: [],
    admissionDate: '2025-07-20T07:00:00Z',
    priority: 'medium'
  },
  {
    id: '1d9e4f8b',
    name: 'Jennifer Lee',
    qrCode: 'QR1d9e4f8b',
    pathway: 'consultation',
    currentState: 'consult',
    diagnosis: 'Migraine evaluation',
    comorbidities: [],
    updateCounter: 1,
    lastUpdated: '2025-07-23T11:30:00Z',
    assignedDoctor: 'Dr. Michael Chen',
    room: 'B-205',
    age: 29,
    mrn: 'MRN001238',
    allergies: ['Sulfa drugs'],
    admissionDate: '2025-07-23T09:00:00Z',
    priority: 'low'
  }
];

// Staff Profiles
export const mockStaff: StaffProfile[] = [
  {
    id: 'S001',
    name: 'Dr. Sarah Wilson',
    role: 'doctor',
    avatar: '/placeholder.svg',
    contactInfo: {
      phone: '+1-555-0101',
      email: 'sarah.wilson@hospital.com'
    },
    permissions: ['view-patients', 'edit-patients', 'prescribe', 'discharge']
  },
  {
    id: 'S002',
    name: 'Dr. Michael Chen',
    role: 'doctor',
    avatar: '/placeholder.svg',
    contactInfo: {
      phone: '+1-555-0102',
      email: 'michael.chen@hospital.com'
    },
    permissions: ['view-patients', 'edit-patients', 'prescribe']
  },
  {
    id: 'S003',
    name: 'Nurse Lisa Johnson',
    role: 'nurse',
    avatar: '/placeholder.svg',
    contactInfo: {
      phone: '+1-555-0103',
      email: 'lisa.johnson@hospital.com'
    },
    permissions: ['view-patients', 'administer-medication', 'vital-signs']
  },
  {
    id: 'S004',
    name: 'Dr. Robert Patel',
    role: 'doctor',
    avatar: '/placeholder.svg',
    contactInfo: {
      phone: '+1-555-0104',
      email: 'robert.patel@hospital.com'
    },
    permissions: ['view-patients', 'edit-patients', 'prescribe', 'emergency']
  },
  {
    id: 'S005',
    name: 'Nurse Maria Garcia',
    role: 'nurse',
    avatar: '/placeholder.svg',
    contactInfo: {
      phone: '+1-555-0105',
      email: 'maria.garcia@hospital.com'
    },
    permissions: ['view-patients', 'administer-medication', 'wound-care']
  }
];

// Timeline Entries
export const mockTimelines: TimelineEntry[] = [
  {
    patientId: '27e8d1ad',
    state: 'onboard',
    dateIn: '2025-07-22T10:00:00Z',
    dateOut: '2025-07-22T12:00:00Z',
    checklistIn: ['Registration completed', 'Insurance verified', 'Medical history taken'],
    checklistOut: ['Admission paperwork', 'Room assigned', 'Preop scheduled']
  },
  {
    patientId: '27e8d1ad',
    state: 'preop',
    dateIn: '2025-07-22T12:00:00Z',
    checklistIn: ['Surgical consent signed', 'Anesthesia consultation', 'Lab work completed'],
    checklistOut: []
  }
];

// Enhanced Tasks with new categories
export const mockTasks: Task[] = [
  {
    taskId: 'task1',
    patientId: '27e8d1ad',
    title: 'Pre-operative blood work',
    type: 'lab',
    due: '2025-07-24T08:00:00Z',
    assigneeId: 'S001',
    assigneeRole: 'doctor',
    status: 'open',
    priority: 'high',
    recurring: false,
    description: 'Complete CBC, BMP, PT/PTT before surgery',
    estimatedDuration: 30
  },
  {
    taskId: 'task2',
    patientId: '3b9f2c1e',
    title: 'Pain medication administration',
    type: 'medication',
    due: '2025-07-23T18:00:00Z',
    assigneeId: 'S003',
    assigneeRole: 'nurse',
    status: 'in-progress',
    priority: 'urgent',
    recurring: true,
    recurringFreq: 'daily',
    description: 'Tramadol 50mg every 6 hours',
    estimatedDuration: 15
  },
  {
    taskId: 'task3',
    patientId: '8c4d5e2f',
    title: 'Cardiac monitoring check',
    type: 'doctor',
    due: '2025-07-23T20:00:00Z',
    assigneeId: 'S004',
    assigneeRole: 'doctor',
    status: 'open',
    priority: 'urgent',
    recurring: true,
    recurringFreq: 'daily',
    description: 'Monitor EKG, check vitals every 2 hours',
    estimatedDuration: 20
  }
];

// Lab Results
export const mockLabResults: LabResult[] = [
  {
    labId: 'lab1',
    patientId: '27e8d1ad',
    name: 'Complete Blood Count',
    values: [
      {
        date: '2025-07-23T08:00:00Z',
        value: 12.5,
        unit: 'g/dL',
        range: '12.0-16.0'
      }
    ],
    abnormalFlag: false,
    resultStatus: 'completed',
    reportedAt: '2025-07-23T10:30:00Z'
  }
];

// Medications
export const mockMedications: Medication[] = [
  {
    medId: 'med1',
    patientId: '27e8d1ad',
    name: 'Metformin',
    dose: '500mg',
    route: 'PO',
    freq: 'BID',
    start: '2025-07-22T08:00:00Z',
    end: '2025-07-30T08:00:00Z',
    priority: 'routine',
    scheduleTimes: ['08:00', '20:00']
  }
];

// Notes
export const mockNotes: Note[] = [
  {
    noteId: 'note1',
    patientId: '27e8d1ad',
    authorId: 'S001',
    category: 'doctorNote',
    content: 'Patient presents with acute appendicitis. Scheduled for laparoscopic appendectomy.',
    createdAt: '2025-07-22T14:00:00Z'
  }
];

// Notifications
export const mockNotifications: Notification[] = [
  {
    id: 'notif1',
    type: 'lab',
    title: 'Lab Results Available',
    message: 'CBC results for Sarah Johnson are now available',
    timestamp: '2025-07-23T10:30:00Z',
    read: false,
    priority: 'medium',
    patientId: '27e8d1ad'
  },
  {
    id: 'notif2',
    type: 'task',
    title: 'Urgent Task Due',
    message: 'Cardiac monitoring check due for Emily Davis',
    timestamp: '2025-07-23T19:45:00Z',
    read: false,
    priority: 'urgent',
    patientId: '8c4d5e2f',
    taskId: 'task3'
  },
  {
    id: 'notif3',
    type: 'whatsapp',
    title: 'WhatsApp Update',
    message: 'Family member requested update on Michael Brown',
    timestamp: '2025-07-23T16:20:00Z',
    read: true,
    priority: 'low',
    patientId: '3b9f2c1e'
  },
  {
    id: 'notif4',
    type: 'approval',
    title: 'Approval Required',
    message: 'Discharge approval needed for Robert Wilson',
    timestamp: '2025-07-23T15:10:00Z',
    read: false,
    priority: 'high',
    patientId: '5a7f1b3c'
  }
];