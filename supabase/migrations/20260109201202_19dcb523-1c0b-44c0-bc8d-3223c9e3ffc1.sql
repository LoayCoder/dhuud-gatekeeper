-- =====================================================
-- DATABASE HEALTH CHECK FUNCTIONS
-- Provides tenant isolation analysis, orphaned records detection,
-- and constraint violation checking for admin dashboard
-- =====================================================

-- Function to check tenant isolation status across all tables
CREATE OR REPLACE FUNCTION public.check_tenant_isolation_status()
RETURNS TABLE (
  table_name text,
  has_tenant_id boolean,
  has_rls_enabled boolean,
  total_rows bigint,
  unique_tenants bigint,
  is_properly_isolated boolean,
  recommendation text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH table_info AS (
    SELECT 
      t.tablename AS tbl_name,
      EXISTS (
        SELECT 1 FROM information_schema.columns c 
        WHERE c.table_schema = 'public' 
        AND c.table_name = t.tablename 
        AND c.column_name = 'tenant_id'
      ) AS has_tenant_col,
      COALESCE(c.relrowsecurity, false) AS rls_enabled
    FROM pg_tables t
    LEFT JOIN pg_class c ON c.relname = t.tablename AND c.relnamespace = 'public'::regnamespace
    WHERE t.schemaname = 'public'
    AND t.tablename NOT LIKE 'pg_%'
    AND t.tablename NOT LIKE '_prisma%'
    AND t.tablename NOT IN ('schema_migrations', 'spatial_ref_sys')
  )
  SELECT 
    ti.tbl_name::text AS table_name,
    ti.has_tenant_col AS has_tenant_id,
    ti.rls_enabled AS has_rls_enabled,
    0::bigint AS total_rows,
    0::bigint AS unique_tenants,
    (ti.has_tenant_col AND ti.rls_enabled) AS is_properly_isolated,
    CASE 
      WHEN NOT ti.has_tenant_col THEN 'Missing tenant_id column - needs multi-tenant support'
      WHEN NOT ti.rls_enabled THEN 'RLS not enabled - data may leak between tenants'
      ELSE 'Properly configured'
    END::text AS recommendation
  FROM table_info ti
  ORDER BY 
    CASE WHEN NOT ti.has_tenant_col OR NOT ti.rls_enabled THEN 0 ELSE 1 END,
    ti.tbl_name;
END;
$$;

-- Function to find orphaned records (records referencing non-existent parents)
CREATE OR REPLACE FUNCTION public.find_orphaned_records()
RETURNS TABLE (
  table_name text,
  column_name text,
  orphaned_count bigint,
  sample_ids text[],
  severity text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  
  -- Incidents with non-existent tenant
  SELECT 
    'incidents'::text,
    'tenant_id'::text,
    COUNT(*)::bigint,
    (SELECT ARRAY_AGG(sub.id::text) FROM (SELECT i2.id FROM incidents i2 WHERE i2.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = i2.tenant_id) ORDER BY i2.created_at DESC LIMIT 5) sub),
    'critical'::text
  FROM incidents i
  WHERE i.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = i.tenant_id)
  HAVING COUNT(*) > 0
  
  UNION ALL
  
  -- Incidents with non-existent reporter
  SELECT 
    'incidents'::text,
    'reporter_id'::text,
    COUNT(*)::bigint,
    (SELECT ARRAY_AGG(sub.id::text) FROM (SELECT i2.id FROM incidents i2 WHERE i2.deleted_at IS NULL AND i2.reporter_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = i2.reporter_id) ORDER BY i2.created_at DESC LIMIT 5) sub),
    'high'::text
  FROM incidents i
  WHERE i.deleted_at IS NULL
  AND i.reporter_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = i.reporter_id)
  HAVING COUNT(*) > 0
  
  UNION ALL
  
  -- Corrective actions with non-existent incidents
  SELECT 
    'corrective_actions'::text,
    'incident_id'::text,
    COUNT(*)::bigint,
    (SELECT ARRAY_AGG(sub.id::text) FROM (SELECT ca2.id FROM corrective_actions ca2 WHERE ca2.deleted_at IS NULL AND ca2.incident_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM incidents i WHERE i.id = ca2.incident_id AND i.deleted_at IS NULL) ORDER BY ca2.created_at DESC LIMIT 5) sub),
    'high'::text
  FROM corrective_actions ca
  WHERE ca.deleted_at IS NULL
  AND ca.incident_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM incidents i WHERE i.id = ca.incident_id AND i.deleted_at IS NULL)
  HAVING COUNT(*) > 0
  
  UNION ALL
  
  -- Profiles with non-existent tenant
  SELECT 
    'profiles'::text,
    'tenant_id'::text,
    COUNT(*)::bigint,
    (SELECT ARRAY_AGG(sub.id::text) FROM (SELECT p2.id FROM profiles p2 WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = p2.tenant_id) ORDER BY p2.created_at DESC LIMIT 5) sub),
    'critical'::text
  FROM profiles p
  WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = p.tenant_id)
  HAVING COUNT(*) > 0
  
  UNION ALL
  
  -- Inspection sessions with non-existent templates
  SELECT 
    'inspection_sessions'::text,
    'template_id'::text,
    COUNT(*)::bigint,
    (SELECT ARRAY_AGG(sub.id::text) FROM (SELECT s2.id FROM inspection_sessions s2 WHERE s2.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM inspection_templates t WHERE t.id = s2.template_id AND t.deleted_at IS NULL) ORDER BY s2.created_at DESC LIMIT 5) sub),
    'medium'::text
  FROM inspection_sessions s
  WHERE s.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM inspection_templates t WHERE t.id = s.template_id AND t.deleted_at IS NULL)
  HAVING COUNT(*) > 0
  
  UNION ALL
  
  -- HSSE assets with non-existent locations
  SELECT 
    'hsse_assets'::text,
    'location_id'::text,
    COUNT(*)::bigint,
    (SELECT ARRAY_AGG(sub.id::text) FROM (SELECT a2.id FROM hsse_assets a2 WHERE a2.deleted_at IS NULL AND a2.location_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM locations l WHERE l.id = a2.location_id AND l.deleted_at IS NULL) ORDER BY a2.created_at DESC LIMIT 5) sub),
    'low'::text
  FROM hsse_assets a
  WHERE a.deleted_at IS NULL
  AND a.location_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM locations l WHERE l.id = a.location_id AND l.deleted_at IS NULL)
  HAVING COUNT(*) > 0;
