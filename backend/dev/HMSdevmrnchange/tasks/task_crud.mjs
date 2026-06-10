// task_crud.mjs — Typed task CRUD with idempotency + optimistic concurrency
// Node 22 ESM. Spec: §3, §6.1, §11 Phase 1, §16.1.

import {
  taskPK, taskSK, newTaskId,
  getTask, listTasksByPatient, transactWriteAll,
  getIdempotencyRecord, buildIdempotencyItem,
} from "./task_store.mjs";
import { fromTypedTaskInput, toTypedTask, taskGSI2 } from "./task_mapper.mjs";
import { isValidTaskType, isValidTaskStatus, isValidTaskPriority } from "./task_types.mjs";
import { buildTaskUpdate, buildTaskTimelineRow } from "./task_events.mjs";
import { buildSyncRows, cursorOf } from "./task_sync.mjs";

function validateCreate(b) {
  if (!b?.title) return "title is required";
  if (b.type && !isValidTaskType(b.type)) return `invalid type: ${b.type}`;
  if (b.status && !isValidTaskStatus(b.status)) return `invalid status: ${b.status}`;
  if (b.priority && !isValidTaskPriority(b.priority)) return `invalid priority: ${b.priority}`;
  return null;
}

export async function createTask(deps, { uid, mrn, body, actor, clientMutationId, nowISO }) {
  const { ddb, TABLE } = deps;
  if (clientMutationId) {
    const prior = await getIdempotencyRecord(ddb, TABLE, uid, clientMutationId);
    if (prior) {
      // Re-fetch authoritative task by id stored in the marker. Cheaper to
      // store + always fresh vs caching a snapshot in the marker payload.
      const priorTaskId = prior.response_summary?.task_id;
      const item = priorTaskId ? await getTask(ddb, TABLE, uid, priorTaskId) : null;
      return { item, idempotent: true };
    }
  }
  const err = validateCreate(body);
  if (err) throw Object.assign(new Error(err), { code: "BAD_REQUEST" });

  const taskId = body.taskId || newTaskId();
  const item = fromTypedTaskInput(body, { taskId, nowISO, patientUid: uid, mrn });
  const gsi = taskGSI2({
    status: item.status, department: body.department || null,
    assigneeId: item.assignee_id, dueAt: item.due_at, taskId,
  });
  Object.assign(item, gsi, { PK: taskPK(uid), SK: taskSK(taskId) });

  const update = buildTaskUpdate({
    uid, taskId, changeType: "task_created", statusAfter: item.status,
    structured: { initial: true }, humanSummary: `Task created: ${item.title}`,
    originalText: body.source?.original_text || null, actor: actor || {}, nowISO,
  });
  item.latest_change_id = update.event_id;
  item.latest_cursor = cursorOf(update.changed_at, update.event_id);

  const syncRows = buildSyncRows({ uid, task: item, update, nowISO });
  const timelineRow = buildTaskTimelineRow({ uid, task: item, update, nowISO });

  const txItems = [
    { kind: "put", Item: item, notExists: true },
    { kind: "put", Item: update },
    { kind: "put", Item: timelineRow },
    ...syncRows,
  ];
  if (clientMutationId) {
    txItems.push({
      kind: "put",
      Item: buildIdempotencyItem(uid, clientMutationId, { task_id: taskId }, nowISO),
    });
  }
  await transactWriteAll(ddb, TABLE, txItems);
  return { item, idempotent: false };
}

export async function listTasks(deps, { uid, status, limit = 100 }) {
  const { ddb, TABLE } = deps;
  const items = await listTasksByPatient(ddb, TABLE, uid, { limit, status: status || null });
  items.sort((a, b) => (a.due_at || a.due || "~").localeCompare(b.due_at || b.due || "~"));
  return items.map(toTypedTask);
}

export async function getTaskTyped(deps, { uid, taskId }) {
  const item = await getTask(deps.ddb, deps.TABLE, uid, taskId);
  return item ? toTypedTask(item) : null;
}

