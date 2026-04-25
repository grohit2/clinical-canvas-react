import type { Patient as ApiPatient, MrnHistoryEntry } from "@/types/api";

export type Stage =
  | "onboarding"
  | "preop"
  | "intraop"
  | "postop"
  | "discharge-init"
  | "discharge";

export type Pathway = "surgical" | "consultation" | "emergency";

export type SchemeOption = "ASP" | "NAM" | "EHS" | "PAID" | "OTHERS" | string;

export interface Patient extends ApiPatient {
  currentState?: Stage;
  pathway?: Pathway;
  scheme?: SchemeOption;
  mrnHistory?: MrnHistoryEntry[];
}
