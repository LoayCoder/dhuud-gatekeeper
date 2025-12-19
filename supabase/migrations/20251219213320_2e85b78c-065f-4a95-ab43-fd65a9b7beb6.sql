-- Create HSSE notification category enum
CREATE TYPE hsse_notification_category AS ENUM (
  'weather_risk',
  'regulation',
  'safety_alert',
  'policy_update',
  'training',
  'general'
);

-- Create HSSE notification priority enum
CREATE TYPE hsse_notification_priority AS ENUM (
  'critical',
  'high',
  'medium',
  'low'
);

-- Create HSSE notification type enum
CREATE TYPE hsse_notification_type AS ENUM (
  'mandatory',
  'informational'
);

-- Create HSSE notification target audience enum
CREATE TYPE hsse_notification_target AS ENUM (
  'all_users',
  'specific_roles',
  'specific_branches',
  'specific_sites'
);

-- Create hsse_notifications table
CREATE TABLE public.hsse_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title_en TEXT NOT NULL,
  title_ar TEXT,
  body_en TEXT NOT NULL,
  body_ar TEXT,
  category hsse_notification_category NOT NULL DEFAULT 'general',
  priority hsse_notification_priority NOT NULL DEFAULT 'medium',
  notification_type hsse_notification_type NOT NULL DEFAULT 'informational',
  target_audience hsse_notification_target NOT NULL DEFAULT 'all_users',
  target_role_ids UUID[] DEFAULT ARRAY[]::UUID[],
  target_branch_ids UUID[] DEFAULT ARRAY[]::UUID[],
  target_site_ids UUID[] DEFAULT ARRAY[]::UUID[],
  created_by UUID REFERENCES public.profiles(id),
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  send_push_notification BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Create hsse_notification_acknowledgments table for audit trail
CREATE TABLE public.hsse_notification_acknowledgments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES public.hsse_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  device_info JSONB,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- Create hsse_notification_reads table (for informational notifications)
CREATE TABLE public.hsse_notification_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES public.hsse_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_hsse_notifications_tenant_id ON public.hsse_notifications(tenant_id);
CREATE INDEX idx_hsse_notifications_published_at ON public.hsse_notifications(published_at);
CREATE INDEX idx_hsse_notifications_category ON public.hsse_notifications(category);
CREATE INDEX idx_hsse_notifications_type ON public.hsse_notifications(notification_type);
CREATE INDEX idx_hsse_notifications_active ON public.hsse_notifications(is_active, deleted_at);
CREATE INDEX idx_hsse_notification_acks_notification ON public.hsse_notification_acknowledgments(notification_id);
CREATE INDEX idx_hsse_notification_acks_user ON public.hsse_notification_acknowledgments(user_id);
CREATE INDEX idx_hsse_notification_reads_notification ON public.hsse_notification_reads(notification_id);
CREATE INDEX idx_hsse_notification_reads_user ON public.hsse_notification_reads(user_id);

-- Enable RLS
ALTER TABLE public.hsse_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hsse_notification_acknowledgments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hsse_notification_reads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for hsse_notifications

-- Admins and HSSE managers can manage notifications
CREATE POLICY "Admins and HSSE managers can manage notifications"
ON public.hsse_notifications
FOR ALL
USING (
  tenant_id = get_auth_tenant_id()
  AND (
    is_admin(auth.uid())
    OR has_role_by_code(auth.uid(), 'hsse_manager')
    OR has_role_by_code(auth.uid(), 'hsse_officer')
  )
);

-- All authenticated users can view active published notifications for their tenant
CREATE POLICY "Users can view active notifications"
ON public.hsse_notifications
FOR SELECT
USING (
  tenant_id = get_auth_tenant_id()
  AND is_active = true
  AND deleted_at IS NULL
  AND published_at IS NOT NULL
  AND published_at <= now()
  AND (expires_at IS NULL OR expires_at > now())
);

-- RLS Policies for hsse_notification_acknowledgments

-- Users can insert their own acknowledgments
CREATE POLICY "Users can acknowledge notifications"
ON public.hsse_notification_acknowledgments
FOR INSERT
WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND user_id = auth.uid()
);

-- Users can view their own acknowledgments
CREATE POLICY "Users can view own acknowledgments"
ON public.hsse_notification_acknowledgments
FOR SELECT
USING (
  tenant_id = get_auth_tenant_id()
  AND user_id = auth.uid()
);

-- Admins can view all acknowledgments for their tenant
CREATE POLICY "Admins can view all acknowledgments"
ON public.hsse_notification_acknowledgments
FOR SELECT
USING (
  tenant_id = get_auth_tenant_id()
  AND (
    is_admin(auth.uid())
    OR has_role_by_code(auth.uid(), 'hsse_manager')
  )
);

-- RLS Policies for hsse_notification_reads

-- Users can insert their own read status
CREATE POLICY "Users can mark notifications as read"
ON public.hsse_notification_reads
FOR INSERT
WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND user_id = auth.uid()
);

