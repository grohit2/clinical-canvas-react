import type { Patient, MrnHistoryEntry } from "@/types/api";
import { SchemeOption } from "./types";
import { normalizeStage } from "./stage";

export const SCHEME_OPTIONS: SchemeOption[] = ["ASP", "NAM", "EHS", "PAID", "OTHERS"];

export const normalizeScheme = (value?: string): SchemeOption => {
  const raw = (value || "").trim().toUpperCase();
  if (SCHEME_OPTIONS.includes(raw as SchemeOption)) {
    return raw as SchemeOption;
  }
  if (["UNKNOWN", "GENERAL", "OTHER", "OTHERS"].includes(raw)) {
    return "OTHERS";
  }
  return raw || "OTHERS";
};

export const normalizeMrnHistory = (
  history?: MrnHistoryEntry[]
): MrnHistoryEntry[] | undefined => {
  if (!history) return undefined;
  return history.map((entry) => ({
    ...entry,
    scheme: normalizeScheme(entry.scheme),
  }));
};

export const coerceRoomNumber = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return undefined;
};

export const normalizePatient = (raw: Patient): Patient => {
  const normalizedHistory = normalizeMrnHistory(raw.mrnHistory);
  const schemeCandidates: Array<string | undefined> = [
    raw.scheme,
    normalizedHistory?.find((entry) => entry.mrn === raw.latestMrn)?.scheme,
    normalizedHistory?.[0]?.scheme,
    (raw as unknown as { registration?: { scheme?: string } }).registration?.scheme,
  ];
  const resolvedScheme = normalizeScheme(schemeCandidates.find(Boolean));
  const roomCandidate = raw as unknown as {
    roomNumber?: string;
    room_number?: string;
    room?: string;
    registration?: { roomNumber?: string; room_number?: string };
  };
  const resolvedRoom = coerceRoomNumber(
    raw.roomNumber ??
      roomCandidate?.roomNumber ??
      roomCandidate?.room_number ??
      roomCandidate?.room ??
      roomCandidate?.registration?.roomNumber ??
      roomCandidate?.registration?.room_number
  );

  return {
    ...raw,
    scheme: resolvedScheme,
    roomNumber: resolvedRoom,
    mrnHistory: normalizedHistory,
    currentState: normalizeStage(raw.currentState) || raw.currentState,
    procedureName: raw.procedureName ?? (raw as any)?.procedure_name ?? undefined,
  };
};
