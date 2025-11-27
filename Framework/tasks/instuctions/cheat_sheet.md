# HMS Frontend Architecture - Quick Reference Cheat Sheet

> **Print this and keep at your desk!**

---

## 🎯 THE GOLDEN RULES

| If it's... | Put it in... |
|------------|--------------|
| Generic UI (Button, Modal) | `shared/components/` |
| Generic utility (cn, formatDate) | `shared/lib/` |
| Domain type/logic (Patient, normalizeStage) | `entities/<domain>/model/` |
| Domain data hook (usePatients) | `entities/<domain>/api/` |
| Domain UI (PatientCard) | `entities/<domain>/ui/` |
| Page/Screen (PatientsListPage) | `features/<name>/ui/` |
| Feature state hook (usePatientsFilters) | `features/<name>/model/` |
| Router, Providers, Guards | `app/` |

---

## ⛔ IMPORT RULES (NEVER VIOLATE)

```
shared ← entities ← features ← app

✅ features → entities ✅ features → shared
✅ entities → shared
✅ app → everything

❌ shared → entities    ❌ shared → features
❌ entities → features  ❌ features → features
```

---

## 📁 PATH ALIASES

```typescript
@shared/*   → src/shared/*
@entities/* → src/entities/*
@features/* → src/features/*
@app/*      → src/app/*
```

**Always use aliases, never relative imports across layers!**

---

## 🧪 QUICK TEST

**"Could this exist in a todo app?"**
- YES → `shared/`
- NO → continue...

**"Is it reusable domain logic/UI?"**
- YES → `entities/<domain>/`
- NO → continue...

**"Is it a page/screen?"**
- YES → `features/<name>/`
- NO → `app/` (if routing/wiring)

---

## 📝 NAMING CONVENTIONS

| Type | Convention | Example |
|------|------------|---------|
| Feature folders | `kebab-case` | `patient-list` |
| Entity folders | `singular` | `patient` |
| Components | `PascalCase.tsx` | `PatientCard.tsx` |
| Hooks | `use*.ts` | `usePatients.ts` |
| Tests | `*.test.tsx` | `PatientCard.test.tsx` |

---

## 🏗️ ENTITY STRUCTURE

```
entities/patient/
├── model/          # Types, normalize, validate
│   ├── types.ts
│   ├── normalize.ts
│   ├── stage.ts
│   └── validation.ts
├── api/            # React Query hooks
│   └── usePatients.ts
├── ui/             # Reusable components
│   ├── PatientCard.tsx
│   └── StageChip.tsx
└── index.ts        # Barrel export
```

**Entity UI Rules:**
- ✅ Receive data via props
- ✅ Emit events via callbacks
- ❌ NO useNavigate
- ❌ NO useParams
- ❌ NO route knowledge

---

## 🎨 FEATURE STRUCTURE

```
features/patient-list/
├── model/          # Feature state
│   └── usePatientsFilters.ts
├── ui/             # Pages & components
│   ├── PatientsListPage.tsx
│   └── PatientsListFilters.tsx
└── index.ts        # Barrel export
```

**Feature Rules:**
- ✅ Use entity hooks for data
- ✅ Use entity UI components
- ✅ Can use useNavigate, useParams
- ✅ Use paths.* for navigation
- ❌ NO importing from other features

---

## 🧭 NAVIGATION

```typescript
// Always use paths helper!
import { paths } from '@app/navigation';

// ✅ CORRECT
navigate(paths.patient(id));
navigate(paths.patientsAdd());

// ❌ WRONG
navigate(`/patients/${id}`);
navigate('/patients/add');
```

---

## 📊 DATA FLOW

```
API → Entity Hook → normalize() → Feature Page → Entity UI
```

**Always normalize in entity hooks!**

```typescript
// ✅ CORRECT
export function usePatients() {
  return useQuery({
    queryFn: async () => {
      const data = await api.patients.list();
      return data.map(normalizePatient);  // Always!
    },
  });
}
```

---

## 🔍 FIND VIOLATIONS

```bash
# shared importing from entities/features (BAD)
grep -r "from ['\"]@entities" src/shared/
grep -r "from ['\"]@features" src/shared/

# entities importing from features (BAD)
grep -r "from ['\"]@features" src/entities/

# Old-style imports (should be migrated)
grep -r "from ['\"]@/components" src/
grep -r "from ['\"]@/hooks" src/
grep -r "from ['\"]@/lib" src/
```

---

## ✅ CODE REVIEW CHECKLIST

- [ ] Code in correct layer?
- [ ] Import rules followed?
- [ ] Path aliases used?
- [ ] Entity UI has no routing?
- [ ] Data normalized in hooks?
- [ ] paths.* used for navigation?
- [ ] Barrel exports updated?
- [ ] Tests added?

---

## ⚠️ COMMON MISTAKES

| ❌ Wrong | ✅ Right |
|----------|----------|
| PatientCard in shared/ | PatientCard in entities/patient/ui/ |
| useNavigate in entity UI | Pass onClick callback from feature |
| Import from another feature | Move to entity or shared |
| Hardcoded routes | Use paths.* helper |
| Re-export files | Actually move the files |
| Normalize in component | Normalize in entity hook |

---

## 🆘 WHEN IN DOUBT

1. Check the full guidelines document
2. Look at existing code in the same layer
3. Ask: "Where would I look for this if I didn't write it?"
4. Ask a teammate

**The goal: Anyone should find any code in < 30 seconds**