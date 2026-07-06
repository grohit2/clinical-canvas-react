// pnotes/index.mjs — Route mount for the progress-notes module (Node 22 ESM)
//
// Endpoints (all patient-scoped routes accept UID or MRN as :id):
//   POST   /patients/:id/progress-notes                          — create note (draft or final)
//   GET    /patients/:id/progress-notes                          — list notes (?author&from&to&status&unacked&limit&cursor)
//   POST   /patients/:id/progress-notes/:pnId/acknowledge        — acknowledge a final note
//   POST   /patients/:id/progress-notes/:pnId/unchart            — retract a note (body.reason required)
//   GET    /patients/:id/progress-notes/:pnId                    — get single note
//   PATCH  /patients/:id/progress-notes/:pnId                    — edit text/sections or publish draft
//   GET    /patients/:id/care-plan                               — synthesized care-plan view (L3)
//   GET    /doctors/:id/ack-queue                                — attending's pending-ack inbox

import { resolveAnyPatientId } from "../ids.mjs";
import {
  createPnote,
  listPnotes,
  listAllNotes,
  getPnote,
  patchPnote,
  ackPnote,
  unchartPnote,
  getAckQueue,
  getCarePlan,
  toUiPnote,
} from "./pnotes_store.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mapError = (err, resp) => {
  if (err?.code === "BAD_REQUEST")  return resp(400, { error: err.message, code: err.code });
  if (err?.code === "NOT_FOUND")    return resp(404, { error: err.message, code: err.code });
  if (err?.code === "CONFLICT")     return resp(409, { error: err.message, code: err.code });
  if (err?.code === "LOCKED")       return resp(409, { error: err.message, code: err.code });
  if (err?.code === "DRAFT_EXISTS") return resp(409, { error: err.message, code: err.code });
  console.error("pnotes route error:", err);
  return resp(500, { error: "Internal server error" });
};

// Returns { uid, meta, mrn } — createPnote needs meta for PAD/POD, assigned_doctor_id, etc.
const resolveUid = async (deps, anyId) => {
  const r = await resolveAnyPatientId(deps.ddb, deps.TABLE, anyId);
  return r ? { uid: r.uid, meta: r.meta, mrn: r.mrn || null } : null;
};

const actorOf = (event) => {
  const h = event?.headers || {};
  return {
    user_id: h["x-user-id"]   || h["X-User-Id"]   || null,
    name:    h["x-user-name"] || h["X-User-Name"] || null,
    role:    h["x-user-role"] || h["X-User-Role"] || null,
  };
};

// ---------------------------------------------------------------------------
// Route mount
// ---------------------------------------------------------------------------

