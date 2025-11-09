// documents.mjs — Patient documents record (UUID PK) with per-category S3 key lists
// Node 22 ESM

import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { resolveAnyPatientId } from "./ids.mjs";

const DOC_SK = "DOCS#PROFILE";

// categories -> Dynamo attributes
const CATS = {
  preop_pics:     "preop_pics",
  lab_reports:    "lab_reports",
  radiology:      "radiology",
  intraop_pics:   "intraop_pics",
  ot_notes:       "ot_notes",
  postop_pics:    "postop_pics",
  discharge_pics: "discharge_pics",
};

const toUiDocs = (it = {}) => ({
  patientId: it.patient_uid,
  preopPics:     it.preop_pics     || [],
  labReports:    it.lab_reports    || [],
  radiology:     it.radiology      || [],
  intraopPics:   it.intraop_pics   || [],
  otNotes:       it.ot_notes       || [],
  postopPics:    it.postop_pics    || [],
  dischargePics: it.discharge_pics || [],
  createdAt: it.created_at,
  updatedAt: it.updated_at,
});

function safeUid(u) { return String(u || "").replace(/[^a-zA-Z0-9._-]+/g, "_"); }

async function getDocsItem(ddb, TABLE, uid) {
  const r = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `PATIENT#${uid}`, SK: DOC_SK },
  }));
  return r.Item || null;
}

function emptyDocsItem(uid, now) {
  return {
    PK: `PATIENT#${uid}`,
    SK: DOC_SK,
    doc_id: "DOCS",
    patient_uid: uid,

    preop_pics: [],
    lab_reports: [],
    radiology: [],
    intraop_pics: [],
    ot_notes: [],
    postop_pics: [],
    discharge_pics: [],

    created_at: now,
    updated_at: now,
  };
}

export function mountChecklistRoutes(router, ctx) {
  // Placeholder for checklist routes - currently using document functionality
}
