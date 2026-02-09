# External Integrations

**Analysis Date:** 2026-02-09

## APIs & External Services

**Backend Healthcare Platform:**
- AWS Lambda URL - Main backend API
  - SDK/Client: Native fetch API
  - Endpoint: `https://kfzsv6at3amrxzl5kzuehljfju0rhkup.lambda-url.ap-south-1.on.aws`
  - Region: ap-south-1 (Asia Pacific Mumbai)
  - Implementation: `src/shared/lib/api.ts`

**Patient Management API:**
- Base endpoints served via Vite proxy `/api` rewrite to backend
- Supports CRUD operations for:
  - Patients (list, get, create, update, delete, timeline)
  - Medical records (tasks, notes, medications)
  - Doctors/staff
  - Discharge summaries

## Data Storage

**Databases:**
- DynamoDB (AWS) - Primary data store
  - Connection: Via Lambda API (serverless)
  - Client: Direct HTTP API calls (no SDK needed)
  - Implementation: `src/shared/lib/api.ts`

**File Storage:**
- Amazon S3 - Medical documents, images, labs
  - Bucket: AWS S3 with CloudFront CDN
  - Presigned URLs for upload/download
  - Implementation: `src/shared/lib/filesApi.ts` and `src/shared/lib/s3upload.ts`
  - Upload flow:
    1. Request presigned URL from backend (`/patients/{uid}/files/presign-upload`)
    2. Direct PUT request to S3 via presigned URL
    3. S3 event triggers Lambda for attachment processing
    4. Poll for event materialization before marking complete

**File Organization:**
- Scopes: `originals` (full files), `optimized` (compressed), `thumb` (thumbnails)
- Kinds: `doc`, `note`, `med`, `task`
- Document types: `preop`, `lab`, `radiology`, `intraop`, `otnotes`, `postop`, `discharge`
- Categories: `preop_pics`, `lab_reports`, `radiology`, `intraop_pics`, `ot_notes`, `postop_pics`, `discharge_pics`

**Caching:**
- Client-side: localStorage (patient list cache, view preferences, pinned patients)
- Server-side: CloudFront CDN for optimized images
- Query cache: TanStack React Query (in-memory)

## Authentication & Identity

**Auth Provider:**
- Custom/Not detected - No auth SDK integration found
- Current approach: Backend handles auth separately
- No OAuth2, SAML, or Keycloak integration visible in frontend

**Session Management:**
- Browser sessionStorage for temporary state (scroll position, flags)
- localStorage for persistent preferences (view mode, pinned patients)

## Monitoring & Observability

**Performance Analytics:**
- Vercel Speed Insights - Web Vitals monitoring
  - Package: `@vercel/speed-insights`
  - Implementation: `src/app/App.tsx` (SpeedInsights component)
  - Tracks: Core Web Vitals metrics

**Error Tracking:**
- Not detected - No Sentry, Bugsnag, or similar integration

**Logs:**
- Client-side: Console logging for debugging
- HTTP request/response logging in development (`src/shared/lib/api.ts`)
- Test videos/traces via Playwright (retained on failure)

**User Analytics:**
- Not detected - No Google Analytics, Mixpanel, or similar

## CI/CD & Deployment

**Hosting:**
- Vercel - Primary deployment platform
  - Base URL: `https://clinical-canvas-react-ok3m.vercel.app`
  - Evidence: playwright.config.ts baseURL
  - Likely: Automatic deployments on git push

**CI Pipeline:**
- Playwright E2E tests with CI configuration
- Reporter: GitHub Actions compatible (github reporter)
- Retries: 2 on CI, 0 locally
- Workers: 2 on CI
- Screenshots/videos retained on failure

**Build Process:**
- Vite build pipeline
- Development build: `npm run build:dev` (--mode development)
- Production build: `npm run build`

## Environment Configuration

**Required env vars:**
1. `VITE_API_BASE_URL` - API base path (default: `/api`)
2. `VITE_PROXY_TARGET` - Backend URL for dev proxy
3. `VITE_PATIENT_FORM_V2` - Feature flag (1=V2, 0=legacy)
4. `VITE_CDN_DOMAIN` - CloudFront domain for image CDN

**Secrets location:**
- `.env.local` file (git-ignored)
- Vercel environment variables (for production)
- AWS Lambda handles backend authentication/secrets

**CDN:**
- CloudFront domain: `https://d9j52cd9e77ji.cloudfront.net`
- Serves optimized images from S3
- Integration: `src/shared/lib/filesApi.ts` returns cdnUrl for files

## Webhooks & Callbacks

**Incoming:**
- None detected

**Outgoing:**
- S3 events → Lambda processing (triggered on file upload)
  - Event: Object creation in S3
  - Action: Auto-attach documents to patient records
  - Implementation: `src/shared/hooks/useUploader.ts` polls for event materialization

**Internal Event Flow:**
- Document upload → S3 PUT → S3:ObjectCreated event → Lambda processing → Patient documents updated
- Polling mechanism: `src/shared/lib/docsWaitForEvent.ts`

## Image Processing & Optimization

**Client-Side:**
- Compression via `browser-image-compression`
- HEIC/HEIF conversion via `heic2any`
- Format support detection: AVIF > WebP > JPEG fallback
- Presigned S3 uploads with multiple targets (optimized, originals, thumb)

**Server-Side:**
- Lambda processes uploaded files for optimization
- CloudFront serves CDN-optimized versions

## Document Generation

**Export Formats:**
- Word documents (.docx) via `docx` library
- QR codes via `qrcode` library
- Discharge summaries with MDX support (markdown-like syntax)

---

*Integration audit: 2026-02-09*
