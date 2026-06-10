// task_sync.mjs — TASKSYNC time-indexed change rows + streams (Node 22 ESM)
// Spec: §6.4 TASKSYNC row; §6.5 streams; §8.5 sync APIs.

import { QueryCommand } from "@aws-sdk/lib-dynamodb";

export const syncPatientPK = (uid) => `TASKSYNC#PATIENT#${uid}`;
export const syncAssigneePK = (assigneeId) => `TASKSYNC#ASSIGNEE#${assigneeId}`;
export const syncDoctorPK = (doctorId) => `TASKSYNC#DOCTOR#${doctorId}`;
export const syncDoctorPatientPK = (doctorId, uid) => `TASKSYNC#DOCTOR#${doctorId}#PATIENT#${uid}`;
export const syncAssigneePatientPK = (assigneeId, uid) => `TASKSYNC#ASSIGNEE#${assigneeId}#PATIENT#${uid}`;
export const syncTripletPK = (assigneeId, doctorId, uid) =>
  `TASKSYNC#ASSIGNEE#${assigneeId}#DOCTOR#${doctorId}#PATIENT#${uid}`;

export const cursorOf = (changedAt, eventId) => `${changedAt}#${eventId}`;
export const changeSK = (cursor) => `CHG#${cursor}`;

// Build one logical TASK_CHANGE row, then fan it out across all relevant streams.
// Returns an array of put-items the caller writes inside a TransactWrite.
export function buildSyncRows({
  uid, task, update, nowISO,
}) {
  const eventId = update.event_id;
  const changedAt = update.changed_at || nowISO;
  const cursor = cursorOf(changedAt, eventId);
  const sk = changeSK(cursor);

  const base = {
    entity: "TASK_CHANGE",
    event_id: eventId,
    cursor,
    change_type: update.change_type,
    changed_at: changedAt,
    changed_by: update.actor_id || null,

    task_id: task.task_id,
    patient_uid: uid,
    mrn: task.mrn || null,
    bed_no: task.bed_no || null,

    assignee_id: task.assignee_id || null,
    assigned_by_id: task.assigned_by_id || null,
    doctor_id: task.doctor_id || null,
    consultant_id: task.consultant_id || null,

    task_version: task.version || 1,
    status_after: update.status_after || task.status || null,
    update_id: update.update_id,
    summary: update.human_summary || null,

    task_snapshot: {
      title: task.title,
      type: task.type,
      subtype: task.subtype || null,
      priority: task.priority,
      status: task.status,
      due_at: task.due_at,
      alert: task.alert || { level: "none" },
      latest_summary: update.human_summary || null,
    },
  };

  const pks = [syncPatientPK(uid)];
  if (task.assignee_id) {
    pks.push(syncAssigneePK(task.assignee_id));
    pks.push(syncAssigneePatientPK(task.assignee_id, uid));
  }
  if (task.doctor_id) {
    pks.push(syncDoctorPK(task.doctor_id));
    pks.push(syncDoctorPatientPK(task.doctor_id, uid));
  }
  if (task.assignee_id && task.doctor_id) {
    pks.push(syncTripletPK(task.assignee_id, task.doctor_id, uid));
  }

  return pks.map((PK) => ({ kind: "put", Item: { PK, SK: sk, ...base } }));
}

// Read sync stream after a checkpoint (§8.5).
export async function querySyncStream(ddb, TABLE, streamPK, { after = null, limit = 100 } = {}) {
  const params = {
    TableName: TABLE,
    KeyConditionExpression: after
      ? "PK = :pk AND SK > :after"
      : "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: after
      ? { ":pk": streamPK, ":after": changeSK(after) }
      : { ":pk": streamPK, ":sk": "CHG#" },
    Limit: limit,
    ScanIndexForward: true,
  };
  const q = await ddb.send(new QueryCommand(params));
  const items = q.Items || [];
  return {
    items,
    nextCursor: items.length ? items[items.length - 1].cursor : after,
  };
}

export async function queryLatest(ddb, TABLE, streamPK, { limit = 50 } = {}) {
  const q = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":pk": streamPK, ":sk": "CHG#" },
    Limit: limit,
    ScanIndexForward: false,
  }));
  return q.Items || [];
}
