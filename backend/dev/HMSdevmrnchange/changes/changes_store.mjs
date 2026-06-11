// changes/changes_store.mjs — Unified change-feed primitives (Node 22 ESM)
//
// Single-table layout (mirrors TASKSYNC):
//   PK = CHANGES#<scopeKind>#<scopeId>
//        scopeKind ∈ patient | assignee | doctor | department
//   SK = CHG#<recorded_at_iso>#<eventId>
//   entity = "CHANGE"
//
// One logical write may fan out across several PKs (e.g. a task create
// emits patient + assignee + doctor rows). All rows share the same
// recorded_at + event_id so the cursor is stable across scopes.

import { QueryCommand } from "@aws-sdk/lib-dynamodb";

export const SCOPE_KINDS = ["patient", "assignee", "doctor", "department"];

export const changesPK = (scope, id) => `CHANGES#${scope.toUpperCase()}#${id}`;
export const cursorOf = (recordedAt, eventId) => `${recordedAt}#${eventId}`;
export const changesSK = (cursor) => `CHG#${cursor}`;

export const newEventId = () =>
  `chg_${Date.now().toString(36)}_${Math.random().toString(16).slice(2, 8)}`;

export async function queryChanges(ddb, TABLE, scope, id, { after = null, limit = 100 } = {}) {
  const PK = changesPK(scope, id);
  const params = {
    TableName: TABLE,
    KeyConditionExpression: after
      ? "PK = :pk AND SK > :after"
      : "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: after
      ? { ":pk": PK, ":after": changesSK(after) }
      : { ":pk": PK, ":sk": "CHG#" },
    Limit: Math.min(Math.max(Number(limit) || 100, 1), 500),
    ScanIndexForward: true,
  };
  const q = await ddb.send(new QueryCommand(params));
  const items = q.Items || [];
  return {
    items,
    cursor: items.length ? items[items.length - 1].cursor : (after || null),
  };
}
