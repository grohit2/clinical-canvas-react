// meds.mjs — Patient-scoped medications (PK/SK only)
// Updated to support file attachments via files[] + attach/detach endpoints
// Node 22 ESM

import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

/* map DB -> UI */
const toUiMed = (it = {}) => ({
  medId: it.med_id,
  patientId: it.patient_id,
  name: it.name,
  dose: it.dose,
  route: it.route,
  freq: it.freq,
  start: it.start,
  end: it.end ?? null,
  priority: it.priority,
  scheduleTimes: it.schedule_times ?? [],
  files: Array.isArray(it.files) ? it.files : [], // NEW
  createdAt: it.created_at,
  updatedAt: it.updated_at,
});

const ALLOWED_PRIORITY = new Set(["routine", "important", "critical"]);

const validateCreate = (b) => {
  if (!b?.name) return "name is required";
  if (!b?.dose) return "dose is required";
  if (!b?.route) return "route is required";
  if (!b?.freq) return "freq is required";
  if (!b?.start) return "start (ISO) is required";
  if (b?.priority && !ALLOWED_PRIORITY.has(b.priority)) return "invalid priority";
  if (b?.scheduleTimes && !Array.isArray(b.scheduleTimes)) return "scheduleTimes must be array";
  if (b?.files && !Array.isArray(b.files)) return "files must be array of S3 keys";
  return null;
};

const validatePatch = (b) => {
  if (!b || typeof b !== "object") return "empty update";
  if (b?.priority && !ALLOWED_PRIORITY.has(b.priority)) return "invalid priority";
  if (b?.scheduleTimes && !Array.isArray(b.scheduleTimes)) return "scheduleTimes must be array";
  // files are managed via attach/detach endpoints, not PATCH
  return null;
};

const newId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const enc = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const dec = (s) => JSON.parse(Buffer.from(s, "base64url").toString());

function safeMrn(m) {
  return String(m || "").replace(/[^a-zA-Z0-9._-]+/g, "_");
}

