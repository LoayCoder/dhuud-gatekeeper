-- =============================================================================
-- SAFETY CHALLENGES SYSTEM & ANONYMOUS LEADERBOARD
-- =============================================================================

-- 1. Create safety_challenges table
CREATE TABLE public.safety_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_ar TEXT,
  description TEXT,
  description_ar TEXT,
  challenge_type TEXT NOT NULL DEFAULT 'weekly' CHECK (challenge_type IN ('weekly', 'monthly', 'custom')),
  metric_type TEXT NOT NULL CHECK (metric_type IN ('incidents', 'observations', 'total_reports', 'actions')),
  target_count INTEGER NOT NULL CHECK (target_count > 0),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  badge_id UUID REFERENCES public.badge_definitions(id) ON DELETE SET NULL,
  points_reward INTEGER DEFAULT 50 CHECK (points_reward >= 0),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT valid_date_range CHECK (end_date > start_date)
);

-- 2. Create challenge_participants table
CREATE TABLE public.challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.safety_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  current_progress INTEGER DEFAULT 0 CHECK (current_progress >= 0),
  completed_at TIMESTAMPTZ,
  badge_awarded BOOLEAN DEFAULT false,
  points_awarded BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- 3. Enable RLS
ALTER TABLE public.safety_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies for safety_challenges
CREATE POLICY "Users can view active challenges in their tenant" 
ON public.safety_challenges FOR SELECT 
USING (
  tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND deleted_at IS NULL
);

CREATE POLICY "Admins can manage challenges" 
ON public.safety_challenges FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.tenant_id = safety_challenges.tenant_id
    AND (
      p.is_super_admin = true 
      OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin')
    )
  )
);

-- 5. RLS Policies for challenge_participants
CREATE POLICY "Users can view their own participation" 
ON public.challenge_participants FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can join challenges in their tenant" 
ON public.challenge_participants FOR INSERT 
WITH CHECK (
  user_id = auth.uid()
  AND tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Users can update their own participation" 
ON public.challenge_participants FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all participants in tenant" 
ON public.challenge_participants FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.tenant_id = challenge_participants.tenant_id
    AND (
      p.is_super_admin = true 
      OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin')
    )
  )
);

-- 6. Enable realtime for challenge_participants
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_participants;

-- 7. Create anonymous leaderboard function
CREATE OR REPLACE FUNCTION public.get_anonymous_leaderboard(
  p_period TEXT DEFAULT 'all_time',
  p_category TEXT DEFAULT 'overall'
)
RETURNS TABLE(
  anonymous_id TEXT,
  rank_position INTEGER,
  total_reports INTEGER,
  incidents_count INTEGER,
  observations_count INTEGER,
  completed_actions INTEGER,
  total_points INTEGER,
  badge_count INTEGER,
  is_current_user BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tenant_id UUID;
  v_start_date TIMESTAMPTZ;
BEGIN
  -- Get user's tenant
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = v_user_id;
  
  -- Calculate date filter
  v_start_date := CASE p_period
    WHEN 'week' THEN date_trunc('week', now())
    WHEN 'month' THEN date_trunc('month', now())
    WHEN 'year' THEN date_trunc('year', now())
    ELSE '1970-01-01'::TIMESTAMPTZ
  END;
  
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      p.id as user_id,
      COALESCE(inc.cnt, 0)::INTEGER as incidents_count,
      COALESCE(obs.cnt, 0)::INTEGER as observations_count,
      COALESCE(act.cnt, 0)::INTEGER as completed_actions,
      COALESCE(bdg.cnt, 0)::INTEGER as badge_count,
      COALESCE(bdg.pts, 0)::INTEGER as badge_points
    FROM profiles p
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::INTEGER as cnt 
      FROM incidents i 
      WHERE i.reported_by = p.id 
        AND i.tenant_id = v_tenant_id
        AND i.deleted_at IS NULL
        AND i.created_at >= v_start_date
    ) inc ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::INTEGER as cnt 
      FROM observations o 
      WHERE o.reported_by = p.id 
        AND o.tenant_id = v_tenant_id
        AND o.deleted_at IS NULL
        AND o.created_at >= v_start_date
    ) obs ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::INTEGER as cnt 
      FROM corrective_actions ca 
      WHERE ca.assigned_to = p.id 
        AND ca.tenant_id = v_tenant_id
        AND ca.status = 'completed'
        AND ca.deleted_at IS NULL
        AND ca.completed_at >= v_start_date
    ) act ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::INTEGER as cnt, COALESCE(SUM(bd.points), 0)::INTEGER as pts
      FROM user_badges ub
      JOIN badge_definitions bd ON bd.id = ub.badge_id
      WHERE ub.user_id = p.id 
        AND ub.earned_at >= v_start_date
    ) bdg ON true
    WHERE p.tenant_id = v_tenant_id
      AND p.is_deleted = false
      AND p.is_super_admin = false
  ),
  ranked_users AS (
    SELECT 
      us.*,
      (us.incidents_count + us.observations_count) as total_reports,
      (us.badge_points + (us.incidents_count * 10) + (us.observations_count * 5) + (us.completed_actions * 15)) as total_points,
      ROW_NUMBER() OVER (
        ORDER BY 
          CASE p_category
            WHEN 'incidents' THEN us.incidents_count
            WHEN 'observations' THEN us.observations_count
            WHEN 'actions' THEN us.completed_actions
            WHEN 'badges' THEN us.badge_count
            ELSE (us.badge_points + (us.incidents_count * 10) + (us.observations_count * 5) + (us.completed_actions * 15))
          END DESC,
          us.user_id
      )::INTEGER as rank_position
    FROM user_stats us
    WHERE (us.incidents_count + us.observations_count + us.completed_actions + us.badge_count) > 0
  )
  SELECT 
    'Reporter #' || ru.rank_position::TEXT as anonymous_id,
    ru.rank_position,
    ru.total_reports::INTEGER,
    ru.incidents_count,
    ru.observations_count,
    ru.completed_actions,
    ru.total_points::INTEGER,
    ru.badge_count,
    (ru.user_id = v_user_id) as is_current_user
  FROM ranked_users ru
  ORDER BY ru.rank_position;
