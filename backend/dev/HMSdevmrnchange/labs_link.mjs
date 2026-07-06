// labs_link.mjs — HMS ↔ Lab OS integration layer (Node 22 ESM)
//
// Routes:
//   POST /patients/{id}/labs/order  — orchestrator: LabOS order + HMS task
//   POST /labs/events               — webhook ingest from Lab OS
//
// Env vars (all have fallbacks):
//   LABS_URL          — Lab OS function URL
//   LABS_API_KEY_HMS  — optional x-api-key for Lab OS calls
//   LABS_WEBHOOK_KEY  — shared secret validated on ingest (header x-labs-webhook-key)
//
// Design spec: docs/plans/labs-hms-task-linkage.md

import { S3Client, CopyObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { resolveAnyPatientId } from "./ids.mjs";
import { createTask, patchTask } from "./tasks/task_crud.mjs";
import { buildTaskUpdate } from "./tasks/task_events.mjs";
import { buildSyncRows, cursorOf } from "./tasks/task_sync.mjs";
import { buildTaskTimelineRow } from "./tasks/task_events.mjs";
import { transactWriteAll, getTask } from "./tasks/task_store.mjs";
import { toTypedTask } from "./tasks/task_mapper.mjs";

const LABS_URL = () =>
  process.env.LABS_URL ||
  "https://5in7bgikswcuu7rzhi2x37dmta0buhtz.lambda-url.ap-south-1.on.aws";

const LABS_API_KEY_HMS = () => process.env.LABS_API_KEY_HMS || null;
const LABS_WEBHOOK_KEY = () => process.env.LABS_WEBHOOK_KEY || "dev-labs-webhook";

const HMS_BUCKET = process.env.FILES_BUCKET || process.env.DOCS_BUCKET || "";
const LABS_BUCKET = process.env.LABS_FILES_BUCKET || "labs-os-files-hyd-dev-058264275581";
const REGION = process.env.AWS_REGION || "ap-south-1";
const s3 = new S3Client({ region: REGION });

// ── helpers ──────────────────────────────────────────────────────────────────

function labsHeaders() {
  const h = { "Content-Type": "application/json" };
  const key = LABS_API_KEY_HMS();
  if (key) h["x-api-key"] = key;
  return h;
}

async function labsFetch(path, opts = {}) {
  const url = `${LABS_URL()}${path}`;
  const r = await fetch(url, { ...opts, headers: { ...labsHeaders(), ...(opts.headers || {}) } });
  let body;
  try { body = await r.json(); } catch { body = {}; }
  return { ok: r.ok, status: r.status, body };
}

/** Ensure a Lab OS patient exists for this HMS uid; create if missing. */
async function ensureLabPatient(uid, meta) {
  // Search by external_refs.hms_uid (stored as phone-fallback via external_refs field)
  // Lab OS search endpoint supports ?phone= for GSI2; for HMS we use a name+age match
  // or store external_refs. For simplicity, search by name and filter on external_refs.hms_uid.
  const searchRes = await labsFetch(`/labs/patients?q=${encodeURIComponent(uid)}`);
  if (searchRes.ok) {
    const existing = (searchRes.body.items || []).find(
      (p) => p.external_refs?.hms_uid === uid
    );
    if (existing) return existing;
  }

  // Create
  const createRes = await labsFetch("/labs/patients", {
    method: "POST",
    body: JSON.stringify({
      name: meta.name || meta.patient_name || "Unknown",
      age: meta.age ?? null,
      sex: meta.sex || null,
      external_refs: { hms_uid: uid },
    }),
  });
  if (!createRes.ok) throw Object.assign(
    new Error(`Lab OS patient create failed: ${createRes.status}`),
    { code: "LABS_ERROR", statusCode: 502 }
  );
  return createRes.body;
}

/** Inline category mapping from catalog category string */
function labCategoryToDocCategory(catalogCategory) {
  const imaging = ["imaging", "radiology", "xray", "ct", "mri", "usg", "echo"];
  if (imaging.some((k) => (catalogCategory || "").toLowerCase().includes(k))) return "radiology";
  return "lab_reports";
}

/** Attach a document entry to DOCS#PROFILE directly (used in webhook ingest). */
async function attachDocEntry({ ddb, TABLE, uid, category, entry, nowISO }) {
  const DOC_SK = "DOCS#PROFILE";
  const CATS = {
    preop_pics: "preop_pics", lab_reports: "lab_reports", radiology: "radiology",
    intraop_pics: "intraop_pics", ot_notes: "ot_notes", postop_pics: "postop_pics",
    discharge_pics: "discharge_pics",
  };
  const catAttr = CATS[category];
  if (!catAttr) return;

  // Fetch or create DOCS item
  let docs = (await ddb.send(new GetCommand({
    TableName: TABLE, Key: { PK: `PATIENT#${uid}`, SK: DOC_SK },
  }))).Item;

  if (!docs) {
    const now = nowISO();
    docs = {
      PK: `PATIENT#${uid}`, SK: DOC_SK, doc_id: "DOCS", patient_uid: uid,
      preop_pics: [], lab_reports: [], radiology: [], intraop_pics: [],
      ot_notes: [], postop_pics: [], discharge_pics: [],
      created_at: now, updated_at: now,
    };
    try {
      const { PutCommand } = await import("@aws-sdk/lib-dynamodb");
      await ddb.send(new PutCommand({ TableName: TABLE, Item: docs, ConditionExpression: "attribute_not_exists(PK)" }));
    } catch (e) {
      if (e.name !== "ConditionalCheckFailedException") throw e;
      docs = (await ddb.send(new GetCommand({ TableName: TABLE, Key: { PK: `PATIENT#${uid}`, SK: DOC_SK } }))).Item;
    }
  }

  const list = Array.isArray(docs[catAttr]) ? [...docs[catAttr]] : [];
  // Idempotent: skip if key already present
  if (list.find((e) => e.key === entry.key)) return;
  list.push(entry);

  const now = nowISO();
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt === 1) {
      docs = (await ddb.send(new GetCommand({ TableName: TABLE, Key: { PK: `PATIENT#${uid}`, SK: DOC_SK } }))).Item;
      if (!docs) return;
    }
    try {
      await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `PATIENT#${uid}`, SK: DOC_SK },
        ConditionExpression: "updated_at = :prev OR attribute_not_exists(updated_at)",
        UpdateExpression: "SET #cat = :list, updated_at = :now",
        ExpressionAttributeNames: { "#cat": catAttr },
        ExpressionAttributeValues: { ":list": list, ":now": now, ":prev": docs.updated_at || "" },
      }));
      break;
    } catch (e) {
      if (e?.name === "ConditionalCheckFailedException") continue;
      throw e;
    }
  }
}

