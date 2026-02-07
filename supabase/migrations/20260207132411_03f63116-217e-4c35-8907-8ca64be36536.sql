-- Create RPC function to get notification summary for a tenant (last 24 hours)
CREATE OR REPLACE FUNCTION get_notification_summary(p_tenant_id uuid)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'total', count(*),
    'sent', count(*) FILTER (WHERE status = 'sent'),
    'delivered', count(*) FILTER (WHERE status = 'delivered'),
    'failed', count(*) FILTER (WHERE status = 'failed'),
    'pending', count(*) FILTER (WHERE status = 'pending')
  )
  FROM notification_logs
  WHERE tenant_id = p_tenant_id
    AND created_at >= now() - interval '24 hours';
$$;