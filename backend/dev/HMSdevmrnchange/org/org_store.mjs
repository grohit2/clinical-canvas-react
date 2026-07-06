// org/org_store.mjs — Org registry, memberships, unit pins (Node 22 ESM)
//
// Registry (one partition — whole tree loads in one Query):
//   PK=ORG#REGISTRY  SK=DEPT#<dept_id>                 { dept_id, name, active, sort }
//   PK=ORG#REGISTRY  SK=DEPT#<dept_id>#UNIT#<unit_id>  { unit_id, name, active, sort }
//   PK=ORG#REGISTRY  SK=WARD#<ward_id>                 { ward_id, name, floor?, active }
//
// Memberships (rotation history — append-only, `until` set on end, never deleted):
//   PK=USER#<id>  SK=MEMBERSHIP#<from-iso>#<dept_id>#<unit_id|"-">
//   GSI2PK = ROSTER#<dept_id>#<unit_id>   (unit tier)  |  ROSTER#<dept_id>  (dept tier)
//   GSI2SK = <from-iso>
//
// Pins (loose unit↔patient coupling):
//   PK=UNITLIST#<dept_id>/<unit_id>  SK=PIN#<patient_uid>

import {
  GetCommand, PutCommand, QueryCommand, UpdateCommand, DeleteCommand,
  BatchGetCommand,
} from "@aws-sdk/lib-dynamodb";

const REGISTRY_PK = "ORG#REGISTRY";

export const slugify = (name) =>
  String(name || "").trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

const bad = (message) => Object.assign(new Error(message), { code: "BAD_REQUEST" });
const notFound = (message) => Object.assign(new Error(message), { code: "NOT_FOUND" });

/* ---------------- registry ---------------- */

export async function getOrgTree(deps) {
  const { ddb, TABLE } = deps;
  const r = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk",
    ExpressionAttributeValues: { ":pk": REGISTRY_PK },
  }));
  const items = r.Items || [];
  const depts = new Map();
  const wards = [];
  for (const it of items) {
    const sk = it.SK || "";
    if (sk.startsWith("WARD#")) {
      wards.push({ ward_id: it.ward_id, name: it.name, floor: it.floor ?? null, active: it.active !== false });
    } else if (sk.includes("#UNIT#")) {
      const deptId = sk.split("#")[1];
      if (!depts.has(deptId)) depts.set(deptId, { dept_id: deptId, name: deptId, units: [] });
      depts.get(deptId).units.push({ unit_id: it.unit_id, name: it.name, active: it.active !== false, sort: it.sort ?? 0 });
    } else if (sk.startsWith("DEPT#")) {
      const cur = depts.get(it.dept_id) || { dept_id: it.dept_id, units: [] };
      depts.set(it.dept_id, { ...cur, dept_id: it.dept_id, name: it.name, active: it.active !== false, sort: it.sort ?? 0 });
    }
  }
  const departments = [...depts.values()]
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || String(a.name).localeCompare(String(b.name)));
  for (const d of departments) d.units.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || String(a.name).localeCompare(String(b.name)));
  return { departments, wards };
}

export async function createDepartment(deps, { dept_id, name, units = [], sort }, nowISO) {
  const { ddb, TABLE } = deps;
  if (!name) throw bad("name is required");
  const id = dept_id || slugify(name);
  if (!id) throw bad("could not derive dept_id from name");
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { PK: REGISTRY_PK, SK: `DEPT#${id}`, entity: "ORG_DEPT", dept_id: id, name, active: true, sort: sort ?? 0, created_at: nowISO },
    ConditionExpression: "attribute_not_exists(PK)",
  })).catch((e) => {
    if (e?.name === "ConditionalCheckFailedException") throw bad(`department ${id} already exists`);
    throw e;
  });
  const created = [];
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    created.push(await createUnit(deps, id, { unit_id: u.unit_id, name: u.name || u, sort: i }, nowISO));
  }
  return { dept_id: id, name, units: created };
}

export async function createUnit(deps, deptId, { unit_id, name, sort }, nowISO) {
  const { ddb, TABLE } = deps;
  if (!name) throw bad("unit name is required");
  const dept = await ddb.send(new GetCommand({ TableName: TABLE, Key: { PK: REGISTRY_PK, SK: `DEPT#${deptId}` } }));
  if (!dept.Item) throw notFound(`department ${deptId} not found`);
  const id = unit_id || slugify(name);
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { PK: REGISTRY_PK, SK: `DEPT#${deptId}#UNIT#${id}`, entity: "ORG_UNIT", dept_id: deptId, unit_id: id, name, active: true, sort: sort ?? 0, created_at: nowISO },
    ConditionExpression: "attribute_not_exists(PK)",
  })).catch((e) => {
    if (e?.name === "ConditionalCheckFailedException") throw bad(`unit ${deptId}/${id} already exists`);
    throw e;
  });
  return { unit_id: id, name };
}

