// pnotes/pnotes_store.mjs — Data layer for progress notes (Node 22 ESM)
//
// Single-table layout:
//   PK = PATIENT#<uid>
//   SK = PNOTE#<created_at>#<pnId>     entity = "PNOTE"
//   SK = PNDRAFT#<authorId>             entity pointer; pn_sk field → draft row
//
// Sparse GSI2 ack-inbox (unacked finals only, self-cleaning):
//   GSI2PK = PNACK#<assigned_doctor_id>
//   GSI2SK = created_at
//   Both attributes are REMOVED on acknowledge.
//
// DynamoDB reserved-word aliases used throughout:
//   #s  → status   (reserved)
//   #v  → version  (reserved)
//   #e  → end      (reserved, meds query)
//   #t  → text     (not strictly reserved, aliased for safety)
//   #sec → sections
//   #ack → acknowledge

import {
  TransactWriteCommand,
  QueryCommand,
  UpdateCommand,
  PutCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";
import { buildVitalsWrite, getLatestVitals } from "../vitals/vitals_crud.mjs";
import { buildChangeRows } from "../changes/changes_emit.mjs";
import { createTask } from "../tasks/task_crud.mjs";
import { loadMetaByUid } from "../ids.mjs";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const mkErr = (msg, code) => Object.assign(new Error(msg), { code });

const encodeCursor = (key) =>
  Buffer.from(JSON.stringify(key)).toString("base64");
const decodeCursor = (s) => {
  try {
    return JSON.parse(Buffer.from(s, "base64").toString("utf8"));
  } catch {
    return null;
  }
};

// PAD/POD — days since a seed date, clamped ≥ 0, null if seed absent/invalid.
function daysSince(dateStr, nowISO) {
  if (!dateStr) return null;
  const seed = new Date(dateStr).getTime();
  if (!Number.isFinite(seed)) return null;
  const now = new Date(nowISO).getTime();
  return Math.max(0, Math.floor((now - seed) / 86400000));
}

function computePAD(meta, nowISO) {
  const seed =
    meta?.admissionDate ||
    (Array.isArray(meta?.mrn_history) && meta.mrn_history.length > 0
      ? meta.mrn_history[0].date
      : null);
  return daysSince(seed, nowISO);
}

function computePOD(meta, nowISO) {
  return daysSince(meta?.surgery_date, nowISO);
}

// Trimmed vitals echo stored on the note row — ≤ 1 KB, no extra joins needed
// for list renders.
function buildVitalsInline(vitalsItem) {
  if (!vitalsItem) return null;
  const {
    vitals_id, recorded_at,
    bp_systolic, bp_diastolic, hr, spo2,
    temp_c, rr, grbs, pain, urine_output_ml,
  } = vitalsItem;
  return {
    vitals_id, recorded_at,
    bp_systolic, bp_diastolic, hr, spo2,
    temp_c, rr, grbs, pain, urine_output_ml,
  };
}

// Scan the patient partition for a PNOTE by pnId.
// SK is timestamp-first so we can't GetItem directly; we query newest-first.
async function findPnoteItem(ddb, TABLE, uid, pnId) {
  const q = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":pk": `PATIENT#${uid}`, ":sk": "PNOTE#" },
    ScanIndexForward: false,
    Limit: 200,
  }));
  return (q.Items || []).find((it) => it.pn_id === pnId) || null;
}

// ---------------------------------------------------------------------------
// Key helper (exported — routes or other modules may build SK references)
// ---------------------------------------------------------------------------

export const pnoteSK = (createdAt, pnId) => `PNOTE#${createdAt}#${pnId}`;

// ---------------------------------------------------------------------------
// §7.3 Store functions
// ---------------------------------------------------------------------------

/**
 * createPnote — L0/L1/L2 combined create.
 *
 * Order of operations (spec §7.3):
 *   1. Validate ≥1 of text / sections / vitals.
 *   2. spawnTasks[] via createTask (each has its own TransactWrite).
 *   3. Single TransactWrite:
 *        PNOTE Put
 *        + (draft) PNDRAFT pointer Put (attribute_not_exists guard → DRAFT_EXISTS)
 *        + (vitals) buildVitalsWrite transactItems spliced
 *        + (final) change rows
 *        + META bump (ADD update_counter, SET last_updated)
 *   4. Return { item }.
 */
