```md
Create/update bookmarks for feature `<FEATURE_NAME>`:

1) `bookmarks/<FEATURE_SLUG>/<FEATURE_SLUG>.md` = functionality/runtime context only  
2) `bookmarks/<FEATURE_SLUG>/<FEATURE_SLUG>-tests.md` = tests/snapshots only

Output format rules (strict):
- One repo-relative file path per line
- `#` comment lines allowed for section headers
- No bullets, no numbering, no explanatory prose inside files
- Paths must be relative to repo root

Scope rules:
- `<FEATURE_SLUG>.md` must include complete runtime context for `<FEATURE_NAME>`:
  - feature module files
  - routes/entry points
  - public APIs/barrels
  - hooks/state/core/utils/integrations
  - cross-feature consumers
  - required dependency chain files
- `<FEATURE_SLUG>.md` must exclude:
  - `*.test.ts`
  - `*.test.tsx`
  - `**/__tests__/**`
  - `**/__snapshots__/**`
  - `*.snap`

- `<FEATURE_SLUG>-tests.md` must include:
  - all direct feature tests/snapshots
  - external consumer/dependency tests that validate `<FEATURE_NAME>` behavior

Coverage verification before finalizing:
- include every file under primary feature folder(s): `<PRIMARY_FEATURE_PATHS>`
- include every file that imports feature public API: `<FEATURE_IMPORT_PATTERNS>`
- include all feature-related routes: `<FEATURE_ROUTE_PATTERNS>`
- include key dependency files: `<FEATURE_DEPENDENCY_FILES>`
- include all related tests/snapshots in tests bookmark

After writing both files:
- print full contents of both files
- print a short “missing check” result showing none missing for:
  - feature files
  - importers
  - routes
  - test files
```

Quick placeholders to replace:
- `<FEATURE_NAME>`: human name, e.g. `Cart`
- `<FEATURE_SLUG>`: folder/file slug, e.g. `cart`
- `<PRIMARY_FEATURE_PATHS>`: e.g. `src/components/Cart`
- `<FEATURE_IMPORT_PATTERNS>`: e.g. `@/components/Cart`
- `<FEATURE_ROUTE_PATTERNS>`: e.g. `app/**/cart*`, `app/**/checkout*`
- `<FEATURE_DEPENDENCY_FILES>`: explicit must-include paths for that feature





The Bookmarks Panel replaces the old Project Sidebar on the right side of PasteMax. It reads a bookmarks/ folder from the root of whichever repo you have open, and lets you
quickly select predefined sets of files with one click.  

  .md File Format

  Each .md file lists file paths (relative to repo root), one per line:

# Home screen feature

  src/components/Home/screen/HomeScreen.tsx
  src/components/Home/components/HeroCarousel.tsx
  src/components/Home/hooks/useAutoplay.ts
  src/features/home/queries.ts

  Rules:

- One file path per line (relative to project root)
- Lines starting with # are treated as comments (ignored)
- Blank lines are ignored
- Paths are matched case-insensitively against the loaded file list

  Behavior
  ┌───────────────────────────────────────────────┬─────────────────────────────────────────────────────────────────────┐
  │                    Action                     │                               Result                                │
  ├───────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ Click a bookmark (single mode)                │ Clears current selection, selects only the files listed in that .md │
  ├───────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ Toggle multi-select (checkbox icon in header) │ Enables combining multiple bookmarks                                │
  ├───────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ Click bookmarks in multi-select               │ Unions all active bookmarks' file lists                             │
  ├───────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ Click active bookmark in multi-select         │ Removes it from the union                                           │
  ├───────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ Turn off multi-select                         │ Clears all selections                                               │
  ├───────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ Edit .md file externally                      │ Panel auto-updates (file watcher detects changes)                   │
  ├───────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────┤
  │ No bookmarks/ folder                          │ Shows empty state with instructions                                 │
  └───────────────────────────────────────────────┴─────────────────────────────────────────────────────────────────────┘
  File Matching Logic

  When you click a bookmark, each line in the .md is matched against loaded files by:

  1. Exact relative path match
  2. Exact filename match
  3. Path ending match (e.g., HomeScreen.tsx matches src/components/Home/screen/HomeScreen.tsx)
  4. Partial path match (substring)

  Use Case / Prompt for Organizing

  Think of bookmarks as "saved file selections for common tasks". Organize by feature, layer, or workflow:
