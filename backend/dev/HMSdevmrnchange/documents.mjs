// documents.mjs — Patient documents record (UUID PK) with per-category S3 key lists
// Node 22 ESM

import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { resolveAnyPatientId } from "./ids.mjs";

// CloudFront CDN URL generation
const CF_DOMAIN = process.env.CF_DOMAIN || process.env.CDN_DOMAIN || "";
function makeCdnUrl(s3Key) {
  if (!CF_DOMAIN) return null;
  const domain = CF_DOMAIN.startsWith('http') ? CF_DOMAIN : `https://${CF_DOMAIN}`;
  return `${domain}/${s3Key}`;
}

const DOC_SK = "DOCS#PROFILE";

// categories -> Dynamo attributes
const CATS = {
  staging_area:   "staging_area",
  preop_pics:     "preop_pics",
  lab_reports:    "lab_reports",
  radiology:      "radiology",
  intraop_pics:   "intraop_pics",
  ot_notes:       "ot_notes",
  postop_pics:    "postop_pics",
  discharge_pics: "discharge_pics",
};

const MOVE_CATS = {
  ...CATS,
  staging_area: "staging_area",
};

const ALL_MOVE_ATTRS = Object.values(MOVE_CATS);

// Helper to add CDN URLs to document entries
function enrichWithCdnUrls(entries) {
  return (entries || []).map(entry => ({
    ...entry,
    cdnUrl: makeCdnUrl(entry.key)
  }));
}

const toUiDocs = (it = {}) => ({
  uid: it.patient_uid,
  preopPics:     enrichWithCdnUrls(it.preop_pics),
  labReports:    enrichWithCdnUrls(it.lab_reports),
  radiology:     enrichWithCdnUrls(it.radiology),
  intraopPics:   enrichWithCdnUrls(it.intraop_pics),
  otNotes:       enrichWithCdnUrls(it.ot_notes),
  postopPics:    enrichWithCdnUrls(it.postop_pics),
  dischargePics: enrichWithCdnUrls(it.discharge_pics),
  stagingArea:   enrichWithCdnUrls(it.staging_area),
  createdAt: it.created_at,
  updatedAt: it.updated_at,
});

function safeUid(u) { return String(u || "").replace(/[^a-zA-Z0-9._-]+/g, "_"); }

function normalizeMoveCategory(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower === "stagingarea" || lower === "staging_area" || lower === "staging-area") {
    return "staging_area";
  }
  return MOVE_CATS[lower] || null;
}

function cloneDocLists(docs = {}) {
  return {
    preop_pics: Array.isArray(docs.preop_pics) ? [...docs.preop_pics] : [],
    lab_reports: Array.isArray(docs.lab_reports) ? [...docs.lab_reports] : [],
    radiology: Array.isArray(docs.radiology) ? [...docs.radiology] : [],
    intraop_pics: Array.isArray(docs.intraop_pics) ? [...docs.intraop_pics] : [],
    ot_notes: Array.isArray(docs.ot_notes) ? [...docs.ot_notes] : [],
    postop_pics: Array.isArray(docs.postop_pics) ? [...docs.postop_pics] : [],
    discharge_pics: Array.isArray(docs.discharge_pics) ? [...docs.discharge_pics] : [],
    staging_area: Array.isArray(docs.staging_area) ? [...docs.staging_area] : [],
  };
}

function findDocEntry(lists, key, attrs = ALL_MOVE_ATTRS) {
  const matches = [];
  for (const attr of attrs) {
    const list = Array.isArray(lists[attr]) ? lists[attr] : [];
    const entry = list.find((it) => it?.key === key);
    if (entry) matches.push({ attr, entry });
  }
  return matches;
}

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
    staging_area: [],

    created_at: now,
    updated_at: now,
  };
}

