RALPH_EXEC_MODE=1

# Ralph Agent Instructions For Codex

You are running inside one fresh `codex exec` session in a Ralph-style loop.

Your job is to complete one story cleanly, or leave behind better context for the next fresh session.

## Source Of Truth

- `scripts/ralph/prd.json`
- `scripts/ralph/progress.txt`
- `AGENTS.md`

The repository root also contains a separate `prd.json` for planning work. Do not use or overwrite that file for Ralph state.

## Task

1. Read `scripts/ralph/prd.json`.
2. Read `scripts/ralph/progress.txt` if it exists. Start with the `## Codebase Patterns` section.
3. Read `AGENTS.md` and any closer `AGENTS.md` files relevant to the directories you modify.
4. Ensure you are on the branch from `branchName`. If needed, create it from `main`.
5. Pick the highest-priority story where `passes` is `false`.
6. Implement exactly that single story.
7. Run the checks that prove the story. Default repo checks are:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
8. If the story changes UI, verify it in browser tooling when feasible. Use Playwright or another available browser tool. If browser verification is not feasible, say so in `scripts/ralph/progress.txt`.
9. If you discover reusable knowledge, update the nearest relevant `AGENTS.md`.
10. If checks pass:
    - commit all relevant changes with `feat: [Story ID] - [Story Title]`
    - update that story in `scripts/ralph/prd.json` so `passes` becomes `true`
    - append a success entry to `scripts/ralph/progress.txt`
11. If you cannot finish the story in this session:
    - do not mark it as passed
    - do not discard useful work
    - append a short blocker note to `scripts/ralph/progress.txt` so the next session starts with better context

## Progress Format

Append to `scripts/ralph/progress.txt`. Never replace the file.

```text
## [Date/Time] - [Story ID]
- Status: success | blocked
- What changed
- Files touched
- Checks run
- Learnings for future iterations:
  - Reusable patterns
  - Gotchas
  - Useful context
---
```

If you discover a reusable pattern that future runs should know, also keep the `## Codebase Patterns` section near the top of `scripts/ralph/progress.txt` up to date.

## Codex-Specific Guidance

- You may use subagents for bounded sidecar work that does not block your next local step, but keep final implementation and validation under local control.
- Use `js_repl` for quick Node-backed analysis when that is faster than creating throwaway files.
- Do not revert unrelated worktree changes.

## Stop Condition

After completing a story, check whether every story now has `passes: true`.

If all stories pass, end your final response with:

`<promise>COMPLETE</promise>`

If stories still remain, end normally and the next fresh Codex session will continue.
