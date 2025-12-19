-- Add email notification columns to hsse_notifications
ALTER TABLE public.hsse_notifications
ADD COLUMN IF NOT EXISTS send_email_notification BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_delivery_status TEXT DEFAULT 'pending';

-- Create scheduled notifications table
CREATE TABLE public.hsse_scheduled_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Content (same as regular notifications)
  title_en TEXT NOT NULL,
  title_ar TEXT,
  body_en TEXT NOT NULL,
  body_ar TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium',
  notification_type TEXT NOT NULL DEFAULT 'informational',
  
  -- Targeting
  target_audience TEXT NOT NULL DEFAULT 'all_users',
  target_role_ids UUID[] DEFAULT '{}',
  target_branch_ids UUID[] DEFAULT '{}',
  target_site_ids UUID[] DEFAULT '{}',
  
  -- Delivery options
  send_push_notification BOOLEAN DEFAULT true,
  send_email_notification BOOLEAN DEFAULT false,
  
  -- Schedule configuration
  schedule_type TEXT NOT NULL CHECK (schedule_type IN ('daily', 'weekly', 'monthly', 'once')),
  schedule_time TIME NOT NULL DEFAULT '09:00:00',
  schedule_days_of_week INTEGER[] DEFAULT '{}',
  schedule_day_of_month INTEGER,
  schedule_timezone TEXT DEFAULT 'Asia/Riyadh',
  
  -- Date range
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  
  -- Tracking
  is_active BOOLEAN DEFAULT true,
  last_sent_at TIMESTAMPTZ,
  next_scheduled_at TIMESTAMPTZ,
  total_sent_count INTEGER DEFAULT 0,
  
  -- Audit
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes for scheduled notifications
CREATE INDEX idx_hsse_scheduled_notifications_tenant ON public.hsse_scheduled_notifications(tenant_id);
CREATE INDEX idx_hsse_scheduled_notifications_next ON public.hsse_scheduled_notifications(next_scheduled_at) WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX idx_hsse_scheduled_notifications_active ON public.hsse_scheduled_notifications(is_active) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.hsse_scheduled_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for hsse_scheduled_notifications using user_role_assignments
CREATE POLICY "HSSE admins can manage scheduled notifications"
ON public.hsse_scheduled_notifications
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_role_assignments ura ON ura.user_id = p.id
    JOIN public.roles r ON r.id = ura.role_id
    WHERE p.id = auth.uid()
    AND p.tenant_id = hsse_scheduled_notifications.tenant_id
    AND r.code IN ('admin', 'hsse_manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_role_assignments ura ON ura.user_id = p.id
    JOIN public.roles r ON r.id = ura.role_id
    WHERE p.id = auth.uid()
    AND p.tenant_id = hsse_scheduled_notifications.tenant_id
    AND r.code IN ('admin', 'hsse_manager')
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_hsse_scheduled_notifications_updated_at
BEFORE UPDATE ON public.hsse_scheduled_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get acknowledgment rates by branch
CREATE OR REPLACE FUNCTION public.get_hsse_acknowledgment_rates(
  p_tenant_id UUID,
  p_date_from TIMESTAMPTZ DEFAULT (now() - interval '30 days'),
  p_date_to TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  branch_id UUID,
  branch_name TEXT,
  total_notifications BIGINT,
  total_expected_acks BIGINT,
  total_actual_acks BIGINT,
  acknowledgment_rate NUMERIC,
  avg_response_hours NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id as branch_id,
    b.name as branch_name,
    COUNT(DISTINCT n.id) as total_notifications,
    COUNT(DISTINCT (n.id, p.id)) as total_expected_acks,
    COUNT(DISTINCT a.id) as total_actual_acks,
    CASE 
      WHEN COUNT(DISTINCT (n.id, p.id)) > 0 
      THEN ROUND((COUNT(DISTINCT a.id)::NUMERIC / COUNT(DISTINCT (n.id, p.id))) * 100, 2)
      ELSE 0 
    END as acknowledgment_rate,
    ROUND(AVG(EXTRACT(EPOCH FROM (a.acknowledged_at - n.published_at)) / 3600)::NUMERIC, 2) as avg_response_hours
  FROM branches b
  CROSS JOIN hsse_notifications n
  LEFT JOIN profiles p ON p.assigned_branch_id = b.id AND p.tenant_id = p_tenant_id AND p.is_active = true
  LEFT JOIN hsse_notification_acknowledgments a ON a.notification_id = n.id AND a.user_id = p.id
  WHERE b.tenant_id = p_tenant_id
    AND b.deleted_at IS NULL
    AND n.tenant_id = p_tenant_id
    AND n.notification_type = 'mandatory'
    AND n.published_at IS NOT NULL
    AND n.published_at BETWEEN p_date_from AND p_date_to
    AND n.deleted_at IS NULL
    AND (n.target_audience = 'all_users' OR b.id = ANY(n.target_branch_ids))
  GROUP BY b.id, b.name
  ORDER BY acknowledgment_rate DESC;
END;
$$;

-- Function to get overall compliance metrics
CREATE OR REPLACE FUNCTION public.get_hsse_compliance_metrics(
  p_tenant_id UUID
)
RETURNS TABLE (
  total_mandatory_notifications BIGINT,
  total_informational_notifications BIGINT,
  overall_ack_rate NUMERIC,
  avg_response_time_hours NUMERIC,
  overdue_count BIGINT,
  critical_pending BIGINT,
  high_pending BIGINT,
  weekly_trend JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_mandatory BIGINT;
  v_total_informational BIGINT;
  v_overall_ack_rate NUMERIC;
  v_avg_response_time NUMERIC;
  v_overdue_count BIGINT;
  v_critical_pending BIGINT;
  v_high_pending BIGINT;
  v_weekly_trend JSON;
BEGIN
  -- Count notification types
  SELECT 
    COUNT(*) FILTER (WHERE notification_type = 'mandatory'),
    COUNT(*) FILTER (WHERE notification_type = 'informational')
  INTO v_total_mandatory, v_total_informational
  FROM hsse_notifications
  WHERE tenant_id = p_tenant_id
    AND published_at IS NOT NULL
    AND deleted_at IS NULL
    AND published_at >= (now() - interval '30 days');

  -- Calculate overall acknowledgment rate
  SELECT 
    CASE 
      WHEN COUNT(*) > 0 
      THEN ROUND((COUNT(*) FILTER (WHERE a.id IS NOT NULL)::NUMERIC / COUNT(*)) * 100, 2)
      ELSE 0 
    END,
    ROUND(AVG(EXTRACT(EPOCH FROM (a.acknowledged_at - n.published_at)) / 3600)::NUMERIC, 2)
  INTO v_overall_ack_rate, v_avg_response_time
  FROM hsse_notifications n
  CROSS JOIN profiles p
  LEFT JOIN hsse_notification_acknowledgments a ON a.notification_id = n.id AND a.user_id = p.id
  WHERE n.tenant_id = p_tenant_id
    AND n.notification_type = 'mandatory'
    AND n.published_at IS NOT NULL
    AND n.deleted_at IS NULL
    AND p.tenant_id = p_tenant_id
    AND p.is_active = true;

  -- Count overdue acknowledgments
  SELECT COUNT(DISTINCT n.id)
  INTO v_overdue_count
  FROM hsse_notifications n
  CROSS JOIN profiles p
  LEFT JOIN hsse_notification_acknowledgments a ON a.notification_id = n.id AND a.user_id = p.id
  WHERE n.tenant_id = p_tenant_id
    AND n.notification_type = 'mandatory'
    AND n.published_at IS NOT NULL
    AND n.published_at < (now() - interval '24 hours')
    AND n.is_active = true
    AND n.deleted_at IS NULL
    AND p.tenant_id = p_tenant_id
    AND a.id IS NULL;

  -- Count pending by priority
  SELECT 
    COUNT(*) FILTER (WHERE n.priority = 'critical'),
    COUNT(*) FILTER (WHERE n.priority = 'high')
  INTO v_critical_pending, v_high_pending
  FROM hsse_notifications n
  WHERE n.tenant_id = p_tenant_id
    AND n.notification_type = 'mandatory'
    AND n.published_at IS NOT NULL
    AND n.is_active = true
    AND n.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM hsse_notification_acknowledgments a 
      WHERE a.notification_id = n.id
    );

  -- Get weekly trend
  SELECT json_agg(week_data ORDER BY week_start)
  INTO v_weekly_trend
  FROM (
    SELECT 
      date_trunc('week', n.published_at) as week_start,
      COUNT(*) as total_sent,
      ROUND(
        (COUNT(*) FILTER (WHERE a.id IS NOT NULL)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 
        2
      ) as ack_rate
    FROM hsse_notifications n
    CROSS JOIN profiles p
    LEFT JOIN hsse_notification_acknowledgments a ON a.notification_id = n.id AND a.user_id = p.id
    WHERE n.tenant_id = p_tenant_id
      AND n.notification_type = 'mandatory'
      AND n.published_at IS NOT NULL
      AND n.published_at >= (now() - interval '4 weeks')
      AND n.deleted_at IS NULL
      AND p.tenant_id = p_tenant_id
    GROUP BY date_trunc('week', n.published_at)
  ) week_data;

  RETURN QUERY SELECT 
    v_total_mandatory,
    v_total_informational,
    COALESCE(v_overall_ack_rate, 0),
    COALESCE(v_avg_response_time, 0),
    COALESCE(v_overdue_count, 0),
    COALESCE(v_critical_pending, 0),
    COALESCE(v_high_pending, 0),
    COALESCE(v_weekly_trend, '[]'::JSON);
END;
$$;

-- Function to get response time distribution by priority
CREATE OR REPLACE FUNCTION public.get_hsse_response_time_distribution(
  p_tenant_id UUID
)
RETURNS TABLE (
  priority TEXT,
  avg_hours NUMERIC,
  min_hours NUMERIC,
  max_hours NUMERIC,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.priority,
    ROUND(AVG(EXTRACT(EPOCH FROM (a.acknowledged_at - n.published_at)) / 3600)::NUMERIC, 2) as avg_hours,
    ROUND(MIN(EXTRACT(EPOCH FROM (a.acknowledged_at - n.published_at)) / 3600)::NUMERIC, 2) as min_hours,
    ROUND(MAX(EXTRACT(EPOCH FROM (a.acknowledged_at - n.published_at)) / 3600)::NUMERIC, 2) as max_hours,
    COUNT(*) as count
  FROM hsse_notifications n
  JOIN hsse_notification_acknowledgments a ON a.notification_id = n.id
  WHERE n.tenant_id = p_tenant_id
    AND n.notification_type = 'mandatory'
    AND n.deleted_at IS NULL
    AND n.published_at >= (now() - interval '30 days')
  GROUP BY n.priority
  ORDER BY 
    CASE n.priority 
      WHEN 'critical' THEN 1 
      WHEN 'high' THEN 2 
      WHEN 'medium' THEN 3 
      WHEN 'low' THEN 4 
    END;
END;
$$;

-- Function to get category distribution
CREATE OR REPLACE FUNCTION public.get_hsse_category_distribution(
  p_tenant_id UUID
)
RETURNS TABLE (
  category TEXT,
  count BIGINT,
  percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM hsse_notifications
  WHERE tenant_id = p_tenant_id
    AND published_at IS NOT NULL
    AND deleted_at IS NULL
    AND published_at >= (now() - interval '30 days');

  RETURN QUERY
  SELECT 
    n.category,
    COUNT(*) as count,
    ROUND((COUNT(*)::NUMERIC / NULLIF(v_total, 0)) * 100, 2) as percentage
  FROM hsse_notifications n
  WHERE n.tenant_id = p_tenant_id
    AND n.published_at IS NOT NULL
    AND n.deleted_at IS NULL
    AND n.published_at >= (now() - interval '30 days')
  GROUP BY n.category
  ORDER BY count DESC;
END;
$$;

-- Function to calculate next scheduled time
CREATE OR REPLACE FUNCTION public.calculate_next_schedule_time(
  p_schedule_type TEXT,
  p_schedule_time TIME,
  p_schedule_days_of_week INTEGER[],
  p_schedule_day_of_month INTEGER,
  p_schedule_timezone TEXT,
  p_last_sent_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
DECLARE
  v_now TIMESTAMPTZ;
  v_next TIMESTAMPTZ;
  v_today DATE;
  v_day_of_week INTEGER;
  v_i INTEGER;
BEGIN
  v_now := COALESCE(p_last_sent_at, now());
  v_today := (v_now AT TIME ZONE COALESCE(p_schedule_timezone, 'Asia/Riyadh'))::DATE;
  v_day_of_week := EXTRACT(DOW FROM v_today)::INTEGER;

  CASE p_schedule_type
    WHEN 'daily' THEN
      v_next := (v_today + interval '1 day') + p_schedule_time;
      
    WHEN 'weekly' THEN
      FOR v_i IN 1..7 LOOP
        IF ((v_day_of_week + v_i) % 7) = ANY(p_schedule_days_of_week) THEN
          v_next := (v_today + (v_i || ' days')::INTERVAL) + p_schedule_time;
          EXIT;
        END IF;
      END LOOP;
      
    WHEN 'monthly' THEN
      v_next := (date_trunc('month', v_today) + interval '1 month' + ((COALESCE(p_schedule_day_of_month, 1) - 1) || ' days')::INTERVAL) + p_schedule_time;
      
    WHEN 'once' THEN
      v_next := NULL;
      
    ELSE
      v_next := NULL;
  END CASE;

  IF v_next IS NOT NULL THEN
    v_next := v_next AT TIME ZONE COALESCE(p_schedule_timezone, 'Asia/Riyadh');
  END IF;

  RETURN v_next;
END;
$$;

-- Trigger to calculate next_scheduled_at on insert/update
CREATE OR REPLACE FUNCTION public.calculate_scheduled_notification_next()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_active AND NEW.deleted_at IS NULL THEN
    NEW.next_scheduled_at := public.calculate_next_schedule_time(
      NEW.schedule_type,
      NEW.schedule_time,
      NEW.schedule_days_of_week,
      NEW.schedule_day_of_month,
      NEW.schedule_timezone,
      NEW.last_sent_at
    );
  ELSE
    NEW.next_scheduled_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_scheduled_notification_next_trigger
BEFORE INSERT OR UPDATE ON public.hsse_scheduled_notifications
FOR EACH ROW
EXECUTE FUNCTION public.calculate_scheduled_notification_next();