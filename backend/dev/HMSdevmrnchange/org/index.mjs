// org/index.mjs — Org registry / memberships / pins routes (Node 22 ESM)
//
//   GET    /org                                   — whole tree (depts+units+wards)
//   POST   /org/departments                       — { dept_id?, name, units?: [{unit_id?, name}] }
//   POST   /org/departments/{deptId}/units        — { unit_id?, name }
//   POST   /org/wards                             — { ward_id?, name, floor? }
//   GET    /org/roster?dept=&unit=&at=            — who covers a dept/unit (now or at time)
//   GET    /org/units/{dept}/{unit}/patients      — merged derived+pinned patient list
//   GET    /org/units/{dept}/{unit}/pins
//   POST   /org/units/{dept}/{unit}/pins          — { patient_uid, note? }
//   DELETE /org/units/{dept}/{unit}/pins/{uid}
//   GET    /doctors/{id}/memberships
//   POST   /doctors/{id}/memberships              — { dept_id, unit_id?, from? }
//   POST   /doctors/{id}/memberships/end          — { sk? | dept_id?+unit_id?, until? }
//
// No role checks in v1 (open to all) — every mutation records the actor
// so restrictions can be added later without losing history.

import {
  getOrgTree, createDepartment, createUnit, createWard,
  listMemberships, startMembership, endMembership, getRoster,
  addPin, removePin, listPins, getUnitPatients,
} from "./org_store.mjs";

const mapError = (err, resp) => {
  if (err?.code === "BAD_REQUEST") return resp(400, { error: err.message });
  if (err?.code === "NOT_FOUND") return resp(404, { error: err.message });
  console.error("org route error:", err);
  return resp(500, { error: "Internal server error" });
};

const actorOf = (event) => {
  const h = event?.headers || {};
  return {
    user_id: h["x-user-id"] || h["X-User-Id"] || null,
    name: h["x-user-name"] || h["X-User-Name"] || null,
    role: h["x-user-role"] || h["X-User-Role"] || null,
  };
};

export function mountOrgRoutes(router, ctx) {
  const { ddb, TABLE, INDEX, utils } = ctx;
  const { nowISO, resp, parseBody } = utils;
  const deps = { ddb, TABLE, INDEX };

  /* ---- registry ---- */

  router.add("GET", /^\/?org\/?$/, async () => {
    try { return resp(200, await getOrgTree(deps)); }
    catch (e) { return mapError(e, resp); }
  });

  router.add("POST", /^\/?org\/departments\/?$/, async ({ event }) => {
    try { return resp(201, await createDepartment(deps, parseBody(event) || {}, nowISO())); }
    catch (e) { return mapError(e, resp); }
  });

  router.add("POST", /^\/?org\/departments\/([^/]+)\/units\/?$/, async ({ match, event }) => {
    try { return resp(201, await createUnit(deps, decodeURIComponent(match[1]), parseBody(event) || {}, nowISO())); }
    catch (e) { return mapError(e, resp); }
  });

  router.add("POST", /^\/?org\/wards\/?$/, async ({ event }) => {
    try { return resp(201, await createWard(deps, parseBody(event) || {}, nowISO())); }
    catch (e) { return mapError(e, resp); }
  });

  /* ---- roster ---- */

  router.add("GET", /^\/?org\/roster\/?$/, async ({ qs }) => {
    try {
      if (!qs?.dept) return resp(400, { error: "dept is required" });
      const items = await getRoster(deps, { dept_id: qs.dept, unit_id: qs.unit || null, at: qs.at || null });
      return resp(200, { items });
    } catch (e) { return mapError(e, resp); }
  });

  /* ---- unit patient list + pins ---- */

  router.add("GET", /^\/?org\/units\/([^/]+)\/([^/]+)\/patients\/?$/, async ({ match }) => {
    try {
      const out = await getUnitPatients(deps, {
        dept_id: decodeURIComponent(match[1]), unit_id: decodeURIComponent(match[2]),
      });
      return resp(200, out);
    } catch (e) { return mapError(e, resp); }
  });

  router.add("GET", /^\/?org\/units\/([^/]+)\/([^/]+)\/pins\/?$/, async ({ match }) => {
    try {
      const items = await listPins(deps, {
        dept_id: decodeURIComponent(match[1]), unit_id: decodeURIComponent(match[2]),
      });
      return resp(200, { items });
    } catch (e) { return mapError(e, resp); }
  });

  router.add("POST", /^\/?org\/units\/([^/]+)\/([^/]+)\/pins\/?$/, async ({ match, event }) => {
    try {
      const body = parseBody(event) || {};
      const item = await addPin(deps, {
        dept_id: decodeURIComponent(match[1]), unit_id: decodeURIComponent(match[2]),
        patient_uid: body.patient_uid, note: body.note,
      }, actorOf(event), nowISO());
      return resp(201, { pin: item });
    } catch (e) { return mapError(e, resp); }
  });

  router.add("DELETE", /^\/?org\/units\/([^/]+)\/([^/]+)\/pins\/([^/]+)\/?$/, async ({ match }) => {
    try {
      const out = await removePin(deps, {
        dept_id: decodeURIComponent(match[1]), unit_id: decodeURIComponent(match[2]),
        patient_uid: decodeURIComponent(match[3]),
      });
      return resp(200, out);
    } catch (e) { return mapError(e, resp); }
  });

  /* ---- memberships (under /doctors for discoverability) ---- */

  router.add("GET", /^\/?doctors\/([^/]+)\/memberships\/?$/, async ({ match }) => {
    try {
      const items = await listMemberships(deps, decodeURIComponent(match[1]));
      return resp(200, { items });
    } catch (e) { return mapError(e, resp); }
  });

  router.add("POST", /^\/?doctors\/([^/]+)\/memberships\/?$/, async ({ match, event }) => {
    try {
      const out = await startMembership(
        deps, decodeURIComponent(match[1]), parseBody(event) || {}, actorOf(event), nowISO(),
      );
      return resp(201, out);
    } catch (e) { return mapError(e, resp); }
  });

  router.add("POST", /^\/?doctors\/([^/]+)\/memberships\/end\/?$/, async ({ match, event }) => {
    try {
      const out = await endMembership(deps, decodeURIComponent(match[1]), parseBody(event) || {}, nowISO());
      return resp(200, { membership: out });
    } catch (e) { return mapError(e, resp); }
  });
}
