# HMS Backend — Local Development Runbook

Run the full HMS backend locally using **LocalStack** (DynamoDB + S3) and a lightweight Node.js HTTP server that wraps the Lambda handler.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Docker | 20+ | [docker.com](https://docs.docker.com/get-docker/) |
| Node.js | 22+ | [nodejs.org](https://nodejs.org/) |
| npm | 10+ | Comes with Node.js |

Verify:
```bash
docker --version
node --version
npm --version
```

---

## Quick Start (One Command)

```bash
cd backend/dev/local
chmod +x start.sh
./start.sh
```

This will:
1. Start LocalStack via Docker Compose
2. Wait for it to become healthy
3. Install npm dependencies
4. Create DynamoDB table with all indexes (GSIs + LSI)
5. Create S3 bucket
6. Seed sample patient and doctor data
7. Start the local HTTP server on `http://localhost:3001`

---

## Step-by-Step Setup

### 1. Start LocalStack

```bash
cd backend/dev/local
docker compose up -d
```

Verify health:
```bash
curl http://localhost:4566/_localstack/health
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Seed Database & S3

```bash
node seed.mjs
```

This creates:
- DynamoDB table `HMS-LOCAL` with:
  - Primary key: PK (String) + SK (String)
  - LSI: LSI_CUR_MRN-index
  - GSI: GSI1PK-index, GSI2PK-GSI2SK-index
- S3 bucket `hms-patient-files-local`
- Sample data:
  - 2 patients (John Doe in Orthopedics, Jane Smith in Cardiology)
  - 1 doctor (Dr. Local Dev)
  - MRN pointers
  - Timeline entries
  - Checklist stage transitions

### 4. Start the Server

```bash
node local-server.mjs
```

Server starts at `http://localhost:3001`.

---

## Connecting the Frontend

Update the frontend Vite proxy to point to the local backend:

**Option A: Environment variable**
```bash
# In the project root .env.local
VITE_PROXY_TARGET=http://localhost:3001
```

**Option B: Direct in vite.config.ts** (not recommended for commit)
```ts
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/api/, ''),
  },
}
```

Then start the frontend:
```bash
npm run dev
```

---

## NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm start` | `node local-server.mjs` | Start the local server |
| `npm run seed` | `node seed.mjs` | Create table/bucket and seed data |
| `npm run setup` | `docker compose up -d && node seed.mjs` | Start LocalStack + seed |
| `npm run teardown` | `docker compose down -v` | Stop LocalStack and delete data |
| `npm run reset` | teardown + setup + seed | Full reset |

---

## How It Works

### Architecture (Local)

```
┌─────────────┐     ┌────────────────────┐     ┌──────────────────┐
│   Frontend   │────▶│  local-server.mjs  │────▶│  LocalStack      │
│  :5173       │     │  :3001             │     │  :4566           │
│              │     │                    │     │  ├── DynamoDB     │
│              │     │  (HTTP → Lambda    │     │  └── S3           │
│              │     │   event → handler) │     │                  │
└─────────────┘     └────────────────────┘     └──────────────────┘
```

### Request Flow

1. Frontend sends HTTP request to `http://localhost:3001/patients`
2. `local-server.mjs` receives the request via Node.js `http.createServer`
3. Server builds a Lambda Function URL-style event object:
   - `rawPath`, `queryStringParameters`, `requestContext.http.method`, `body`
4. Passes event to the imported `handler` from `router.mjs`
5. Handler routes to the appropriate feature module
6. Feature module queries LocalStack DynamoDB/S3
7. Response flows back through the chain

### AWS SDK Configuration

The handler modules (`router.mjs`, `files.mjs`, `s3_events.mjs`) check the `AWS_ENDPOINT` environment variable:
- **When set**: Creates AWS SDK clients with LocalStack endpoint + test credentials
- **When unset**: Uses standard AWS SDK behavior (real AWS)

This means the same handler code runs locally and in Lambda with zero branching.

---

## Verifying the Setup

### Test Endpoints

```bash
# List patients
curl -s http://localhost:3001/patients | jq .

# Get specific patient
curl -s http://localhost:3001/patients/01JLOCAL00001 | jq .

# Get by MRN
curl -s http://localhost:3001/patients/MRN-LOCAL-001 | jq .

# List patients by department
curl -s "http://localhost:3001/patients?department=Orthopedics" | jq .

# Get timeline
curl -s http://localhost:3001/patients/01JLOCAL00001/timeline | jq .

# List doctors
curl -s "http://localhost:3001/doctors?department=Orthopedics" | jq .

# Create a new patient
curl -s -X POST http://localhost:3001/patients \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Patient",
    "registration": {
      "mrn": "MRN-TEST-001",
      "scheme": "GENERAL",
      "department": "Orthopedics"
    }
  }' | jq .

# Create a task
curl -s -X POST http://localhost:3001/patients/01JLOCAL00001/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Check vitals",
    "type": "assessment",
    "due": "2026-03-26T10:00:00Z",
    "assigneeId": "doc-local-001"
  }' | jq .

# List tasks
curl -s http://localhost:3001/patients/01JLOCAL00001/tasks | jq .
```

### Inspect LocalStack Data

```bash
# List DynamoDB tables
aws --endpoint-url=http://localhost:4566 dynamodb list-tables

# Scan all items
aws --endpoint-url=http://localhost:4566 dynamodb scan \
  --table-name HMS-LOCAL --output json | jq '.Items | length'

# List S3 buckets
aws --endpoint-url=http://localhost:4566 s3 ls

# List S3 objects
aws --endpoint-url=http://localhost:4566 s3 ls s3://hms-patient-files-local/ --recursive
```

---

## Troubleshooting

### LocalStack won't start
```bash
# Check if port 4566 is in use
lsof -i :4566

# View logs
docker compose logs localstack

# Full reset
docker compose down -v
docker compose up -d
```

### "Table already exists" during seed
This is safe — the seed script is idempotent.

### "Connection refused" from local server
Ensure LocalStack is running and healthy:
```bash
curl http://localhost:4566/_localstack/health
```

### S3 presigned URLs don't work from browser
LocalStack presigned URLs use `localhost:4566` which is fine for server-side operations. For browser uploads, you may need to use the LocalStack URL directly or configure CORS on the LocalStack S3 bucket.

### Frontend can't reach backend
1. Verify the backend is running: `curl http://localhost:3001/patients`
2. Check `VITE_PROXY_TARGET=http://localhost:3001` in root `.env.local`
3. Restart the Vite dev server after changing env vars

### Module import errors
Ensure you're running from the `backend/dev/local` directory and dependencies are installed:
```bash
cd backend/dev/local
npm install
```

---

## Environment Variables

All configuration is in `backend/dev/local/.env.local`:

| Variable | Default | Description |
|----------|---------|-------------|
| `AWS_ENDPOINT` | `http://localhost:4566` | LocalStack endpoint |
| `AWS_REGION` | `ap-south-1` | AWS region |
| `TABLE_NAME` | `HMS-LOCAL` | DynamoDB table name |
| `FILES_BUCKET` | `hms-patient-files-local` | S3 bucket name |
| `PRESIGN_EXPIRES_SEC` | `900` | Presigned URL TTL |
| `PORT` | `3001` | Local server port |
| `S3_FORCE_PATH_STYLE` | `true` | Required for LocalStack S3 |

---

## Differences from Production

| Aspect | Local | Production |
|--------|-------|------------|
| Compute | Node.js HTTP server | AWS Lambda |
| DynamoDB | LocalStack | AWS DynamoDB |
| S3 | LocalStack | AWS S3 |
| CDN | None | CloudFront |
| Auth | None | None (Function URL, no auth) |
| Region | ap-south-1 (simulated) | ap-south-1 |
| Table | HMS-LOCAL | HMS-HYD |
| Cold starts | None | Lambda cold starts |
| Timeout | None | 30s |

---

## Cleaning Up

```bash
# Stop LocalStack (preserves data in Docker volume)
docker compose stop

# Stop and delete all data
docker compose down -v
```
