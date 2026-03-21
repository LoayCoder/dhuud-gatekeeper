

# E2E Audit — Observations Module (Final Pass)

## Summary

After verifying all previous fixes (current-owner.ts, witness mutations, audit trail), I found **1 remaining bug** in the witness statements subsystem. The core observation lifecycle is clean.

---

## Finding: Witness query does not fetch `statement_type` — always shows "text"

**Impact**: All witness statements display as type "text" in the UI, even voice recordings and document uploads. The `statement_method` field is hardcoded to `'text'` in both query mappings because `statement_type` is never selected from the database.

**Root cause**: In `use-statement-queries.ts`:
- **Line 14**: The `.select(...)` string does not include `statement_type`
- **Line 29**: Maps `statement_method: 'text' as StatementType` — hardcoded instead of reading from the row
- **Line 84**: Same hardcoded mapping in `useMyAssignedWitnessStatements`

### Fix

**File:** `src/hooks/use-witness-statements/use-statement-queries.ts`

1. **Line 14**: Add `statement_type` to the select string
2. **Line 29**: Change from `statement_method: 'text' as StatementType` to `statement_method: (row.statement_type as StatementType) || 'text'`
3. **Line 71**: Add `statement_type` to the select string in `useMyAssignedWitnessStatements`
4. **Line 84**: Change from `statement_method: 'text' as StatementType` to `statement_method: (row.statement_type as StatementType) || 'text'`

---

## Verified Clean Areas

All other lifecycle stages confirmed working:
- **Creation** (QuickObservationCard) — correct fields, offline/online paths, AI analysis gating
- **AI Processing** — analyze-observation edge function integrated correctly
- **Assignment & Routing** (current-owner.ts) — all statuses mapped, contractor path and non-contractor path both resolve `approval_manager` name correctly
- **Workflow Cards** (InvestigationWorkflowCards) — all 30+ statuses have dedicated action cards
- **Timeline & Status Labels** — complete bilingual coverage
- **Witness Mutations** — `assignment_status` and `statement_type` column names corrected in previous pass
- **Audit Trail** — actor names and branch IDs resolve to human-readable names
- **Escalation** — `upgraded_to_incident` status handled with backlink banner
- **Closure** — `pending_hsse_manager_closure` and `pending_hsse_validation` handled
- **ResponsibleUserBadge** — shows assigned user name or "No user assigned" warning correctly

## Files to Edit

1. `src/hooks/use-witness-statements/use-statement-queries.ts` — add `statement_type` to select and use it in mapping

