export interface Patient { id: string; mrn: string; name: string; department: string;
  status: "ACTIVE"|"INACTIVE"; pathway?: "surgical"|"consultation"|"emergency";
  currentState?: string; diagnosis?: string; age?: number; sex?: string;
  comorbidities: string[]; assignedDoctorId?: string; filesUrl?: string|null; lastUpdated?: string; }

export interface Task { taskId: string; patientId: string; title: string;
  type: "lab"|"medication"|"procedure"|"assessment"|"discharge";
  due: string; assigneeId: string; status: "open"|"in-progress"|"done"|"cancelled";
  priority: "low"|"medium"|"high"|"urgent"; recurring: boolean;
  recurrence?: { frequency: string; until?: string; daysOfWeek?: string[] } | null;
  details?: Record<string, any> | null; department?: string|null; createdAt?: string; updatedAt?: string; }

export interface Note { noteId: string; patientId: string; authorId: string;
  category: "doctorNote"|"nurseNote"|"pharmacy"|"discharge";
  content: string; createdAt: string; updatedAt?: string; deleted?: boolean; }

export interface Medication { medId: string; patientId: string; name: string; dose: string;
  route: string; freq: string; start: string; end?: string|null; priority: "routine"|"important"|"critical";
  scheduleTimes: string[]; createdAt?: string; updatedAt?: string; }

export interface Doctor { doctorId: string; name: string; role?: string; department?: string|null;
  avatar?: string|null; contactInfo: Record<string, string>; permissions: string[]; email: string;
  createdAt?: string; updatedAt?: string; }