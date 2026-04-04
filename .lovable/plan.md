

# Fix: "No site representative found to invite" for GBR Company

## Root Cause

The system has **two separate tables** for contractor representatives:

1. **`contractor_site_representatives`** — where the Personnel tab saves site rep data (has the GBR rep: إسلام محمد / islam@gbrksa.com)
2. **`contractor_representatives`** — where the "Send Portal Invitation" button looks for `is_primary = true` records

The invitation handler at line 127 queries `contractor_representatives` and finds zero rows, so it shows "No site representative found to invite." The data exists, just in the wrong table from the invitation code's perspective.

## Fix

### Step 1: Update `handleSendPortalInvitation` to use `contractor_site_representatives`

In `CompanyDetailDialog.tsx`, modify the invitation handler to use the `siteRepFromTable` data (already fetched from `contractor_site_representatives` at line 34) instead of searching `representatives` (from `contractor_representatives`).

Replace:
```typescript
const primaryRep = representatives.find(r => r.is_primary);
if (!primaryRep) {
  toast.error(...);
  return;
}
```

With logic that uses `siteRepFromTable` (which has `id`, `email`, `full_name`) as the invitation target. Fall back to `representatives.find(r => r.is_primary)` if the site rep table is empty.

### Step 2: Update the invitation button visibility condition

Line 366 already checks `siteRep && siteRep.email`, but the handler ignores this data. Align the handler to use the same `siteRepFromTable` source.

### Step 3: Also sync site rep data to `contractor_representatives`

When a site rep is saved via the Personnel tab (using `useUpsertSiteRep`), also upsert a matching row into `contractor_representatives` with `is_primary = true`. This ensures both tables stay in sync for any other code that queries `contractor_representatives`.

## Files Changed

| File | Change |
|------|--------|
| `src/features/contractors/components/CompanyDetailDialog.tsx` | Use `siteRepFromTable` in `handleSendPortalInvitation` |
| `src/features/contractors/hooks/use-contractor-site-rep.ts` | Add sync to `contractor_representatives` in `useUpsertSiteRep` |

## Impact
- GBR's islam@gbrksa.com will receive the portal invitation immediately
- Future site rep saves will sync to both tables
- No data migration needed — the fix uses the existing data

