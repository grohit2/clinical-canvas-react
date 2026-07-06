// medications/mar.mjs — L1 MAR (Medication Administration Record) (Node 22 ESM)
//
// Lazy materialization design:
//   GET /mar?date= → for every active order with a slot on that date,
//   conditionally Put a MAR row (attribute_not_exists) so the row
//   only exists if not already recorded. Then query and return the grid.
//   Overdue flag is derived at read — never stored.
//
// SOS meds have no scheduled slots; POST /mar/act with time="adhoc-HH:mm"
// creates the MAR row on the fly.
//
// Action idempotency:
//   same action on an already-acted row → 200
//   different action on an acted row    → 409  (unless action="undo")
//   "undo"                              → reset to pending

import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { buildChangeRows } from "../changes/changes_emit.mjs";
import {
  medPK, marSK, getMARRow, listMARForDate, medTransactWrite,
} from "./med_store.mjs";
import { listMedOrders as storelist } from "./med_store.mjs";
import { deriveStatus, isOverdue, isActiveOnDate } from "./helpers.mjs";

// Statuses considered "acted" (conflict check uses these)
const ACTED_STATUSES = new Set(["administered", "refused", "vomited", "withheld"]);
const VALID_ACTIONS  = new Set(["administered", "refused", "vomited", "withheld", "undo"]);
// Emit CHANGE row for these actions only
const EMIT_CHANGE_FOR = new Set(["administered", "refused", "vomited"]);

function err(msg, code = "BAD_REQUEST") {
  return Object.assign(new Error(msg), { code });
}

function actorFromActor(actor) {
  return { id: actor?.user_id || null, name: actor?.name || null };
}

// ── Materialization ───────────────────────────────────────────────────────────

/**
 * For a given date, fetch all active med orders, conditionally Put any missing
 * MAR rows (idempotent), then query and return the grid annotated with
 * overdue: boolean.
 *
 * @param {object} deps   { ddb, TABLE }
 * @param {object} args   { uid, date, nowISO }
 * @returns {Promise<{ items: Array }>}
 */
export async function getMARGrid(deps, { uid, date, nowISO }) {
  const { ddb, TABLE } = deps;

  // 1. Fetch all non-draft / non-stopped / non-cancelled orders
  //    Use a generous Limit (up to 500) to capture all orders in one pass.
  //    MAR materialization is done per-date; patients rarely have >50 orders.
  let orders = [];
  let cursor;
  do {
    const { items, nextCursor } = await storelist(ddb, TABLE, uid, { limit: 200, cursor });
    for (const o of items) {
      const effective = deriveStatus(o, nowISO);
      if (["draft", "stopped", "cancelled"].includes(effective)) continue;
      if (!isActiveOnDate(o, date)) continue;
      orders.push({ ...o, _effectiveStatus: effective });
    }
    cursor = nextCursor;
  } while (cursor);

  // 2. Conditionally Put missing MAR rows
  //    Each Put uses ConditionExpression: attribute_not_exists(PK) AND attribute_not_exists(SK)
  //    so existing (already-acted) rows are never overwritten.
  const puts = [];
  for (const order of orders) {
    const slots = order.schedule?.slots || [];
    if (slots.length === 0) continue; // SOS → no scheduled slots

    const marStatus = order._effectiveStatus === "held" ? "withheld" : "pending";

    for (const slot of slots) {
      const SK = marSK(date, slot.time, order.med_id);
      puts.push({
        PK:        medPK(uid),
        SK,
        entity:    "MAR",
        med_id:    order.med_id,
        drug_name: order.drug?.name || "unknown",
        category:  order.category,
        date,
        time:      slot.time,
        dose:      slot.dose,
        unit:      slot.unit,
        status:    marStatus,
        created_at: nowISO,
      });
    }
  }

  if (puts.length > 0) {
    // DynamoDB TransactWriteItems hard limit is 25 items per call.
    // (The old comment said 100 — that is wrong and would throw ValidationException.)
    const BATCH = 25;
    for (let i = 0; i < puts.length; i += BATCH) {
      const batch = puts.slice(i, i + BATCH);
      const TransactItems = batch.map((Item) => ({
        Put: {
          TableName: TABLE,
          Item,
          ConditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)",
        },
      }));
      // Failures from ConditionExpression (row already exists) are expected and swallowed.
      // B3: Only swallow TransactionCanceledException when ALL individual cancellation
      // reasons are ConditionalCheckFailed or None (i.e., the row already existed).
      // Re-throw on transient DynamoDB errors (capacity, throttle, network) so the
      // caller gets a 500 instead of silently returning a stale MAR grid.
      try {
        await ddb.send(new TransactWriteCommand({ TransactItems }));
      } catch (e) {
        if (e?.name !== "TransactionCanceledException") throw e;
        // Inspect per-item cancellation reasons — safe codes = ConditionalCheckFailed | None
        const SAFE_CODES = new Set(["ConditionalCheckFailed", "None", undefined, null]);
        const reasons = Array.isArray(e?.CancellationReasons) ? e.CancellationReasons : [];
        const allSafe = reasons.every((r) => SAFE_CODES.has(r?.Code));
        if (!allSafe) throw e; // propagate throttle / resource errors
      }
    }
  }

  // 3. Query all MAR rows for this date
  const raw = await listMARForDate(ddb, TABLE, uid, date);

  // 4. Annotate with overdue flag
  const items = raw.map((row) => {
    const overdue = row.status === "pending" && isOverdue(date, row.time, nowISO);
    return { ...row, overdue };
  });

  return { items };
}

