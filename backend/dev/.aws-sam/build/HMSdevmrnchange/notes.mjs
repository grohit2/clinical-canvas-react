// notes.mjs — Patient Notes API (UUID-only) with file attach/detach (Node 22 ESM)

import {
  PutCommand,
  QueryCommand,
  UpdateCommand,
  TransactWriteCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { resolveAnyPatientId } from "./ids.mjs";

/* Allowed categories (mirror your FE) */
const CATS = new Set(["doctorNote", "nurseNote", "pharmacy", "discharge"]);

/* Map DB -> UI */
const toUiNote = (it = {}) => ({
  noteId: it.note_id,
  id: it.patient_uid,
  patientId: it.patient_uid,
  mrn: it.mrn ?? null,         // provenance at write-time
  scheme: it.scheme ?? null,   // provenance at write-time
  category: it.category,
  content: it.content,
  files: Array.isArray(it.files) ? it.files : [],
  createdAt: it.created_at,
  updatedAt: it.updated_at,
  deleted: !!it.deleted,
});

/* Small helpers */
const newId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const encodeCursor = (key) => Buffer.from(JSON.stringify(key)).toString("base64");
const decodeCursor = (str) => {
  try { return JSON.parse(Buffer.from(str, "base64").toString("utf8")); } catch { return null; }
};

function safeUid(u) { return String(u || "").replace(/[^a-zA-Z0-9._-]+/g, "_"); }

/* Find a note’s exact SK by noteId (since SK = NOTE#{ts}#{noteId}) */
async function findNoteItemById(ddb, TABLE, uid, noteId) {
  const q = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":pk": `PATIENT#${uid}`, ":sk": "NOTE#" },
    ScanIndexForward: false, // newest first
    Limit: 200,
  }));
  const items = q.Items || [];
  const hit = items.find((it) => it.note_id === noteId);
  return hit || null;
}

