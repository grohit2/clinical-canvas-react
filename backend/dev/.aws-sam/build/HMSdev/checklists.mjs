// checklists.mjs — Transition checklists (Admin + Read)

import { GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const toUiChecklist = (it = {}) => ({
  from: it.from,
  to: it.to,
  in: Array.isArray(it.in_required) ? it.in_required : [],
  out: Array.isArray(it.out_required) ? it.out_required : [],
  createdAt: it.created_at,
  updatedAt: it.updated_at,
});

export function mountChecklistRoutes(router, ctx) {
  const { ddb, TABLE, utils } = ctx;
  const { nowISO, resp, parseBody } = utils;

  // GET /checklists?from=Admission&to=Pre-Op  (single)
  // GET /checklists?from=Admission             (all possible targets)
  router.add("GET", /^\/?checklists\/?$/, async ({ qs }) => {
    const from = qs?.from;
    const to = qs?.to;

    if (!from) return resp(400, { error: "from is required" });

    if (to) {
      const g = await ddb.send(new GetCommand({
        TableName: TABLE,
        Key: { PK: "CHECKLIST", SK: `STAGE#${from}#TO#${to}` },
      }));
      if (!g.Item) return resp(404, { error: "transition not allowed" });
      return resp(200, toUiChecklist(g.Item));
    }

    const q = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": "CHECKLIST", ":sk": `STAGE#${from}#TO#` },
    }));
    return resp(200, (q.Items || []).map(toUiChecklist));
  });

  // (Optional Admin) PUT /checklists  body: { from, to, in:[], out:[] }
  router.add("PUT", /^\/?checklists\/?$/, async ({ event }) => {
    const body = parseBody(event);
    if (!body?.from || !body?.to) return resp(400, { error: "from & to required" });
    const now = nowISO();
    const item = {
      PK: "CHECKLIST",
      SK: `STAGE#${body.from}#TO#${body.to}`,
      from: body.from,
      to: body.to,
      in_required: Array.isArray(body.in) ? body.in : [],
      out_required: Array.isArray(body.out) ? body.out : [],
      created_at: now,
      updated_at: now,
    };
    await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
    return resp(200, { message: "upserted", checklist: toUiChecklist(item) });
  });
}

