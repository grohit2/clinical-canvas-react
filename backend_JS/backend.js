// index.mjs — Node 22 Lambda (ESM) — HMS Patients API with UI-shaped JSON + CORS + optional S3 folder touch

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  ScanCommand
} from "@aws-sdk/lib-dynamodb";

// OPTIONAL: touch a "folder" placeholder in S3 on create (requires bundling @aws-sdk/client-s3)
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE = process.env.TABLE_NAME || "HMS";
const DEPT_INDEX = "GSI1PK-index"; // GSI: partition key attribute is GSI1PK
const MEDIA_BUCKET = process.env.MEDIA_BUCKET || ""; // optional

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION }),
  { marshallOptions: { removeUndefinedValues: true } }
);

const s3 = MEDIA_BUCKET ? new S3Client({ region: REGION }) : null;

/* ------------ helpers ------------- */
const nowISO = () => new Date().toISOString();

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

const resp = (statusCode, bodyObj) => ({
  statusCode,
  headers: JSON_HEADERS,
  body: JSON.stringify(bodyObj),
});

const parseBody = (e) => {
  try { return e && e.body ? JSON.parse(e.body) : {}; } catch { return {}; }
};

const methodOf = (e) => e?.requestContext?.http?.method || e?.httpMethod || "GET";
const pathOf   = (e) => e?.rawPath || e?.path || "";

/* Updatable fields stored in snake_case in DynamoDB */
const UPDATABLE = new Set([
  "name","age","sex","qr_code","pathway","current_state","diagnosis",
  "department","status","comorbidities","assigned_doctor","files_url"
]);

/** Map a stored snake_case item -> UI camelCase PatientMeta minimal shape */
const toUiPatient = (it) => ({
  id: it?.mrn,                         // UI uses :id, but that is the MRN
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
  assignedDoctor: it?.assigned_doctor,
  qrCode: it?.qr_code,
  filesUrl: it?.files_url,
  updateCounter: it?.update_counter ?? 0,
  lastUpdated: it?.last_updated,
});

/** Optionally create a zero-byte "folder" object so the S3 console shows the prefix */
const touchS3Folder = async (mrn) => {
  if (!s3 || !MEDIA_BUCKET) return;
  const key = `patients/${mrn}/`;
  try {
    await s3.send(new PutObjectCommand({
      Bucket: MEDIA_BUCKET,
      Key: key,
      Body: "",
      ContentType: "application/x-directory",
    }));
  } catch (e) {
    console.warn("S3 folder touch failed:", e?.message || e);
  }
};

