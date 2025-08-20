// patients.mjs — patient CRUD + behind-the-scenes timeline writes (Node 22 ESM)

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { buildInitialTimelineItem } from "./timeline.mjs";

/* Fields that can be set via PUT */
const UPDATABLE = new Set([
  "name",
  "age",
  "sex",
  "pathway",
  "current_state",
  "diagnosis",
  "department",
  "status",
  "comorbidities",
  "assigned_doctor",      // human-readable
  "assigned_doctor_id",   // canonical id
  "files_url",
  // inline flags/fields
  "is_urgent",
  "urgent_reason",
  "urgent_until",
  "emergency_contact",    // { name, relationship, phone, altPhone, email, address{} }
]);

/* DB -> UI */
const toUiPatient = (it = {}) => ({
  id: it?.mrn,
  mrn: it?.mrn,
  name: it?.name,
  department: it?.department,
  status: it?.status,
  pathway: it?.pathway,
  currentState: it?.current_state,
  diagnosis: it?.diagnosis,
  age: it?.age,
  sex: it?.sex,
  comorbidities: Array.isArray(it?.comorbidities) ? it.comorbidities : [],
  assignedDoctor: it?.assigned_doctor || null,
  assignedDoctorId: it?.assigned_doctor_id || null,
  filesUrl: it?.files_url || null,
  isUrgent: !!it?.is_urgent,
  urgentReason: it?.urgent_reason || null,
  urgentUntil: it?.urgent_until || null,
  emergencyContact: it?.emergency_contact || null,
  lastUpdated: it?.last_updated,
});

