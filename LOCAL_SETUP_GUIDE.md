# Clinical Canvas - Local Development Setup Guide

This guide provides step-by-step instructions to set up the Clinical Canvas React application locally with HMS Lambda integration.

## Overview

The local setup connects your React frontend to the HMS Patients Lambda API running on AWS, allowing you to work with real patient data from DynamoDB while developing locally.

**Architecture:**
```
Browser → Vite Dev Server (5173) → Vite Proxy → Lambda API → DynamoDB
```

## Prerequisites

- Node.js 20 LTS (recommended) or Node.js 18+
- npm or yarn
- Git
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Quick Start (TL;DR)

```bash
# Clone and setup
git clone <repo-url>
cd clinical-canvas-react
nvm use 20  # or ensure Node 20 LTS
npm ci

# Start development server (in persistent terminal)
npm run dev
# Open: http://127.0.0.1:5173/
```

## Detailed Setup Instructions

### 1. Environment Preparation

#### Check/Install Node.js Version
```bash
# Check current version
node -v

# If not Node 20 LTS, install it
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node -v  # Should show v20.x.x
```

#### Clone Repository
```bash
git clone <your-repo-url>
cd clinical-canvas-react
```

### 2. Clean Installation

#### Remove Old Dependencies
```bash
# Remove any existing modules and cache
rm -rf node_modules
rm -rf node_modules/.vite
rm -rf dist
```

#### Install Fresh Dependencies
```bash
# Use clean install for reproducible builds
npm ci

# Verify installation
npm ls --depth=0
```

### 3. Environment Configuration

#### Create/Verify Environment File
Create `.env.development` in the project root:

```ini
# .env.development
VITE_API_BASE_URL=/api
VITE_USE_REAL_API=true
VITE_ENABLE_PATIENTS_API=true
VITE_ENABLE_DASHBOARD_API=false
VITE_ENABLE_TASKS_API=false
VITE_ENABLE_MEDIA=true
```

#### Verify Vite Configuration
Ensure `vite.config.ts` contains:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === "development" && componentTagger()
  ].filter(Boolean),
  server: {
    host: "127.0.0.1",           // Avoid IPv6 issues
    port: 5173,                  // Standard Vite port
    strictPort: true,            // Fail if port busy
    proxy: {
      "/api": {
        target: "https://o7ykvdqu5pbnr2fhtuoddbgj3y0peneo.lambda-url.us-east-1.on.aws",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
    hmr: { host: "127.0.0.1", port: 5173 },  // Hot Module Replacement
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Vite automatically injects VITE_* environment variables as import.meta.env.*
  // No manual define needed for environment variables
}));
```

### 4. Clear Any Running Processes

#### Kill Existing Servers
```bash
# Kill any running Vite or dev-proxy processes
pkill -f vite || true
pkill -f dev-proxy || true

# Clear ports (if occupied)
lsof -ti:8080,5173,3000,3001 | xargs kill -9 2>/dev/null || true

# Verify ports are free
lsof -iTCP:5173 -sTCP:LISTEN  # Should return nothing
```

### 5. Start Development Server

#### Method 1: Persistent Terminal (Recommended)

**Open a new terminal window/tab** (outside of any AI/agent environments):

```bash
cd /path/to/clinical-canvas-react
npm run dev
```

You should see:
```
VITE v5.4.10  ready in 200ms

➜  Local:   http://127.0.0.1:5173/
```

**Keep this terminal open** and running throughout development.

#### Method 2: Background Process (If Using AI/Agent Terminals)

```bash
# Start in background with output logging
nohup npm run dev > .vite.out 2>&1 & echo "Vite started with PID: $!"

# Monitor logs
tail -f .vite.out

# Check if running
lsof -iTCP:5173 -sTCP:LISTEN
```

### 6. Verify Setup

#### Health Checks

Run these commands to verify everything is working:

```bash
# 1. Check if Vite is listening
lsof -iTCP:5173 -sTCP:LISTEN
# Expected: node process listening on localhost:5173

# 2. Test main application
curl -sI http://127.0.0.1:5173/
# Expected: HTTP/1.1 200 OK

# 3. Test API proxy
curl -s http://127.0.0.1:5173/api/patients | head -1
# Expected: JSON array with patient data
# If you see HTML starting with <!DOCTYPE, check environment variables (see troubleshooting)

