-- =====================================================
-- HSE Weekly Messages Table for Rotating Banners
-- =====================================================
CREATE TABLE public.hse_weekly_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ar TEXT,
  message TEXT NOT NULL,
  message_ar TEXT,
  icon_name TEXT DEFAULT 'Shield',
  color_scheme TEXT DEFAULT 'info' CHECK (color_scheme IN ('info', 'warning', 'success', 'danger')),
  is_active BOOLEAN DEFAULT true,
  display_from DATE NOT NULL,
  display_until DATE NOT NULL,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT valid_display_dates CHECK (display_until >= display_from)
);

-- Enable RLS
ALTER TABLE public.hse_weekly_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant isolation
CREATE POLICY "Users can view active HSE messages for their tenant"
  ON public.hse_weekly_messages
  FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND deleted_at IS NULL
    AND is_active = true
  );

CREATE POLICY "Admins can manage HSE messages for their tenant"
  ON public.hse_weekly_messages
  FOR ALL
  USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND public.is_admin(auth.uid())
  );

-- Index for efficient querying
CREATE INDEX idx_hse_weekly_messages_tenant_active 
  ON public.hse_weekly_messages(tenant_id, is_active, display_from, display_until)
  WHERE deleted_at IS NULL;

-- =====================================================
-- Function: Get My Reporting Stats with Rank
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_my_reporting_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_department_id UUID;
  v_my_incidents INTEGER;
  v_my_observations INTEGER;
  v_my_incidents_this_month INTEGER;
  v_my_observations_this_month INTEGER;
  v_my_incidents_last_month INTEGER;
  v_my_observations_last_month INTEGER;
  v_completed_actions INTEGER;
  v_company_rank INTEGER;
  v_department_rank INTEGER;
  v_total_reporters INTEGER;
  v_dept_reporters INTEGER;
  v_percentile NUMERIC;
  v_trend_incidents INTEGER;
  v_trend_observations INTEGER;
  v_current_month_start DATE;
  v_last_month_start DATE;
  v_last_month_end DATE;
