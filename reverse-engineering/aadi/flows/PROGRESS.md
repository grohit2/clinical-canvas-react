# AADI Flow Documentation — Progress Log

> Tracking detailed flow documentation for junior developer implementation.
> Target: Every user flow documented with exact API calls, state changes, error handling, and edge cases.

---

## Iteration 1 — 2026-04-22

**Mode:** SETUP + LOGIN/AUTH + HOME/LANDING
**Files Created:**
- `PROGRESS.md` (this file)
- `README.md` (index of all flows)
- `00_LOGIN_AUTH_FLOW.md` (login, OTP, token management, logout)
- `01_LANDING_HOME_FLOW.md` (landing dashboard, inpatient list, patient add, filtering)

**Source Files Read:**
- `login.page.ts` (523 lines), `login.page.html` (202 lines)
- `auth-jwt.service.ts` (205 lines), `account.service.ts` (124 lines), `token-refresh.service.ts` (216 lines)
- `login.service.ts` (269 lines)
- `auth.interceptor.ts` (125 lines), `auth-expired.interceptor.ts` (45 lines)
- `landing.page.ts` (281 lines), `landing.page.html` (60 lines)
- `home.page.ts` (2112 lines), `home.page.html` (427 lines)
- `app-routing.module.ts` (456 lines), `app.component.ts` (935 lines)
- `app-storage.service.ts` (151 lines), `database.service.ts` (123 lines)
- `network.service.ts` (114 lines), `Constants.ts` (8 lines)

---

## Iteration 2 — 2026-04-22

**Mode:** PATIENT CHAT (most complex screen)
**Files Created:**
- `02_PATIENT_CHAT_FLOW.md` (850+ lines — 16 message types, ACS, file attachments, audio recording, @mentions)

**Source Files Read:**
- `patient-chat.page.ts` (~4200 lines), `patient-chat.page.html` (~1500 lines)
- `chat.service.ts` (~1282 lines), `patient-msg.service.ts` (~600 lines)
- `patient-info.service.ts` (~1298 lines), `common.service.ts` (108 lines)
- `Message.ts` (137 lines), `PatientMessage.ts` (27 lines)
- `data-resolver.service.ts` (31 lines), `group-info-data-resolver.service.ts` (30 lines)
- `chat-status-footer/`, `star-chat-status-footer/`, `expand-chat-textarea/` components

**Key Details Documented:**
- 16 message categories with distinct card designs (colors, avatars, layouts)
- Send/receive flows including optimistic insert and ACS real-time
- File upload via Web Worker with checksum retry
- Audio recording with VoiceRecorder
- @Mentions via ngx-mentions with care team member loading
- Message actions: star, reply (swipe-to-reply gesture), delete (1h window)
- Filtering by category (SQL IN clause) and star
- Pagination from SQLite
- Chat sync (ACS thread iteration + server-side API)
- 19 action sheet navigation items
- Offline recovery on app resume

---

## Iteration 3 — 2026-04-22

**Mode:** MEDICATIONS + LAB RESULTS
**Files Created:**
- `03_MEDICATION_FLOW.md` (1,693 lines — medication ordering, dosage, timeline dashboard, reconciliation)
- `04_LAB_RESULTS_FLOW.md` (1,322 lines — investigation ordering, result processing, D3.js trends)

**Source Files Read (Medications):**
- `medication-list.page.ts`, `medication-orders.page.ts`, `medication-order-list.page.ts`
- `medication-order-add-dosage.page.ts`, `medication-order-custom-dosage.page.ts`
- `current-medication-dashboard.page.ts`, `slot-component-generator.ts`
- `add-medication-on-category-wise.page.ts`, `add-medication-order-category-wise.page.ts`
- `medicine-reconciliation.page.ts`
- `medication-service.service.ts`, `medication-order-service.service.ts`

**Source Files Read (Lab Results):**
- `investigation-list.page.ts`, `investigation-orders.page.ts`
- `investigation-results-list.page.ts`, `lab-result-details.page.ts`
- `followup-investigations.page.ts`, `result-trend-graph.page.ts`
- `investigation-service.service.ts`, `followup-investigations-service.service.ts`
- `LabResultProcesserUtil.ts`, `InvestigationService.ts` (model)

