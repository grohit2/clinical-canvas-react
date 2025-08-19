// Scoring system types
export type Period = "all" | `${number}-${"01"|"02"|"03"|"04"|"05"|"06"|"07"|"08"|"09"|"10"|"11"|"12"}`;

export interface LedgerEvent {
  ts: string; // ISO
  doctorId: string;
  doctorName: string;
  patientId: string; // MRN
  department: string;
  action: "note.create"|"note.update"|"med.create"|"med.update"|"task.done"|"timeline.transition"|"doc.upload";
  points: number;
  meta?: Record<string, any>;
}

export interface Scoreboard {
  period: string; // YYYY-MM
  points_total: number;
  counts_by_action: Record<string, number>;
  last_updated: string; // ISO
}

export interface LeaderboardRow {
  doctorId: string;
  name: string;
  avatar?: string;
  points_total: number;
  rank: number;
  deltaRank?: number;
}

export interface ActionBreakdown {
  action: string;
  count: number;
  points: number;
}