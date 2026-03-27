

# Inspection Session Creation — Root Cause Analysis Report

## Executive Summary

After a full end-to-end investigation across the database schema, RLS policies, RPC functions, frontend mutation logic, and form submission flow, **no single hard-blocking bug was found** that would universally prevent session creation. Instead, multiple layered issues create a **fragile chain** where several conditions must align for success, and failure at any point produces a silent or unhelpful error.

**Overall Risk Level: HIGH**

---

## Finding 1: Template List Not Filtered by Session Type

**Severity: HIGH (data integrity + UX)**

The `CreateSessionDialog` calls `useInspectionTemplates()` without passing `watchedSessionType`:

```ts
// Line 69 — no filter passed
const { data: templates = [] } = useInspectionTemplates();
```

The hook signature accepts `templateType?: 'asset' | 'area' | 'audit'` but it's never used. This means:
- A user can select an "asset" template for an "area" session
- The memory note explicitly states: *"the system enforces a strict 'template_type == session_type' constraint"*
- If a DB trigger or constraint enforces this mismatch, the INSERT silently fails

**Affected Components:** `CreateSessionDialog.tsx`, `use-inspection-template-hooks.ts`

---

## Finding 2: Missing `branch_id` on Session Asset Inserts

**Severity: MEDIUM**

The `useStartSession` mutation inserts into `inspection_session_assets` without setting `branch_id`:

```ts
// Lines 88-92 — branch_id not included
const sessionAssets = assets.map(asset => ({
    tenant_id: profile.tenant_id,
    session_id: sessionId,
    asset_id: asset.id,
    // branch_id: ??? — not set
}));
```

The `inspection_session_assets` table has a `branch_id` column (nullable). Currently no RLS policy checks it on INSERT, so this doesn't block creation. However, any future branch-isolation policy on this table would break silently.

**Affected Components:** `use-session-lifecycle-mutations.ts`

---

## Finding 3: Two-Step Create+Start Is Not Atomic

**Severity: CRITICAL**

The `CreateSessionDialog.onSubmit` does two sequential mutations:

```ts
const session = await createSession.mutateAsync({...});  // Step 1: INSERT
await startSession.mutateAsync(session.id);              // Step 2: Populate + UPDATE
```

If Step 1 succeeds but Step 2 fails (e.g., no matching assets, RLS on `hsse_assets` blocks the query, or `inspection_session_assets` INSERT fails), the session is left in `draft` status with no assets, no error recovery, and no cleanup. The user sees a generic toast error and the orphaned draft row remains in the database.

**Affected Components:** `CreateSessionDialog.tsx`, `use-session-lifecycle-mutations.ts`

---

## Finding 4: Branch Access Check Can Block Non-Super-Admin Users

**Severity: HIGH**

The current user profile shows:
- `is_super_admin: false`
- `has_full_branch_access: false`  
- `assigned_branch_id: 8a74df12-...`

The `Branch-isolated insert` RLS policy checks: `(branch_id IS NULL) OR can_access_branch(auth.uid(), branch_id)`.

If the user selects a branch they're **not** assigned to, and they don't have an entry in `user_branch_assignments`, the INSERT will be blocked by this policy. Since the `HSSE users can create sessions` policy (PERMISSIVE, OR logic) would still pass for an admin user, this specific user won't be blocked. **But non-admin HSSE officers** without `has_full_branch_access` who try to create sessions for a different branch **will** be silently blocked.

The error message would be: `"new row violates row-level security policy"` — with no indication of which policy failed.

**Affected Components:** Database RLS on `inspection_sessions`

---

## Finding 5: `useStartSession` Uses `SELECT *` on `inspection_sessions`

**Severity: LOW (but violates project rules)**

Line 47: `supabase.from('inspection_sessions').select('*')` — this fetches all columns including potentially sensitive fields. The project guidelines explicitly prohibit `SELECT *`.

**Affected Components:** `use-session-lifecycle-mutations.ts`

---

## Finding 6: `subtype_id` Sent but May Not Match FK Constraint

**Severity: MEDIUM**

The `CreateSessionInput` type includes `subtype_id?: string | null` and the DB has `inspection_sessions_subtype_id_fkey` referencing `asset_subtypes.id`. If a subtype is selected in the form but the corresponding `asset_subtypes` record doesn't exist (e.g., deleted), the FK constraint will reject the insert with a non-obvious error.

The same risk applies to `building_id`, `category_id`, `type_id`, and `branch_id`.

**Affected Components:** `CreateSessionDialog.tsx`, database FK constraints

---

## Finding 7: Zero Existing Sessions in Database

**Severity: INFORMATIONAL**

```sql
SELECT count(*) FROM inspection_sessions WHERE deleted_at IS NULL;
-- Result: 0
```

This confirms no session has ever been successfully created, which strongly suggests the creation flow has been broken since deployment — not a regression.

---

## Summary of Findings

| # | Finding | Risk | Root Cause |
|---|---------|------|------------|
| 1 | Templates not filtered by session type | HIGH | Missing `watchedSessionType` arg to `useInspectionTemplates()` |
| 2 | Missing `branch_id` on session assets | MEDIUM | Not included in INSERT payload |
| 3 | Non-atomic create+start flow | CRITICAL | Two sequential mutations with no rollback |
| 4 | Branch access blocks non-super-admin users | HIGH | RLS `can_access_branch` check on INSERT |
| 5 | `SELECT *` violates project rules | LOW | Direct `select('*')` usage |
| 6 | FK constraint can silently reject inserts | MEDIUM | No pre-validation of FK references |
| 7 | Zero sessions ever created | INFO | Confirms systemic issue |

---

## Recommended Fixes (Ordered by Priority)

1. **Pass `watchedSessionType` to `useInspectionTemplates(watchedSessionType)`** in `CreateSessionDialog` — ensures template/session type alignment

2. **Wrap create+start in a try/catch with rollback** — if `startSession` fails, soft-delete the orphaned session

3. **Add `branch_id` to `inspection_session_assets` inserts** — fetch from the session record or from each asset's `branch_id`

4. **Add user-facing error messages** for RLS failures — catch the specific "violates row-level security policy" error and translate to "You don't have access to create sessions for this branch"

5. **Replace `select('*')` with explicit column list** in `useStartSession`

6. **Pre-validate FK references** before insert — check that template_id, category_id, etc. exist before attempting the INSERT

---

## Modules Affected

- **Inspection Dashboard** — shows 0 sessions, no data to display
- **Inspection Schedules** — if schedules trigger session creation, same issues apply
- **Asset Management** — `useStartSession` queries `hsse_assets` which may return 0 rows depending on branch access
- **Action Center** — no inspection findings generated since no sessions exist

