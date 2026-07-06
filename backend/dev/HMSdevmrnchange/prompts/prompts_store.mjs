// prompts/prompts_store.mjs — Raw clinician prompt capture (Node 22 ESM)
//
// Purpose: every utterance the clinician makes at the agent is stored
// verbatim. These rows become the fine-tuning corpus once we have enough
// of them. Stored separately from tasks/vitals so retention rules (PII
// scrub, expiry) can be applied to this stream independently.
//
// Single-table layout (mirrors vitals/changes):
//   PK = PROMPTS#USER#<user_id>      (per-clinician partition)
//   SK = P#<iso_recorded_at>#<promptId>
//   entity = "PROMPT"
//
// We also write a parallel "ALL" row so the fine-tuning batch can scan
// every prompt without iterating users:
//   PK = PROMPTS#ALL
//   SK = same
//
// Two rows per write inside one TransactWrite. Cheap, no atomicity loss.

import {
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";

export const promptUserPK  = (userId) => `PROMPTS#USER#${userId || "ANON"}`;
export const promptAllPK   = () => `PROMPTS#ALL`;
export const promptSK      = (recordedAt, promptId) => `P#${recordedAt}#${promptId}`;

export const newPromptId = () =>
  `prm_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;

export async function putPromptRows(ddb, TABLE, items) {
  const TransactItems = items.map((Item) => ({
    Put: { TableName: TABLE, Item, ConditionExpression: "attribute_not_exists(PK)" },
  }));
  await ddb.send(new TransactWriteCommand({ TransactItems }));
}

export async function queryUserPrompts(ddb, TABLE, userId, { since = null, limit = 50 } = {}) {
  const PK = promptUserPK(userId);
  const params = {
    TableName: TABLE,
    KeyConditionExpression: since
      ? "PK = :pk AND SK > :since"
      : "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: since
      ? { ":pk": PK, ":since": `P#${since}` }
      : { ":pk": PK, ":sk": "P#" },
    Limit: Math.min(Math.max(Number(limit) || 50, 1), 500),
    ScanIndexForward: false,            // newest first
  };
  const q = await ddb.send(new QueryCommand(params));
  return q.Items || [];
}

export async function queryAllPrompts(ddb, TABLE, { since = null, limit = 100 } = {}) {
  const PK = promptAllPK();
  const params = {
    TableName: TABLE,
    KeyConditionExpression: since
      ? "PK = :pk AND SK > :since"
      : "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: since
      ? { ":pk": PK, ":since": `P#${since}` }
      : { ":pk": PK, ":sk": "P#" },
    Limit: Math.min(Math.max(Number(limit) || 100, 1), 500),
    ScanIndexForward: false,
  };
  const q = await ddb.send(new QueryCommand(params));
  return q.Items || [];
}
