# HMS Patients API (Lambda)

This document provides the OpenAPI specification, example requests, and local development proxy setup for integrating the frontend with the HMS Patients Lambda.

## OpenAPI Specification

```yaml
openapi: 3.1.0
info:
  title: HMS Patients API (Lambda)
  version: 1.0.0
servers:
  - url: https://{apiId}.execute-api.{region}.amazonaws.com/{stage}
    variables:
      apiId: { default: YOUR_API_ID }
      region: { default: us-east-1 }
      stage: { default: prod }
paths:
  /patients:
    get:
      summary: List ACTIVE patients (optionally by department)
      parameters:
        - in: query
          name: department
          schema: { type: string, example: surgery1 }
          description: Filter to a department. When absent, returns all ACTIVE patients.
      responses:
        '200':
          description: Array of patient objects
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Patient' }
        '500':
          description: Internal server error
          content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } }
    post:
      summary: Create patient (soft “insert”)
      description: Builds PK=PATIENT#{mrn}, SK=META_LATEST, sets GSI1PK=DEPT#{department}#ACTIVE
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PatientCreate'
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                type: object
                properties:
                  message: { type: string, example: created }
                  mrn: { type: string, example: patient-003 }
        '400': { description: Missing required fields, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
        '500': { description: Internal server error, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
  /patients/{mrn}:
    get:
      summary: Get single patient (latest snapshot)
      parameters:
        - in: path
          name: mrn
          required: true
          schema: { type: string, example: patient-001 }
      responses:
        '200':
          description: Patient object
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Patient' }
        '404': { description: Not found, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
        '500': { description: Internal server error, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
    put:
      summary: Update patient (partial)
      description: >
        Accepts any subset of updatable fields. Keeps GSI1PK in sync if department or status changes.
      parameters:
        - in: path
          name: mrn
          required: true
          schema: { type: string }
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/PatientUpdate' }
      responses:
        '200': { description: Updated, content: { application/json: { schema: { type: object, properties: { message: { type: string }, mrn: { type: string } } } } } }
        '400': { description: Empty update or invalid fields, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
        '404': { description: Not found, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
        '500': { description: Internal server error, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
    delete:
      summary: Soft-delete patient
      description: Sets status=INACTIVE and GSI1PK=DEPT#{department}#INACTIVE (no physical delete).
      parameters:
        - in: path
          name: mrn
          required: true
          schema: { type: string }
      responses:
        '200': { description: Soft-deleted, content: { application/json: { schema: { type: object, properties: { message: { type: string }, mrn: { type: string } } } } } }
        '404': { description: Not found, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
        '500': { description: Internal server error, content: { application/json: { schema: { $ref: '#/components/schemas/Error' } } } }
components:
  schemas:
    Patient:
      type: object
      properties:
        PK: { type: string, example: PATIENT#patient-001 }
        SK: { type: string, example: META_LATEST }
        patient_id: { type: string, example: patient-001 }
        mrn: { type: string, example: patient-001 }
        name: { type: string, example: Jane Doe }
        age: { type: integer, example: 46 }
        sex: { type: string, enum: [M, F, X], example: F }
        qr_code: { type: string, example: https://clinical-canvas.com/qr/patient-001 }
        pathway: { type: string, example: surgical }
        current_state: { type: string, example: post-op }
        diagnosis: { type: string, example: Cholecystitis }
        department: { type: string, example: surgery1 }
        status: { type: string, enum: [ACTIVE, INACTIVE], example: ACTIVE }
        comorbidities: { type: array, items: { type: string }, example: [HTN, DM] }
        state_dates:
          type: object
          additionalProperties: { type: string, format: date-time }
        update_counter: { type: integer }
        last_updated: { type: string, format: date-time }
        created_at: { type: string, format: date-time }
        updated_at: { type: string, format: date-time }
        version_ts: { type: string, format: date-time }
        assigned_doctor: { type: string, example: Dr. Sarah Wilson }
        files_url: { type: string, nullable: true }
        GSI1PK: { type: string, example: DEPT#surgery1#ACTIVE }
    PatientCreate:
      type: object
      required: [mrn, name, department]
      properties:
        mrn: { type: string }
        name: { type: string }
        department: { type: string }
        pathway: { type: string }
        current_state: { type: string }
        diagnosis: { type: string }
        age: { type: integer }
        sex: { type: string }
        comorbidities: { type: array, items: { type: string } }
        assigned_doctor: { type: string }
        files_url: { type: string }
        qr_code: { type: string, description: "If omitted, API auto-generates." }
    PatientUpdate:
      type: object
      description: Any subset of these fields is allowed.
      properties:
        name: { type: string }
        age: { type: integer }
        sex: { type: string }
        qr_code: { type: string }
        pathway: { type: string }
        current_state: { type: string }
        diagnosis: { type: string }
        department: { type: string }
        status: { type: string, enum: [ACTIVE, INACTIVE] }
        comorbidities: { type: array, items: { type: string } }
        assigned_doctor: { type: string }
        files_url: { type: string }
    Error:
      type: object
      properties:
        error: { type: string, example: Internal server error }
```

## Example Requests

```bash
# Create
curl -X POST "$BASE_URL/patients" \
  -H "content-type: application/json" \
  -d '{"mrn":"patient-003","name":"Maria Garcia","department":"surgery1","current_state":"pre-op"}'

# Get one
curl "$BASE_URL/patients/patient-003"

# Update (also flips GSI if dept/status provided)
curl -X PUT "$BASE_URL/patients/patient-003" \
  -H "content-type: application/json" \
  -d '{"department":"surgery2","status":"INACTIVE","name":"Maria G."}'

# Soft-delete
curl -X DELETE "$BASE_URL/patients/patient-003"

# List ACTIVE (dept filter)
curl "$BASE_URL/patients?department=surgery1"

# List all ACTIVE
curl "$BASE_URL/patients"
```

## Local Development Proxy

### Option A — Tiny Express proxy

```js
// dev-proxy.js
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
const target = process.env.API_BASE || "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod";

app.use("/api", createProxyMiddleware({
  target,
  changeOrigin: true,
  pathRewrite: { "^/api": "" },
  onProxyReq: (proxyReq) => {
    // set any headers if needed here
  }
}));

app.listen(8787, () => console.log("Dev proxy on http://localhost:8787 ->", target));
```

Run:

```bash
npm i express http-proxy-middleware
node dev-proxy.js
```

### Option B — Vite proxy

```ts
// vite.config.ts
import { defineConfig } from "vite";
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, "")
      }
    }
  }
});
```

### Option C — Next.js rewrite

```js
// next.config.js
module.exports = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/:path*"
      }
    ];
  }
};
```

Use `fetch('/api/patients')` in the app for local development.

