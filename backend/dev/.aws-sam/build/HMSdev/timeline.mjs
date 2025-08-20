// timeline.mjs — READ-ONLY patient timeline + helper to seed first row (Node 22 ESM)

import { QueryCommand } from "@aws-sdk/lib-dynamodb";

/* Map DB -> UI */
const toUiTimeline = (it = {}) => ({
  timelineId: it.timeline_id,
  patientId: it.patient_id,
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

  // GET /patients/{mrn}/timeline  — newest last
  router.add("GET", /^\/?patients\/([^/]+)\/timeline\/?$/, async ({ match }) => {
    const mrn = decodeURIComponent(match[1]);

    const q = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": `PATIENT#${mrn}`, ":sk": "TL#" },
      ScanIndexForward: true,
    }));

    return resp(200, (q.Items || []).map(toUiTimeline));
  });
}

/** Helper for patient CREATE: seed the first timeline row */
export function buildInitialTimelineItem(mrn, firstState, now, actorId = null) {
  const sk = `TL#${now}#${firstState}`;
  return {
    sk,
    item: {
      PK: `PATIENT#${mrn}`,
      SK: sk,
      timeline_id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      patient_id: mrn,
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
