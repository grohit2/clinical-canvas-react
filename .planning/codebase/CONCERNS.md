# Codebase Concerns

**Analysis Date:** 2026-02-09

## Tech Debt

**Incomplete Domain Migration:**
- Issue: Migration from feature-sliced to domain-driven architecture is incomplete. Many files still have TODO comments about import fixes and API implementation.
- Files:
  - `src/domains/patient-detail/core/types.ts` - TODO: Extract detail-specific types
  - `src/domains/patient-detail/core/labs.ts` - TODO: Implement grouping logic
  - `src/domains/patient-detail/hooks/useZoneData.ts` - TODO: Replace with actual data fetching
  - `src/domains/patient-detail/api/useUpdatePatient.ts` - TODO: Define update payload structure
  - `src/domains/patient-detail/api/usePatient.ts` - TODO: Implement actual API call
  - `src/domains/patient-detail/api/usePatientLabs.ts` - TODO: Implement actual API call
  - `src/domains/tasks/api/useCreateTask.ts` - TODO: Implement actual API call
  - `src/domains/tasks/api/useUpdateTask.ts` - TODO: Implement actual API call
  - `src/domains/patient-medications/api/useMedications.ts` - TODO: Implement actual API call
  - `src/domains/patient-notes/api/useCreateNote.ts` - TODO: Implement actual API call
  - `src/domains/discharge-summary/api/useCreateDischargeVersion.ts` - TODO: Implement actual API call
- Impact: Code may be using stub implementations instead of real API calls. Unclear which hooks are production-ready vs. placeholder.
- Fix approach: Complete all TODO items. Verify which API hooks are actually used vs. bypassed. Consider automated detection for unimplemented hooks.

**Redundant Shadow Field Handling:**
- Issue: API request building includes duplication of camelCase and snake_case field pairs for backend compatibility (lines 138-145 in `src/shared/lib/api.ts`).
- Files: `src/shared/lib/api.ts` (update method, lines 131-151)
- Impact: Increases maintenance burden, error-prone when adding new fields (easy to forget to add both variants).
- Fix approach: Create a helper function `toSnakeCase()` that's already defined but unused. Use it consistently to avoid manual shadow field mapping.

**Overly Large Components:**
- Issue: Several components exceed 600+ lines, violating single responsibility principle.
- Files:
  - `src/domains/discharge-summary/components/DischargeSummaryForm.tsx` - 755 lines (form state + rendering + export logic mixed)
  - `src/domains/profile/screens/ProfileScreen.tsx` - 585 lines
  - `src/domains/discharge-summary/core/export/structuredDischargeDocx.ts` - 570 lines
  - `src/domains/referrals/screens/ReferralsScreen.tsx` - 506 lines
  - `src/domains/patient-detail/components/NotesTab.tsx` - 400 lines
- Impact: Hard to test, debug, and maintain. High cognitive load when reading/modifying.
- Fix approach: Extract concerns into smaller, focused components/hooks. Use composition to reduce file size below 300 lines.

**Weak Error Handling Patterns:**
- Issue: Many error handlers use silent failures or overly generic error messages.
- Files:
  - `src/domains/patient-detail/components/MrnEditor.tsx` (lines 56-58): catch without logging
  - `src/domains/discharge-summary/components/DischargeSummaryForm.tsx` (lines 113-115): Silent failure on patient load
  - `src/domains/patient-detail/components/NotesTab.tsx`: `.catch(()=>{})` with empty handler
  - `src/domains/tasks/screens/EditTaskScreen.tsx`: Multiple `.catch(()=>{})` handlers
- Impact: Bugs silently fail, making production issues hard to diagnose. Users don't know why data didn't load.
- Fix approach: Implement structured error handling with proper logging. Always show user-friendly messages for failures. Log to monitoring service.

**Untyped Assertions:**
- Issue: Multiple uses of `as any` type assertions to bypass type safety.
- Files:
  - `src/domains/patient-detail/components/MrnEditor.tsx` (lines 92, 108): `cleanedHistory as any`
  - `src/shared/lib/api.ts` (lines 139-145): `(data as any).tidStatus`
  - `src/domains/dashboard/screens/DashboardScreen.tsx` (lines 95, 96, 100): `(p: any)` parameter
