// router.mjs — entrypoint (Node 22 ESM)

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// feature modules
import { mountPatientRoutes } from "./patients.mjs";
import { mountTaskRoutes } from "./tasks.mjs";
import { mountNoteRoutes } from "./notes.mjs";
import { mountMedRoutes } from "./meds.mjs";
import { mountDoctorRoutes } from "./doctors.mjs";
import { mountTimelineRoutes } from "./timeline.mjs";
import { mountChecklistRoutes } from "./checklists.mjs";
import { mountFileRoutes } from "./files.mjs";
import { mountDocumentRoutes } from "./documents.mjs";

/* ---- env & clients ---- */
const REGION = process.env.AWS_REGION || "us-east-1";
const TABLE = process.env.TABLE_NAME || "HMS";

// Patients/Doctors list GSIs
const DEPT_INDEX = "GSI1PK-index";       // must project REG rows (patients) + doctors as you already do
const TASK_GSI  = "GSI2PK-GSI2SK-index"; // existing tasks dashboard index

export const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION }),
  { marshallOptions: { removeUndefinedValues: true } }
);

/* ---- shared helpers ---- */
export const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};
export const nowISO = () => new Date().toISOString();
export const resp = (statusCode, bodyObj) => ({
  statusCode,
  headers: JSON_HEADERS,
  body: JSON.stringify(bodyObj),
});
export const parseBody = (e) => {
  try { return e && e.body ? JSON.parse(e.body) : {}; } catch { return {}; }
};
const methodOf = (e) => e?.requestContext?.http?.method || e?.httpMethod || "GET";
const pathOf   = (e) => e?.rawPath || e?.path || "";
const qsOf     = (e) => e?.queryStringParameters || {};
const clean    = (p) => (p || "").replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);

/* ---- tiny regex router ---- */
class Router {
  constructor(ctx) { this.ctx = ctx; this.routes = []; }
  add(method, pattern, handler) { this.routes.push({ method, pattern, handler }); }
  async handle(event) {
    const method = methodOf(event);
    const path   = pathOf(event);
    const qs     = qsOf(event);
    const parts  = clean(path);

    for (const r of this.routes) {
      if (r.method !== method) continue;
      const m = path.match(r.pattern);
      if (!m) continue;
      return r.handler({ event, qs, parts, match: m, ctx: this.ctx });
    }
    return null;
  }
}

/* ---- bootstrap ----
 * NOTE: All /patients/:id/... routes accept either a **patient UID** or an **MRN**.
 * Modules internally resolve :id → { uid, meta, mrn? } and default to the
 * **current MRN** when the path provided a UID and no explicit mrn is given.
 */
export const handler = async (event = {}) => {
  if (methodOf(event) === "OPTIONS") {
    return { statusCode: 204, headers: JSON_HEADERS, body: "" };
  }

  const ctx = {
    ddb,
    TABLE,
    INDEX: { DEPT_INDEX, TASK_GSI },
    utils: { nowISO, resp, parseBody },
  };

  const router = new Router(ctx);

  // mount feature modules (order doesn't matter)
  mountNoteRoutes(router, ctx);
  mountTaskRoutes(router, ctx);
  mountMedRoutes(router, ctx);
  mountDoctorRoutes(router, ctx);
  mountPatientRoutes(router, ctx);
  mountTimelineRoutes(router, ctx);
  mountChecklistRoutes(router, ctx);
  mountFileRoutes(router, ctx);
  mountDocumentRoutes(router, ctx);

  try {
    const out = await router.handle(event);
    if (out) return out;
    return resp(404, { error: "Route not found" });
  } catch (err) {
    console.error("Lambda error:", err);
    return resp(500, { error: "Internal server error" });
  }
};
