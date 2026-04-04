

# Fix: Revert Incorrect Site Rep → Company Rep Sync and Fix Invitation Logic

## Problem

The previous fix incorrectly treated `contractor_site_representatives` and `contractor_representatives` as the same entity. They are **different users**:

- **`contractor_representatives`** = company representatives who receive portal invitations
- **`contractor_site_representatives`** = on-site personnel (different role, different people)

The previous changes:
1. Made `handleSendPortalInvitation` prefer site reps over company reps — **wrong**
2. Added sync logic in `useUpsertSiteRep` that overwrites company rep data with site rep data — **data corruption**

For GBR: there is no company representative in `contractor_representatives`. The correct behavior is to show a clear message telling the admin to add a company representative first.

## Fix

### Step 1: Revert invitation handler to use only `contractor_representatives`

In `CompanyDetailDialog.tsx`, change `handleSendPortalInvitation` back to only look at `representatives` (from `contractor_representatives`). Remove the `siteRepFromTable` fallback logic. Show a clear error message: "No company representative found. Please add a company representative with an email first."

### Step 2: Remove the sync logic from `useUpsertSiteRep`

In `use-contractor-site-rep.ts`, remove the `onSuccess` sync block (lines 129–165) that copies site rep data into `contractor_representatives`. These are different people — syncing them corrupts company rep data.

### Step 3: Update the Edge Function — no changes needed

The edge function already correctly queries `contractor_representatives` only. No changes required there.

## Files Changed

| File | Change |
|------|--------|
| `src/features/contractors/components/CompanyDetailDialog.tsx` | Revert invitation handler to use only `contractor_representatives` |
| `src/features/contractors/hooks/use-contractor-site-rep.ts` | Remove sync-to-contractor_representatives logic from `onSuccess` |

## Impact
- Company rep data will no longer be overwritten by site rep data
- Invitation will correctly target company representatives only
- Admin gets a clear message to add a company representative if none exists for a company like GBR

