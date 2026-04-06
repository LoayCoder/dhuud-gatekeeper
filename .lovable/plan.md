

# Automatic Retry for Failed Notifications — Implementation Plan

## Current State

- **Email**: Already has rate-limit retry (429) with exponential backoff in `email-sender.ts` (max 2 retries, 250ms base)
- **WhatsApp**: Already has rate-limit retry in `wasender-whatsapp.ts` (max 3 retries, 5.5s delay)
- **Gap**: Both only retry **within the same request**. If the send still fails after retries (e.g., WaSender subscription paused, Resend 500 error, network timeout), the failure is logged to `auto_notification_logs` with `status='failed'` and **never retried again**
- **`auto_notification_logs`** already has `attempt_count` (default 1) and `retry_at` columns — designed for retry but never used

## Plan

### Step 1: Create `retry-failed-notifications` Edge Function

New edge function that:
1. Queries `auto_notification_logs` for failed notifications eligible for retry:
   - `status = 'failed'`
   - `attempt_count < 5` (max 5 total attempts)
   - `retry_at IS NULL OR retry_at <= NOW()` (respects backoff schedule)
   - `created_at > NOW() - INTERVAL '24 hours'` (don't retry ancient failures)
2. For each failed notification, re-sends via the appropriate channel (email/WhatsApp/push)
3. On success: updates `status = 'sent'`, `sent_at = NOW()`, increments `attempt_count`
4. On failure: increments `attempt_count`, sets `retry_at` with exponential backoff:
   - Attempt 2: retry after 2 minutes
   - Attempt 3: retry after 10 minutes
   - Attempt 4: retry after 30 minutes
   - Attempt 5: retry after 2 hours (final attempt)
5. After attempt 5: updates `status = 'permanently_failed'`
6. Processes max 20 notifications per run to stay within Edge Function timeout

### Step 2: Update Dispatch to Set `retry_at` on Failure

In `dispatch-incident-notification/index.ts`, when logging a failed send to `auto_notification_logs`, set `retry_at = NOW() + INTERVAL '2 minutes'` so the retry function picks it up on the next cycle.

### Step 3: Schedule via pg_cron

Add a pg_cron job to invoke `retry-failed-notifications` every 5 minutes.

### Step 4: Store Retry Context

The retry function needs the original message content to re-send. Update the dispatch function to populate `message_content` in `auto_notification_logs` for failed sends (currently always NULL). This stores the rendered message so retries don't need to re-fetch incident data and re-render templates.

## Technical Details

**Backoff schedule** (exponential):
```
Attempt 1: immediate (original send)
Attempt 2: +2 min
Attempt 3: +10 min
Attempt 4: +30 min
Attempt 5: +2 hours (final)
```

**Edge function query:**
```sql
SELECT * FROM auto_notification_logs
WHERE status = 'failed'
  AND attempt_count < 5
  AND (retry_at IS NULL OR retry_at <= NOW())
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at ASC
LIMIT 20
```

| Step | Files | Change |
|------|-------|--------|
| 1 | `supabase/functions/retry-failed-notifications/index.ts` | New edge function |
| 2 | `supabase/functions/dispatch-incident-notification/index.ts` | Set `retry_at` + `message_content` on failure |
| 3 | DB migration | pg_cron job every 5 min |
| 4 | Deploy | Deploy both edge functions |

