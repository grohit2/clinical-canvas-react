// Backend data for authentication and doctors
export interface Doctor {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  department: string;
  phone: string;
  shift: string;
  permissions: string[];
  specialization: string;
  yearsOfExperience: number;
  qualifications: string[];
  medicalRegistrationNumber: string;
  workingHospital: string;
  consultationFee: number;
  languages: string[];
  awards: string[];
  research: string[];
  profilePicture?: string;
  gender: string;
  dateOfBirth: string;
  address: string;
  emergencyContact: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  doctor: Doctor;
  token: string;
}

// Backend doctor database
export const doctorsDatabase: Doctor[] = [
  {
    id: 'dr001',
    name: 'Dr. Sarah Wilson',
    email: 'sarah.wilson@hospital.com',
    password: 'password123',
    role: 'doctor',
    department: 'Cardiothoracic Surgery',
    phone: '+1-555-0789',
    shift: 'Day Shift (7AM - 7PM)',
    permissions: ['prescribe', 'approve', 'admin', 'surgery'],
    specialization: 'Cardiothoracic Surgery',
    yearsOfExperience: 15,
    qualifications: [
      'MBBS - All India Institute of Medical Sciences (2008)',
      'MS General Surgery - King George Medical University (2012)',
      'MCh Cardiothoracic Surgery - Postgraduate Institute (2015)',
      'Fellowship in Minimally Invasive Cardiac Surgery - Cleveland Clinic (2016)'
    ],
    medicalRegistrationNumber: 'MCI-12345-2010',
    workingHospital: 'City General Hospital - Cardiac Wing, Building A, Floor 5',
    consultationFee: 1500,
    languages: ['English', 'Hindi', 'Spanish'],
    awards: ['Best Cardiac Surgeon 2022', 'Excellence in Patient Care 2021'],
    research: ['Published 25+ research papers in cardiovascular surgery', 'Lead researcher in minimally invasive cardiac procedures'],
    gender: 'Female',
    dateOfBirth: '1985-03-15',
    address: '123 Medical Plaza, Downtown, City 10001',
    emergencyContact: '+1-555-0123 (Dr. John Wilson - Spouse)'
  },
  {
    id: 'dr002',
    name: 'Dr. Johnson',
    email: 'johnson@hospital.com',
    password: 'password456',
    role: 'doctor',
    department: 'Emergency Medicine',
    phone: '+1-555-0890',
    shift: 'Night Shift (7PM - 7AM)',
    permissions: ['prescribe', 'approve', 'emergency'],
    specialization: 'Emergency Medicine',
    yearsOfExperience: 12,
    qualifications: [
      'MBBS - Johns Hopkins University (2012)',
      'MD Emergency Medicine - Harvard Medical School (2016)',
      'Fellowship in Trauma Surgery - Mayo Clinic (2017)'
    ],
    medicalRegistrationNumber: 'MCI-67890-2012',
    workingHospital: 'City General Hospital - Emergency Department, Ground Floor',
    consultationFee: 1200,
    languages: ['English', 'French'],
    awards: ['Outstanding Emergency Physician 2023', 'Life Saver Award 2022'],
    research: ['Published 18+ research papers in emergency medicine', 'Expert in trauma care protocols'],
    gender: 'Male',
    dateOfBirth: '1988-07-22',
    address: '456 Hospital Drive, Medical District, City 10002',
    emergencyContact: '+1-555-0456 (Dr. Lisa Johnson - Spouse)'
  },
  {
    id: 'dr003',
    name: 'Dr. Emily Chen',
    email: 'emily.chen@hospital.com',
    password: 'password789',
    role: 'doctor',
    department: 'Internal Medicine',
    phone: '+1-555-0901',
    shift: 'Day Shift (8AM - 6PM)',
    permissions: ['prescribe', 'approve', 'consultation'],
    specialization: 'Internal Medicine & Endocrinology',
    yearsOfExperience: 10,
    qualifications: [
      'MBBS - Stanford University (2014)',
      'MD Internal Medicine - UCLA (2018)',
      'Fellowship in Endocrinology - UCSF (2020)'
    ],
    medicalRegistrationNumber: 'MCI-11111-2014',
    workingHospital: 'City General Hospital - Internal Medicine, Building B, Floor 3',
    consultationFee: 1000,
    languages: ['English', 'Chinese', 'Spanish'],
    awards: ['Excellence in Diabetes Care 2023', 'Research Innovation Award 2022'],
    research: ['Published 15+ research papers in endocrinology', 'Specialist in diabetes management'],
    gender: 'Female',
    dateOfBirth: '1990-11-08',
    address: '789 Medical Avenue, Healthcare City, City 10003',
    emergencyContact: '+1-555-0789 (Dr. Michael Chen - Brother)'
  }
];

// Patient assignments to doctors
export const patientAssignments: { [patientId: string]: string } = {
  '27e8d1ad': 'dr001', // Jane Doe -> Dr. Sarah Wilson
  '3b9f2c1e': 'dr002', // John Smith -> Dr. Johnson
  '8c4d5e2f': 'dr001', // Maria Garcia -> Dr. Sarah Wilson
  '9d6e7f3g': 'dr001', // Robert Wilson -> Dr. Sarah Wilson
  '1a2b3c4d': 'dr002', // Sarah Johnson -> Dr. Johnson
};

// Mock authentication functions
export const loginUser = async (credentials: LoginCredentials): Promise<AuthUser | null> => {
  const doctor = doctorsDatabase.find(
    doc => doc.email === credentials.email && doc.password === credentials.password
  );
  
  if (doctor) {
    return {
      doctor,
      token: `token_${doctor.id}_${Date.now()}`
    };
  }
  
  return null;
};

export const getCurrentUser = (): AuthUser | null => {
  const userData = localStorage.getItem('currentUser');
  return userData ? JSON.parse(userData) : null;
};

export const logoutUser = (): void => {
  localStorage.removeItem('currentUser');
};