- Impact: Loses TypeScript type safety, hiding potential runtime errors at compile time.
- Fix approach: Remove all `as any` assertions. Fix underlying type definitions or use proper Partial<T> types.

**Debug Logging Left in Production:**
- Issue: Multiple console.log() calls with emoji prefixes remain in production code.
- Files:
  - `src/shared/lib/api.ts` (lines 23-52): Conditional logging for all patient PUT/PATCH requests
  - `src/domains/patient-detail/components/MrnOverview.tsx`: Multiple console.log() calls
  - `src/domains/patient-registration/components/PhotoUploader.tsx`: Detailed upload logging
  - `src/domains/patient-registration/screens/RegistrationScreen.tsx`: Form state logging
  - `src/domains/patient-registration/hooks/useRegistrationForm.ts`: Payload logging
- Impact: Exposes internal API structure and payload details in browser console. Performance impact from logging.
- Fix approach: Wrap all debug logs in `if (import.meta.env.DEV)` or use a structured logging service with environment-aware levels.

## Known Bugs

**MRN Editor Fallback Path Logic:**
- Symptoms: MRN changes may use fallback API path if primary route returns 500
- Files: `src/domains/patient-detail/components/MrnEditor.tsx` (lines 90-109)
- Trigger: Call `api.patients.overwriteMrn()` when endpoint doesn't exist
- Workaround: System falls back to sequential `switchRegistration()` then `updateMrnHistory()`, but this is fragile
- Issue: If backend returns "internal server error" for any reason, the fallback logic assumes route doesn't exist and retries. This masks real backend bugs.

**Unhandled Promise Rejection in Document Loading:**
- Symptoms: S3 event processing timeout silently proceeds
- Files: `src/domains/patient-registration/components/PhotoUploader.tsx`
- Trigger: S3 event processing waits 30 seconds then logs warning and continues
- Workaround: Code continues despite timeout, but file metadata may not be available
- Issue: If S3 metadata Lambda doesn't trigger, document won't show metadata until next page refresh

**Type Mismatch in Zone Data:**
- Symptoms: useZoneData hook may return incomplete data
- Files: `src/domains/patient-detail/hooks/useZoneData.ts`
- Trigger: Hook is stubbed with TODO comments and returns mock data
- Issue: Component hierarchy expects real data but gets placeholders

## Security Considerations

**Sensitive Data in localStorage:**
- Risk: localStorage is XSS-vulnerable. Storing discharge author info and patient view preferences there.
- Files:
  - `src/domains/discharge-summary/components/DischargeSummaryForm.tsx` (lines 59, 64, 84-85): localStorage for discharge author
  - `src/domains/patient-list/screens/PatientListScreen.tsx`: localStorage for view mode and scroll position
  - `src/shared/lib/pinnedPatients.ts`: localStorage for pinned patient list
- Current mitigation: Only non-sensitive UI state is stored
- Recommendations: Consider moving author info to backend session if it contains identifiable info. Implement Content-Security-Policy headers.

**API Request Logging Includes Sensitive Payloads:**
- Risk: Patient update requests log entire request body including medical data
- Files: `src/shared/lib/api.ts` (lines 23-52)
- Current mitigation: Logging only triggers for patient endpoints
- Recommendations: Never log request/response bodies in production. Use request ID correlation instead.

**No CORS Whitelist Configuration:**
- Risk: API base URL comes from env var but no validation that it's trusted
- Files: `src/shared/lib/api.ts` (line 3)
- Current mitigation: Relies on VITE_API_BASE_URL environment variable
- Recommendations: Implement origin validation or use relative paths to same-origin API.

**Missing Input Validation:**
- Risk: File uploads accept any mimeType in presign request without validation
- Files: `src/shared/lib/filesApi.ts` (line 30): Hard-coded MIME types but custom types could be injected
- Current mitigation: Type definitions restrict mimeType options
- Recommendations: Validate file extensions server-side. Implement file content type checking.

## Performance Bottlenecks

