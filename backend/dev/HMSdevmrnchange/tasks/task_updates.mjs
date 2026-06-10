// task_updates.mjs — Lifecycle endpoints (start/done/pending/block/verify)
// Node 22 ESM. Spec: §3.2, §3.3, §3.11, §11 Phase 1, §16.1.

import { patchTask } from "./task_crud.mjs";

const STATUS_TRANSITIONS = {
  start:   { status: "in_progress", changeType: "task_started" },
  done:    { status: "done",        changeType: "task_completed" },
  pending: { status: "pending",     changeType: "task_pending" },
  block:   { status: "blocked",     changeType: "task_blocked" },
};

export async function applyLifecycle(deps, action, args) {
  const t = STATUS_TRANSITIONS[action];
  if (!t) throw Object.assign(new Error(`unknown lifecycle action: ${action}`), { code: "BAD_REQUEST" });

  const body = {
    ...(args.body || {}),
    status: t.status,
    humanSummary: args.body?.humanSummary || `Task ${t.status.replace("_", " ")}.`,
  };
  if (action === "block" && args.body?.blockerReason) {
    body.blocker = { reason: args.body.blockerReason, at: args.nowISO };
  }
  return patchTask(deps, { ...args, body });
}

export async function applyVerify(deps, args) {
  const verifyStatus = args.body?.decision === "rejected" ? "rejected" : "verified";
  const body = {
    ...(args.body || {}),
    verifyStatus,
    humanSummary: args.body?.humanSummary || `Verify: ${verifyStatus}.`,
  };
  return patchTask(deps, { ...args, body });
}

// Free-form structured update (POST /patients/:id/tasks/:taskId/update)
export async function applyStructuredUpdate(deps, args) {
  const body = {
    ...(args.body || {}),
    clinicalData: args.body?.structured || args.body?.clinicalData,
    humanSummary: args.body?.humanSummary || "Update.",
  };
  return patchTask(deps, { ...args, body });
}
