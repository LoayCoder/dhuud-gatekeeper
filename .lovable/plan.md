

# Fix Missing `deleted_at` + Clean All DHUUD Tenant Data

## Step 1: Add `deleted_at` to `risk_assessment_team`

This is the only table missing the column among the 12 target tables.

```sql
ALTER TABLE public.risk_assessment_team
  ADD COLUMN deleted_at timestamptz DEFAULT NULL;
```

## Step 2: Soft-delete all DHUUD tenant data

One migration that sets `deleted_at = now()` on all active records for tenant `9290e913-c735-405c-91c6-141e966011ae`, ordered child-first to respect FK constraints.

```sql
-- Children first
UPDATE public.risk_assessment_details SET deleted_at = now() WHERE tenant_id = '...' AND deleted_at IS NULL;
UPDATE public.risk_assessment_team SET deleted_at = now() WHERE tenant_id = '...' AND deleted_at IS NULL;
UPDATE public.risk_assessments SET deleted_at = now() WHERE tenant_id = '...' AND deleted_at IS NULL;
UPDATE public.ptw_clearance_checks SET deleted_at = now() WHERE tenant_id = '...' AND deleted_at IS NULL;
UPDATE public.ptw_permits SET deleted_at = now() WHERE tenant_id = '...' AND deleted_at IS NULL;
UPDATE public.ptw_projects SET deleted_at = now() WHERE tenant_id = '...' AND deleted_at IS NULL;
UPDATE public.material_gate_passes SET deleted_at = now() WHERE tenant_id = '...' AND deleted_at IS NULL;
UPDATE public.gate_entry_logs SET deleted_at = now() WHERE tenant_id = '...' AND deleted_at IS NULL;
UPDATE public.worker_inductions SET deleted_at = now() WHERE tenant_id = '...' AND deleted_at IS NULL;
UPDATE public.contractor_projects SET deleted_at = now() WHERE tenant_id = '...' AND deleted_at IS NULL;
UPDATE public.contractor_workers SET deleted_at = now() WHERE tenant_id = '...' AND deleted_at IS NULL;
UPDATE public.contractor_companies SET deleted_at = now() WHERE tenant_id = '...' AND deleted_at IS NULL;
```

**Records affected:** 676 total (17 risk assessments, 81 details, 2 team, 35 PTW projects, 350 clearance checks, 1 gate pass, 110 entry logs, 22 inductions, 8 contractor projects, 51 workers, 9 companies).

## Step 3: Update `getRiskAssessmentTeam` query

Now that `risk_assessment_team` has `deleted_at`, add `.is('deleted_at', null)` filter back to the query in `src/services/risk-assessment/riskAssessmentService.ts` for consistency with the soft-delete pattern.

## Files Changed

| File | Change |
|------|--------|
| Database migration | Add `deleted_at` column to `risk_assessment_team` |
| Database migration | Soft-delete all DHUUD tenant records across 12 tables |
| `src/services/risk-assessment/riskAssessmentService.ts` | Add `.is('deleted_at', null)` to `getRiskAssessmentTeam` query |