# 4. Test direct Lambda (backup)
curl -s "https://o7ykvdqu5pbnr2fhtuoddbgj3y0peneo.lambda-url.us-east-1.on.aws/patients" | head -1
# Expected: Same JSON as above
```

#### Browser Testing

1. Open **http://127.0.0.1:5173/** in your browser
2. Open Developer Tools (F12)
3. Go to **Network** tab
4. Refresh the page
5. Look for a request to `/api/patients`
6. Verify the response:
   - **Status**: 200 OK
   - **Content-Type**: application/json
   - **Response**: JSON array with camelCase patient data

#### Expected Patient Data Format
```json
[
  {
    "id": "patient-001",
    "mrn": "patient-001", 
    "name": "Jane Doe",
    "department": "surgery1",
    "status": "ACTIVE",
    "pathway": "surgical",
    "currentState": "post-op",
    "diagnosis": "Cholecystitis",
    "age": 46,
    "sex": "F",
    "comorbidities": ["HTN", "DM"],
    "assignedDoctor": "Dr. Sarah Wilson",
    "qrCode": "https://clinical-canvas.com/qr/patient-001",
    "updateCounter": 0,
    "lastUpdated": "2025-08-07T19:15:00Z"
  }
]
```

## Common Issues & Solutions

### Issue: Port Connection Refused

**Symptoms:**
- `curl: (7) Failed to connect to 127.0.0.1 port 5173`
- Browser shows "This site can't be reached"

**Solutions:**
1. Check if Vite process is running: `ps aux | grep vite`
2. Verify port isn't blocked: `lsof -iTCP:5173`
3. Try different port: `npm run dev -- --port 4000`
4. Check firewall/antivirus settings
5. Restart terminal/system if needed

### Issue: Invalid JSON / HTML Response

**Symptoms:**
- `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`
- Browser console shows HTML instead of JSON

**Causes & Solutions:**
1. **Environment variables not loaded**: Most common cause - see "Critical Environment Variable Issue" below
2. **Wrong proxy configuration**: Verify `vite.config.ts` proxy settings
3. **Multiple servers running**: Kill all processes and restart clean
4. **Port mismatch**: Ensure app served from same port as API calls
5. **Cached browser state**: Hard refresh (Cmd/Ctrl + Shift + R)

#### Critical Environment Variable Issue

**Problem**: If you see HTML starting with `<!DOCTYPE html>` instead of JSON, it usually means environment variables aren't being read correctly.

**Root Cause**: Using `process.env.VITE_*` instead of `import.meta.env.VITE_*` in your code.

**Solution**: Ensure all environment variable references use Vite's format:

```typescript
// ❌ WRONG - This will be undefined in Vite
const baseUrl = process.env.VITE_API_BASE_URL;

// ✅ CORRECT - This works in Vite
const baseUrl = import.meta.env.VITE_API_BASE_URL;
```

**Files to check:**
- `src/config/api.ts` - Must use `import.meta.env.VITE_*`
- Any other files reading environment variables

**Debug steps:**
1. Add console.log in `src/config/api.ts`: `console.log('BASE_URL:', import.meta.env.VITE_API_BASE_URL)`
2. Should show `/api`, not `undefined`
3. If undefined, check your `.env.development` file and restart Vite

### Issue: Module Import Failures

**Symptoms:**
- `Failed to fetch dynamically imported module`
- `ERR_CONNECTION_REFUSED` for module files

**Solution:**
- Vite server crashed after startup
- Use persistent terminal or background process
- Check `.vite.out` log for errors

### Issue: Old/Mock Data Appearing

**Symptoms:**
- Seeing patients like "Jane Doe (MRN001234)" instead of "Jane Doe (patient-001)"
- Snake_case data with PK/SK fields

**Solutions:**
1. **Check proxy**: Ensure `/api/patients` hits Lambda, not mock
2. **Clear cache**: Browser hard refresh + clear localStorage
3. **Verify environment**: Confirm `VITE_ENABLE_PATIENTS_API=true`
4. **Check Network tab**: Verify request URL and response

## Alternative Configurations

### Using Express Proxy (Alternative)

If you prefer a separate Express proxy server:

1. **Update environment:**
```ini
VITE_API_BASE_URL=http://localhost:3000/api
```

2. **Remove Vite proxy** from `vite.config.ts` (delete `server.proxy` section)

3. **Start Express proxy:**
```bash
# Terminal 1
node dev-proxy.js
# Should show: Dev proxy on http://localhost:3000

