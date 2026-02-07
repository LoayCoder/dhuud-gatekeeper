

## Apply Notification Summary RPC Migration

### Current State
- The migration file `supabase/migrations/20260217000000_add_notification_summary_rpc.sql` exists but has **not been applied** to the database
- The `notification_logs` table exists with the correct schema including `tenant_id`, `status`, and `created_at` columns
- The `NotificationPipelineStatus` component is already calling `supabase.rpc('get_notification_summary', { p_tenant_id })` but the function doesn't exist yet

### What This Migration Does
Creates an efficient server-side aggregation function that:
- Counts notifications by status (sent, delivered, failed, pending) for a tenant
- Filters to only the last 24 hours
- Returns a single JSON object instead of fetching all rows client-side

### Migration SQL
```sql
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
```

### Implementation Steps

| Step | Action |
|------|--------|
| 1 | Apply the migration using the database migration tool |
| 2 | Verify the function was created successfully |

### Technical Details
- **Function Type**: `STABLE` - indicates no side effects, can be optimized
- **Security**: `SECURITY DEFINER` - runs with the permissions of the function owner
- **Parameter**: `p_tenant_id` follows the `p_` prefix naming convention
- **Return**: JSON object with total, sent, delivered, failed, pending counts

