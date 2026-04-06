

# Gate Pass Reference Numbers with Tenant Short Name Prefix

## What Changes

Gate pass reference numbers will use each tenant's short name instead of generic prefixes:
- **Internal passes:** `GP-2026-00001` → `GS-2026-00001` (for Golf Saudi)
- **Public passes:** `PUB-20260210-3fb1c78f` → `GS-PUB-20260210-3fb1c78f`

## Changes Required

### 1. Database: Add `short_name` column to `tenants` table

Add a new `short_name` column (VARCHAR 10, NOT NULL, UNIQUE) to the `tenants` table. Backfill existing tenants:
- Golf Saudi → `GS`
- Dhuud Platform → `DP`

### 2. Frontend: Update internal gate pass creation

**File:** `src/features/contractors/services/materialGatePassCreateService.ts`

Before generating the reference number, fetch the tenant's `short_name` from the `tenants` table. Replace:
```
GP-{year}-{sequence}
```
With:
```
{short_name}-{year}-{sequence}
```
Fallback to `GP` if `short_name` is not found.

### 3. Database: Update public gate pass RPC

**Function:** `submit_public_gate_pass`

The function already fetches the tenant record. Add `short_name` to the SELECT and replace:
```
PUB-{date}-{token}
```
With:
```
{short_name}-PUB-{date}-{token}
```

### 4. Admin UI for managing tenant short name (optional)

If a tenant settings page exists, add a field for `short_name` so admins can configure it.

---

## Technical Details

| Component | Change |
|-----------|--------|
| Migration | `ALTER TABLE tenants ADD COLUMN short_name VARCHAR(10)` with unique constraint, backfill existing |
| `materialGatePassCreateService.ts` | Fetch tenant short_name, use as prefix |
| `submit_public_gate_pass` SQL function | Use `v_tenant_record.short_name` in reference |
| Existing passes | Not renamed (backward compatible) |

