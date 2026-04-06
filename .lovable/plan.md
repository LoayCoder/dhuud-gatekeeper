

# Fix: 404 After Risk Assessment Submission

## Problem

After successfully submitting a risk assessment, the app navigates to `/risk-assessments/{id}` — but no route exists for that path. Only `/risk-assessments` (list) and `/risk-assessments/create` are defined. There is no detail/view page for a single risk assessment.

## Fix

Change the post-submission navigation in `useRiskAssessmentForm.ts` from `/risk-assessments/${assessment.id}` to `/risk-assessments` (the list page).

This is the correct behavior until a detail view page is built — the user sees the success toast and lands on the list where their new assessment appears.

## File Changed

| File | Change |
|------|--------|
| `src/features/risk-assessment/components/RiskAssessmentWizard/hooks/useRiskAssessmentForm.ts` (line 255) | Change `navigate(\`/risk-assessments/${assessment.id}\`)` → `navigate("/risk-assessments")` |

