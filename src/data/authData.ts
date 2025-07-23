// Backend data structure for doctor authentication and patient assignments

export interface Doctor {
  id: string;
  email: string;
  password: string;
  name: string;
  specialization: string;
  department: string;
  avatar: string;
  phone: string;
  assignedPatients: string[]; // Array of patient IDs
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// Mock doctors with login credentials
export const mockDoctors: Doctor[] = [
  {
    id: 'doc1',
    email: 'sarah.wilson@hospital.com',
    password: 'password123',
    name: 'Dr. Sarah Wilson',
    specialization: 'Orthopedic Surgery',
    department: 'Orthopedics',
    avatar: '/placeholder.svg',
    phone: '+1 (555) 123-4567',
    assignedPatients: ['2a1b3c4d', '3b9f2c1e', '7c8d9e0f', '9d6e7f3g']
  },
  {
    id: 'doc2',
    email: 'john.smith@hospital.com',
    password: 'password456',
    name: 'Dr. John Smith',
    specialization: 'Cardiology',
    department: 'Cardiology',
    avatar: '/placeholder.svg',
    phone: '+1 (555) 987-6543',
    assignedPatients: ['1a2b3c4d', '5e6f7g8h', '4d5e6f7g']
  },
  {
    id: 'doc3',
    email: 'emily.chen@hospital.com',
    password: 'password789',
    name: 'Dr. Emily Chen',
    specialization: 'General Surgery',
    department: 'Surgery',
    avatar: '/placeholder.svg',
    phone: '+1 (555) 456-7890',
    assignedPatients: ['6f7g8h9i', '8h9i0j1k']
  }
];

// Login credentials for easy reference
export const loginCredentials = [
  { email: 'sarah.wilson@hospital.com', password: 'password123' },
  { email: 'john.smith@hospital.com', password: 'password456' },
  { email: 'emily.chen@hospital.com', password: 'password789' }
];

// Authentication service
export class AuthService {
  private static currentDoctor: Doctor | null = null;

  static login(credentials: LoginCredentials): Doctor | null {
    const doctor = mockDoctors.find(
      d => d.email === credentials.email && d.password === credentials.password
    );
    
    if (doctor) {
      this.currentDoctor = doctor;
      localStorage.setItem('currentDoctor', JSON.stringify(doctor));
      return doctor;
    }
    return null;
  }

  static logout(): void {
    this.currentDoctor = null;
    localStorage.removeItem('currentDoctor');
  }

  static getCurrentDoctor(): Doctor | null {
    if (this.currentDoctor) {
      return this.currentDoctor;
    }
    
    const stored = localStorage.getItem('currentDoctor');
    if (stored) {
      this.currentDoctor = JSON.parse(stored);
      return this.currentDoctor;
    }
    
    return null;
  }

  static isAuthenticated(): boolean {
    return this.getCurrentDoctor() !== null;
  }
}