// index.mjs
export { handler } from "./router.mjs";

// // index.mjs — Node 22 Lambda (ESM) — HMS Patients + Tasks API with UI-shaped JSON + CORS (+ optional S3 touch)

// import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
// import {
//   DynamoDBDocumentClient,
//   GetCommand,
//   PutCommand,
//   UpdateCommand,
//   QueryCommand,
//   ScanCommand
// } from "@aws-sdk/lib-dynamodb";

// // OPTIONAL: touch a "folder" placeholder in S3 on create (requires bundling @aws-sdk/client-s3)
// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// const REGION = process.env.AWS_REGION || "us-east-1";
// const TABLE = process.env.TABLE_NAME || "HMS";

// // Patients list GSI (existing)
// const DEPT_INDEX = "GSI1PK-index"; // PK attribute: GSI1PK

// // Tasks dashboard GSI (NEW – create in table: PK=GSI2PK, SK=GSI2SK)
// const TASK_GSI = "TaskDeptAssignee";

// const ddb = DynamoDBDocumentClient.from(
//   new DynamoDBClient({ region: REGION }),
//   { marshallOptions: { removeUndefinedValues: true } }
// );

// const MEDIA_BUCKET = process.env.MEDIA_BUCKET || ""; // optional
// const s3 = MEDIA_BUCKET ? new S3Client({ region: REGION }) : null;

// /* ------------ helpers ------------- */
// const nowISO = () => new Date().toISOString();

// const JSON_HEADERS = {
//   "Content-Type": "application/json; charset=utf-8",
//   "Access-Control-Allow-Origin": "*",
//   "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
//   "Access-Control-Allow-Headers": "Content-Type,Authorization",
// };

// const resp = (statusCode, bodyObj) => ({
//   statusCode,
//   headers: JSON_HEADERS,
//   body: JSON.stringify(bodyObj),
// });

// const parseBody = (e) => {
//   try { return e && e.body ? JSON.parse(e.body) : {}; } catch { return {}; }
// };

// const methodOf = (e) => e?.requestContext?.http?.method || e?.httpMethod || "GET";
// const pathOf   = (e) => e?.rawPath || e?.path || "";

// const cleanParts = (p) => (p || "").replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);

// /* Updatable fields stored in snake_case in DynamoDB (patients) */
// const UPDATABLE = new Set([
//   "name","age","sex","qr_code","pathway","current_state","diagnosis",
//   "department","status","comorbidities","assigned_doctor","files_url"
// ]);

// /** Map a stored snake_case item -> UI camelCase PatientMeta minimal shape */
// const toUiPatient = (it) => ({
//   id: it?.mrn,                         // UI uses :id, but that is the MRN
//   mrn: it?.mrn,
//   name: it?.name,
//   department: it?.department,
//   status: it?.status,
//   pathway: it?.pathway,
//   currentState: it?.current_state,
//   diagnosis: it?.diagnosis,
//   age: it?.age,
//   sex: it?.sex,
//   comorbidities: Array.isArray(it?.comorbidities) ? it.comorbidities : [],
//   assignedDoctor: it?.assigned_doctor,
//   qrCode: it?.qr_code,
//   filesUrl: it?.files_url,
//   updateCounter: it?.update_counter ?? 0,
//   lastUpdated: it?.last_updated,
// });

// /** Tasks: map DB -> UI (camelCase) */
// const toUiTask = (it = {}) => ({
//   taskId: it.task_id,
//   patientId: it.patient_id,
//   title: it.title,
//   type: it.type,
//   due: it.due,
//   assigneeId: it.assignee_id,
//   status: it.status,
//   priority: it.priority,
//   recurring: !!it.recurring,
//   recurrence: it.recurrence || null,     // { frequency, until?, daysOfWeek? }
//   details: it.details || null,
//   department: it.department || null,
//   createdAt: it.created_at,
//   updatedAt: it.updated_at,
// });

// const ALLOWED_TASK_TYPES = new Set(["lab","medication","procedure","assessment","discharge"]);
// const ALLOWED_TASK_STATUS = new Set(["open","in-progress","done","cancelled"]);
// const ALLOWED_TASK_PRIORITY = new Set(["low","medium","high","urgent"]);

