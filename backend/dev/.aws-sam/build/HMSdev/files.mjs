// files.mjs — S3 file handling for patient images (presigned PUT/GET + listing)
// Node 22 ESM

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "node:crypto";

/* ------------------------------ ENV & CLIENT ------------------------------ */

const REGION = process.env.AWS_REGION || process.env.S3_REGION || "us-east-1";
const BUCKET =
  process.env.FILES_BUCKET ||
  process.env.DOCS_BUCKET ||
  process.env.S3_BUCKET ||
  "";
const PRESIGN_EXPIRES_SEC = Number(
  process.env.PRESIGN_EXPIRES_SEC || process.env.S3_PRESIGN_EXPIRES || 900
); // 15min default

const USE_KMS = process.env.S3_USE_KMS === "true";
const KMS_KEY_ID = process.env.S3_KMS_KEY_ID || undefined;

const s3 = new S3Client({ region: REGION });

/* --------------------------------- CONSTS -------------------------------- */

const ALLOWED_MIME = new Set([
  "image/avif",
  "image/webp",
  "image/jpeg",
  "image/png",
  // add more if needed (e.g. "application/pdf")
]);

const EXT_BY_MIME = {
  "image/avif": "avif",
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
  // "application/pdf": "pdf"
};

const DOC_TYPES = new Set([
  "preop",
  "lab",
  "radiology",
  "intraop",
  "otnotes",
  "postop",
  "discharge",
]);

/* -------------------------------- HELPERS -------------------------------- */

const nowISO = () => new Date().toISOString();

const safeMrn = (m) => String(m || "").trim().replace(/[^a-zA-Z0-9._-]+/g, "_");

function slug(s = "", max = 32) {
  const cleaned = String(s)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned.slice(0, max) || null;
}

function pickExt({ filename, mimeType }) {
  if (mimeType && EXT_BY_MIME[mimeType]) return EXT_BY_MIME[mimeType];
  const dot = (filename || "").split(".").pop();
  if (dot && /^[a-z0-9]{2,5}$/i.test(dot)) return dot.toLowerCase();
  return "bin";
}

function makeVariantSuffix({ quality = 80, maxW = 1600 } = {}) {
  return `q${quality}-${maxW}w`;
}

function newUuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Build key:
 * patients/{mrn}/{target}/...  where target one of: originals | optimized | thumb
 * For optimized:
 *   - kind=doc:   optimized/docs/{docType}/{ts}-{uuid}-{label?}-{variant}.{ext}
 *   - kind=note:  optimized/notes/{refId}/{ts}-{uuid}-{label?}-{variant}.{ext}
 *   - kind=med:   optimized/meds/{refId}/{...}
 *   - kind=task:  optimized/tasks/{refId}/{...}
 */
function makeKey({
  mrn,
  target = "optimized",
  kind = "doc",
  docType = "misc",
  refId = null,
  ext = "jpg",
  variant = makeVariantSuffix(),
  label = null,
}) {
  const base = `patients/${safeMrn(mrn)}/`;
  const id = newUuid();
  const ts = Date.now();
  const lbl = label ? slug(label) : null;
  const baseName = lbl
    ? `${ts}-${id}-${lbl}-${variant}`
    : `${ts}-${id}-${variant}`;
  const fixedExt = ext === "jpeg" ? "jpg" : ext;

  if (target === "originals") return `${base}originals/${baseName}.${fixedExt}`;
  if (target === "thumb") return `${base}thumb/${baseName}-thumb.${fixedExt}`;

  // optimized:
  let seg = "misc";
  if (kind === "doc") seg = `docs/${encodeURIComponent(docType || "misc")}`;
  else if (kind === "note")
    seg = `notes/${encodeURIComponent(refId || "unassigned")}`;
  else if (kind === "med")
    seg = `meds/${encodeURIComponent(refId || "unassigned")}`;
  else if (kind === "task")
    seg = `tasks/${encodeURIComponent(refId || "unassigned")}`;

  return `${base}optimized/${seg}/${baseName}.${fixedExt}`;
}

/** Parse S3 key back into bits (best-effort) */
function parseKey(key) {
  const m = key.match(/^patients\/([^/]+)\/(originals|optimized|thumb)\/(.+)$/);
  if (!m) return { mrn: null, target: null, kind: null, docType: null, refId: null, filename: key };
  const [, mrn, target, rest] = m;
  let kind = null, docType = null, refId = null, filename = rest;

  if (target === "originals") kind = "original";
  else if (target === "thumb") kind = "thumb";
  else if (target === "optimized") {
    const parts = rest.split("/");
    const type = parts[0];
    if (type === "docs") {
      kind = "doc";
      docType = parts[1] || null;
      filename = parts.slice(2).join("/");
    } else if (type === "notes") {
      kind = "note";
      refId = parts[1] || null;
      filename = parts.slice(2).join("/");
    } else if (type === "meds") {
      kind = "med";
      refId = parts[1] || null;
      filename = parts.slice(2).join("/");
    } else if (type === "tasks") {
      kind = "task";
      refId = parts[1] || null;
      filename = parts.slice(2).join("/");
    } else {
      kind = "misc";
      filename = parts.slice(1).join("/");
    }
  }
  return { mrn, target, kind, docType, refId, filename };
}

