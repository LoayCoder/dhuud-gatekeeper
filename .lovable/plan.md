

## Fix: Duplicate RGC on Public Gate Pass Page

### Root Cause

The public gate pass page (`/golf-saudi/request`) uses `usePublicBranches` hook, which was **not** included in the previous deduplication fix. More critically, this hook **does not filter soft-deleted branches** (`deleted_at IS NULL`).

The database has two "RGC" rows:
- `d0ac82c0...` -- soft-deleted on 2025-12-29 (should be hidden)
- `8a74df12...` -- active (should be shown)

Since the query lacks `.is('deleted_at', null)`, both appear in the dropdown.

### Fix

**File: `src/hooks/public-gate-pass/use-public-branches.ts`**

Two changes to `usePublicBranches` function:

1. Add `.is('deleted_at', null)` filter to the query (line 38, before `.order()`)
2. Add defensive deduplication by `id` on the result (consistent with all other branch hooks)

The same `.is('deleted_at', null)` filter should also be added to `usePublicBranch` for consistency, though it is less likely to hit a deleted branch since it queries by specific ID.

### Technical Detail

```text
Before (line 37-38):
  .eq("tenant_id", tenantId)
  .order("name", { ascending: true });

After:
  .eq("tenant_id", tenantId)
  .is("deleted_at", null)
  .order("name", { ascending: true });

Result dedup:
  return (data || []).filter(
    (b, i, arr) => arr.findIndex(x => x.id === b.id) === i
  ) as PublicBranch[];
```

No database migration needed. Single file change.