**Large Component Render Without Memoization:**
- Problem: PatientCard (273 lines) renders patient list items without useMemo/useCallback
- Files: `src/domains/patient-list/components/PatientCard.tsx`
- Cause: Each filter/sort triggers full list re-render
- Improvement path: Implement React.memo for PatientCard. Memoize filter functions. Consider virtualization for large lists.

**Redundant API Calls in Patient Detail:**
- Problem: Patient data fetched from multiple sources (main API + timeline + labs + separate requests)
- Files: `src/domains/patient-detail/api/usePatient.ts`, `usePatientLabs.ts`, `usePatient.ts` in main shared lib
- Cause: No request deduplication or cache invalidation strategy
- Improvement path: Implement React Query's request deduplication. Centralize patient data fetching to single source.

**Unoptimized Discharge Summary Export:**
- Problem: DOCX generation is synchronous and large (570 lines)
- Files: `src/domains/discharge-summary/core/export/structuredDischargeDocx.ts`
- Cause: Section building and formatting done in main thread
- Improvement path: Move export generation to Web Worker. Stream sections incrementally.

**Shadow Field Duplication in API Payloads:**
- Problem: Every patient update sends both camelCase and snake_case versions of fields
- Files: `src/shared/lib/api.ts` (lines 138-145)
- Cause: No automatic transformation function used
- Improvement path: Implement server-side parsing of camelCase only. Or use automatic transformation at serialization layer.

**Scroll Restoration Logic:**
- Problem: Patient list caches scroll position in sessionStorage and DOM queries on mount
- Files: `src/domains/patient-list/screens/PatientListScreen.tsx`
- Cause: Manual scroll restoration instead of using browser's native restoration
- Improvement path: Use Window.history.scrollRestoration = 'auto'. Rely on React Router scroll to top utilities.

## Fragile Areas

**MRN Editor with Complex State Machine:**
- Files: `src/domains/patient-detail/components/MrnEditor.tsx` (238 lines)
- Why fragile:
  - Multiple API calls with sequential fallback logic (lines 90-109)
  - Ref mutation (`originalLatestRef.current`)
  - Cancel flag for async operations
  - Type casting with `as any` bypasses safety
- Safe modification: Add E2E tests for MRN switching before any changes. Extract API call logic to separate hook.
- Test coverage: No tests exist for MRN editor fallback logic

**Discharge Summary Form:**
- Files: `src/domains/discharge-summary/components/DischargeSummaryForm.tsx` (755 lines)
- Why fragile:
  - Deeply nested state (sectionState with multiple keys)
  - Full-screen editor mode state (`fullScreenField`)
  - Export generation with try-catch without proper validation
  - Auto-fill logic that mutates state based on patient data
  - Multiple independent save paths (draft vs published)
- Safe modification: Split into smaller components before modifying. Add snapshot tests for state transformations.
- Test coverage: No tests for state transitions or export generation

**API Client Fallback Logic:**
- Files: `src/shared/lib/api.ts` (entire file, especially discharge.getLatest at line 294)
- Why fragile:
  - Silent failure on 404 vs other error types (line 301-306)
  - Reliance on error message pattern matching for route detection
  - Inconsistent error handling across different API methods
- Safe modification: Create error handling enum with explicit error types. Never rely on error message patterns.
- Test coverage: No unit tests for error scenarios

**Patient Detail Zones (Blue/Red/Yellow/Green):**
- Files:
  - `src/domains/patient-detail/components/zones/BlueZone.tsx`
  - `src/domains/patient-detail/components/zones/RedZone.tsx`
  - `src/domains/patient-detail/components/zones/YellowZone.tsx`
  - `src/domains/patient-detail/components/zones/GreenZone.tsx`
- Why fragile: Likely depends on useZoneData hook which is stubbed with TODO comments
- Safe modification: Implement actual data fetching before modifying zone rendering logic
- Test coverage: No tests found (12 test files for 221 source files = 5% coverage)

## Test Coverage Gaps

**No API Error Scenario Testing:**
- What's not tested: Network errors, 404/500 responses, timeout behavior
- Files: `src/shared/lib/api.ts`
- Risk: Silent failures in production when API goes down
- Priority: High - affects user experience for any data operation