export async function createPnote(deps, { uid, meta, body, actor, nowISO }) {
  const { ddb, TABLE } = deps;

  // ── Validate ──
  const hasText =
    typeof body?.text === "string" && body.text.trim().length > 0;
  const hasSections =
    body?.sections != null &&
    typeof body.sections === "object" &&
    Object.values(body.sections).some(
      (v) => typeof v === "string" && v.trim().length > 0
    );
  const hasVitals =
    body?.vitals != null && typeof body.vitals === "object";

  if (!hasText && !hasSections && !hasVitals) {
    throw mkErr(
      "at least one of text, sections, or vitals is required",
      "BAD_REQUEST"
    );
  }

  // ── Idempotency (clientMutationId) — FIX 5 ──
  const clientMutationId = body?.clientMutationId || null;
  if (clientMutationId) {
    const markerRes = await ddb.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `PATIENT#${uid}`, SK: `PNIDEMP#${clientMutationId}` },
    }));
    if (markerRes.Item) {
      const noteRes = await ddb.send(new GetCommand({
        TableName: TABLE,
        Key: { PK: `PATIENT#${uid}`, SK: markerRes.Item.pn_sk },
      }));
      if (noteRes.Item) return { item: noteRes.Item };
    }
  }

  const status = body?.status === "draft" ? "draft" : "final";
  const pnId = randomUUID();
  // recorded_at override — lets paper records be transcribed with their true
  // timestamp; SK sorts on created_at, so backdated notes land in place.
  let createdAt = nowISO;
  if (body?.recorded_at != null) {
    const t = Date.parse(body.recorded_at);
    if (Number.isNaN(t)) {
      throw mkErr("recorded_at must be an ISO datetime", "BAD_REQUEST");
    }
    createdAt = new Date(t).toISOString();
  }
  const PK = `PATIENT#${uid}`;
  const SK = pnoteSK(createdAt, pnId);
  const authorId = actor?.user_id || "unknown";

  const pad = computePAD(meta, createdAt);
  const pod = computePOD(meta, createdAt);

  // ── spawnTasks first — each runs its own TransactWrite via createTask ──
  // FIX 5: deterministic clientMutationId per task when caller supplied one.
  const taskIds = [];
  if (Array.isArray(body?.spawnTasks) && body.spawnTasks.length > 0) {
    for (let _ti = 0; _ti < body.spawnTasks.length; _ti++) {
      const t = body.spawnTasks[_ti];
      const { item: taskItem } = await createTask(deps, {
        uid,
        mrn: meta?.active_reg_mrn || null,
        body: t,
        actor,
        clientMutationId: clientMutationId
          ? `${clientMutationId}:task:${_ti}`
          : randomUUID(),
        nowISO,
      });
      if (taskItem?.task_id) taskIds.push(taskItem.task_id);
    }
  }

  // ── Auto-ack when author === assigned doctor (finals only — FIX 2) ──
  const autoAck =
    status === "final" &&
    !!actor?.user_id &&
    !!meta?.assigned_doctor_id &&
    actor.user_id === meta.assigned_doctor_id;

  const ackPendingFor =
    !autoAck && meta?.assigned_doctor_id && status === "final"
      ? meta.assigned_doctor_id
      : undefined;

  // ── Vitals splice ──
  let vitalsId = undefined;
  let vitalsInline = undefined;
  let vitalsTransactItems = [];
  if (hasVitals) {
    const vw = buildVitalsWrite(deps, { uid, body: body.vitals, actor, nowISO });
    vitalsId = vw.item.vitals_id;
    vitalsInline = buildVitalsInline(vw.item);
    vitalsTransactItems = vw.transactItems;
  }

  // ── Validate medChanges — FIX 6 ──
  const VALID_MED_ACTIONS = new Set(["started", "stopped", "modified"]);
  const medChanges = [];
  if (body?.medChanges !== undefined) {
    if (!Array.isArray(body.medChanges)) {
      throw mkErr("medChanges must be an array", "BAD_REQUEST");
    }
    for (const mc of body.medChanges) {
      if (!mc || typeof mc !== "object") {
        throw mkErr("each medChanges entry must be an object", "BAD_REQUEST");
      }
      if (typeof mc.med_id !== "string" || !mc.med_id.trim()) {
        throw mkErr(
          "each medChanges entry must have a non-empty med_id string",
          "BAD_REQUEST"
        );
      }
      if (!VALID_MED_ACTIONS.has(mc.action)) {
        throw mkErr(
          "medChanges action must be one of: started, stopped, modified",
          "BAD_REQUEST"
        );
      }
      medChanges.push({ med_id: mc.med_id, action: mc.action });
    }
  }

  // ── Build the PNOTE item ──
  // Undefined fields are stripped by DocumentClient removeUndefinedValues:true.
  const item = {
    PK,
    SK,
    entity: "PNOTE",
    pn_id:      pnId,
    patient_uid: uid,
    status,
    note_type:
      typeof body?.note_type === "string" && body.note_type.trim()
        ? body.note_type.trim().toLowerCase()
        : null,
    text: hasText ? body.text.trim() : null,
    sections: {
      subjective: body?.sections?.subjective ?? null,
      objective:  body?.sections?.objective  ?? null,
      assessment: body?.sections?.assessment ?? null,
      plan:       body?.sections?.plan       ?? null,
    },
    pad,
    pod,
    vitals_id:     vitalsId     ?? null,
    vitals_inline: vitalsInline ?? null,
    task_ids:    taskIds,
    med_changes: medChanges,
    files:       Array.isArray(body?.files)      ? body.files      : [],
    author: {
      id:   actor?.user_id ?? null,
      name: actor?.name    ?? null,
      role: actor?.role    ?? null,
    },
    department_id: body?.department_id ?? null,
    unit_id:       body?.unit_id       ?? null,
    // Conditional fields — undefined → stripped by removeUndefinedValues
    ...(autoAck
      ? { acknowledge: { by: actor.name ?? null, by_id: actor.user_id, at: nowISO } }
      : {}),
    ...(ackPendingFor
      ? {
          ack_pending_for: ackPendingFor,
          GSI2PK: `PNACK#${ackPendingFor}`,
          GSI2SK: createdAt,
        }
      : {}),
    ...(body?.addendum_to ? { addendum_to: body.addendum_to } : {}),
    edit_history: [],
    version:      1,
    created_at:   createdAt,
    updated_at:   createdAt,
  };

  // ── Assemble TransactItems ──
  const TransactItems = [];
  let draftPointerIdx = -1;

  // 1. PNOTE row
  TransactItems.push({
    Put: {
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(PK)",
    },
  });

  // 2. PNDRAFT pointer (draft only) — attribute_not_exists guard → DRAFT_EXISTS
  if (status === "draft") {
    draftPointerIdx = TransactItems.length;
    TransactItems.push({
      Put: {
        TableName: TABLE,
        Item: { PK, SK: `PNDRAFT#${authorId}`, pn_sk: SK },
        ConditionExpression: "attribute_not_exists(SK)",
      },
    });
  }

  // 3. Vitals rows (may be empty)
  for (const ti of vitalsTransactItems) {
    TransactItems.push(ti);
  }

  // 4. Change rows — only for final notes (drafts are private WIP)
  if (status === "final") {
    const changeRows = buildChangeRows({
      op: "created",
      entity: "PNOTE",
      entity_id: pnId,
      patient_uid: uid,
      scopes: {
        patient:    uid,
        department: meta?.department ?? null,   // FIX 1: use department NAME
      },
      snapshot: {
        pn_id:      pnId,
        status,
        author:     item.author,
        created_at: createdAt,
      },
      actor,
      nowISO,
    });
    for (const r of changeRows) {
      TransactItems.push({ Put: { TableName: TABLE, Item: r.Item } });
    }
  }

  // 5. Idempotency marker — FIX 5: only when clientMutationId was supplied.
  if (clientMutationId) {
    TransactItems.push({
      Put: {
        TableName: TABLE,
        Item: {
          PK,
          SK: `PNIDEMP#${clientMutationId}`,
          pn_sk: SK,
          created_at: createdAt,
        },
        ConditionExpression: "attribute_not_exists(SK)",
      },
    });
  }

  // 6. META bump — same pattern as notes.mjs
  TransactItems.push({
    Update: {
      TableName: TABLE,
      Key: { PK, SK: "META_LATEST" },
      UpdateExpression: "ADD update_counter :one SET last_updated = :now",
      ExpressionAttributeValues: { ":one": 1, ":now": nowISO },
    },
  });

  try {
    await ddb.send(new TransactWriteCommand({ TransactItems }));
  } catch (e) {
    // Detect DRAFT_EXISTS when the PNDRAFT pointer condition failed.
    if (e?.name === "TransactionCanceledException" && status === "draft") {
      const reasons = e.CancellationReasons || [];
      if (
        draftPointerIdx >= 0 &&
        reasons[draftPointerIdx]?.Code === "ConditionalCheckFailed"
      ) {
        // Fetch the existing pointer to surface the pn_sk to the caller.
        const ptr = await ddb.send(
          new GetCommand({
            TableName: TABLE,
            Key: { PK, SK: `PNDRAFT#${authorId}` },
          })
        );
        throw Object.assign(
          mkErr(
            "A draft already exists for this author. Resume or publish it first.",
            "DRAFT_EXISTS"
          ),
          { pn_sk: ptr.Item?.pn_sk }
        );
      }
    }
    throw e;
  }

  return { item };
}

