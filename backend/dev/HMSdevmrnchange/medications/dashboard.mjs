// medications/dashboard.mjs — L3 24-hour medication dashboard view-model (Node 22 ESM)
//
// GET /patients/{id}/meds/dashboard?date=YYYY-MM-DD
//
// Returns { date, categories: { regular, sos, infusion, narcotic, stat, stopped },
//           counts: { due, given, overdue } }
//
// Internally calls the same MAR materialization as GET /mar?date= so the
// dashboard is always consistent with the MAR grid.
//
// "stopped" category: includes orders with effective status
//   stopped | cancelled | completed.

import { listMedOrders as storelist } from "./med_store.mjs";
import { getMARGrid } from "./mar.mjs";
import { deriveStatus, isActiveOnDate, scheduleLabel, isOverdue } from "./helpers.mjs";

const ACTIVE_CATEGORIES = ["regular", "sos", "infusion", "narcotic", "stat"];

/**
 * Build the trimmed med summary shown per-order in the dashboard.
 */
function trimMed(order, nowISO) {
  const label = scheduleLabel(order.schedule, order.category);
  return {
    med_id:         order.med_id,
    drug_name:      order.drug?.name || "unknown",
    form:           order.drug?.form || "other",
    route:          order.route,
    schedule_label: label,
    status:         deriveStatus(order, nowISO),
    instructions:   order.instructions || null,
    food:           order.food || null,
  };
}

/**
 * Build the 24-h dashboard for a patient on a given date.
 *
 * @param {object} deps   { ddb, TABLE }
 * @param {object} args   { uid, date, nowISO }
 */
export async function getMedsDashboard(deps, { uid, date, nowISO }) {
  const { ddb, TABLE } = deps;

  // ── 1. Fetch all orders ───────────────────────────────────────────────────
  let allOrders = [];
  let cursor;
  do {
    const { items, nextCursor } = await storelist(ddb, TABLE, uid, { limit: 200, cursor });
    allOrders.push(...items);
    cursor = nextCursor;
  } while (cursor);

  // ── 2. Materialize + fetch MAR grid for the date ──────────────────────────
  const { items: marItems } = await getMARGrid(deps, { uid, date, nowISO });
  // Index MAR by med_id+time for fast lookup
  const marIndex = new Map(); // key: `${med_id}#${time}`
  for (const row of marItems) {
    marIndex.set(`${row.med_id}#${row.time}`, row);
  }

  // ── 3. Build category buckets ─────────────────────────────────────────────
  const buckets = {
    regular:  [],
    sos:      [],
    infusion: [],
    narcotic: [],
    stat:     [],
    stopped:  [],
  };

  const counts = { due: 0, given: 0, overdue: 0 };

  for (const order of allOrders) {
    const effective = deriveStatus(order, nowISO);
    const isStopped = ["stopped", "cancelled", "completed"].includes(effective);
    const activeOnDate = isActiveOnDate(order, date);

    if (isStopped) {
      // Show in stopped bucket regardless of date
      buckets.stopped.push({
        med: trimMed(order, nowISO),
        slots: [],
        stopped_reason: order.status_history?.slice(-1)[0]?.reason || null,
      });
      continue;
    }

    if (!activeOnDate) continue; // future or past order, not shown today

    const cat = ACTIVE_CATEGORIES.includes(order.category) ? order.category : "regular";
    const slots = order.schedule?.slots || [];

    // For SOS meds: show any adhoc doses given today
    if (order.category === "sos" || slots.length === 0) {
      // Find adhoc MAR rows for this med
      const adhocRows = marItems.filter(
        (r) => r.med_id === order.med_id
      );
      buckets.sos.push({
        med: trimMed(order, nowISO),
        slots: adhocRows.map((r) => ({
          time:   r.time,
          dose:   r.dose,
          unit:   r.unit,
          status: r.status,
          overdue: false, // SOS adhoc rows don't have overdue
          note:   r.note || null,
        })),
      });
      continue;
    }

    // Scheduled med: build slot view from MAR
    const slotViews = slots.map((slot) => {
      const marRow = marIndex.get(`${order.med_id}#${slot.time}`);
      const status = marRow ? marRow.status : "pending";
      const overdue = status === "pending" && isOverdue(date, slot.time, nowISO);

      if (status === "pending" && !overdue) counts.due++;
      if (status === "administered")        counts.given++;
      if (overdue)                          counts.overdue++;

      return {
        time:   slot.time,
        dose:   slot.dose,
        unit:   slot.unit,
        status,
        overdue,
        note:   marRow?.note || null,
        acted_by: marRow?.acted_by || null,
        acted_at: marRow?.acted_at || null,
      };
    });

    buckets[cat].push({
      med:   trimMed(order, nowISO),
      slots: slotViews,
    });
  }

  return {
    date,
    categories: buckets,
    counts,
  };
}
