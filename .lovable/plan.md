

# Fix: Risk Assessment Silent Failures

## Issues Found

### Issue 1 — CRITICAL: Status never set on submission
The `saveAssessment` function accepts a `status` parameter (`"draft"` or `"under_review"`) but **never includes it in the database insert** (lines 156-181 of `useRiskAssessmentForm.ts`). The DB column defaults to `'draft'`, so clicking "Submit for Review" silently saves the assessment as a draft. The user sees a success toast but the status is wrong.

### Issue 2 — Minor: Redundant assessment number generation
Line 143 manually generates `assessment_number`, but the DB trigger `trg_generate_assessment_number` overwrites it on insert. Not a failure, but dead code that could confuse maintainers.

## Fix

**File: `src/features/risk-assessment/components/RiskAssessmentWizard/hooks/useRiskAssessmentForm.ts`**

### Change 1 — Add `status` to the insert payload (lines 156-181)
Add `status: status,` (or just `status,`) to the `.insert({...})` object so the parameter is actually used.

### Change 2 — Remove redundant assessment number (line 143)
Remove the manual `assessmentNumber` generation and the `assessment_number` field from the insert, since the trigger handles it automatically. Alternatively, keep it as a fallback — the trigger overwrites it anyway, so it's harmless but unnecessary.

## Files Changed

| File | Change |
|------|--------|
| `useRiskAssessmentForm.ts` | Add `status` field to the risk_assessments insert payload |
| `useRiskAssessmentForm.ts` | (Optional) Remove redundant `assessment_number` generation |