/**
 * listPnotes — paginated, newest-first.
 * KeyCondition: BETWEEN PNOTE#${from} and PNOTE#${to}￿ when range params given,
 * otherwise begins_with("PNOTE#"). Post-key filter for author / status / unacked.
 * Cursor = base64(LastEvaluatedKey) — same as notes.mjs.
 */
export async function listPnotes(
  deps,
  { uid, author, from, to, status, unacked, limit = 50, cursor }
) {
  const { ddb, TABLE } = deps;
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const excl = cursor ? decodeCursor(cursor) : undefined;

  const useRange = from || to;
  const kcExpr = useRange
    ? "PK = :pk AND SK BETWEEN :lo AND :hi"
    : "PK = :pk AND begins_with(SK, :sk)";
  const kvBase = useRange
    ? {
        ":pk":  `PATIENT#${uid}`,
        ":lo":  `PNOTE#${from || ""}`,
        ":hi":  `PNOTE#${to   || "￿"}￿`,
      }
    : {
        ":pk":  `PATIENT#${uid}`,
        ":sk":  "PNOTE#",
      };

  // Build optional FilterExpression parts
  const filterParts = [];
  const filterNames = {};
  const filterValues = {};

  if (author) {
    // author is stored as a map { id, name, role }; DDB dot notation accesses id.
    // "id" is not a reserved word so no alias needed for the nested key.
    filterParts.push("author.#ai = :author");
    filterNames["#ai"] = "id";
    filterValues[":author"] = author;
  }
  if (status) {
    filterParts.push("#s = :status");
    filterNames["#s"] = "status";
    filterValues[":status"] = status;
  }
  if (unacked === "1" || unacked === true || unacked === "true") {
    filterParts.push("attribute_not_exists(acknowledge)");
  }

  const params = {
    TableName: TABLE,
    KeyConditionExpression: kcExpr,
    ExpressionAttributeValues: { ...kvBase, ...filterValues },
    ScanIndexForward: false,
    Limit: lim,
    ExclusiveStartKey: excl || undefined,  // FIX 7: never pass null
  };
  if (filterParts.length > 0) {
    params.FilterExpression = filterParts.join(" AND ");
  }
  if (Object.keys(filterNames).length > 0) {
    params.ExpressionAttributeNames = filterNames;
  }

  const q = await ddb.send(new QueryCommand(params));
  return {
    items:      q.Items || [],
    nextCursor: q.LastEvaluatedKey ? encodeCursor(q.LastEvaluatedKey) : null,
  };
}

