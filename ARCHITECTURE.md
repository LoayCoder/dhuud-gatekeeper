# Architecture Documentation

Last updated: March 2026

---

## Project Structure

```
src/
├── components/          # Shared UI only (ui/, layout/, shared/)
├── features/            # Feature-based modules (10 domains)
│   ├── incidents/
│   ├── investigation/
│   ├── contractors/
│   ├── admin/
│   ├── security/
│   ├── assets/
│   ├── ptw/
│   ├── risk-assessment/
│   ├── notifications/
│   └── users/
├── hooks/               # Shared utility hooks only
├── pages/               # Route-level pages
├── providers/           # AppProviders + AuthenticatedProviders
├── services/            # (empty — all services inside features/)
└── lib/                 # Utilities + shared zod schemas
```

---

## Architectural Rules

### 1. Feature-based Organization

- Every domain lives in src/features/[domain]/
- Structure per feature:
  components/ hooks/ services/ types/ index.ts
- NO domain-specific code in src/components/ or src/hooks/

### 2. Service Layer

- All Supabase calls live in service files
- Pattern: src/features/[domain]/services/[name]Service.ts
- Hooks are thin wrappers around React Query
- Components NEVER call supabase directly

### 3. Form Management

- All forms use react-hook-form + zod
- Schema files live next to components: [Name]Schema.ts
- Shared validators: src/lib/validations/common.ts

### 4. Component Size Limits

- Components: max 400 lines
- Hooks: max 450 lines (cohesive exceptions allowed)
- Services: max 300 lines

### 5. TypeScript

- Zero eslint-disable suppressions
- Zero as any (target — see Known Debt below)

---

## Form Migration Status

### Completed

| Form | Type | Notes |
|------|------|-------|
| PublicRequestPage | Full migration | 17 useState removed |
| ProjectFormDialog | Full migration | 16 useState removed |
| CreatePermit | Intentional exception | SIMOPS logic |
| ManhoursDialog | Type safety only | God Object typed |
| QuickIncidentReport | Service extraction | Supabase → service |
| ~44 MEDIUM forms | Full/partial migration | See batch reports |

### Intentional Exceptions (useState kept)

These forms are intentionally NOT migrated to react-hook-form.
Reason is documented in each file as an ARCHITECTURE NOTE comment.

| Form | Reason |
|------|--------|
| CreatePermit | SIMOPS + Mobilization business logic |
| ManhoursDialog | God Object prop from parent — typed instead |
| ShiftHandoverForm | Signature pad + dynamic arrays |
| VacationHandoverForm | Same as ShiftHandoverForm |
| WitnessVoiceRecording | 12/15 states are recording UI, not form data |

---

## Known Technical Debt

### as any — 2,355 instances (220 files)

- Origin: Mass-applied during schema evolution phase
- Impact: Reduces TypeScript strictness
- Priority: LOW — Vite build succeeds, runtime unaffected
- Plan: Eliminate domain by domain in future sprints
- Owner: Next developer assigned to type cleanup sprint

### Recommended elimination order:

1. src/features/incidents/ (~estimated highest density)
2. src/features/investigation/
3. src/features/contractors/
4. Remaining features alphabetically

---

## Provider Architecture

```
<AppProviders>                    ← QueryClient, Themes, Tooltip,
  │                                  OneSignal + companions
  └── <BrowserRouter>
        └── <AuthenticatedProviders>  ← Auth, Branch, Session
              └── <Routes />
```

Files:
- src/providers/AppProviders.tsx
- src/providers/AuthenticatedProviders.tsx

---

## Adding New Features

When adding a new feature:

1. Create src/features/[domain]/ folder
2. Add components/ hooks/ services/ types/ index.ts
3. Create service file for all Supabase calls
4. Create zod schema for all forms
5. Export from index.ts barrel

When adding a new form:

1. Create [FormName]Schema.ts next to component
2. Use useForm with zodResolver
3. Keep UI state (isOpen, isLoading) as useState
4. Add try/catch around all mutations

---

## Migration History

| Phase | What | Result |
|-------|------|--------|
| Step 1 | God Component splitting | 0 files over 800 lines |
| Step 2 | Service layer extraction | 0 raw Supabase in hooks |
| Step 3 | Feature-based co-location | 10 feature domains |
| Step 4 | Hook modularization | 0 hooks over 450 lines |
| Step 5 | ESLint suppression cleanup | 0 suppressions |
| Step 6 | App.tsx simplification | 158 → 100 lines |
| Step 7 | react-hook-form + zod | ~44 forms migrated |