**Key Details Documented:**
- 10 medication pages with navigation hierarchy
- 30+ ATHMA API endpoints for medication management
- Dosage configuration: frequency, dose, day-wise distribution, quantity formula
- Custom/fractional dosage cycling (1/4, 1/2)
- Swipe-to-order gesture (30%/60% thresholds)
- 24-hour timeline dashboard with IntersectionObserver
- 5 medication categories + IV/Infusion support
- Medicine reconciliation workflow
- Patient instruction auto-generation (numeric + word formats)
- LabResultProcesserUtil 5-step pipeline with 3-level recursive tree
- 7 abnormal flag types with color mapping
- 2D result matrix view with highlighted current column
- D3.js trend graph (scales, line, points, axis, grid, auto-scroll)
- 6 report types with download flow
- Follow-up scheduling with appointment slots

---

## Iteration 4 — 2026-04-22

**Mode:** PROGRESS NOTES + DISCHARGE SUMMARY (combined — shared infrastructure)
**Files Created:**
- `05_PROGRESS_NOTES_DISCHARGE_FLOW.md` (1,597 lines — PN create/draft/acknowledge/unchart + DS 28 sections/7-state workflow/AI voice-to-text)

**Source Files Read:**
- `progress-notes.page.ts` (1401 lines), `progress-notes-edit.page.ts` (354 lines)
- `progress-notes-preview.page.ts` (453 lines), `previous-progress-notes.page.ts` (439 lines)
- `discharge-summary.page.ts` (~2700 lines), `discharge-comments.page.ts` (125 lines)
- `copy-previous-notes.page.ts` (100 lines), `ai-discharge-summary.page.ts` (518 lines)
- `text-editor.page.ts` (240 lines), `progress-notes.service.ts` (201 lines)
- `dischargesummary.service.ts` (135 lines)

**Key Details Documented:**
- PN create/draft/submit with auto-acknowledgment logic
- 4 vital types with validation, temperature C↔F conversion
- Draft system (EHR_034, EHR_031, EHR_021, EHR_087, EHR_088)
- Unchart 2-step flow with strikethrough rendering
- DS 28 sections, 7-state machine (NEW→DRAFT→PENDING_REVIEW→REVIEWED→PUBLISHED→AMENDED)
- Review/SignOff workflow with mandatory widget validation
- Comments system with SecureStorage caching
- DS vitals (20+ types including 4 BP variants)
- Copy previous, regenerate, per-section sync
- AI discharge summary: speech recognition, inactivity monitor, voice commands, sentence merging
- CKEditor5 config with clipboard blocking
- Macro system (PN + DS contexts)
- 35+ API endpoints

---

## Iteration 5 — 2026-04-22

**Mode:** CARE TEAM MANAGEMENT + VIDEO CONSULTATION (combined -- shared organizational context)
**Files Created:**
- `06_CARE_TEAM_VIDEO_CONSULTATION_FLOW.md` (comprehensive -- care team templates, patient layer, cross-consultation, handover, appointment dashboard, dual video provider, STOMP chat, OPD notes, cancel, history)

**Key Details Documented:**
- Two-layer care team architecture: Template (admin, 14 APIs) + Patient (SQLite, WebSocket sync, 7 APIs)
- 4 admin pages: AdminCareTeamPage, SelfCareTeamPage (3 accordion lists), AddCareTeamPage (2 modes), PrimaryConsultantPage/LocationWisePage
- Member role detection: group.code → group.parent.code fallback (DOCTOR/NURSE/PARAMEDICS)
- 6 validation rules for template creation including deduplication
- SQLite CareTeam table (11 columns) with WebSocket SAVE/DELETE message processing
- BehaviorSubject gotUpdateCareTeamForPatientInfoID event bus
- Cross-consultation: 5 API endpoints, two submission paths (direct vs return-to-PN), self/PC validation
- Handover requests: accept/reject lifecycle, taskDefinition IP-CONSULTANT-HANDOVER, SQLite update on accept, auto-dismiss modal
- HomeVcPage appointment dashboard: 10 consultation statuses, date navigation, 3-chip filter (14+ branches), 50-min auto-refresh
- Dual video provider: Agora RTC (VP8, dynamic appId via AMB_008) + OpenTok/TokBox (legacy, 320x240, 7fps, error 1004)
- Agora join/leave lifecycle with permission checks, KeepAwake, audit trail (EHR_076/077)
- STOMP-over-SockJS in-call chat: subscribe/send topics, messageId dedup, 5-second auto-reconnect, 5 quick replies
- OPD Notes: 3 file sources (camera/gallery/file picker), base64 upload pipeline with checksum, mark DONE via EHR_069, 6 follow-up options
- Cancel appointment: 2 pre-set reasons, 2 paths (with/without appointment object), today-only constraint for Path 2
- Chat history (EHR_071), PastUploads (DMS), PastPrescriptions (OP EHR_072 vs IP EHR_064)
- IVR call fallback via EHR_074
- 53 total API/WebSocket endpoints documented
- 11-phase implementation checklist