// const validateTaskBody = (b, { partial = false } = {}) => {
//   const bad = (m) => ({ ok:false, error:m });
//   if (!partial) {
//     if (!b?.title) return bad("title is required");
//     if (!b?.type || !ALLOWED_TASK_TYPES.has(b.type)) return bad("invalid type");
//     if (!b?.due) return bad("due is required (ISO string)");
//     if (!b?.assigneeId) return bad("assigneeId is required");
//     // department can be derived from patient, but allow override
//   }
//   if (b?.type && !ALLOWED_TASK_TYPES.has(b.type)) return bad("invalid type");
//   if (b?.status && !ALLOWED_TASK_STATUS.has(b.status)) return bad("invalid status");
//   if (b?.priority && !ALLOWED_TASK_PRIORITY.has(b.priority)) return bad("invalid priority");
//   if (b?.recurrence && typeof b.recurrence !== "object") return bad("recurrence must be an object");
//   return { ok:true };
// };

// const newId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// /** Build tasks GSI projection */
// const buildTaskGSI = ({ status, department, assigneeId, recurring, taskId }) => ({
//   GSI2PK: `TASK#${(status || "open").toUpperCase()}#DEPT#${department}`,
//   GSI2SK: `ASSIGNEE#${assigneeId}#RECURRING#${recurring ? "YES" : "NO"}#TASK#${taskId}`,
// });

// /** Optionally create a zero-byte "folder" object so the S3 console shows the prefix */
// const touchS3Folder = async (mrn) => {
//   if (!s3 || !MEDIA_BUCKET) return;
//   const key = `patients/${mrn}/`;
//   try {
//     await s3.send(new PutObjectCommand({
//       Bucket: MEDIA_BUCKET,
//       Key: key,
//       Body: "",
//       ContentType: "application/x-directory",
//     }));
//   } catch (e) {
//     console.warn("S3 folder touch failed:", e?.message || e);
//   }
// };

// /* ------------ handler ------------- */
// export const handler = async (event = {}) => {
//   const method = methodOf(event);
//   const path   = pathOf(event);
//   const parts  = cleanParts(path);

//   // CORS preflight
//   if (method === "OPTIONS") {
//     return { statusCode: 204, headers: JSON_HEADERS, body: "" };
//   }

//   // inputs for GET modes (patients)
//   const mrn =
//     event.mrn ||
//     event?.pathParameters?.mrn ||
//     event?.queryStringParameters?.mrn;

//   const departmentQS =
//     event.department ||
//     event?.queryStringParameters?.department;

//   try {
//     /* ========= TASKS: PATIENT-SCOPED =========
//        Routes:
//        GET    /patients/{mrn}/tasks?status=&limit=
//        POST   /patients/{mrn}/tasks
//        PATCH  /patients/{mrn}/tasks/{taskId}
//        DELETE /patients/{mrn}/tasks/{taskId}
//     */

//     // POST /patients/{mrn}/tasks
//     if (method === "POST" && parts.length === 3 && parts[0] === "patients" && parts[2] === "tasks") {
//       const mrnParam = decodeURIComponent(parts[1]);

//       // ensure patient exists + get department if not passed
//       const cur = await ddb.send(new GetCommand({
//         TableName: TABLE,
//         Key: { PK: `PATIENT#${mrnParam}`, SK: "META_LATEST" }
//       }));
//       if (!cur.Item) return resp(404, { error: "Patient not found" });

//       const body = parseBody(event);
//       const v = validateTaskBody(body, { partial: false });
//       if (!v.ok) return resp(400, { error: v.error });

//       const now = nowISO();
//       const taskId = body.taskId || newId();
//       const status = body.status || "open";
//       const dept   = body.department || cur.Item.department;

//       const item = {
//         PK: `PATIENT#${mrnParam}`,
//         SK: `TASK#${taskId}`,
//         task_id: taskId,
//         patient_id: mrnParam,
//         title: body.title,
//         type: body.type,
//         due: body.due,
//         assignee_id: body.assigneeId,
//         status,
//         priority: body.priority || "medium",
//         recurring: !!body.recurring,
//         recurrence: body.recurrence || null,   // { frequency, until?, daysOfWeek? }
//         details: body.details || null,
//         department: dept,                      // denorm for GSI
//         created_at: now,
//         updated_at: now,
//         ...buildTaskGSI({ status, department: dept, assigneeId: body.assigneeId, recurring: !!body.recurring, taskId }),
//       };

//       await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
//       return resp(201, { message: "created", task: toUiTask(item) });
//     }

//     // GET /patients/{mrn}/tasks
//     if (method === "GET" && parts.length === 3 && parts[0] === "patients" && parts[2] === "tasks") {
//       const mrnParam = decodeURIComponent(parts[1]);
//       const qs = event?.queryStringParameters || {};
//       const statusFilter = qs.status;
//       const limit = Math.min(Number(qs.limit || 100), 200);