export function mountDocumentRoutes(router, ctx) {
  const { ddb, TABLE, utils } = ctx;
  const { nowISO, resp, parseBody } = utils;

  // GET /patients/:id/documents
  router.add("GET", /^\/?patients\/([^/]+)\/documents\/?$/, async ({ match }) => {
    const rawId = decodeURIComponent(match[1]);
    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });

    const uid = resolved.uid;
    const item = await getDocsItem(ddb, TABLE, uid);
    if (!item) return resp(200, toUiDocs(emptyDocsItem(uid, nowISO())));
    return resp(200, toUiDocs(item));
  });

  // POST /patients/:id/documents/init  (idempotent)
  router.add("POST", /^\/?patients\/([^/]+)\/documents\/init\/?$/, async ({ match }) => {
    const rawId = decodeURIComponent(match[1]);
    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });

    const uid = resolved.uid;
    const now = nowISO();
    const exist = await getDocsItem(ddb, TABLE, uid);
    if (exist) return resp(200, { message: "exists", documents: toUiDocs(exist) });

    const item = emptyDocsItem(uid, now);
    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(PK)",
    }));
    return resp(201, { message: "created", documents: toUiDocs(item) });
  });

  /* POST /patients/:id/documents/attach
     Body: {
       category: "staging_area"|"preop_pics"|"lab_reports"|"radiology"|"intraop_pics"|"ot_notes"|"postop_pics"|"discharge_pics",
       key: "patients/{UID}/optimized/docs/<docType>/...ext",
       uploadedBy?: string,
       caption?: string,
       mimeType?: string,
       size?: number,
       stamp?: { label?:string, stampedAt?:string, stampedBy?:string }, // optional, for lab/radiology
       replaceOldest?: boolean   // if category=preop_pics and list already has 3
     }
  */
  router.add("POST", /^\/?patients\/([^/]+)\/documents\/attach\/?$/, async ({ match, event }) => {
    const rawId = decodeURIComponent(match[1]);
    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });

    const uid = resolved.uid;
    const body = parseBody(event) || {};
    const now = nowISO();

    const catAttr = CATS[body.category];
    if (!catAttr) return resp(400, { error: "invalid category" });
    if (!body.key || typeof body.key !== "string") return resp(400, { error: "key is required" });

    const expectedPrefix = `patients/${safeUid(uid)}/`;
    if (!body.key.startsWith(expectedPrefix)) {
      return resp(400, { error: "key does not belong to this patient" });
    }

    // fetch docs (create if missing)
    let docs = await getDocsItem(ddb, TABLE, uid);
    if (!docs) {
      docs = emptyDocsItem(uid, now);
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
      mrn: resolved.meta.active_reg_mrn || null,     // provenance at time of attach
      scheme: resolved.meta.active_scheme || null,   // provenance at time of attach
    };

    const list = Array.isArray(docs[catAttr]) ? [...docs[catAttr]] : [];
    // No limit for preop_pics anymore. Ignoring replaceOldest for backward compatibility.
    list.push(entry);

    // optimistic concurrency on updated_at (prevents lost updates if two users attach at once)
    try {
      const updated = await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `PATIENT#${uid}`, SK: DOC_SK },
        ConditionExpression: "updated_at = :prev OR attribute_not_exists(updated_at)",
        UpdateExpression: `SET #k = :v, updated_at = :now`,
        ExpressionAttributeNames: { "#k": catAttr },
        ExpressionAttributeValues: { ":v": list, ":now": now, ":prev": previousUpdatedAt },
        ReturnValues: "ALL_NEW",
      }));
      return resp(200, { message: "attached", documents: toUiDocs(updated.Attributes) });
    } catch (e) {
      if (e?.name === "ConditionalCheckFailedException") {
        return resp(409, { error: "document record changed; retry attach" });
      }
      throw e;
    }
  });

  // POST /patients/:id/documents/move
  // Body: { key, fromCategory?: string, sourceCategory?: string, toCategory?: string, targetCategory?: string }
  router.add("POST", /^\/?patients\/([^/]+)\/documents\/move\/?$/, async ({ match, event }) => {
    const rawId = decodeURIComponent(match[1]);
    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });

    const uid = resolved.uid;
    const body = parseBody(event) || {};
    const key = body.key;
    if (!key || typeof key !== "string") return resp(400, { error: "key is required" });

    const sourceInput = body.fromCategory ?? body.sourceCategory;
    const targetInput = body.toCategory ?? body.targetCategory;
    const hasSourceInput = sourceInput !== undefined && sourceInput !== null && String(sourceInput).trim() !== "";
    const hasTargetInput = targetInput !== undefined && targetInput !== null && String(targetInput).trim() !== "";
    const sourceCategory = hasSourceInput ? normalizeMoveCategory(sourceInput) : null;
    const targetCategory = hasTargetInput ? normalizeMoveCategory(targetInput) : null;

    if (hasSourceInput && !sourceCategory) return resp(400, { error: "invalid source category" });
    if (!targetCategory) return resp(400, { error: "invalid target category" });

    const docs = await getDocsItem(ddb, TABLE, uid);
    if (!docs) return resp(404, { error: "documents record not found" });

    const lists = cloneDocLists(docs);
    let sourceAttr = sourceCategory;
    let entry = null;

    if (sourceAttr) {
      entry = (lists[sourceAttr] || []).find((it) => it?.key === key) || null;
      if (!entry) return resp(404, { error: "key not found in source category" });
    } else {
      const matches = findDocEntry(lists, key);
      if (matches.length === 0) return resp(404, { error: "key not found in documents" });
      if (matches.length > 1) {
        return resp(409, { error: "key exists in multiple categories; provide sourceCategory" });
      }
      sourceAttr = matches[0].attr;
      entry = matches[0].entry;
    }

    if (sourceAttr === targetCategory) {
      return resp(200, {
        message: "no-op",
        fromCategory: sourceAttr,
        toCategory: targetCategory,
        documents: toUiDocs(docs),
      });
    }

    const next = cloneDocLists(docs);
    for (const attr of ALL_MOVE_ATTRS) {
      next[attr] = (next[attr] || []).filter((it) => it?.key !== key);
    }
    next[targetCategory].push(entry);

    const updatedItem = {
      ...docs,
      ...next,
      updated_at: nowISO(),
    };

    try {
      const previousUpdatedAt = docs.updated_at || "";
      await ddb.send(new PutCommand({
        TableName: TABLE,
        Item: updatedItem,
        ConditionExpression: "updated_at = :prev OR attribute_not_exists(updated_at)",
        ExpressionAttributeValues: { ":prev": previousUpdatedAt },
      }));
      return resp(200, {
        message: "moved",
        fromCategory: sourceAttr,
        toCategory: targetCategory,
        documents: toUiDocs(updatedItem),
      });
    } catch (e) {
      if (e?.name === "ConditionalCheckFailedException") {
        return resp(409, { error: "document record changed; retry move" });
      }
      throw e;
    }
  });

  // POST /patients/:id/documents/detach   Body: { category, key }
  router.add("POST", /^\/?patients\/([^/]+)\/documents\/detach\/?$/, async ({ match, event }) => {
    const rawId = decodeURIComponent(match[1]);
    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });

    const uid = resolved.uid;
    const body = parseBody(event) || {};
    const catAttr = CATS[body.category];
    if (!catAttr) return resp(400, { error: "invalid category" });
    if (!body.key) return resp(400, { error: "key is required" });

    const docs = await getDocsItem(ddb, TABLE, uid);
    if (!docs) return resp(404, { error: "documents record not found" });

    const prev = Array.isArray(docs[catAttr]) ? docs[catAttr] : [];
    const next = prev.filter((it) => it.key !== body.key);
    if (next.length === prev.length) {
      return resp(404, { error: "key not found in category" });
    }

    try {
      const updated = await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `PATIENT#${uid}`, SK: DOC_SK },
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

  // PATCH /patients/:id/documents/gov-share   body: { share: boolean }
  router.add("PATCH", /^\/?patients\/([^/]+)\/documents\/gov-share\/?$/, async ({ match, event }) => {
    const rawId = decodeURIComponent(match[1]);
    const body = parseBody(event) || {};
    const share = !!body.share;

    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });

    const uid = resolved.uid;
    const now = nowISO();

    // Ensure DOCS row exists, then set gov_share there
    let docs = await getDocsItem(ddb, TABLE, uid);
    if (!docs) {
      docs = emptyDocsItem(uid, now);
      await ddb.send(new PutCommand({
        TableName: TABLE,
        Item: docs,
        ConditionExpression: "attribute_not_exists(PK)",
      }));
    }

    // Update DOCS#PROFILE.gov_share
    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `PATIENT#${uid}`, SK: "DOCS#PROFILE" },
      UpdateExpression: "SET gov_share = :b, updated_at = :now",
      ExpressionAttributeValues: { ":b": share, ":now": now },
    }));

    // Mirror to META so dept list can return it
    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `PATIENT#${uid}`, SK: "META_LATEST" },
      UpdateExpression: "SET gov_share = :b, last_updated = :now, updated_at = :now",
      ExpressionAttributeValues: { ":b": share, ":now": now },
    }));

    return resp(200, { message: "gov-share-updated", shared: share });
  });
}