export async function patchTask(deps, { uid, taskId, body, actor, expectedVersion, clientMutationId, nowISO }) {
  const { ddb, TABLE } = deps;
  if (clientMutationId) {
    const prior = await getIdempotencyRecord(ddb, TABLE, uid, clientMutationId);
    if (prior) {
      const priorTaskId = prior.response_summary?.task_id || taskId;
      const item = await getTask(ddb, TABLE, uid, priorTaskId);
      return { item, idempotent: true };
    }
  }
  const current = await getTask(ddb, TABLE, uid, taskId);
  if (!current) throw Object.assign(new Error("Task not found"), { code: "NOT_FOUND" });
  const expV = expectedVersion ?? current.version ?? 1;
  if (current.version && expV !== current.version) {
    throw Object.assign(new Error(`version conflict: expected ${expV}, current ${current.version}`), { code: "CONFLICT" });
  }

  const allowed = ["title", "type", "subtype", "status", "priority", "due_at", "due_date",
    "assignee_id", "assignee_name", "doctor_id", "consultant_id", "clinical_data", "blocker", "verify_status"];
  const inputMap = {
    title: body.title, type: body.type, subtype: body.subtype,
    status: body.status, priority: body.priority,
    due_at: body.dueAt, due_date: body.dueDate,
    assignee_id: body.assigneeId, assignee_name: body.assigneeName,
    doctor_id: body.doctorId, consultant_id: body.consultantId,
    clinical_data: body.clinicalData, blocker: body.blocker,
    verify_status: body.verifyStatus,
  };
  const patch = {};
  for (const k of allowed) if (inputMap[k] !== undefined) patch[k] = inputMap[k];

  const nextVersion = (current.version || 1) + 1;
  const merged = { ...current, ...patch, version: nextVersion, updated_at: nowISO, latest_change_at: nowISO };

  // refresh GSI if key fields changed
  if (patch.status !== undefined || patch.assignee_id !== undefined || patch.due_at !== undefined || body.department) {
    const gsi = taskGSI2({
      status: merged.status, department: body.department || current.department,
      assigneeId: merged.assignee_id, dueAt: merged.due_at, taskId,
    });
    patch.GSI2PK = gsi.GSI2PK; patch.GSI2SK = gsi.GSI2SK;
    merged.GSI2PK = gsi.GSI2PK; merged.GSI2SK = gsi.GSI2SK;
  }

  const update = buildTaskUpdate({
    uid, taskId, changeType: "task_updated", statusAfter: merged.status,
    structured: patch, humanSummary: body.humanSummary || `Task updated.`,
    originalText: body.originalText || null, actor: actor || {}, nowISO,
  });
  merged.latest_change_id = update.event_id;
  merged.latest_cursor = cursorOf(update.changed_at, update.event_id);
  patch.latest_change_id = merged.latest_change_id;
  patch.latest_cursor = merged.latest_cursor;

  const syncRows = buildSyncRows({ uid, task: merged, update, nowISO });
  const timelineRow = buildTaskTimelineRow({ uid, task: merged, update, nowISO });

  // Update with optimistic concurrency
  const names = { "#v": "version", "#u": "updated_at" };
  const values = { ":expV": current.version || 1, ":nextV": nextVersion, ":now": nowISO };
  let setExpr = "SET #v = :nextV, #u = :now";
  let i = 0;
  for (const [k, v] of Object.entries(patch)) {
    const nk = `#p${i}`, vk = `:p${i}`;
    names[nk] = k; values[vk] = v;
    setExpr += `, ${nk} = ${vk}`;
    i++;
  }
  const tx = [
    { kind: "update", Key: { PK: taskPK(uid), SK: taskSK(taskId) },
      UpdateExpression: setExpr, ConditionExpression: "version = :expV OR attribute_not_exists(version)",
      ExpressionAttributeNames: names, ExpressionAttributeValues: values },
    { kind: "put", Item: update },
    { kind: "put", Item: timelineRow },
    ...syncRows,
  ];
  if (clientMutationId) {
    tx.push({ kind: "put", Item: buildIdempotencyItem(uid, clientMutationId, { task_id: taskId }, nowISO) });
  }
  await transactWriteAll(ddb, TABLE, tx);
  return { item: merged, idempotent: false };
}

export async function softDeleteTask(deps, args) {
  return patchTask(deps, { ...args, body: { ...(args.body || {}), status: "cancelled" } });
}
