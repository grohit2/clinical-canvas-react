// medications/med_store.mjs — Low-level DDB primitives for medications (Node 22 ESM)
//
// Single-table layout:
//   MEDORD  PK=PATIENT#{uid}        SK=MEDORD#{started_at}#{medId}
//   MEDPTR  PK=PATIENT#{uid}        SK=MEDPTR#{medId}      { orderSK }
//   IDEMP   PK=IDEMP#PATIENT#{uid}  SK=MUT#{clientMutationId}
//   MAR     PK=PATIENT#{uid}        SK=MAR#{date}#{time}#{medId}
//
// MEDORD SK is timestamp-first so ScanIndexForward:false returns newest first.
// MEDPTR lets a single-item GET avoid a full-partition query.

import {
  GetCommand,
  PutCommand,
  QueryCommand,
  DeleteCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

// ── Key helpers ──────────────────────────────────────────────────────────────

export const medPK     = (uid)                     => `PATIENT#${uid}`;
export const medOrdSK  = (startedAt, medId)        => `MEDORD#${startedAt}#${medId}`;
export const medPtrSK  = (medId)                   => `MEDPTR#${medId}`;
export const marSK     = (date, time, medId)       => `MAR#${date}#${time}#${medId}`;
export const medIdemPK = (uid)                     => `IDEMP#PATIENT#${uid}`;
export const medIdemSK = (clientMutationId)        => `MUT#${clientMutationId}`;

export const newMedId = () =>
  `med_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;

// Opaque base64url cursor for ExclusiveStartKey pagination
const encodeCursor = (lastKey) =>
  lastKey ? Buffer.from(JSON.stringify(lastKey)).toString("base64url") : null;
const decodeCursor = (cursor) => {
  if (!cursor) return undefined;
  try { return JSON.parse(Buffer.from(cursor, "base64url").toString()); }
  catch { return undefined; }
};

// ── Med order primitives ──────────────────────────────────────────────────────

/**
 * Resolve medId → order item via the MEDPTR pointer (2 reads).
 */
export async function getMedOrderByPtr(ddb, TABLE, uid, medId) {
  const ptr = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: medPK(uid), SK: medPtrSK(medId) },
  }));
  if (!ptr.Item) return null;
  const order = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: medPK(uid), SK: ptr.Item.orderSK },
  }));
  return order.Item || null;
}

/**
 * Get a med order directly by its full SK (fast path when SK is already known).
 */
export async function getMedOrderBySK(ddb, TABLE, uid, orderSK) {
  const r = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: medPK(uid), SK: orderSK },
  }));
  return r.Item || null;
}

/**
 * List med orders for a patient, newest first.
 * Returns { items, nextCursor } where nextCursor is an opaque string.
 *
 * @param {object} opts
 * @param {number}  [opts.limit=50]
 * @param {string}  [opts.cursor]    — from previous response
 * @param {string}  [opts.status]    — filter by status (derived "completed" done in caller)
 * @param {string}  [opts.category]  — filter by category
 */
export async function listMedOrders(ddb, TABLE, uid, { limit = 50, cursor, status, category } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const params = {
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":pk": medPK(uid), ":sk": "MEDORD#" },
    ScanIndexForward: false,
    Limit: lim,
  };
  if (cursor) params.ExclusiveStartKey = decodeCursor(cursor);

  const filterParts = [];
  const names = {};
  // status handled in-code for "completed" derivation; still filter stored statuses here
  if (status && status !== "completed") {
    filterParts.push("#st = :status");
    names["#st"] = "status";
    params.ExpressionAttributeValues[":status"] = status;
  }
  if (category) {
    filterParts.push("category = :cat");
    params.ExpressionAttributeValues[":cat"] = category;
  }
  if (filterParts.length) {
    params.FilterExpression = filterParts.join(" AND ");
    if (Object.keys(names).length) params.ExpressionAttributeNames = names;
  }

  const q = await ddb.send(new QueryCommand(params));
  return {
    items: q.Items || [],
    nextCursor: encodeCursor(q.LastEvaluatedKey),
  };
}

// ── MAR primitives ────────────────────────────────────────────────────────────

export async function getMARRow(ddb, TABLE, uid, date, time, medId) {
  const r = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: medPK(uid), SK: marSK(date, time, medId) },
  }));
  return r.Item || null;
}

/**
 * Query all MAR rows for a patient on a given date.
 * Returns items sorted by SK (time-ascending).
 */
export async function listMARForDate(ddb, TABLE, uid, date) {
  const q = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":pk": medPK(uid), ":sk": `MAR#${date}#` },
    ScanIndexForward: true,
  }));
  return q.Items || [];
}

// ── Idempotency primitives ────────────────────────────────────────────────────

export async function getMedIdemRecord(ddb, TABLE, uid, clientMutationId) {
  if (!clientMutationId) return null;
  const r = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: medIdemPK(uid), SK: medIdemSK(clientMutationId) },
  }));
  return r.Item || null;
}

export function buildMedIdemItem(uid, clientMutationId, summary, nowISO, ttlSecs = 7 * 24 * 3600) {
  return {
    PK: medIdemPK(uid),
    SK: medIdemSK(clientMutationId),
    entity: "IDEMP",
    client_mutation_id: clientMutationId,
    response_summary: summary,
    created_at: nowISO,
    expires_at: Math.floor(Date.now() / 1000) + ttlSecs,
  };
}

// ── Generic transact helper ───────────────────────────────────────────────────

/**
 * Execute a TransactWrite from a flat list of operation descriptors.
 *
 * Descriptor shapes:
 *   { kind:"put",    Item, conditionExpression?, expressionAttributeNames?, expressionAttributeValues? }
 *   { kind:"update", Key, UpdateExpression, ConditionExpression?, ExpressionAttributeNames?, ExpressionAttributeValues? }
 *   { kind:"delete", Key, ConditionExpression? }
 */
export async function medTransactWrite(ddb, TABLE, ops) {
  const TransactItems = ops.map((op) => {
    if (op.kind === "put") {
      return {
        Put: {
          TableName: TABLE,
          Item: op.Item,
          ...(op.conditionExpression && {
            ConditionExpression: op.conditionExpression,
            ...(op.expressionAttributeNames && { ExpressionAttributeNames: op.expressionAttributeNames }),
            ...(op.expressionAttributeValues && { ExpressionAttributeValues: op.expressionAttributeValues }),
          }),
        },
      };
    }
    if (op.kind === "update") {
      return {
        Update: {
          TableName: TABLE,
          Key: op.Key,
          UpdateExpression: op.UpdateExpression,
          ...(op.ConditionExpression && { ConditionExpression: op.ConditionExpression }),
          ...(op.ExpressionAttributeNames && { ExpressionAttributeNames: op.ExpressionAttributeNames }),
          ...(op.ExpressionAttributeValues && { ExpressionAttributeValues: op.ExpressionAttributeValues }),
        },
      };
    }
    if (op.kind === "delete") {
      return {
        Delete: {
          TableName: TABLE,
          Key: op.Key,
          ...(op.ConditionExpression && { ConditionExpression: op.ConditionExpression }),
        },
      };
    }
    throw new Error(`medTransactWrite: unknown op kind: ${op.kind}`);
  });
  return ddb.send(new TransactWriteCommand({ TransactItems }));
}