// ── MAR action ────────────────────────────────────────────────────────────────

/**
 * Record or update a MAR dose action.
 *
 * @param {object} deps  { ddb, TABLE }
 * @param {object} args  { uid, medId, date, time, action, note, actor, nowISO }
 */
export async function actOnMAR(deps, { uid, medId, date, time, action, note, actor, nowISO }) {
  const { ddb, TABLE } = deps;

  if (!VALID_ACTIONS.has(action)) {
    throw err(`invalid action: ${action}. Must be one of ${[...VALID_ACTIONS].join(", ")}`);
  }
  if (!date || !time) throw err("date and time are required");
  if (!medId)         throw err("medId is required");

  const isAdhoc = time.startsWith("adhoc-");

  // B4: Validate adhoc time format — "adhoc-HH:mm" where HH=00-23, mm=00-59.
  // Without this check "adhoc-25:99" would be silently stored and produce an
  // orphan SK that never matches any query.
  if (isAdhoc) {
    const hhMm = time.slice(6); // strip "adhoc-"
    const adhocOk = /^\d{2}:\d{2}$/.test(hhMm) &&
      (() => { const [h, m] = hhMm.split(":").map(Number); return h <= 23 && m <= 59; })();
    if (!adhocOk) throw err(`invalid adhoc time "${time}" — expected format "adhoc-HH:mm" (00-23:00-59)`);
  }

  const SK = marSK(date, time, medId);

  let current = await getMARRow(ddb, TABLE, uid, date, time, medId);

  if (!current) {
    if (action === "undo") {
      // Nothing to undo — return gracefully
      return { status: "pending", note: "no row to undo" };
    }
    // Row doesn't exist yet — create it (SOS adhoc or missed materialization)
    const initStatus = action === "undo" ? "pending" : action;
    const newRow = {
      PK:        medPK(uid),
      SK,
      entity:    "MAR",
      med_id:    medId,
      drug_name: null, // will be filled in if we can look up the order (kept null for now)
      category:  null,
      date,
      time,
      dose:      null,
      unit:      null,
      status:    initStatus,
      acted_by:  action !== "undo" ? actorFromActor(actor) : null,
      acted_at:  action !== "undo" ? nowISO : null,
      note:      note ? String(note).trim() : null,
      created_at: nowISO,
      adhoc:     isAdhoc,
    };

    const ops = [
      { kind: "put", Item: newRow, conditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)" },
    ];
    if (EMIT_CHANGE_FOR.has(action)) {
      const chgRows = buildChangeRows({
        op: "created", entity: "MAR", entity_id: `${date}#${time}#${medId}`,
        patient_uid: uid,
        scopes: { patient: uid },
        snapshot: { med_id: medId, date, time, action },
        actor: actorFromActor(actor), nowISO,
      });
      ops.push(...chgRows.map((r) => ({ kind: "put", Item: r.Item })));
    }
    await medTransactWrite(ddb, TABLE, ops);
    return { ...newRow, overdue: false };
  }

  // Row exists — check idempotency / conflict
  if (action === "undo") {
    // Reset to pending
    const reset = {
      ...current,
      status:   "pending",
      acted_by: null,
      acted_at: null,
      note:     note ? String(note).trim() : current.note,
    };
    await medTransactWrite(ddb, TABLE, [
      {
        kind: "put",
        Item: reset,
        conditionExpression: "attribute_exists(PK)",
      },
    ]);
    return { ...reset, overdue: isOverdue(date, time, nowISO) };
  }

  // Idempotent same-action on acted row
  if (ACTED_STATUSES.has(current.status) && current.status === action) {
    return { ...current, overdue: false }; // already in this state
  }

  // Conflict: different action on an already-acted row
  if (ACTED_STATUSES.has(current.status)) {
    throw err(
      `Cannot apply "${action}" — row already has status "${current.status}". Use action "undo" first.`,
      "CONFLICT"
    );
  }

  // Apply action on pending/withheld row
  const updated = {
    ...current,
    status:   action,
    acted_by: actorFromActor(actor),
    acted_at: nowISO,
    note:     note ? String(note).trim() : current.note,
  };

  const ops = [
    { kind: "put", Item: updated, conditionExpression: "attribute_exists(PK)" },
  ];
  if (EMIT_CHANGE_FOR.has(action)) {
    const chgRows = buildChangeRows({
      op: "updated", entity: "MAR", entity_id: `${date}#${time}#${medId}`,
      patient_uid: uid,
      scopes: { patient: uid },
      snapshot: { med_id: medId, date, time, action },
      actor: actorFromActor(actor), nowISO,
    });
    ops.push(...chgRows.map((r) => ({ kind: "put", Item: r.Item })));
  }
  await medTransactWrite(ddb, TABLE, ops);
  return { ...updated, overdue: false };
}
