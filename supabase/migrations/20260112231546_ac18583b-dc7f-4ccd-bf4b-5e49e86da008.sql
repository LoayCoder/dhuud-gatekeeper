-- =============================================
-- ACHIEVEMENTS AND BADGES SYSTEM
-- =============================================

-- 1. Badge Definitions Table
CREATE TABLE public.badge_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT NOT NULL,
  description_ar TEXT,
  icon_name TEXT NOT NULL DEFAULT 'Award',
  color_scheme TEXT NOT NULL DEFAULT 'primary',
  category TEXT NOT NULL DEFAULT 'reporting',
  tier TEXT NOT NULL DEFAULT 'bronze',
  points INTEGER NOT NULL DEFAULT 10,
  unlock_criteria JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, badge_key)
);

-- 2. User Badges Table
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badge_definitions(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- RLS for badge_definitions: Everyone in tenant can read
CREATE POLICY "Users can view badge definitions in their tenant"
  ON public.badge_definitions FOR SELECT
  USING (tenant_id = public.get_auth_tenant_id());

-- Admins can manage badge definitions
CREATE POLICY "Admins can manage badge definitions"
  ON public.badge_definitions FOR ALL
  USING (public.is_admin(auth.uid()) AND tenant_id = public.get_auth_tenant_id());

-- RLS for user_badges: Users see their own, admins see all in tenant
CREATE POLICY "Users can view their own badges"
  ON public.user_badges FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "System can insert badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (tenant_id = public.get_auth_tenant_id());

-- Enable realtime for new badge notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_badges;

-- 3. Function to get user stats for badge calculations
CREATE OR REPLACE FUNCTION public.get_user_badge_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_stats JSONB;
  v_total_incidents INTEGER;
  v_total_observations INTEGER;
  v_completed_actions INTEGER;
  v_this_month_reports INTEGER;
  v_streak_weeks INTEGER;
BEGIN
  -- Get tenant
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = p_user_id;
  
  -- Count incidents
  SELECT COUNT(*) INTO v_total_incidents 
  FROM incidents 
  WHERE reporter_id = p_user_id AND deleted_at IS NULL;
  
  -- Count observations (with fallback if table doesn't exist)
  BEGIN
    SELECT COUNT(*) INTO v_total_observations 
    FROM observations 
    WHERE reporter_id = p_user_id AND deleted_at IS NULL;
  EXCEPTION WHEN undefined_table THEN
    v_total_observations := 0;
  END;
  
  -- Count completed actions
  SELECT COUNT(*) INTO v_completed_actions 
  FROM corrective_actions 
  WHERE assigned_to = p_user_id AND status = 'completed' AND deleted_at IS NULL;
  
  -- This month's reports
  v_this_month_reports := 0;
  SELECT COUNT(*) INTO v_this_month_reports
  FROM incidents 
  WHERE reporter_id = p_user_id 
    AND deleted_at IS NULL 
    AND created_at >= date_trunc('month', now());
  
  BEGIN
    SELECT v_this_month_reports + COUNT(*) INTO v_this_month_reports
    FROM observations 
    WHERE reporter_id = p_user_id 
      AND deleted_at IS NULL 
      AND created_at >= date_trunc('month', now());
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  
  -- Simple streak calculation (weeks with at least 1 report)
  v_streak_weeks := 0;
  
  RETURN jsonb_build_object(
    'total_incidents', COALESCE(v_total_incidents, 0),
    'total_observations', COALESCE(v_total_observations, 0),
    'total_reports', COALESCE(v_total_incidents, 0) + COALESCE(v_total_observations, 0),
    'completed_actions', COALESCE(v_completed_actions, 0),
    'this_month_reports', COALESCE(v_this_month_reports, 0),
    'streak_weeks', v_streak_weeks
  );
END;
$$;

-- 4. Function to check and award badges
CREATE OR REPLACE FUNCTION public.check_and_award_badges()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tenant_id UUID;
  v_stats JSONB;
  v_badge RECORD;
  v_awarded INTEGER := 0;
  v_new_badges JSONB := '[]'::JSONB;
  v_criteria_type TEXT;
  v_criteria_metric TEXT;
  v_criteria_threshold INTEGER;
  v_current_value INTEGER;
  v_should_award BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Get tenant
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = v_user_id;
  
  -- Get user stats
  v_stats := get_user_badge_stats(v_user_id);
  
  -- Check each badge definition not yet earned
  FOR v_badge IN 
    SELECT bd.* FROM badge_definitions bd
    WHERE bd.tenant_id = v_tenant_id 
      AND bd.is_active = true 
      AND bd.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_badges ub 
        WHERE ub.badge_id = bd.id AND ub.user_id = v_user_id
      )
    ORDER BY bd.sort_order
  LOOP
    v_should_award := false;
    v_criteria_type := v_badge.unlock_criteria->>'type';
    v_criteria_metric := v_badge.unlock_criteria->>'metric';
    v_criteria_threshold := (v_badge.unlock_criteria->>'threshold')::INTEGER;
    
    IF v_criteria_type = 'count' THEN
      CASE v_criteria_metric
        WHEN 'total_reports' THEN v_current_value := (v_stats->>'total_reports')::INTEGER;
        WHEN 'incidents' THEN v_current_value := (v_stats->>'total_incidents')::INTEGER;
        WHEN 'observations' THEN v_current_value := (v_stats->>'total_observations')::INTEGER;
        WHEN 'completed_actions' THEN v_current_value := (v_stats->>'completed_actions')::INTEGER;
        WHEN 'streak_weeks' THEN v_current_value := (v_stats->>'streak_weeks')::INTEGER;
        ELSE v_current_value := 0;
      END CASE;
      
      IF v_current_value >= v_criteria_threshold THEN
        v_should_award := true;
      END IF;
    END IF;
    
    IF v_should_award THEN
      INSERT INTO user_badges (tenant_id, user_id, badge_id, earned_at, notified)
      VALUES (v_tenant_id, v_user_id, v_badge.id, now(), false);
      
      v_awarded := v_awarded + 1;
      v_new_badges := v_new_badges || jsonb_build_object(
        'id', v_badge.id,
        'badge_key', v_badge.badge_key,
        'name', v_badge.name,
        'name_ar', v_badge.name_ar,
        'icon_name', v_badge.icon_name,
        'color_scheme', v_badge.color_scheme,
        'tier', v_badge.tier,
        'points', v_badge.points
      );
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object('awarded', v_awarded, 'new_badges', v_new_badges);
END;
$$;

-- 5. Function to get user badges with progress
CREATE OR REPLACE FUNCTION public.get_my_badges_and_progress()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tenant_id UUID;
  v_stats JSONB;
  v_earned_badges JSONB := '[]'::JSONB;
  v_available_badges JSONB := '[]'::JSONB;
  v_total_points INTEGER := 0;
  v_next_badge JSONB := NULL;
  v_badge RECORD;
  v_progress INTEGER;
  v_criteria_metric TEXT;
  v_criteria_threshold INTEGER;
  v_current_value INTEGER;
  v_min_remaining INTEGER := 999999;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = v_user_id;
  v_stats := get_user_badge_stats(v_user_id);
  
  -- Get earned badges
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', bd.id,
      'badge_key', bd.badge_key,
      'name', bd.name,
      'name_ar', bd.name_ar,
      'description', bd.description,
      'description_ar', bd.description_ar,
      'icon_name', bd.icon_name,
      'color_scheme', bd.color_scheme,
      'category', bd.category,
      'tier', bd.tier,
      'points', bd.points,
      'earned_at', ub.earned_at,
      'is_new', NOT ub.notified
    ) ORDER BY ub.earned_at DESC
  ), '[]'::JSONB)
  INTO v_earned_badges
  FROM user_badges ub
  JOIN badge_definitions bd ON bd.id = ub.badge_id
  WHERE ub.user_id = v_user_id AND bd.deleted_at IS NULL;
  
  -- Calculate total points
  SELECT COALESCE(SUM(bd.points), 0)
  INTO v_total_points
  FROM user_badges ub
  JOIN badge_definitions bd ON bd.id = ub.badge_id
  WHERE ub.user_id = v_user_id AND bd.deleted_at IS NULL;
  
  -- Get available badges with progress
  FOR v_badge IN 
    SELECT bd.* FROM badge_definitions bd
    WHERE bd.tenant_id = v_tenant_id 
      AND bd.is_active = true 
      AND bd.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_badges ub 
        WHERE ub.badge_id = bd.id AND ub.user_id = v_user_id
      )
    ORDER BY bd.sort_order
  LOOP
    v_criteria_metric := v_badge.unlock_criteria->>'metric';
    v_criteria_threshold := COALESCE((v_badge.unlock_criteria->>'threshold')::INTEGER, 1);
    
    CASE v_criteria_metric
      WHEN 'total_reports' THEN v_current_value := (v_stats->>'total_reports')::INTEGER;
      WHEN 'incidents' THEN v_current_value := (v_stats->>'total_incidents')::INTEGER;
      WHEN 'observations' THEN v_current_value := (v_stats->>'total_observations')::INTEGER;
      WHEN 'completed_actions' THEN v_current_value := (v_stats->>'completed_actions')::INTEGER;
      WHEN 'streak_weeks' THEN v_current_value := (v_stats->>'streak_weeks')::INTEGER;
      ELSE v_current_value := 0;
    END CASE;
    
    v_progress := LEAST(100, (v_current_value * 100) / GREATEST(v_criteria_threshold, 1));
    
    v_available_badges := v_available_badges || jsonb_build_object(
      'id', v_badge.id,
      'badge_key', v_badge.badge_key,
      'name', v_badge.name,
      'name_ar', v_badge.name_ar,
      'description', v_badge.description,
      'description_ar', v_badge.description_ar,
      'icon_name', v_badge.icon_name,
      'color_scheme', v_badge.color_scheme,
      'category', v_badge.category,
      'tier', v_badge.tier,
      'points', v_badge.points,
      'progress', v_progress,
      'current', v_current_value,
      'threshold', v_criteria_threshold
    );
    
    -- Track next badge (closest to completion)
    IF v_criteria_threshold - v_current_value < v_min_remaining AND v_criteria_threshold - v_current_value > 0 THEN
      v_min_remaining := v_criteria_threshold - v_current_value;
      v_next_badge := jsonb_build_object(
        'id', v_badge.id,
        'badge_key', v_badge.badge_key,
        'name', v_badge.name,
        'name_ar', v_badge.name_ar,
        'icon_name', v_badge.icon_name,
        'color_scheme', v_badge.color_scheme,
        'tier', v_badge.tier,
        'progress', v_progress,
        'remaining', v_criteria_threshold - v_current_value
      );
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'earned_badges', v_earned_badges,
    'available_badges', v_available_badges,
    'total_points', v_total_points,
    'next_badge', v_next_badge,
    'stats', v_stats
  );
