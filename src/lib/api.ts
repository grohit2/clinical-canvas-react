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
    get: (mrn: string) => request<Patient>(`/patients/${mrn}`),
    timeline: (mrn: string) => request<TimelineEntry[]>(`/patients/${mrn}/timeline`),
    create: (data: Omit<Patient, 'id' | 'lastUpdated' | 'status'> & { mrn: string; name: string; department: string }) =>
      request<{ message: string; mrn: string; patient: Patient }>(`/patients`, {
        method: 'POST',
        body: JSON.stringify(toSnakeCase(data)),
      }),
    update: (mrn: string, data: Partial<Patient>) =>
      request<{ message: string; mrn: string; patient: Patient }>(`/patients/${mrn}`, {
        method: 'PUT',
        body: JSON.stringify(toSnakeCase(data as Record<string, unknown>)),
      }),
    remove: (mrn: string) =>
      request<{ message: string; mrn: string; patient: Patient }>(`/patients/${mrn}`, {
        method: 'DELETE',
      }),
  },
  tasks: {
    list: (mrn: string, status?: string, limit?: number) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (limit) params.append('limit', String(limit));
      const query = params.size ? `?${params.toString()}` : '';
      return request<Task[]>(`/patients/${mrn}/tasks${query}`);
    },
    create: (mrn: string, data: Omit<Task, 'taskId' | 'createdAt' | 'updatedAt'>) =>
      request<{ message: string; task: Task }>(`/patients/${mrn}/tasks`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (mrn: string, taskId: string, data: Partial<Task>) =>
      request<{ message: string; task: Task }>(`/patients/${mrn}/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    remove: (mrn: string, taskId: string) =>
      request<{ message: string }>(`/patients/${mrn}/tasks/${taskId}`, {
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
    list: (mrn: string, limit?: number, cursor?: string, includeDeleted?: boolean) => {
      const params = new URLSearchParams();
      if (limit) params.append('limit', String(limit));
      if (cursor) params.append('cursor', cursor);
      if (includeDeleted) params.append('includeDeleted', includeDeleted ? '1' : '0');
      const query = params.size ? `?${params.toString()}` : '';
      return request<{ items: Note[]; nextCursor: string | null }>(`/patients/${mrn}/notes${query}`);
    },
    create: (mrn: string, data: Omit<Note, 'noteId' | 'createdAt' | 'updatedAt' | 'deleted'>) =>
      request<{ message: string; note: Note }>(`/patients/${mrn}/notes`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (mrn: string, noteId: string, data: Partial<Note>) =>
      request<{ message: string; note: Note }>(`/patients/${mrn}/notes/${noteId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    remove: (mrn: string, noteId: string) =>
      request<{ message: string }>(`/patients/${mrn}/notes/${noteId}`, {
        method: 'DELETE',
      }),
  },
  meds: {
    list: (mrn: string, active?: boolean, limit?: number, cursor?: string) => {
      const params = new URLSearchParams();
      if (active !== undefined) params.append('active', active ? '1' : '0');
      if (limit) params.append('limit', String(limit));
      if (cursor) params.append('cursor', cursor);
      const query = params.size ? `?${params.toString()}` : '';
      return request<{ items: Medication[]; nextCursor: string | null }>(`/patients/${mrn}/meds${query}`);
    },
    create: (mrn: string, data: Omit<Medication, 'medId' | 'createdAt' | 'updatedAt'>) =>
      request<{ message: string; med: Medication }>(`/patients/${mrn}/meds`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (mrn: string, medId: string, data: Partial<Medication>) =>
      request<{ message: string; med: Medication }>(`/patients/${mrn}/meds/${medId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    remove: (mrn: string, medId: string) =>
      request<{ message: string; med: Medication }>(`/patients/${mrn}/meds/${medId}`, {
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
  uploads: {
    getPresignedUrl: (fileName: string, fileType: string) =>
      request<{ uploadUrl: string; fileUrl: string }>(
        `/uploads/presigned?fileName=${encodeURIComponent(fileName)}&fileType=${encodeURIComponent(fileType)}`
      ),
  },
};

export default api;
