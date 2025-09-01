// s3_events.mjs — Lambda: triggered by S3:ObjectCreated to update DynamoDB Documents record
// Node.js 22.x ESM

import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE = process.env.TABLE_NAME || "HMS";
const BUCKET = process.env.FILES_BUCKET || "";
const CDN_DOMAIN = process.env.CDN_DOMAIN || "";

const s3 = new S3Client({ region: REGION });
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const DOC_SK = "DOCS#PROFILE";

// category mapping based on docType in key
const DOC_TYPE_TO_CAT = {
  preop: "preop_pics",
  lab: "lab_reports",
  radiology: "radiology",
  intraop: "intraop_pics",
  otnotes: "ot_notes",
  postop: "postop_pics",
  discharge: "discharge_pics",
};

function nowISO() {
  return new Date().toISOString();
}

function parseKey(key) {
  // Expected: patients/{uid}/optimized/docs/{docType}/filename
  const m = key.match(/^patients\/([^/]+)\/optimized\/docs\/([^/]+)\/(.+)$/);
  if (!m) return null;
  return { uid: m[1], docType: m[2], filename: m[3] };
}

async function getDocsItem(uid) {
  const r = await ddb.send(
    new GetCommand({ TableName: TABLE, Key: { PK: `PATIENT#${uid}`, SK: DOC_SK } })
  );
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

export const handler = async (event = {}) => {
  const records = Array.isArray(event?.Records) ? event.Records : [];
  for (const rec of records) {
    try {
      const key = decodeURIComponent(rec?.s3?.object?.key || "");
      const parsed = parseKey(key);
      if (!parsed) continue;

      const { uid, docType } = parsed;
      const cat = DOC_TYPE_TO_CAT[docType];
      if (!cat) continue;

      // HeadObject to pull metadata
      let meta = {};
      try {
        const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
        meta = head?.Metadata || {};
      } catch (e) {
        console.warn("headobject failed", key, e?.name || e);
      }

      const now = nowISO();
      let docs = await getDocsItem(uid);
      if (!docs) {
        docs = emptyDocsItem(uid, now);
        await ddb.send(new PutCommand({ TableName: TABLE, Item: docs }));
      }

      const cdnUrl = CDN_DOMAIN ? `https://${CDN_DOMAIN}/${key}` : null;

      const entry = {
        key,
        cdnUrl,
        uploadedAt: now,
        uploadedBy: meta?.uploadedby || null,
        caption: meta?.label || null,
        mimeType: meta?.["content-type"] || null,
        size: rec?.s3?.object?.size || null,
        mrn: meta?.mrn || null,
        scheme: meta?.scheme || null,
      };

      const list = Array.isArray(docs[cat]) ? [...docs[cat]] : [];
      if (!list.find((e) => e.key === entry.key)) list.push(entry);

      await ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { PK: `PATIENT#${uid}`, SK: DOC_SK },
          UpdateExpression: "SET #cat = :list, updated_at = :now",
          ExpressionAttributeNames: { "#cat": cat },
          ExpressionAttributeValues: { ":list": list, ":now": now },
        })
      );
    } catch (e) {
      console.error("s3_events error", e);
      // don't crash entire batch, just log
    }
  }

  return { ok: true, processed: records.length };
};