// ── route mount ──────────────────────────────────────────────────────────────

export function mountLabsLinkRoutes(router, ctx) {
  const { ddb, TABLE, utils } = ctx;
  const { nowISO, resp, parseBody } = utils;
  const deps = { ddb, TABLE };

  const actorOf = (event) => {
    const h = event?.headers || {};
    return {
      user_id: h["x-user-id"] || h["X-User-Id"] || null,
      name: h["x-user-name"] || h["X-User-Name"] || null,
      role: h["x-user-role"] || h["X-User-Role"] || null,
    };
  };

  /* ────────────────────────────────────────────────────────────────────────
   POST /patients/:id/labs/order
   Body: { tests:[codes], priority?, department?, assigneeId?, clientMutationId }
   Flow: resolve patient → ensure Lab OS patient → create Lab OS order →
         create HMS task → patch Lab OS order external_refs with hms_task_id
  ──────────────────────────────────────────────────────────────────────── */
  router.add("POST", /^\/?patients\/([^/]+)\/labs\/order\/?$/, async ({ match, event }) => {
    const rawId = decodeURIComponent(match[1]);
    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });

    const uid = resolved.uid;
    const meta = resolved.meta;
    const body = parseBody(event) || {};
    const actor = actorOf(event);

    const tests = Array.isArray(body.tests) ? body.tests : [];
    if (!tests.length) return resp(400, { error: "tests[] is required" });

    const clientMutationId = body.clientMutationId || null;
    const priority = body.priority || "routine";
    const department = body.department || "general";
    const assigneeId = body.assigneeId || actor.user_id || null;

    const now = nowISO();

    // ── Step 1: ensure Lab OS patient ────────────────────────────────────
    let labPatient;
    try {
      labPatient = await ensureLabPatient(uid, meta);
    } catch (e) {
      console.error("labs/order ensureLabPatient failed", e);
      return resp(503, { error: "Lab OS unavailable — try again" });
    }
    const labPatientId = labPatient.id;

    // ── Step 2: create Lab OS order ──────────────────────────────────────
    let labOrder;
    try {
      const orderRes = await labsFetch("/labs/orders", {
        method: "POST",
        body: JSON.stringify({
          labPatientId,
          tests,
          priority,
          department,
          clientMutationId,
          external_refs: { hms_uid: uid, department },
        }),
      });
      if (!orderRes.ok) {
        // If idempotent hit, body may be the prior order
        if (orderRes.status !== 200 && orderRes.status !== 201) {
          return resp(502, { error: `Lab OS order create failed (${orderRes.status})` });
        }
      }
      labOrder = orderRes.body;
    } catch (e) {
      console.error("labs/order createOrder failed", e);
      return resp(503, { error: "Lab OS unavailable — try again" });
    }
    const labOrderId = labOrder.orderId;
    if (!labOrderId) return resp(502, { error: "Lab OS did not return orderId" });

    // ── Step 3: create HMS task ──────────────────────────────────────────
    const patientName = meta.name || meta.patient_name || uid;
    const testLabel = tests.join(", ");
    const dueAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    let taskResult;
    try {
      taskResult = await createTask(deps, {
        uid,
        mrn: resolved.mrn || null,
        body: {
          type: "lab_followup",
          title: `Labs: ${testLabel} — ${patientName}`,
          status: "todo",
          priority: priority === "urgent" ? "urgent" : "important",
          assigneeId,
          dueAt,
          clinicalData: {
            lab_order_id: labOrderId,
            test_codes: tests,
            labs_url: LABS_URL(),
            lab_patient_id: labPatientId,
          },
        },
        actor,
        clientMutationId: clientMutationId ? `labs:${clientMutationId}` : null,
        nowISO: now,
      });
    } catch (e) {
      console.error("labs/order createTask failed", e);
      // Task failed after Lab OS order succeeded — return 502 with labOrderId
      // so client can retry with same clientMutationId (repair-on-retry)
      return resp(502, {
        error: "HMS task creation failed — retry with same clientMutationId",
        labOrderId,
      });
    }

    const taskId = taskResult.item?.task_id;

    // ── Step 4: patch Lab OS order external_refs with hms_task_id ────────
    try {
      await labsFetch(`/labs/orders/${labOrderId}/external-refs`, {
        method: "PATCH",
        body: JSON.stringify({ hms_task_id: taskId }),
      });
    } catch (e) {
      // Non-fatal: correlation can be recovered from task.clinicalData
      console.warn("labs/order patch external-refs failed", e.message);
    }

    return resp(201, {
      labOrderId,
      taskId,
      labPatientId,
      task: toTypedTask(taskResult.item),
    });
  });

  /* ────────────────────────────────────────────────────────────────────────
   POST /labs/events
   Webhook ingest from Lab OS.
   Validated by header x-labs-webhook-key.
   Payload: { event, orderId, testCode?, labPatientId, tenantId?,
              external_refs?, order_status?, category?, summary?, fileKeys? }
  ──────────────────────────────────────────────────────────────────────── */
  router.add("POST", /^\/?labs\/events\/?$/, async ({ event }) => {
    // Validate shared secret
    const h = event?.headers || {};
    const incomingKey = h["x-labs-webhook-key"] || h["X-Labs-Webhook-Key"] || "";
    if (incomingKey !== LABS_WEBHOOK_KEY()) {
      return resp(401, { error: "Unauthorized" });
    }

    const body = parseBody(event) || {};
    const { event: eventType, orderId, testCode, labPatientId, external_refs,
            order_status, category, summary, fileKeys } = body;

    if (!eventType || !orderId) return resp(400, { error: "event and orderId are required" });

    // Resolve HMS patient uid from external_refs
    const hmsUid = external_refs?.hms_uid || null;
    const hmsTaskId = external_refs?.hms_task_id || null;

    if (!hmsTaskId || !hmsUid) {
      // No linked task — nothing for us to do
      return resp(200, { ok: true, skipped: "no hms_task_id in external_refs" });
    }

    const now = nowISO();
    const actor = { user_id: "labs-os", name: "Lab OS", role: "system" };

    // Load the linked task
    const task = await getTask(ddb, TABLE, hmsUid, hmsTaskId);
    if (!task) {
      return resp(200, { ok: true, skipped: "linked task not found" });
    }

    // Never reopen a completed/cancelled task
    const terminal = new Set(["done", "cancelled"]);

    try {
      if (eventType === "result_available") {
        // Append a task update entry (status stays open)
        if (terminal.has(task.status)) {
          return resp(200, { ok: true, skipped: "task already terminal" });
        }
        const humanSummary = summary
          ? `Result in: ${summary}`
          : `Lab result available — ${testCode || "test"}`;

        const update = buildTaskUpdate({
          uid: hmsUid, taskId: hmsTaskId,
          changeType: "task_updated",
          statusAfter: task.status,
          structured: { lab_result_available: true, testCode, summary },
          humanSummary,
          actor,
          nowISO: now,
        });

        const syncRows = buildSyncRows({ uid: hmsUid, task, update, nowISO: now });
        const timelineRow = buildTaskTimelineRow({ uid: hmsUid, task, update, nowISO: now });

        await transactWriteAll(ddb, TABLE, [
          { kind: "put", Item: update },
          { kind: "put", Item: timelineRow },
          ...syncRows,
        ]);

      } else if (eventType === "verified") {
        // If all tests verified (order_status === "completed") → complete the task
        const allVerified = order_status === "completed";

        // Append update regardless
        const humanSummary = summary
          ? `Verified: ${summary}`
          : `Lab result verified — ${testCode || "test"}`;

        const newStatus = allVerified && !terminal.has(task.status) ? "done" : task.status;

        const update = buildTaskUpdate({
          uid: hmsUid, taskId: hmsTaskId,
          changeType: allVerified ? "task_updated" : "task_updated",
          statusAfter: newStatus,
          structured: { lab_verified: true, testCode, order_status, summary, all_verified: allVerified },
          humanSummary,
          actor,
          nowISO: now,
        });

        const taskPatch = allVerified && !terminal.has(task.status)
          ? { status: newStatus, completed_by: "labs-os" }
          : null;

        const syncRows = buildSyncRows({ uid: hmsUid, task: { ...task, status: newStatus }, update, nowISO: now });
        const timelineRow = buildTaskTimelineRow({ uid: hmsUid, task: { ...task, status: newStatus }, update, nowISO: now });

        const txItems = [
          { kind: "put", Item: update },
          { kind: "put", Item: timelineRow },
          ...syncRows,
        ];

        if (taskPatch) {
          const nextVersion = (task.version || 1) + 1;
          const names = { "#v": "version", "#u": "updated_at", "#s": "status" };
          const values = {
            ":nextV": nextVersion, ":expV": task.version || 1,
            ":now": now, ":s": newStatus, ":cb": "labs-os",
          };
          txItems.push({
            kind: "update",
            Key: { PK: `PATIENT#${hmsUid}`, SK: `TASK#${hmsTaskId}` },
            UpdateExpression: "SET #v = :nextV, #u = :now, #s = :s, completed_by = :cb",
            ConditionExpression: "#v = :expV OR attribute_not_exists(#v)",
            ExpressionAttributeNames: names,
            ExpressionAttributeValues: values,
          });
        }

        await transactWriteAll(ddb, TABLE, txItems);

        // DOCS attach-on-verify (§10): copy file if present
        if (fileKeys && fileKeys.length && HMS_BUCKET) {
          await attachVerifiedFiles({
            ddb, TABLE, uid: hmsUid, orderId, testCode: testCode || "result",
            labPatientId, tenantId: body.tenantId || "default",
            fileKeys, category, summary,
            verified_by: body.verified_by || null,
            verified_at: body.verified_at || now,
            nowISO: now,
          });
        }

      } else if (eventType === "sample_collected" || eventType === "in_progress") {
        // Progress update — append note, no status change
        if (terminal.has(task.status)) {
          return resp(200, { ok: true, skipped: "task already terminal" });
        }
        const humanSummary = eventType === "sample_collected"
          ? `Sample collected for ${testCode || "lab order"}`
          : `Lab processing in progress — ${testCode || ""}`;

        const update = buildTaskUpdate({
          uid: hmsUid, taskId: hmsTaskId,
          changeType: "task_updated",
          statusAfter: task.status,
          structured: { lab_event: eventType, testCode },
          humanSummary,
          actor,
          nowISO: now,
        });
        const syncRows = buildSyncRows({ uid: hmsUid, task, update, nowISO: now });
        const timelineRow = buildTaskTimelineRow({ uid: hmsUid, task, update, nowISO: now });
        await transactWriteAll(ddb, TABLE, [
          { kind: "put", Item: update },
          { kind: "put", Item: timelineRow },
          ...syncRows,
        ]);

      } else if (eventType === "cancelled") {
        if (terminal.has(task.status)) {
          return resp(200, { ok: true, skipped: "task already terminal" });
        }
        const update = buildTaskUpdate({
          uid: hmsUid, taskId: hmsTaskId,
          changeType: "task_updated",
          statusAfter: "cancelled",
          structured: { lab_event: "cancelled", reason: body.reason || null },
          humanSummary: `Lab order cancelled — ${body.reason || "no reason given"}`,
          actor,
          nowISO: now,
        });
        const nextVersion = (task.version || 1) + 1;
        const syncRows = buildSyncRows({ uid: hmsUid, task: { ...task, status: "cancelled" }, update, nowISO: now });
        const timelineRow = buildTaskTimelineRow({ uid: hmsUid, task: { ...task, status: "cancelled" }, update, nowISO: now });
        await transactWriteAll(ddb, TABLE, [
          { kind: "put", Item: update },
          { kind: "put", Item: timelineRow },
          ...syncRows,
          {
            kind: "update",
            Key: { PK: `PATIENT#${hmsUid}`, SK: `TASK#${hmsTaskId}` },
            UpdateExpression: "SET #v = :nextV, #u = :now, #s = :s",
            ConditionExpression: "#v = :expV OR attribute_not_exists(#v)",
            ExpressionAttributeNames: { "#v": "version", "#u": "updated_at", "#s": "status" },
            ExpressionAttributeValues: {
              ":nextV": nextVersion, ":expV": task.version || 1,
              ":now": now, ":s": "cancelled",
            },
          },
        ]);
      }
    } catch (e) {
      console.error("labs/events processing error", e);
      return resp(500, { error: "Internal error processing lab event" });
    }

    return resp(200, { ok: true, event: eventType, orderId, hmsTaskId });
  });
}