END;
$$;

-- Function to check for constraint violations and data integrity issues
CREATE OR REPLACE FUNCTION public.check_data_integrity()
RETURNS TABLE (
  check_name text,
  table_name text,
  issue_count bigint,
  severity text,
  description text,
  sample_data jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  
  -- Check for duplicate reference IDs within same tenant
  SELECT 
    'duplicate_reference_ids'::text AS check_name,
    'incidents'::text AS table_name,
    (SELECT COUNT(*) FROM (
      SELECT 1 FROM incidents i
      WHERE i.deleted_at IS NULL
      GROUP BY i.tenant_id, i.reference_id
      HAVING COUNT(*) > 1
    ) dups)::bigint AS issue_count,
    'high'::text AS severity,
    'Duplicate reference IDs found within tenant'::text AS description,
    jsonb_build_object(
      'duplicates', (
        SELECT jsonb_agg(jsonb_build_object('tenant_id', tenant_id, 'reference_id', reference_id, 'count', cnt))
        FROM (
          SELECT tenant_id, reference_id, COUNT(*) as cnt
          FROM incidents
          WHERE deleted_at IS NULL
          GROUP BY tenant_id, reference_id
          HAVING COUNT(*) > 1
          LIMIT 5
        ) dups
      )
    ) AS sample_data
  WHERE EXISTS (
    SELECT 1 FROM incidents i
    WHERE i.deleted_at IS NULL
    GROUP BY i.tenant_id, i.reference_id
    HAVING COUNT(*) > 1
  )
  
  UNION ALL
  
  -- Check for incidents without required fields
  SELECT 
    'missing_required_fields'::text,
    'incidents'::text,
    COUNT(*)::bigint,
    'medium'::text,
    'Incidents missing required fields (title, event_type, or location)'::text,
    jsonb_build_object('sample_ids', (SELECT jsonb_agg(sub.id) FROM (SELECT id FROM incidents WHERE deleted_at IS NULL AND (title IS NULL OR title = '' OR event_type IS NULL OR location IS NULL OR location = '') LIMIT 5) sub))
  FROM incidents
  WHERE deleted_at IS NULL
  AND (title IS NULL OR title = '' OR event_type IS NULL OR location IS NULL OR location = '')
  HAVING COUNT(*) > 0
  
  UNION ALL
  
  -- Check for overdue actions
  SELECT 
    'overdue_actions'::text,
    'corrective_actions'::text,
    COUNT(*)::bigint,
    'warning'::text,
    'Corrective actions past due date and not completed'::text,
    jsonb_build_object('oldest_overdue', MIN(due_date)::text, 'total_overdue', COUNT(*))
  FROM corrective_actions
  WHERE deleted_at IS NULL
  AND status NOT IN ('completed', 'closed', 'cancelled')
  AND due_date < CURRENT_DATE
  HAVING COUNT(*) > 0
  
  UNION ALL
  
  -- Check for stale inspection schedules
  SELECT 
    'stale_schedules'::text,
    'inspection_schedules'::text,
    COUNT(*)::bigint,
    'warning'::text,
    'Inspection schedules past due but not executed'::text,
    jsonb_build_object('oldest_stale', MIN(next_due_date)::text, 'total_stale', COUNT(*))
  FROM inspection_schedules
  WHERE deleted_at IS NULL
  AND status = 'active'
  AND next_due_date < CURRENT_DATE - INTERVAL '7 days'
  HAVING COUNT(*) > 0
  
  UNION ALL
  
  -- Check for users without profiles
  SELECT 
    'users_without_profiles'::text,
    'profiles'::text,
    COUNT(*)::bigint,
    'medium'::text,
    'Auth users without corresponding profile records'::text,
    jsonb_build_object('note', 'User IDs are not displayed for privacy')
  FROM auth.users au
  WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = au.id)
  HAVING COUNT(*) > 0;