END;
$$;

-- 6. Function to mark badges as notified
CREATE OR REPLACE FUNCTION public.mark_badges_notified(p_badge_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_badges
  SET notified = true
  WHERE user_id = auth.uid()
    AND badge_id = ANY(p_badge_ids);
END;
$$;

-- 7. Seed default badge definitions (will be inserted per-tenant via trigger or manual)
-- Create a function to seed badges for a tenant
CREATE OR REPLACE FUNCTION public.seed_tenant_badges(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO badge_definitions (tenant_id, badge_key, name, name_ar, description, description_ar, icon_name, color_scheme, category, tier, points, unlock_criteria, sort_order)
  VALUES
    -- Reporting Milestones
    (p_tenant_id, 'first_report', 'First Step', 'الخطوة الأولى', 'Submit your first safety report', 'قدّم أول بلاغ سلامة', 'Footprints', 'primary', 'milestone', 'bronze', 10, '{"type": "count", "metric": "total_reports", "threshold": 1}', 1),
    (p_tenant_id, 'reporter_5', 'Safety Spotter', 'راصد السلامة', 'Submit 5 safety reports', 'قدّم 5 بلاغات سلامة', 'Eye', 'primary', 'reporting', 'bronze', 25, '{"type": "count", "metric": "total_reports", "threshold": 5}', 2),
    (p_tenant_id, 'reporter_25', 'Vigilant Observer', 'المراقب اليقظ', 'Submit 25 safety reports', 'قدّم 25 بلاغ سلامة', 'Search', 'info', 'reporting', 'silver', 100, '{"type": "count", "metric": "total_reports", "threshold": 25}', 3),
    (p_tenant_id, 'reporter_50', 'Safety Guardian', 'حارس السلامة', 'Submit 50 safety reports', 'قدّم 50 بلاغ سلامة', 'Shield', 'success', 'reporting', 'gold', 250, '{"type": "count", "metric": "total_reports", "threshold": 50}', 4),
    (p_tenant_id, 'reporter_100', 'Safety Champion', 'بطل السلامة', 'Submit 100 safety reports', 'قدّم 100 بلاغ سلامة', 'Trophy', 'warning', 'reporting', 'platinum', 500, '{"type": "count", "metric": "total_reports", "threshold": 100}', 5),
    
    -- Incident Reporting
    (p_tenant_id, 'incident_5', 'Incident Reporter', 'مُبلغ الحوادث', 'Report 5 incidents', 'بلّغ عن 5 حوادث', 'AlertTriangle', 'destructive', 'reporting', 'bronze', 30, '{"type": "count", "metric": "incidents", "threshold": 5}', 10),
    (p_tenant_id, 'incident_25', 'Incident Sentinel', 'حارس الحوادث', 'Report 25 incidents', 'بلّغ عن 25 حادثة', 'ShieldAlert', 'destructive', 'reporting', 'silver', 150, '{"type": "count", "metric": "incidents", "threshold": 25}', 11),
    
    -- Observations
    (p_tenant_id, 'observation_10', 'Keen Observer', 'المراقب الحريص', 'Submit 10 observations', 'قدّم 10 ملاحظات', 'Binoculars', 'info', 'reporting', 'bronze', 40, '{"type": "count", "metric": "observations", "threshold": 10}', 20),
    (p_tenant_id, 'observation_50', 'Eagle Eye', 'عين النسر', 'Submit 50 observations', 'قدّم 50 ملاحظة', 'Scan', 'info', 'reporting', 'silver', 200, '{"type": "count", "metric": "observations", "threshold": 50}', 21),
    
    -- Action Completion
    (p_tenant_id, 'action_5', 'Action Taker', 'المُنفذ', 'Complete 5 corrective actions', 'أكمل 5 إجراءات تصحيحية', 'CheckCircle', 'success', 'quality', 'bronze', 35, '{"type": "count", "metric": "completed_actions", "threshold": 5}', 30),
    (p_tenant_id, 'action_25', 'Problem Solver', 'حلّال المشاكل', 'Complete 25 corrective actions', 'أكمل 25 إجراء تصحيحي', 'Wrench', 'success', 'quality', 'silver', 175, '{"type": "count", "metric": "completed_actions", "threshold": 25}', 31),
    (p_tenant_id, 'action_50', 'Resolution Master', 'سيّد الحلول', 'Complete 50 corrective actions', 'أكمل 50 إجراء تصحيحي', 'Award', 'warning', 'quality', 'gold', 350, '{"type": "count", "metric": "completed_actions", "threshold": 50}', 32),
    
    -- Safety Hero (Ultimate)
    (p_tenant_id, 'safety_hero', 'Safety Hero', 'بطل السلامة', 'Achieve 250 total safety contributions', 'حقق 250 مساهمة في السلامة', 'Medal', 'warning', 'milestone', 'platinum', 1000, '{"type": "count", "metric": "total_reports", "threshold": 250}', 100)
  ON CONFLICT (tenant_id, badge_key) DO NOTHING;
END;
$$;