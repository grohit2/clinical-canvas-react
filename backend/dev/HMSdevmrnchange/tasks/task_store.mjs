// task_store.mjs — Low-level DDB primitives for tasks (Node 22 ESM)
// Spec: §6 data model; §1.4 idempotency + optimistic concurrency.

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  DeleteCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";

export const taskPK = (uid) => `PATIENT#${uid}`;
export const taskSK = (taskId) => `TASK#${taskId}`;
export const taskUpdateSK = (taskId, changedAt, updateId) =>
  `TASKUPDATE_BY_TASK#${taskId}#${changedAt}#${updateId}`;
export const idemPK = (uid) => `IDEMP#PATIENT#${uid}`;
export const idemSK = (clientMutationId) => `MUT#${clientMutationId}`;

export const newTaskId = () => `task_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
export const newUpdateId = () => `upd_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;
export const newEventId = () => `evt_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;

export async function getTask(ddb, TABLE, uid, taskId) {
  const r = await ddb.send(new GetCommand({
    TableName: TABLE, Key: { PK: taskPK(uid), SK: taskSK(taskId) },
  }));
  return r.Item || null;
}

export async function listTasksByPatient(ddb, TABLE, uid, { limit = 100, status = null } = {}) {
  const params = {
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":pk": taskPK(uid), ":sk": "TASK#" },
    Limit: limit,
  };
  if (status) {
    // FilterExpression still scans the partition but drops non-matching items
    // before they hit the wire. Phase 1 pragmatic; long-term answer is a
    // per-patient status GSI or composite SK (TASK#<status>#<taskId>).
    params.FilterExpression = "#s = :status";
    params.ExpressionAttributeNames = { "#s": "status" };
    params.ExpressionAttributeValues[":status"] = status;
  }
  const q = await ddb.send(new QueryCommand(params));
  return q.Items || [];
}

export async function listUpdatesByTask(ddb, TABLE, uid, taskId, { limit = 100 } = {}) {
  const q = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: {
      ":pk": taskPK(uid),
      ":sk": `TASKUPDATE_BY_TASK#${taskId}#`,
    },
    Limit: limit,
  }));
  return q.Items || [];
}

export async function putTaskIfNotExists(ddb, TABLE, item) {
  await ddb.send(new PutCommand({
    TableName: TABLE, Item: item,
    ConditionExpression: "attribute_not_exists(PK)",
  }));
  return item;
}

// Optimistic concurrency: bump version IFF current version matches.
// Throws ConditionalCheckFailedException on mismatch — caller maps to 409.
export async function updateTaskWithVersion(ddb, TABLE, uid, taskId, expectedVersion, patch, nowISO) {
  const names = { "#v": "version", "#u": "updated_at", "#lc": "latest_change_at" };
  const values = { ":nextV": expectedVersion + 1, ":expV": expectedVersion, ":now": nowISO };
  let set = "SET #v = :nextV, #u = :now, #lc = :now";
  let i = 0;
  for (const [k, v] of Object.entries(patch || {})) {
    if (v === undefined) continue;
    const nk = `#p${i}`, vk = `:p${i}`;
    names[nk] = k; values[vk] = v;
    set += `, ${nk} = ${vk}`;
    i++;
  }
  const r = await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: taskPK(uid), SK: taskSK(taskId) },
    UpdateExpression: set,
    ConditionExpression: "#v = :expV",
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: "ALL_NEW",
  }));
  return r.Attributes;
}

// Idempotency: returns prior response if clientMutationId already seen.
// Pattern: write the task + idempotency marker in a single TransactWrite.
export async function getIdempotencyRecord(ddb, TABLE, uid, clientMutationId) {
  if (!clientMutationId) return null;
  const r = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: idemPK(uid), SK: idemSK(clientMutationId) },
  }));
  return r.Item || null;
}

// Write (task put OR update + TASK_UPDATE event + TASKSYNC row + idempotency marker)
// in one transaction. Caller assembles all items.
export async function transactWriteAll(ddb, TABLE, items) {
  const TransactItems = items.map((it) => {
    if (it.kind === "put") {
      return {
        Put: {
          TableName: TABLE, Item: it.Item,
          ConditionExpression: it.notExists ? "attribute_not_exists(PK)" : undefined,
        },
      };
    }
    if (it.kind === "update") {
      return {
        Update: {
          TableName: TABLE, Key: it.Key,
          UpdateExpression: it.UpdateExpression,
          ConditionExpression: it.ConditionExpression,
          ExpressionAttributeNames: it.ExpressionAttributeNames,
          ExpressionAttributeValues: it.ExpressionAttributeValues,
        },
      };
    }
    if (it.kind === "delete") {
      return { Delete: { TableName: TABLE, Key: it.Key } };
    }
    throw new Error(`unknown transact op: ${it.kind}`);
  });
  return ddb.send(new TransactWriteCommand({ TransactItems }));
}

export function buildIdempotencyItem(uid, clientMutationId, responseSummary, nowISO, ttlSecs = 7 * 24 * 3600) {
  return {
    PK: idemPK(uid),
    SK: idemSK(clientMutationId),
    entity: "IDEMP",
    client_mutation_id: clientMutationId,
    response_summary: responseSummary,
    created_at: nowISO,
    expires_at: Math.floor(Date.now() / 1000) + ttlSecs,
  };
}

export { DeleteCommand };
