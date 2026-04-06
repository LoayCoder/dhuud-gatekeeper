

# Fix: Email Throttling + WhatsApp Status Check

## Problems

1. **Email rate limiting**: The `dispatch-incident-notification` edge function sends emails to all recipients in a tight loop with no delay. Resend's free tier allows max 5 emails/second. When an incident triggers notifications to 6+ stakeholders, the later emails fail with "Too many requests".

2. **WhatsApp broken**: WaSender subscription is paused — this requires the user to resume their subscription at wasenderapi.com. No code fix can resolve this.

## Implementation Plan

### Step 1: Add Inter-Send Delay to Email Sender
**File:** `supabase/functions/_shared/email-sender.ts`

Add rate-limit retry logic to `sendEmail()`:
- If Resend returns HTTP 429 or error contains "Too many requests", wait and retry
- Add a configurable delay constant (e.g., 250ms between sends)
- Max 2 retries with exponential backoff (250ms → 500ms → 1000ms)

This mirrors the existing pattern in `wasender-whatsapp.ts` which already has retry logic for rate limits.

### Step 2: Add Inter-Recipient Delay in Dispatch Loop
**File:** `supabase/functions/dispatch-incident-notification/index.ts`

Add a small delay (200ms) between each email send in the main dispatch loop (line ~652, the `for...of` loop over recipients/channels). This proactively avoids hitting Resend's rate limit instead of relying solely on retry.

### Step 3: Redeploy Edge Functions
Deploy both `dispatch-incident-notification` and any functions using the shared email sender.

### Step 4: WhatsApp — User Action Required
Inform the user that WaSender subscription needs to be resumed. This is an account-level issue, not a code issue.

## Technical Details

**Email throttle approach in `email-sender.ts`:**
```typescript
// Add retry on 429
if (error?.statusCode === 429 && retryCount < MAX_RETRIES) {
  await sleep(RETRY_DELAY_MS * (retryCount + 1));
  return sendEmail(options, retryCount + 1);
}
```

**Dispatch loop delay (between channel sends):**
```typescript
// After each email send, add small delay to stay under rate limit
if (channel === 'email' && status === 'sent') {
  await new Promise(r => setTimeout(r, 200));
}
```

| Step | File | Change |
|------|------|--------|
| 1 | `_shared/email-sender.ts` | Add retry logic for 429 errors |
| 2 | `dispatch-incident-notification/index.ts` | Add 200ms delay between email sends |
| 3 | Deploy | Redeploy edge functions |
| 4 | User action | Resume WaSender subscription |

