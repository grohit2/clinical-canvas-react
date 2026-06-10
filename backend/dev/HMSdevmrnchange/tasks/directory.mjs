// directory.mjs — Directory APIs for staff/patient pickers
// Node 22 ESM. Spec: §8.1 Directory and Context APIs.
//
// Why this module: the task workflow constantly needs to look up "who/what to
// assign". Existing GET /patients and GET /doctors serve adjacent needs but
// require department and return heavy shapes. Directory APIs are intentionally
// thin: id + display label + minimal hints for the picker.

import { QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const toPatientPick = (it = {}) => ({
  uid: it.patient_uid || (it.PK || "").replace(/^PATIENT#/, ""),
  mrn: it.active_reg_mrn || it.mrn || null,
  name: it.name || it.full_name || null,
  bedNo: it.bed_no || null,
  ward: it.ward || null,
  department: it.department || null,
  status: it.status || null,
});

const toStaffPick = (it = {}) => ({
  userId: it.user_id || it.doctor_id || (it.SK || "").replace(/^USER#/, ""),
  name: it.name || it.full_name || null,
  role: it.role || null,
  department: it.department || null,
  email: it.email || null,
});

const matchesQuery = (label, q) => {
  if (!q) return true;
  const s = String(label || "").toLowerCase();
  return s.includes(String(q).toLowerCase());
};

export async function listPatients(deps, { department, q, limit = 50 } = {}) {
  const { ddb, TABLE, INDEX } = deps;
  let items = [];
  if (department) {
    const r = await ddb.send(new QueryCommand({
      TableName: TABLE,
      IndexName: INDEX.DEPT_INDEX,
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": `DEPT#${department}#ACTIVE` },
      Limit: limit,
    }));
    items = r.Items || [];
  } else {
    // No department — pragmatic Scan over META_LATEST + ACTIVE. Phase 1
    // acceptable for directory pickers; long-term wants a dedicated
    // GSI for "all active patients".
    const r = await ddb.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: "#sk = :meta AND #s = :active",
      ExpressionAttributeNames: { "#sk": "SK", "#s": "status" },
      ExpressionAttributeValues: { ":meta": "META_LATEST", ":active": "ACTIVE" },
      Limit: limit * 4,
    }));
    items = (r.Items || []).slice(0, limit);
  }
  const out = items.map(toPatientPick);
  return q ? out.filter((p) => matchesQuery(`${p.name} ${p.mrn} ${p.bedNo}`, q)) : out;
}

export async function listStaff(deps, { department, role, q, limit = 50 } = {}) {
  const { ddb, TABLE, INDEX } = deps;
  let items = [];
  if (department) {
    const roleSeg = role ? role.toUpperCase() : "DOCTOR";
    const r = await ddb.send(new QueryCommand({
      TableName: TABLE,
      IndexName: INDEX.DEPT_INDEX,
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: { ":pk": `DEPT#${department}#ROLE#${roleSeg}` },
      Limit: limit,
    }));
    items = r.Items || [];
  } else {
    const r = await ddb.send(new ScanCommand({
      TableName: TABLE,
      FilterExpression: "begins_with(SK, :user) OR entity = :staff",
      ExpressionAttributeValues: { ":user": "USER#", ":staff": "STAFF_PROFILE" },
      Limit: limit * 4,
    }));
    items = (r.Items || []).slice(0, limit);
  }
  const out = items.map(toStaffPick);
  return q ? out.filter((s) => matchesQuery(`${s.name} ${s.email} ${s.role}`, q)) : out;
}
