// meds.mjs — Patient-scoped medications (UUID PK only) with file attach/detach
// Node 22 ESM

import {
  PutCommand, QueryCommand, UpdateCommand, GetCommand
} from "@aws-sdk/lib-dynamodb";
import { resolveAnyPatientId } from "./ids.mjs";

/* map DB -> UI */
const toUiMed = (it = {}) => ({
  medId: it.med_id,
  patientId: it.patient_uid,
  name: it.name,
  dose: it.dose,
  route: it.route,
  freq: it.freq,
  start: it.start,
  end: it.end ?? null,
  priority: it.priority,
  scheduleTimes: it.schedule_times ?? [],
  files: Array.isArray(it.files) ? it.files : [],
  mrn: it.mrn ?? null,         // provenance at write-time
  scheme: it.scheme ?? null,   // provenance at write-time
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
  return null;
};

const newId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const enc = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const dec = (s) => JSON.parse(Buffer.from(s, "base64url").toString());

function safeUid(u) { return String(u || "").replace(/[^a-zA-Z0-9._-]+/g, "_"); }

export function mountMedRoutes(router, ctx) {
  const { ddb, TABLE, utils } = ctx;
  const { nowISO, resp, parseBody } = utils;

  /* ---------------- CREATE ----------------
     POST /patients/{id}/meds
     body: { name, dose, route, freq, start, end?, priority?, scheduleTimes?[], files?[] }
  */
  router.add("POST", /^\/?patients\/([^/]+)\/meds\/?$/, async ({ match, event }) => {
    const rawId = decodeURIComponent(match[1]);

    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });
    const uid = resolved.uid;
    const meta = resolved.meta;

    const body = parseBody(event);
    const err = validateCreate(body);
    if (err) return resp(400, { error: err });

    const now = nowISO();
    const medId = body.medId || newId();

    const item = {
      PK: `PATIENT#${uid}`,
      SK: `MED#${medId}`,
      med_id: medId,
      patient_uid: uid,
      name: body.name,
      dose: body.dose,
      route: body.route,
      freq: body.freq,
      start: body.start,
      end: body.end ?? null, // optional; null means active
      priority: body.priority || "routine",
      schedule_times: body.scheduleTimes ?? [],
      files: Array.isArray(body.files) ? body.files : [],
      // provenance at the moment of write
      mrn: meta.active_reg_mrn || null,
      scheme: meta.active_scheme || null,

      created_at: now,
      updated_at: now,
    };

    await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
    return resp(201, { message: "created", med: toUiMed(item) });
  });

  /* ---------------- LIST ----------------
     GET /patients/{id}/meds?active=1&limit=&cursor=
     - PK-only query; SK begins_with "MED#"
  */
  router.add("GET", /^\/?patients\/([^/]+)\/meds\/?$/, async ({ match, qs }) => {
    const rawId = decodeURIComponent(match[1]);
    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });

    const uid = resolved.uid;
    const limit = Math.min(Number(qs.limit || 50), 200);
    const active = qs.active === "1" || qs.active === "true";
    const cursor = qs.cursor ? dec(qs.cursor) : undefined;

    const q = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": `PATIENT#${uid}`, ":sk": "MED#" },
      Limit: limit,
      ExclusiveStartKey: cursor,
      ScanIndexForward: true,
    }));

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
     PATCH /patients/{id}/meds/{medId}
     body: any subset of { name,dose,route,freq,start,end,priority,scheduleTimes }
  */
  router.add("PATCH", /^\/?patients\/([^/]+)\/meds\/([^/]+)\/?$/, async ({ match, event }) => {
    const rawId = decodeURIComponent(match[1]);
    const medId = decodeURIComponent(match[2]);

    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });
    const uid = resolved.uid;

    const body = parseBody(event);
    const err = validatePatch(body);
    if (err) return resp(400, { error: err });

    const names = {};
    const values = { ":now": nowISO() };
    let setExpr = "SET updated_at = :now";

    const map = {
      name: "name", dose: "dose", route: "route", freq: "freq",
      start: "start", end: "end", priority: "priority", scheduleTimes: "schedule_times",
    };

    for (const [jsKey, dbKey] of Object.entries(map)) {
      if (body[jsKey] !== undefined) {
        const nk = `#${dbKey}`, vk = `:${dbKey}`;
        names[nk] = dbKey; values[vk] = body[jsKey]; setExpr += `, ${nk} = ${vk}`;
      }
    }

    try {
      const updated = await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `PATIENT#${uid}`, SK: `MED#${medId}` },
        ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
        UpdateExpression: setExpr,
        ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
        ExpressionAttributeValues: values,
        ReturnValues: "ALL_NEW",
      }));
      return resp(200, { message: "updated", med: toUiMed(updated.Attributes) });
    } catch (e) {
      if (e?.name === "ConditionalCheckFailedException") {
        return resp(404, { error: "Medication not found" });
      }
      throw e;
    }
  });

  /* ---------------- SOFT STOP ----------------
     DELETE /patients/{id}/meds/{medId} -> sets end = now
  */
  router.add("DELETE", /^\/?patients\/([^/]+)\/meds\/([^/]+)\/?$/, async ({ match }) => {
    const rawId = decodeURIComponent(match[1]);
    const medId = decodeURIComponent(match[2]);

    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });
    const uid = resolved.uid;

    const now = nowISO();
    try {
      const updated = await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `PATIENT#${uid}`, SK: `MED#${medId}` },
        ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
        UpdateExpression: "SET #end = :now, updated_at = :now",
        ExpressionAttributeNames: { "#end": "end" },
        ExpressionAttributeValues: { ":now": now },
        ReturnValues: "ALL_NEW",
      }));
      return resp(200, { message: "stopped", med: toUiMed(updated.Attributes) });
    } catch (e) {
      if (e?.name === "ConditionalCheckFailedException") {
        return resp(404, { error: "Medication not found" });
      }
      throw e;
    }
  });

  /* ------------------------ FILE ATTACH / DETACH ------------------------ */

  /* ATTACH: POST /patients/:id/meds/:medId/files/attach
     body: { key: "patients/{UID}/optimized/meds/{medId}/..." } */
  router.add("POST", /^\/?patients\/([^/]+)\/meds\/([^/]+)\/files\/attach\/?$/, async ({ match, event }) => {
    const rawId = decodeURIComponent(match[1]);
    const medId = decodeURIComponent(match[2]);
    const { key } = parseBody(event) || {};
    if (!key) return resp(400, { error: "key is required" });

    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });
    const uid = resolved.uid;

    // load med item
    const cur = await ddb.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `PATIENT#${uid}`, SK: `MED#${medId}` },
    }));
    if (!cur.Item) return resp(404, { error: "Medication not found" });

    // safety: ensure key belongs to this patient
    const expectedPrefix = `patients/${safeUid(uid)}/`;
    if (!key.startsWith(expectedPrefix)) {
      return resp(400, { error: "key does not belong to this patient" });
    }

    const files = Array.isArray(cur.Item.files) ? [...cur.Item.files] : [];
    if (!files.includes(key)) files.push(key);

    const upd = await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `PATIENT#${uid}`, SK: `MED#${medId}` },
      UpdateExpression: "SET #files = :files, updated_at = :now",
      ExpressionAttributeNames: { "#files": "files" },
      ExpressionAttributeValues: { ":files": files, ":now": nowISO() },
      ReturnValues: "ALL_NEW",
    }));

    return resp(200, { message: "attached", med: toUiMed(upd.Attributes) });
  });

  /* DETACH: POST /patients/:id/meds/:medId/files/detach
     body: { key } */
  router.add("POST", /^\/?patients\/([^/]+)\/meds\/([^/]+)\/files\/detach\/?$/, async ({ match, event }) => {
    const rawId = decodeURIComponent(match[1]);
    const medId = decodeURIComponent(match[2]);
    const { key } = parseBody(event) || {};
    if (!key) return resp(400, { error: "key is required" });

    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });
    const uid = resolved.uid;

    // load med item
    const cur = await ddb.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `PATIENT#${uid}`, SK: `MED#${medId}` },
    }));
    if (!cur.Item) return resp(404, { error: "Medication not found" });

    const files = Array.isArray(cur.Item.files) ? cur.Item.files.filter((k) => k !== key) : [];
    const upd = await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `PATIENT#${uid}`, SK: `MED#${medId}` },
      UpdateExpression: "SET #files = :files, updated_at = :now",
      ExpressionAttributeNames: { "#files": "files" },
      ExpressionAttributeValues: { ":files": files, ":now": nowISO() },
      ReturnValues: "ALL_NEW",
    }));

    return resp(200, { message: "detached", med: toUiMed(upd.Attributes) });
  });
}
