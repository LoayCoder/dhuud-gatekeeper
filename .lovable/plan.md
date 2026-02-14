

## Fix: "Approve & Lock" Error — Missing Columns on `incidents` Table

### Problem
When an HSSE Manager/Expert clicks "Approve & Lock" to start an investigation, it fails with:
> `Could not find the 'approval_notes' column of 'incidents' in the schema cache`

The `ApprovalWorkflowBanner.tsx` component updates 4 columns that do not exist on the `incidents` table:
- `approved_by`
- `approved_at`
- `approval_notes`
- `investigation_locked`

### Fix

**Step 1: Database Migration** — Add the 4 missing columns to `incidents`:

```sql
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approval_notes TEXT,
  ADD COLUMN IF NOT EXISTS investigation_locked BOOLEAN DEFAULT false;
```

No code changes are needed — the `ApprovalWorkflowBanner.tsx` already references these columns correctly. Once the columns exist, the update query will succeed.

**Step 2: Verify** — The existing RLS policies on `incidents` will cover these new columns automatically since RLS operates at the row level.

### Files Modified
- None (database migration only)

### Risk
- Low risk — purely additive (new nullable columns with a default for `investigation_locked`).
- No existing data or queries are affected.
