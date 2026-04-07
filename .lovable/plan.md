
# Improve Risk Assessment Detail Page

## Problems
1. **Missing creator/reviewer names** — `created_by` and `approved_by` are stored as UUIDs but never resolved to human-readable names on the detail page.
2. **No print/export button** — The `RiskAssessmentPDFExportButton` component exists but is not used on the detail page.
3. **Print output needs full details** — The existing `PrintableRiskAssessmentSummary` already supports `createdBy`, `approvedBy`, `teamMembers`, and hazard details, but they need to be wired up with resolved names.

## Plan

### 1. Resolve creator and reviewer names in the service layer
**File: `src/services/risk-assessment/riskAssessmentService.ts`**
- Update `getRiskAssessment()` to join `profiles` for both `created_by` and `approved_by` fields, returning `created_by_profile: { full_name }` and `approved_by_profile: { full_name }`.
- Alternatively, if the generated types don't support the join cleanly, do a secondary query to fetch both profile names by UUID.

### 2. Display creator and reviewer on the detail page
**File: `src/pages/RiskAssessmentDetail.tsx`**
- Add a "Created by" row showing the resolved full name and the creation date.
- Add a "Reviewed/Approved by" row showing the reviewer name and approval date (when present).
- Place these in the header card's metadata grid.

### 3. Add the PDF export/print button
**File: `src/pages/RiskAssessmentDetail.tsx`**
- Import the existing `RiskAssessmentPDFExportButton` component.
- Place it in the header area (next to the back button or top-right).
- Pass all required props from the loaded assessment data, hazards, and team, including the resolved creator/reviewer names.

### 4. Wire team members into the printable summary
- Pass `teamMembers` from the `useRiskAssessmentTeam` hook result into the `RiskAssessmentPDFExportButton` so the print output includes team and signature data.

## Files Changed

| File | Change |
|------|--------|
| `src/services/risk-assessment/riskAssessmentService.ts` | Join `profiles` table to resolve `created_by` and `approved_by` names |
| `src/pages/RiskAssessmentDetail.tsx` | Show creator/reviewer names, add PDF export button with full data |
