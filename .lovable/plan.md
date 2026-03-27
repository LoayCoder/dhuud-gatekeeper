

# Fix: Inspection Session INSERT Silently Rejected by RLS

## Root Cause (Confirmed via E2E Testing)

Console logs show:
```
[CreateSession] Step 1 OK, session: ""
```

The `.insert().select().single()` call returns an **empty object** (no `id`) instead of throwing an error. This happens because PostgREST returns HTTP 201 with an empty body when RLS blocks the INSERT. The code then proceeds through Step 2 and shows the success toast — all on phantom data.

**Why RLS blocks it:** The `get_auth_tenant_id()` function uses `WHERE user_id = auth.uid()` but the `profiles` table has **both `id` and `user_id` columns** (both set to the same value for this user). However, the existing 3 sessions were created with `branch_id = NULL`, while the new creation sends `branch_id = '8a74df12-...'`. The "Branch-isolated insert" policy's `WITH CHECK` requires `can_access_branch()` to pass — and while the SQL check confirms it passes, the actual RLS evaluation at INSERT time may differ due to the `profiles` subquery returning the wrong row or a timing issue with the JWT.

The most likely blocker: the **second INSERT policy** (`HSSE users can create sessions`) uses `get_auth_tenant_id()` which does `SELECT tenant_id FROM profiles WHERE user_id = auth.uid()` — but the `profiles` table may have **multiple rows** for the same `user_id` (e.g., soft-deleted duplicates), causing the subquery to fail silently.

## Fix Plan

### 1. Add null-check guard after INSERT (`CreateSessionDialog.tsx`)

After `createSession.mutateAsync()`, check if the returned `session.id` is truthy. If not, throw an explicit error:

```ts
session = await createSession.mutateAsync({...});
if (!session?.id) {
  throw new Error('Session creation was rejected. Check your permissions.');
}
```

This prevents the false-positive success toast.

### 2. Add `.throwOnError()` to the INSERT chain (`use-session-lifecycle-mutations.ts`)

Supabase JS has a `throwOnError()` method that forces PostgREST to return an error on RLS rejection instead of silently succeeding:

```ts
const { data, error } = await supabase
  .from('inspection_sessions')
  .insert({...})
  .select()
  .single()
  .throwOnError();  // <-- Forces error on silent RLS rejection
```

### 3. Fix the RLS INSERT policy subquery

Replace the inline subquery in `Branch-isolated insert` with the `get_auth_tenant_id()` function (which uses `LIMIT 1` or `SECURITY DEFINER`), ensuring it doesn't fail when multiple profile rows exist:

```sql
-- Current (fragile):
tenant_id = (SELECT tenant_id FROM profiles WHERE user_id = auth.uid())

-- Fixed (robust):
tenant_id = get_auth_tenant_id()
```

### 4. Check for duplicate profiles

Query and clean up any duplicate `profiles` rows for the same `user_id` that could cause the subquery to return multiple rows.

## Files Modified

| File | Change |
|------|--------|
| `CreateSessionDialog.tsx` | Add null-check guard after insert |
| `use-session-lifecycle-mutations.ts` | Add `.throwOnError()` to insert chain |
| DB migration | Fix RLS policy subquery |

