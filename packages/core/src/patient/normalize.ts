import type { Patient, SchemeOption } from './types';
import type { MrnHistoryEntry } from '../types/api';

const SCHEME_OPTIONS = ['ASP', 'NAM', 'EHS', 'PAID', 'OTHERS'] as const;

export const normalizeScheme = (value?: string): SchemeOption => {
  const raw = (value || '').trim().toUpperCase();
  if (SCHEME_OPTIONS.includes(raw as typeof SCHEME_OPTIONS[number])) {
    return raw as SchemeOption;
  }
  if (['UNKNOWN', 'GENERAL', 'OTHER', 'OTHERS'].includes(raw)) {
    return 'OTHERS';
  }
  return raw ? (raw as SchemeOption) : 'OTHERS';
};

export const coerceRoomNumber = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return undefined;
};

export const normalizeMrnHistory = (history?: MrnHistoryEntry[]): MrnHistoryEntry[] | undefined => {
  if (!history) return undefined;
  return history.map((entry) => ({
    ...entry,
    scheme: normalizeScheme(entry.scheme),
  }));
};

export const enrichPatient = (patient: Patient): Patient => {
  const normalizedHistory = normalizeMrnHistory(patient.mrnHistory);
  const schemeCandidates: Array<string | undefined> = [
    patient.scheme,
    normalizedHistory?.find((entry) => entry.mrn === patient.latestMrn)?.scheme,
    normalizedHistory?.[0]?.scheme,
    (patient as unknown as { registration?: { scheme?: string } }).registration?.scheme,
  ];
  const resolvedScheme = normalizeScheme(schemeCandidates.find(Boolean));
  const roomCandidate = patient as unknown as {
    roomNumber?: string;
    room_number?: string;
    room?: string;
    registration?: { roomNumber?: string; room_number?: string };
  };
  const resolvedRoom = coerceRoomNumber(
    patient.roomNumber ??
      roomCandidate?.roomNumber ??
      roomCandidate?.room_number ??
      roomCandidate?.room ??
      roomCandidate?.registration?.roomNumber ??
      roomCandidate?.registration?.room_number,
  );
  const procedureCandidate = patient as unknown as {
    procedureName?: string;
    procedure_name?: string;
  };
  const procedureName =
    procedureCandidate.procedureName ??
    procedureCandidate.procedure_name ??
    undefined;
  const comorbidityTokens = (patient.comorbidities ?? [])
    .flatMap((item) =>
      String(item)
        .split(/\s*\+\s*|\s*,\s*/)
        .map((token) => token.trim())
        .filter(Boolean)
    )
    .map((token) => token.toUpperCase());

  return {
    ...patient,
    scheme: resolvedScheme,
    roomNumber: resolvedRoom,
    mrnHistory: normalizedHistory,
    comorbidities: comorbidityTokens,
    procedureName,
  };
};

// Best-effort timestamp (ms) for when the patient was added
export const getPatientAddedTime = (p: Patient): number => {
  const allDates = (p.mrnHistory || [])
    .map((h) => Date.parse(h.date))
    .filter((n) => !Number.isNaN(n));
  if (allDates.length > 0) {
    return Math.min(...allDates);
  }
  const id = (p.id || '').toString();
  if (!id) return 0;
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let acc = 0;
  for (let i = 0; i < Math.min(10, id.length); i++) {
    const ch = id[i];
    const idx = alphabet.indexOf(ch.toUpperCase());
    acc = acc * 32 + (idx >= 0 ? idx : 0);
  }
  return acc;
};