//       const q = await ddb.send(new QueryCommand({
//         TableName: TABLE,
//         KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
//         ExpressionAttributeValues: { ":pk": `PATIENT#${mrnParam}`, ":sk": "TASK#" },
//         Limit: limit,
//       }));
//       let items = q.Items || [];
//       if (statusFilter) items = items.filter(i => i.status === statusFilter);
//       items.sort((a,b) => (a.due || "~~~~").localeCompare(b.due || "~~~~")); // by due asc
//       return resp(200, items.map(toUiTask));
//     }

//     // PATCH /patients/{mrn}/tasks/{taskId}
//     if (method === "PATCH" && parts.length === 4 && parts[0] === "patients" && parts[2] === "tasks") {
//       const mrnParam = decodeURIComponent(parts[1]);
//       const taskId = decodeURIComponent(parts[3]);

//       const body = parseBody(event);
//       const v = validateTaskBody(body, { partial: true });
//       if (!v.ok) return resp(400, { error: v.error });

//       const names = {};
//       const values = { ":now": nowISO() };
//       let setExpr = "SET updated_at = :now";

//       const fieldMap = {
//         title: "title",
//         type: "type",
//         due: "due",
//         assigneeId: "assignee_id",
//         status: "status",
//         priority: "priority",
//         recurring: "recurring",
//         recurrence: "recurrence",
//         details: "details",
//         department: "department",
//       };

//       for (const [jsKey, dbKey] of Object.entries(fieldMap)) {
//         if (body[jsKey] !== undefined) {
//           const nk = `#${dbKey}`, vk = `:${dbKey}`;
//           names[nk] = dbKey;
//           values[vk] = body[jsKey];
//           setExpr += `, ${nk} = ${vk}`;
//         }
//       }

//       const updated = await ddb.send(new UpdateCommand({
//         TableName: TABLE,
//         Key: { PK: `PATIENT#${mrnParam}`, SK: `TASK#${taskId}` },
//         UpdateExpression: setExpr,
//         ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
//         ExpressionAttributeValues: values,
//         ReturnValues: "ALL_NEW",
//       }));

//       // Rebuild GSI2 if any of: status/department/assignee_id/recurring changed
//       const u = updated.Attributes || {};
//       if (["status","department","assigneeId","assignee_id","recurring"].some(k => k in body)) {
//         await ddb.send(new UpdateCommand({
//           TableName: TABLE,
//           Key: { PK: `PATIENT#${mrnParam}`, SK: `TASK#${taskId}` },
//           UpdateExpression: "SET GSI2PK = :pk, GSI2SK = :sk",
//           ExpressionAttributeValues: {
//             ":pk": `TASK#${(u.status || "open").toUpperCase()}#DEPT#${u.department}`,
//             ":sk": `ASSIGNEE#${u.assignee_id}#RECURRING#${u.recurring ? "YES" : "NO"}#TASK#${u.task_id}`,
//           },
//         }));
//       }

//       return resp(200, { message: "updated", task: toUiTask(updated.Attributes) });
//     }

//     // DELETE /patients/{mrn}/tasks/{taskId} (soft cancel)
//     if (method === "DELETE" && parts.length === 4 && parts[0] === "patients" && parts[2] === "tasks") {
//       const mrnParam = decodeURIComponent(parts[1]);
//       const taskId = decodeURIComponent(parts[3]);

//       const now = nowISO();
//       const updated = await ddb.send(new UpdateCommand({
//         TableName: TABLE,
//         Key: { PK: `PATIENT#${mrnParam}`, SK: `TASK#${taskId}` },
//         UpdateExpression: "SET #s = :cancelled, updated_at = :now",
//         ExpressionAttributeNames: { "#s": "status" },
//         ExpressionAttributeValues: { ":cancelled": "cancelled", ":now": now },
//         ReturnValues: "ALL_NEW",
//       }));

//       // update GSI2 to reflect new status
//       const u = updated.Attributes || {};
//       await ddb.send(new UpdateCommand({
//         TableName: TABLE,
//         Key: { PK: `PATIENT#${mrnParam}`, SK: `TASK#${taskId}` },
//         UpdateExpression: "SET GSI2PK = :pk, GSI2SK = :sk",
//         ExpressionAttributeValues: {
//           ":pk": `TASK#CANCELLED#DEPT#${u.department}`,
//           ":sk": `ASSIGNEE#${u.assignee_id}#RECURRING#${u.recurring ? "YES" : "NO"}#TASK#${u.task_id}`,
//         },
//       }));

//       return resp(200, { message: "deleted" });
//     }