# Terminal 2  
npm run dev
```

4. **Access app:** http://127.0.0.1:5173/

### Production Build

To test production build locally:

```bash
# Build for production
npm run build

# Serve production build
npm run preview -- --port 8080 --host 0.0.0.0

# Access: http://localhost:8080/
```

## Development Workflow

### Daily Startup
1. Open terminal
2. `cd /path/to/clinical-canvas-react`
3. `npm run dev`
4. Open http://127.0.0.1:5173/
5. Keep terminal open while developing

### Making Changes
- **Frontend changes**: Auto-refresh via Hot Module Replacement
- **Config changes**: Restart Vite server
- **Environment changes**: Restart Vite server

### API Testing
- **Browser**: Use DevTools Network tab
- **Command line**: `curl http://127.0.0.1:5173/api/patients`
- **Direct Lambda**: `curl https://o7ykvdqu5pbnr2fhtuoddbgj3y0peneo.lambda-url.us-east-1.on.aws/patients`

## Useful Commands

```bash
# Check what's running on port 5173
lsof -iTCP:5173 -sTCP:LISTEN

# Kill Vite process
pkill -f vite

# Clear all development servers
pkill -f vite && pkill -f dev-proxy

# Test API endpoints
curl -s http://127.0.0.1:5173/api/patients | jq
curl -s http://127.0.0.1:5173/api/patients/patient-001 | jq

# Debug environment variables (run in browser console)
console.log('Environment:', {
  BASE_URL: import.meta.env.VITE_API_BASE_URL,
  USE_REAL_API: import.meta.env.VITE_USE_REAL_API,
  PATIENTS_API: import.meta.env.VITE_ENABLE_PATIENTS_API
})

# Monitor Vite logs (if using background process)
tail -f .vite.out

# Clean restart
rm -rf node_modules/.vite && npm run dev
```

## Project Structure (Key Files)

```
clinical-canvas-react/
├── .env.development          # Environment variables
├── vite.config.ts           # Vite configuration
├── dev-proxy.js             # Alternative Express proxy
├── src/
│   ├── config/api.ts        # API configuration
│   ├── services/
│   │   ├── api.ts          # API service layer
│   │   ├── patientService.ts # Patient API calls
│   │   └── adapters/
│   │       └── hmsPatients.ts # Data transformation
│   └── pages/
│       └── PatientsList.tsx  # Main patients page
└── LOCAL_SETUP_GUIDE.md     # This file
```

## Support

If you encounter issues not covered in this guide:

1. Check the browser console for specific error messages
2. Verify all health checks pass
3. Compare your setup with the "Expected" outputs in this guide
4. Try the alternative configurations
5. Test the direct Lambda URL to isolate proxy issues

---

**Last Updated:** January 2025  
**Vite Version:** 5.4.10  
**Node Version:** 20 LTS Recommended

## HMS API wiring (frontend)

- Base URL: the app defaults to `/api` so local dev should use the Vite proxy and Amplify should add a rewrite for `/api/*`.
- Env vars (see `.env.example`):
  - `VITE_API_BASE_URL` (optional). Leave empty locally to use proxy.
  - `VITE_API_AUTH_TOKEN` (optional Bearer token)
  - `VITE_ENABLE_QR=false` (QR disabled temporarily)
  - `VITE_LOCAL_BACKEND_URL` used by Vite dev proxy if you want to override the default target.

### Local proxy

- Vite is configured to proxy `/api` to your Lambda URL in `vite.config.ts`.
- To use a different local/tunnel URL, create `.env.local` and set `VITE_LOCAL_BACKEND_URL`.

### Amplify rewrites

- Add two rules in Amplify Console Rewrites & Redirects:
  1. Source `/api/<*>` → Target `<<<LAMBDA_URL_OR_API_GW>>>/<*>` (Status 200, forward all headers/query)
  2. Source `/<*>` → Target `/index.html` (Status 200)
- Reference `infrastructure/amplify-rewrites.json` for a JSON copy.

### Smoke test

- Start dev server: `npm run dev`
- Visit `/patients` and verify `GET /api/patients` calls your backend.
- Open a patient → tasks/meds/notes should query the corresponding `/api/patients/{mrn}/...` endpoints.