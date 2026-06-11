// vitals/vitals_store.mjs — Low-level DDB primitives for vitals (Node 22 ESM)
//
// Single-table layout (mirrors tasks):
//   PK = PATIENT#<uid>
//   SK = VITALS#<recorded_at_iso>#<vitalsId>
//   entity = "VITALS"
// SK is timestamp-first so QueryCommand(... ScanIndexForward:false) returns
// newest readings first — used by /vitals (recent) and /vitals/latest.

import {
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

export const vitalsPK = (uid) => `PATIENT#${uid}`;
export const vitalsSK = (recordedAt, vitalsId) => `VITALS#${recordedAt}#${vitalsId}`;

export const newVitalsId = () =>
  `vit_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;

export async function putVitals(ddb, TABLE, item) {
  await ddb.send(new PutCommand({
    TableName: TABLE, Item: item,
    ConditionExpression: "attribute_not_exists(PK)",
  }));
  return item;
}

export async function queryRecentVitals(ddb, TABLE, uid, { limit = 20 } = {}) {
  const q = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":pk": vitalsPK(uid), ":sk": "VITALS#" },
    ScanIndexForward: false,
    Limit: limit,
  }));
  return q.Items || [];
}

export async function queryLatestVitals(ddb, TABLE, uid) {
  const items = await queryRecentVitals(ddb, TABLE, uid, { limit: 1 });
  return items[0] || null;
}
