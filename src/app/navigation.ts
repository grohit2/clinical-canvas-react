// Centralized, typed route builders for app navigation

export type PatientId = string;
export type NoteId = string;
export type TaskId = string;
export type MedId = string;
export type DocumentCategory = string;

export const paths = {
  // Root & non-patient routes
  root: () => "/",
  patients: () => "/patients",
  patientsAdd: () => "/patients/add",
  tasks: () => "/tasks",
  tasksDue: () => "/tasks-due",
  urgentAlerts: () => "/urgent-alerts",
  completedToday: () => "/completed-today",
  profile: () => "/profile",
  qr: (id: string) => `/qr/${id}`,

  // Patient overview
  patient: (id: PatientId) => `/patients/${id}`,
  patientEdit: (id: PatientId) => `/patients/${id}/edit`,
  patientDocs: (id: PatientId) => `/patients/${id}/docs`,
  patientDocsCategory: (id: PatientId, category: DocumentCategory) => `/patients/${id}/docs/${category}`,

  // Notes
  addNote: (id: PatientId) => `/patients/${id}/add-note`,
  noteDetail: (id: PatientId, noteId: NoteId) => `/patients/${id}/notes/${noteId}`,
  noteEdit: (id: PatientId, noteId: NoteId) => `/patients/${id}/notes/${noteId}/edit`,

  // Medications
  addMedication: (id: PatientId) => `/patients/${id}/add-med`,
  medEdit: (id: PatientId, medId: MedId) => `/patients/${id}/meds/${medId}/edit`,

  // Tasks
  addTask: (id: PatientId) => `/patients/${id}/add-task`,
  taskEdit: (id: PatientId, taskId: TaskId) => `/patients/${id}/tasks/${taskId}/edit`,

  // Documents
  docsRoot: (id: PatientId) => `/patients/${id}/docs`,
  docsCategory: (id: PatientId, category: DocumentCategory) => `/patients/${id}/docs/${category}`,

  // Discharge
  dischargeSummary: (id: PatientId) => `/patients/${id}/discharge-summary`,

  // Workflow stages
  patientAdmission: (id: PatientId) => `/patients/${id}/admission`,
  patientPreOp: (id: PatientId) => `/patients/${id}/pre-op`,
  patientOt: (id: PatientId) => `/patients/${id}/ot`,
  patientPostOp: (id: PatientId) => `/patients/${id}/post-op`,
  patientDischarge: (id: PatientId) => `/patients/${id}/discharge`,

  // MRN
  mrnAdd: (id: PatientId) => `/patients/${id}/mrn-add`,

  // Legacy routes
  docsLegacyRoot: (id: PatientId) => `/patients/${id}/documents`,
} as const;

export type AppPaths = typeof paths;
