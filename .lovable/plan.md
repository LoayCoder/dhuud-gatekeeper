

# Fix: Risk Assessment "Failed to save assessment" — Foreign Key Violation on project_id

## Problem

The database error is:
```
insert or update on table "risk_assessments" violates foreign key constraint "risk_assessments_project_id_fkey"
```

`project_id` references `ptw_projects(id)`. When submitting a risk assessment, an empty string `""` or invalid UUID is being passed as `project_id` instead of `null`. This happens because `selectedProjectId` is initialized as `""` (line 44) and the `|| null` check doesn't catch empty strings in all code paths reliably.

Similarly, `contractor_id` could have the same issue with `selectedContractorId` initialized as `""`.

## Fix

**File: `src/features/risk-assessment/components/RiskAssessmentWizard/hooks/useRiskAssessmentForm.ts`** (lines 155-156)

Change:
```typescript
contractor_id: isProjectLinked ? selectedContractorId || null : contractorId || null,
project_id: isProjectLinked ? selectedProjectId || null : projectId || null,
```

To explicitly guard against empty strings:
```typescript
contractor_id: (isProjectLinked ? selectedContractorId : contractorId) || null,
project_id: (isProjectLinked ? selectedProjectId : projectId) || null,
```

And add a safety conversion — ensure empty strings become `null`:
```typescript
contractor_id: (isProjectLinked ? selectedContractorId : contractorId) || null,
project_id: (isProjectLinked ? selectedProjectId : projectId) || null,
```

Both already use `|| null`, but to be absolutely safe, we should also trim and validate:
```typescript
const finalProjectId = isProjectLinked ? (selectedProjectId?.trim() || null) : (projectId?.trim() || null);
const finalContractorId = isProjectLinked ? (selectedContractorId?.trim() || null) : (contractorId?.trim() || null);
```

Then use `finalProjectId` and `finalContractorId` in the insert.

## Files Changed

| File | Change |
|------|--------|
| `src/features/risk-assessment/components/RiskAssessmentWizard/hooks/useRiskAssessmentForm.ts` | Sanitize `project_id` and `contractor_id` to ensure empty strings become `null` before insert |

