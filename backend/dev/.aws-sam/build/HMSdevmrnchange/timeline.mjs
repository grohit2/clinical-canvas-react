// timeline.mjs — READ-ONLY patient timeline (UUID-only) + helper (Node 22 ESM)

import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { resolveAnyPatientId } from "./ids.mjs";

/* Map DB -> UI */
const toUiTimeline = (it = {}) => ({
  timelineId: it.timeline_id,
  patientId: it.patient_uid,
  mrn: it.mrn ?? null,         // provenance only
  scheme: it.scheme ?? null,   // provenance only
  state: it.state,
  dateIn: it.date_in,
  dateOut: it.date_out || null,
  // DONE lists (UI will render these)
  checklistIn: Array.isArray(it.checklist_in_done) ? it.checklist_in_done : [],
  checklistOut: Array.isArray(it.checklist_out_done) ? it.checklist_out_done : [],
  // For completeness (what was required at that step)
  requiredIn: Array.isArray(it.required_in) ? it.required_in : [],
  requiredOut: Array.isArray(it.required_out) ? it.required_out : [],
  actorId: it.actor_id || null,
  notes: it.notes || null,
  createdAt: it.created_at,
  updatedAt: it.updated_at,
});

export function mountTimelineRoutes(router, ctx) {
  const { ddb, TABLE, utils } = ctx;
  const { resp } = utils;

  // GET /patients/{id}/timeline  — newest last (ScanIndexForward=true)
  //    ?desc=1 -> newest first (ScanIndexForward=false)
  //    ?limit=200
  router.add("GET", /^\/?patients\/([^/]+)\/timeline\/?$/, async ({ match, qs }) => {
    const rawId = decodeURIComponent(match[1]);

    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });

    const uid = resolved.uid;
    const desc = qs?.desc === "1" || qs?.desc === "true";
    const limit = Math.min(Number(qs?.limit || 500), 1000);

    const q = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": `PATIENT#${uid}`, ":sk": "TL#" },
      ScanIndexForward: !desc,
      Limit: limit,
    }));

    return resp(200, (q.Items || []).map(toUiTimeline));
  });
}

/** Helper to seed the first timeline row for an episode (UUID keys; MRN/scheme attrs only) */
export function buildInitialTimelineItem({ patient_uid, mrn, scheme, firstState, now, actorId = null }) {
  const sk = `TL#${now}#${firstState}`;
  return {
    sk,
    item: {
      PK: `PATIENT#${patient_uid}`,
      SK: sk,
      timeline_id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      patient_uid,
      mrn: mrn ?? null,        // provenance only
      scheme: scheme ?? null,  // provenance only
      state: firstState,
      date_in: now,
      date_out: null,
      required_in: [],
      required_out: [],
      checklist_in_done: [],
      checklist_out_done: [],
      actor_id: actorId,
      notes: null,
      created_at: now,
      updated_at: now,
    }
  };
}
