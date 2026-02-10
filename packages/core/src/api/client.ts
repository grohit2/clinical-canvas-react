import type {
  Patient,
  Task,
  Note,
  Medication,
  Doctor,
  TimelineEntry,
  DischargeSummaryVersion,
} from '../types/api';

export interface ApiConfig {
  baseUrl: string;
}

type ErrorPayload = {
  error?: string;
};

const hasErrorMessage = (value: unknown): value is ErrorPayload =>
  typeof value === 'object' &&
  value !== null &&
  'error' in value &&
  typeof (value as { error?: unknown }).error === 'string';

type PatientCreateInput = Omit<Patient, 'id' | 'lastUpdated' | 'status'> & {
  registrationNumber: string;
  name: string;
  department: string;
  tidNumber?: string;
  tidStatus?: string;
  surgeryCode?: string;
  surgeryDate?: string | null;
};

type PatientUpdateInput = Partial<Patient> & {
  tidStatus?: string;
  tidNumber?: string;
};

async function request<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const fullUrl = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };
  if (options.body && typeof headers['Content-Type'] === 'undefined') {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(fullUrl, { ...options, headers });

  if (!res.ok) {
    const err: unknown = await res.json().catch(() => ({}));
    const message = hasErrorMessage(err) ? err.error : res.statusText;
    throw new Error(message);
  }

  return res.json();
}

