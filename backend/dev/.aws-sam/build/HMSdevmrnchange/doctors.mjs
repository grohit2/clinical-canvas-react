// doctors.mjs — Doctor (StaffProfile) CRUD (Node 22 ESM)

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

/* DB -> UI */
const toUiDoctor = (it = {}) => ({
  doctorId: it.user_id,                 // PK suffix after USER#
  name: it.name,
  role: it.role,                        // "doctor" | "nurse" | ...
  department: it.department ?? null,
  avatar: it.avatar ?? null,
  contactInfo: it.contact_info ?? {},
  permissions: Array.isArray(it.permissions) ? it.permissions : [],
  email: it.email,
  createdAt: it.created_at,
  updatedAt: it.updated_at,
  deleted: !!it.deleted,
});

// simple id generator when client doesn't send one
const newId = () => `doc-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;

/* validation */
const validateCreate = (b) => {
  if (!b?.name) return "name is required";
  if (!b?.email) return "email is required";
  if (b?.contactInfo && typeof b.contactInfo !== "object") return "contactInfo must be object";
  if (b?.permissions && !Array.isArray(b.permissions)) return "permissions must be array";
  return null;
};
const validatePatch = (b) => {
  if (!b || typeof b !== "object" || Object.keys(b).length === 0) return "empty update";
  if (b?.contactInfo && typeof b.contactInfo !== "object") return "contactInfo must be object";
  if (b?.permissions && !Array.isArray(b.permissions)) return "permissions must be array";
  return null;
};

/**
 * Expected item shape for doctors:
 *   PK = "USER#{doctorId}"
 *   SK = "PROFILE"
 *   GSI1PK = "DEPT#{department}#ROLE#DOCTOR"  // present ONLY while active & assigned to a department
 */
export function mountDoctorRoutes(router, ctx) {
  const { ddb, TABLE, INDEX, utils } = ctx;
  const { nowISO, resp, parseBody } = utils;

  /* ---------------- CREATE ----------------
     POST /doctors
     body: { userId?, name, email, department?, role?="doctor", avatar?, contactInfo?, permissions?[] }
  */
  router.add("POST", /^\/?doctors\/?$/, async ({ event }) => {
    const body = parseBody(event);
    const err = validateCreate(body);
    if (err) return resp(400, { error: err });

    const now = nowISO();
    const userId = body.userId || newId();

    const item = {
      PK: `USER#${userId}`,
      SK: "PROFILE",
      user_id: userId,
      name: body.name,
      role: body.role || "doctor",
      department: body.department ?? null,
      avatar: body.avatar ?? null,
      contact_info: body.contactInfo ?? {},
      permissions: body.permissions ?? [],
      email: body.email,
      created_at: now,
      updated_at: now,
      deleted: false,
      // put on the department GSI only if department is set and not deleted
      ...(body.department ? { GSI1PK: `DEPT#${body.department}#ROLE#DOCTOR` } : {}),
    };

    await ddb.send(new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(PK)", // do not overwrite
    }));

    return resp(201, { message: "created", doctor: toUiDoctor(item) });
  });

  /* ---------------- READ ONE ----------------
     GET /doctors/{doctorId} — by PK/SK
  */
  router.add("GET", /^\/?doctors\/([^/]+)\/?$/, async ({ match }) => {
    const doctorId = decodeURIComponent(match[1]);

    const g = await ddb.send(new GetCommand({
      TableName: TABLE,
      Key: { PK: `USER#${doctorId}`, SK: "PROFILE" },
    }));

    if (!g.Item) return resp(404, { error: "Doctor not found" });
    return resp(200, toUiDoctor(g.Item));
  });

  /* ---------------- LIST BY DEPARTMENT ----------------
     GET /doctors?department=Cardiology — via GSI1PK
     (returns only active, non-deleted doctors because we only project active rows to GSI)
  */
  router.add("GET", /^\/?doctors\/?$/, async ({ qs }) => {
    const department = qs?.department;
    if (!department) return resp(400, { error: "department is required" });

    const q = await ddb.send(new QueryCommand({
      TableName: TABLE,
      IndexName: INDEX.DEPT_INDEX,               // "GSI1PK-index"
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `DEPT#${department}#ROLE#DOCTOR`,
      },
    }));

    const items = q.Items || [];
    return resp(200, items.map(toUiDoctor));
  });

  /* ---------------- UPDATE ----------------
     PATCH /doctors/{doctorId}
     body: any subset of { name, email, department, role, avatar, contactInfo, permissions }
     - If department changes:
       * set GSI1PK to new "DEPT#<dept>#ROLE#DOCTOR" if dept is truthy
       * else REMOVE GSI1PK (doctor won’t appear in dept listing)
  */
  router.add("PATCH", /^\/?doctors\/([^/]+)\/?$/, async ({ match, event }) => {
    const doctorId = decodeURIComponent(match[1]);
    const body = parseBody(event);
    const err = validatePatch(body);
    if (err) return resp(400, { error: err });

    const names = {};
    const values = { ":now": nowISO() };
    let setExpr = "SET updated_at = :now";

    const map = {
      name: "name",
      email: "email",
      department: "department",
      role: "role",
      avatar: "avatar",
      contactInfo: "contact_info",
      permissions: "permissions",
    };

    for (const [jsKey, dbKey] of Object.entries(map)) {
      if (body[jsKey] !== undefined) {
        const nk = `#${dbKey}`, vk = `:${dbKey}`;
        names[nk] = dbKey;
        values[vk] = body[jsKey];
        setExpr += `, ${nk} = ${vk}`;
      }
    }

    // first update main fields
    try {
      const updated = await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `USER#${doctorId}`, SK: "PROFILE" },
        ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
        UpdateExpression: setExpr,
        ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
        ExpressionAttributeValues: values,
        ReturnValues: "ALL_NEW",
      }));

      // If department was explicitly provided, adjust GSI1PK
      if ("department" in body) {
        const hasDept = body.department && String(body.department).length > 0;
        if (hasDept) {
          await ddb.send(new UpdateCommand({
            TableName: TABLE,
            Key: { PK: `USER#${doctorId}`, SK: "PROFILE" },
            UpdateExpression: "SET GSI1PK = :g",
            ExpressionAttributeValues: { ":g": `DEPT#${body.department}#ROLE#DOCTOR` },
          }));
        } else {
          await ddb.send(new UpdateCommand({
            TableName: TABLE,
            Key: { PK: `USER#${doctorId}`, SK: "PROFILE" },
            UpdateExpression: "REMOVE GSI1PK",
          }));
        }
      }

      // refetch (optional) or reuse updated.Attributes
      return resp(200, { message: "updated", doctor: toUiDoctor(updated.Attributes) });
    } catch (e) {
      if (e?.name === "ConditionalCheckFailedException") {
        return resp(404, { error: "Doctor not found" });
      }
      throw e;
    }
  });

  /* ---------------- DELETE (soft) ----------------
     DELETE /doctors/{doctorId}
     - marks deleted=true
     - removes GSI1PK so they no longer show up in dept listing
  */
  router.add("DELETE", /^\/?doctors\/([^/]+)\/?$/, async ({ match }) => {
    const doctorId = decodeURIComponent(match[1]);
    const now = nowISO();

    try {
      const upd = await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `USER#${doctorId}`, SK: "PROFILE" },
        ConditionExpression: "attribute_exists(PK) AND attribute_exists(SK)",
        UpdateExpression: "SET deleted = :t, updated_at = :now REMOVE GSI1PK",
        ExpressionAttributeValues: { ":t": true, ":now": now },
        ReturnValues: "ALL_NEW",
      }));
      return resp(200, { message: "deleted", doctor: toUiDoctor(upd.Attributes) });
    } catch (e) {
      if (e?.name === "ConditionalCheckFailedException") {
        return resp(404, { error: "Doctor not found" });
      }
      throw e;
    }
  });
}