**No Form Validation Testing:**
- What's not tested: MRN validation, medication dosage validation, note field constraints
- Files:
  - `src/domains/patient-registration/hooks/useRegistrationForm.ts` (239 lines)
  - `src/domains/patient-medications/components/MedicationForm.tsx` (266 lines)
  - `src/domains/patient-notes/components/NoteForm.tsx`
- Risk: Invalid data submitted to backend causing validation errors users don't understand
- Priority: High - directly impacts data quality

**No State Machine Testing:**
- What's not tested: Patient state transitions (discharge workflow), task status changes, registration progression
- Files: `src/domains/patient-workflow/screens/DischargeScreen.tsx`
- Risk: Impossible states reached in production
- Priority: High - impacts core clinical workflow

**No Integration Testing:**
- What's not tested: Multi-domain workflows (patient registration → document upload → discharge summary)
- Files: E2E tests in `e2e/` directory exist but likely incomplete
- Risk: Bugs only manifest in real user workflows
- Priority: Medium - blocked on E2E framework setup

**No Photo Upload Edge Cases:**
- What's not tested: Upload cancellation, retry behavior, S3 timeout fallback path
- Files: `src/domains/patient-registration/components/PhotoUploader.tsx`
- Risk: Silent failures or orphaned uploads
- Priority: Medium - edge case behavior

## Scaling Limits

**N+1 Problem in Patient Lists:**
- Current capacity: Can display ~100 patients before noticeable slowdown
- Limit: Each patient card may trigger additional metadata requests
- Scaling path: Implement virtualization (react-window), paginate API responses, reduce detail in list view

**Browser Storage Limits:**
- Current capacity: ~5-10MB localStorage available
- Limit: localStorage cache in patient list may hit quota
- Current usage: patientsCache stored in localStorage (could grow large)
- Scaling path: Use IndexedDB for large datasets, implement cache expiration strategy

**Large Discharge Summary Generation:**
- Current capacity: ~50KB document with inline images
- Limit: DOCX generation becomes slow with many sections/images
- Scaling path: Implement server-side generation, use streaming for multi-page exports

**API Payload Size:**
- Current capacity: Patient update payloads include duplicate fields (camelCase + snake_case)
- Impact: 2x network traffic for patient updates
- Scaling path: Standardize on single naming convention, implement API request compression

## Dependencies at Risk

**React Router v6 Import Issues:**
- Risk: Navigation hooks may have compatibility issues with older browsers
- Impact: Route guards might not work properly
- Files: Used throughout for navigation
- Migration plan: Consider migrating to TanStack Router for better type safety

**React Hook Form with Complex Validation:**
- Risk: Zod schema validation may have performance implications for large forms
- Impact: Form submission delays on slow devices
- Files: `src/domains/patient-registration/hooks/useRegistrationForm.ts`
- Migration plan: Implement debounced validation or move validation to backend

**Radix UI Dependency Chain:**
- Risk: 30+ individual @radix-ui packages could lead to versioning conflicts
- Impact: Breaking changes in minor updates could cascade
- Files: All UI components use Radix
- Migration plan: Consolidate to single major version strategy, implement version pinning in lockfile

**Outdated Type Definitions:**
- Risk: @types/qrcode (line 47 in package.json) may be stale
- Impact: Type errors in QR code generation features
- Migration plan: Check qrcode package for native types, update to latest versions

## Missing Critical Features

**No Request Deduplication:**
- Problem: Same patient fetch called multiple times from different components leads to race conditions
- Blocks: Optimistic updates, real-time sync
- Impact: Stale data displayed, inconsistent state

**No Offline Support:**
- Problem: App has no offline queue or service worker
- Blocks: Mobile usage in poor connectivity areas
- Impact: Data loss on connection drop

**No Audit Logging:**
- Problem: Who changed what and when not tracked
- Blocks: Compliance requirements, forensic debugging
- Impact: Can't trace which user made changes to sensitive medical data

**No Real-time Collaboration:**
- Problem: Multiple users editing same patient data causes conflicts
- Blocks: Multi-doctor workflows
- Impact: Data overwrites without warning

**No Progressive Image Loading:**
- Problem: Large discharge summary images block rendering
- Blocks: Fast initial load times
- Impact: Poor perceived performance on mobile

---

*Concerns audit: 2026-02-09*