-- Users can view their own read status
CREATE POLICY "Users can view own read status"
ON public.hsse_notification_reads
FOR SELECT
USING (
  tenant_id = get_auth_tenant_id()
  AND user_id = auth.uid()
);

-- Admins can view all read status for their tenant
CREATE POLICY "Admins can view all read status"
ON public.hsse_notification_reads
FOR SELECT
USING (
  tenant_id = get_auth_tenant_id()
  AND (
    is_admin(auth.uid())
    OR has_role_by_code(auth.uid(), 'hsse_manager')
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_hsse_notifications_updated_at
BEFORE UPDATE ON public.hsse_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get user's pending mandatory notifications
CREATE OR REPLACE FUNCTION public.get_pending_mandatory_notifications()
RETURNS TABLE (
  id UUID,
  title_en TEXT,
  title_ar TEXT,
  body_en TEXT,
  body_ar TEXT,
  category hsse_notification_category,
  priority hsse_notification_priority,
  published_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tenant_id UUID;
  v_user_branch_id UUID;
  v_user_site_id UUID;
  v_user_role_ids UUID[];
BEGIN
  -- Get user's tenant and assignment info
  SELECT p.tenant_id, p.assigned_branch_id, p.assigned_site_id
  INTO v_tenant_id, v_user_branch_id, v_user_site_id
  FROM profiles p WHERE p.id = v_user_id;
  
  -- Get user's role IDs
  SELECT ARRAY_AGG(ura.role_id)
  INTO v_user_role_ids
  FROM user_role_assignments ura
  WHERE ura.user_id = v_user_id;
  
  RETURN QUERY
  SELECT 
    n.id,
    n.title_en,
    n.title_ar,
    n.body_en,
    n.body_ar,
    n.category,
    n.priority,
    n.published_at
  FROM hsse_notifications n
  WHERE n.tenant_id = v_tenant_id
    AND n.is_active = true
    AND n.deleted_at IS NULL
    AND n.notification_type = 'mandatory'
    AND n.published_at IS NOT NULL
    AND n.published_at <= now()
    AND (n.expires_at IS NULL OR n.expires_at > now())
    -- User hasn't acknowledged yet
    AND NOT EXISTS (
      SELECT 1 FROM hsse_notification_acknowledgments a
      WHERE a.notification_id = n.id AND a.user_id = v_user_id
    )
    -- Check target audience
    AND (
      n.target_audience = 'all_users'
      OR (n.target_audience = 'specific_roles' AND v_user_role_ids && n.target_role_ids)
      OR (n.target_audience = 'specific_branches' AND v_user_branch_id = ANY(n.target_branch_ids))
      OR (n.target_audience = 'specific_sites' AND v_user_site_id = ANY(n.target_site_ids))
    )
  ORDER BY n.priority DESC, n.published_at DESC;
END;
$$;

-- Create function to get notification acknowledgment stats
CREATE OR REPLACE FUNCTION public.get_notification_acknowledgment_stats(p_notification_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tenant_id UUID;
  v_total_target INTEGER := 0;
  v_acknowledged INTEGER := 0;
  v_notification RECORD;
BEGIN
  -- Get notification details
  SELECT * INTO v_notification
  FROM hsse_notifications
  WHERE id = p_notification_id;
  
  IF v_notification IS NULL THEN
    RETURN jsonb_build_object('error', 'Notification not found');
  END IF;
  
  v_tenant_id := v_notification.tenant_id;
  
  -- Count acknowledged
  SELECT COUNT(*) INTO v_acknowledged
  FROM hsse_notification_acknowledgments
  WHERE notification_id = p_notification_id;
  
  -- Count total target users based on audience
  IF v_notification.target_audience = 'all_users' THEN
    SELECT COUNT(*) INTO v_total_target
    FROM profiles WHERE tenant_id = v_tenant_id AND is_active = true;
  ELSIF v_notification.target_audience = 'specific_roles' THEN
    SELECT COUNT(DISTINCT ura.user_id) INTO v_total_target
    FROM user_role_assignments ura
    JOIN profiles p ON p.id = ura.user_id
    WHERE p.tenant_id = v_tenant_id 
      AND p.is_active = true
      AND ura.role_id = ANY(v_notification.target_role_ids);
  ELSIF v_notification.target_audience = 'specific_branches' THEN
    SELECT COUNT(*) INTO v_total_target
    FROM profiles 
    WHERE tenant_id = v_tenant_id 
      AND is_active = true
      AND assigned_branch_id = ANY(v_notification.target_branch_ids);
  ELSIF v_notification.target_audience = 'specific_sites' THEN
    SELECT COUNT(*) INTO v_total_target
    FROM profiles 
    WHERE tenant_id = v_tenant_id 
      AND is_active = true
      AND assigned_site_id = ANY(v_notification.target_site_ids);
  END IF;
  
  RETURN jsonb_build_object(
    'total_target', v_total_target,
    'acknowledged', v_acknowledged,
    'pending', GREATEST(0, v_total_target - v_acknowledged),
    'percentage', CASE WHEN v_total_target > 0 THEN ROUND((v_acknowledged::NUMERIC / v_total_target) * 100, 1) ELSE 0 END
  );
END;
$$;