

# Daily Issues Report + Notification Health Summary

## What We're Building

Extend the daily 8:00 AM report to `Loay.smartphoto@gmail.com` to include not just incidents/issues, but also a **Notification Delivery Health** section showing failed notifications, retry stats, and channel-level success rates.

## Steps

### Step 1: Create `generate-daily-issues-report` Edge Function

A new Edge Function that queries and emails a report with two sections:

**Section A — Incidents Summary (last 24h)**
- Query `incidents` table for new incidents (created in last 24h)
- Query open/unresolved incidents (any age)
- Group by severity (L1-L5) and status
- List each new incident: reference_id, title, severity, status, location, occurred_at

**Section B — Notification Delivery Health (last 24h)**
- Query `auto_notification_logs` for last 24h stats:
  - Total sent vs failed by channel (email, push, WhatsApp)
  - Failed notifications with error messages
  - Retry attempts (attempt_count > 1)
  - Permanently failed (attempt_count >= 5)
- Query `email_send_log` (if exists) for email-specific stats:
  - Sent, failed, DLQ, suppressed counts

**Email format:** Professional HTML with DHUUD branding, dark blue header, tables for data.

### Step 2: Schedule via pg_cron

Add a pg_cron job: `0 8 * * *` (daily at 8:00 AM) calling the edge function via `net.http_post`.

### Step 3: Deploy

Deploy the new edge function.

## Technical Details

**Key queries:**
```sql
-- New incidents (24h)
SELECT id, reference_id, title, severity_level, status, location, occurred_at
FROM incidents WHERE created_at > NOW() - INTERVAL '24 hours' AND deleted_at IS NULL

-- Notification health (24h)
SELECT channel, status, count(*), 
  count(*) FILTER (WHERE attempt_count > 1) as retried
FROM auto_notification_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY channel, status

-- Failed notification details
SELECT channel, event_type, error_message, attempt_count, created_at
FROM auto_notification_logs
WHERE status = 'failed' AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC LIMIT 20
```

| Step | File | Change |
|------|------|--------|
| 1 | `supabase/functions/generate-daily-issues-report/index.ts` | New edge function |
| 2 | DB migration | pg_cron job at 8:00 AM daily |
| 3 | Deploy | Deploy edge function |

