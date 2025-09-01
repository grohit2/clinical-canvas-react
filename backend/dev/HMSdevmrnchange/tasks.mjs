// tasks.mjs — task endpoints (updated to support file attachments)
// Node 22 ESM

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const ALLOWED_TASK_TYPES = new Set([
  "lab",
  "medication",
  "procedure",
  "assessment",
  "discharge",
]);
const ALLOWED_TASK_STATUS = new Set([
  "open",
  "in-progress",
  "done",
  "cancelled",
]);
const ALLOWED_TASK_PRIORITY = new Set(["low", "medium", "high", "urgent"]);

const toUiTask = (it = {}) => ({
  taskId: it.task_id,
  patientId: it.patient_id,
  title: it.title,
  type: it.type,
  due: it.due,
  assigneeId: it.assignee_id,
  status: it.status,
  priority: it.priority,
  recurring: !!it.recurring,
  recurrence: it.recurrence || null, // { frequency, until?, daysOfWeek? }
  details: it.details || null,
  department: it.department || null,
  files: Array.isArray(it.files) ? it.files : [], // NEW
  createdAt: it.created_at,
  updatedAt: it.updated_at,
});

const validateTaskBody = (b, { partial = false } = {}) => {
  const bad = (m) => ({ ok: false, error: m });
  if (!partial) {
    if (!b?.title) return bad("title is required");
    if (!b?.type || !ALLOWED_TASK_TYPES.has(b.type))
      return bad("invalid type");
    if (!b?.due) return bad("due is required (ISO string)");
    if (!b?.assigneeId) return bad("assigneeId is required");
  }
  if (b?.type && !ALLOWED_TASK_TYPES.has(b.type)) return bad("invalid type");
  if (b?.status && !ALLOWED_TASK_STATUS.has(b.status))
    return bad("invalid status");
  if (b?.priority && !ALLOWED_TASK_PRIORITY.has(b.priority))
    return bad("invalid priority");
  if (b?.recurrence && typeof b.recurrence !== "object")
    return bad("recurrence must be an object");
  return { ok: true };
};

const newId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const buildTaskGSI = ({ status, department, assigneeId, recurring, taskId }) => ({
  // GSI name is GSI2PK-GSI2SK-index
  GSI2PK: `TASK#${(status || "open").toUpperCase()}#DEPT#${department}`,
  GSI2SK: `ASSIGNEE#${assigneeId}#RECURRING#${recurring ? "YES" : "NO"}#TASK#${taskId}`,
});

