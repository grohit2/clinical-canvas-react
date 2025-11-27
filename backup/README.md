# Backup Folder

This folder contains legacy code that has been replaced by the new Feature-Sliced Design architecture.

**Do NOT import from this folder.** These files are kept only for reference in case something needs to be restored.

## Contents

### legacy-documents/
Backed up on: 2025-11-26

**Files:**
- `DocumentsPage.tsx` - Original monolithic documents page (32KB)
  - Replaced by: `src/features/patient-documents/ui/DocumentsRootPage.tsx` and `DocumentsFolderPage.tsx`

- `DocumentGrid.tsx` - Original document grid component
  - Replaced by: `src/entities/document/ui/DocumentGrid.tsx`

- `features-documents/` - Placeholder documents feature folder
  - `pages/DocumentsRoot.tsx` - placeholder
  - `pages/DocumentsFolder.tsx` - placeholder
  - `api/documents.client.ts` - API client
  - `api/documents.types.ts` - Types
  - Replaced by: `src/entities/document/` and `src/features/patient-documents/`

## How to Restore

If you need to restore any of these files:

1. Copy the file from backup to its original location
2. Update imports in App.tsx or other files as needed
3. Run `npx tsc --noEmit` to verify no type errors

## New Architecture

The new code follows Feature-Sliced Design:

```
src/
├── entities/document/       # Document entity (types, API hooks, UI components)
│   ├── model/types.ts
│   ├── model/mapFromApi.ts
│   ├── api/usePatientDocuments.ts
│   └── ui/                  # DocumentGrid, DocumentLightbox, etc.
│
└── features/patient-documents/  # Document management feature
    └── ui/
        ├── DocumentsRootPage.tsx
        └── DocumentsFolderPage.tsx
```