/**
 * listAllNotes — the "everything for this patient" call (?all=1).
 * Internally exhausts pagination over PNOTE# rows (safety cap 1000) and,
 * when includeLegacy is set, merges the legacy notes.mjs NOTE# rows
 * (kind:"legacy", soft-deleted excluded) into one newest-first list.
 */
export async function listAllNotes(deps, { uid, includeLegacy = false }) {
  const { ddb, TABLE } = deps;
  const CAP = 1000;

  async function drain(skPrefix) {
    const out = [];
    let excl;
    do {
      const q = await ddb.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: { ":pk": `PATIENT#${uid}`, ":sk": skPrefix },
        ScanIndexForward: false,
        ExclusiveStartKey: excl || undefined,
      }));
      out.push(...(q.Items || []));
      excl = q.LastEvaluatedKey;
    } while (excl && out.length < CAP);
    return out.slice(0, CAP);
  }

  const pnotes = (await drain("PNOTE#")).map((it) => ({
    kind: "progress",
    ...toUiPnote(it),
  }));

  let legacy = [];
  if (includeLegacy) {
    legacy = (await drain("NOTE#"))
      .filter((it) => !it.deleted)
      .map((it) => ({
        kind: "legacy",
        noteId: it.note_id,
        category: it.category ?? null,
        content: it.content ?? null,
        files: Array.isArray(it.files) ? it.files : [],
        authorId: it.author_id ?? null,
        createdAt: it.created_at,
        updatedAt: it.updated_at,
      }));
  }

  const items = [...pnotes, ...legacy].sort((a, b) =>
    String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  return {
    items,
    count: items.length,
    counts: { progress: pnotes.length, legacy: legacy.length },
    truncated: pnotes.length >= CAP || legacy.length >= CAP,
  };
}