export function createApiClient(config: ApiConfig) {
  const { baseUrl } = config;

  return {
    patients: {
      list: (department?: string) =>
        request<Patient[]>(
          baseUrl,
          `/patients${department ? `?department=${encodeURIComponent(department)}` : ''}`
        ),
      get: (uid: string) => request<Patient>(baseUrl, `/patients/${uid}`),
      timeline: (uid: string) =>
        request<TimelineEntry[]>(baseUrl, `/patients/${uid}/timeline`),
      create: (data: PatientCreateInput) => {
        const { registrationNumber, department } = data;
        const fallbackScheme = (data.scheme || '').trim();
        const normalizedFallbackScheme = fallbackScheme
          ? fallbackScheme.toUpperCase()
          : 'OTHERS';
        const chosenMrn = (data.latestMrn || registrationNumber || '').trim();
        const schemeForRegistration =
          (data.mrnHistory || []).find((h) => h.mrn === chosenMrn)?.scheme ||
          data.mrnHistory?.[0]?.scheme ||
          normalizedFallbackScheme ||
          'OTHERS';
        return request<{ patientId: string; patient: Patient }>(
          baseUrl,
          `/patients`,
          {
            method: 'POST',
            body: JSON.stringify({
              name: data.name,
              age: data.age,
              sex: data.sex,
              registration: {
                mrn: registrationNumber,
                scheme: schemeForRegistration,
                department: department,
                pathway: data.pathway,
                diagnosis: data.diagnosis,
                comorbidities: data.comorbidities,
                assignedDoctor: data.assignedDoctor,
                assignedDoctorId: data.assignedDoctorId,
                currentState: data.currentState,
                isUrgent: data.isUrgent,
                urgentReason: data.urgentReason,
                urgentUntil: data.urgentUntil,
                filesUrl: data.filesUrl,
                roomNumber: data.roomNumber,
                procedureName: data.procedureName,
                tid_number: data.tidNumber,
                tid_status: data.tidStatus,
                surgery_code: data.surgeryCode,
                surgery_date: data.surgeryDate,
              },
              emergencyContact: data.emergencyContact,
              roomNumber: data.roomNumber,
              procedureName: data.procedureName,
              scheme: schemeForRegistration,
              latestMrn: data.latestMrn || registrationNumber,
              mrnHistory: data.mrnHistory || [
                {
                  mrn: registrationNumber,
                  scheme: schemeForRegistration,
                  date: new Date().toISOString(),
                },
              ],
              vitals: data.vitals,
            }),
          }
        );
      },
      update: (uid: string, data: PatientUpdateInput) => {
        const shadow: Record<string, unknown> = { ...data };
        if (data.tidStatus !== undefined) shadow['tid_status'] = data.tidStatus;
        if (data.tidNumber !== undefined) shadow['tid_number'] = data.tidNumber;
        if (data.surgeryCode !== undefined)
          shadow['surgery_code'] = data.surgeryCode;
        if (data.surgeryDate !== undefined)
          shadow['surgery_date'] = data.surgeryDate;
        if (data.roomNumber !== undefined) shadow['room_number'] = data.roomNumber;
        if (data.scheme !== undefined) shadow['scheme'] = data.scheme;
        if (data.procedureName !== undefined)
          shadow['procedure_name'] = data.procedureName;

        return request<{ patient: Patient }>(baseUrl, `/patients/${uid}`, {
          method: 'PUT',
          body: JSON.stringify(shadow),
        });
      },
      switchRegistration: (
        uid: string,
        data: {
          mrn: string;
          scheme: string;
          department?: string;
          pathway?: string;
          diagnosis?: string;
          comorbidities?: string[];
          assigned_doctor?: string;
          assigned_doctor_id?: string;
          files_url?: string;
          is_urgent?: boolean;
          urgent_reason?: string;
          urgent_until?: string;
          firstState?: string;
          actorId?: string;
        }
      ) =>
        request<{ message: string; latestMrn: string; patient: Patient }>(
          baseUrl,
          `/patients/${uid}/registration`,
          {
            method: 'PATCH',
            body: JSON.stringify(data),
          }
        ),
      updateMrnHistory: (
        uid: string,
        mrnHistory: { mrn: string; scheme: string; date: string }[]
      ) =>
        request<{ message: string; patient: Patient }>(
          baseUrl,
          `/patients/${uid}/mrn-history`,
          {
            method: 'PATCH',
            body: JSON.stringify({ mrnHistory }),
          }
        ),
      overwriteMrn: (
        uid: string,
        mrnHistory: { mrn: string; scheme: string; date: string }[],
        actorId?: string
      ) =>
        request<{ message: string; patient: Patient }>(
          baseUrl,
          `/patients/${uid}/mrn-overwrite`,
          {
            method: 'PATCH',
            body: JSON.stringify({ mrnHistory, actorId }),
          }
        ),
      changeState: (
        uid: string,
        data: {
          current_state: string;
          checklistInDone?: string[];
          checklistOutDone?: string[];
          actorId?: string;
          timelineNotes?: string;
        }
      ) =>
        request<{ message: string; patient: Patient }>(
          baseUrl,
          `/patients/${uid}/state`,
          {
            method: 'PATCH',
            body: JSON.stringify(data),
          }
        ),
      remove: (uid: string) =>
        request<{ patient: Patient }>(baseUrl, `/patients/${uid}`, {
          method: 'DELETE',
        }),
    },
    tasks: {
      list: (uid: string, status?: string, limit?: number) => {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (limit) params.append('limit', String(limit));
        const query = params.size ? `?${params.toString()}` : '';
        return request<Task[]>(baseUrl, `/patients/${uid}/tasks${query}`);
      },
      create: (
        uid: string,
        data: Omit<Task, 'taskId' | 'createdAt' | 'updatedAt'>
      ) =>
        request<{ message: string; task: Task }>(
          baseUrl,
          `/patients/${uid}/tasks`,
          {
            method: 'POST',
            body: JSON.stringify(data),
          }
        ),
      update: (uid: string, taskId: string, data: Partial<Task>) =>
        request<{ message: string; task: Task }>(
          baseUrl,
          `/patients/${uid}/tasks/${taskId}`,
          {
            method: 'PATCH',
            body: JSON.stringify(data),
          }
        ),
      remove: (uid: string, taskId: string) =>
        request<{ message: string }>(
          baseUrl,
          `/patients/${uid}/tasks/${taskId}`,
          {
            method: 'DELETE',
          }
        ),
    },
    notes: {
      list: (
        uid: string,
        limit?: number,
        cursor?: string,
        includeDeleted?: boolean
      ) => {
        const params = new URLSearchParams();
        if (limit) params.append('limit', String(limit));
        if (cursor) params.append('cursor', cursor);
        if (includeDeleted)
          params.append('includeDeleted', includeDeleted ? '1' : '0');
        const query = params.size ? `?${params.toString()}` : '';
        return request<{ items: Note[]; nextCursor: string | null }>(
          baseUrl,
          `/patients/${uid}/notes${query}`
        );
      },
      create: (
        uid: string,
        data: Omit<Note, 'noteId' | 'createdAt' | 'updatedAt' | 'deleted'>
      ) =>
        request<{ message: string; note: Note }>(
          baseUrl,
          `/patients/${uid}/notes`,
          {
            method: 'POST',
            body: JSON.stringify(data),
          }
        ),
      update: (uid: string, noteId: string, data: Partial<Note>) =>
        request<{ message: string; note: Note }>(
          baseUrl,
          `/patients/${uid}/notes/${noteId}`,
          {
            method: 'PATCH',
            body: JSON.stringify(data),
          }
        ),
      remove: (uid: string, noteId: string) =>
        request<{ message: string }>(
          baseUrl,
          `/patients/${uid}/notes/${noteId}`,
          {
            method: 'DELETE',
          }
        ),
    },
    meds: {
      list: (
        uid: string,
        active?: boolean,
        limit?: number,
        cursor?: string
      ) => {
        const params = new URLSearchParams();
        if (active !== undefined) params.append('active', active ? '1' : '0');
        if (limit) params.append('limit', String(limit));
        if (cursor) params.append('cursor', cursor);
        const query = params.size ? `?${params.toString()}` : '';
        return request<{ items: Medication[]; nextCursor: string | null }>(
          baseUrl,
          `/patients/${uid}/meds${query}`
        );
      },
      create: (
        uid: string,
        data: Omit<Medication, 'medId' | 'createdAt' | 'updatedAt'>
      ) =>
        request<{ message: string; med: Medication }>(
          baseUrl,
          `/patients/${uid}/meds`,
          {
            method: 'POST',
            body: JSON.stringify(data),
          }
        ),
      update: (uid: string, medId: string, data: Partial<Medication>) =>
        request<{ message: string; med: Medication }>(
          baseUrl,
          `/patients/${uid}/meds/${medId}`,
          {
            method: 'PATCH',
            body: JSON.stringify(data),
          }
        ),
      remove: (uid: string, medId: string) =>
        request<{ message: string; med: Medication }>(
          baseUrl,
          `/patients/${uid}/meds/${medId}`,
          {
            method: 'DELETE',
          }
        ),
    },
    doctors: {
      list: (department: string, limit?: number) => {
        const params = new URLSearchParams({ department });
        if (limit) params.append('limit', String(limit));
        return request<Doctor[]>(baseUrl, `/doctors?${params.toString()}`);
      },
      get: (doctorId: string) =>
        request<Doctor>(baseUrl, `/doctors/${doctorId}`),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
