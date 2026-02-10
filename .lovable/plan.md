

## Fix: Leading Indicators Card Disappeared

### Root Cause

The `get_leading_indicators` RPC has **two versions** in the database (same problem as the gate pass function):

| OID | Parameters | Issue |
|-----|-----------|-------|
| 112751 (old) | 3 params: `p_start_date, p_end_date, p_branch_id` | References `site_id` on `corrective_actions` table, which does NOT exist -- causes SQL error |
| 34742 (new) | 4 params: `p_start_date, p_end_date, p_branch_id, p_site_id` | Correct version we just applied, also references `site_id` on `corrective_actions` |

Both versions fail because the `corrective_actions` table has no `site_id` column. The old version crashes immediately; the new version would crash when `p_site_id` is non-null, but even with null it fails because PostgreSQL still parses/compiles the query referencing the missing column.

The frontend sends 4 parameters (including `p_site_id`), which may also trigger PostgREST ambiguity between the two overloads.

### Fix (Single Migration)

**Step 1**: Drop both versions by exact signature.

```sql
DROP FUNCTION IF EXISTS public.get_leading_indicators(date, date, uuid);
DROP FUNCTION IF EXISTS public.get_leading_indicators(date, date, uuid, uuid);
```

**Step 2**: Recreate a single version that:
- Accepts all 4 parameters (`p_start_date`, `p_end_date`, `p_branch_id`, `p_site_id`)
- Removes the `site_id` filter from the `corrective_actions` query (since that column does not exist on that table)
- Keeps the `site_id` filter on the `incidents` table queries (where the column does exist)

### Changes Summary

| Target | Action |
|--------|--------|
| Database migration | Drop both duplicates, recreate single version with corrected `corrective_actions` query |
| Frontend | No changes needed |

### Technical Detail

The corrective_actions query will change from:

```sql
-- BROKEN: site_id does not exist on corrective_actions
AND (p_site_id IS NULL OR site_id = p_site_id)
```

to simply omitting that line for the `corrective_actions` section, while keeping it for the `incidents` queries where `site_id` does exist.

