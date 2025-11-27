# CONTEXT.md - HMS Clinical Canvas Frontend

> **READ THIS FIRST** before making any changes to this codebase.
> This document defines the architecture, rules, and patterns that ALL code must follow.

---

## Project Overview

**HMS Clinical Canvas** is a React-based frontend for hospital management, focusing on patient workflows from admission to discharge.

**Tech Stack:**
- React 18 + TypeScript
- Vite (bundler)
- React Router v6
- TanStack React Query
- React Hook Form + Zod
- Tailwind CSS + shadcn/ui
- Vitest (testing)

---

## Architecture: Layered by Domain

This codebase follows a **layered, domain-driven architecture**:

```
src/
├── app/        # Composition root (routing, providers)
├── shared/     # Generic, app-agnostic code
├── entities/   # Domain building blocks (patient, document)
└── features/   # Complete user flows/screens
```

### Layer Responsibilities

| Layer | Purpose | Examples |
|-------|---------|----------|
| `shared/` | Generic UI & utils (could exist in ANY app) | Button, Card, useToast, cn() |
| `entities/` | Domain-specific reusables (HMS-specific) | PatientCard, normalizeStage, usePatients |
| `features/` | Complete pages/screens | PatientsListPage, PatientDetailPage |
| `app/` | Wiring (routes, providers, guards) | App.tsx, navigation.ts |

---

## ⛔ IMPORT RULES - CRITICAL

These rules are **NEVER** to be violated:

```
shared ← entities ← features ← app

✅ ALLOWED:
- features can import from entities and shared
- entities can import from shared
- app can import from everything

❌ FORBIDDEN:
- shared CANNOT import from entities or features
- entities CANNOT import from features
- features CANNOT import from other features
```

**If you need to share code between features:**
1. Move it to `entities/` (if domain-specific)
2. Move it to `shared/` (if generic)

---

## Path Aliases

Always use these aliases for imports:

```typescript
import { Button } from '@shared/components/ui/button';
import { usePatients, PatientCard } from '@entities/patient';
import { PatientsListPage } from '@features/patient-list';
import { paths } from '@app/navigation';
```

**Never use relative imports across layers!**

---

## Key Patterns

### 1. Entity Structure

Every entity has three parts:

```
entities/patient/
├── model/     # Types, normalization, validation
├── api/       # React Query hooks
├── ui/        # Reusable UI components
└── index.ts   # Barrel export
```

### 2. Feature Structure

Every feature has:

```
features/patient-list/
├── model/     # Feature-specific state hooks
├── ui/        # Page components
└── index.ts   # Barrel export
```

### 3. Data Normalization

**Always normalize API data in entity hooks:**

```typescript
// entities/patient/api/usePatients.ts
export function usePatients() {
  return useQuery({
    queryFn: async () => {
      const data = await api.patients.list();
      return data.map(normalizePatient);  // ALWAYS normalize!
    },
  });
}
```

### 4. Navigation

**Always use the paths helper:**

```typescript
import { paths } from '@app/navigation';

// ✅ Correct
navigate(paths.patient(id));

// ❌ Wrong
navigate(`/patients/${id}`);
```

### 5. Entity UI Components

Entity UI components:
- ✅ Receive data via props
- ✅ Emit events via callbacks (onClick, onPin)
- ❌ Do NOT use useNavigate
- ❌ Do NOT use useParams
- ❌ Do NOT know about routes

---

## Decision Framework

### "Where does this code go?"

1. **Could it exist in a todo app?** → `shared/`
2. **Is it reusable domain logic/UI?** → `entities/<domain>/`
3. **Is it a page/screen?** → `features/<feature>/`
4. **Is it routing/providers?** → `app/`

### "Should I create a new entity?"

Create entity if:
- It's a core domain concept
- It has its own API endpoints
- It needs normalization/validation
- Its UI is used in 2+ features

### "Should I create a new feature?"

Create feature if:
- It's a distinct user flow
- It has its own URL/route
- It needs URL state (params, search)

---

## File Naming

| Type | Convention | Example |
|------|------------|---------|
| Feature folders | `kebab-case` | `patient-list` |
| Entity folders | `singular` | `patient` |
| Components | `PascalCase.tsx` | `PatientCard.tsx` |
| Hooks | `use*.ts` | `usePatients.ts` |
| Tests | `*.test.tsx` | `PatientCard.test.tsx` |

---

## Quick Validation Commands

```bash
# Build check
npm run build

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Tests
npm test

# Find architecture violations
grep -r "from ['\"]@entities" src/shared/
grep -r "from ['\"]@features" src/shared/
grep -r "from ['\"]@features" src/entities/
```

---

## Current Entities

| Entity | Status | Contains |
|--------|--------|----------|
| `patient` | ✅ Complete | Types, normalize, stage, comorbidities, validation, API hooks, UI |
| `document` | ✅ Complete | Types, mapping, API hooks, UI (grid, lightbox) |
| `task` | 🔲 Planned | - |
| `medication` | 🔲 Planned | - |

---

## Current Features

| Feature | Route | Status |
|---------|-------|--------|
| `patient-list` | `/patients` | ✅ Complete |
| `patient-detail` | `/patients/:id` | ✅ Complete |
| `patient-registration` | `/patients/add`, `/patients/:id/edit` | ✅ Complete |
| `patient-documents` | `/patients/:id/docs` | ✅ Complete |
| `patient-workflow` | `/patients/:id/admission` etc. | ✅ Complete |
| `dashboard` | `/` | ✅ Complete |
| `referrals` | `/referrals` | ✅ Complete |

---

## For AI Assistants

When generating code for this project:

1. **Always check which layer** the code belongs to
2. **Never violate import rules** - check the dependency direction
3. **Use path aliases** (@shared/, @entities/, @features/, @app/)
4. **Normalize data** in entity API hooks
5. **Use paths helper** for navigation
6. **Entity UI has no routing** - pass callbacks instead
7. **Check existing patterns** in similar files before writing new code

---

## Documentation

- `docs/ARCHITECTURE.md` - Full architecture documentation
- `docs/CHEAT_SHEET.md` - Quick reference
- `docs/TASKS.md` - Migration task tracking

---

## Questions?

If unclear where code should go:
1. Check this document
2. Check similar existing code
3. Apply the decision framework
4. Ask the team

**The goal: Anyone should find any code in < 30 seconds**