export function mountPatientRoutes(router, ctx) {
  const { ddb, TABLE, INDEX, utils } = ctx;
  const { nowISO, resp, parseBody } = utils;

  /* ---------------- CREATE ----------------
     POST /patients
     body: { mrn, name, department, current_state?, ...other fields... }
     - Atomically creates patient and seeds first timeline row.
  */
  router.add("POST", /^\/?patients\/?$/, async ({ event }) => {
    const body = parseBody(event);
    if (!body?.mrn || !body?.name || !body?.department) {
      return resp(400, { error: "mrn, name, department are required" });
    }

    const now = nowISO();
    const firstState = body.current_state || "onboarding";
    const tl = buildInitialTimelineItem(body.mrn, firstState, now, body.createdBy || null);

    const item = {
      PK: `PATIENT#${body.mrn}`,
      SK: "META_LATEST",

      patient_id: body.mrn,
      mrn: body.mrn,
      name: body.name,
      age: body.age,
      sex: body.sex,

      pathway: body.pathway || null,
      current_state: firstState,
      diagnosis: body.diagnosis || null,
      department: body.department,
      status: "ACTIVE",
      comorbidities: Array.isArray(body.comorbidities) ? body.comorbidities : [],

      assigned_doctor: body.assignedDoctor ?? null,
      assigned_doctor_id: body.assignedDoctorId ?? null,

      state_dates: firstState ? { [String(firstState)]: now } : {},

      last_updated: now,
      created_at: now,
      updated_at: now,
      version_ts: now,

      is_urgent: !!body.isUrgent,
      urgent_reason: body.urgentReason || null,
      urgent_until: body.urgentUntil || null,
      emergency_contact: body.emergencyContact || null,

      timeline_open_sk: tl.sk,

      // GSI for patients by department + status
      GSI1PK: `DEPT#${body.department}#ACTIVE`,
    };

    await ddb.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: TABLE,
            Item: item,
            ConditionExpression: "attribute_not_exists(PK)", // no overwrite
          }
        },
        { Put: { TableName: TABLE, Item: tl.item } }
      ]
    }));

    return resp(201, { message: "created", mrn: body.mrn, patient: toUiPatient(item) });
  });

  /* ---------------- UPDATE ----------------
     PUT /patients/{mrn}
     - If current_state changes:
         * Validate (from→to) exists in CHECKLIST table
           (PK="CHECKLIST", SK="STAGE#<from>#TO#<to>")
         * TX: close previous TL + open new TL + update patient
     - Else: simple update on patient
     body may include:
       checklistInDone?: string[]
       checklistOutDone?: string[]
       actorId?: string
       timelineNotes?: string
  */
  router.add("PUT", /^\/?patients\/([^/]+)\/?$/, async ({ match, event }) => {
    const id = decodeURIComponent(match[1]);

    // load existing
    const cur = await ddb.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `PATIENT#${id}`, SK: "META_LATEST" },
    }));
    if (!cur.Item) return resp(404, { error: "Patient not found" });

    const body = parseBody(event);
    if (!body || Object.keys(body).length === 0) {
      return resp(400, { error: "empty update" });
    }

    const now = nowISO();
    let setExpr = "SET updated_at = :now, last_updated = :now";
    const names = {};
    const values = { ":now": now };

    // updatable scalar/object fields (including emergency_contact, is_urgent, etc.)
    for (const [k, v] of Object.entries(body)) {
      if (!UPDATABLE.has(k)) continue;
      const nk = `#${k}`;
      const vk = `:${k}`;
      names[nk] = k;
      values[vk] = v;
      setExpr += `, ${nk} = ${vk}`;
    }

    // keep GSI1PK in sync with department/status
    const newDept = body.department ?? cur.Item.department;
    const newStatus = body.status ?? cur.Item.status ?? "ACTIVE";
    setExpr += `, GSI1PK = :gsi`;
    values[":gsi"] = `DEPT#${newDept}#${newStatus}`;

    const isStateChange =
      body.current_state && body.current_state !== cur.Item.current_state;

    if (!isStateChange) {
      const updated = await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `PATIENT#${id}`, SK: "META_LATEST" },
        UpdateExpression: setExpr,
        ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
        ExpressionAttributeValues: values,
        ReturnValues: "ALL_NEW",
      }));
      return resp(200, { message: "updated", mrn: id, patient: toUiPatient(updated.Attributes) });
    }

    // ---------- state change path (transactional) ----------
    const fromState = cur.Item.current_state || "onboarding";
    const toState   = body.current_state;

    // 1) Validate checklist transition exists
    const ck = await ddb.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: "CHECKLIST", SK: `STAGE#${fromState}#TO#${toState}` },
    }));
    if (!ck.Item) {
      return resp(400, { error: `Transition ${fromState} -> ${toState} not allowed` });
    }
    const requiredIn  = Array.isArray(ck.Item.in_required) ? ck.Item.in_required : [];
    const requiredOut = Array.isArray(ck.Item.out_required) ? ck.Item.out_required : [];

    // 2) Stamp first-seen date for the new state + move open SK
    names["#state_dates"] = "state_dates";
    names["#cs"] = String(toState);
    setExpr += `, #state_dates.#cs = if_not_exists(#state_dates.#cs, :now)`;
    const newTlSk = `TL#${now}#${toState}`;
    setExpr += `, timeline_open_sk = :tlsk`;
    values[":tlsk"] = newTlSk;

    // 3) Determine which TL row to close:
    //    Prefer patient.timeline_open_sk; if missing, fetch latest TL# row.
    let prevSk = cur.Item.timeline_open_sk;
    if (!prevSk) {
      const latest = await ddb.send(new QueryCommand({
        TableName: TABLE,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: { ":pk": `PATIENT#${id}`, ":sk": "TL#" },
        ScanIndexForward: false,
        Limit: 1,
      }));
      if (latest.Items && latest.Items.length) {
        prevSk = latest.Items[0].SK;
      }
    }

    // 4) Build TX items
    const txItems = [];

    // Close previous TL (if we found one)
    if (prevSk) {
      txItems.push({
        Update: {
          TableName: TABLE,
          Key: { PK: `PATIENT#${id}`, SK: prevSk },
          // IMPORTANT: overwrite even if attribute exists as NULL; also avoid ghost creation.
          ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
          UpdateExpression:
            "SET date_out = :now, " +
            "required_out = :reqOut, checklist_out_done = :outDone, updated_at = :now",
          ExpressionAttributeValues: {
            ":now": now,
            ":reqOut": requiredOut,
            ":outDone": Array.isArray(body.checklistOutDone) ? body.checklistOutDone : [],
          },
        }
      });
    }

    // Open new TL
    txItems.push({
      Put: {
        TableName: TABLE,
        Item: {
          PK: `PATIENT#${id}`,
          SK: newTlSk,
          timeline_id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          patient_id: id,
          state: toState,
          date_in: now,
          // date_out omitted on purpose for a clean "missing" attribute, not NULL
          required_in: requiredIn,
          required_out: [],
          checklist_in_done: Array.isArray(body.checklistInDone) ? body.checklistInDone : [],
          checklist_out_done: [],
          actor_id: body.actorId || null,
          notes: body.timelineNotes || null,
          created_at: now,
          updated_at: now,
        }
      }
    });

    // Update patient (including any other UPDATABLE fields provided)
    txItems.push({
      Update: {
        TableName: TABLE,
        Key: { PK: `PATIENT#${id}`, SK: "META_LATEST" },
        UpdateExpression: setExpr,
        ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
        ExpressionAttributeValues: values,
      }
    });

    await ddb.send(new TransactWriteCommand({ TransactItems: txItems }));

    // Return the fresh patient
    const after = await ddb.send(new GetCommand({
      TableName: TABLE, Key: { PK: `PATIENT#${id}`, SK: "META_LATEST" }
    }));
    return resp(200, { message: "updated", mrn: id, patient: toUiPatient(after.Item) });
  });

  /* ---------------- DELETE (soft) ----------------
     DELETE /patients/{mrn}
  */
  router.add("DELETE", /^\/?patients\/([^/]+)\/?$/, async ({ match }) => {
    const id = decodeURIComponent(match[1]);

    const cur = await ddb.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `PATIENT#${id}`, SK: "META_LATEST" },
    }));
    if (!cur.Item) return resp(404, { error: "Patient not found" });

    const now = nowISO();
    const dept = cur.Item.department;

    const updated = await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `PATIENT#${id}`, SK: "META_LATEST" },
      UpdateExpression:
        "SET #s = :inactive, GSI1PK = :gsi, updated_at = :now, last_updated = :now",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: {
        ":inactive": "INACTIVE",
        ":gsi": `DEPT#${dept}#INACTIVE`,
        ":now": now,
      },
      ReturnValues: "ALL_NEW",
    }));

    return resp(200, { message: "soft-deleted", mrn: id, patient: toUiPatient(updated.Attributes) });
  });

  /* ---------------- GET ONE ----------------
     GET /patients/{mrn}
  */
  router.add("GET", /^\/?patients\/([^/]+)\/?$/, async ({ match }) => {
    const id = decodeURIComponent(match[1]);
    const data = await ddb.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `PATIENT#${id}`, SK: "META_LATEST" },
    }));
    if (!data.Item) return resp(404, { error: "Patient not found" });
    return resp(200, toUiPatient(data.Item));
  });

  /* ---------------- LIST ----------------
     GET /patients
     - ?mrn=...  (direct lookup shortcut)
     - ?department=Cardiology  (GSI1PK: DEPT#<dept>#ACTIVE)
     - else SCAN active (MVP)
     NOTE: FE can filter "urgent" locally; we return full cohort.
  */
  router.add("GET", /^\/?patients\/?$/, async ({ qs }) => {
    if (qs?.mrn) {
      const data = await ddb.send(new GetCommand({
        TableName: TABLE,
        Key: { PK: `PATIENT#${qs.mrn}`, SK: "META_LATEST" },
      }));
      if (!data.Item) return resp(404, { error: "Patient not found" });
      return resp(200, toUiPatient(data.Item));
    }

    let items = [];
    if (qs?.department) {
      const data = await ddb.send(new QueryCommand({
        TableName: TABLE,
        IndexName: INDEX.DEPT_INDEX, // "GSI1PK-index"
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": `DEPT#${qs.department}#ACTIVE` },
      }));
      items = data.Items ?? [];
    } else {
      const data = await ddb.send(new ScanCommand({
        TableName: TABLE,
        FilterExpression: "#s = :active AND SK = :latest",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":active": "ACTIVE", ":latest": "META_LATEST" },
      }));
      items = data.Items ?? [];
    }
    return resp(200, items.map(toUiPatient));
  });
}
