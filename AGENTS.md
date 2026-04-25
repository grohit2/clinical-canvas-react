# Clinical Canvas

## Workspace
- This repo is a Vite + React + TypeScript application.
- Run repo-level commands from the repository root.
- The repo already has a root `prd.json` for product planning. Ralph loop state lives under `scripts/ralph/`; do not overwrite the root file when working on Ralph stories.

## Core Commands
- `npm run dev` starts the Vite dev server.
- `npm run typecheck` runs TypeScript checks.
- `npm run lint` runs ESLint.
- `npm run build` creates a production build.
- `npm run test:e2e` runs the Playwright suite when the app is available.

## Codex Notes
- Prefer `npm run typecheck`, `npm run lint`, and `npm run build` as the default validation set for code changes in this repo.
- For UI stories, verify in the browser with Playwright or another available browser tool when feasible. If browser verification is not feasible in the current run, say so explicitly.
- Use `js_repl` for short Node-backed transforms or JSON inspection when that is faster than creating a throwaway script.
- Do not revert unrelated worktree changes. This repo is often used with parallel agent or local manual edits.

## Ralph Loop
- Ralph state files live in `scripts/ralph/`.
- `scripts/ralph/prd.json` is the active Ralph task list.
- `scripts/ralph/progress.txt` is the append-only cross-iteration memory file.
- `scripts/ralph/codex-prompt.md` is the worker prompt used by `scripts/ralph/ralph-codex.sh`.
- `scripts/ralph/codexralph-loop.sh` is the one-command wrapper that turns a long brief into `scripts/ralph/prd.json` and can then start the loop.
