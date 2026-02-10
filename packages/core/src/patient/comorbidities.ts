/**
 * Parse comorbidities from various formats into normalized tokens
 */
export function parseComorbidities(comorbidities: string[] | undefined): string[] {
  return (comorbidities ?? [])
    .flatMap((item) =>
      String(item)
        .split(/\s*\+\s*|\s*,\s*/)
        .map((token) => token.trim())
        .filter(Boolean)
    )
    .map((token) => token.toUpperCase());
}

/**
 * Calculate days since surgery (date-only diff)
 */
export function getDaysSinceSurgery(surgeryDate?: string | null): number {
  if (!surgeryDate) return 0;
  const d = new Date(surgeryDate);
  if (isNaN(d.getTime())) return 0;
  const now = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}
