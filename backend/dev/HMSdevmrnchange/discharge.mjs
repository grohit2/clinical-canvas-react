// discharge.mjs — Versioned discharge summaries (Node 22 ESM)

import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { resolveAnyPatientId } from "./ids.mjs";

const STATUS = new Set(["draft", "published", "archived"]);

const toUiDS = (it = {}) => ({
  versionId: it.ds_id,
  patientId: it.patient_uid,
  status: it.status || "draft",
  format: it.format || "mdx",
  mdx: it.mdx || "",
  sections: it.sections || {},
  summary: it.summary || null,
  mrn: it.mrn ?? null,
  scheme: it.scheme ?? null,
  authorId: it.author_id ?? null,
  authorName: it.author_name ?? null,
  commitMessage: it.commit_message ?? null,
  createdAt: it.created_at,
  updatedAt: it.updated_at,
  deleted: !!it.deleted,
});

const newId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const encodeCursor = (key) => Buffer.from(JSON.stringify(key)).toString("base64");
const decodeCursor = (str) => {
  try { return JSON.parse(Buffer.from(str, "base64").toString("utf8")); } catch { return null; }
};

function sanitizeSections(raw) {
  if (!raw || typeof raw !== "object") return {};
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value == null) continue;
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) out[key] = trimmed;
      continue;
    }
    if (typeof value === "object") {
      const nested = {};
      for (const [childKey, childValue] of Object.entries(value)) {
        if (childValue == null) continue;
        const normalized = typeof childValue === "string" ? childValue : String(childValue);
        const trimmed = normalized.trim();
        if (trimmed) nested[childKey] = trimmed;
      }
      if (Object.keys(nested).length) {
        out[key] = nested;
      }
      continue;
    }
    const fallback = String(value).trim();
    if (fallback) out[key] = fallback;
  }
  return out;
}

function sanitizeSummary(raw) {
  if (!raw || typeof raw !== "object") return null;
  const out = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value == null) continue;
    out[key] = typeof value === "string" ? value : String(value);
  }
  return Object.keys(out).length ? out : null;
}

function normalizeContent(body = {}) {
  const mdx = typeof body.mdx === "string" ? body.mdx : "";
  const sections = sanitizeSections(body.sections);
  const summary = sanitizeSummary(body.summary);
  const status = STATUS.has(body.status) ? body.status : "draft";
  const commit = typeof body.commitMessage === "string" && body.commitMessage.trim()
    ? body.commitMessage
    : typeof body.commit === "string" && body.commit.trim() ? body.commit : null;
  const authorId = typeof body.authorId === "string" && body.authorId.trim()
    ? body.authorId.trim()
    : typeof body.actorId === "string" && body.actorId.trim() ? body.actorId.trim() : "anon";
  const authorName = typeof body.authorName === "string" && body.authorName.trim()
    ? body.authorName.trim()
    : null;
  return { mdx, sections, summary, status, commit, authorId, authorName };
}

const sectionsHaveContent = (sections) => {
  if (!sections) return false;
  if (typeof sections === "string") return sections.trim().length > 0;
  if (typeof sections !== "object") return String(sections).trim().length > 0;
  return Object.values(sections).some((value) => {
    if (!value) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (typeof value === "object") return sectionsHaveContent(value);
    return String(value).trim().length > 0;
  });
};

async function findVersionById(ddb, TABLE, uid, versionId) {
  const q = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
    ExpressionAttributeValues: { ":pk": `PATIENT#${uid}`, ":sk": "DS#" },
    ScanIndexForward: false,
    Limit: 200,
  }));
  const hit = (q.Items || []).find((i) => i.ds_id === versionId && i.SK !== "DS#LATEST");
  return hit || null;
}