/**
 * getPnote — find single note by pnId. Throws NOT_FOUND if absent.
 */
export async function getPnote(deps, { uid, pnId }) {
  const item = await findPnoteItem(deps.ddb, deps.TABLE, uid, pnId);
  if (!item) throw mkErr("Progress note not found", "NOT_FOUND");
  return { item };
}

/**
 * patchPnote — text/sections edit OR draft publish.
 *
 * Text/sections edit:
 *   ConditionExpression: #v = :expV AND attribute_not_exists(acknowledge)
 *                        AND attribute_not_exists(unchart)
 *   On ConditionalCheckFailedException: inspect current item to throw
 *   LOCKED (has acknowledge or unchart) or CONFLICT (version mismatch).
 *
 * Draft publish (body.status === "final"):
 *   TransactWrite: Update note row (set #s=final, bump version, ack keys)
 *                + Delete PNDRAFT pointer
 *                + change rows
 *   ConditionExpression: #v = :expV AND attribute_not_exists(unchart)
 *   (no ack-check — a draft cannot be acked)
 */
export async function patchPnote(deps, { uid, pnId, body, actor, nowISO }) {
  const { ddb, TABLE } = deps;

  // Always fetch first — needed for SK, version, state-based error distinction.
  const current = await findPnoteItem(ddb, TABLE, uid, pnId);
  if (!current) throw mkErr("Progress note not found", "NOT_FOUND");

  const expectedVersion = body?.expectedVersion ?? current.version ?? 1;
  const nextVersion = (current.version || 1) + 1;

  // ══ Publish flow ══
  if (body?.status === "final") {
    if (current.status !== "draft") {
      throw mkErr(
        "Note is already final or in an unexpected state; only drafts can be published",
        "BAD_REQUEST"
      );
    }

    // Fetch current meta for ack logic (assigned_doctor_id may have changed).
    const meta = await loadMetaByUid(ddb, TABLE, uid);
    const autoAck =
      !!actor?.user_id &&
      !!meta?.assigned_doctor_id &&
      actor.user_id === meta.assigned_doctor_id;
    const ackPendingFor =
      !autoAck && meta?.assigned_doctor_id
        ? meta.assigned_doctor_id
        : null;

    const names = { "#v": "version", "#s": "status" };
    const values = {
      ":expV":  expectedVersion,
      ":nextV": nextVersion,
      ":final": "final",
      ":now":   nowISO,
    };
    let setExpr = "SET #v = :nextV, #s = :final, updated_at = :now";

    if (autoAck) {
      names["#ack"] = "acknowledge";
      values[":ack"] = {
        by:    actor.name ?? null,
        by_id: actor.user_id,
        at:    nowISO,
      };
      setExpr += ", #ack = :ack";
    } else if (ackPendingFor) {
      names["#apf"] = "ack_pending_for";
      values[":apf"]    = ackPendingFor;
      values[":gsi2pk"] = `PNACK#${ackPendingFor}`;
      values[":gsi2sk"] = current.created_at;
      setExpr += ", #apf = :apf, GSI2PK = :gsi2pk, GSI2SK = :gsi2sk";
    }

    const changeRows = buildChangeRows({
      op: "updated",
      entity: "PNOTE",
      entity_id: pnId,
      patient_uid: uid,
      scopes: {
        patient:    uid,
        department: meta?.department ?? null,   // FIX 1: use department NAME
      },
      snapshot: {
        pn_id:      pnId,
        status:     "final",
        author:     current.author,
        created_at: current.created_at,
      },
      actor,
      nowISO,
    });

    const pubAuthorId = current.author?.id || "unknown";
    const TransactItems = [
      {
        Update: {
          TableName: TABLE,
          Key: { PK: current.PK, SK: current.SK },
          UpdateExpression: setExpr,
          ConditionExpression:
            "#v = :expV AND attribute_not_exists(unchart)",
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
        },
      },
      {
        Delete: {
          TableName: TABLE,
          Key: { PK: current.PK, SK: `PNDRAFT#${pubAuthorId}` },
        },
      },
      ...changeRows.map((r) => ({ Put: { TableName: TABLE, Item: r.Item } })),
    ];

    try {
      await ddb.send(new TransactWriteCommand({ TransactItems }));
    } catch (e) {
      if (e?.name === "TransactionCanceledException") {
        // index 0 = the Update item; check condition failure
        const reason0 = (e.CancellationReasons || [])[0];
        if (reason0?.Code === "ConditionalCheckFailed") {
          if (current.unchart) {
            throw mkErr("Note has been retracted", "LOCKED");
          }
          throw mkErr(
            `Version conflict: expected ${expectedVersion}, current ${current.version}`,
            "CONFLICT"
          );
        }
      }
      throw e;
    }

    // Build the in-memory merged item to return (avoids an extra DDB read).
    const updatedItem = {
      ...current,
      status: "final",
      version: nextVersion,
      updated_at: nowISO,
      ...(autoAck
        ? { acknowledge: values[":ack"] }
        : ackPendingFor
          ? {
              ack_pending_for: ackPendingFor,
              GSI2PK: `PNACK#${ackPendingFor}`,
              GSI2SK: current.created_at,
            }
          : {}),
    };
    return { item: updatedItem };
  }

  // ══ Text / sections edit flow ══
  const patchText     = body?.text !== undefined;
  const patchSections = body?.sections !== undefined;
  if (!patchText && !patchSections) {
    throw mkErr(
      "nothing to update: provide text, sections, or {status: 'final'} to publish",
      "BAD_REQUEST"
    );
  }

  const names  = { "#v": "version" };
  const values = {
    ":expV":      expectedVersion,
    ":nextV":     nextVersion,
    ":now":       nowISO,
    ":entry":     [{ at: nowISO, by_id: actor?.user_id ?? null }],
    ":emptyList": [],
  };
  let setExpr =
    "SET #v = :nextV, updated_at = :now, " +
    "edit_history = list_append(if_not_exists(edit_history, :emptyList), :entry)";

  if (patchText) {
    names["#t"] = "text";
    values[":text"] = body.text;
    setExpr += ", #t = :text";
  }
  if (patchSections) {
    // Merge new keys over existing sections — preserves untouched SOAP boxes.
    names["#sec"] = "sections";
    values[":sections"] = {
      subjective: null,
      objective:  null,
      assessment: null,
      plan:       null,
      ...(current.sections || {}),
      ...body.sections,
    };
    setExpr += ", #sec = :sections";
  }

  try {
    const res = await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: current.PK, SK: current.SK },
      UpdateExpression: setExpr,
      ConditionExpression:
        "#v = :expV AND attribute_not_exists(acknowledge) AND attribute_not_exists(unchart)",
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    }));
    return { item: res.Attributes };
  } catch (e) {
    if (e?.name === "ConditionalCheckFailedException") {
      if (current.acknowledge) {
        throw mkErr(
          "Note is locked after acknowledgment; create an addendum instead",
          "LOCKED"
        );
      }
      if (current.unchart) {
        throw mkErr("Note has been retracted", "LOCKED");
      }
      throw mkErr(
        `Version conflict: expected ${expectedVersion}, current ${current.version}`,
        "CONFLICT"
      );
    }
    throw e;
  }
}

