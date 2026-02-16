export interface PatientLike {
  id?: string;
  uid?: string;
  name?: string;
  fullName?: string;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function getPatientId(patient: unknown): string | null {
  const row = asRecord(patient);
  const id = row.id;
  if (typeof id === 'string' && id.trim().length > 0) {
    return id;
  }

  const uid = row.uid;
  if (typeof uid === 'string' && uid.trim().length > 0) {
    return uid;
  }

  return null;
}

export function getPatientName(patient: unknown): string | null {
  const row = asRecord(patient);
  const name = row.name;
  if (typeof name === 'string' && name.trim().length > 0) {
    return name;
  }

  const fullName = row.fullName;
  if (typeof fullName === 'string' && fullName.trim().length > 0) {
    return fullName;
  }

  return null;
}

export function buildPatientLookup(patients: readonly unknown[] | undefined): Record<string, string> {
  if (!patients || patients.length === 0) {
    return {};
  }

  const out: Record<string, string> = {};
  for (const patient of patients) {
    const id = getPatientId(patient);
    const name = getPatientName(patient);
    if (!id || !name) {
      continue;
    }
    out[id] = name;
  }
  return out;
}
