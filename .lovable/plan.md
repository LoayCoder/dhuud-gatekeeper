

# Fix: Last Remaining Resend Test Domain

## Problem

One edge function still uses the Resend test domain:

- **`supabase/functions/generate-scheduled-security-report/index.ts`** line 131: `from: "DHUUD Security <noreply@resend.dev>"`

All other functions already use `noreply@dhuud.com` correctly:
- `_shared/email-sender.ts` — ✅ `noreply@dhuud.com`
- `generate-daily-issues-report/index.ts` — ✅ `noreply@dhuud.com`
- `mfa-backup-codes/index.ts` — ✅ `noreply@dhuud.com`

## Fix

### Step 1: Update `generate-scheduled-security-report/index.ts`
Change `from: "DHUUD Security <noreply@resend.dev>"` to `from: "DHUUD Security <noreply@dhuud.com>"`

### Step 2: Redeploy the edge function

| Step | File | Change |
|------|------|--------|
| 1 | `generate-scheduled-security-report/index.ts` | Update from address to `noreply@dhuud.com` |
| 2 | Deploy | Redeploy the function |

