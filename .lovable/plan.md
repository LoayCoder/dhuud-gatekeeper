

# Fix: Remove Duplicate Migration File

## Problem

Two migration files contain the same SQL operations:

- `supabase/migrations/20260223200000_hsse_workflow_spec_updates.sql` (original, 140 lines, more detailed with comments and rollback notes)
- `supabase/migrations/20260223211119_68946f0a-cef9-4252-81f8-1164053593fd.sql` (duplicate, 72 lines, stripped-down copy)

Both add the same enum values, columns, indexes, and backfill data. Everything uses `IF NOT EXISTS` so it causes no runtime errors, but it clutters the migration folder.

## Fix

**Delete** the duplicate file:

`supabase/migrations/20260223211119_68946f0a-cef9-4252-81f8-1164053593fd.sql`

**Keep** the original:

`supabase/migrations/20260223200000_hsse_workflow_spec_updates.sql`

The original is kept because it has better documentation (section headers, inline comments explaining each conflict code, and rollback notes).

## Risk

None. Both files have already been applied to the database. Removing the duplicate file from the migrations folder only prevents it from being re-applied in a fresh environment (where the original already covers everything). The database state is unchanged.