// ── Docs attach-on-verify (§10) ──────────────────────────────────────────────

async function attachVerifiedFiles({
  ddb, TABLE, uid, orderId, testCode, labPatientId, tenantId,
  fileKeys, category, summary, verified_by, verified_at, nowISO,
}) {
  const docCategory = labCategoryToDocCategory(category);

  for (const srcKey of fileKeys) {
    try {
      // Determine extension
      const ext = srcKey.split(".").pop() || "bin";
      const safeTest = String(testCode).replace(/[^a-zA-Z0-9._-]/g, "-");
      const safeOrder = String(orderId).replace(/[^a-zA-Z0-9._-]/g, "-");
      const destKey = `patients/${uid}/optimized/docs/${docCategory === "radiology" ? "radiology" : "lab"}/lab-${safeOrder}-${safeTest}.${ext}`;

      // Skip if already copied (idempotency guard via HeadObject)
      try {
        await s3.send(new HeadObjectCommand({ Bucket: HMS_BUCKET, Key: destKey }));
        // Already exists — skip
        continue;
      } catch (headErr) {
        if (headErr?.$metadata?.httpStatusCode !== 404) throw headErr;
      }

      // CopyObject from Labs bucket to HMS bucket
      const copySource = `${LABS_BUCKET}/${srcKey}`;
      await s3.send(new CopyObjectCommand({
        CopySource: copySource,
        Bucket: HMS_BUCKET,
        Key: destKey,
        MetadataDirective: "REPLACE",
        Metadata: {
          patient_uid: uid,
          lab_order_id: orderId,
          test_code: testCode,
          source: "labs-os",
        },
      }));

      // Attach to DOCS#PROFILE
      const entry = {
        key: destKey,
        uploadedAt: nowISO,
        uploadedBy: verified_by || "labs-os",
        caption: `${testCode} — Lab OS, ${verified_at ? verified_at.slice(0, 10) : ""}`.trim(),
        mimeType: ext === "pdf" ? "application/pdf" : `image/${ext}`,
        size: null,
        findings: summary || null,
        reportKind: testCode,
        stamp: { label: "verified", stampedAt: verified_at, stampedBy: verified_by },
        mrn: null,
        scheme: null,
      };

      await attachDocEntry({ ddb, TABLE, uid, category: docCategory, entry, nowISO: () => nowISO });
    } catch (e) {
      console.error("attachVerifiedFiles error for key", srcKey, e);
      // Non-fatal: continue with next file
    }
  }
}