/**
 * ackPnote — acknowledge a final note.
 * Guard: attribute_not_exists(acknowledge) → CONFLICT if already acked.
 * REMOVE GSI2PK, GSI2SK, ack_pending_for atomically.
 * Emits one change row (non-transactional, per spec).
 */
export async function ackPnote(deps, { uid, pnId, actor, nowISO }) {
  const { ddb, TABLE } = deps;

  const { item: current } = await getPnote(deps, { uid, pnId });

  const ack = {
    by:    actor?.name    ?? null,
    by_id: actor?.user_id ?? null,
    at:    nowISO,
  };

  // FIX 1: load meta to get the department NAME for the change-feed scope.
  const meta = await loadMetaByUid(ddb, TABLE, uid);

  let updated;
  try {
    const res = await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: current.PK, SK: current.SK },
      UpdateExpression:
        "SET acknowledge = :ack REMOVE GSI2PK, GSI2SK, ack_pending_for",
      // FIX 3: also guard that the note is final (not a draft).
      ConditionExpression:
        "attribute_not_exists(acknowledge) AND #s = :final",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":ack": ack, ":final": "final" },
      ReturnValues: "ALL_NEW",
    }));
    updated = res.Attributes;
  } catch (e) {
    if (e?.name === "ConditionalCheckFailedException") {
      // Re-read to distinguish: draft vs already-acked.
      const cur = await findPnoteItem(ddb, TABLE, uid, pnId);
      if (cur?.status !== "final") {
        throw mkErr("cannot acknowledge a draft", "BAD_REQUEST");
      }
      throw mkErr("Note has already been acknowledged", "CONFLICT");
    }
    throw e;
  }

  // Non-transactional change row (spec §7.3 — plain PutCommand is fine here).
  const changeRows = buildChangeRows({
    op: "updated",
    entity: "PNOTE",
    entity_id: pnId,
    patient_uid: uid,
    scopes: {
      patient:    uid,
      department: meta?.department ?? null,   // FIX 1: use department NAME
    },
    snapshot: { pn_id: pnId, acknowledge: ack },
    actor,
    nowISO,
  });
  for (const r of changeRows) {
    await ddb.send(new PutCommand({ TableName: TABLE, Item: r.Item }));
  }

  return { item: updated };
}

