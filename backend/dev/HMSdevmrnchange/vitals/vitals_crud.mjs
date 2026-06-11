// vitals/vitals_crud.mjs — Business logic for vitals readings (Node 22 ESM)
//
// Vitals are immutable, time-stamped readings. A reading is a thin row;
// trends are reconstructed by querying the newest N readings for a patient.
//
// Linking to tasks: a reading may carry `source_task_id` so the Register/
// timeline can correlate a vitals reading with the task that produced it
// (typically a type:"vitals" task marked done by the same actor).

import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import {
  vitalsPK, vitalsSK, newVitalsId,
  queryRecentVitals, queryLatestVitals,
} from "./vitals_store.mjs";
import { buildChangeRows } from "../changes/changes_emit.mjs";

const NUM = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const STR = (v) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
};

// Public reading shape (also stored on the item).
const VITAL_FIELDS = [
  "bp_systolic", "bp_diastolic", "hr", "spo2",
  "temp_c", "rr", "grbs", "pain", "urine_output_ml",
];

function normalize(body = {}) {
  const out = {};
  for (const f of VITAL_FIELDS) out[f] = NUM(body[f]);
  out.notes = STR(body.notes);
  return out;
}

function hasAnyReading(v) {
  return VITAL_FIELDS.some((f) => v[f] !== null && v[f] !== undefined);
}

export async function recordVitals(deps, { uid, body, actor, nowISO }) {
  const norm = normalize(body || {});
  if (!hasAnyReading(norm)) {
    throw Object.assign(new Error("vitals payload must include at least one reading"),
      { code: "BAD_REQUEST" });
  }
  const recordedAt = STR(body?.recorded_at) || nowISO;
  const vitalsId = newVitalsId();

  const item = {
    PK: vitalsPK(uid),
    SK: vitalsSK(recordedAt, vitalsId),
    entity: "VITALS",
    vitals_id: vitalsId,
    patient_uid: uid,
    recorded_at: recordedAt,
    recorded_by_id: actor?.user_id || null,
    recorded_by_name: actor?.name || null,
    source_task_id: STR(body?.source_task_id),
    ...norm,
    created_at: nowISO,
  };

  // Fan out: vitals are patient-scoped only (no assignee / doctor).
  // Snapshot keeps the values inline so the client cache renders without
  // a follow-up GET.
  const changeRows = buildChangeRows({
    op: "created",
    entity: "VITALS",
    entity_id: vitalsId,
    patient_uid: uid,
    scopes: { patient: uid },
    snapshot: {
      vitals_id: vitalsId,
      recorded_at: recordedAt,
      source_task_id: item.source_task_id,
      ...norm,
    },
    actor, nowISO,
  });

  const TransactItems = [
    { Put: { TableName: deps.TABLE, Item: item, ConditionExpression: "attribute_not_exists(PK)" } },
    ...changeRows.map((r) => ({ Put: { TableName: deps.TABLE, Item: r.Item } })),
  ];
  await deps.ddb.send(new TransactWriteCommand({ TransactItems }));
  return item;
}

export async function listVitals(deps, { uid, limit = 20 }) {
  const items = await queryRecentVitals(deps.ddb, deps.TABLE, uid, {
    limit: Math.min(Math.max(Number(limit) || 20, 1), 200),
  });
  return { items };
}

export async function getLatestVitals(deps, { uid }) {
  const item = await queryLatestVitals(deps.ddb, deps.TABLE, uid);
  return item;
}
