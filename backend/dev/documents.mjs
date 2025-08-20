// documents.mjs — Patient documents record with per-category lists of S3 keys (no GPS field)

import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

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
  mrn: it.patient_id,
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

function safeMrn(m) { return String(m || "").replace(/[^a-zA-Z0-9._-]+/g, "_"); }

async function getDocsItem(ddb, TABLE, mrn) {
  const r = await ddb.send(new GetCommand({
    TableName: TABLE,
    Key: { PK: `PATIENT#${mrn}`, SK: DOC_SK },
  }));
  return r.Item || null;
}

function emptyDocsItem(mrn, now) {
  return {
    PK: `PATIENT#${mrn}`,
    SK: DOC_SK,
    doc_id: "DOCS",
    patient_id: mrn,

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

export function mountDocumentRoutes(router, ctx) {
  const { ddb, TABLE, utils } = ctx;
  const { nowISO, resp, parseBody } = utils;

  // GET /patients/:mrn/documents  -> use to color blue/grey in UI
  router.add("GET", /^\/?patients\/([^/]+)\/documents\/?$/, async ({ match }) => {
    const mrn = decodeURIComponent(match[1]);
    const item = await getDocsItem(ddb, TABLE, mrn);
    if (!item) return resp(200, toUiDocs(emptyDocsItem(mrn, nowISO())));
    return resp(200, toUiDocs(item));
  });

  // POST /patients/:mrn/documents/init  (idempotent)
  router.add("POST", /^\/?patients\/([^/]+)\/documents\/init\/?$/, async ({ match }) => {
    const mrn = decodeURIComponent(match[1]);
    const now = nowISO();
    const exist = await getDocsItem(ddb, TABLE, mrn);
    if (exist) return resp(200, { message: "exists", documents: toUiDocs(exist) });

    const item = emptyDocsItem(mrn, now);
    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(PK)",
    }));
    return resp(201, { message: "created", documents: toUiDocs(item) });
  });

  /* POST /patients/:mrn/documents/attach
     Body: {
       category: "preop_pics"|"lab_reports"|"radiology"|"intraop_pics"|"ot_notes"|"postop_pics"|"discharge_pics",
       key: "patients/{MRN}/optimized/docs/<docType>/...ext",
       uploadedBy?: string,
       caption?: string,
       mimeType?: string,
       size?: number,
       stamp?: { label?:string, stampedAt?:string, stampedBy?:string }, // optional, for lab/radiology
       replaceOldest?: boolean   // if category=preop_pics and list already has 3
     }
  */
  router.add("POST", /^\/?patients\/([^/]+)\/documents\/attach\/?$/, async ({ match, event }) => {
    const mrn = decodeURIComponent(match[1]);
    const body = parseBody(event) || {};
    const now = nowISO();

    const catAttr = CATS[body.category];
    if (!catAttr) return resp(400, { error: "invalid category" });
    if (!body.key || typeof body.key !== "string") return resp(400, { error: "key is required" });

    const expectedPrefix = `patients/${safeMrn(mrn)}/`;
    if (!body.key.startsWith(expectedPrefix)) {
      return resp(400, { error: "key does not belong to this patient" });
    }

    // fetch docs (create if missing)
    let docs = await getDocsItem(ddb, TABLE, mrn);
    if (!docs) {
      docs = emptyDocsItem(mrn, now);
      await ddb.send(new PutCommand({
        TableName: TABLE,
        Item: docs,
        ConditionExpression: "attribute_not_exists(PK)",
      }));
    }
    const previousUpdatedAt = docs.updated_at || now;

    const entry = {
      key: body.key,
      uploadedAt: now,
      uploadedBy: body.uploadedBy || null,
      caption: body.caption || null,
      mimeType: body.mimeType || null,
      size: body.size ?? null,
      stamp: body.stamp || null,
    };

    const list = Array.isArray(docs[catAttr]) ? [...docs[catAttr]] : [];
    if (body.category === "preop_pics") {
      if (list.length >= 3 && !body.replaceOldest) {
        return resp(409, { error: "preop_pics already has 3 items; pass replaceOldest=true to replace the oldest" });
      }
      if (list.length >= 3 && body.replaceOldest) {
        list.sort((a, b) => (a.uploadedAt || "").localeCompare(b.uploadedAt || ""));
        list.shift();
      }
    }
    list.push(entry);

    // optimistic concurrency on updated_at (prevents lost updates if two doctors attach at once)
    try {
      const updated = await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `PATIENT#${mrn}`, SK: DOC_SK },
        ConditionExpression: "updated_at = :prev OR attribute_not_exists(updated_at)",
        UpdateExpression: `SET #k = :v, updated_at = :now`,
        ExpressionAttributeNames: { "#k": catAttr },
        ExpressionAttributeValues: { ":v": list, ":now": now, ":prev": previousUpdatedAt },
        ReturnValues: "ALL_NEW",
      }));
      return resp(200, { message: "attached", documents: toUiDocs(updated.Attributes) });
    } catch (e) {
      if (e?.name === "ConditionalCheckFailedException") {
        // client can retry: refetch -> reapply -> update
        return resp(409, { error: "document record changed; retry attach" });
      }
      throw e;
    }
  });

  // POST /patients/:mrn/documents/detach   Body: { category, key }
  router.add("POST", /^\/?patients\/([^/]+)\/documents\/detach\/?$/, async ({ match, event }) => {
    const mrn = decodeURIComponent(match[1]);
    const body = parseBody(event) || {};
    const catAttr = CATS[body.category];
    if (!catAttr) return resp(400, { error: "invalid category" });
    if (!body.key) return resp(400, { error: "key is required" });

    const docs = await getDocsItem(ddb, TABLE, mrn);
    if (!docs) return resp(404, { error: "documents record not found" });

    const prev = Array.isArray(docs[catAttr]) ? docs[catAttr] : [];
    const next = prev.filter((it) => it.key !== body.key);
    if (next.length === prev.length) {
      return resp(404, { error: "key not found in category" });
    }

    try {
      const updated = await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `PATIENT#${mrn}`, SK: DOC_SK },
        ConditionExpression: "updated_at = :prev OR attribute_not_exists(updated_at)",
        UpdateExpression: `SET #k = :v, updated_at = :now`,
        ExpressionAttributeNames: { "#k": catAttr },
        ExpressionAttributeValues: { ":v": next, ":now": nowISO(), ":prev": docs.updated_at || "" },
        ReturnValues: "ALL_NEW",
      }));
      return resp(200, { message: "detached", documents: toUiDocs(updated.Attributes) });
    } catch (e) {
      if (e?.name === "ConditionalCheckFailedException") {
        return resp(409, { error: "document record changed; retry detach" });
      }
      throw e;
    }
  });
}
