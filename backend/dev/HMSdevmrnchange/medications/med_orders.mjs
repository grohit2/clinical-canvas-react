// medications/med_orders.mjs — L0 Med order CRUD + lifecycle (Node 22 ESM)
//
// Data model (see CLAUDE.md / plan):
//   PK=PATIENT#{uid}  SK=MEDORD#{started_at}#{medId}  entity=MEDORD
//   Pointer: PK=PATIENT#{uid}  SK=MEDPTR#{medId}  → { orderSK }
//   Idempotency: IDEMP#PATIENT#{uid} / MUT#{clientMutationId}
//   CHANGE rows: patient + department scopes via buildChangeRows
//
// Lifecycle:
//   draft → activate  →  active
//   active → hold          (reason required)  →  held
//   held   → unhold                            →  active
//   active|held → stop     (reason required)  →  stopped
//   draft|active → cancel  (reason required)  →  cancelled
//   auto "completed" derived at read when end_at < now (never stored)

import { buildChangeRows } from "../changes/changes_emit.mjs";
import {
  medPK, medOrdSK, medPtrSK, newMedId,
  getMedOrderByPtr, listMedOrders as storelist,
  getMedIdemRecord, buildMedIdemItem,
  medTransactWrite,
} from "./med_store.mjs";
import {
  expandPattern, defaultUnit, calcQuantity, calcEndAt,
  scheduleLabel, deriveStatus, checkAllergyWarnings,
} from "./helpers.mjs";

// ── Validation constants ──────────────────────────────────────────────────────

const VALID_CATEGORIES = new Set(["regular", "sos", "stat", "infusion", "narcotic"]);
const VALID_FORMS      = new Set(["tablet", "capsule", "syrup", "injection", "iv", "other"]);
const VALID_STATUSES   = new Set(["draft", "active"]);
const VALID_FOOD       = new Set(["before", "after", "with"]);

// Legal lifecycle actions and their required source/target statuses
const LIFECYCLE = {
  activate: { from: new Set(["draft"]),           to: "active",    needReason: false },
  hold:     { from: new Set(["active"]),           to: "held",      needReason: true  },
  unhold:   { from: new Set(["held"]),             to: "active",    needReason: false },
  stop:     { from: new Set(["active", "held"]),   to: "stopped",   needReason: true  },
  cancel:   { from: new Set(["draft", "active"]),  to: "cancelled", needReason: true  },
};

// ── Internal helpers ──────────────────────────────────────────────────────────

function err(msg, code = "BAD_REQUEST") {
  return Object.assign(new Error(msg), { code });
}

function actorFromBody(actor) {
  return { id: actor?.user_id || null, name: actor?.name || null };
}

/**
 * Build the canonical schedule: expand pattern → slots if pattern provided,
 * else use supplied slots. Merges duration and prn_note.
 */
function buildSchedule(raw, form) {
  const unit = defaultUnit(form || "tablet");
  const pattern = raw?.pattern || null;
  let slots = [];

  if (pattern) {
    const expanded = expandPattern(pattern, unit);
    if (!expanded) throw err(`invalid pattern "${pattern}" — use N-N-N (3-part) or N-N-N-N (4-part)`);
    slots = expanded;
  } else if (Array.isArray(raw?.slots)) {
    // Caller provided explicit slots; coerce types
    slots = raw.slots.map((s) => ({
      time: String(s.time || "").trim(),
      dose: Number(s.dose) || 0,
      unit: String(s.unit || unit).trim(),
    })).filter((s) => s.time && s.dose > 0);
  }

  return {
    pattern: pattern || null,
    slots,
    duration_days: raw?.duration_days ? Number(raw.duration_days) : null,
    prn_note: raw?.prn_note ? String(raw.prn_note).trim() : null,
  };
}

/**
 * Emit CHANGE rows (patient scope + optional department scope).
 * Returns an array of { kind:"put", Item } descriptors for medTransactWrite.
 */
function changeOps(args, TABLE) {
  const rows = buildChangeRows(args);
  return rows.map((r) => ({
    kind: "put",
    Item: r.Item,
  }));
}

// ── CREATE ────────────────────────────────────────────────────────────────────

