// medications/index.mjs — Route mount for the medications module (Node 22 ESM)
//
// Endpoints (all /patients/:id/... accept UID or MRN as :id):
//
//   L0 Med orders
//   POST   /patients/:id/med-orders
//   GET    /patients/:id/med-orders?status=&category=&limit=&cursor=
//   GET    /patients/:id/med-orders/:medId
//   PATCH  /patients/:id/med-orders/:medId
//   POST   /patients/:id/med-orders/:medId/lifecycle
//   DELETE /patients/:id/med-orders/:medId
//
//   L1 MAR
//   GET    /patients/:id/mar?date=YYYY-MM-DD
//   POST   /patients/:id/mar/act
//
//   L3 Dashboard
//   GET    /patients/:id/meds/dashboard?date=YYYY-MM-DD

import { resolveAnyPatientId } from "../ids.mjs";
import {
  createMedOrder,
  listMedOrdersForPatient,
  getMedOrderForPatient,
  patchMedOrder,
  medOrderLifecycle,
  deleteMedOrder,
} from "./med_orders.mjs";
import { getMARGrid, actOnMAR } from "./mar.mjs";
import { getMedsDashboard } from "./dashboard.mjs";

// ── Shared helpers ────────────────────────────────────────────────────────────

const mapError = (err, resp) => {
  if (err?.code === "BAD_REQUEST") return resp(400, { error: err.message });
  if (err?.code === "NOT_FOUND")   return resp(404, { error: err.message });
  if (err?.code === "CONFLICT")    return resp(409, { error: err.message });
  if (err?.name === "TransactionCanceledException")
    return resp(409, { error: "concurrent update — retry with latest version" });
  if (err?.name === "ConditionalCheckFailedException")
    return resp(409, { error: "version conflict" });
  console.error("medications route error:", err);
  return resp(500, { error: "Internal server error" });
};

const resolveUid = async (deps, anyId) => {
  const r = await resolveAnyPatientId(deps.ddb, deps.TABLE, anyId);
  return r || null;
};

const actorOf = (event) => {
  const h = event?.headers || {};
  return {
    user_id: h["x-user-id"]   || h["X-User-Id"]   || null,
    name:    h["x-user-name"] || h["X-User-Name"] || null,
    role:    h["x-user-role"] || h["X-User-Role"] || null,
  };
};

// ── Route mount ───────────────────────────────────────────────────────────────

export function mountMedicationRoutes(router, ctx) {
  const { ddb, TABLE, utils } = ctx;
  const { nowISO, resp, parseBody } = utils;
  const deps = { ddb, TABLE };

  // ── L3 dashboard (more specific path — mount BEFORE /mar to avoid conflict) ──
  router.add("GET", /^\/?patients\/([^/]+)\/meds\/dashboard\/?$/, async ({ match, qs }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const date = qs?.date || nowISO().slice(0, 10);
      const out = await getMedsDashboard(deps, { uid: r.uid, date, nowISO: nowISO() });
      return resp(200, out);
    } catch (e) { return mapError(e, resp); }
  });

  // ── L1 MAR grid ──────────────────────────────────────────────────────────────
  router.add("GET", /^\/?patients\/([^/]+)\/mar\/?$/, async ({ match, qs }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const date = qs?.date || nowISO().slice(0, 10);
      const out = await getMARGrid(deps, { uid: r.uid, date, nowISO: nowISO() });
      return resp(200, out);
    } catch (e) { return mapError(e, resp); }
  });

  // ── L1 MAR act ───────────────────────────────────────────────────────────────
  router.add("POST", /^\/?patients\/([^/]+)\/mar\/act\/?$/, async ({ match, event }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const body = parseBody(event);
      const { medId, date, time, action, note } = body;
      const result = await actOnMAR(deps, {
        uid: r.uid, medId, date, time, action, note,
        actor: actorOf(event), nowISO: nowISO(),
      });
      return resp(200, { mar: result });
    } catch (e) { return mapError(e, resp); }
  });

  // ── L0 Create med order ───────────────────────────────────────────────────────
  router.add("POST", /^\/?patients\/([^/]+)\/med-orders\/?$/, async ({ match, event }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const body = parseBody(event);
      const out = await createMedOrder(deps, {
        uid: r.uid, patientMeta: r.meta,
        body, actor: actorOf(event),
        clientMutationId: body?.clientMutationId,
        nowISO: nowISO(),
      });
      return resp(out.idempotent ? 200 : 201, {
        order: out.order, idempotent: out.idempotent, warnings: out.warnings || [],
      });
    } catch (e) { return mapError(e, resp); }
  });

  // ── L0 List med orders ────────────────────────────────────────────────────────
  router.add("GET", /^\/?patients\/([^/]+)\/med-orders\/?$/, async ({ match, qs }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const out = await listMedOrdersForPatient(deps, {
        uid: r.uid,
        status:   qs?.status,
        category: qs?.category,
        limit:    Number(qs?.limit) || 50,
        cursor:   qs?.cursor,
        nowISO:   nowISO(),
      });
      return resp(200, out);
    } catch (e) { return mapError(e, resp); }
  });

  // ── L0 Lifecycle ──────────────────────────────────────────────────────────────
  // Must be mounted BEFORE single-item GET/PATCH/DELETE to avoid regex conflict
  router.add("POST", /^\/?patients\/([^/]+)\/med-orders\/([^/]+)\/lifecycle\/?$/, async ({ match, event }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const body = parseBody(event);
      const out = await medOrderLifecycle(deps, {
        uid: r.uid, patientMeta: r.meta,
        medId:  decodeURIComponent(match[2]),
        action: body?.action,
        reason: body?.reason,
        expectedVersion: body?.expectedVersion,
        actor: actorOf(event),
        nowISO: nowISO(),
      });
      return resp(200, { order: out.order });
    } catch (e) { return mapError(e, resp); }
  });

  // ── L0 Get single med order ───────────────────────────────────────────────────
  router.add("GET", /^\/?patients\/([^/]+)\/med-orders\/([^/]+)\/?$/, async ({ match }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const order = await getMedOrderForPatient(deps, {
        uid: r.uid, medId: decodeURIComponent(match[2]), nowISO: nowISO(),
      });
      if (!order) return resp(404, { error: "Med order not found" });
      return resp(200, { order });
    } catch (e) { return mapError(e, resp); }
  });

  // ── L0 Patch med order ────────────────────────────────────────────────────────
  router.add("PATCH", /^\/?patients\/([^/]+)\/med-orders\/([^/]+)\/?$/, async ({ match, event }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const body = parseBody(event);
      const out = await patchMedOrder(deps, {
        uid:             r.uid,
        patientMeta:     r.meta,
        medId:           decodeURIComponent(match[2]),
        body,
        actor:           actorOf(event),
        expectedVersion: body?.expectedVersion,
        nowISO:          nowISO(),
      });
      return resp(200, { order: out.order });
    } catch (e) { return mapError(e, resp); }
  });

  // ── L0 Delete med order (draft only) ──────────────────────────────────────────
  router.add("DELETE", /^\/?patients\/([^/]+)\/med-orders\/([^/]+)\/?$/, async ({ match, event }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const out = await deleteMedOrder(deps, {
        uid:   r.uid,
        medId: decodeURIComponent(match[2]),
        actor: actorOf(event),
        nowISO: nowISO(),
      });
      return resp(200, out);
    } catch (e) { return mapError(e, resp); }
  });
}