END;
$$;

-- Function to get overall database health summary
CREATE OR REPLACE FUNCTION public.get_database_health_summary()
RETURNS TABLE (
  category text,
  status text,
  issue_count bigint,
  critical_count bigint,
  high_count bigint,
  medium_count bigint,
  low_count bigint,
  last_checked_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  
  -- Tenant Isolation Status
  SELECT 
    'tenant_isolation'::text AS category,
    CASE 
      WHEN COUNT(*) FILTER (WHERE NOT is_properly_isolated) = 0 THEN 'healthy'
      WHEN COUNT(*) FILTER (WHERE NOT is_properly_isolated) < 3 THEN 'warning'
      ELSE 'critical'
    END::text AS status,
    COUNT(*) FILTER (WHERE NOT is_properly_isolated)::bigint AS issue_count,
    0::bigint AS critical_count,
    COUNT(*) FILTER (WHERE NOT has_rls_enabled AND has_tenant_id)::bigint AS high_count,
    COUNT(*) FILTER (WHERE NOT has_tenant_id)::bigint AS medium_count,
    0::bigint AS low_count,
    NOW() AS last_checked_at
  FROM check_tenant_isolation_status()
  
  UNION ALL
  
  -- Orphaned Records
  SELECT 
    'orphaned_records'::text,
    CASE 
      WHEN COALESCE(SUM(orphaned_count), 0) = 0 THEN 'healthy'
      WHEN COALESCE(SUM(orphaned_count) FILTER (WHERE severity = 'critical'), 0) > 0 THEN 'critical'
      ELSE 'warning'
    END::text,
    COALESCE(SUM(orphaned_count), 0)::bigint,
    COALESCE(SUM(orphaned_count) FILTER (WHERE severity = 'critical'), 0)::bigint,
    COALESCE(SUM(orphaned_count) FILTER (WHERE severity = 'high'), 0)::bigint,
    COALESCE(SUM(orphaned_count) FILTER (WHERE severity = 'medium'), 0)::bigint,
    COALESCE(SUM(orphaned_count) FILTER (WHERE severity = 'low'), 0)::bigint,
    NOW()
  FROM find_orphaned_records()
  
  UNION ALL
  
  -- Data Integrity
  SELECT 
    'data_integrity'::text,
    CASE 
      WHEN COALESCE(SUM(issue_count), 0) = 0 THEN 'healthy'
      WHEN COALESCE(SUM(issue_count) FILTER (WHERE severity = 'high'), 0) > 0 THEN 'critical'
      ELSE 'warning'
    END::text,
    COALESCE(SUM(issue_count), 0)::bigint,
    0::bigint,
    COALESCE(SUM(issue_count) FILTER (WHERE severity = 'high'), 0)::bigint,
    COALESCE(SUM(issue_count) FILTER (WHERE severity IN ('medium', 'warning')), 0)::bigint,
    COALESCE(SUM(issue_count) FILTER (WHERE severity = 'low'), 0)::bigint,
    NOW()
  FROM check_data_integrity();
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_tenant_isolation_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_orphaned_records() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_data_integrity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_database_health_summary() TO authenticated;