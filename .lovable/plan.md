

# Refactor: Single Source of Truth Projects + New Mobilization Module

## Current State Analysis

**The problem:** `ptw_projects` is a duplicate of `contractor_projects` with 4 dependent tables:
- `ptw_clearance_checks.project_id → ptw_projects.id`
- `ptw_permits.project_id → ptw_projects.id`
- `ptw_audit_logs.project_id → ptw_projects.id`
- `project_clearance_execution.project_id → ptw_projects.id`

Current data: 1 ptw_project, 10 clearance checks, 0 permits. Low migration risk.

The PTW module currently creates its own projects via `ProjectFormDialog` and `ptwProjectService.createPTWProject()`, duplicating data already in `contractor_projects`.

## Target Architecture

```text
contractor_projects (SINGLE SOURCE OF TRUTH)
       │
       ├──→ project_mobilizations (NEW TABLE - replaces ptw_projects)
       │         │
       │         ├──→ ptw_clearance_checks (FK re-pointed)
       │         └──→ project_clearance_execution (FK re-pointed)
       │
       ├──→ ptw_permits (FK re-pointed to contractor_projects)
       │
       ├──→ risk_assessments (already linked)
       │
       └──→ ptw_audit_logs (FK re-pointed)
```

**Sequential flow enforced:**
Contractor Project → Mobilization (site clearance) → Risk Assessment → PTW Permit → Execution

---

## Phase 1: Database Migration

### New table: `project_mobilizations`

```sql
CREATE TABLE public.project_mobilizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  project_id UUID NOT NULL REFERENCES contractor_projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','approved','rejected')),
  mobilization_percentage INTEGER DEFAULT 0,
  pre_checks_completed BOOLEAN DEFAULT false,
  site_clearance_approved BOOLEAN DEFAULT false,
  risk_assessment_required BOOLEAN DEFAULT true,
  ptw_enabled BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(project_id, deleted_at)
);

ALTER TABLE public.project_mobilizations ENABLE ROW LEVEL SECURITY;
```

### Re-point foreign keys

- `ptw_clearance_checks.project_id` → `project_mobilizations.id`
- `ptw_permits.project_id` → `contractor_projects.id` (direct link)
- `ptw_audit_logs.project_id` → nullable, keep as-is but update code to use contractor_projects
- Add `mobilization_id` to `ptw_permits` → `project_mobilizations.id`

### Data migration

Migrate the 1 existing ptw_project and its 10 clearance checks to the new structure.

### RLS policies

Standard tenant isolation on `project_mobilizations` using `tenant_id`.

---

## Phase 2: New Mobilization Module

### New route: `/mobilization`

Replace `/ptw/projects` with `/mobilization` in routes and sidebar menu.

### New page: `MobilizationDashboard.tsx`

- **Read-only project list** from `contractor_projects` (no create button)
- Each project shows mobilization status (pending/in_progress/approved/rejected)
- Click a project → opens mobilization detail page

### New page: `MobilizationDetail.tsx` (`/mobilization/:projectId`)

Tabbed interface:
1. **Pre-Mobilization Checks** — existing clearance checks (documentation, safety, personnel, insurance)
2. **Site Clearance** — site readiness verification with approve/reject
3. **Risk Assessment** — linked risk assessments for this project (read from `risk_assessments`)
4. **PTW Readiness** — summary showing all gates; enable PTW when all pass

### Validation gates enforced in UI

- Mobilization blocked if `contractor_projects.status != 'active'`
- PTW permit creation blocked unless `project_mobilizations.status = 'approved'`
- `MobilizationStatusBanner` updated to check `project_mobilizations` instead of `ptw_projects`

---

## Phase 3: Code Refactoring

### Remove from PTW module
- `ProjectFormDialog.tsx` — delete (no more project creation in PTW)
- `ptwProjectService.createPTWProject()` — delete
- `useCreatePTWProject` hook — delete
- `/ptw/projects` route — remove
- `/ptw/projects/:projectId/clearance` route — remove (replaced by `/mobilization/:projectId`)

### Update PTW module
- `PermitBasicsStep.tsx` — project dropdown reads from `contractor_projects` filtered to those with approved mobilization
- `useMobilizationCheck` — query `project_mobilizations` instead of `ptw_projects`
- `ptwPermitService` — all `ptw_projects` references become `contractor_projects`
- `useProjectContextWorkers` — query `contractor_projects` directly

### New feature folder: `src/features/mobilization/`

```text
src/features/mobilization/
├── components/
│   ├── MobilizationTabPreChecks.tsx
│   ├── MobilizationTabSiteClearance.tsx
│   ├── MobilizationTabRiskAssessment.tsx
│   └── MobilizationTabPTWReadiness.tsx
├── hooks/
│   ├── use-mobilizations.ts
│   └── use-mobilization-detail.ts
├── services/
│   └── mobilizationService.ts
└── index.ts
```

### Sidebar menu update

Replace "Project Mobilization → /ptw/projects" with "Mobilization → /mobilization" under PTW section.

---

## Files to Create/Modify/Delete

| Action | File | Description |
|--------|------|-------------|
| **CREATE** | `src/features/mobilization/` (8 files) | New module: hooks, services, components, pages |
| **CREATE** | `src/pages/mobilization/MobilizationDashboard.tsx` | Read-only project list + mobilization status |
| **CREATE** | `src/pages/mobilization/MobilizationDetail.tsx` | Tabbed detail with 4 gate sections |
| **CREATE** | `src/routes/mobilization.routes.tsx` | Route definitions |
| **CREATE** | Migration SQL | New table + FK changes + data migration |
| **MODIFY** | `src/routes/ptw.routes.tsx` | Remove `/ptw/projects` and `/ptw/projects/:projectId/clearance` |
| **MODIFY** | `src/features/ptw/components/wizard/PermitBasicsStep.tsx` | Use `contractor_projects` with mobilization filter |
| **MODIFY** | `src/features/ptw/hooks/use-mobilization-check.ts` | Query `project_mobilizations` |
| **MODIFY** | `src/features/ptw/hooks/use-project-context-workers.ts` | Query `contractor_projects` directly |
| **MODIFY** | `src/features/ptw/services/ptwPermitService.ts` | Replace `ptw_projects` references |
| **MODIFY** | `src/features/ptw/services/ptwProjectService.ts` | Remove create/getMobilization; keep audit functions |
| **MODIFY** | `src/hooks/ptw/index.ts` | Remove `useCreatePTWProject` export |
| **MODIFY** | `src/features/ptw/index.ts` | Remove `ProjectFormDialog` export |
| **MODIFY** | `useContractorsPTWMenu.ts` | Replace PTW projects link with `/mobilization` |
| **MODIFY** | `src/config/route-registry.ts` | Update route entry |
| **DELETE** | `src/features/ptw/components/ProjectFormDialog.tsx` | No longer needed |
| **DELETE** | `src/pages/ptw/ProjectMobilization.tsx` | Replaced by new module |
| **DELETE** | `src/pages/ptw/ProjectClearance.tsx` | Replaced by `MobilizationDetail.tsx` |

---

## What Changes for Users

- Projects are created **only** in `/contractors/projects` — single source of truth
- New `/mobilization` page shows all contractor projects with their mobilization status
- Clicking a project opens a 4-tab mobilization workflow (Pre-Checks → Site Clearance → Risk Assessment → PTW Readiness)
- PTW permit creation is blocked unless mobilization is approved
- Strict sequential flow: **Project → Mobilization → Risk Assessment → PTW → Execution**