//     /* ========= TASKS: DEPARTMENT/DOCTOR DASHBOARD =========
//        GET /tasks?department=Cardiology&status=open&assigneeId=doctor-123&limit=50
//        Uses GSI2; if assigneeId present we begins_with(GSI2SK, 'ASSIGNEE#doctor-123')
//     */
//     if (method === "GET" && parts.length === 1 && parts[0] === "tasks") {
//       const qs = event?.queryStringParameters || {};
//       const department = qs.department;
//       const status = (qs.status || "open").toUpperCase();
//       const assigneeId = qs.assigneeId;       // optional
//       const limit = Math.min(Number(qs.limit || 100), 200);

//       if (!department) return resp(400, { error: "department is required" });

//       const base = {
//         TableName: TABLE,
//         IndexName: TASK_GSI,
//         KeyConditionExpression: "GSI2PK = :pk",
//         ExpressionAttributeValues: { ":pk": `TASK#${status}#DEPT#${department}` },
//         Limit: limit,
//         ScanIndexForward: true,
//       };

//       if (assigneeId) {
//         base.KeyConditionExpression += " AND begins_with(GSI2SK, :sk)";
//         base.ExpressionAttributeValues[":sk"] = `ASSIGNEE#${assigneeId}`;
//       }

//       const q = await ddb.send(new QueryCommand(base));
//       return resp(200, (q.Items || []).map(toUiTask));
//     }

//     /* ========= PATIENTS =========
//        (existing endpoints preserved)
//     */

//     /* ========= CREATE PATIENT =========
//        POST /patients
//        body: { mrn, name, department, pathway?, current_state?, diagnosis?, age?, sex?, ... }
//     */
//     if (method === "POST" && /^\/?patients\/?$/.test(path)) {
//       const body = parseBody(event);
//       if (!body?.mrn || !body?.name || !body?.department) {
//         return resp(400, { error: "mrn, name, department are required" });
//       }

//       const now = nowISO();
//       const item = {
//         PK: `PATIENT#${body.mrn}`,
//         SK: "META_LATEST",

//         patient_id: body.mrn,
//         mrn: body.mrn,
//         name: body.name,
//         age: body.age,
//         sex: body.sex,
//         qr_code: body.qr_code ?? `https://clinical-canvas.com/qr/${body.mrn}`,
//         pathway: body.pathway,
//         current_state: body.current_state,
//         diagnosis: body.diagnosis,
//         department: body.department,
//         status: "ACTIVE",
//         comorbidities: Array.isArray(body.comorbidities) ? body.comorbidities : [],

//         state_dates: body.current_state ? { [body.current_state]: now } : {},

//         update_counter: 0,
//         last_updated: now,
//         created_at: now,
//         updated_at: now,
//         version_ts: now,

//         // GSI for department + status
//         GSI1PK: `DEPT#${body.department}#ACTIVE`,
//       };

//       await ddb.send(new PutCommand({
//         TableName: TABLE,
//         Item: item,
//         ConditionExpression: "attribute_not_exists(PK)" // do not overwrite existing MRN
//       }));

//       // optional S3 "folder"
//       await touchS3Folder(body.mrn);

//       // Return minimal UI-shaped patient (nice DX) + message
//       return resp(201, { message: "created", mrn: body.mrn, patient: toUiPatient(item) });
//     }

//     /* ========= UPDATE PATIENT =========
//        PUT /patients/{mrn}
//        body: any subset of UPDATABLE fields; keeps GSI1PK in sync if dept/status changes
//     */
//     const putMatch = path.match(/^\/?patients\/([^/]+)\/?$/);
//     if (method === "PUT" && putMatch) {
//       const id = decodeURIComponent(putMatch[1]);

//       // load existing
//       const cur = await ddb.send(new GetCommand({
//         TableName: TABLE,
//         Key: { PK: `PATIENT#${id}`, SK: "META_LATEST" }
//       }));
//       if (!cur.Item) return resp(404, { error: "Patient not found" });

//       const body = parseBody(event);
//       if (!body || Object.keys(body).length === 0) {
//         return resp(400, { error: "empty update" });
//       }

//       const now = nowISO();
//       let   setExpr = "SET updated_at = :now, last_updated = :now";
//       const names  = {};
//       const values = { ":now": now, ":one": 1 };

//       // apply simple fields (snake_case)
//       for (const [k, v] of Object.entries(body)) {
//         if (!UPDATABLE.has(k)) continue;
//         const nameKey = `#${k}`;
//         const valueKey = `:${k}`;
//         names[nameKey] = k;
//         values[valueKey] = v;
//         setExpr += `, ${nameKey} = ${valueKey}`;
//       }