export function mountMedRoutes(router, ctx) {
  const { ddb, TABLE, utils } = ctx;
  const { nowISO, resp, parseBody } = utils;

  /* ---------------- CREATE ----------------
     POST /patients/{mrn}/meds
     body: { name, dose, route, freq, start, end?, priority?, scheduleTimes?[], files?[] }
  */
  router.add("POST", /^\/?patients\/([^/]+)\/meds\/?$/, async ({ match, event }) => {
    const mrn = decodeURIComponent(match[1]);

    // ensure patient exists
    const cur = await ddb.send(
      new GetCommand({
        TableName: TABLE,
        Key: { PK: `PATIENT#${mrn}`, SK: "META_LATEST" },
      })
    );
    if (!cur.Item) return resp(404, { error: "Patient not found" });

    const body = parseBody(event);
    const err = validateCreate(body);
    if (err) return resp(400, { error: err });

    const now = nowISO();
    const medId = body.medId || newId();

    const item = {
      PK: `PATIENT#${mrn}`,
      SK: `MED#${medId}`,
      med_id: medId,
      patient_id: mrn,
      name: body.name,
      dose: body.dose,
      route: body.route,
      freq: body.freq,
      start: body.start,
      end: body.end ?? null, // optional; null means active
      priority: body.priority || "routine",
      schedule_times: body.scheduleTimes ?? [],
      files: Array.isArray(body.files) ? body.files : [], // NEW
      created_at: now,
      updated_at: now,
    };

    await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
    return resp(201, { message: "created", med: toUiMed(item) });
  });

  /* ---------------- LIST ----------------
     GET /patients/{mrn}/meds?active=1&limit=&cursor=
     - PK-only query; SK begins_with "MED#"
     - active=1 filters (end == null || end > now)
     - returns { items, nextCursor? }
  */
  router.add("GET", /^\/?patients\/([^/]+)\/meds\/?$/, async ({ match, qs }) => {
    const mrn = decodeURIComponent(match[1]);
    const limit = Math.min(Number(qs.limit || 50), 200);
    const active = qs.active === "1" || qs.active === "true";
    const cursor = qs.cursor ? dec(qs.cursor) : undefined;

    const q = await ddb.send(
      new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: { ":pk": `PATIENT#${mrn}`, ":sk": "MED#" },
        Limit: limit,
        ExclusiveStartKey: cursor,
        ScanIndexForward: true,
      })
    );

    let items = q.Items || [];
    if (active) {
      const now = nowISO();
      items = items.filter((i) => !i.end || i.end > now);
    }

    return resp(200, {
      items: items.map(toUiMed),
      nextCursor: q.LastEvaluatedKey ? enc(q.LastEvaluatedKey) : null,
    });
  });

  /* ---------------- UPDATE ----------------
     PATCH /patients/{mrn}/meds/{medId}
     body: any subset of { name,dose,route,freq,start,end,priority,scheduleTimes }
     (NOTE: files are managed via attach/detach endpoints)
  */
  router.add("PATCH", /^\/?patients\/([^/]+)\/meds\/([^/]+)\/?$/, async ({ match, event }) => {
    const mrn = decodeURIComponent(match[1]);
    const medId = decodeURIComponent(match[2]);
    const body = parseBody(event);

    const err = validatePatch(body);
    if (err) return resp(400, { error: err });

    const names = {};
    const values = { ":now": nowISO() };
    let setExpr = "SET updated_at = :now";

    const map = {
      name: "name",
      dose: "dose",
      route: "route",
      freq: "freq",
      start: "start",
      end: "end",
      priority: "priority",
      scheduleTimes: "schedule_times",
    };

    for (const [jsKey, dbKey] of Object.entries(map)) {
      if (body[jsKey] !== undefined) {
        const nk = `#${dbKey}`,
          vk = `:${dbKey}`;
        names[nk] = dbKey;
        values[vk] = body[jsKey];
        setExpr += `, ${nk} = ${vk}`;
      }
    }

    try {
      const updated = await ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { PK: `PATIENT#${mrn}`, SK: `MED#${medId}` },
          ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
          UpdateExpression: setExpr,
          ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
          ExpressionAttributeValues: values,
          ReturnValues: "ALL_NEW",
        })
      );
      return resp(200, {
        message: "updated",
        med: toUiMed(updated.Attributes),
      });
    } catch (e) {
      if (e?.name === "ConditionalCheckFailedException") {
        return resp(404, { error: "Medication not found" });
      }
      throw e;
    }
  });

  /* ---------------- SOFT STOP ----------------
     DELETE /patients/{mrn}/meds/{medId}
     - sets end = now (no hard delete)
  */
  router.add("DELETE", /^\/?patients\/([^/]+)\/meds\/([^/]+)\/?$/, async ({ match }) => {
    const mrn = decodeURIComponent(match[1]);
    const medId = decodeURIComponent(match[2]);
    const now = nowISO();

    try {
      const updated = await ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { PK: `PATIENT#${mrn}`, SK: `MED#${medId}` },
          ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
          UpdateExpression: "SET #end = :now, updated_at = :now",
          ExpressionAttributeNames: { "#end": "end" },
          ExpressionAttributeValues: { ":now": now },
          ReturnValues: "ALL_NEW",
        })
      );
      return resp(200, { message: "stopped", med: toUiMed(updated.Attributes) });
    } catch (e) {
      if (e?.name === "ConditionalCheckFailedException") {
        return resp(404, { error: "Medication not found" });
      }
      throw e;
    }
  });

  /* ------------------------ FILE ATTACH / DETACH ------------------------ */

  /* ATTACH: POST /patients/:mrn/meds/:medId/files/attach
     body: { key: "patients/{MRN}/optimized/meds/{medId}/..." } */
  router.add(
    "POST",
    /^\/?patients\/([^/]+)\/meds\/([^/]+)\/files\/attach\/?$/,
    async ({ match, event }) => {
      const mrn = decodeURIComponent(match[1]);
      const medId = decodeURIComponent(match[2]);
      const { key } = parseBody(event) || {};
      if (!key) return resp(400, { error: "key is required" });

      // load med item
      const cur = await ddb.send(
        new GetCommand({
          TableName: TABLE,
          Key: { PK: `PATIENT#${mrn}`, SK: `MED#${medId}` },
        })
      );
      if (!cur.Item) return resp(404, { error: "Medication not found" });

      // safety: ensure key belongs to this patient
      const expectedPrefix = `patients/${safeMrn(mrn)}/`;
      if (!key.startsWith(expectedPrefix)) {
        return resp(400, { error: "key does not belong to this patient" });
      }

      const files = Array.isArray(cur.Item.files) ? [...cur.Item.files] : [];
      if (!files.includes(key)) files.push(key);

      const upd = await ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { PK: `PATIENT#${mrn}`, SK: `MED#${medId}` },
          UpdateExpression: "SET #files = :files, updated_at = :now",
          ExpressionAttributeNames: { "#files": "files" },
          ExpressionAttributeValues: { ":files": files, ":now": nowISO() },
          ReturnValues: "ALL_NEW",
        })
      );

      return resp(200, { message: "attached", med: toUiMed(upd.Attributes) });
    }
  );

  /* DETACH: POST /patients/:mrn/meds/:medId/files/detach
     body: { key } */
  router.add(
    "POST",
    /^\/?patients\/([^/]+)\/meds\/([^/]+)\/files\/detach\/?$/,
    async ({ match, event }) => {
      const mrn = decodeURIComponent(match[1]);
      const medId = decodeURIComponent(match[2]);
      const { key } = parseBody(event) || {};
      if (!key) return resp(400, { error: "key is required" });

      // load med item
      const cur = await ddb.send(
        new GetCommand({
          TableName: TABLE,
          Key: { PK: `PATIENT#${mrn}`, SK: `MED#${medId}` },
        })
      );
      if (!cur.Item) return resp(404, { error: "Medication not found" });

      const files = Array.isArray(cur.Item.files)
        ? cur.Item.files.filter((k) => k !== key)
        : [];
      const upd = await ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { PK: `PATIENT#${mrn}`, SK: `MED#${medId}` },
          UpdateExpression: "SET #files = :files, updated_at = :now",
          ExpressionAttributeNames: { "#files": "files" },
          ExpressionAttributeValues: { ":files": files, ":now": nowISO() },
          ReturnValues: "ALL_NEW",
        })
      );

      return resp(200, { message: "detached", med: toUiMed(upd.Attributes) });
    }
  );
}
