import type { Patient } from "@/types/api";
import { api } from "@/lib/api";

const STAGES: readonly string[] = [
  'onboarding',
  'preop',
  'intraop',
  'postop',
  'discharge-init',
  'discharge',
] as const;

const ORDER: Record<string, number> = STAGES.reduce((acc, s, i) => (acc[s] = i, acc), {} as Record<string, number>);

function normStage(s?: string | null): string {
  const key = (s || '').toLowerCase();
  if (key in ORDER) return key;
  return key.replace(/\s+/g, '-');
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isAfterDay(a: Date, b: Date) {
  if (a.getFullYear() !== b.getFullYear()) return a.getFullYear() > b.getFullYear();
  if (a.getMonth() !== b.getMonth()) return a.getMonth() > b.getMonth();
  return a.getDate() > b.getDate();
}

export function computeSurgeryTargetStage(surgeryDate?: string | null): 'intraop' | 'postop' | null {
  if (!surgeryDate) return null;
  const sd = new Date(surgeryDate);
  if (isNaN(sd.getTime())) return null;
  const today = new Date();
  if (isSameDay(sd, today)) return 'intraop';
  if (isAfterDay(today, sd)) return 'postop';
  return null;
}

export async function maybeAutoUpdatePatientStage(p: Patient): Promise<string | null> {
  const target = computeSurgeryTargetStage((p as any).surgeryDate);
  if (!target) return null;
  // Normalize current stage to compact tokens in our sequence
  const curKey = normStage(p.currentState);
  let curIdx = ORDER[curKey] ?? ORDER[curKey.replace('pre-op','preop').replace('intra-op','intraop').replace('post-op','postop')] ?? -1;
  const targetIdx = ORDER[target] ?? -1;

  // Only upgrade forward; ignore if current is equal/newer
  if (curIdx >= targetIdx) return null;

  // Step through allowed sequence, honoring backend transition rules
  for (let i = curIdx + 1; i <= targetIdx; i++) {
    const next = STAGES[i];
    try {
      await api.patients.changeState(p.id, { current_state: next });
      curIdx = i;
    } catch (e) {
      // Backend rejected this transition (checklist). Abort automation.
      return null;
    }
  }
  return STAGES[targetIdx] || null;
}
