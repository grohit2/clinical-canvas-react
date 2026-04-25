# Codex Ralph

This is a Codex-native adaptation of the Ralph loop pattern from [`snarktank/ralph`](https://github.com/snarktank/ralph).

It keeps the original "fresh session per iteration" model, but swaps the worker runtime to `codex exec` and adds repo-local Codex hooks for guardrails and Ralph-specific context injection.

## What Changed For Codex

- The loop runner is `scripts/ralph/ralph-codex.sh`.
- The brief-to-PRD wrapper is `scripts/ralph/codexralph-loop.sh`.
- The worker prompt is `scripts/ralph/codex-prompt.md`.
- Repo-local Codex hooks live in `.codex/hooks.json`.
- Runtime state stays under `scripts/ralph/` instead of reusing the repo root `prd.json`.

## Prerequisites

- Codex CLI installed and authenticated.
- `jq` installed.
- A trusted Codex project. Repo-local hooks only run when Codex trusts the project.

Recommended Codex CLI version: `0.121.0` or newer.

Your local install on April 23, 2026 is `codex-cli 0.118.0`, which can still run this setup because the project config enables the `codex_hooks` feature flag.

## Files

- `scripts/ralph/prd.json.example` - sample PRD state file
- `scripts/ralph/codex-prompt.md` - prompt for each fresh Codex worker session
- `scripts/ralph/ralph-codex.sh` - loop runner
- `.codex/config.toml` - enables hooks for this repo
- `.codex/hooks.json` - repo-local hook definitions

## Setup

1. Copy the example PRD:

```bash
cp scripts/ralph/prd.json.example scripts/ralph/prd.json
```

2. Edit `scripts/ralph/prd.json` for the feature you want Codex to implement.

3. Run the loop:

```bash
./scripts/ralph/ralph-codex.sh 10
```

## One-Command Flow

If you want the closest Codex equivalent to `/ralph-loop "long brief here"`, use:

```bash
./scripts/ralph/codexralph-loop.sh "long brief here" 20
```

or:

```bash
npm run codex:ralph-loop -- "long brief here" 20
```

That wrapper:

- turns the brief into `scripts/ralph/prd.json`
- validates the generated PRD shape
- starts `scripts/ralph/ralph-codex.sh`

If you only want the PRD generated:

```bash
./scripts/ralph/codexralph-loop.sh --prepare-only "long brief here"
```

The loop will create `scripts/ralph/progress.txt` on first run and archive prior state if `branchName` changes between runs.

## Notes

- Runtime Ralph files are ignored by git in `.gitignore`.
- The loop uses `approval_policy = "never"`, `sandbox_mode = "workspace-write"`, and `--ephemeral` fresh sessions for non-interactive runs.
- Repo-local hooks block destructive shell commands such as `git reset --hard` and `git clean -fd`.
- The `UserPromptSubmit` hook injects a short Ralph summary only when the prompt contains the `RALPH_EXEC_MODE=1` marker used by `scripts/ralph/codex-prompt.md`.
- Codex does not currently support a repo-defined `/ralph-loop` slash command here, so `codexralph-loop.sh` is the intended equivalent entrypoint.
