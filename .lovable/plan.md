

# Fix QA Release Blockers for Contractor Portal HSSE Dashboard

## Summary

Address the 4 release blockers identified in the QA checklist, plus severity format consistency.

## Release Blockers

### 1. Severity Format Inconsistency (🔴 High — #57)

**Current**: Hook checks for both `level_N` and `LN` formats in high severity detection. DB confirms all values use `level_N` format only.

**Fix**: Remove dead `L3/L4/L5` checks from the hook. The `severityLabel()` function in the UI component already maps `level_N` → `LN` correctly for display — no change needed there.

**File**: `use-contractor-portal-hsse.ts` line 134 — remove `'L3', 'L4', 'L5'` from the array.

### 2. Violation Fine Calculation Missing (🔴 High — #56)

**Current**: `total_fine_amount` is always `null` in the violations query. The fine lives on `violation_types` table (`first_fine_amount`, `second_fine_amount`, `third_fine_amount`) and depends on occurrence number.

**Fix**: In the violations hook, after fetching violations with joined `violation_type`, count occurrences per `(contractor_company_id, violation_type_id)` to determine which fine tier applies (1st/2nd/3rd), then set `total_fine_amount` accordingly.

**File**: `use-contractor-portal-hsse.ts` — update violations query to include fine columns from `violation_types` join and compute occurrence-based fine.

### 3. Drill-Down Navigation Missing (🟠 Medium — #55)

**Current**: Clicking observation/incident/action/violation items does nothing.

**Fix**: Add `onClick` with `useNavigate` to each list item:
- Observations/Incidents → `/incidents/{id}` (the investigation workspace)
- Actions → `/incidents/{incident_id}` (actions live within the incident view)
- Violations → no standalone page exists; link to the parent incident via `incident_id`

**File**: `ContractorHSSESections.tsx` — add `useNavigate` and cursor-pointer + click handlers.

### 4. Arabic Translations Incomplete (🟠 Medium — #58)

**Current**: All labels use English fallbacks via `t("key", "Fallback")`.

**Fix**: Add Arabic translation keys for all HSSE dashboard strings to the Arabic locale file.

**File**: Locale JSON file for Arabic.

## Files to Edit

| File | Changes |
|------|---------|
| `src/features/contractors/hooks/use-contractor-portal-hsse.ts` | Remove dead severity formats; add fine calculation logic to violations |
| `src/components/contractor-portal/dashboard/ContractorHSSESections.tsx` | Add drill-down navigation; add `useNavigate` + click handlers + cursor styles |
| Arabic locale file | Add ~15 translation keys for HSSE dashboard labels |

## Technical Notes

- Fine calculation: group violations by `violation_type_id`, sort by `created_at`, assign occurrence index (1st/2nd/3rd+), pick corresponding `first_fine_amount`/`second_fine_amount`/`third_fine_amount`
- Navigation targets use existing routes — no new pages needed
- Violation drill-down goes to parent incident since violations don't have a standalone page