//       // If status/department changed or provided, update GSI1PK accordingly
//       const newDept   = body.department ?? cur.Item.department;
//       const newStatus = body.status ?? cur.Item.status ?? "ACTIVE";
//       setExpr += `, GSI1PK = :gsi`;
//       values[":gsi"] = `DEPT#${newDept}#${newStatus}`;

//       // If current_state changed, ensure state_dates map exists then set the timestamp
//       if (body.current_state && body.current_state !== cur.Item.current_state) {
//         names["#state_dates"] = "state_dates";
//         names["#cs"] = body.current_state;
//         values[":emptyMap"] = {};
//         setExpr += `, #state_dates = if_not_exists(#state_dates, :emptyMap), #state_dates.#cs = if_not_exists(#state_dates.#cs, :now)`;
//       }

//       const updateExpr = `${setExpr} ADD update_counter :one`;

//       const updated = await ddb.send(new UpdateCommand({
//         TableName: TABLE,
//         Key: { PK: `PATIENT#${id}`, SK: "META_LATEST" },
//         UpdateExpression: updateExpr,
//         ExpressionAttributeNames: names,
//         ExpressionAttributeValues: values,
//         ReturnValues: "ALL_NEW"
//       }));

//       return resp(200, { message: "updated", mrn: id, patient: toUiPatient(updated.Attributes) });
//     }

//     /* ========= DELETE PATIENT (soft) =========
//        DELETE /patients/{mrn}
//        flips status->INACTIVE and GSI1PK->DEPT#<dept>#INACTIVE
//     */
//     const delMatch = path.match(/^\/?patients\/([^/]+)\/?$/);
//     if (method === "DELETE" && delMatch) {
//       const id = decodeURIComponent(delMatch[1]);

//       // need current department to build GSI1PK
//       const cur = await ddb.send(new GetCommand({
//         TableName: TABLE,
//         Key: { PK: `PATIENT#${id}`, SK: "META_LATEST" }
//       }));
//       if (!cur.Item) return resp(404, { error: "Patient not found" });

//       const now = nowISO();
//       const dept = cur.Item.department;

//       const updated = await ddb.send(new UpdateCommand({
//         TableName: TABLE,
//         Key: { PK: `PATIENT#${id}`, SK: "META_LATEST" },
//         UpdateExpression:
//           "SET #s = :inactive, GSI1PK = :gsi, updated_at = :now, last_updated = :now ADD update_counter :one",
//         ExpressionAttributeNames: { "#s": "status" },
//         ExpressionAttributeValues: {
//           ":inactive": "INACTIVE",
//           ":gsi": `DEPT#${dept}#INACTIVE`,
//           ":now": now,
//           ":one": 1
//         },
//         ReturnValues: "ALL_NEW"
//       }));

//       return resp(200, { message: "soft-deleted", mrn: id, patient: toUiPatient(updated.Attributes) });
//     }

//     /* ========= READS ========= */

//     // Single patient by MRN (query param or /patients/{mrn})
//     if (mrn) {
//       const data = await ddb.send(new GetCommand({
//         TableName: TABLE,
//         Key: { PK: `PATIENT#${mrn}`, SK: "META_LATEST" }
//       }));
//       if (!data.Item) return resp(404, { error: "Patient not found" });
//       return resp(200, toUiPatient(data.Item));
//     }

//     // List ACTIVE patients (optionally by department)
//     if (method === "GET" && /^\/?patients\/?$/.test(path)) {
//       let items = [];
//       if (departmentQS) {
//         const data = await ddb.send(new QueryCommand({
//           TableName: TABLE,
//           IndexName: DEPT_INDEX,
//           KeyConditionExpression: "GSI1PK = :pk",
//           ExpressionAttributeValues: { ":pk": `DEPT#${departmentQS}#ACTIVE` }
//         }));
//         items = data.Items ?? [];
//       } else {
//         const data = await ddb.send(new ScanCommand({
//           TableName: TABLE,
//           FilterExpression: "#s = :active AND SK = :latest",
//           ExpressionAttributeNames: { "#s": "status" },
//           ExpressionAttributeValues: { ":active": "ACTIVE", ":latest": "META_LATEST" }
//         }));
//         items = data.Items ?? [];
//       }
//       // Return UI-shape array
//       return resp(200, items.map(toUiPatient));
//     }

//     // Fallback
//     return resp(404, { error: "Route not found" });
//   } catch (err) {
//     console.error("Lambda error:", err);
//     return resp(500, { error: "Internal server error" });
//   }
// };
