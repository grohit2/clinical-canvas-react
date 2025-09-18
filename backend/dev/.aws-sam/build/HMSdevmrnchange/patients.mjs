// patients.mjs — Patient CRUD (single-record model) + timeline updates

import {
  GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import crypto from "node:crypto";
import { resolveAnyPatientId } from "./ids.mjs";
import { buildInitialTimelineItem } from "./timeline.mjs";

/* ---------------------------- ULID generator ---------------------------- */
const ULID_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
function ulid(ms = Date.now()) {
  const encTime = (t, len) => { let n = BigInt(t), out=""; for (let i=len-1;i>=0;i--){ out=ULID_ALPHABET[Number(n%32n)]+out; n/=32n; } return out; };
  const encRand = (bytes) => { let out="",carry=0,bits=0; for (const b of bytes){ carry=(carry<<8)|b; bits+=8; while(bits>=5){ bits-=5; out+=ULID_ALPHABET[(carry>>bits)&31]; } } return out+(bits>0?ULID_ALPHABET[(carry<<(5-bits))&31]:""); };
  const rand = new Uint8Array(16); crypto.webcrypto.getRandomValues(rand);
  return encTime(ms,10) + encRand(rand).slice(0,16);
}

/* ------------------------ Emergency contact utils ----------------------- */
function normalizeEmergencyContact(ec) {
  if (!ec || typeof ec !== "object") return null;
  return {
    name: ec.name ?? null,
    relationship: ec.relationship ?? null,
    phone: ec.phone ?? null,
    altPhone: ec.altPhone ?? null,
    email: ec.email ?? null,
    address: ec.address && typeof ec.address === "object" ? {
      line1: ec.address.line1 ?? null,
      line2: ec.address.line2 ?? null,
      city: ec.address.city ?? null,
      state: ec.address.state ?? null,
      postalCode: ec.address.postalCode ?? null,
      country: ec.address.country ?? null,
    } : null,
  };
}

/* ------------------------------ Updatable sets -------------------------- */
const PERSON_UPDATABLE = new Set(["name", "age", "sex", "emergency_contact"]);
const EPISODE_UPDATABLE = new Set([
  "department", "status", "pathway", "diagnosis", "comorbidities",
  "assigned_doctor", "assigned_doctor_id", "files_url",
  "is_urgent", "urgent_reason", "urgent_until"
]); // current_state is handled in /state

/* ------------------------------- UI mapper ------------------------------ */
const toUiPatient = (it = {}) => ({
  id: it.patient_uid,
  patientId: it.patient_uid,
  mrn: it.active_reg_mrn || null,
  scheme: it.active_scheme || null,
  latestMrn: it.active_reg_mrn || null,
  mrnHistory: Array.isArray(it.mrn_history) ? it.mrn_history : [],

  name: it.name ?? null,
  age: it.age ?? null,
  sex: it.sex ?? null,
  emergencyContact: it.emergency_contact ?? null,

  department: it.department ?? null,
  status: it.status ?? null,
  pathway: it.pathway ?? null,
  currentState: it.current_state ?? null,
  diagnosis: it.diagnosis ?? null,
  comorbidities: Array.isArray(it.comorbidities) ? it.comorbidities : [],
  assignedDoctor: it.assigned_doctor ?? null,
  assignedDoctorId: it.assigned_doctor_id ?? null,
  filesUrl: it.files_url ?? null,
  isUrgent: !!it.is_urgent,
  urgentReason: it.urgent_reason ?? null,
  urgentUntil: it.urgent_until ?? null,

  lastUpdated: it.last_updated || it.updated_at || null,
});

/* --------------------------------- Mount -------------------------------- */
export function mountPatientRoutes(router, ctx) {
  const { ddb, TABLE, INDEX, utils } = ctx;
  const { nowISO, resp, parseBody } = utils;

  /* ---------------- CREATE (single record) ----------------
     POST /patients
     Body:
       {
         name, age?, sex?, emergencyContact?,
         registration: { scheme, mrn, department, pathway?, current_state?, diagnosis?, comorbidities?[], assigned_doctor?(_id)?, files_url?, is_urgent?, urgent_reason?, urgent_until? }
       }
  */
  router.add("POST", /^\/?patients\/?$/, async ({ event }) => {
    const body = parseBody(event) || {};
    const now = nowISO();

    const reg = body.registration ?? {};
    if (!body?.name || !reg?.scheme || !reg?.mrn || !reg?.department) {
      return resp(400, { error: "name + registration.scheme + registration.mrn + registration.department are required" });
    }

    const uid = body.patient_uid || ulid();
    const firstState = reg.current_state || "onboarding";

    // Seed timeline (no MRN in SK; MRN kept as attribute)
    const tl = buildInitialTimelineItem({ patient_uid: uid, mrn: reg.mrn, scheme: reg.scheme, firstState, now, actorId: body.createdBy || null });

    const item = {
      PK: `PATIENT#${uid}`,
      SK: "META_LATEST",

      patient_uid: uid,
      name: body.name,
      age: body.age ?? null,
      sex: body.sex ?? null,
      emergency_contact: normalizeEmergencyContact(body.emergencyContact) ?? null,

      // episode fields on META
      department: reg.department,
      status: "ACTIVE",
      pathway: reg.pathway ?? null,
      current_state: firstState,
      diagnosis: reg.diagnosis ?? null,
      comorbidities: Array.isArray(reg.comorbidities) ? reg.comorbidities : [],
      assigned_doctor: reg.assigned_doctor ?? null,
      assigned_doctor_id: reg.assigned_doctor_id ?? null,
      files_url: reg.files_url ?? null,
      is_urgent: !!reg.is_urgent,
      urgent_reason: reg.urgent_reason ?? null,
      urgent_until: reg.urgent_until ?? null,
      state_dates: { [String(firstState)]: now },
      timeline_open_sk: tl.sk,

      // MRN tracking
      active_reg_mrn: reg.mrn,
      active_scheme: reg.scheme,
      mrn_history: [{ mrn: reg.mrn, scheme: reg.scheme, date: now }],
      LSI_CUR_MRN: `CUR#${reg.mrn}`,

      // Cohort GSI lives on META row now
      GSI1PK: `DEPT#${reg.department}#ACTIVE`,

      created_at: now,
      updated_at: now,
      last_updated: now,
    };

    // MRN pointer for resolve-by-MRN
    const mrnPtr = {
      PK: `MRN#${reg.mrn}`, SK: "MRN",
      mrn: reg.mrn, patient_uid: uid, scheme: reg.scheme,
      department: reg.department, status: "ACTIVE", created_at: now,
    };

    await ddb.send(new TransactWriteCommand({
      TransactItems: [
        { Put: { TableName: TABLE, Item: item, ConditionExpression: "attribute_not_exists(PK)" } },
        { Put: { TableName: TABLE, Item: tl.item } },
        { Put: { TableName: TABLE, Item: mrnPtr, ConditionExpression: "attribute_not_exists(PK)" } },
      ]
    }));

    return resp(201, { message: "created", patient_uid: uid, latestMrn: reg.mrn, patient: toUiPatient(item) });
  });

  /* ---------------- GET by MRN ---------------- */
  router.add("GET", /^\/?patients\/by-mrn\/([^/]+)\/?$/, async ({ match }) => {
    const mrn = decodeURIComponent(match[1]);
    const resolved = await resolveAnyPatientId(ddb, TABLE, mrn);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });
    return resp(200, toUiPatient(resolved.meta));
  });

  /* ---------------- GET ONE (UID or MRN) ---------------- */
  router.add("GET", /^\/?patients\/([^/]+)\/?$/, async ({ match }) => {
    const rawId = decodeURIComponent(match[1]);
    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });
    return resp(200, toUiPatient(resolved.meta));
  });

  /* ---------------- LIST ----------------
     GET /patients
       - ?mrn=...        -> behave like GET by MRN
       - ?department=... -> query META GSI: DEPT#<dept>#ACTIVE
       - else            -> scan META items status=ACTIVE
  */
  router.add("GET", /^\/?patients\/?$/, async ({ qs }) => {
    if (qs?.mrn) {
      const mrn = String(qs.mrn);
      const resolved = await resolveAnyPatientId(ddb, TABLE, mrn);
      if (!resolved?.meta) return resp(404, { error: "Patient not found" });
      return resp(200, toUiPatient(resolved.meta));
    }

    if (qs?.department) {
      const q = await ddb.send(new QueryCommand({
        TableName: TABLE,
        IndexName: INDEX.DEPT_INDEX, // "GSI1PK-index"
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": `DEPT#${qs.department}#ACTIVE` },
      }));
      return resp(200, (q.Items || []).map(toUiPatient));
    }

    // MVP: scan META_LATEST active rows
    const s = await ddb.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: "#sk = :meta AND #s = :active",
      ExpressionAttributeNames: { "#sk": "SK", "#s": "status" },
      ExpressionAttributeValues: { ":meta": "META_LATEST", ":active": "ACTIVE" },
    }));
    return resp(200, (s.Items || []).map(toUiPatient));
  });

  /* ---------------- UPDATE (person + episode fields) ----------------
     PUT /patients/{id}
     Body: person fields or episode fields (NOT current_state, NOT MRN/scheme)
  */
  router.add("PUT", /^\/?patients\/([^/]+)\/?$/, async ({ match, event }) => {
    const rawId = decodeURIComponent(match[1]);
    const body = parseBody(event) || {};
    if (!Object.keys(body).length) return resp(400, { error: "empty update" });

    if (body?.emergencyContact && !body.emergency_contact) {
      body.emergency_contact = normalizeEmergencyContact(body.emergencyContact);
    }

    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });
    const uid = resolved.uid;

    const now = nowISO();
    let names = {}, values = { ":now": now }, setExpr = "SET updated_at = :now, last_updated = :now";

    for (const [k, v] of Object.entries(body)) {
      if (!(PERSON_UPDATABLE.has(k) || EPISODE_UPDATABLE.has(k))) continue;
      names[`#${k}`] = k; values[`:${k}`] = v; setExpr += `, #${k} = :${k}`;
    }

    // keep dept/status GSI in sync if provided/derived
    const newDept = body.department ?? resolved.meta.department;
    const newStatus = body.status ?? resolved.meta.status ?? "ACTIVE";
    setExpr += `, GSI1PK = :gsi`; values[":gsi"] = `DEPT#${newDept}#${newStatus}`;

    const upd = await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `PATIENT#${uid}`, SK: "META_LATEST" },
      UpdateExpression: setExpr,
      ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
      ExpressionAttributeValues: values,
      ReturnValues: "ALL_NEW",
    }));

    return resp(200, { message: "updated", patient: toUiPatient(upd.Attributes) });
  });

  /* ---------------- STATE CHANGE (separate) ----------------
     PATCH /patients/{id}/state
     Body: { current_state, checklistInDone?, checklistOutDone?, actorId?, timelineNotes? }
  */
  router.add("PATCH", /^\/?patients\/([^/]+)\/state\/?$/, async ({ match, event }) => {
    const rawId = decodeURIComponent(match[1]);
    const body = parseBody(event) || {};
    if (!body.current_state) return resp(400, { error: "current_state is required" });

    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });
    const meta = resolved.meta, uid = resolved.uid;

    const now = nowISO();
    const fromState = meta.current_state || "onboarding";
    const toState = body.current_state;
    if (toState === fromState) return resp(200, { message: "no-op", patient: toUiPatient(meta) });

    // Validate checklist
    const ck = await ddb.send(new GetCommand({
      TableName: TABLE, Key: { PK: "CHECKLIST", SK: `STAGE#${fromState}#TO#${toState}` }
    }));
    if (!ck.Item) return resp(400, { error: `Transition ${fromState} -> ${toState} not allowed` });
    const requiredIn  = Array.isArray(ck.Item.in_required) ? ck.Item.in_required : [];
    const requiredOut = Array.isArray(ck.Item.out_required) ? ck.Item.out_required : [];

    const newTlSk = `TL#${now}#${toState}`;
    const tx = [];

    // Close previous TL if exists
    if (meta.timeline_open_sk) {
      tx.push({
        Update: {
          TableName: TABLE,
          Key: { PK: `PATIENT#${uid}`, SK: meta.timeline_open_sk },
          ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
          UpdateExpression: "SET date_out = :now, required_out = :reqOut, checklist_out_done = :outDone, updated_at = :now",
          ExpressionAttributeValues: {
            ":now": now,
            ":reqOut": requiredOut,
            ":outDone": Array.isArray(body.checklistOutDone) ? body.checklistOutDone : [],
          },
        }
      });
    }

    // Open new TL
    tx.push({
      Put: {
        TableName: TABLE,
        Item: {
          PK: `PATIENT#${uid}`,
          SK: newTlSk,
          timeline_id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          patient_uid: uid,
          mrn: meta.active_reg_mrn || null,
          scheme: meta.active_scheme || null,
          state: toState,
          date_in: now,
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

    // Update META: state, first-seen stamp, move open SK
    tx.push({
      Update: {
        TableName: TABLE,
        Key: { PK: `PATIENT#${uid}`, SK: "META_LATEST" },
        UpdateExpression:
          "SET current_state = :to, timeline_open_sk = :tlsk, " +
          "state_dates.#to = if_not_exists(state_dates.#to, :now), " +
          "updated_at = :now, last_updated = :now",
        ExpressionAttributeNames: { "#to": String(toState) },
        ExpressionAttributeValues: { ":to": toState, ":tlsk": newTlSk, ":now": now },
      }
    });

    await ddb.send(new TransactWriteCommand({ TransactItems: tx }));

    const ref = await ddb.send(new GetCommand({
      TableName: TABLE, Key: { PK: `PATIENT#${uid}`, SK: "META_LATEST" }
    }));
    return resp(200, { message: "state-updated", patient: toUiPatient(ref.Item) });
  });

  /* ---------------- MRN/SCHEME SWITCH (single-record) ----------------
     PATCH /patients/{id}/registration
     Body: { mrn, scheme, department?, pathway?, diagnosis?, comorbidities?[], assigned_doctor?(_id)?, files_url?, is_urgent?, urgent_reason?, urgent_until?, firstState? }
     - Closes old TL, updates META.active_reg_mrn/scheme, appends mrn_history, moves timeline_open_sk,
       updates LSI_CUR_MRN and (optionally) episode fields passed in body.
  */
  router.add("PATCH", /^\/?patients\/([^/]+)\/registration\/?$/, async ({ match, event }) => {
    const rawId = decodeURIComponent(match[1]);
    const body = parseBody(event) || {};
    if (!body?.mrn || !body?.scheme) return resp(400, { error: "mrn & scheme are required" });

    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });
    const uid = resolved.uid, meta = resolved.meta;

    const now = nowISO();
    const firstState = body.firstState || meta.current_state || "onboarding";

    const tx = [];

    // Close old TL if any
    if (meta.timeline_open_sk) {
      tx.push({
        Update: {
          TableName: TABLE,
          Key: { PK: `PATIENT#${uid}`, SK: meta.timeline_open_sk },
          ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
          UpdateExpression: "SET date_out = :now, updated_at = :now",
          ExpressionAttributeValues: { ":now": now },
        }
      });
    }

    // Open new TL for new episode start
    const tl = buildInitialTimelineItem({ patient_uid: uid, mrn: body.mrn, scheme: body.scheme, firstState, now, actorId: body.actorId || null });
    tx.push({ Put: { TableName: TABLE, Item: tl.item } });

    // MRN pointer upsert (idempotent and safe)
    // Allow if pointer doesn't exist OR already points to the same patient
    tx.push({
      Update: {
        TableName: TABLE,
        Key: { PK: `MRN#${body.mrn}`, SK: "MRN" },
        ConditionExpression: "attribute_not_exists(PK) OR patient_uid = :uid",
        UpdateExpression: "SET mrn = :mrn, patient_uid = :uid, scheme = :sch, department = :dept, status = :active, created_at = if_not_exists(created_at, :now), updated_at = :now",
        ExpressionAttributeValues: {
          ":mrn": body.mrn,
          ":uid": uid,
          ":sch": body.scheme,
          ":dept": body.department ?? meta.department,
          ":active": "ACTIVE",
          ":now": now,
        },
      }
    });

    // Build META update (episode fields if provided)
    let names = { "#sd": "state_dates" }, values = {
      ":mrn": body.mrn, ":sch": body.scheme, ":now": now,
      ":push": [{ mrn: body.mrn, scheme: body.scheme, date: now }],
      ":lsi": `CUR#${body.mrn}`,
    };
    let setExpr = "SET active_reg_mrn = :mrn, active_scheme = :sch, " +
                  "mrn_history = list_append(if_not_exists(mrn_history, :empty), :push), " +
                  "LSI_CUR_MRN = :lsi, timeline_open_sk = :tlsk, " +
                  "current_state = :fs, #sd.#fs = if_not_exists(#sd.#fs, :now), " +
                  "updated_at = :now, last_updated = :now";
    names["#fs"] = String(firstState); values[":fs"] = firstState; values[":empty"] = []; values[":tlsk"] = tl.sk;

    // optional episode fields
    const epMap = {
      department: "department", status: "status", pathway: "pathway", diagnosis: "diagnosis",
      comorbidities: "comorbidities", assigned_doctor: "assigned_doctor", assigned_doctor_id: "assigned_doctor_id",
      files_url: "files_url", is_urgent: "is_urgent", urgent_reason: "urgent_reason", urgent_until: "urgent_until",
    };
    for (const [jsKey, dbKey] of Object.entries(epMap)) {
      if (body[jsKey] !== undefined) {
        names[`#${dbKey}`] = dbKey; values[`:${dbKey}`] = body[jsKey];
        setExpr += `, #${dbKey} = :${dbKey}`;
      }
    }

    // keep GSI in sync
    const newDept = body.department ?? meta.department;
    const newStatus = body.status ?? meta.status ?? "ACTIVE";
    setExpr += `, GSI1PK = :gsi`; values[":gsi"] = `DEPT#${newDept}#${newStatus}`;

    tx.push({
      Update: {
        TableName: TABLE,
        Key: { PK: `PATIENT#${uid}`, SK: "META_LATEST" },
        UpdateExpression: setExpr,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      }
    });

    await ddb.send(new TransactWriteCommand({ TransactItems: tx }));

    const ref = await ddb.send(new GetCommand({
      TableName: TABLE, Key: { PK: `PATIENT#${uid}`, SK: "META_LATEST" }
    }));
    return resp(200, { message: "registration-switched", latestMrn: body.mrn, patient: toUiPatient(ref.Item) });
  });

  /* ---------------- MRN HISTORY REWRITE (prune/replace only) --------------
     PATCH /patients/{id}/mrn-history
     Body: { mrnHistory: [{ mrn, scheme, date }] }
     Notes:
       - Does NOT change active_reg_mrn or timeline; to change current MRN,
         call /patients/{id}/registration first.
       - Requires the resulting history to still include active_reg_mrn.
  */
  router.add("PATCH", /^\/?patients\/([^/]+)\/mrn-history\/?$/, async ({ match, event }) => {
    const rawId = decodeURIComponent(match[1]);
    const body = parseBody(event) || {};
    const list = Array.isArray(body.mrnHistory) ? body.mrnHistory : null;
    if (!list) return resp(400, { error: "mrnHistory array is required" });

    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });
    const uid = resolved.uid, meta = resolved.meta;

    // Validate entries minimally
    const cleaned = list
      .filter(e => e && typeof e.mrn === 'string' && e.mrn.trim())
      .map(e => ({
        mrn: String(e.mrn).trim(),
        scheme: (e.scheme ?? 'Unknown'),
        date: e.date ?? meta.updated_at ?? new Date().toISOString(),
      }));

    if (!cleaned.length) return resp(400, { error: "mrnHistory must have at least one entry" });

    // Ensure active MRN still present; if not, ask caller to switch first
    const active = meta.active_reg_mrn || null;
    if (active && !cleaned.some(e => e.mrn === active)) {
      return resp(400, { error: "active MRN not present in new history; switch registration first" });
    }

    const now = nowISO();
    const upd = await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `PATIENT#${uid}`, SK: "META_LATEST" },
      UpdateExpression: "SET mrn_history = :mh, updated_at = :now, last_updated = :now",
      ExpressionAttributeValues: { ":mh": cleaned, ":now": now },
      ReturnValues: "ALL_NEW",
    }));

    return resp(200, { message: "mrn-history-updated", patient: toUiPatient(upd.Attributes) });
  });

  /* -------------- MRN OVERWRITE (single-call list + current update) --------------
     PATCH /patients/{id}/mrn-overwrite
     Body: { mrnHistory: [{ mrn, scheme, date }] }
     Behavior:
       - Replaces mrn_history with provided list (cleaned).
       - Sets active_reg_mrn/scheme to the entry with the highest date (if different),
         opening a new timeline segment similar to /registration.
  */
  router.add("PATCH", /^\/?patients\/([^/]+)\/mrn-overwrite\/?$/, async ({ match, event }) => {
    const rawId = decodeURIComponent(match[1]);
    const body = parseBody(event) || {};
    const list = Array.isArray(body.mrnHistory) ? body.mrnHistory : null;
    if (!list) return resp(400, { error: "mrnHistory array is required" });

    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });
    const uid = resolved.uid, meta = resolved.meta;

    const cleaned = list
      .filter(e => e && typeof e.mrn === 'string' && e.mrn.trim())
      .map(e => ({
        mrn: String(e.mrn).trim(),
        scheme: (e.scheme ?? 'Unknown'),
        date: e.date ?? meta.updated_at ?? new Date().toISOString(),
      }));
    if (!cleaned.length) return resp(400, { error: "mrnHistory must have at least one entry" });

    // Pick highest-date as desired current
    const desired = [...cleaned].sort((a,b)=> new Date(b.date||'1970-01-01') - new Date(a.date||'1970-01-01'))[0];
    const now = nowISO();

    // If current is already desired, just write history
    if ((meta.active_reg_mrn || null) === desired.mrn && (meta.active_scheme || null) === desired.scheme) {
      const upd = await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `PATIENT#${uid}`, SK: "META_LATEST" },
        UpdateExpression: "SET mrn_history = :mh, updated_at = :now, last_updated = :now",
        ExpressionAttributeValues: { ":mh": cleaned, ":now": now },
        ReturnValues: "ALL_NEW",
      }));
      return resp(200, { message: "mrn-overwrite-updated", patient: toUiPatient(upd.Attributes) });
    }

    // Otherwise, switch registration to desired and set history in same transaction
    const tx = [];
    // Close old TL if any
    if (meta.timeline_open_sk) {
      tx.push({ Update: {
        TableName: TABLE,
        Key: { PK: `PATIENT#${uid}`, SK: meta.timeline_open_sk },
        ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
        UpdateExpression: "SET date_out = :now, updated_at = :now",
        ExpressionAttributeValues: { ":now": now },
      }});
    }
    // Open new TL
    const firstState = meta.current_state || 'onboarding';
    const tl = buildInitialTimelineItem({ patient_uid: uid, mrn: desired.mrn, scheme: desired.scheme, firstState, now, actorId: body.actorId || null });
    tx.push({ Put: { TableName: TABLE, Item: tl.item } });

    // Pointer upsert (idempotent)
    tx.push({ Update: {
      TableName: TABLE,
      Key: { PK: `MRN#${desired.mrn}`, SK: "MRN" },
      ConditionExpression: "attribute_not_exists(PK) OR patient_uid = :uid",
      UpdateExpression: "SET mrn = :mrn, patient_uid = :uid, scheme = :sch, department = :dept, status = :active, created_at = if_not_exists(created_at, :now), updated_at = :now",
      ExpressionAttributeValues: {
        ":mrn": desired.mrn,
        ":uid": uid,
        ":sch": desired.scheme,
        ":dept": meta.department,
        ":active": "ACTIVE",
        ":now": now,
      },
    }});

    // META update
    tx.push({ Update: {
      TableName: TABLE,
      Key: { PK: `PATIENT#${uid}`, SK: "META_LATEST" },
      UpdateExpression:
        "SET active_reg_mrn = :mrn, active_scheme = :sch, mrn_history = :mh, " +
        "LSI_CUR_MRN = :lsi, timeline_open_sk = :tlsk, updated_at = :now, last_updated = :now",
      ExpressionAttributeValues: {
        ":mrn": desired.mrn, ":sch": desired.scheme, ":mh": cleaned, ":lsi": `CUR#${desired.mrn}`, ":tlsk": tl.sk, ":now": now,
      },
    }});

    await ddb.send(new TransactWriteCommand({ TransactItems: tx }));

    const ref = await ddb.send(new GetCommand({ TableName: TABLE, Key: { PK: `PATIENT#${uid}`, SK: "META_LATEST" } }));
    return resp(200, { message: "mrn-overwrite-updated", patient: toUiPatient(ref.Item) });
  });

  /* ---------------- SOFT DELETE (mark patient episode inactive) ---------------- */
  router.add("DELETE", /^\/?patients\/([^/]+)\/?$/, async ({ match }) => {
    const rawId = decodeURIComponent(match[1]);
    const resolved = await resolveAnyPatientId(ddb, TABLE, rawId);
    if (!resolved?.meta) return resp(404, { error: "Patient not found" });

    const now = nowISO();
    const upd = await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `PATIENT#${resolved.uid}`, SK: "META_LATEST" },
      UpdateExpression: "SET #s = :inactive, GSI1PK = :g, updated_at = :now, last_updated = :now",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: {
        ":inactive": "INACTIVE",
        ":g": `DEPT#${resolved.meta.department}#INACTIVE`,
        ":now": now,
      },
      ReturnValues: "ALL_NEW",
    }));

    return resp(200, { message: "soft-deleted", patient: toUiPatient(upd.Attributes) });
  });
}