export async function createMedOrder(deps, { uid, patientMeta, body, actor, nowISO, clientMutationId }) {
  const { ddb, TABLE } = deps;

  // Idempotency check
  if (clientMutationId) {
    const prior = await getMedIdemRecord(ddb, TABLE, uid, clientMutationId);
    if (prior) {
      // Return the cached order
      const cached = prior.response_summary?.med_id
        ? await getMedOrderByPtr(ddb, TABLE, uid, prior.response_summary.med_id)
        : null;
      return { order: cached, idempotent: true };
    }
  }

  // Validate required fields
  const drug = body?.drug;
  if (!drug?.name) throw err("drug.name is required");
  const category = body?.category;
  if (!category) throw err("category is required");
  if (!VALID_CATEGORIES.has(category)) throw err(`invalid category: ${category}`);
  const route = body?.route;
  if (!route) throw err("route is required");
  const form = drug?.form || "tablet";
  if (!VALID_FORMS.has(form)) throw err(`invalid drug.form: ${form}`);
  const food = body?.food || null;
  if (food && !VALID_FOOD.has(food)) throw err(`invalid food: ${food}`);
  const initialStatus = body?.status || "active";
  if (!VALID_STATUSES.has(initialStatus)) throw err(`invalid initial status: ${initialStatus}`);

  // Build schedule (SOS requires no slots)
  const rawSchedule = body?.schedule || {};
  let schedule;
  if (category === "sos") {
    // SOS: no slots required, still record pattern/prn_note if given
    schedule = {
      pattern: rawSchedule.pattern || null,
      slots: [],
      duration_days: rawSchedule.duration_days ? Number(rawSchedule.duration_days) : null,
      prn_note: rawSchedule.prn_note ? String(rawSchedule.prn_note).trim() : null,
    };
  } else {
    schedule = buildSchedule(rawSchedule, form);
  }

  const durationDays = schedule.duration_days;
  const startedAt    = nowISO;
  const endAt        = calcEndAt(startedAt, durationDays);
  const quantity     = calcQuantity(schedule.slots, durationDays, form, category);
  const medId        = newMedId();
  const orderSK      = medOrdSK(startedAt, medId);

  const orderedBy = {
    id:   actor?.user_id || null,
    name: actor?.name    || null,
    role: actor?.role    || null,
  };

  const item = {
    PK:        medPK(uid),
    SK:        orderSK,
    entity:    "MEDORD",
    med_id:    medId,
    patient_uid: uid,
    drug: {
      name:    drug.name,
      generic: drug.generic ? String(drug.generic).trim() : null,
      form,
    },
    category,
    route,
    food,
    schedule,
    quantity,
    infusion:     body?.infusion    || null,
    priority:     body?.priority    || "routine",
    instructions: body?.instructions ? String(body.instructions).trim() : null,
    status:       initialStatus,
    status_history: [{
      status: initialStatus,
      at:     startedAt,
      by:     orderedBy,
      reason: null,
    }],
    started_at:  startedAt,
    end_at:      endAt,
    ordered_by:  orderedBy,
    version:     1,
    created_at:  startedAt,
    updated_at:  startedAt,
  };

  const ptrItem = {
    PK:      medPK(uid),
    SK:      medPtrSK(medId),
    entity:  "MEDPTR",
    med_id:  medId,
    orderSK,
    created_at: startedAt,
  };

  const dept = patientMeta?.department || null;
  const chgOps = changeOps({
    op: "created", entity: "MEDORD", entity_id: medId,
    patient_uid: uid,
    scopes: { patient: uid, ...(dept && { department: dept }) },
    snapshot: {
      med_id: medId, drug_name: drug.name, category, status: initialStatus,
      route, schedule_label: scheduleLabel(schedule, category),
    },
    actor: actorFromBody(actor), nowISO,
  }, TABLE);

  const ops = [
    { kind: "put", Item: item, conditionExpression: "attribute_not_exists(PK) AND attribute_not_exists(SK)" },
    { kind: "put", Item: ptrItem },
    ...chgOps,
  ];

  if (clientMutationId) {
    ops.push({
      kind: "put",
      Item: buildMedIdemItem(uid, clientMutationId, { med_id: medId }, nowISO),
    });
  }

  await medTransactWrite(ddb, TABLE, ops);

  // G-2: Basic allergy cross-check (warn-only; never blocks the order).
  // patientMeta.allergies is not yet stored in the patient record (HMS v1 schema
  // has no allergies field on META_LATEST). checkAllergyWarnings returns [] when
  // the field is absent. When allergies are added to the patient schema, this
  // activates automatically.
  const allergyWarnings = checkAllergyWarnings(
    drug.name,
    drug.generic || null,
    patientMeta?.allergies || null,
  );

  return { order: item, idempotent: false, warnings: allergyWarnings };
}