BEGIN
  -- Get current user info
  v_user_id := auth.uid();
  
  SELECT tenant_id, assigned_department_id INTO v_tenant_id, v_department_id
  FROM profiles WHERE id = v_user_id;
  
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;
  
  -- Calculate date ranges
  v_current_month_start := date_trunc('month', CURRENT_DATE)::DATE;
  v_last_month_start := (date_trunc('month', CURRENT_DATE) - INTERVAL '1 month')::DATE;
  v_last_month_end := (date_trunc('month', CURRENT_DATE) - INTERVAL '1 day')::DATE;
  
  -- My total incidents reported
  SELECT COUNT(*) INTO v_my_incidents
  FROM incidents
  WHERE reported_by = v_user_id 
    AND tenant_id = v_tenant_id
    AND deleted_at IS NULL;
  
  -- My total observations reported
  SELECT COUNT(*) INTO v_my_observations
  FROM observations
  WHERE reported_by = v_user_id 
    AND tenant_id = v_tenant_id
    AND deleted_at IS NULL;
  
  -- This month's incidents
  SELECT COUNT(*) INTO v_my_incidents_this_month
  FROM incidents
  WHERE reported_by = v_user_id 
    AND tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND DATE(created_at) >= v_current_month_start;
  
  -- This month's observations
  SELECT COUNT(*) INTO v_my_observations_this_month
  FROM observations
  WHERE reported_by = v_user_id 
    AND tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND DATE(created_at) >= v_current_month_start;
  
  -- Last month's counts for trend
  SELECT COUNT(*) INTO v_my_incidents_last_month
  FROM incidents
  WHERE reported_by = v_user_id 
    AND tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND DATE(created_at) >= v_last_month_start
    AND DATE(created_at) <= v_last_month_end;
  
  SELECT COUNT(*) INTO v_my_observations_last_month
  FROM observations
  WHERE reported_by = v_user_id 
    AND tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND DATE(created_at) >= v_last_month_start
    AND DATE(created_at) <= v_last_month_end;
  
  -- Completed actions assigned to me
  SELECT COUNT(*) INTO v_completed_actions
  FROM corrective_actions
  WHERE assigned_to = v_user_id 
    AND tenant_id = v_tenant_id
    AND deleted_at IS NULL
    AND status IN ('completed', 'verified', 'closed');
  
  -- Calculate company rank (by total reports)
  WITH reporter_counts AS (
    SELECT 
      reporter_id,
      total_reports
    FROM (
      SELECT reported_by as reporter_id, COUNT(*) as total_reports
      FROM (
        SELECT reported_by FROM incidents WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
        UNION ALL
        SELECT reported_by FROM observations WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
      ) combined
      GROUP BY reported_by
    ) counts
    ORDER BY total_reports DESC
  ),
  ranked AS (
    SELECT reporter_id, RANK() OVER (ORDER BY total_reports DESC) as rank
    FROM reporter_counts
  )
  SELECT rank INTO v_company_rank FROM ranked WHERE reporter_id = v_user_id;
  
  -- Count total reporters in company
  SELECT COUNT(DISTINCT reporter_id) INTO v_total_reporters
  FROM (
    SELECT reported_by as reporter_id FROM incidents WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
    UNION
    SELECT reported_by as reporter_id FROM observations WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
  ) all_reporters;
  
  -- Calculate department rank if user has a department
  IF v_department_id IS NOT NULL THEN
    WITH dept_profiles AS (
      SELECT id FROM profiles WHERE assigned_department_id = v_department_id AND tenant_id = v_tenant_id
    ),
    dept_reporter_counts AS (
      SELECT 
        reporter_id,
        total_reports
      FROM (
        SELECT dp.id as reporter_id, 
          (SELECT COUNT(*) FROM incidents WHERE reported_by = dp.id AND tenant_id = v_tenant_id AND deleted_at IS NULL) +
          (SELECT COUNT(*) FROM observations WHERE reported_by = dp.id AND tenant_id = v_tenant_id AND deleted_at IS NULL) as total_reports
        FROM dept_profiles dp
      ) counts
      WHERE total_reports > 0
      ORDER BY total_reports DESC
    ),
    dept_ranked AS (
      SELECT reporter_id, RANK() OVER (ORDER BY total_reports DESC) as rank
      FROM dept_reporter_counts
    )
    SELECT rank INTO v_department_rank FROM dept_ranked WHERE reporter_id = v_user_id;
    
    SELECT COUNT(*) INTO v_dept_reporters FROM (
      SELECT dp.id as reporter_id
      FROM (SELECT id FROM profiles WHERE assigned_department_id = v_department_id AND tenant_id = v_tenant_id) dp
      WHERE (
        SELECT COUNT(*) FROM incidents WHERE reported_by = dp.id AND tenant_id = v_tenant_id AND deleted_at IS NULL
      ) + (
        SELECT COUNT(*) FROM observations WHERE reported_by = dp.id AND tenant_id = v_tenant_id AND deleted_at IS NULL
      ) > 0
    ) dept_active;
  END IF;
  
  -- Calculate percentile
  IF v_total_reporters > 0 AND v_company_rank IS NOT NULL THEN
    v_percentile := ROUND(((v_total_reporters - v_company_rank + 1)::NUMERIC / v_total_reporters) * 100, 1);
  ELSE
    v_percentile := 0;
  END IF;
  
  -- Calculate trends
  v_trend_incidents := v_my_incidents_this_month - v_my_incidents_last_month;
  v_trend_observations := v_my_observations_this_month - v_my_observations_last_month;
  
  RETURN jsonb_build_object(
    'my_incidents', COALESCE(v_my_incidents, 0),
    'my_observations', COALESCE(v_my_observations, 0),
    'my_incidents_this_month', COALESCE(v_my_incidents_this_month, 0),
    'my_observations_this_month', COALESCE(v_my_observations_this_month, 0),
    'completed_actions', COALESCE(v_completed_actions, 0),
    'company_rank', v_company_rank,
    'department_rank', v_department_rank,
    'total_reporters', COALESCE(v_total_reporters, 0),
    'dept_reporters', COALESCE(v_dept_reporters, 0),
    'percentile', COALESCE(v_percentile, 0),
    'trend_incidents', v_trend_incidents,
    'trend_observations', v_trend_observations
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_my_reporting_stats() TO authenticated;