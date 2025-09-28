# Nexify Docs (Nextra)

Markdown-first, Obsidian-friendly docs with per-instance changelogs and agent-ready frontmatter.

## Quick Start
```bash
npm i
npm run dev
# open http://localhost:3000
```

## Templates
See `/templates` and `DOC_TEMPLATE.md` for how to use them.

## llm.txt
Root-level `LLM.txt` teaches AIs how to read these docs (entrypoints, routing, semantics).

## Changelog (instances → day → month → year → version)

Create a change instance:
```bash
npm run chg:inst -- --title "feat(frontend): add search" --scope frontend --refs "PR#123,ISSUE#9" --body "Optional details"
```

Aggregate to day/month/year (today by default):
```bash
npm run chg:aggregate
# or a specific date
npm run chg:aggregate -- --date 2025-09-26
```

Build a version file from instances since the previous version:
```bash
npm run chg:version -- --version 0.1.0 --name "Initial Release"
```

## Tracing
```bash
npm run trace:new -- --file pages/docs/architecture/backend.md --note "Updated API endpoints" --scope backend
```

## CI
- `.github/workflows/daily-aggregate.yml` runs nightly to build day/month/year pages.
- `.github/workflows/version-from-release.yml` builds a `versions/vX.Y.Z.md` on GitHub Releases.
