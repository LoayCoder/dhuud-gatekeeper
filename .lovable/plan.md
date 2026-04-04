

# Fix: Personnel Form Saves to `contractor_representatives` Only

## Problem
The Personnel tab form currently saves to `contractor_site_representatives` — wrong table. The person entered here (e.g., islam@gbrksa.com) is a **company representative** who needs portal access. The "Send Portal Invitation" button queries `contractor_representatives`, so the invitation fails.

## Solution

### Step 1: Rewrite sync logic in `use-sync-personnel-to-workers.ts`
**Lines 26-82** — Replace the `contractor_site_representatives` upsert with a `contractor_representatives` upsert:
- Match on `company_id` + `is_primary = true` + `deleted_at IS NULL`
- Upsert `full_name`, `national_id`, `mobile_number`, `email` into `contractor_representatives`
- Set `is_primary = true` so the invitation handler finds this person
- Keep the `contractor_workers` sync (lines 84-154) unchanged for gate pass integration

### Step 2: Update `use-contractor-site-rep.ts` to read from `contractor_representatives`
- `useContractorSiteRep` → query `contractor_representatives` where `is_primary = true` instead of `contractor_site_representatives`
- `useUpsertSiteRep` → upsert into `contractor_representatives` instead of `contractor_site_representatives`
- Remove `useSyncSiteRepToWorker` (no longer needed — worker sync handled in Step 1)

### Step 3: Update `CompanyFormDialog.tsx` loading logic
- Line 108: `useContractorSiteRep` already returns the data — since we changed it in Step 2 to read from `contractor_representatives`, the form will now load from the correct table automatically
- No other changes needed in this file

### Step 4: Update labels in `SiteRepWorkerForm.tsx`
- Change heading from "Contractor's Site Representative" → "Contractor's Representative"
- Update note text: "This representative will receive the portal invitation and can manage workers, gate passes, and projects."

### Step 5: Update labels in `SiteRepLockedCard.tsx`
- Same label change as Step 4

## Files Changed

| File | Change |
|------|--------|
| `use-sync-personnel-to-workers.ts` | Replace `contractor_site_representatives` upsert with `contractor_representatives` upsert (is_primary=true) |
| `use-contractor-site-rep.ts` | Read/write `contractor_representatives` (is_primary=true) instead of `contractor_site_representatives` |
| `SiteRepWorkerForm.tsx` | Update labels and note text |
| `SiteRepLockedCard.tsx` | Update labels |

## End-to-End Flow After Fix
1. Admin fills Personnel form for GBR with islam@gbrksa.com
2. On save → data written to `contractor_representatives` with `is_primary = true`
3. Admin clicks "Send Portal Invitation" in Company Detail
4. Invitation handler finds islam@gbrksa.com in `contractor_representatives` → sends email
5. Islam receives invitation, creates account, logs into Contractor Portal