export function mountPnoteRoutes(router, ctx) {
  const { ddb, TABLE, INDEX, utils } = ctx;
  const { nowISO, resp, parseBody } = utils;
  const deps = { ddb, TABLE, INDEX };

  // 1. POST /patients/:id/progress-notes — create (draft or final)
  router.add("POST", /^\/?patients\/([^/]+)\/progress-notes\/?$/, async ({ match, event }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const body = parseBody(event);
      const { item } = await createPnote(deps, {
        uid: r.uid,
        meta: r.meta,
        body,
        actor: actorOf(event),
        nowISO: nowISO(),
      });
      return resp(201, { note: toUiPnote(item) });
    } catch (e) { return mapError(e, resp); }
  });

  // 2. GET /patients/:id/progress-notes — list with optional filters
  //    ?all=1 exhausts pagination server-side and returns every note;
  //    ?all=1&includeLegacy=1 additionally merges legacy notes.mjs rows
  //    (kind: "progress" | "legacy"), newest first.
  router.add("GET", /^\/?patients\/([^/]+)\/progress-notes\/?$/, async ({ match, qs }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      if (qs?.all === "1" || qs?.all === "true") {
        const out = await listAllNotes(deps, {
          uid: r.uid,
          includeLegacy: qs?.includeLegacy === "1" || qs?.includeLegacy === "true",
        });
        return resp(200, out);
      }
      const out = await listPnotes(deps, {
        uid:     r.uid,
        author:  qs?.author,
        from:    qs?.from,
        to:      qs?.to,
        status:  qs?.status,
        unacked: qs?.unacked,
        limit:   qs?.limit,
        cursor:  qs?.cursor,
      });
      return resp(200, { items: out.items.map(toUiPnote), nextCursor: out.nextCursor });
    } catch (e) { return mapError(e, resp); }
  });

  // 3. POST /patients/:id/progress-notes/:pnId/acknowledge — ack a final note
  //    Registered BEFORE the bare /:pnId routes to avoid any ambiguity.
  router.add("POST", /^\/?patients\/([^/]+)\/progress-notes\/([^/]+)\/acknowledge\/?$/, async ({ match, event }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const { item } = await ackPnote(deps, {
        uid:    r.uid,
        pnId:   decodeURIComponent(match[2]),
        actor:  actorOf(event),
        nowISO: nowISO(),
      });
      return resp(200, { note: toUiPnote(item) });
    } catch (e) { return mapError(e, resp); }
  });

  // 4. POST /patients/:id/progress-notes/:pnId/unchart — retract a note
  //    Registered BEFORE the bare /:pnId routes; body.reason is mandatory.
  router.add("POST", /^\/?patients\/([^/]+)\/progress-notes\/([^/]+)\/unchart\/?$/, async ({ match, event }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const body = parseBody(event);
      if (!body.reason) return resp(400, { error: "reason is required", code: "BAD_REQUEST" });
      const { item } = await unchartPnote(deps, {
        uid:    r.uid,
        pnId:   decodeURIComponent(match[2]),
        actor:  actorOf(event),
        reason: body.reason,
        nowISO: nowISO(),
      });
      return resp(200, { note: toUiPnote(item) });
    } catch (e) { return mapError(e, resp); }
  });

  // 5. GET /patients/:id/progress-notes/:pnId — fetch single note
  router.add("GET", /^\/?patients\/([^/]+)\/progress-notes\/([^/]+)\/?$/, async ({ match }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const { item } = await getPnote(deps, {
        uid:  r.uid,
        pnId: decodeURIComponent(match[2]),
      });
      return resp(200, { note: toUiPnote(item) });
    } catch (e) { return mapError(e, resp); }
  });

  // 6. PATCH /patients/:id/progress-notes/:pnId — edit text/sections or publish draft
  router.add("PATCH", /^\/?patients\/([^/]+)\/progress-notes\/([^/]+)\/?$/, async ({ match, event }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const body = parseBody(event);
      const { item } = await patchPnote(deps, {
        uid:    r.uid,
        pnId:   decodeURIComponent(match[2]),
        body,
        actor:  actorOf(event),
        nowISO: nowISO(),
      });
      return resp(200, { note: toUiPnote(item) });
    } catch (e) { return mapError(e, resp); }
  });

  // 7. GET /patients/:id/care-plan — synthesized L3 view (no write, derived only)
  router.add("GET", /^\/?patients\/([^/]+)\/care-plan\/?$/, async ({ match }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const plan = await getCarePlan(deps, { uid: r.uid });
      return resp(200, plan);
    } catch (e) { return mapError(e, resp); }
  });

  // 8. GET /doctors/:id/ack-queue — attending's cross-patient ack inbox
  //    No patient resolution — doctorId is the path segment directly.
  router.add("GET", /^\/?doctors\/([^/]+)\/ack-queue\/?$/, async ({ match, qs }) => {
    try {
      const out = await getAckQueue(deps, {
        doctorId: decodeURIComponent(match[1]),
        limit:    qs?.limit,
      });
      return resp(200, { items: out.items.map(toUiPnote) });
    } catch (e) { return mapError(e, resp); }
  });
}