function safeMrn(m) {
  return String(m || "").replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export function mountTaskRoutes(router, ctx) {
  const { ddb, TABLE, INDEX, utils } = ctx;
  const { nowISO, resp, parseBody } = utils;

  /* POST /patients/{mrn}/tasks */
  router.add("POST", /^\/?patients\/([^/]+)\/tasks\/?$/, async ({ match, event }) => {
    const mrn = decodeURIComponent(match[1]);

    // ensure patient exists + dept
    const cur = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `PATIENT#${mrn}`, SK: "META_LATEST" },
      })
    );
    if (!cur.Item) return resp(404, { error: "Patient not found" });

    const body = parseBody(event);
    const v = validateTaskBody(body, { partial: false });
    if (!v.ok) return resp(400, { error: v.error });

    const now = nowISO();
    const taskId = body.taskId || newId();
    const status = body.status || "open";
    const dept = body.department || cur.Item.department;

    const item = {
      PK: `PATIENT#${mrn}`,
      SK: `TASK#${taskId}`,
      task_id: taskId,
      patient_id: mrn,
      title: body.title,
      type: body.type,
      due: body.due,
      assignee_id: body.assigneeId,
      status,
      priority: body.priority || "medium",
      recurring: !!body.recurring,
      recurrence: body.recurrence || null,
      details: body.details || null,
      department: dept,
      files: Array.isArray(body.files) ? body.files : [], // NEW
      created_at: now,
      updated_at: now,
      ...buildTaskGSI({
        status,
        department: dept,
        assigneeId: body.assigneeId,
        recurring: !!body.recurring,
        taskId,
      }),
    };

    await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
    return resp(201, { message: "created", task: toUiTask(item) });
  });

  /* GET /patients/{mrn}/tasks?status=&limit= */
  router.add("GET", /^\/?patients\/([^/]+)\/tasks\/?$/, async ({ match, qs }) => {
    const mrn = decodeURIComponent(match[1]);
    const limit = Math.min(Number(qs?.limit || 100), 200);
    const stat = qs?.status;

    const q = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: { ":pk": `PATIENT#${mrn}`, ":sk": "TASK#" },
        Limit: limit,
      })
    );
    let items = q.Items || [];
    if (stat) items = items.filter((i) => i.status === stat);
    items.sort((a, b) => (a.due || "~~~~").localeCompare(b.due || "~~~~"));
    return resp(200, items.map(toUiTask));
  });

  /* PATCH /patients/{mrn}/tasks/{taskId} */
  router.add("PATCH", /^\/?patients\/([^/]+)\/tasks\/([^/]+)\/?$/, async ({ match, event }) => {
    const mrn = decodeURIComponent(match[1]);
    const taskId = decodeURIComponent(match[2]);
    const body = parseBody(event);
    const v = validateTaskBody(body, { partial: true });
    if (!v.ok) return resp(400, { error: v.error });

    const names = {};
    const values = { ":now": nowISO() };
    let setExpr = "SET updated_at = :now";

    const fieldMap = {
      title: "title",
      type: "type",
      due: "due",
      assigneeId: "assignee_id",
      status: "status",
      priority: "priority",
      recurring: "recurring",
      recurrence: "recurrence",
      details: "details",
      department: "department",
      // NOTE: files changes should be done via attach/detach, not PATCH
    };

    for (const [jsKey, dbKey] of Object.entries(fieldMap)) {
      if (body[jsKey] !== undefined) {
        const nk = `#${dbKey}`,
          vk = `:${dbKey}`;
        names[nk] = dbKey;
        values[vk] = body[jsKey];
        setExpr += `, ${nk} = ${vk}`;
      }
    }

    const updated = await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `PATIENT#${mrn}`, SK: `TASK#${taskId}` },
        UpdateExpression: setExpr,
        ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
        ExpressionAttributeValues: values,
        ReturnValues: "ALL_NEW",
      })
    );

    // refresh GSI if key fields changed
    const u = updated.Attributes || {};
    if (["status", "department", "assigneeId", "assignee_id", "recurring"].some((k) => k in body)) {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { PK: `PATIENT#${mrn}`, SK: `TASK#${taskId}` },
          UpdateExpression: "SET GSI2PK = :pk, GSI2SK = :sk",
          ExpressionAttributeValues: {
            ":pk": `TASK#${(u.status || "open").toUpperCase()}#DEPT#${u.department}`,
            ":sk": `ASSIGNEE#${u.assignee_id}#RECURRING#${u.recurring ? "YES" : "NO"}#TASK#${u.task_id}`,
          },
        })
      );
    }

    return resp(200, { message: "updated", task: toUiTask(updated.Attributes) });
  });

  /* DELETE (soft cancel): /patients/{mrn}/tasks/{taskId} */
  router.add("DELETE", /^\/?patients\/([^/]+)\/tasks\/([^/]+)\/?$/, async ({ match }) => {
    const mrn = decodeURIComponent(match[1]);
    const taskId = decodeURIComponent(match[2]);

    const now = nowISO();
    const updated = await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `PATIENT#${mrn}`, SK: `TASK#${taskId}` },
        UpdateExpression: "SET #s = :cancelled, updated_at = :now",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":cancelled": "cancelled", ":now": now },
        ReturnValues: "ALL_NEW",
      })
    );

    const u = updated.Attributes || {};
    await ddb.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `PATIENT#${mrn}`, SK: `TASK#${taskId}` },
        UpdateExpression: "SET GSI2PK = :pk, GSI2SK = :sk",
        ExpressionAttributeValues: {
          ":pk": `TASK#CANCELLED#DEPT#${u.department}`,
          ":sk": `ASSIGNEE#${u.assignee_id}#RECURRING#${u.recurring ? "YES" : "NO"}#TASK#${u.task_id}`,
        },
      })
    );

    return resp(200, { message: "deleted" });
  });

  /* ------------------------ FILE ATTACH / DETACH ------------------------ */

  /* ATTACH: POST /patients/:mrn/tasks/:taskId/files/attach
     body: { key: "patients/{MRN}/optimized/tasks/{taskId}/..." } */
  router.add(
    "POST",
    /^\/?patients\/([^/]+)\/tasks\/([^/]+)\/files\/attach\/?$/,
    async ({ match, event }) => {
      const mrn = decodeURIComponent(match[1]);
      const taskId = decodeURIComponent(match[2]);
      const { key } = parseBody(event) || {};
      if (!key) return resp(400, { error: "key is required" });

      // load task
      const cur = await ddb.send(
        new GetCommand({
          TableName: TABLE,
          Key: { PK: `PATIENT#${mrn}`, SK: `TASK#${taskId}` },
        })
      );
      if (!cur.Item) return resp(404, { error: "Task not found" });

      // basic safety: ensure the key belongs to this patient
      const expectedPrefix = `patients/${safeMrn(mrn)}/`;
      if (!key.startsWith(expectedPrefix)) {
        return resp(400, { error: "key does not belong to this patient" });
      }

      const files = Array.isArray(cur.Item.files) ? [...cur.Item.files] : [];
      if (!files.includes(key)) files.push(key);

      const upd = await ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { PK: `PATIENT#${mrn}`, SK: `TASK#${taskId}` },
          UpdateExpression: "SET #files = :files, updated_at = :now",
          ExpressionAttributeNames: { "#files": "files" },
          ExpressionAttributeValues: { ":files": files, ":now": nowISO() },
          ReturnValues: "ALL_NEW",
        })
      );

      return resp(200, { message: "attached", task: toUiTask(upd.Attributes) });
    }
  );

  /* DETACH: POST /patients/:mrn/tasks/:taskId/files/detach
     body: { key } */
  router.add(
    "POST",
    /^\/?patients\/([^/]+)\/tasks\/([^/]+)\/files\/detach\/?$/,
    async ({ match, event }) => {
      const mrn = decodeURIComponent(match[1]);
      const taskId = decodeURIComponent(match[2]);
      const { key } = parseBody(event) || {};
      if (!key) return resp(400, { error: "key is required" });

      // load task
      const cur = await ddb.send(
        new GetCommand({
          TableName: TABLE,
          Key: { PK: `PATIENT#${mrn}`, SK: `TASK#${taskId}` },
        })
      );
      if (!cur.Item) return resp(404, { error: "Task not found" });

      const files = Array.isArray(cur.Item.files)
        ? cur.Item.files.filter((k) => k !== key)
        : [];
      const upd = await ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { PK: `PATIENT#${mrn}`, SK: `TASK#${taskId}` },
          UpdateExpression: "SET #files = :files, updated_at = :now",
          ExpressionAttributeNames: { "#files": "files" },
          ExpressionAttributeValues: { ":files": files, ":now": nowISO() },
          ReturnValues: "ALL_NEW",
        })
      );

      return resp(200, { message: "detached", task: toUiTask(upd.Attributes) });
    }
  );

  /* Dashboard: GET /tasks?department=&status=&assigneeId=&limit= */
  router.add("GET", /^\/?tasks\/?$/, async ({ qs }) => {
    const department = qs?.department;
    const status = (qs?.status || "open").toUpperCase();
    const assigneeId = qs?.assigneeId;
    const limit = Math.min(Number(qs?.limit || 100), 200);

    if (!department) return resp(400, { error: "department is required" });

    const base = {
      TableName: TABLE,
      IndexName: INDEX.TASK_GSI,
      KeyConditionExpression: "GSI2PK = :pk",
      ExpressionAttributeValues: { ":pk": `TASK#${status}#DEPT#${department}` },
      Limit: limit,
      ScanIndexForward: true,
    };

    if (assigneeId) {
      base.KeyConditionExpression += " AND begins_with(GSI2SK, :sk)";
      base.ExpressionAttributeValues[":sk"] = `ASSIGNEE#${assigneeId}`;
    }

    const q = await ddb.send(new QueryCommand(base));
    return resp(200, (q.Items || []).map(toUiTask));
  });
}
