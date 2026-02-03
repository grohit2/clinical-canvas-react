// Patient Medications Types
// Pure TypeScript (NO React/RN imports)
// Note: Base Medication interface stays in shared/types/api.ts

export type MedPriority = 'stat' | 'urgent' | 'routine' | 'prn';
export type MedStatus = 'active' | 'discontinued' | 'completed' | 'on_hold';

export type MedRoute =
  | 'oral'
  | 'iv'
  | 'im'
  | 'sc'
  | 'topical'
  | 'inhaled'
  | 'rectal'
  | 'sublingual'
  | 'transdermal'
  | 'ophthalmic'
  | 'otic'
  | 'nasal'
  | 'other';

export type MedFrequency =
  | 'once'
  | 'daily'
  | 'bid'
  | 'tid'
  | 'qid'
  | 'q4h'
  | 'q6h'
  | 'q8h'
  | 'q12h'
  | 'weekly'
  | 'prn'
  | 'other';

export interface RouteConfig {
  value: MedRoute;
  label: string;
  abbreviation: string;
}

export interface FrequencyConfig {
  value: MedFrequency;
  label: string;
  timesPerDay?: number;
}

export const ROUTES: RouteConfig[] = [
  { value: 'oral', label: 'Oral (PO)', abbreviation: 'PO' },
  { value: 'iv', label: 'Intravenous (IV)', abbreviation: 'IV' },
  { value: 'im', label: 'Intramuscular (IM)', abbreviation: 'IM' },
  { value: 'sc', label: 'Subcutaneous (SC)', abbreviation: 'SC' },
  { value: 'topical', label: 'Topical', abbreviation: 'TOP' },
  { value: 'inhaled', label: 'Inhaled', abbreviation: 'INH' },
  { value: 'rectal', label: 'Rectal (PR)', abbreviation: 'PR' },
  { value: 'sublingual', label: 'Sublingual (SL)', abbreviation: 'SL' },
  { value: 'transdermal', label: 'Transdermal', abbreviation: 'TD' },
  { value: 'ophthalmic', label: 'Ophthalmic', abbreviation: 'OPH' },
  { value: 'otic', label: 'Otic (ear)', abbreviation: 'OT' },
  { value: 'nasal', label: 'Nasal', abbreviation: 'NAS' },
  { value: 'other', label: 'Other', abbreviation: 'OTH' },
];

export const FREQUENCIES: FrequencyConfig[] = [
  { value: 'once', label: 'Once', timesPerDay: 1 },
  { value: 'daily', label: 'Once daily', timesPerDay: 1 },
  { value: 'bid', label: 'Twice daily (BID)', timesPerDay: 2 },
  { value: 'tid', label: 'Three times daily (TID)', timesPerDay: 3 },
  { value: 'qid', label: 'Four times daily (QID)', timesPerDay: 4 },
  { value: 'q4h', label: 'Every 4 hours', timesPerDay: 6 },
  { value: 'q6h', label: 'Every 6 hours', timesPerDay: 4 },
  { value: 'q8h', label: 'Every 8 hours', timesPerDay: 3 },
  { value: 'q12h', label: 'Every 12 hours', timesPerDay: 2 },
  { value: 'weekly', label: 'Weekly', timesPerDay: 0.14 },
  { value: 'prn', label: 'As needed (PRN)' },
  { value: 'other', label: 'Other' },
];

export function getRouteConfig(route: MedRoute): RouteConfig {
  return ROUTES.find((r) => r.value === route) || ROUTES[0];
}

export function getFrequencyConfig(frequency: MedFrequency): FrequencyConfig {
  return FREQUENCIES.find((f) => f.value === frequency) || FREQUENCIES[0];
}

// Re-export for convenience
export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dose: string;
  unit: string;
  route: MedRoute;
  frequency: MedFrequency;
  priority: MedPriority;
  status: MedStatus;
  startDate: string;
  endDate?: string;
  instructions?: string;
  prescribedBy: string;
  prescribedAt: string;
  scheduleTimes?: string[];
}
