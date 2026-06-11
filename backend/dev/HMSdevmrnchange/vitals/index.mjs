// vitals/index.mjs — Route mount for the vitals module (Node 22 ESM)
//
// Endpoints (all accept UID or MRN as :pid):
//   POST   /patients/:pid/vitals          — record a reading
//   GET    /patients/:pid/vitals          — recent readings (?limit=N, default 20)
//   GET    /patients/:pid/vitals/latest   — most recent single reading

import { resolveAnyPatientId } from "../ids.mjs";
import { recordVitals, listVitals, getLatestVitals } from "./vitals_crud.mjs";

const mapError = (err, resp) => {
  if (err?.code === "BAD_REQUEST") return resp(400, { error: err.message });
  if (err?.code === "NOT_FOUND") return resp(404, { error: err.message });
  if (err?.code === "CONFLICT") return resp(409, { error: err.message });
  console.error("vitals route error:", err);
  return resp(500, { error: "Internal server error" });
};

const resolveUid = async (deps, anyId) => {
  const r = await resolveAnyPatientId(deps.ddb, deps.TABLE, anyId);
  return r ? { uid: r.uid, mrn: r.mrn || null } : null;
};

const actorOf = (event) => {
  const h = event?.headers || {};
  return {
    user_id: h["x-user-id"] || h["X-User-Id"] || null,
    name: h["x-user-name"] || h["X-User-Name"] || null,
    role: h["x-user-role"] || h["X-User-Role"] || null,
  };
};

export function mountVitalsRoutes(router, ctx) {
  const { ddb, TABLE, INDEX, utils } = ctx;
  const { nowISO, resp, parseBody } = utils;
  const deps = { ddb, TABLE, INDEX };

  router.add("POST", /^\/?patients\/([^/]+)\/vitals\/?$/, async ({ match, event }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const body = parseBody(event);
      const item = await recordVitals(deps, {
        uid: r.uid, body, actor: actorOf(event), nowISO: nowISO(),
      });
      return resp(201, { vitals: item });
    } catch (e) { return mapError(e, resp); }
  });

  // /latest first — more specific path
  router.add("GET", /^\/?patients\/([^/]+)\/vitals\/latest\/?$/, async ({ match }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const item = await getLatestVitals(deps, { uid: r.uid });
      return resp(200, { vitals: item });
    } catch (e) { return mapError(e, resp); }
  });

  router.add("GET", /^\/?patients\/([^/]+)\/vitals\/?$/, async ({ match, qs }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const out = await listVitals(deps, { uid: r.uid, limit: qs?.limit });
      return resp(200, out);
    } catch (e) { return mapError(e, resp); }
  });
}
