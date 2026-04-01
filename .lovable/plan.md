

# Audit of Your Remaining Issues List — Verified Assessment

## 🔴 HIGH PRIORITY — Status Check

### 1. "Incident Closure Blocked — RCA locking not enforced, frontend doesn't use incident_rca table"
**STATUS: RESOLVED** — This is no longer accurate.

Evidence found:
- `investigationQueryService.ts` fetches from `incident_rca` table with `is_locked`, `locked_by`, `locked_at`
- `investigationMutationService.ts` has both `lockRCA()` and `unlockRCA()` calling RPCs `lock_rca` and `unlock_rca`
- `useLockRCA` and `useUnlockRCA` hooks exist and are used in `RCAPanel.tsx`
- `workflow-validation.ts` checks `incident_rca.is_locked` before allowing closure
- The investigation query maps `is_rca_locked`, `rca_locked_by`, `rca_locked_at` into the Investigation object

**Verdict: Fixed. Remove from list.**

---

### 2. "RLS Data Leakage — incident_rca table, all users can see sensitive root cause data"
**STATUS: STILL OPEN** — Confirmed.

The current RLS policy is:
```sql
CREATE POLICY "incident_rca_tenant_isolation_select" ON public.incident_rca
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
```
This allows ANY authenticated user in the tenant to read ALL root cause data. Per the FIX_AND_ASSURANCE_PLAN.md, SELECT should be restricted to HSSE roles, Admins, and the incident's approval_manager.

**Verdict: Still open. Needs stricter RLS policy.**

---

### 3. "Type Safety — Extensive use of `any` types in src/hooks/*.ts"
**STATUS: MOSTLY RESOLVED** — Only 6 files in `src/hooks/` use `as any`, all with eslint-disable comments for tables not yet in generated types (`offline_scan_queue`, `tenant_document_settings`, `asset_purchase_requests`, `badge_definitions`). These are intentional workarounds, not careless typing.

**Verdict: Low risk. These are known schema-gap workarounds, not systemic type unsafety. Downgrade to LOW.**

---

## 🟡 MEDIUM PRIORITY — Status Check

### 4. "Action Evidence Weakness — No hard-block if evidence is missing"
**STATUS: RESOLVED** — Confirmed fixed.

In `ActionProgressDialog.tsx`:
```typescript
const hasMinimumEvidence = evidenceCount > 0 || uploadingFiles.length > 0;
const isValid = mode === 'start'
  ? notes.trim().length >= 5 && hasMinimumEvidence
  : notes.trim().length >= 10 && hasMinimumEvidence && ...;
```
The submit button is `disabled={!isValid}`, which includes the evidence check. A red message also shows when evidence is missing.

**Verdict: Fixed. Remove from list.**

---

### 5. "Investigation UI doesn't display new RCA fields"
**STATUS: RESOLVED** — The `RCAPanel.tsx` component imports and uses `useLockRCA`, `useUnlockRCA`, and the investigation query returns RCA fields from `incident_rca`. The RCA tab displays five whys, root causes, contributing factors, immediate/underlying causes.

**Verdict: Fixed. Remove from list.**

---

## 🟢 LOW PRIORITY

### 6. "Documentation files need cleanup/consolidation"
**STATUS: STILL OPEN** — `FIX_AND_ASSURANCE_PLAN.md` is outdated (lists issues as "In Progress" that are now resolved).

**Verdict: Still open but low priority.**

---

## Updated Remaining Issues (Actual)

| Priority | Issue | Location | Description |
|----------|-------|----------|-------------|
| 🔴 HIGH | RLS Data Leakage | `incident_rca` table | SELECT policy allows all tenant users to read sensitive RCA data. Needs role-restricted policy. |
| 🟢 LOW | Type workarounds | 6 files in `src/hooks/` | Intentional `as any` for tables not yet in generated types. Resolve when types are regenerated. |
| 🟢 LOW | Stale documentation | `FIX_AND_ASSURANCE_PLAN.md` | Lists resolved issues as "In Progress". Needs update or removal. |

### Summary
- 3 of 5 code issues are **already fixed** (RCA locking, action evidence, investigation UI)
- 1 genuine security gap remains (RLS on `incident_rca`)
- Type safety concern is minor (6 intentional workarounds)

