# Clinical Canvas — Prompts & Implementation Ideology (Session Log)

Date: 2025-09-21
Scope: Backend + Frontend changes driven by user prompts during the session. This document captures the intent (“prompts”) and the concrete guardrails/ideology we now follow.

## Registration & MRN Flow
- Reserved-word fix: Always alias `status` as `#s` in DynamoDB UpdateExpressions for MRN pointer upserts.
- Safer `mrn_history`:
  - If existing value is a List → `list_append(mrn_history, :push)`
  - Else (legacy/non-list) → `mrn_history = :push`
- Conflict handling:
  - Pre-check `PK=MRN#<mrn>, SK=MRN` → 409 if owned by another patient.
  - In transaction, map `TransactionCanceledException + ConditionalCheckFailed` → 409.
  - Map `ValidationException` mentioning “reserved keyword” or “list_append” → 400.
  - Otherwise → 500 with `detail`.
- Logging:
  - Log `CancellationReasons` and include `uid`, `mrn`, and which step failed.
- Janitor:
  - Endpoint to normalize `mrn_history` to an empty List where missing/malformed.

## Uploads & Documents
- No category limits:
  - Remove preop_pics 3-image cap in all endpoints/paths.
  - Ignore `replaceOldest` if provided; app can upload any number of images.
- Lightbox (Google Photos UX):
  - Click to open full-screen; swipe left/right; Esc & backdrop to close.
  - Pinch-to-zoom; pan while zoomed; double-tap to toggle zoom.
  - Ensure `touch-action: none` for reliable gestures on mobile.

## Patient Grid & LIS
- Long-press behavior (iOS + Android):
  - Use touchend/mouseup to trigger navigation (>= 600 ms) within user gesture.
  - Guard against accidental triggers (movement tolerance ~12 px).
  - Navigate with `window.location.href` for iOS reliability (no overlay).

## TID & Surgery Information
- Fields added to patient schema (META row):
  - `tid_number` (optional), `tid_status` (DONE/PENDING), `surgery_code` (optional).
- Backend:
  - Allow PUT to update these fields; acceptable in PATCH /registration too.
  - toUiPatient maps to camelCase: `tidNumber`, `tidStatus`, `surgeryCode`.
- Frontend:
  - Create page & Edit page include fields under Registration.
  - TID Status uses ButtonGroup (DONE/PENDING – no dropdowns for consistency).
  - Patient Detail shows a compact summary above Labs:
    - Left: `TID: <number>` with copy; below: `Surgery: <code>`.
    - Right: status chip (yellow PENDING, green DONE).
    - Copy button copies both values and shows a toast.

## Spacing & Real Estate
- Reduced vertical gaps between overview cards (Labs, Documents, Journey) to better use space.
- Consistent compact paddings in overview to keep critical info above the fold.

## Error Semantics & Observability (Ideology)
- Never surface opaque 500s for expected conflicts/validation issues.
- Prefer early returns (pre-checks) for predictable UX, but keep transaction safety.
- Include rich context in logs for production diagnostics.

## Testing Cues
- Unit validation (mock DDB): ensure `ExpressionAttributeNames` includes `#s` aliases; `mrn_history` branch is selected correctly.
- Live validation: happy path (200), conflict path (409), legacy patients with malformed `mrn_history` (auto-coerce & succeed).
- Visual checks: lightbox gestures on iOS/Android; long-press LIS open on iOS.

---

This doc is a living log that captures not only “what” was changed but “why” and the operating principles (ideology) guiding those changes.
