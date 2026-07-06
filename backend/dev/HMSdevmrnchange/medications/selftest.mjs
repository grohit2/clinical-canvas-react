// medications/selftest.mjs — Pure-function tests (no AWS) (Node 22 ESM)
// Run with: node selftest.mjs
//
// Imports only helpers.mjs so this stays dependency-free.

import {
  parseFraction,
  expandPattern,
  calcQuantity,
  calcEndAt,
  isOverdue,
  scheduleLabel,
  deriveStatus,
  isActiveOnDate,
  checkAllergyWarnings,
  SLOT_TIMES_3,
  SLOT_TIMES_4,
} from "./helpers.mjs";

// ── Mini test harness ─────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, label, extra = "") {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.error(`  FAIL  ${label}${extra ? " — " + extra : ""}`);
    failed++;
  }
}

function deepEq(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ── parseFraction ─────────────────────────────────────────────────────────────

console.log("\n── parseFraction ───────────────────────────────────────────────");
assert(parseFraction("0")   === 0,   'parseFraction("0") === 0');
assert(parseFraction("1")   === 1,   'parseFraction("1") === 1');
assert(parseFraction("2")   === 2,   'parseFraction("2") === 2');
assert(parseFraction("1/2") === 0.5, 'parseFraction("1/2") === 0.5');
assert(parseFraction("1/4") === 0.25,'parseFraction("1/4") === 0.25');
assert(parseFraction("3/4") === 0.75,'parseFraction("3/4") === 0.75');
assert(parseFraction("")    === 0,   'parseFraction("") === 0');
assert(parseFraction(null)  === 0,   'parseFraction(null) === 0');

// ── expandPattern — 3-part M-A-N ─────────────────────────────────────────────

console.log("\n── expandPattern — 3-part (M-A-N) ─────────────────────────────");

{
  const slots = expandPattern("1-0-1");  // Morning=1, Afternoon=0, Night=1
  assert(slots !== null, '"1-0-1" does not return null');
  assert(slots.length === 2, '"1-0-1" yields 2 slots (skip zero dose)');
  assert(slots[0].time === SLOT_TIMES_3[0], '"1-0-1" slot[0].time === 08:00', slots[0]?.time);
  assert(slots[1].time === SLOT_TIMES_3[2], '"1-0-1" slot[1].time === 22:00', slots[1]?.time);
  assert(slots[0].dose === 1, '"1-0-1" slot[0].dose === 1');
  assert(slots[1].dose === 1, '"1-0-1" slot[1].dose === 1');
}

{
  const slots = expandPattern("1-1-1");  // M=1, A=1, N=1
  assert(slots.length === 3, '"1-1-1" yields 3 slots');
  assert(slots[0].time === "08:00", '"1-1-1" M=08:00');
  assert(slots[1].time === "13:00", '"1-1-1" A=13:00');
  assert(slots[2].time === "22:00", '"1-1-1" N=22:00');
}

{
  const slots = expandPattern("1-0-0");  // Once daily (morning)
  assert(slots.length === 1, '"1-0-0" yields 1 slot');
  assert(slots[0].time === "08:00", '"1-0-0" slot time === 08:00');
}

// ── expandPattern — 4-part M-A-E-N ───────────────────────────────────────────

console.log("\n── expandPattern — 4-part (M-A-E-N) ───────────────────────────");

{
  const slots = expandPattern("1-1/2-0-1");  // M=1, A=1/2, E=0, N=1
  assert(slots !== null, '"1-1/2-0-1" does not return null');
  assert(slots.length === 3, '"1-1/2-0-1" yields 3 slots (skip E=0)');
  assert(slots[0].time === "08:00", '"1-1/2-0-1" M=08:00');
  assert(slots[0].dose === 1,   '"1-1/2-0-1" M dose=1');
  assert(slots[1].time === "13:00", '"1-1/2-0-1" A=13:00');
  assert(Math.abs(slots[1].dose - 0.5) < 0.001, '"1-1/2-0-1" A dose=0.5', slots[1]?.dose);
  assert(slots[2].time === "22:00", '"1-1/2-0-1" N=22:00');
  assert(slots[2].dose === 1, '"1-1/2-0-1" N dose=1');
}

{
  const slots = expandPattern("1-1-1-1");  // Four times daily
  assert(slots.length === 4, '"1-1-1-1" yields 4 slots');
  assert(slots[2].time === SLOT_TIMES_4[2], '"1-1-1-1" E=18:00', slots[2]?.time);
}

{
  const slots = expandPattern("0-0-0-0");
  assert(slots !== null && slots.length === 0, '"0-0-0-0" yields 0 slots (all zero)');
}

// ── expandPattern — invalid ───────────────────────────────────────────────────

console.log("\n── expandPattern — invalid patterns ────────────────────────────");
assert(expandPattern("1-1")  === null, '"1-1" (2-part) → null');
assert(expandPattern("1-1-1-1-1") === null, '"1-1-1-1-1" (5-part) → null');
assert(expandPattern("")     === null, '"" (empty) → null');
assert(expandPattern(null)   === null, 'null → null');
assert(expandPattern("1-")   === null, '"1-" (trailing dash, 2-part) → null');
// "a-b-c" has 3 valid parts; each non-parseable fraction silently becomes 0.
// Returns [] (no non-zero doses), NOT null. Documented by test — not a crash path.
{
  const s = expandPattern("a-b-c");
  assert(s !== null && s.length === 0,
    '"a-b-c" (unparseable fractions → all 0) returns [] not null (documented behavior)');
}

// ── Unit inference ────────────────────────────────────────────────────────────

console.log("\n── expandPattern — unit defaults ───────────────────────────────");
{
  const slots = expandPattern("1-0-1", "tab");
  assert(slots[0].unit === "tab", 'unit "tab" set correctly');
}
{
  const slots = expandPattern("1-0-1", "ml");
  assert(slots[0].unit === "ml", 'unit "ml" set correctly');
}

// ── calcQuantity ──────────────────────────────────────────────────────────────

console.log("\n── calcQuantity ────────────────────────────────────────────────");

{
  const slots = expandPattern("1-0-1"); // 2 slots, perDay=2
  assert(calcQuantity(slots, 7, "tablet", "regular") === 14,
    '"1-0-1" × 7 days = 14 tablets');
}

{
  const slots = expandPattern("1-1/2-0-1"); // perDay = 1+0.5+1 = 2.5
  assert(calcQuantity(slots, 5, "tablet", "regular") === 13,
    '"1-1/2-0-1" × 5 days = ceil(12.5) = 13');
}

{
  // Syrup → always 1 regardless of slots/duration
  const slots = expandPattern("1-0-1");
  assert(calcQuantity(slots, 7, "syrup", "regular") === 1,
    'syrup → quantity always 1');
}

{
  // SOS → quantity = 1
  assert(calcQuantity([], 7, "tablet", "sos") === 1,
    'SOS → quantity = 1');
}

{
  // No duration → null
  const slots = expandPattern("1-0-1");
  assert(calcQuantity(slots, null, "tablet", "regular") === null,
    'no duration → quantity null');
}

{
  // No slots + no duration → null
  assert(calcQuantity([], null, "tablet", "regular") === null,
    'no slots, no duration → null');
}

{
  // Negative duration must return null (B2: prevents negative quantity result)
  const slots = expandPattern("1-0-1");
  assert(calcQuantity(slots, -1, "tablet", "regular") === null,
    'negative durationDays → null (B2 guard)');
}

// ── calcEndAt ─────────────────────────────────────────────────────────────────

console.log("\n── calcEndAt ───────────────────────────────────────────────────");

{
  const start = "2026-07-06T08:00:00.000Z";
  const end   = calcEndAt(start, 7);
  assert(typeof end === "string", 'calcEndAt returns string');
  const endDate = new Date(end);
  const startDate = new Date(start);
  const diffDays = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
  assert(diffDays === 7, 'end_at is exactly 7 days after start', `got ${diffDays}`);
}

{
  assert(calcEndAt(null, 7)  === null, 'null startedAt → null');
  assert(calcEndAt("2026-07-06T00:00:00.000Z", null) === null, 'null duration → null');
  assert(calcEndAt("2026-07-06T00:00:00.000Z", 0)    === null, 'duration=0 → null');
}

// ── isOverdue (IST convention) ───────────────────────────────────────────────
// Slot times are in IST (UTC+05:30). 08:00 IST = 02:30 UTC.
// 60-min overdue window closes at 03:30 UTC (= 09:00 IST).
// Fix: replaced the old "...Z" literal (treated time as UTC, ~6.5h off for 22:00 slot).

console.log("\n── isOverdue (IST convention) ──────────────────────────────────");

{
  // 08:00 IST → 02:30 UTC. Overdue window closes at 03:30 UTC (= 09:00 IST).
  assert(isOverdue("2026-07-06", "08:00", "2026-07-06T03:31:00.000Z") === true,
    'pending 08:00 IST slot at 03:31 UTC (09:01 IST) → overdue');
  assert(isOverdue("2026-07-06", "08:00", "2026-07-06T03:29:00.000Z") === false,
    'pending 08:00 IST slot at 03:29 UTC (08:59 IST) → not overdue');
  // Exactly at 03:30 UTC (= 09:00 IST) → still NOT overdue (strictly greater)
  assert(isOverdue("2026-07-06", "08:00", "2026-07-06T03:30:00.000Z") === false,
    'pending 08:00 IST slot exactly at 03:30 UTC (09:00 IST) → not overdue');
}

{
  // 22:00 IST (most clock-skew-prone slot) → 16:30 UTC.
  // Overdue window closes at 17:30 UTC (= 23:00 IST).
  // Old "Z" impl would have closed it at 23:00 UTC (= 04:30 IST next day).
  assert(isOverdue("2026-07-06", "22:00", "2026-07-06T17:31:00.000Z") === true,
    'pending 22:00 IST slot at 17:31 UTC (23:01 IST) → overdue (IST fix)');
  assert(isOverdue("2026-07-06", "22:00", "2026-07-06T17:29:00.000Z") === false,
    'pending 22:00 IST slot at 17:29 UTC (22:59 IST) → not overdue');
}

// ── scheduleLabel ─────────────────────────────────────────────────────────────

console.log("\n── scheduleLabel ───────────────────────────────────────────────");

assert(scheduleLabel({ pattern: "1-0-1", duration_days: 7 }, "regular") === "1-0-1 · D7/7",
  'regular label with pattern+duration');
assert(scheduleLabel({ pattern: "1-0-1" }, "regular") === "1-0-1",
  'regular label without duration');
assert(scheduleLabel({}, "sos")      === "SOS",      'SOS label');
assert(scheduleLabel({}, "infusion") === "infusion",  'infusion label');
assert(scheduleLabel({}, "stat")     === "STAT",      'stat label');

// ── deriveStatus ──────────────────────────────────────────────────────────────

console.log("\n── deriveStatus ────────────────────────────────────────────────");

{
  const past    = "2026-07-01T00:00:00.000Z";
  const future  = "2026-07-20T00:00:00.000Z";
  const now     = "2026-07-06T12:00:00.000Z";

  assert(deriveStatus({ status: "active", end_at: past },   now) === "completed",
    'active + past end_at → completed');
  assert(deriveStatus({ status: "active", end_at: future }, now) === "active",
    'active + future end_at → active');
  assert(deriveStatus({ status: "active" },                 now) === "active",
    'active + no end_at → active');
  assert(deriveStatus({ status: "held",   end_at: past },   now) === "held",
    'held is never auto-completed');
  assert(deriveStatus({ status: "stopped" },                now) === "stopped",
    'stopped stays stopped');
}

// ── isActiveOnDate ────────────────────────────────────────────────────────────

console.log("\n── isActiveOnDate ──────────────────────────────────────────────");

{
  const order = {
    started_at: "2026-07-01T08:00:00.000Z",
    end_at:     "2026-07-08T08:00:00.000Z",
  };
  assert(isActiveOnDate(order, "2026-07-06") === true,  'date within window → active');
  assert(isActiveOnDate(order, "2026-07-08") === false, 'date == end_at date → not active (end exclusive)');
  assert(isActiveOnDate(order, "2026-06-30") === false, 'date before start → not active');
}

{
  const openEnded = { started_at: "2026-07-01T08:00:00.000Z" };
  assert(isActiveOnDate(openEnded, "2026-12-31") === true, 'no end_at → always active after start');
}

// ── checkAllergyWarnings ─────────────────────────────────────────────────────

console.log("\n── checkAllergyWarnings ────────────────────────────────────");

{
  // No allergies array → no warnings
  const w = checkAllergyWarnings("Augmentin 625", "amoxicillin-clavulanate", []);
  assert(w.length === 0, 'empty allergies → no warnings');
}

{
  // null (field not yet in patient schema) → defensive no warnings
  const w = checkAllergyWarnings("Augmentin 625", "amoxicillin-clavulanate", null);
  assert(w.length === 0, 'null allergies → no warnings (G-2 defensive)');
}

{
  // Exact case-insensitive drug-name match in allergy list
  const w = checkAllergyWarnings("Augmentin 625", null, ["Penicillin", "Augmentin"]);
  assert(w.length === 1, 'drug-name match → 1 warning');
  assert(w[0].type === "allergy",   'warning type === "allergy"');
  assert(w[0].severity === "warning", 'warning severity === "warning"');
}

{
  // Case-insensitive match via generic name (allergen substring in generic)
  const w = checkAllergyWarnings("Augmentin 625", "Amoxicillin-Clavulanate", ["amoxicillin"]);
  assert(w.length === 1, 'case-insensitive generic substring match → 1 warning');
}

{
  // No matching allergen → no warnings
  const w = checkAllergyWarnings("Pantoprazole 40", null, ["Penicillin", "Aspirin"]);
  assert(w.length === 0, 'no matching allergen → no warnings');
}

{
  // One allergen matching multiple targets counts as ONE warning per allergen (dedup)
  const w = checkAllergyWarnings("Amox 500", "amoxicillin", ["amoxicillin"]);
  assert(w.length === 1, 'one allergen matches both name+generic → only 1 warning');
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(60)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error("SELFTEST FAILED");
  process.exit(1);
} else {
  console.log("All selftest assertions passed.");
  process.exit(0);
}
