-- =============================================================================
-- NOTIFICATION AUDIT HARDENING MIGRATION
--
-- Adds:
-- 0. Tenant default_phone_country_code for configurable phone normalization
-- 1. Idempotency key + unique constraint to notification_logs
-- 2. Improved indexes for notification delivery tracking
-- 3. Event dedup constraint on auto_notification_logs
-- 4. notification_health view for monitoring
-- =============================================================================

-- 0. Add default_phone_country_code to tenants (configurable per tenant)
--    Stores the dial code without +, e.g. '966' for Saudi Arabia, '971' for UAE.
--    Used by the notification pipeline for local phone number normalization.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS default_phone_country_code TEXT DEFAULT '966';

COMMENT ON COLUMN public.tenants.default_phone_country_code IS
  'Default country dial code (without +) for normalizing local phone numbers. E.g. 966=Saudi Arabia, 971=UAE, 44=UK.';

-- 1. Add idempotency_key column to notification_logs (server-side dedup)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notification_logs' AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE notification_logs ADD COLUMN idempotency_key TEXT;
  END IF;
END $$;

-- Create unique index for idempotency (partial: only non-null keys)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_logs_idempotency_key
  ON notification_logs (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 2. Add event_id column to auto_notification_logs for dedup
-- (already has event_id, but add unique constraint for tenant+event+recipient+channel)
CREATE UNIQUE INDEX IF NOT EXISTS idx_auto_notification_logs_dedup
  ON auto_notification_logs (tenant_id, event_type, event_id, recipient_id, channel)
  WHERE event_id IS NOT NULL AND recipient_id IS NOT NULL;

-- 3. Improved indexes for notification delivery monitoring
CREATE INDEX IF NOT EXISTS idx_notification_logs_status_created
  ON notification_logs (status, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notification_logs_channel_status
  ON notification_logs (channel, status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_auto_notification_logs_status_sent
  ON auto_notification_logs (status, sent_at DESC);

-- 4. Create notification_health view for monitoring dashboard
CREATE OR REPLACE VIEW notification_delivery_health AS
SELECT
  tenant_id,
  channel,
  status,
  COUNT(*) as count,
  MIN(created_at) as earliest,
  MAX(created_at) as latest
FROM notification_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND deleted_at IS NULL
GROUP BY tenant_id, channel, status
ORDER BY tenant_id, channel, status;

-- 5. Create function to get notification delivery summary per tenant
CREATE OR REPLACE FUNCTION get_notification_delivery_health(
  p_tenant_id UUID,
  p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
  channel TEXT,
  total_sent BIGINT,
  total_delivered BIGINT,
  total_failed BIGINT,
  total_pending BIGINT,
  delivery_rate NUMERIC,
  failure_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    nl.channel::TEXT,
    COUNT(*) FILTER (WHERE nl.status IN ('sent', 'delivered', 'read')) as total_sent,
    COUNT(*) FILTER (WHERE nl.status IN ('delivered', 'read')) as total_delivered,
    COUNT(*) FILTER (WHERE nl.status IN ('failed', 'bounced', 'complained')) as total_failed,
    COUNT(*) FILTER (WHERE nl.status = 'pending') as total_pending,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND(COUNT(*) FILTER (WHERE nl.status IN ('delivered', 'read'))::NUMERIC / COUNT(*)::NUMERIC * 100, 1)
      ELSE 0
    END as delivery_rate,
    CASE
      WHEN COUNT(*) > 0 THEN
        ROUND(COUNT(*) FILTER (WHERE nl.status IN ('failed', 'bounced', 'complained'))::NUMERIC / COUNT(*)::NUMERIC * 100, 1)
      ELSE 0
    END as failure_rate
  FROM notification_logs nl
  WHERE nl.tenant_id = p_tenant_id
    AND nl.created_at > NOW() - (p_hours || ' hours')::INTERVAL
    AND nl.deleted_at IS NULL
  GROUP BY nl.channel;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
