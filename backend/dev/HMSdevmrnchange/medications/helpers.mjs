// medications/helpers.mjs — Pure helpers (no AWS, safe for selftest) (Node 22 ESM)
//
// Pattern format (dose-per-period shorthand):
//   3-part (M-A-N, common in India):
//     position 0 → Morning   08:00
//     position 1 → Afternoon 13:00
//     position 2 → Night     22:00
//   4-part (M-A-E-N):
//     position 0 → Morning   08:00
//     position 1 → Afternoon 13:00
//     position 2 → Evening   18:00
//     position 3 → Night     22:00
//
// Fractions:  0 | 1/4 | 1/2 | 3/4 | 1 | 2 | 3 ...
// Display:    "1-1/2-0-1"  (M=1, A=1/2, E=0, N=1)

export const SLOT_TIMES_3 = ["08:00", "13:00", "22:00"];
export const SLOT_TIMES_4 = ["08:00", "13:00", "18:00", "22:00"];

/**
 * Parse a fractional dose string → number.
 * "0" → 0, "1/2" → 0.5, "3/4" → 0.75, "1" → 1, "2" → 2
 */
export function parseFraction(s) {
  if (s === undefined || s === null) return 0;
  const str = String(s).trim();
  if (str === "0" || str === "") return 0;
  // Handle e.g. "1/4", "3/4", "1/2"
  const frac = str.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = Number(str);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Expand a pattern string into schedule slots.
 * Returns an array of { time, dose, unit } (only non-zero doses included).
 * Returns null if pattern is invalid (wrong part count or non-parseable).
 *
 * @param {string} pattern  e.g. "1-0-1"  or  "1-1/2-0-1"
 * @param {string} [unit="tab"]
 * @returns {Array<{time:string, dose:number, unit:string}>|null}
 */
export function expandPattern(pattern, unit = "tab") {
  if (!pattern || typeof pattern !== "string") return null;
  const parts = pattern.trim().split("-");
  if (parts.length !== 3 && parts.length !== 4) return null;
  const times = parts.length === 3 ? SLOT_TIMES_3 : SLOT_TIMES_4;
  const slots = [];
  for (let i = 0; i < parts.length; i++) {
    const dose = parseFraction(parts[i]);
    if (dose > 0) slots.push({ time: times[i], dose, unit });
  }
  return slots;
}

/**
 * Default dose unit from drug form.
 */
export function defaultUnit(form) {
  switch (form) {
    case "tablet":   return "tab";
    case "capsule":  return "cap";
    case "syrup":    return "ml";
    case "injection":return "mg";
    case "iv":       return "ml";
    default:         return "unit";
  }
}

/**
 * Compute the ordered quantity.
 * - syrup form        → 1 (one bottle)
 * - SOS category      → 1 (PRN, no scheduled slots)
 * - no duration / no slots → null
 * - else ceil(perDayTotal × duration_days)
 *
 * @param {Array<{dose:number}>} slots
 * @param {number|null} durationDays
 * @param {string} form        drug form
 * @param {string} category    order category
 * @returns {number|null}
 */
export function calcQuantity(slots, durationDays, form, category) {
  if (form === "syrup") return 1;
  if (category === "sos") return 1;
  // Guard against zero, negative, or missing duration — all return null.
  // (!durationDays catches null/undefined/0; durationDays <= 0 catches negatives.)
  if (!durationDays || durationDays <= 0 || !slots || slots.length === 0) return null;
  const perDay = slots.reduce((sum, s) => sum + (s.dose || 0), 0);
  return Math.ceil(perDay * durationDays);
}

/**
 * Add duration_days to a started_at ISO string to get end_at.
 * Returns null if either argument is missing/invalid.
 *
 * @param {string} startedAt  ISO 8601 timestamp
 * @param {number} durationDays
 * @returns {string|null}
 */
export function calcEndAt(startedAt, durationDays) {
  if (!startedAt || !durationDays || durationDays <= 0) return null;
  const d = new Date(startedAt);
  if (isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + durationDays);
  return d.toISOString();
}

/**
 * Returns true if a pending MAR slot is overdue.
 * Overdue = now > (date T time + 60 min).
 *
 * TIMEZONE CONVENTION (IST-first): `date` is YYYY-MM-DD and `time` is HH:mm,
 * both in India Standard Time (IST, UTC+05:30, no DST). The ward slot schedule
 * (08:00 / 13:00 / 18:00 / 22:00) is always expressed in IST. `nowISO` is a
 * UTC ISO string from the server (new Date().toISOString()).
 *
 * Using "+05:30" ensures a 22:00 IST slot is parsed as 16:30 UTC.
 * The 60-min overdue window then closes at 17:30 UTC (= 23:00 IST).
 * The old "...Z" literal incorrectly placed that boundary at 23:00 UTC
 * (= 04:30 IST next day) — a ~6.5-hour drift for the 22:00 slot.
 *
 * @param {string} date    "YYYY-MM-DD" in IST
 * @param {string} time    "HH:mm" in IST
 * @param {string} nowISO  ISO 8601 (UTC) now
 */
export function isOverdue(date, time, nowISO) {
  // Parse the slot instant as IST (+05:30) → correct UTC for comparison to nowISO.
  const slotMs = new Date(`${date}T${time}:00.000+05:30`).getTime() + 60 * 60 * 1000;
  return Date.parse(nowISO) > slotMs;
}

/**
 * Build a human-readable schedule label for the dashboard / AI context.
 * e.g. "1-0-1 · D3/7"  |  "SOS"  |  "infusion"  |  "custom"
 *
 * @param {object} schedule  { pattern?, duration_days? }
 * @param {string} category
 */
export function scheduleLabel(schedule, category) {
  if (category === "sos")      return "SOS";
  if (category === "infusion") return "infusion";
  if (category === "stat")     return "STAT";
  const p = schedule?.pattern;
  const d = schedule?.duration_days;
  let label = p || "custom";
  if (d) label += ` · D${d}/7`;
  return label;
}

/**
 * Derive the effective order status at read time.
 * "active" becomes "completed" when end_at has passed.
 *
 * @param {{ status:string, end_at?:string }} order
 * @param {string} nowISO
 * @returns {string}
 */
export function deriveStatus(order, nowISO) {
  if (order.status === "active" && order.end_at && order.end_at < nowISO) {
    return "completed";
  }
  return order.status;
}

/**
 * Determine whether a date string (YYYY-MM-DD) falls within an order's window.
 * Active window: started_at date <= date AND (end_at is null OR end_at date > date).
 *
 * @param {{ started_at:string, end_at?:string }} order
 * @param {string} date  "YYYY-MM-DD"
 */
export function isActiveOnDate(order, date) {
  const startDate = order.started_at ? order.started_at.slice(0, 10) : null;
  if (!startDate || startDate > date) return false;
  if (order.end_at) {
    const endDate = order.end_at.slice(0, 10);
    if (endDate <= date) return false;
  }
  return true;
}

/**
 * Case-insensitive substring cross-check of a drug against a patient's allergy list.
 * No external data source — minimal safety net only. Returns warning objects for the
 * `warnings[]` envelope on POST /med-orders; never blocks the order.
 *
 * NOTE: The patient META_LATEST record does NOT currently store an `allergies` field
 * in the HMS backend. This function is implemented defensively: it returns [] when
 * `allergies` is null/undefined/empty. When the field is added to the patient schema,
 * this check will automatically activate with no further code changes.
 *
 * Matching strategy (simple, no NLP):
 *   allergen substring in drugName/generic OR drugName/generic substring in allergen.
 *
 * @param {string}      drugName   drug.name from the order
 * @param {string|null} generic    drug.generic from the order
 * @param {Array<string>|null} allergies  patient.allergies from META
 * @returns {Array<{type:string, allergen:string, matched:string, severity:string}>}
 */
export function checkAllergyWarnings(drugName, generic, allergies) {
  if (!Array.isArray(allergies) || allergies.length === 0) return [];
  const warnings = [];
  const targets = [drugName, generic]
    .filter(Boolean)
    .map((t) => String(t).toLowerCase().trim());
  for (const allergen of allergies) {
    const a = String(allergen).toLowerCase().trim();
    if (!a) continue;
    for (const target of targets) {
      if (target.includes(a) || a.includes(target)) {
        warnings.push({
          type:     "allergy",
          allergen: String(allergen).trim(),
          matched:  target,
          severity: "warning",
        });
        break; // one warning per allergen entry regardless of how many targets match
      }
    }
  }
  return warnings;
}
