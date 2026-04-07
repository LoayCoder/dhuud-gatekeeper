

# Fix WhatsApp Notification for Representatives

## Problem
`send-contractor-notification` looks up the passed ID only in `contractor_workers`. When a Representative ID is passed, the query returns no rows and WhatsApp is never sent.

## Fix

**File:** `supabase/functions/send-contractor-notification/index.ts`

Add a fallback lookup: if the ID is not found in `contractor_workers`, query `contractor_representatives` to get `company_id` and `mobile_number`. Use that data to send the WhatsApp message.

```text
Current flow:
  workerId → contractor_workers → company_id → find reps → send WhatsApp
  (fails if workerId is actually a representative ID)

New flow:
  workerId → contractor_workers → company_id → find reps → send WhatsApp
       ↓ (not found)
  workerId → contractor_representatives → get mobile_number + company_id → send WhatsApp directly
```

## Steps

1. After the existing worker lookup fails (returns null), add a second query to `contractor_representatives` filtering by `id = workerId` and `deleted_at IS NULL`
2. If found, use the representative's own `mobile_number` for WhatsApp delivery and their `company_id` for context
3. Deploy the updated edge function

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/send-contractor-notification/index.ts` | Add representative fallback lookup |

