# Apple App Store Readiness Checklist (Clinical Canvas)

This checklist helps decide whether Clinical Canvas is likely to pass App Store review and what must be listed in App Store Connect.

## Quick repo-based observations

From `apps/mobile/app.json`:

- iOS bundle identifier is configured (`com.clinicalcanvas.app`).
- Camera and photo library permissions are declared with user-facing strings via `expo-image-picker`.
- Secure/local storage plugins are present (`expo-secure-store`, `expo-sqlite`).

Potential gaps not yet visible in repo:

- No explicit in-app Privacy Policy screen/link is visible from this file alone.
- No clear declaration of account deletion workflow (required when account creation exists).
- No App Store Connect privacy questionnaire answers yet (done in Apple portal, not in code).

## What to list in App Store Connect

### 1) App metadata

- App name, subtitle, description, keywords, support URL, marketing URL.
- Category (likely Medical) and age rating answers.
- Copyright and primary contact details.

### 2) Privacy policy + support links

- Public Privacy Policy URL (mandatory).
- Support URL (mandatory).
- If used, Terms of Use URL.

### 3) App Privacy (“nutrition label”)

You must declare for each collected data type:

- What data is collected (e.g., health data, identifiers, diagnostics).
- Whether data is linked to user identity.
- Whether data is used for tracking.
- Purpose of collection (app functionality, analytics, etc.).

For a healthcare app, this section is heavily scrutinized; answers must match actual behavior.

### 4) Sign in / account handling

- Demo/test account credentials for App Review.
- If users can create accounts, provide **account deletion** path in app.
- If third-party login exists, comply with Sign in with Apple requirements.

### 5) Permission rationale

- Camera usage description.
- Photo library usage description.
- Any other iOS permission text if introduced later (notifications, microphone, location, etc.).

## Policy areas likely relevant to Clinical Canvas

### A) Medical app policy expectations

- Avoid making unverified diagnosis/treatment claims.
- Include clear medical disclaimers where needed.
- Ensure clinician-only tools are framed correctly and not as emergency-use consumer diagnostics.

### B) Data security expectations

- Encrypt data in transit (TLS).
- Protect sensitive data at rest.
- Limit data access by role.
- Maintain audit trails for sensitive actions.

### C) Content and moderation

- No misleading medical content.
- No unsafe or harmful medical instructions.
- If user-generated content exists, include reporting/blocking/removal mechanisms.

## Pre-submission checklist

- [ ] Privacy Policy URL is live and accurate.
- [ ] App Privacy questionnaire is fully completed in App Store Connect.
- [ ] Permission strings are specific and user-understandable.
- [ ] Review notes include test credentials and test steps.
- [ ] Account deletion is implemented and documented (if account creation is supported).
- [ ] App icon, screenshots, and preview media are current.
- [ ] Medical claims/disclaimers are reviewed by legal/compliance.
- [ ] Build passes on physical iOS devices and TestFlight.

## Recommended next steps for this repo

1. Add a dedicated in-app Privacy Policy screen and link.
2. Document account deletion flow (or explicitly state no account creation).
3. Prepare App Store Connect “App Privacy” answers from an internal data map.
4. Create an internal compliance sign-off checklist for legal/security before each release.

> Note: This checklist is operational guidance, not legal advice. Final compliance should be validated by legal/privacy counsel before submission.
