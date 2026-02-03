// Profile types - Pure TypeScript, no React/RN imports

export type UserRole = 'doctor' | 'nurse' | 'admin' | 'staff';

export interface UserStats {
  patientsToday: number;
  tasksCompleted: number;
  hoursWorked: number;
}

export interface UserNotification {
  id: string;
  patientId: string;
  patientName: string;
  taskType: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  dueDate: string;
  description: string;
  timeAgo: string;
}

export interface PersonalInfo {
  fullName: string;
  gender: string;
  dateOfBirth: Date | null;
  profilePicture: string | null;
  address: string;
  emergencyContact: string;
}

export interface ProfessionalInfo {
  specialization: string;
  department: string;
  yearsOfExperience: number;
  qualifications: string[];
  medicalRegistrationNumber: string;
  workingHospital: string;
  consultationFee: number;
  languages: string[];
  awards: string[];
  research: string[];
}

export interface TimeSlot {
  start: string;
  end: string;
  label: string;
  maxPatients: number;
}

export interface VacationDate {
  start: string;
  end: string;
  reason: string;
}

export interface Availability {
  workingDays: string[];
  timeSlots: TimeSlot[];
  maxPatientsPerSlot: number;
  vacationDates: VacationDate[];
  specialNotes: string;
}

export interface SecurityInfo {
  lastLogin: string;
  twoFactorEnabled: boolean;
  securityQuestions: string[];
  sessionHistory: Array<{
    date: string;
    time: string;
    device: string;
    location: string;
  }>;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  appointmentReminders: boolean;
  labResults: boolean;
  urgentAlerts: boolean;
}

export interface PrivacyPreferences {
  profileVisibility: 'public' | 'colleagues' | 'private';
  showOnlineStatus: boolean;
  allowDirectMessages: boolean;
}

export interface UserPreferences {
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12-hour' | '24-hour';
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
}

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  department: string;
  email: string;
  phone: string;
  shift: string;
  permissions: string[];
  stats: UserStats;
  notifications: UserNotification[];
  personalInfo: PersonalInfo;
  professionalInfo: ProfessionalInfo;
  availability: Availability;
  securityInfo: SecurityInfo;
  preferences: UserPreferences;
}

// Helper to get priority color class
export function getPriorityColorClass(priority: UserNotification['priority']): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}
