-- Fix search_path for existing functions that may not have it set
-- The functions created in previous migration already have SET search_path = public

-- Add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_badge_definitions_tenant ON public.badge_definitions(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_tenant ON public.user_badges(tenant_id);