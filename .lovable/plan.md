

# Fix: Update Email Sender Domain to dhuud.com

## Problem
Two edge functions still hardcode the Resend test domain (`onboarding@resend.dev`) instead of your verified `dhuud.com` domain:
1. `generate-daily-issues-report/index.ts` — Daily report emails
2. `mfa-backup-codes/index.ts` — MFA security alert emails

The shared email sender (`_shared/email-sender.ts`) already uses `noreply@dhuud.com` correctly.

## Changes

### Step 1: Update `generate-daily-issues-report/index.ts`
Change `from: "DHUUD System <onboarding@resend.dev>"` to `from: "DHUUD System <noreply@dhuud.com>"`

### Step 2: Update `mfa-backup-codes/index.ts`
Change `from: "DHUUD Security <onboarding@resend.dev>"` to `from: "DHUUD Security <noreply@dhuud.com>"`

### Step 3: Redeploy both edge functions

| Step | File | Change |
|------|------|--------|
| 1 | `generate-daily-issues-report/index.ts` | Update from address to `noreply@dhuud.com` |
| 2 | `mfa-backup-codes/index.ts` | Update from address to `noreply@dhuud.com` |
| 3 | Deploy | Redeploy both functions |