async function signPut({ Bucket, Key, ContentType, Metadata }) {
  // Don't include Metadata in the signature - it will be sent as headers
  const cmd = new PutObjectCommand({
    Bucket,
    Key,
    ContentType,
    CacheControl: "no-cache",
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn: PRESIGN_EXPIRES_SEC });

  // Return metadata as separate headers (not signed)
  const headers = {
    "Content-Type": ContentType,
    ...(Metadata
      ? Object.fromEntries(
          Object.entries(Metadata).map(([k, v]) => [
            `x-amz-meta-${k}`,
            String(v),
          ])
        )
      : {}),
  };

  return {
    url,
    method: "PUT",
    key: Key,
    expiresIn: PRESIGN_EXPIRES_SEC,
    headers,
  };
}

async function signGet({ Bucket, Key }) {
  const cmd = new GetObjectCommand({ Bucket, Key });
  const url = await getSignedUrl(s3, cmd, { expiresIn: PRESIGN_EXPIRES_SEC });
  return { url, method: "GET", key: Key, expiresIn: PRESIGN_EXPIRES_SEC };
}

/* --------------------------------- ROUTES -------------------------------- */

export function mountFileRoutes(router, ctx) {
  const { ddb, TABLE, utils } = ctx;
  const { resp, parseBody } = utils;

  /* ----------------------------------------------------------------------
     POST /patients/:mrn/files/presign-upload
     body: {
       filename: string,
       mimeType: string,
       target?: "optimized"|"originals"|"thumb" (default "optimized")
       kind?:   "doc"|"note"|"med"|"task"      (default "doc")
       docType?: "preop"|"lab"|... (required when kind=doc)
       refId?:  string (required for kind=note|med|task)
       quality?: number (default 80)
       maxW?:   number (default 1600)
       needsOptimization?: boolean
       label?: string (short readable suffix, no PHI)
     }
  ---------------------------------------------------------------------- */
  router.add(
    "POST",
    /^\/?patients\/([^/]+)\/files\/presign-upload\/?$/,
    async ({ match, event }) => {
      try {
        if (!BUCKET) return resp(500, { error: "FILES_BUCKET not configured" });

        const mrn = decodeURIComponent(match[1]);

        // verify patient exists (cheap guard)
        try {
          const p = await ddb.send(
            new GetCommand({
              TableName: TABLE,
              Key: { PK: `PATIENT#${mrn}`, SK: "META_LATEST" },
            })
          );
          if (!p.Item) return resp(404, { error: "Patient not found" });
        } catch {
          // ignore if you want to presign even before patient creation
        }

        const body = parseBody(event) || {};
        const {
          filename,
          mimeType,
          target = "optimized",
          kind = "doc",
          docType = "misc",
          refId = null,
          quality = 80,
          maxW = 1600,
          needsOptimization = false,
          label = null,
        } = body;

        if (!filename || !mimeType)
          return resp(400, { error: "filename and mimeType are required" });
        if (!ALLOWED_MIME.has(mimeType))
          return resp(400, { error: `mimeType ${mimeType} not allowed` });

        if (kind === "doc") {
          if (!DOC_TYPES.has(docType))
            return resp(400, {
              error: `invalid docType; expected one of ${Array.from(
                DOC_TYPES
              ).join(", ")}`,
            });
        }
        if (["note", "med", "task"].includes(kind) && !refId) {
          return resp(400, { error: `refId is required for kind=${kind}` });
        }

        const ext = pickExt({ filename, mimeType });
        const variant = makeVariantSuffix({ quality, maxW });
        const Key = makeKey({
          mrn,
          target,
          kind,
          docType,
          refId,
          ext,
          variant,
          label,
        });

        const Metadata = {
          mrn: safeMrn(mrn),
          kind,
          doctype: kind === "doc" ? String(docType) : "",
          refid: refId || "",
          originalname: String(filename).slice(-200),
          needs_optimization: needsOptimization ? "true" : "false",
          variant,
          target,
          ...(label ? { label: slug(label) } : {}),
        };

        const signed = await signPut({
          Bucket: BUCKET,
          Key,
          ContentType: mimeType,
          Metadata,
        });

        const hints = {
          optimizedKey: Key,
          originalKey: makeKey({
            mrn,
            target: "originals",
            kind,
            docType,
            refId,
            ext,
            label,
          }),
          thumbKey: makeKey({
            mrn,
            target: "thumb",
            kind,
            docType,
            refId,
            ext: "jpg",
            label,
          }),
        };

        return resp(200, {
          key: Key,
          uploadUrl: signed.url,
          method: "PUT",
          headers: signed.headers,
          contentType: mimeType,
          expiresIn: signed.expiresIn,
          hints,
        });
      } catch (err) {
        console.error("presign-upload error", err);
        return resp(500, { error: "failed to presign upload" });
      }
    }
  );

  /* ----------------------------------------------------------------------
     GET /patients/:mrn/files
       ?scope=optimized|originals|thumb   (default optimized)
       ?kind=doc|note|med|task           (default doc)
       ?docType=preop|lab|...            (required for kind=doc)
       ?refId=...                        (required for note|med|task)
       ?limit=50
       ?cursor=<token>
       ?presign=1
  ---------------------------------------------------------------------- */
  router.add(
    "GET",
    /^\/?patients\/([^/]+)\/files\/?$/,
    async ({ match, qs }) => {
      try {
        if (!BUCKET) return resp(500, { error: "FILES_BUCKET not configured" });

        const mrn = decodeURIComponent(match[1]);
        const scope = (qs.scope || "optimized").toLowerCase();
        const kind = (qs.kind || "doc").toLowerCase();
        const docType = qs.docType || null;
        const refId = qs.refId || null;
        const limit = Math.min(Number(qs.limit || 50), 1000);
        const presign = qs.presign === "1" || qs.presign === "true";
        const cursor = qs.cursor ? decodeURIComponent(qs.cursor) : undefined;

        let prefix = `patients/${safeMrn(mrn)}/${scope}/`;

        if (scope === "optimized") {
          if (kind === "doc") {
            if (!docType || !DOC_TYPES.has(docType))
              return resp(400, {
                error:
                  "valid docType required when scope=optimized and kind=doc",
              });
            prefix += `docs/${encodeURIComponent(docType)}/`;
          } else if (kind === "note") {
            if (!refId)
              return resp(400, { error: "refId required for kind=note" });
            prefix += `notes/${encodeURIComponent(refId)}/`;
          } else if (kind === "med") {
            if (!refId)
              return resp(400, { error: "refId required for kind=med" });
            prefix += `meds/${encodeURIComponent(refId)}/`;
          } else if (kind === "task") {
            if (!refId)
              return resp(400, { error: "refId required for kind=task" });
            prefix += `tasks/${encodeURIComponent(refId)}/`;
          } else {
            return resp(400, { error: `invalid kind ${kind}` });
          }
        } else if (!["originals", "thumb"].includes(scope)) {
          return resp(400, { error: `invalid scope ${scope}` });
        }

        const out = await s3.send(
          new ListObjectsV2Command({
            Bucket: BUCKET,
            Prefix: prefix,
            MaxKeys: limit,
            ContinuationToken: cursor,
          })
        );

        const items = (out.Contents || []).map((obj) => {
          const info = parseKey(obj.Key);
          return {
            key: obj.Key,
            size: obj.Size ?? null,
            etag: obj.ETag || null,
            lastModified: obj.LastModified
              ? new Date(obj.LastModified).toISOString()
              : null,
            ...info,
          };
        });

        if (presign) {
          for (const it of items) {
            try {
              const signed = await signGet({ Bucket: BUCKET, Key: it.key });
              it.url = signed.url;
              it.expiresIn = signed.expiresIn;
            } catch (e) {
              // ignore individual failures
              console.warn("presign per-item failed", it.key, e?.name || e);
            }
          }
        }

        const nextCursor = out.IsTruncated ? out.NextContinuationToken : null;
        return resp(200, { prefix, items, nextCursor });
      } catch (err) {
        console.error("list files error", err);
        return resp(500, { error: "failed to list files" });
      }
    }
  );

  /* ----------------------------------------------------------------------
     POST /patients/:mrn/files/presign-download
     body: { key: "patients/{MRN}/..." }
  ---------------------------------------------------------------------- */
  router.add(
    "POST",
    /^\/?patients\/([^/]+)\/files\/presign-download\/?$/,
    async ({ match, event }) => {
      try {
        if (!BUCKET) return resp(500, { error: "FILES_BUCKET not configured" });

        const mrn = decodeURIComponent(match[1]);
        const { key } = parseBody(event) || {};
        if (!key || typeof key !== "string")
          return resp(400, { error: "key is required" });

        const mrnPrefix = `patients/${safeMrn(mrn)}/`;
        if (!key.startsWith(mrnPrefix))
          return resp(403, { error: "key does not belong to this patient" });

        // Ensure object exists (fail fast)
        await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));

        const signed = await signGet({ Bucket: BUCKET, Key: key });
        return resp(200, signed);
      } catch (err) {
        if (err?.$metadata?.httpStatusCode === 404)
          return resp(404, { error: "object not found" });
        console.error("presign-download error", err);
        return resp(500, { error: "failed to presign download" });
      }
    }
  );
}