export async function createWard(deps, { ward_id, name, floor }, nowISO) {
  const { ddb, TABLE } = deps;
  if (!name) throw bad("name is required");
  const id = ward_id || slugify(name);
  await ddb.send(new PutCommand({
    TableName: TABLE,
    Item: { PK: REGISTRY_PK, SK: `WARD#${id}`, entity: "ORG_WARD", ward_id: id, name, floor: floor ?? null, active: true, created_at: nowISO },
    ConditionExpression: "attribute_not_exists(PK)",
  })).catch((e) => {
    if (e?.name === "ConditionalCheckFailedException") throw bad(`ward ${id} already exists`);
    throw e;
  });
  return { ward_id: id, name, floor: floor ?? null };
}

export async function getDeptName(deps, deptId) {
  const { ddb, TABLE } = deps;
  const r = await ddb.send(new GetCommand({ TableName: TABLE, Key: { PK: REGISTRY_PK, SK: `DEPT#${deptId}` } }));
  return r.Item?.name || null;
}

/* ---------------- memberships ---------------- */

const toMembership = (it = {}) => ({
  sk: it.SK,
  user_id: it.user_id,
  dept_id: it.dept_id,
  unit_id: it.unit_id ?? null,
  from: it.from,
  until: it.until ?? null,
  actor: it.actor_id ?? null,
});

export async function listMemberships(deps, userId) {
  const { ddb, TABLE } = deps;
  const r = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :m)",
    ExpressionAttributeValues: { ":pk": `USER#${userId}`, ":m": "MEMBERSHIP#" },
    ScanIndexForward: false, // SK embeds from-iso — newest first
  }));
  return (r.Items || []).map(toMembership);
}

export async function startMembership(deps, userId, { dept_id, unit_id, from }, actor, nowISO) {
  const { ddb, TABLE } = deps;
  if (!dept_id) throw bad("dept_id is required");
  const deptName = await getDeptName(deps, dept_id);
  if (!deptName) throw notFound(`department ${dept_id} not found in registry`);
  const fromIso = from || nowISO;
  const tierUnit = unit_id || null;

  // Auto-close the open membership of the same tier (one open row per tier).
  const existing = await listMemberships(deps, userId);
  const sameTierOpen = existing.filter((m) => m.until === null && (m.unit_id === null) === (tierUnit === null));
  for (const m of sameTierOpen) {
    await ddb.send(new UpdateCommand({
      TableName: TABLE,
      Key: { PK: `USER#${userId}`, SK: m.sk },
      UpdateExpression: "SET #u = :now",
      ExpressionAttributeNames: { "#u": "until" },
      ExpressionAttributeValues: { ":now": nowISO },
    }));
  }

  const SK = `MEMBERSHIP#${fromIso}#${dept_id}#${tierUnit || "-"}`;
  const item = {
    PK: `USER#${userId}`, SK,
    entity: "MEMBERSHIP",
    user_id: userId, dept_id, unit_id: tierUnit,
    from: fromIso, until: null,
    actor_id: actor?.user_id || null,
    created_at: nowISO,
    GSI2PK: tierUnit ? `ROSTER#${dept_id}#${tierUnit}` : `ROSTER#${dept_id}`,
    GSI2SK: fromIso,
  };
  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
  return { membership: toMembership(item), closed: sameTierOpen.map((m) => m.sk) };
}

export async function endMembership(deps, userId, { sk, dept_id, unit_id, until }, nowISO) {
  const { ddb, TABLE } = deps;
  const all = await listMemberships(deps, userId);
  let target;
  if (sk) target = all.find((m) => m.sk === sk);
  else {
    const open = all.filter((m) => m.until === null);
    target = dept_id
      ? open.find((m) => m.dept_id === dept_id && (m.unit_id ?? null) === (unit_id ?? null))
      : (open.length === 1 ? open[0] : null);
    if (!target && open.length > 1) throw bad("multiple open memberships — pass sk or dept_id/unit_id");
  }
  if (!target) throw notFound("open membership not found");
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { PK: `USER#${userId}`, SK: target.sk },
    UpdateExpression: "SET #u = :until",
    ExpressionAttributeNames: { "#u": "until" },
    ExpressionAttributeValues: { ":until": until || nowISO },
  }));
  return { ...target, until: until || nowISO };
}

