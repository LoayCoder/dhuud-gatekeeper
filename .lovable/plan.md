

# Fix: Risk Assessment Project Linking (Option A)

## Changes

### 1. Database migration — Re-point FK to `contractor_projects`
Drop `risk_assessments_project_id_fkey` (currently → `ptw_projects`) and recreate it pointing to `contractor_projects(id)`.

```sql
ALTER TABLE public.risk_assessments
  DROP CONSTRAINT risk_assessments_project_id_fkey;

ALTER TABLE public.risk_assessments
  ADD CONSTRAINT risk_assessments_project_id_fkey
  FOREIGN KEY (project_id) REFERENCES public.contractor_projects(id);
```

### 2. Fix `deleted_at` error on `risk_assessment_team` query
**File: `src/services/risk-assessment/riskAssessmentService.ts` (line 37)**

The `getRiskAssessmentTeam` function filters `.is('deleted_at', null)` but that column does not exist on `risk_assessment_team`, causing 400 errors. Remove that filter.

## Files Changed

| File | Change |
|------|--------|
| Database migration | Change FK from `ptw_projects` to `contractor_projects` |
| `src/services/risk-assessment/riskAssessmentService.ts` | Remove `.is('deleted_at', null)` from `getRiskAssessmentTeam` |