/* Router mount */
export function mountNoteRoutes(router, ctx) {
  const { ddb, TABLE, utils } = ctx;
  const { nowISO, resp, parseBody } = utils;

  /* CREATE: POST /patients/{id}/notes
     body: { authorId, category, content, files?[] } (+ optional: noteId) */
  router.add("POST", /^\/patients\/([^/]+)\/notes\/?$/, async ({ match, event }) => {
    const rawId = decodeURIComponent(match[1]);

    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });

    const uid = resolved.uid;
    const meta = resolved.meta;

    const body = parseBody(event);
    if (!body?.authorId) return resp(400, { error: "authorId is required" });
    if (!body?.category || !CATS.has(body.category)) return resp(400, { error: "invalid category" });
    if (!body?.content) return resp(400, { error: "content is required" });

    const now = nowISO();
    const noteId = body.noteId || newId();
    const sk = `NOTE#${now}#${noteId}`;

    const noteItem = {
      PK: `PATIENT#${uid}`,
      SK: sk,
      note_id: noteId,
      patient_uid: uid,
      author_id: body.authorId,
      category: body.category,
      content: body.content,
      files: Array.isArray(body.files) ? body.files : [],

      // provenance at write-time
      mrn: meta.active_reg_mrn || null,
      scheme: meta.active_scheme || null,

      created_at: now,
      updated_at: now,
      deleted: false,
    };

    // Atomically: put note + bump patient's counters/timestamp
    await ddb.send(new TransactWriteCommand({
      TransactItems: [
        { Put: { TableName: TABLE, Item: noteItem } },
        {
          Update: {
            TableName: TABLE,
            Key: { PK: `PATIENT#${uid}`, SK: "META_LATEST" },
            UpdateExpression: "ADD update_counter :one SET last_updated = :now",
            ExpressionAttributeValues: { ":one": 1, ":now": now },
          },
        },
      ],
    }));

    return resp(201, { message: "created", note: toUiNote(noteItem) });
  });

  /* LIST: GET /patients/{id}/notes?limit=&cursor=&includeDeleted=0|1
     - Sorted desc by created_at (newest first)
     - Pagination via cursor (base64 LastEvaluatedKey) */
  router.add("GET", /^\/patients\/([^/]+)\/notes\/?$/, async ({ match, qs }) => {
    const rawId = decodeURIComponent(match[1]);

    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });

    const uid = resolved.uid;
    const limit = Math.min(Number(qs.limit || 50), 200);
    const includeDeleted = qs.includeDeleted === "1";
    const cursor = qs.cursor ? decodeCursor(qs.cursor) : null;

    const q = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": `PATIENT#${uid}`, ":sk": "NOTE#" },
      ScanIndexForward: false,
      Limit: limit,
      ExclusiveStartKey: cursor || undefined,
    }));

    let items = q.Items || [];
    if (!includeDeleted) items = items.filter((i) => !i.deleted);

    const out = items.map(toUiNote);
    const nextCursor = q.LastEvaluatedKey ? encodeCursor(q.LastEvaluatedKey) : null;

    return resp(200, { items: out, nextCursor });
  });

  /* UPDATE: PATCH /patients/{id}/notes/{noteId}
     body: { category?, content? }  (files handled by attach/detach endpoints) */
  router.add("PATCH", /^\/patients\/([^/]+)\/notes\/([^/]+)\/?$/, async ({ match, event }) => {
    const rawId = decodeURIComponent(match[1]);
    const noteId = decodeURIComponent(match[2]);
    const body = parseBody(event);

    if (body.category && !CATS.has(body.category)) return resp(400, { error: "invalid category" });
    if (body.category === undefined && body.content === undefined) return resp(400, { error: "nothing to update" });

    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });

    const target = await findNoteItemById(ddb, TABLE, resolved.uid, noteId);
    if (!target) return resp(404, { error: "Note not found" });

    const names = {};
    const values = { ":now": nowISO() };
    let setExpr = "SET updated_at = :now";

    if (body.category !== undefined) {
      names["#category"] = "category";
      values[":category"] = body.category;
      setExpr += ", #category = :category";
    }
    if (body.content !== undefined) {
      names["#content"] = "content";
      values[":content"] = body.content;
      setExpr += ", #content = :content";
    }

    const updated = await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: target.PK, SK: target.SK },
      UpdateExpression: setExpr,
      ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    }));

    return resp(200, { message: "updated", note: toUiNote(updated.Attributes) });
  });

  /* DELETE (soft): DELETE /patients/{id}/notes/{noteId}
     -> sets deleted=true, keeps the record for audit */
  router.add("DELETE", /^\/patients\/([^/]+)\/notes\/([^/]+)\/?$/, async ({ match }) => {
    const rawId = decodeURIComponent(match[1]);
    const noteId = decodeURIComponent(match[2]);

    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });

    const target = await findNoteItemById(ddb, TABLE, resolved.uid, noteId);
    if (!target) return resp(404, { error: "Note not found" });

    const now = nowISO();
    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: target.PK, SK: target.SK },
      UpdateExpression: "SET deleted = :true, updated_at = :now",
      ExpressionAttributeValues: { ":true": true, ":now": now },
      ReturnValues: "ALL_OLD",
    }));

    return resp(200, { message: "deleted" });
  });

  /* ------------------------ FILE ATTACH / DETACH ------------------------ */

  /* ATTACH: POST /patients/:id/notes/:noteId/files/attach
     body: { key: "patients/{UID}/optimized/notes/{noteId}/..." } */
  router.add("POST", /^\/patients\/([^/]+)\/notes\/([^/]+)\/files\/attach\/?$/, async ({ match, event }) => {
    const rawId = decodeURIComponent(match[1]);
    const noteId = decodeURIComponent(match[2]);
    const { key } = parseBody(event) || {};
    if (!key) return resp(400, { error: "key is required" });

    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });
    const uid = resolved.uid;

    const target = await findNoteItemById(ddb, TABLE, uid, noteId);
    if (!target) return resp(404, { error: "Note not found" });

    const expectedPrefix = `patients/${safeUid(uid)}/`;
    if (!key.startsWith(expectedPrefix)) {
      return resp(400, { error: "key does not belong to this patient" });
    }

    const files = Array.isArray(target.files) ? [...target.files] : [];
    if (!files.includes(key)) files.push(key);

    const updated = await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: target.PK, SK: target.SK },
      UpdateExpression: "SET #files = :files, updated_at = :now",
      ExpressionAttributeNames: { "#files": "files" },
      ExpressionAttributeValues: { ":files": files, ":now": nowISO() },
      ReturnValues: "ALL_NEW",
    }));

    return resp(200, { message: "attached", note: toUiNote(updated.Attributes) });
  });

  /* DETACH: POST /patients/:id/notes/:noteId/files/detach
     body: { key } */
  router.add("POST", /^\/patients\/([^/]+)\/notes\/([^/]+)\/files\/detach\/?$/, async ({ match, event }) => {
    const rawId = decodeURIComponent(match[1]);
    const noteId = decodeURIComponent(match[2]);
    const { key } = parseBody(event) || {};
    if (!key) return resp(400, { error: "key is required" });

    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });
    const uid = resolved.uid;

    const target = await findNoteItemById(ddb, TABLE, uid, noteId);
    if (!target) return resp(404, { error: "Note not found" });

    const files = Array.isArray(target.files) ? target.files.filter(k => k !== key) : [];
    const updated = await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: target.PK, SK: target.SK },
      UpdateExpression: "SET #files = :files, updated_at = :now",
      ExpressionAttributeNames: { "#files": "files" },
      ExpressionAttributeValues: { ":files": files, ":now": nowISO() },
      ReturnValues: "ALL_NEW",
    }));

    return resp(200, { message: "detached", note: toUiNote(updated.Attributes) });
  });
}
