import { PatientMeta } from "@/types/models";

export type KPIData = { 
  totalPatients: number; 
  tasksDue: number; 
  urgentAlerts: number; 
  completedToday: number; 
};

export type StageHeatMapItem = { 
  stage: string; 
  count: number; 
  variant: "caution" | "urgent" | "stable" | "default" 
};

export type UpcomingProcedure = { 
  id: string; 
  patient: string; 
  procedure: string; 
  time: string; 
  surgeon: string 
};

export function deriveKpi(patients: PatientMeta[]): KPIData {
  const active = patients.filter(p => p.status === "ACTIVE" || !p.status); // filter active only
  const now = new Date();
  const startOfDay = new Date(now); 
  startOfDay.setHours(0,0,0,0);

  // Heuristics until Tasks API exists:
  const tasksDue = active.filter(p => p.updateCounter > 0).length;         // placeholder signal
  const urgentAlerts = active.filter(p => p.updateCounter >= 10).length;   // "urgent" if noisy
  const completedToday = 0;                                                // no task completion yet

  return { 
    totalPatients: active.length, 
    tasksDue, 
    urgentAlerts, 
    completedToday 
  };
}

export function deriveStageHeatMap(patients: PatientMeta[]): StageHeatMapItem[] {
  const active = patients.filter(p => p.status === "ACTIVE" || !p.status);
  const by = new Map<string, number>();
  
  for (const p of active) {
    by.set(p.currentState, (by.get(p.currentState) ?? 0) + 1);
  }
  
  const toVariant = (s: string): StageHeatMapItem["variant"] =>
    /icu|critical/i.test(s) ? "urgent" :
    /post-op|recovery/i.test(s) ? "caution" :
    /discharge|stable/i.test(s) ? "stable" : "default";

  return Array.from(by.entries()).map(([stage, count]) => ({ 
    stage, 
    count, 
    variant: toVariant(stage) 
  }));
}

export function deriveUpcomingProcedures(patients: PatientMeta[]): UpcomingProcedure[] {
  const active = patients.filter(p => p.status === "ACTIVE" || !p.status);
  
  // Simple example: surgical + pre-op patients show up as "queued"
  return active
    .filter(p => p.pathway === "surgical" && /pre-op/i.test(p.currentState))
    .slice(0, 5)
    .map((p, i) => ({ 
      id: `${p.id}-${i}`, 
      patient: p.name, 
      procedure: "Surgery", 
      time: "TBD", 
      surgeon: p.assignedDoctor ?? "TBD" 
    }));
}