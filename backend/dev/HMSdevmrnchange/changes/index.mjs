// changes/index.mjs — Unified delta endpoint mount (Node 22 ESM)
//
//   GET /changes?scope=<patient|assignee|doctor|department>&id=<id>
//                &after=<cursor>&limit=<n>
//     → { items: [...], cursor: <last_cursor> }
//
//   - `after` is a server-returned cursor from a previous response
//     (or empty for "since beginning").
//   - The response cursor is what the client persists in localStorage.
//   - Tombstones (`op="deleted"`) are first-class rows.

import { SCOPE_KINDS, queryChanges } from "./changes_store.mjs";
import { resolveAnyPatientId } from "../ids.mjs";

const mapError = (err, resp) => {
  if (err?.code === "BAD_REQUEST") return resp(400, { error: err.message });
  if (err?.code === "NOT_FOUND") return resp(404, { error: err.message });
  console.error("changes route error:", err);
  return resp(500, { error: "Internal server error" });
};

export function mountChangesRoutes(router, ctx) {
  const { ddb, TABLE, utils } = ctx;
  const { resp } = utils;
  const deps = { ddb, TABLE };

  router.add("GET", /^\/?changes\/?$/, async ({ qs }) => {
    try {
      const { scope, id, after, limit } = qs || {};
      if (!scope || !id) return resp(400, { error: "scope and id required" });
      const scopeNorm = String(scope).toLowerCase();
      if (!SCOPE_KINDS.includes(scopeNorm)) {
        return resp(400, { error: `invalid scope; allowed: ${SCOPE_KINDS.join(",")}` });
      }
      // Patient scope accepts UID or MRN — resolve to UID.
      let resolvedId = id;
      if (scopeNorm === "patient") {
        const r = await resolveAnyPatientId(deps.ddb, deps.TABLE, id);
        if (!r) return resp(404, { error: "Patient not found" });
        resolvedId = r.uid;
      }
      const out = await queryChanges(deps.ddb, deps.TABLE, scopeNorm, resolvedId, {
        after: after || null,
        limit: Number(limit) || 100,
      });
      return resp(200, out);
    } catch (e) { return mapError(e, resp); }
  });
}
