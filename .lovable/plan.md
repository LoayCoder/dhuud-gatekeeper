

# Enhance Site Risk Verification Notes & Known Risks with Severity

## What Changes

### 1. Site Risk Verification — Add Notes Field Per Item
Each of the 4 verification checkboxes (Utility Verification, Underground Utilities, High-Risk Zones, Work Boundaries) will get a text input below it for adding notes/comments specific to that verification item.

**Database:** Add 4 new columns to `project_mobilizations`:
- `utility_verified_notes TEXT`
- `underground_utilities_notes TEXT`
- `high_risk_zones_notes TEXT`
- `work_boundaries_notes TEXT`

**UI:** Below each checkbox item's description, render a small `Input` or `Textarea` for notes. Save alongside the boolean when verification is toggled or notes are typed.

### 2. Known Risks — Multiple Entries with Severity
Replace the current single textarea fields (`known_risks`, `control_measures`) with a dedicated table for multiple risk entries.

**Database:** Create new table `site_clearance_risks`:
```sql
CREATE TABLE public.site_clearance_risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  mobilization_id UUID NOT NULL REFERENCES project_mobilizations(id) ON DELETE CASCADE,
  risk_description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low','medium','high','critical')),
  control_measures TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
```
With RLS tenant isolation and soft-delete filtering.

**UI (Tab 3 — Risks):** Replace the two textareas with:
- A list of added risks, each showing: severity badge (color-coded), risk description, control measures
- An "Add Risk" form with: severity selector (Low/Medium/High/Critical), risk description textarea, control measures textarea
- Delete button per risk entry
- Keep the attachments section below unchanged

## Files to Create/Modify

| Action | File | Change |
|--------|------|--------|
| **MIGRATE** | New migration SQL | Add 4 notes columns to `project_mobilizations` + create `site_clearance_risks` table |
| **MODIFY** | `src/features/mobilization/services/siteClearanceService.ts` | Add CRUD functions for risks; update `updateSiteRiskVerification` to accept notes |
| **MODIFY** | `src/features/mobilization/hooks/use-site-clearance.ts` | Add `useSiteClearanceRisks`, `useAddRisk`, `useDeleteRisk` hooks; update verification mutation to include notes |
| **MODIFY** | `src/pages/mobilization/SiteClearanceDetail.tsx` | Add notes input under each verification item; replace risks tab with multi-entry list + severity |

## UI Details

**Risk severity colors** (HSSE standard):
- Low → green
- Medium → amber/yellow
- High → orange
- Critical → red

**Verification notes:** Small single-line `Input` below each item description, placeholder "Add notes..." — saved via the same `updateSiteRiskVerification` mutation with added notes fields.