/**
 * unchartPnote — retract a note (row preserved; rendered struck-through).
 * Guard: attribute_not_exists(unchart) → CONFLICT if already retracted.
 * REMOVE GSI2 ack-inbox keys if the note was pending ack.
 * Emits one change row (non-transactional).
 */
export async function unchartPnote(deps, { uid, pnId, actor, reason, nowISO }) {
  const { ddb, TABLE } = deps;
  if (!reason) throw mkErr("reason is required to unchart a note", "BAD_REQUEST");

  const { item: current } = await getPnote(deps, { uid, pnId });

  const unchart = {
    by:    actor?.name    ?? null,
    by_id: actor?.user_id ?? null,
    at:    nowISO,
    reason,
  };

  // FIX 1: load meta to get the department NAME for the change-feed scope.
  const meta = await loadMetaByUid(ddb, TABLE, uid);

  let updated;
  if (current.status === "draft") {
    // FIX 4: drafts — also delete the PNDRAFT pointer atomically.
    const draftAuthorId = current.author?.id || "unknown";
    const unchartItems = [
      {
        Update: {
          TableName: TABLE,
          Key: { PK: current.PK, SK: current.SK },
          UpdateExpression:
            "SET unchart = :unchart REMOVE GSI2PK, GSI2SK, ack_pending_for",
          ConditionExpression: "attribute_not_exists(unchart)",
          ExpressionAttributeValues: { ":unchart": unchart },
        },
      },
      {
        Delete: {
          TableName: TABLE,
          Key: { PK: current.PK, SK: `PNDRAFT#${draftAuthorId}` },
        },
      },
    ];
    try {
      await ddb.send(new TransactWriteCommand({ TransactItems: unchartItems }));
      updated = { ...current, unchart };
      delete updated.GSI2PK;
      delete updated.GSI2SK;
      delete updated.ack_pending_for;
    } catch (e) {
      if (e?.name === "TransactionCanceledException") {
        const reason0 = (e.CancellationReasons || [])[0];
        if (reason0?.Code === "ConditionalCheckFailed") {
          throw mkErr("Note has already been retracted", "CONFLICT");
        }
      }
      throw e;
    }
  } else {
    // FIX 4: finals — plain UpdateCommand (unchanged path).
    try {
      const res = await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: current.PK, SK: current.SK },
        UpdateExpression:
          "SET unchart = :unchart REMOVE GSI2PK, GSI2SK, ack_pending_for",
        ConditionExpression: "attribute_not_exists(unchart)",
        ExpressionAttributeValues: { ":unchart": unchart },
        ReturnValues: "ALL_NEW",
      }));
      updated = res.Attributes;
    } catch (e) {
      if (e?.name === "ConditionalCheckFailedException") {
        throw mkErr("Note has already been retracted", "CONFLICT");
      }
      throw e;
    }
  }

  const changeRows = buildChangeRows({
    op: "updated",
    entity: "PNOTE",
    entity_id: pnId,
    patient_uid: uid,
    scopes: {
      patient:    uid,
      department: meta?.department ?? null,   // FIX 1: use department NAME
    },
    snapshot: { pn_id: pnId, unchart: { at: nowISO, reason } },
    actor,
    nowISO,
  });
  for (const r of changeRows) {
    await ddb.send(new PutCommand({ TableName: TABLE, Item: r.Item }));
  }

  return { item: updated };
}