export async function getRoster(deps, { dept_id, unit_id, at }) {
  const { ddb, TABLE, INDEX } = deps;
  const pk = unit_id ? `ROSTER#${dept_id}#${unit_id}` : `ROSTER#${dept_id}`;
  const r = await ddb.send(new QueryCommand({
    TableName: TABLE,
    IndexName: INDEX.TASK_GSI, // GSI2PK-GSI2SK-index — disjoint ROSTER# prefix
    KeyConditionExpression: "GSI2PK = :pk",
    ExpressionAttributeValues: { ":pk": pk },
    ScanIndexForward: false,
  }));
  const all = (r.Items || []).map(toMembership);
  if (at) {
    return all.filter((m) => m.from <= at && (m.until === null || m.until > at));
  }
  return all.filter((m) => m.until === null);
}

/* ---------------- pins ---------------- */

const unitListPK = (deptId, unitId) => `UNITLIST#${deptId}/${unitId}`;

export async function addPin(deps, { dept_id, unit_id, patient_uid, note }, actor, nowISO) {
  const { ddb, TABLE } = deps;
  if (!patient_uid) throw bad("patient_uid is required");
  const item = {
    PK: unitListPK(dept_id, unit_id), SK: `PIN#${patient_uid}`,
    entity: "UNIT_PIN",
    dept_id, unit_id, patient_uid,
    pinned_by: actor?.user_id || null,
    pinned_at: nowISO,
    note: note ?? null,
  };
  await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
}

export async function removePin(deps, { dept_id, unit_id, patient_uid }) {
  const { ddb, TABLE } = deps;
  await ddb.send(new DeleteCommand({
    TableName: TABLE,
    Key: { PK: unitListPK(dept_id, unit_id), SK: `PIN#${patient_uid}` },
  }));
  return { removed: patient_uid };
}

export async function listPins(deps, { dept_id, unit_id }) {
  const { ddb, TABLE } = deps;
  const r = await ddb.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: "PK = :pk AND begins_with(SK, :p)",
    ExpressionAttributeValues: { ":pk": unitListPK(dept_id, unit_id), ":p": "PIN#" },
  }));
  return r.Items || [];
}

/* ---------------- merged unit patient list ---------------- */

const toPatientPick = (it = {}) => ({
  uid: it.patient_uid || (it.PK || "").replace(/^PATIENT#/, ""),
  mrn: it.active_reg_mrn || null,
  name: it.name || null,
  bedNo: it.bed_no || it.room_number || null,
  ward: it.ward || null,
  ward_id: it.ward_id || null,
  department: it.department || null,
  diagnosis: it.diagnosis || null,
  currentState: it.current_state || null,
  assignedDoctorId: it.assigned_doctor_id || null,
  status: it.status || null,
});

export async function getUnitPatients(deps, { dept_id, unit_id }) {
  const { ddb, TABLE, INDEX } = deps;

  // (a) derived — current unit members' assigned patients
  const roster = await getRoster(deps, { dept_id, unit_id });
  const memberIds = new Set(roster.map((m) => m.user_id));

  const deptName = await getDeptName(deps, dept_id);
  let deptPatients = [];
  if (deptName) {
    const r = await ddb.send(new QueryCommand({
      TableName: TABLE,
      IndexName: INDEX.DEPT_INDEX,
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": `DEPT#${deptName}#ACTIVE` },
    }));
    deptPatients = r.Items || [];
  }
  const derived = deptPatients.filter(
    (p) => p.assigned_doctor_id && memberIds.has(p.assigned_doctor_id),
  );

  // (b) pinned
  const pins = await listPins(deps, { dept_id, unit_id });
  const derivedUids = new Set(derived.map((p) => p.patient_uid));
  const pinnedUids = pins.map((p) => p.patient_uid).filter((uid) => uid);
  const toFetch = pinnedUids.filter((uid) => !derivedUids.has(uid));

  let pinnedMetas = [];
  if (toFetch.length > 0) {
    const batches = [];
    for (let i = 0; i < toFetch.length; i += 100) batches.push(toFetch.slice(i, i + 100));
    for (const b of batches) {
      const r = await ddb.send(new BatchGetCommand({
        RequestItems: {
          [TABLE]: { Keys: b.map((uid) => ({ PK: `PATIENT#${uid}`, SK: "META_LATEST" })) },
        },
      }));
      pinnedMetas.push(...(r.Responses?.[TABLE] || []));
    }
  }

  const pinnedSet = new Set(pinnedUids);
  const items = [
    // pins first (both fetched-pin metas and derived rows that are also pinned)
    ...pinnedMetas.map((p) => ({ ...toPatientPick(p), pinned: true })),
    ...derived.filter((p) => pinnedSet.has(p.patient_uid)).map((p) => ({ ...toPatientPick(p), pinned: true })),
    // then purely-derived
    ...derived.filter((p) => !pinnedSet.has(p.patient_uid)).map((p) => ({ ...toPatientPick(p), pinned: false })),
  ];
  return { items, roster: roster.map((m) => ({ user_id: m.user_id, from: m.from })) };
}