END;
$$;

-- 8. Create badge statistics function for admin
CREATE OR REPLACE FUNCTION public.get_badge_statistics()
RETURNS TABLE(
  badge_id UUID,
  badge_key TEXT,
  name TEXT,
  name_ar TEXT,
  tier TEXT,
  category TEXT,
  points INTEGER,
  total_awarded BIGINT,
  awarded_this_month BIGINT,
  unique_earners BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = auth.uid();
  
  RETURN QUERY
  SELECT 
    bd.id as badge_id,
    bd.badge_key,
    bd.name,
    bd.name_ar,
    bd.tier,
    bd.category,
    bd.points,
    COUNT(ub.id) as total_awarded,
    COUNT(ub.id) FILTER (WHERE ub.earned_at >= date_trunc('month', now())) as awarded_this_month,
    COUNT(DISTINCT ub.user_id) as unique_earners
  FROM badge_definitions bd
  LEFT JOIN user_badges ub ON ub.badge_id = bd.id
  LEFT JOIN profiles p ON p.id = ub.user_id AND p.tenant_id = v_tenant_id
  WHERE bd.is_active = true
  GROUP BY bd.id, bd.badge_key, bd.name, bd.name_ar, bd.tier, bd.category, bd.points
  ORDER BY total_awarded DESC;
END;
$$;

-- 9. Create function to get active challenges for a user
CREATE OR REPLACE FUNCTION public.get_active_challenges()
RETURNS TABLE(
  challenge_id UUID,
  title TEXT,
  title_ar TEXT,
  description TEXT,
  description_ar TEXT,
  challenge_type TEXT,
  metric_type TEXT,
  target_count INTEGER,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  points_reward INTEGER,
  badge_name TEXT,
  badge_name_ar TEXT,
  badge_icon TEXT,
  badge_tier TEXT,
  user_progress INTEGER,
  is_completed BOOLEAN,
  is_joined BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = v_user_id;
  
  RETURN QUERY
  SELECT 
    sc.id as challenge_id,
    sc.title,
    sc.title_ar,
    sc.description,
    sc.description_ar,
    sc.challenge_type,
    sc.metric_type,
    sc.target_count,
    sc.start_date,
    sc.end_date,
    sc.points_reward,
    bd.name as badge_name,
    bd.name_ar as badge_name_ar,
    bd.icon_name as badge_icon,
    bd.tier as badge_tier,
    COALESCE(cp.current_progress, 0)::INTEGER as user_progress,
    (cp.completed_at IS NOT NULL) as is_completed,
    (cp.id IS NOT NULL) as is_joined
  FROM safety_challenges sc
  LEFT JOIN badge_definitions bd ON bd.id = sc.badge_id
  LEFT JOIN challenge_participants cp ON cp.challenge_id = sc.id AND cp.user_id = v_user_id
  WHERE sc.tenant_id = v_tenant_id
    AND sc.is_active = true
    AND sc.deleted_at IS NULL
    AND now() BETWEEN sc.start_date AND sc.end_date
  ORDER BY sc.end_date ASC;
END;
$$;

-- 10. Create function to join a challenge
CREATE OR REPLACE FUNCTION public.join_challenge(p_challenge_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tenant_id UUID;
  v_challenge RECORD;
  v_existing UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM profiles WHERE id = v_user_id;
  
  -- Get challenge details
  SELECT * INTO v_challenge 
  FROM safety_challenges 
  WHERE id = p_challenge_id 
    AND tenant_id = v_tenant_id
    AND is_active = true
    AND deleted_at IS NULL
    AND now() BETWEEN start_date AND end_date;
    
  IF v_challenge IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found or not active');
  END IF;
  
  -- Check if already joined
  SELECT id INTO v_existing 
  FROM challenge_participants 
  WHERE challenge_id = p_challenge_id AND user_id = v_user_id;
  
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already joined this challenge');
  END IF;
  
  -- Join the challenge
  INSERT INTO challenge_participants (tenant_id, challenge_id, user_id, current_progress)
  VALUES (v_tenant_id, p_challenge_id, v_user_id, 0);
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 11. Create indexes for performance
CREATE INDEX idx_safety_challenges_tenant_active ON public.safety_challenges(tenant_id) 
  WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX idx_safety_challenges_dates ON public.safety_challenges(start_date, end_date);
CREATE INDEX idx_challenge_participants_user ON public.challenge_participants(user_id);
CREATE INDEX idx_challenge_participants_challenge ON public.challenge_participants(challenge_id);

-- 12. Create updated_at trigger for safety_challenges
CREATE TRIGGER update_safety_challenges_updated_at
  BEFORE UPDATE ON public.safety_challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();