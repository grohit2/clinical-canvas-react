// task_recurrence.mjs — Recurrence definitions + occurrence runner
// Node 22 ESM. Spec: Docs/tasks/1draft/phase 1/phase-1-scope.md; §8.8.

import { GetCommand, PutCommand, UpdateCommand, QueryCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { createTask } from "./task_crud.mjs";

export const recurrencePK = (uid) => `PATIENT#${uid}`;
export const recurrenceSK = (recId) => `TASKRECURRENCE#${recId}`;
const newRecId = () => `rec_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;

const VALID_FREQ = new Set(["daily", "weekly", "custom"]);

export async function createRecurrence(deps, { uid, mrn, body, nowISO }) {
  if (!body?.title) throw Object.assign(new Error("title is required"), { code: "BAD_REQUEST" });
  if (body.frequency && !VALID_FREQ.has(body.frequency)) {
    throw Object.assign(new Error("invalid frequency"), { code: "BAD_REQUEST" });
  }
  const recId = body.recurrenceId || newRecId();
  const item = {
    PK: recurrencePK(uid), SK: recurrenceSK(recId),
    entity: "TASK_RECURRENCE",
    recurrence_id: recId,
    patient_uid: uid,
    mrn: mrn || null,
    task_type: body.type || "generic",
    subtype: body.subtype || null,
    title: body.title,
    frequency: body.frequency || "daily",
    time_of_day: body.timeOfDay || "08:00",
    days_of_week: body.daysOfWeek || null,
    assignee_id: body.assigneeId || null,
    doctor_id: body.doctorId || null,
    priority: body.priority || "important",
    department: body.department || null,
    active: body.active !== false,
    last_run_date: null,
    created_at: nowISO, updated_at: nowISO,
  };
  await deps.ddb.send(new PutCommand({
    TableName: deps.TABLE, Item: item,
    ConditionExpression: "attribute_not_exists(PK)",
  }));
  return item;
}

export async function listRecurrences(deps, { uid }) {
  const q = await deps.ddb.send(new QueryCommand({
    TableName: deps.TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":pk": recurrencePK(uid), ":sk": "TASKRECURRENCE#" },
  }));
  return q.Items || [];
}

export async function patchRecurrence(deps, { uid, recurrenceId, body, nowISO }) {
  const names = { "#u": "updated_at" };
  const values = { ":now": nowISO };
  let expr = "SET #u = :now";
  const map = {
    active: "active", title: "title", frequency: "frequency",
    time_of_day: body.timeOfDay, days_of_week: body.daysOfWeek,
    assignee_id: body.assigneeId, doctor_id: body.doctorId,
    priority: body.priority,
  };
  const directKeys = { title: body.title, frequency: body.frequency, active: body.active, priority: body.priority };
  let i = 0;
  for (const [dbKey, val] of Object.entries({
    title: body.title, frequency: body.frequency, time_of_day: body.timeOfDay,
    days_of_week: body.daysOfWeek, assignee_id: body.assigneeId,
    doctor_id: body.doctorId, priority: body.priority, active: body.active,
  })) {
    if (val === undefined) continue;
    if (dbKey === "frequency" && val && !VALID_FREQ.has(val)) {
      throw Object.assign(new Error("invalid frequency"), { code: "BAD_REQUEST" });
    }
    const nk = `#k${i}`, vk = `:v${i}`;
    names[nk] = dbKey; values[vk] = val;
    expr += `, ${nk} = ${vk}`;
    i++;
  }
  const r = await deps.ddb.send(new UpdateCommand({
    TableName: deps.TABLE,
    Key: { PK: recurrencePK(uid), SK: recurrenceSK(recurrenceId) },
    UpdateExpression: expr,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ConditionExpression: "attribute_exists(PK)",
    ReturnValues: "ALL_NEW",
  }));
  return r.Attributes;
}

export async function deleteRecurrence(deps, { uid, recurrenceId }) {
  await deps.ddb.send(new DeleteCommand({
    TableName: deps.TABLE,
    Key: { PK: recurrencePK(uid), SK: recurrenceSK(recurrenceId) },
  }));
  return { deleted: true };
}

// Runner — generate today's occurrences. Idempotent per (recId, date).
// For Phase 1 we scan via the per-patient SK pattern is not enough (we'd need
// a global GSI to fan over all recurrences). Until that GSI exists, callers
// pass `uids` they want processed (UI can pass per-patient).
export async function runRecurrences(deps, { uids = [], date, actor, nowISO }) {
  const isoDate = date || nowISO.slice(0, 10);
  const created = [];
  for (const uid of uids) {
    const recs = await listRecurrences(deps, { uid });
    for (const rec of recs) {
      if (!rec.active) continue;
      if (rec.last_run_date === isoDate) continue;
      if (rec.frequency === "weekly" && Array.isArray(rec.days_of_week)) {
        const day = new Date(isoDate + "T00:00:00Z").getUTCDay();
        if (!rec.days_of_week.includes(day)) continue;
      }
      const dueAt = `${isoDate}T${rec.time_of_day || "08:00"}:00`;
      const idem = `rec:${rec.recurrence_id}:${isoDate}`;
      const out = await createTask(deps, {
        uid, mrn: rec.mrn, body: {
          title: rec.title, type: rec.task_type, subtype: rec.subtype,
          priority: rec.priority, dueAt, dueDate: isoDate,
          assigneeId: rec.assignee_id, doctorId: rec.doctor_id,
          department: rec.department,
          source: { kind: "recurrence", recurrence_id: rec.recurrence_id, occurrence_date: isoDate },
        },
        actor: actor || { user_id: "system", name: "Recurrence Runner", role: "system" },
        clientMutationId: idem, nowISO,
      });
      if (!out.idempotent) {
        created.push({ uid, recurrence_id: rec.recurrence_id, task_id: out.item.task_id, occurrence_date: isoDate });
      }
      await deps.ddb.send(new UpdateCommand({
        TableName: deps.TABLE,
        Key: { PK: recurrencePK(uid), SK: recurrenceSK(rec.recurrence_id) },
        UpdateExpression: "SET last_run_date = :d, updated_at = :now",
        ExpressionAttributeValues: { ":d": isoDate, ":now": nowISO },
      }));
    }
  }
  return { date: isoDate, created };
}