// ── LIST ─────────────────────────────────────────────────────────────────────

export async function listMedOrdersForPatient(deps, { uid, status, category, limit, cursor, nowISO }) {
  const { ddb, TABLE } = deps;
  const storeStatus = (status === "completed") ? undefined : status;
  const { items, nextCursor } = await storelist(ddb, TABLE, uid, {
    limit, cursor, status: storeStatus, category,
  });

  // Apply derived "completed" status and filter if requested
  const enriched = items.map((o) => ({ ...o, status: deriveStatus(o, nowISO) }));
  const filtered = status ? enriched.filter((o) => o.status === status) : enriched;
  return { items: filtered, cursor: nextCursor };
}

// ── GET ───────────────────────────────────────────────────────────────────────

export async function getMedOrderForPatient(deps, { uid, medId, nowISO }) {
  const { ddb, TABLE } = deps;
  const item = await getMedOrderByPtr(ddb, TABLE, uid, medId);
  if (!item) return null;
  return { ...item, status: deriveStatus(item, nowISO) };
}

// ── PATCH ─────────────────────────────────────────────────────────────────────

export async function patchMedOrder(deps, { uid, patientMeta, medId, body, actor, expectedVersion, nowISO }) {
  const { ddb, TABLE } = deps;

  const current = await getMedOrderByPtr(ddb, TABLE, uid, medId);
  if (!current) throw err("Med order not found", "NOT_FOUND");

  // Version check
  const expV = expectedVersion !== undefined ? Number(expectedVersion) : current.version;
  if (current.version !== expV) {
    throw err(`version conflict: expected ${expV}, got ${current.version}`, "CONFLICT");
  }

  const isDraft = current.status === "draft";

  // Capture current schedule summary for G-1 modification history entry.
  const priorScheduleSummary = !isDraft && current.schedule
    ? scheduleLabel(current.schedule, current.category)
    : null;

  // Active orders: only schedule/instructions/priority are editable
  const allowedPatch = {};
  if (body?.instructions !== undefined) allowedPatch.instructions = String(body.instructions).trim() || null;
  if (body?.priority !== undefined)     allowedPatch.priority     = body.priority;

  if (body?.schedule !== undefined || body?.drug?.form !== undefined) {
    if (!isDraft) {
      // Active: only schedule is allowed
      if (body?.schedule !== undefined) {
        const form = current.drug?.form || "tablet";
        const newSched = buildSchedule(body.schedule, form);
        const newEndAt = calcEndAt(current.started_at, newSched.duration_days);
        const newQty   = calcQuantity(newSched.slots, newSched.duration_days, form, current.category);
        allowedPatch.schedule = newSched;
        allowedPatch.end_at   = newEndAt;
        allowedPatch.quantity = newQty;
      }
    } else {
      // Draft: any field allowed
      if (body?.drug)      allowedPatch.drug     = { ...current.drug, ...body.drug };
      if (body?.category)  allowedPatch.category = body.category;
      if (body?.route)     allowedPatch.route    = body.route;
      if (body?.food !== undefined) allowedPatch.food = body.food || null;
      if (body?.infusion !== undefined) allowedPatch.infusion = body.infusion;
      if (body?.schedule !== undefined) {
        const form = allowedPatch.drug?.form || current.drug?.form || "tablet";
        const newSched = buildSchedule(body.schedule, form);
        const newEndAt = calcEndAt(current.started_at, newSched.duration_days);
        const newQty   = calcQuantity(newSched.slots, newSched.duration_days, form, allowedPatch.category || current.category);
        allowedPatch.schedule = newSched;
        allowedPatch.end_at   = newEndAt;
        allowedPatch.quantity = newQty;
      }
    }
  }

  // G-1: Append a "modified" entry to status_history when schedule/dose changes on
  // an active order so the original dose is traceable without touching the CHANGES feed.
  const scheduleChanged = !isDraft && allowedPatch.schedule !== undefined;
  const modifiedHistoryEntry = scheduleChanged
    ? {
        status: "modified",
        at:     nowISO,
        by:     actorFromBody(actor),
        change: {
          prior: priorScheduleSummary,
          next:  scheduleLabel(allowedPatch.schedule, current.category),
        },
      }
    : null;

  const updated = {
    ...current,
    ...allowedPatch,
    ...(modifiedHistoryEntry && {
      status_history: [...(current.status_history || []), modifiedHistoryEntry],
    }),
    version:    expV + 1,
    updated_at: nowISO,
  };

  // B5: Emit a CHANGE row for schedule/dose modifications so the change-feed
  // reflects dose edits (UC-12 explicitly calls for op:"modified").
  const dept = patientMeta?.department || null;
  const patchChgOps = scheduleChanged
    ? changeOps({
        op: "updated", entity: "MEDORD", entity_id: medId,
        patient_uid: uid,
        scopes: { patient: uid, ...(dept && { department: dept }) },
        snapshot: {
          med_id: medId, drug_name: current.drug?.name,
          category: current.category, status: updated.status,
          schedule_label: scheduleLabel(updated.schedule, current.category),
          prior_schedule_label: priorScheduleSummary,
        },
        actor: actorFromBody(actor), nowISO,
      }, TABLE)
    : [];

  // Full replacement with ConditionExpression version guard
  await medTransactWrite(ddb, TABLE, [
    {
      kind: "put",
      Item: updated,
      conditionExpression: "#v = :expV",
      expressionAttributeNames: { "#v": "version" },
      expressionAttributeValues: { ":expV": expV },
    },
    ...patchChgOps,
  ]);
  return { order: updated };
}

