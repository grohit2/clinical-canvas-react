# Duty — Junior Doctor Task UI

Standalone, dark-mode, mobile-first companion app for junior doctors. No AI surfaces, no proposal flow — just **see what's due, do it, mark it, copy context when you need to message someone**.

Visual language lifted from the [Google Cricket Scorecard design system](https://claude.ai/design): dense, broadcast-grade, three-elevation dark palette, semantic color only, no shadows.

## Why a separate app

- The main React app (`src/`) is light-mode + shadcn/ui + senior/admin workflows. Mixing junior duty UI in would either bleed the dark theme or compromise the density.
- Junior doctors live on a phone. This app is hard-capped at `max-width: 420px`. The main app is desktop-aware.
- Zero build step keeps iteration fast and deploy trivial (any static host).

## Stack

- **React 18** + **Babel 7** via CDN (mirrors the design source pattern)
- Vanilla `fetch` against the deployed HMS Lambda Function URL
- Single CSS file (`clinical.css`), pixel-extracted from the design system

No bundler. No npm. Open `index.html`.

## Run locally

```bash
# from repo root
python3 -m http.server 5174 --directory apps/duty
# or
npx serve apps/duty -l 5174
```

Open `http://localhost:5174/`.

## First-run flow

1. Identity picker appears. Pick yourself from the staff directory (queries `GET /directory/staff?department=General Surgery`).
2. If you don't exist yet, tap **+ Add new doctor** to create yourself (POSTs `/doctors`).
3. Duty board loads. Tasks assigned to your `userId` come from `GET /tasks/changes/latest?scope=assignee&id=<userId>` — one query, server fan-out.

Identity is persisted to `localStorage` (`duty.identity.v1`). Sign out from the bottom tab bar.

## Screens

| Hash | Screen | Purpose |
|---|---|---|
| `#/` | **Duty board** | My tasks today grouped by Overdue / Due now / Pending / Later / Done. Day summary copy. |
| `#/task/<patientUid>/<taskId>` | **Task detail** | One task with full history. Quick actions: Start / Done / Pending / Block. Copy human, agent, or task id. |
| `#/patient/<patientUid>` | **Patient tasks** | All tasks for one patient. Copy patient context (full agent-context JSON) or compact task list. |

## Copy features (no AI needed)

- **Day summary** — multiline broadcast-style WhatsApp text for handover at end of shift.
- **Task** — single task in human or agent JSON form, server-generated via `GET /patients/:id/tasks/:taskId/copy?format=`.
- **Patient context** — full `HMS-CONTEXT v1` block from `GET /patients/:id/agent-context` for pasting into any LLM.
- **Compact task list** — markdown bullets, scoped to one patient.
- **IDs (MRN, taskId)** — one-tap copy chips.

## Backend

Hits `https://kfzsv6at3amrxzl5kzuehljfju0rhkup.lambda-url.ap-south-1.on.aws` (the `hms-hyd-dev` stack, `HMS-HYD` table). No auth required currently. Change `BASE` in `api.js` to point elsewhere.

## File map

```
apps/duty/
├── index.html          # bootstrap: React+Babel CDN, script tags
├── clinical.css        # all tokens + components, lifted from design system
├── api.js              # window.api — fetch wrapper + identity persistence
├── clipboard.js        # window.clip — copy + toast
├── App.jsx             # hash router + identity gate
├── DutyBoard.jsx       # the home screen
├── TaskDetail.jsx      # one task drill-in
├── PatientTasks.jsx    # all tasks for one patient
└── components/
    ├── TopBar.jsx
    ├── CopyButton.jsx
    ├── TaskRow.jsx
    ├── PriorityHeader.jsx
    ├── QuickActions.jsx
    ├── IdentityPicker.jsx
    └── EmptyState.jsx
```

## Deploy

It's static files. Three options:

1. **S3 + CloudFront** — drop the folder into a bucket, point CloudFront. Same pattern as `hms-patient-files-hyd-dev`.
2. **Vercel / Netlify** — drag the folder, done.
3. **The existing CloudFront distribution** (`ESSEVO9MR5W3`) — add an `/duty/*` behavior pointing at a new origin.

No build, no env vars, no secrets.

## What's deliberately NOT in here

- No AI / chat / proposal UI. Juniors won't have AI access per the brief.
- No task creation form. Juniors execute; seniors/admin create via the main app.
- No long-form notes. Use the main app for that.
- No graphs / vitals trends. Use the main app's patient detail.
- No emojis. Anywhere. Per the design system.
