// changes/changes_emit.mjs — Build CHANGE rows for any entity (Node 22 ESM)
//
// Each writer calls buildChangeRows(...) and splices the returned items
// into its existing TransactWrite. The same logical event fans out to
// every scope the entity touches (patient + assignee + doctor + dept).
//
// Snapshots are capped to keep the row inside the 400 KB DDB item limit
// (well under): default cap 1 KB. Larger payloads (discharge summaries)
// pass `snapshot_oversize: true` so the client knows to fetch the full
// body with a follow-up GET.

import {
  changesPK, changesSK, cursorOf, newEventId,
} from "./changes_store.mjs";

const SNAPSHOT_BYTE_CAP = 1024;

function trimSnapshot(snapshot) {
  if (!snapshot) return { snapshot: null, snapshot_oversize: false };
  const json = JSON.stringify(snapshot);
  if (json.length <= SNAPSHOT_BYTE_CAP) {
    return { snapshot, snapshot_oversize: false };
  }
  // Over cap — keep only the keys most callers render: id + a label.
  const keep = {};
  for (const k of ["id", "entity_id", "title", "name", "status", "type",
                   "priority", "due_at", "recorded_at", "version"]) {
    if (snapshot[k] !== undefined) keep[k] = snapshot[k];
  }
  return { snapshot: keep, snapshot_oversize: true };
}

/**
 * Build CHANGE rows for one logical event.
 *
 * @param {object} args
 * @param {"created"|"updated"|"deleted"} args.op
 * @param {"TASK"|"VITALS"|"PATIENT_META"|"NOTE"|"MED"|"DOCUMENT"|"DISCHARGE"} args.entity
 * @param {string} args.entity_id
 * @param {string} args.patient_uid
 * @param {object} args.scopes — { patient?: uid, assignee?: id, doctor?: id, department?: name }
 * @param {object} [args.snapshot] — small inline payload (≤ 1 KB)
 * @param {object} [args.actor] — { user_id, name, role }
 * @param {string} args.nowISO
 * @returns {Array<{kind:"put", Item: object}>}
 */
export function buildChangeRows({
  op, entity, entity_id, patient_uid, scopes = {}, snapshot = null,
  actor = null, nowISO,
}) {
  const eventId = newEventId();
  const recordedAt = nowISO;
  const cursor = cursorOf(recordedAt, eventId);
  const SK = changesSK(cursor);

  const { snapshot: trimmed, snapshot_oversize } = trimSnapshot(snapshot);

  const base = {
    entity: "CHANGE",
    event_id: eventId,
    cursor,
    recorded_at: recordedAt,
    op,
    entity_kind: entity,
    entity_id,
    patient_uid: patient_uid || null,
    actor_id: actor?.user_id || null,
    actor_name: actor?.name || null,
    snapshot: trimmed,
    snapshot_oversize,
  };

  const rows = [];
  if (scopes.patient) rows.push({ PK: changesPK("PATIENT", scopes.patient), SK, ...base });
  if (scopes.assignee) rows.push({ PK: changesPK("ASSIGNEE", scopes.assignee), SK, ...base });
  if (scopes.doctor) rows.push({ PK: changesPK("DOCTOR", scopes.doctor), SK, ...base });
  if (scopes.department) rows.push({ PK: changesPK("DEPARTMENT", scopes.department), SK, ...base });

  return rows.map((Item) => ({ kind: "put", Item }));
}
