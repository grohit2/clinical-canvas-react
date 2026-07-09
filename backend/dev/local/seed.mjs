#!/usr/bin/env node
// seed.mjs — Create DynamoDB table + S3 bucket in LocalStack, then seed sample data
// Usage: node seed.mjs

import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local
const envPath = resolve(__dirname, ".env.local");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  console.warn("No .env.local found, using environment variables");
}

const ENDPOINT = process.env.AWS_ENDPOINT || "http://localhost:4566";
const REGION = process.env.AWS_REGION || "ap-south-1";
const TABLE = process.env.TABLE_NAME || "HMS-LOCAL";
const BUCKET = process.env.FILES_BUCKET || "hms-patient-files-local";

const clientConfig = {
  region: REGION,
  endpoint: ENDPOINT,
  credentials: { accessKeyId: "test", secretAccessKey: "test" },
};

const dynamoRaw = new DynamoDBClient(clientConfig);
const ddb = DynamoDBDocumentClient.from(dynamoRaw, {
  marshallOptions: { removeUndefinedValues: true },
});
const s3 = new S3Client({ ...clientConfig, forcePathStyle: true });

// ─── Create DynamoDB Table ───────────────────────────────────────────────────
async function createTable() {
  try {
    await dynamoRaw.send(new DescribeTableCommand({ TableName: TABLE }));
    console.log(`✓ Table "${TABLE}" already exists`);
    return;
  } catch (e) {
    if (e.name !== "ResourceNotFoundException") throw e;
  }

  console.log(`Creating table "${TABLE}"...`);
  await dynamoRaw.send(
    new CreateTableCommand({
      TableName: TABLE,
      BillingMode: "PAY_PER_REQUEST",
      AttributeDefinitions: [
        { AttributeName: "PK", AttributeType: "S" },
        { AttributeName: "SK", AttributeType: "S" },
        { AttributeName: "GSI1PK", AttributeType: "S" },
        { AttributeName: "GSI2PK", AttributeType: "S" },
        { AttributeName: "GSI2SK", AttributeType: "S" },
        { AttributeName: "LSI_CUR_MRN", AttributeType: "S" },
      ],
      KeySchema: [
        { AttributeName: "PK", KeyType: "HASH" },
        { AttributeName: "SK", KeyType: "RANGE" },
      ],
      LocalSecondaryIndexes: [
        {
          IndexName: "LSI_CUR_MRN-index",
          KeySchema: [
            { AttributeName: "PK", KeyType: "HASH" },
            { AttributeName: "LSI_CUR_MRN", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "GSI1PK-index",
          KeySchema: [{ AttributeName: "GSI1PK", KeyType: "HASH" }],
          Projection: { ProjectionType: "ALL" },
        },
        {
          IndexName: "GSI2PK-GSI2SK-index",
          KeySchema: [
            { AttributeName: "GSI2PK", KeyType: "HASH" },
            { AttributeName: "GSI2SK", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        },
      ],
    })
  );
  console.log(`✓ Table "${TABLE}" created`);
}

// ─── Create S3 Bucket ────────────────────────────────────────────────────────
async function createBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
    console.log(`✓ Bucket "${BUCKET}" already exists`);
    return;
  } catch (e) {
    if (e.name !== "NotFound" && e.$metadata?.httpStatusCode !== 404) throw e;
  }

  console.log(`Creating bucket "${BUCKET}"...`);
  await s3.send(
    new CreateBucketCommand({
      Bucket: BUCKET,
      CreateBucketConfiguration: { LocationConstraint: REGION },
    })
  );
  console.log(`✓ Bucket "${BUCKET}" created`);
}

// ─── Seed Sample Data ────────────────────────────────────────────────────────
async function seedData() {
  const now = new Date().toISOString();
  const uid1 = "01JLOCAL00001";
  const uid2 = "01JLOCAL00002";

  const items = [
    // Patient 1
    {
      PK: `PATIENT#${uid1}`,
      SK: "META_LATEST",
      patient_uid: uid1,
      name: "John Doe (Local)",
      age: 45,
      sex: "M",
      department: "Orthopedics",
      status: "ACTIVE",
      pathway: "elective",
      current_state: "admitted",
      diagnosis: "Knee replacement",
      comorbidities: ["Diabetes"],
      active_reg_mrn: "MRN-LOCAL-001",
      active_scheme: "GENERAL",
      mrn_history: [{ mrn: "MRN-LOCAL-001", scheme: "GENERAL", date: now }],
      LSI_CUR_MRN: "CUR#MRN-LOCAL-001",
      GSI1PK: "DEPT#Orthopedics#ACTIVE",
      state_dates: { admitted: now },
      timeline_open_sk: `TL#${now}#admitted`,
      update_counter: 0,
      created_at: now,
      updated_at: now,
      last_updated: now,
    },
    // MRN pointer for Patient 1
    {
      PK: "MRN#MRN-LOCAL-001",
      SK: "MRN",
      mrn: "MRN-LOCAL-001",
      patient_uid: uid1,
      scheme: "GENERAL",
      department: "Orthopedics",
      status: "ACTIVE",
      created_at: now,
      updated_at: now,
    },
    // Timeline for Patient 1
    {
      PK: `PATIENT#${uid1}`,
      SK: `TL#${now}#admitted`,
      timeline_id: `tl-${Date.now()}`,
      patient_uid: uid1,
      mrn: "MRN-LOCAL-001",
      scheme: "GENERAL",
      state: "admitted",
      date_in: now,
      date_out: null,
      checklist_in_done: [],
      checklist_out_done: [],
      required_in: [],
      required_out: [],
      created_at: now,
      updated_at: now,
    },
    // Patient 2
    {
      PK: `PATIENT#${uid2}`,
      SK: "META_LATEST",
      patient_uid: uid2,
      name: "Jane Smith (Local)",
      age: 32,
      sex: "F",
      department: "Cardiology",
      status: "ACTIVE",
      pathway: "emergency",
      current_state: "pre-op",
      diagnosis: "Valve repair",
      comorbidities: [],
      active_reg_mrn: "MRN-LOCAL-002",
      active_scheme: "INSURANCE",
      mrn_history: [{ mrn: "MRN-LOCAL-002", scheme: "INSURANCE", date: now }],
      LSI_CUR_MRN: "CUR#MRN-LOCAL-002",
      GSI1PK: "DEPT#Cardiology#ACTIVE",
      state_dates: { admitted: now, "pre-op": now },
      timeline_open_sk: `TL#${now}#pre-op`,
      update_counter: 0,
      created_at: now,
      updated_at: now,
      last_updated: now,
    },
    // MRN pointer for Patient 2
    {
      PK: "MRN#MRN-LOCAL-002",
      SK: "MRN",
      mrn: "MRN-LOCAL-002",
      patient_uid: uid2,
      scheme: "INSURANCE",
      department: "Cardiology",
      status: "ACTIVE",
      created_at: now,
      updated_at: now,
    },
    // Doctor
    {
      PK: "USER#doc-local-001",
      SK: "PROFILE",
      user_id: "doc-local-001",
      name: "Dr. Local Dev",
      role: "doctor",
      department: "Orthopedics",
      email: "doctor@local.dev",
      avatar: null,
      contact_info: {},
      permissions: [],
      GSI1PK: "DEPT#Orthopedics#ROLE#DOCTOR",
      created_at: now,
      updated_at: now,
      deleted: false,
    },
    // Checklist stage example
    {
      PK: "CHECKLIST",
      SK: "STAGE#admitted#TO#pre-op",
      in_required: ["vitals", "consent"],
      out_required: ["blood-work"],
      created_at: now,
    },
    {
      PK: "CHECKLIST",
      SK: "STAGE#pre-op#TO#intra-op",
      in_required: ["anesthesia-clearance"],
      out_required: ["ot-prep"],
      created_at: now,
    },
  ];

  console.log(`Seeding ${items.length} items...`);
  for (const item of items) {
    await ddb.send(new PutCommand({ TableName: TABLE, Item: item }));
  }
  console.log(`✓ Seeded ${items.length} items`);
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🏥 HMS Local Setup`);
  console.log(`  Endpoint: ${ENDPOINT}`);
  console.log(`  Region:   ${REGION}`);
  console.log(`  Table:    ${TABLE}`);
  console.log(`  Bucket:   ${BUCKET}\n`);

  await createTable();
  await createBucket();
  await seedData();

  console.log(`\n✓ Local environment ready!\n`);
}

main().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