---

## Iteration 6 — 2026-04-22

**Mode:** CHECKLISTS + OPERATIONS + ASSESSMENT + FUNCTIONAL FLOWS ENHANCEMENT
**Files Created:**
- `07_CHECKLIST_OPERATIONS_ASSESSMENT_FLOW.md` (2,242 lines — checklists, OT notes, PAC, incident reports, initial assessment 16 widgets, risk score, tasks, notifications)
- Enhanced `Functional Flows/patient journey.md` (856 → 1,675 lines — added login/session, messaging architecture, video consultation, lab results, data sync, API gateway)

**Key Details Documented:**
- Checklist lifecycle with yes/no + tick response types, sequential mode, witness workflow
- Operation notes with SNOMED-CT search, per-unit mandatory sections, PDF preview
- PAC version control with ASA I-VI, 3 value sets, authority check
- Incident report: max 2000 chars + 5 images, base64 upload pipeline
- Initial Assessment 16 widget sections with per-widget API codes, "No known..." checkbox pattern, SearchComponent with favorites + SNOMED, 22+ vital signs fields with BMI/BSA auto-calc
- Risk score D3.js chart (red >33, blue <=33), AI prediction parsing, VIS alternate view
- Activity area with 6 task categories and per-type routing
- Task create: NURSING-CAPTURE-NOTES, title max 25, date constraints
- Notification preferences: mandatory vs optional toggles
- 50+ additional API endpoints documented
- Functional Flows enhanced with source-code-level precision across all sections

---

## Iteration 7 — 2026-04-22

**Mode:** VITALS + PAST RECORDS + PLATFORM + CONSOLIDATION
**Files Created:**
- `08_VITALS_PAST_RECORDS_PLATFORM_FLOW.md` (1,724 lines — 13 vital params, past records, offline architecture, platform features)

**Key Details Documented:**
- 13 vital parameters with hex color mapping, 3 view modes (combined/individual/table)
- D3.js chart: line 1.5→2.5px hover, circles 3→6px, opacity 1.0→0.1, auto-scroll, fixed Y-axis
- BP processing: combined "120/80" vs individual fields (MDM_002 config)
- Temperature: auto C→F conversion, T1 secondary sensor
- Past records: consultation history 5/page infinite scroll, 4 parallel API calls per consultation
- 6 report download types with dual-auth pattern
- Summary card: 30+ clinical concept types including obstetrics/gynaecology
- Gallery view: fetch→base64→Filesystem, PDF viewer + pinch-zoom images
- Image editing: angular-cropperjs, 8 image limit, JPEG 80% quality
- Offline architecture: SQLite encrypted DB, 63 SecureStorage keys, 5-min sync
- Platform: notification preferences, feedback/surveys, downtime detection, FAQ, What's New

---

## Iteration 8 — 2026-04-22

**Mode:** CONSOLIDATION — README update, cross-reference alignment
**Files Updated:**
- `README.md` — Updated index (all 9 flows marked DONE, line counts, key numbers, functional flow link)
- Removed phantom planned entries (08-11) that are now covered by actual docs

**Status: ALL AADI FLOWS COMPLETE**
- 9 flow documents: 13,539 lines
- 1 functional flow: 1,675 lines
- Total: 15,214 lines of implementation-level documentation

---