// ── LIFECYCLE ─────────────────────────────────────────────────────────────────

export async function medOrderLifecycle(deps, { uid, patientMeta, medId, action, reason, actor, expectedVersion, nowISO }) {
  const { ddb, TABLE } = deps;

  const transition = LIFECYCLE[action];
  if (!transition) throw err(`invalid action: ${action}`, "BAD_REQUEST");

  const current = await getMedOrderByPtr(ddb, TABLE, uid, medId);
  if (!current) throw err("Med order not found", "NOT_FOUND");

  const currentStatus = deriveStatus(current, nowISO);

  if (!transition.from.has(currentStatus)) {
    throw err(`cannot ${action} an order with status "${currentStatus}"`, "CONFLICT");
  }
  if (transition.needReason && !reason) {
    throw err(`reason is required for action: ${action}`, "BAD_REQUEST");
  }

  // Version check
  const expV = expectedVersion !== undefined ? Number(expectedVersion) : current.version;
  if (current.version !== expV) {
    throw err(`version conflict: expected ${expV}, got ${current.version}`, "CONFLICT");
  }

  const historyEntry = {
    status: transition.to,
    at:     nowISO,
    by:     actorFromBody(actor),
    reason: reason || null,
  };

  const updated = {
    ...current,
    status:         transition.to,
    status_history: [...(current.status_history || []), historyEntry],
    version:        expV + 1,
    updated_at:     nowISO,
  };

  const dept = patientMeta?.department || null;
  const chgOps = changeOps({
    op: "updated", entity: "MEDORD", entity_id: medId,
    patient_uid: uid,
    scopes: { patient: uid, ...(dept && { department: dept }) },
    snapshot: {
      med_id: medId, drug_name: current.drug?.name,
      category: current.category, status: transition.to,
    },
    actor: actorFromBody(actor), nowISO,
  }, TABLE);

  await medTransactWrite(ddb, TABLE, [
    {
      kind: "put",
      Item: updated,
      conditionExpression: "#v = :expV",
      expressionAttributeNames: { "#v": "version" },
      expressionAttributeValues: { ":expV": expV },
    },
    ...chgOps,
  ]);
  return { order: updated };
}

// ── DELETE (draft only) ───────────────────────────────────────────────────────

export async function deleteMedOrder(deps, { uid, medId, actor, nowISO }) {
  const { ddb, TABLE } = deps;

  const item = await getMedOrderByPtr(ddb, TABLE, uid, medId);
  if (!item) throw err("Med order not found", "NOT_FOUND");
  if (item.status !== "draft") {
    throw err("Only draft orders can be deleted; use lifecycle cancel or stop instead", "CONFLICT");
  }

  await medTransactWrite(ddb, TABLE, [
    { kind: "delete", Key: { PK: medPK(uid), SK: item.SK } },
    { kind: "delete", Key: { PK: medPK(uid), SK: medPtrSK(medId) } },
  ]);
  return { deleted: true, med_id: medId };
}
