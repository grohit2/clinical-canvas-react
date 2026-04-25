# Ralph PRD Bootstrap For Codex

You are preparing a Ralph task file for this repository.

## Goal

Create or replace `scripts/ralph/prd.json` based on the user brief.

## Rules

- Read `AGENTS.md`.
- Read `scripts/ralph/prd.json.example` and match its JSON structure.
- Do not touch the repository root `prd.json`. That file is unrelated planning state.
- Write valid JSON only to `scripts/ralph/prd.json`.
- Keep stories small enough that one fresh `codex exec` session can finish one story.
- Order stories by dependency and priority.
- Prefer `branchName` starting with `codex/`.
- Acceptance criteria should mention the most relevant validation commands for this repo.
- If a story changes UI, include browser verification when feasible.
- If the brief implies documentation output or architecture artifacts, encode those as small explicit stories instead of one giant story.

## Output Requirements

The generated `scripts/ralph/prd.json` must include:

- `project`
- `branchName`
- `description`
- `userStories`

Each user story must include:

- `id`
- `title`
- `description`
- `acceptanceCriteria`
- `priority`
- `passes`
- `notes`

## User Brief

The user brief will be appended below inside a `<brief>` block.
