// tasks/index.mjs — Route mount for typed task module (Node 22 ESM)
// Spec: §8 API surface, §11 Phase 1.

import { resolveAnyPatientId } from "../ids.mjs";
import {
  createTask, listTasks, getTaskTyped, patchTask, softDeleteTask,
} from "./task_crud.mjs";
import {
  applyLifecycle, applyVerify, applyStructuredUpdate,
} from "./task_updates.mjs";
import {
  createProposal, getProposal, patchProposal, commitProposal, rejectProposal,
} from "./task_proposals.mjs";
import {
  createRecurrence, listRecurrences, patchRecurrence, deleteRecurrence, runRecurrences,
} from "./task_recurrence.mjs";
import {
  syncPatientPK, syncAssigneePK, syncDoctorPK, querySyncStream, queryLatest,
} from "./task_sync.mjs";
import { humanTaskCopy, agentTaskCopy, agentPatientContext } from "./task_copy.mjs";
import { toTypedTask } from "./task_mapper.mjs";
import { listPatients, listStaff } from "./directory.mjs";

const mapError = (err, resp) => {
  if (err?.code === "BAD_REQUEST") return resp(400, { error: err.message });
  if (err?.code === "NOT_FOUND") return resp(404, { error: err.message });
  if (err?.code === "CONFLICT") return resp(409, { error: err.message });
  if (err?.name === "ConditionalCheckFailedException")
    return resp(409, { error: "version conflict or idempotency miss" });
  console.error("task route error:", err);
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

export function mountTaskRoutesV2(router, ctx) {
  const { ddb, TABLE, INDEX, utils } = ctx;
  const { nowISO, resp, parseBody } = utils;
  const deps = { ddb, TABLE, INDEX };

  /* ----- Directory (§8.1) ----- */
  router.add("GET", /^\/?directory\/patients\/?$/, async ({ qs }) => {
    try {
      const out = await listPatients(deps, {
        department: qs?.department, q: qs?.q,
        limit: Math.min(Number(qs?.limit) || 50, 200),
      });
      return resp(200, out);
    } catch (e) { return mapError(e, resp); }
  });
  router.add("GET", /^\/?directory\/staff\/?$/, async ({ qs }) => {
    try {
      const out = await listStaff(deps, {
        department: qs?.department, role: qs?.role, q: qs?.q,
        limit: Math.min(Number(qs?.limit) || 50, 200),
      });
      return resp(200, out);
    } catch (e) { return mapError(e, resp); }
  });

  /* ----- Proposals (§8.3) ----- */
  router.add("POST", /^\/?tasks\/proposals\/?$/, async ({ event }) => {
    try {
      const body = parseBody(event);
      const item = await createProposal(deps, { body, actor: actorOf(event), nowISO: nowISO() });
      return resp(201, { proposal: item });
    } catch (e) { return mapError(e, resp); }
  });
  router.add("GET", /^\/?tasks\/proposals\/([^/]+)\/?$/, async ({ match }) => {
    const p = await getProposal(deps, decodeURIComponent(match[1]));
    return p ? resp(200, { proposal: p }) : resp(404, { error: "Proposal not found" });
  });
  router.add("PATCH", /^\/?tasks\/proposals\/([^/]+)\/?$/, async ({ match, event }) => {
    try {
      const body = parseBody(event);
      const p = await patchProposal(deps, {
        proposalId: decodeURIComponent(match[1]), body,
        expectedVersion: body.expectedVersion, nowISO: nowISO(),
      });
      return resp(200, { proposal: p });
    } catch (e) { return mapError(e, resp); }
  });
  router.add("POST", /^\/?tasks\/proposals\/([^/]+)\/commit\/?$/, async ({ match, event }) => {
    try {
      const body = parseBody(event);
      const out = await commitProposal(deps, {
        proposalId: decodeURIComponent(match[1]),
        actor: actorOf(event), clientMutationId: body?.clientMutationId, nowISO: nowISO(),
        resolvePatientUid: async (mrn) => { const r = await resolveUid(deps, mrn); return r?.uid; },
      });
      return resp(200, out);
    } catch (e) { return mapError(e, resp); }
  });
  router.add("POST", /^\/?tasks\/proposals\/([^/]+)\/reject\/?$/, async ({ match, event }) => {
    try {
      const body = parseBody(event);
      const p = await rejectProposal(deps, {
        proposalId: decodeURIComponent(match[1]), reason: body?.reason, nowISO: nowISO(),
      });
      return resp(200, { proposal: p });
    } catch (e) { return mapError(e, resp); }
  });

  /* ----- Tasks (§8.4) — accepts UID or MRN, UID-first storage ----- */
  router.add("POST", /^\/?patients\/([^/]+)\/tasks\/?$/, async ({ match, event }) => {
    try {
      const id = decodeURIComponent(match[1]);
      const r = await resolveUid(deps, id);
      if (!r) return resp(404, { error: "Patient not found" });
      const body = parseBody(event);
      const out = await createTask(deps, {
        uid: r.uid, mrn: r.mrn, body, actor: actorOf(event),
        clientMutationId: body?.clientMutationId, nowISO: nowISO(),
      });
      return resp(out.idempotent ? 200 : 201,
        { task: toTypedTask(out.item), idempotent: out.idempotent });
    } catch (e) { return mapError(e, resp); }
  });

  router.add("GET", /^\/?patients\/([^/]+)\/tasks\/?$/, async ({ match, qs }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const tasks = await listTasks(deps, { uid: r.uid, status: qs?.status, limit: Number(qs?.limit) || 100 });
      return resp(200, tasks);
    } catch (e) { return mapError(e, resp); }
  });

  router.add("GET", /^\/?patients\/([^/]+)\/tasks\/([^/]+)\/?$/, async ({ match, qs }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const taskId = decodeURIComponent(match[2]);
      const task = await getTaskTyped(deps, { uid: r.uid, taskId });
      if (!task) return resp(404, { error: "Task not found" });
      if (qs?.updates === "1") {
        const { listUpdatesByTask } = await import("./task_store.mjs");
        const updates = await listUpdatesByTask(deps.ddb, deps.TABLE, r.uid, taskId);
        return resp(200, { task, updates });
      }
      return resp(200, { task });
    } catch (e) { return mapError(e, resp); }
  });

  router.add("PATCH", /^\/?patients\/([^/]+)\/tasks\/([^/]+)\/?$/, async ({ match, event }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const body = parseBody(event);
      const out = await patchTask(deps, {
        uid: r.uid, taskId: decodeURIComponent(match[2]),
        body, actor: actorOf(event),
        expectedVersion: body?.expectedVersion,
        clientMutationId: body?.clientMutationId, nowISO: nowISO(),
      });
      return resp(200, { task: toTypedTask(out.item), idempotent: out.idempotent });
    } catch (e) { return mapError(e, resp); }
  });

  router.add("DELETE", /^\/?patients\/([^/]+)\/tasks\/([^/]+)\/?$/, async ({ match, event }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const body = parseBody(event);
      const out = await softDeleteTask(deps, {
        uid: r.uid, taskId: decodeURIComponent(match[2]),
        body, actor: actorOf(event),
        expectedVersion: body?.expectedVersion,
        clientMutationId: body?.clientMutationId, nowISO: nowISO(),
      });
      return resp(200, { task: toTypedTask(out.item) });
    } catch (e) { return mapError(e, resp); }
  });

  /* ----- Lifecycle (§3.2, §3.3) ----- */
  for (const action of ["start", "done", "pending", "block"]) {
    router.add("POST", new RegExp(`^\\/?patients\\/([^/]+)\\/tasks\\/([^/]+)\\/${action}\\/?$`),
      async ({ match, event }) => {
        try {
          const r = await resolveUid(deps, decodeURIComponent(match[1]));
          if (!r) return resp(404, { error: "Patient not found" });
          const body = parseBody(event);
          const out = await applyLifecycle(deps, action, {
            uid: r.uid, taskId: decodeURIComponent(match[2]),
            body, actor: actorOf(event), expectedVersion: body?.expectedVersion,
            clientMutationId: body?.clientMutationId, nowISO: nowISO(),
          });
          return resp(200, { task: toTypedTask(out.item) });
        } catch (e) { return mapError(e, resp); }
      });
  }
  router.add("POST", /^\/?patients\/([^/]+)\/tasks\/([^/]+)\/verify\/?$/, async ({ match, event }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const body = parseBody(event);
      const out = await applyVerify(deps, {
        uid: r.uid, taskId: decodeURIComponent(match[2]),
        body, actor: actorOf(event), expectedVersion: body?.expectedVersion,
        clientMutationId: body?.clientMutationId, nowISO: nowISO(),
      });
      return resp(200, { task: toTypedTask(out.item) });
    } catch (e) { return mapError(e, resp); }
  });
  router.add("POST", /^\/?patients\/([^/]+)\/tasks\/([^/]+)\/update\/?$/, async ({ match, event }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const body = parseBody(event);
      const out = await applyStructuredUpdate(deps, {
        uid: r.uid, taskId: decodeURIComponent(match[2]),
        body, actor: actorOf(event), expectedVersion: body?.expectedVersion,
        clientMutationId: body?.clientMutationId, nowISO: nowISO(),
      });
      return resp(200, { task: toTypedTask(out.item) });
    } catch (e) { return mapError(e, resp); }
  });

  /* ----- Sync (§8.5) ----- */
  router.add("GET", /^\/?tasks\/changes\/?$/, async ({ qs }) => {
    try {
      const { scope, id, after, limit } = qs || {};
      if (!scope || !id) return resp(400, { error: "scope and id required" });
      let pk;
      if (scope === "patient") {
        const r = await resolveUid(deps, id);
        if (!r) return resp(404, { error: "Patient not found" });
        pk = syncPatientPK(r.uid);
      } else if (scope === "assignee") pk = syncAssigneePK(id);
      else if (scope === "doctor") pk = syncDoctorPK(id);
      else return resp(400, { error: "invalid scope" });
      const out = await querySyncStream(deps.ddb, deps.TABLE, pk, { after, limit: Number(limit) || 100 });
      return resp(200, out);
    } catch (e) { return mapError(e, resp); }
  });
  router.add("GET", /^\/?tasks\/changes\/latest\/?$/, async ({ qs }) => {
    try {
      const { scope, id, limit } = qs || {};
      if (!scope || !id) return resp(400, { error: "scope and id required" });
      let pk;
      if (scope === "patient") {
        const r = await resolveUid(deps, id);
        if (!r) return resp(404, { error: "Patient not found" });
        pk = syncPatientPK(r.uid);
      } else if (scope === "assignee") pk = syncAssigneePK(id);
      else if (scope === "doctor") pk = syncDoctorPK(id);
      else return resp(400, { error: "invalid scope" });
      const items = await queryLatest(deps.ddb, deps.TABLE, pk, { limit: Number(limit) || 50 });
      return resp(200, items);
    } catch (e) { return mapError(e, resp); }
  });

  /* ----- Copy (§8.2) ----- */
  router.add("GET", /^\/?patients\/([^/]+)\/tasks\/([^/]+)\/copy\/?$/, async ({ match, qs }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const task = await getTaskTyped(deps, { uid: r.uid, taskId: decodeURIComponent(match[2]) });
      if (!task) return resp(404, { error: "Task not found" });
      const format = qs?.format || "human";
      if (format === "agent") return resp(200, { format, content: agentTaskCopy(task) });
      return resp(200, { format: "human", content: humanTaskCopy(task) });
    } catch (e) { return mapError(e, resp); }
  });
  router.add("GET", /^\/?patients\/([^/]+)\/agent-context\/?$/, async ({ match, qs }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const tasks = await listTasks(deps, { uid: r.uid, limit: Number(qs?.limit) || 50 });
      return resp(200, agentPatientContext({
        patient: { uid: r.uid, mrn: r.mrn }, tasks,
      }));
    } catch (e) { return mapError(e, resp); }
  });

  /* ----- Recurrence (§8.8) ----- */
  router.add("POST", /^\/?patients\/([^/]+)\/tasks\/recurrences\/?$/, async ({ match, event }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const item = await createRecurrence(deps, { uid: r.uid, mrn: r.mrn, body: parseBody(event), nowISO: nowISO() });
      return resp(201, { recurrence: item });
    } catch (e) { return mapError(e, resp); }
  });
  router.add("GET", /^\/?patients\/([^/]+)\/tasks\/recurrences\/?$/, async ({ match }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const items = await listRecurrences(deps, { uid: r.uid });
      return resp(200, items);
    } catch (e) { return mapError(e, resp); }
  });
  router.add("PATCH", /^\/?patients\/([^/]+)\/tasks\/recurrences\/([^/]+)\/?$/, async ({ match, event }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const item = await patchRecurrence(deps, {
        uid: r.uid, recurrenceId: decodeURIComponent(match[2]),
        body: parseBody(event), nowISO: nowISO(),
      });
      return resp(200, { recurrence: item });
    } catch (e) { return mapError(e, resp); }
  });
  router.add("DELETE", /^\/?patients\/([^/]+)\/tasks\/recurrences\/([^/]+)\/?$/, async ({ match }) => {
    try {
      const r = await resolveUid(deps, decodeURIComponent(match[1]));
      if (!r) return resp(404, { error: "Patient not found" });
      const out = await deleteRecurrence(deps, { uid: r.uid, recurrenceId: decodeURIComponent(match[2]) });
      return resp(200, out);
    } catch (e) { return mapError(e, resp); }
  });
  router.add("POST", /^\/?tasks\/recurrences\/run\/?$/, async ({ event, qs }) => {
    try {
      const body = parseBody(event);
      const uids = Array.isArray(body?.uids) ? body.uids : [];
      const out = await runRecurrences(deps, {
        uids, date: qs?.date || body?.date, actor: actorOf(event), nowISO: nowISO(),
      });
      return resp(200, out);
    } catch (e) { return mapError(e, resp); }
  });
}