/**
 * getAckQueue — attending's cross-patient pending-ack inbox.
 * Queries GSI2PK-GSI2SK-index for PNACK#<doctorId>, newest-first.
 */
export async function getAckQueue(deps, { doctorId, limit = 50 }) {
  const { ddb, TABLE, INDEX } = deps;
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);

  const q = await ddb.send(new QueryCommand({
    TableName: TABLE,
    IndexName: INDEX.TASK_GSI,
    KeyConditionExpression: "GSI2PK = :pk",
    ExpressionAttributeValues: { ":pk": `PNACK#${doctorId}` },
    ScanIndexForward: false,
    Limit: lim,
  }));
  return { items: q.Items || [] };
}

/**
 * getCarePlan — L3 synthesized view (read-only).
 * Four reads run in parallel:
 *   1. Latest final, un-retracted PNOTE (plan_text / plan_source)
 *   2. Open tasks (not done/cancelled, not soft-deleted)
 *   3. Active meds (end absent or null, not soft-deleted)
 *   4. Latest vitals (via getLatestVitals)
 */
export async function getCarePlan(deps, { uid }) {
  const { ddb, TABLE } = deps;
  const PK = `PATIENT#${uid}`;

  const [pnoteRes, tasksRes, medsRes, latestVitals] = await Promise.all([
    // 1. Latest final, non-retracted PNOTE
    ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      FilterExpression: "#s = :final AND attribute_not_exists(unchart)",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: {
        ":pk":    PK,
        ":sk":    "PNOTE#",
        ":final": "final",
      },
      ScanIndexForward: false,
      Limit: 10,
    })),

    // 2. Open tasks — exclude done/cancelled and soft-deleted items
    ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      FilterExpression:
        "#s <> :done AND #s <> :cancelled AND attribute_not_exists(deleted)",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: {
        ":pk":        PK,
        ":sk":        "TASK#",
        ":done":      "done",
        ":cancelled": "cancelled",
      },
      Limit: 200,
    })),

    // 3. Active meds — end absent or null (DocumentClient marshals null → DDB NULL)
    ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      FilterExpression:
        "(attribute_not_exists(#e) OR #e = :null) AND attribute_not_exists(deleted)",
      ExpressionAttributeNames: { "#e": "end" },
      ExpressionAttributeValues: {
        ":pk":   PK,
        ":sk":   "MED#",
        ":null": null,
      },
      Limit: 100,
    })),

    // 4. Latest vitals
    getLatestVitals(deps, { uid }),
  ]);

  const latestNote = (pnoteRes.Items || [])[0] || null;
  const planText =
    latestNote?.sections?.plan ?? latestNote?.text ?? null;
  const planSource = latestNote
    ? {
        pn_id:  latestNote.pn_id,
        author: latestNote.author,
        at:     latestNote.created_at,
      }
    : null;

  return {
    plan_text:     planText,
    plan_source:   planSource,
    open_tasks:    tasksRes.Items  || [],
    active_meds:   medsRes.Items   || [],
    latest_vitals: latestVitals,
    pending_labs:  null,               // L3 Lab OS adapter — graceful absence in v1
  };
}

// ---------------------------------------------------------------------------
// §7.5 UI mapper — camelCase; never leaks PK / SK / GSI keys
// ---------------------------------------------------------------------------

export function toUiPnote(it = {}) {
  return {
    pnId:         it.pn_id        ?? null,
    patientId:    it.patient_uid  ?? null,
    status:       it.status       ?? null,
    noteType:     it.note_type    ?? null,
    text:         it.text         ?? null,
    sections:     it.sections     ?? null,
    pad:          it.pad          ?? null,
    pod:          it.pod          ?? null,
    vitalsId:     it.vitals_id    ?? null,
    vitalsInline: it.vitals_inline ?? null,
    taskIds:      Array.isArray(it.task_ids)    ? it.task_ids    : [],
    medChanges:   Array.isArray(it.med_changes) ? it.med_changes : [],
    files:        Array.isArray(it.files)       ? it.files       : [],
    author:       it.author        ?? null,
    departmentId: it.department_id ?? null,
    unitId:       it.unit_id       ?? null,
    acknowledge:  it.acknowledge   ?? null,
    unchart:      it.unchart       ?? null,
    addendumTo:   it.addendum_to   ?? null,
    editHistory:  Array.isArray(it.edit_history) ? it.edit_history : [],
    version:      it.version       ?? null,
    createdAt:    it.created_at    ?? null,
    updatedAt:    it.updated_at    ?? null,
  };
}
