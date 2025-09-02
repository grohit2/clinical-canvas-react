import type { Patient, Task, Note, Medication, Doctor, TimelineEntry } from '@/types/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snake = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    result[snake] = value as unknown;
  }
  return result;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  patients: {
    list: (department?: string) =>
      request<Patient[]>(`/patients${department ? `?department=${encodeURIComponent(department)}` : ''}`),
    get: (uid: string) => request<Patient>(`/patients/${uid}`),
    timeline: (uid: string) => request<TimelineEntry[]>(`/patients/${uid}/timeline`),
    create: (
      data: Omit<Patient, 'id' | 'lastUpdated' | 'status' | 'latestMrn'> & {
        mrn: string;
        name: string;
        department: string;
      },
    ) =>
      request<{ patientId: string; patient: Patient }>(`/patients`, {
        method: 'POST',
        body: JSON.stringify(toSnakeCase(data)),
      }),
    update: (uid: string, data: Partial<Patient>) =>
      request<{ patient: Patient }>(`/patients/${uid}`, {
        method: 'PUT',
        body: JSON.stringify(toSnakeCase(data as Record<string, unknown>)),
      }),
    remove: (uid: string) =>
      request<{ patient: Patient }>(`/patients/${uid}`, {
        method: 'DELETE',
      }),
  },
  tasks: {
    list: (uid: string, status?: string, limit?: number) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (limit) params.append('limit', String(limit));
      const query = params.size ? `?${params.toString()}` : '';
      return request<Task[]>(`/patients/${uid}/tasks${query}`);
    },
    create: (uid: string, data: Omit<Task, 'taskId' | 'createdAt' | 'updatedAt'>) =>
      request<{ message: string; task: Task }>(`/patients/${uid}/tasks`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (uid: string, taskId: string, data: Partial<Task>) =>
      request<{ message: string; task: Task }>(`/patients/${uid}/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    remove: (uid: string, taskId: string) =>
      request<{ message: string }>(`/patients/${uid}/tasks/${taskId}`, {
        method: 'DELETE',
      }),
    listByDepartment: (department: string, status = 'open', assigneeId?: string, limit?: number) => {
      const params = new URLSearchParams({ department, status });
      if (assigneeId) params.append('assigneeId', assigneeId);
      if (limit) params.append('limit', String(limit));
      return request<Task[]>(`/tasks?${params.toString()}`);
    },
  },
  notes: {
    list: (uid: string, limit?: number, cursor?: string, includeDeleted?: boolean) => {
      const params = new URLSearchParams();
      if (limit) params.append('limit', String(limit));
      if (cursor) params.append('cursor', cursor);
      if (includeDeleted) params.append('includeDeleted', includeDeleted ? '1' : '0');
      const query = params.size ? `?${params.toString()}` : '';
      return request<{ items: Note[]; nextCursor: string | null }>(`/patients/${uid}/notes${query}`);
    },
    create: (uid: string, data: Omit<Note, 'noteId' | 'createdAt' | 'updatedAt' | 'deleted'>) =>
      request<{ message: string; note: Note }>(`/patients/${uid}/notes`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (uid: string, noteId: string, data: Partial<Note>) =>
      request<{ message: string; note: Note }>(`/patients/${uid}/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    remove: (uid: string, noteId: string) =>
      request<{ message: string }>(`/patients/${uid}/notes/${noteId}`, {
        method: 'DELETE',
      }),
  },
  meds: {
    list: (uid: string, active?: boolean, limit?: number, cursor?: string) => {
      const params = new URLSearchParams();
      if (active !== undefined) params.append('active', active ? '1' : '0');
      if (limit) params.append('limit', String(limit));
      if (cursor) params.append('cursor', cursor);
      const query = params.size ? `?${params.toString()}` : '';
      return request<{ items: Medication[]; nextCursor: string | null }>(`/patients/${uid}/meds${query}`);
    },
    create: (uid: string, data: Omit<Medication, 'medId' | 'createdAt' | 'updatedAt'>) =>
      request<{ message: string; med: Medication }>(`/patients/${uid}/meds`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (uid: string, medId: string, data: Partial<Medication>) =>
      request<{ message: string; med: Medication }>(`/patients/${uid}/meds/${medId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    remove: (uid: string, medId: string) =>
      request<{ message: string; med: Medication }>(`/patients/${uid}/meds/${medId}`, {
        method: 'DELETE',
      }),
  },
  doctors: {
    list: (department: string, limit?: number) => {
      const params = new URLSearchParams({ department });
      if (limit) params.append('limit', String(limit));
      return request<Doctor[]>(`/doctors?${params.toString()}`);
    },
    get: (doctorId: string) => request<Doctor>(`/doctors/${doctorId}`),
    create: (data: Omit<Doctor, 'doctorId' | 'createdAt' | 'updatedAt'>) =>
      request<{ message: string; doctor: Doctor }>(`/doctors`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (doctorId: string, data: Partial<Doctor>) =>
      request<{ message: string; doctor: Doctor }>(`/doctors/${doctorId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    remove: (doctorId: string) =>
      request<{ message: string }>(`/doctors/${doctorId}`, {
        method: 'DELETE',
      }),
  },
};

export default api;
