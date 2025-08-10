import { apiFetch } from "./client";
import type { Patient, Task, Note, Medication, Doctor } from "./types";

export const PatientsApi = {
  list: (department?: string) => apiFetch<Patient[]>(`/patients${department ? `?department=${encodeURIComponent(department)}` : ""}`),
  get: (mrn: string) => apiFetch<Patient>(`/patients/${encodeURIComponent(mrn)}`),
  create: (body: any) => apiFetch<{ message: string; mrn: string; patient: Patient }>(`/patients`, { method: "POST", body }),
  update: (mrn: string, body: any) => apiFetch<{ message: string; mrn: string; patient: Patient }>(`/patients/${encodeURIComponent(mrn)}`, { method: "PUT", body }),
  remove: (mrn: string) => apiFetch<{ message: string; mrn: string; patient: Patient }>(`/patients/${encodeURIComponent(mrn)}`, { method: "DELETE" }),
};

export const PatientTasksApi = {
  list: (mrn: string, status?: string, limit = 50) =>
    apiFetch<Task[]>(`/patients/${encodeURIComponent(mrn)}/tasks${status ? `?status=${status}&limit=${limit}` : `?limit=${limit}`}`),
  create: (mrn: string, body: any) =>
    apiFetch<{ message: string; task: Task }>(`/patients/${encodeURIComponent(mrn)}/tasks`, { method: "POST", body }),
  update: (mrn: string, taskId: string, body: any) =>
    apiFetch<{ message: string; task: Task }>(`/patients/${encodeURIComponent(mrn)}/tasks/${taskId}`, { method: "PATCH", body }),
  cancel: (mrn: string, taskId: string) =>
    apiFetch<{ message: string }>(`/patients/${encodeURIComponent(mrn)}/tasks/${taskId}`, { method: "DELETE" }),
};

export const NotesApi = {
  list: (mrn: string, limit = 50, cursor?: string, includeDeleted = 0) =>
    apiFetch<{ items: Note[]; nextCursor: string|null }>(`/patients/${encodeURIComponent(mrn)}/notes?limit=${limit}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}&includeDeleted=${includeDeleted}`),
  create: (mrn: string, body: any) => apiFetch<{ message: string; note: Note }>(`/patients/${encodeURIComponent(mrn)}/notes`, { method: "POST", body }),
  update: (mrn: string, noteId: string, body: any) => apiFetch<{ message: string; note: Note }>(`/patients/${encodeURIComponent(mrn)}/notes/${noteId}`, { method: "PATCH", body }),
  remove: (mrn: string, noteId: string) => apiFetch<{ message: string }>(`/patients/${encodeURIComponent(mrn)}/notes/${noteId}`, { method: "DELETE" }),
};

export const MedsApi = {
  list: (mrn: string, active = 1, limit = 50, cursor?: string) =>
    apiFetch<{ items: Medication[]; nextCursor: string|null }>(`/patients/${encodeURIComponent(mrn)}/meds?active=${active}&limit=${limit}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`),
  create: (mrn: string, body: any) => apiFetch<{ message: string; med: Medication }>(`/patients/${encodeURIComponent(mrn)}/meds`, { method: "POST", body }),
  update: (mrn: string, medId: string, body: any) => apiFetch<{ message: string; med: Medication }>(`/patients/${encodeURIComponent(mrn)}/meds/${medId}`, { method: "PATCH", body }),
  stop: (mrn: string, medId: string) => apiFetch<{ message: string; med: Medication }>(`/patients/${encodeURIComponent(mrn)}/meds/${medId}`, { method: "DELETE" }),
};

export const DoctorsApi = {
  list: (department?: string, limit = 200) => apiFetch<Doctor[]>(`/doctors${department ? `?department=${encodeURIComponent(department)}` : ""}&limit=${limit}`.replace('?&','?')),
  create: (body: any) => apiFetch<{ message: string; doctor: Doctor }>(`/doctors`, { method: "POST", body }),
  get: (doctorId: string) => apiFetch<Doctor>(`/doctors/${encodeURIComponent(doctorId)}`),
  update: (doctorId: string, body: any) => apiFetch<{ message: string; doctor: Doctor }>(`/doctors/${encodeURIComponent(doctorId)}`, { method: "PATCH", body }),
  remove: (doctorId: string) => apiFetch<{ message: string }>(`/doctors/${encodeURIComponent(doctorId)}`, { method: "DELETE" }),
};