/* ------------ handler ------------- */
export const handler = async (event = {}) => {
  const method = methodOf(event);
  const path   = pathOf(event);

  // CORS preflight
  if (method === "OPTIONS") {
    return { statusCode: 204, headers: JSON_HEADERS, body: "" };
  }

  // inputs for GET modes
  const mrn =
    event.mrn ||
    event?.pathParameters?.mrn ||
    event?.queryStringParameters?.mrn;

  const department =
    event.department ||
    event?.queryStringParameters?.department;

  try {
    /* ========= CREATE =========
       POST /patients
       body: { mrn, name, department, pathway?, current_state?, diagnosis?, age?, sex?, ... }
    */
    if (method === "POST" && /^\/?patients\/?$/.test(path)) {
      const body = parseBody(event);
      if (!body?.mrn || !body?.name || !body?.department) {
        return resp(400, { error: "mrn, name, department are required" });
      }

      const now = nowISO();
      const item = {
        PK: `PATIENT#${body.mrn}`,
        SK: "META_LATEST",

        patient_id: body.mrn,
        mrn: body.mrn,
        name: body.name,
        age: body.age,
        sex: body.sex,
        qr_code: body.qr_code ?? `https://clinical-canvas.com/qr/${body.mrn}`,
        pathway: body.pathway,
        current_state: body.current_state,
        diagnosis: body.diagnosis,
        department: body.department,
        status: "ACTIVE",
        comorbidities: Array.isArray(body.comorbidities) ? body.comorbidities : [],

        state_dates: body.current_state ? { [body.current_state]: now } : {},

        update_counter: 0,
        last_updated: now,
        created_at: now,
        updated_at: now,
        version_ts: now,

        // GSI for department + status
        GSI1PK: `DEPT#${body.department}#ACTIVE`,
      };

      await ddb.send(new PutCommand({
        TableName: TABLE,
        Item: item,
        ConditionExpression: "attribute_not_exists(PK)" // do not overwrite existing MRN
      }));

      // optional S3 "folder"
      await touchS3Folder(body.mrn);

      // Return minimal UI-shaped patient (nice DX) + message
      return resp(201, { message: "created", mrn: body.mrn, patient: toUiPatient(item) });
    }

    /* ========= UPDATE =========
       PUT /patients/{mrn}
       body: any subset of UPDATABLE fields; keeps GSI1PK in sync if dept/status changes
    */
    const putMatch = path.match(/^\/?patients\/([^/]+)\/?$/);
    if (method === "PUT" && putMatch) {
      const id = decodeURIComponent(putMatch[1]);

      // load existing
      const cur = await ddb.send(new GetCommand({
        TableName: TABLE,
        Key: { PK: `PATIENT#${id}`, SK: "META_LATEST" }
      }));
      if (!cur.Item) return resp(404, { error: "Patient not found" });

      const body = parseBody(event);
      if (!body || Object.keys(body).length === 0) {
        return resp(400, { error: "empty update" });
      }

      const now = nowISO();
      let   setExpr = "SET updated_at = :now, last_updated = :now";
      const names  = {};
      const values = { ":now": now, ":one": 1 };

      // apply simple fields (snake_case)
      for (const [k, v] of Object.entries(body)) {
        if (!UPDATABLE.has(k)) continue;
        const nameKey = `#${k}`;
        const valueKey = `:${k}`;
        names[nameKey] = k;
        values[valueKey] = v;
        setExpr += `, ${nameKey} = ${valueKey}`;
      }

      // If status/department changed or provided, update GSI1PK accordingly
      const newDept   = body.department ?? cur.Item.department;
      const newStatus = body.status ?? cur.Item.status ?? "ACTIVE";
      setExpr += `, GSI1PK = :gsi`;
      values[":gsi"] = `DEPT#${newDept}#${newStatus}`;

      // If current_state changed, ensure state_dates map exists then set the timestamp
      if (body.current_state && body.current_state !== cur.Item.current_state) {
        names["#state_dates"] = "state_dates";
        names["#cs"] = body.current_state;
        values[":emptyMap"] = {};
        setExpr += `, #state_dates = if_not_exists(#state_dates, :emptyMap), #state_dates.#cs = if_not_exists(#state_dates.#cs, :now)`;
      }

      const updateExpr = `${setExpr} ADD update_counter :one`;

      const updated = await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `PATIENT#${id}`, SK: "META_LATEST" },
        UpdateExpression: updateExpr,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: "ALL_NEW"
      }));

      return resp(200, { message: "updated", mrn: id, patient: toUiPatient(updated.Attributes) });
    }

    /* ========= DELETE (soft) =========
       DELETE /patients/{mrn}
       flips status->INACTIVE and GSI1PK->DEPT#<dept>#INACTIVE
    */
    const delMatch = path.match(/^\/?patients\/([^/]+)\/?$/);
    if (method === "DELETE" && delMatch) {
      const id = decodeURIComponent(delMatch[1]);

      // need current department to build GSI1PK
      const cur = await ddb.send(new GetCommand({
        TableName: TABLE,
        Key: { PK: `PATIENT#${id}`, SK: "META_LATEST" }
      }));
      if (!cur.Item) return resp(404, { error: "Patient not found" });

      const now = nowISO();
      const dept = cur.Item.department;

      const updated = await ddb.send(new UpdateCommand({
        TableName: TABLE,
        Key: { PK: `PATIENT#${id}`, SK: "META_LATEST" },
        UpdateExpression:
          "SET #s = :inactive, GSI1PK = :gsi, updated_at = :now, last_updated = :now ADD update_counter :one",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: {
          ":inactive": "INACTIVE",
          ":gsi": `DEPT#${dept}#INACTIVE`,
          ":now": now,
          ":one": 1
        },
        ReturnValues: "ALL_NEW"
      }));

      return resp(200, { message: "soft-deleted", mrn: id, patient: toUiPatient(updated.Attributes) });
    }

    /* ========= READS ========= */

    // Single patient by MRN (query param or /patients/{mrn})
    if (mrn) {
      const data = await ddb.send(new GetCommand({
        TableName: TABLE,
        Key: { PK: `PATIENT#${mrn}`, SK: "META_LATEST" }
      }));
      if (!data.Item) return resp(404, { error: "Patient not found" });
      return resp(200, toUiPatient(data.Item));
    }

    // List ACTIVE patients (optionally by department)
    if (method === "GET" && /^\/?patients\/?$/.test(path)) {
      let items = [];
      if (department) {
        const data = await ddb.send(new QueryCommand({
          TableName: TABLE,
          IndexName: DEPT_INDEX,
          KeyConditionExpression: "GSI1PK = :pk",
          ExpressionAttributeValues: { ":pk": `DEPT#${department}#ACTIVE` }
        }));
        items = data.Items ?? [];
      } else {
        const data = await ddb.send(new ScanCommand({
          TableName: TABLE,
          FilterExpression: "#s = :active AND SK = :latest",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: { ":active": "ACTIVE", ":latest": "META_LATEST" }
        }));
        items = data.Items ?? [];
      }
      // Return UI-shape array
      return resp(200, items.map(toUiPatient));
    }

    // Fallback
    return resp(404, { error: "Route not found" });
  } catch (err) {
    console.error("Lambda error:", err);
    return resp(500, { error: "Internal server error" });
  }
};