export function mountDischargeRoutes(router, ctx) {
  const { ddb, TABLE, utils } = ctx;
  const { nowISO, resp, parseBody } = utils;

  // GET /patients/:id/discharge
  router.add("GET", /^\/?patients\/([^/]+)\/discharge\/?$/, async ({ match }) => {
    const rawId = decodeURIComponent(match[1]);
    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });

    const ptr = await ddb.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `PATIENT#${resolved.uid}`, SK: "DS#LATEST" },
    }));

    if (!ptr.Item) return resp(200, { latest: null, versions: 0 });
    return resp(200, { latest: toUiDS(ptr.Item) });
  });

  // GET /patients/:id/discharge/versions
  router.add("GET", /^\/?patients\/([^/]+)\/discharge\/versions\/?$/, async ({ match, qs }) => {
    const rawId = decodeURIComponent(match[1]);
    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });

    const limit = Math.min(Number(qs.limit || 50), 200);
    const includeDeleted = qs.includeDeleted === "1";
    const cursor = qs.cursor ? decodeCursor(qs.cursor) : null;

    const q = await ddb.send(new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: { ":pk": `PATIENT#${resolved.uid}`, ":sk": "DS#" },
      ScanIndexForward: false,
      Limit: limit,
      ExclusiveStartKey: cursor || undefined,
    }));

    let items = q.Items || [];
    items = items.filter((it) => it.SK !== "DS#LATEST");
    if (!includeDeleted) items = items.filter((it) => !it.deleted);

    return resp(200, {
      items: items.map(toUiDS),
      nextCursor: q.LastEvaluatedKey ? encodeCursor(q.LastEvaluatedKey) : null,
    });
  });

  // GET /patients/:id/discharge/versions/:versionId
  router.add("GET", /^\/?patients\/([^/]+)\/discharge\/versions\/([^/]+)\/?$/, async ({ match }) => {
    const rawId = decodeURIComponent(match[1]);
    const versionId = decodeURIComponent(match[2]);

    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });

    const item = await findVersionById(ddb, TABLE, resolved.uid, versionId);
    if (!item) return resp(404, { error: "Version not found" });

    return resp(200, toUiDS(item));
  });

  // POST /patients/:id/discharge
  router.add("POST", /^\/?patients\/([^/]+)\/discharge\/?$/, async ({ match, event }) => {
    const rawId = decodeURIComponent(match[1]);
    const body = parseBody(event) || {};

    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });

    const now = nowISO();
    const uid = resolved.uid;
    const meta = resolved.meta;
    const { mdx, sections, summary, status, commit, authorId, authorName } = normalizeContent(body);

    const hasSections = sectionsHaveContent(sections);
    if (!mdx && !hasSections) return resp(400, { error: "mdx or sections required" });

    const dsId = newId();
    const skVersion = `DS#${now}#${dsId}`;

    const versionItem = {
      PK: `PATIENT#${uid}`,
      SK: skVersion,
      ds_id: dsId,
      patient_uid: uid,
      status,
      format: "mdx",
      mdx,
      sections: hasSections ? sections : {},
      summary,
      mrn: meta.active_reg_mrn || null,
      scheme: meta.active_scheme || null,
      author_id: authorId || null,
      author_name: authorName || null,
      commit_message: commit,
      created_at: now,
      updated_at: now,
      deleted: false,
    };

    const latestItem = {
      PK: `PATIENT#${uid}`,
      SK: "DS#LATEST",
      patient_uid: uid,
      ds_current_sk: skVersion,
      ds_current_id: dsId,
      status,
      title: "Discharge Summary",
      mdx,
      sections: hasSections ? sections : {},
      summary,
      mrn: versionItem.mrn,
      scheme: versionItem.scheme,
      author_id: authorId || null,
      author_name: authorName || null,
      created_at: versionItem.created_at,
      updated_at: now,
    };

    await ddb.send(new TransactWriteCommand({
      TransactItems: [
        { Put: { TableName: TABLE, Item: versionItem } },
        { Put: { TableName: TABLE, Item: latestItem } },
        {
          Update: {
            TableName: TABLE,
            Key: { PK: `PATIENT#${uid}`, SK: "META_LATEST" },
            UpdateExpression: "ADD update_counter :one SET last_updated = :now",
            ExpressionAttributeValues: { ":one": 1, ":now": now },
          },
        },
      ],
    }));

    return resp(201, {
      message: "created",
      latest: toUiDS(latestItem),
      version: toUiDS(versionItem),
    });
  });

  // PATCH /patients/:id/discharge/versions/:versionId
  router.add("PATCH", /^\/?patients\/([^/]+)\/discharge\/versions\/([^/]+)\/?$/, async ({ match, event }) => {
    const rawId = decodeURIComponent(match[1]);
    const versionId = decodeURIComponent(match[2]);
    const body = parseBody(event) || {};

    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });

    const item = await findVersionById(ddb, TABLE, resolved.uid, versionId);
    if (!item) return resp(404, { error: "Version not found" });

    const now = nowISO();
    const names = {};
    const values = { ":now": now };
    let setExpr = "SET updated_at = :now";

    if (body.status && STATUS.has(body.status)) {
      names["#status"] = "status";
      values[":status"] = body.status;
      setExpr += ", #status = :status";
    }
    if (body.commitMessage) {
      names["#commit"] = "commit_message";
      values[":commit"] = body.commitMessage;
      setExpr += ", #commit = :commit";
    }

    if (setExpr === "SET updated_at = :now") {
      return resp(400, { error: "nothing to update" });
    }

    const upd = await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: item.PK, SK: item.SK },
      UpdateExpression: setExpr,
      ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    }));

    const ptr = await ddb.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: item.PK, SK: "DS#LATEST" },
    }));

    if (ptr.Item && ptr.Item.ds_current_sk === item.SK) {
      const attrs = upd.Attributes || {};
      await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: item.PK, SK: "DS#LATEST" },
        UpdateExpression: "SET #status = :status, updated_at = :now",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":status": attrs.status, ":now": now },
      }));
    }

    return resp(200, { message: "updated", version: toUiDS(upd.Attributes) });
  });

  // DELETE /patients/:id/discharge/versions/:versionId
  router.add("DELETE", /^\/?patients\/([^/]+)\/discharge\/versions\/([^/]+)\/?$/, async ({ match }) => {
    const rawId = decodeURIComponent(match[1]);
    const versionId = decodeURIComponent(match[2]);

    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });

    const item = await findVersionById(ddb, TABLE, resolved.uid, versionId);
    if (!item) return resp(404, { error: "Version not found" });

    const now = nowISO();
    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: item.PK, SK: item.SK },
      UpdateExpression: "SET deleted = :true, updated_at = :now",
      ExpressionAttributeValues: { ":true": true, ":now": now },
    }));

    const ptr = await ddb.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: item.PK, SK: "DS#LATEST" },
    }));

    if (ptr.Item && ptr.Item.ds_current_sk === item.SK) {
      const q = await ddb.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: { ":pk": item.PK, ":sk": "DS#" },
        ScanIndexForward: false,
        Limit: 200,
      }));

      const next = (q.Items || []).find(
        (candidate) => candidate.SK !== "DS#LATEST" && candidate.SK !== item.SK && !candidate.deleted,
      );

      if (next) {
        const pointer = {
          PK: item.PK,
          SK: "DS#LATEST",
          patient_uid: next.patient_uid,
          ds_current_sk: next.SK,
          ds_current_id: next.ds_id,
          status: next.status || "draft",
          title: "Discharge Summary",
          mdx: next.mdx || "",
          sections: sectionsHaveContent(next.sections) ? next.sections : {},
          summary: next.summary || null,
          mrn: next.mrn ?? null,
          scheme: next.scheme ?? null,
          author_id: next.author_id ?? null,
          author_name: next.author_name ?? null,
          created_at: next.created_at,
          updated_at: now,
        };

        await ddb.send(new PutCommand({
          TableName: TABLE,
          Item: pointer,
        }));
      } else {
        await ddb.send(new DeleteCommand({
          TableName: TABLE,
          Key: { PK: item.PK, SK: "DS#LATEST" },
        }));
      }
    }

    return resp(200, { message: "deleted" });
  });
}
