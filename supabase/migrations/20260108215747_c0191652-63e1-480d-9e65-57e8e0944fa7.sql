-- Phase 1: AI Settings Foundation (Complete Migration)

-- 1.1 Create ai_settings table for dynamic AI configuration
CREATE TABLE public.ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  setting_type TEXT NOT NULL CHECK (setting_type IN ('observation', 'incident', 'global')),
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, setting_type)
);

-- 1.2 Create ai_tags table for managed tag definitions
CREATE TABLE public.ai_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  tag_type TEXT NOT NULL CHECK (tag_type IN ('observation', 'incident')),
  name TEXT NOT NULL,
  name_ar TEXT,
  color TEXT DEFAULT '#6366f1',
  keywords TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, tag_type, name)
);

-- 1.3 Add tags column to incidents table
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Enable RLS on ai_settings
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_settings (using user_roles table for role check)
CREATE POLICY "Users can view their tenant ai_settings"
ON public.ai_settings FOR SELECT
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Admins can insert ai_settings"
ON public.ai_settings FOR INSERT
WITH CHECK (tenant_id IN (
  SELECT p.tenant_id FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.id = auth.uid() AND ur.role = 'admin'
));

CREATE POLICY "Admins can update ai_settings"
ON public.ai_settings FOR UPDATE
USING (tenant_id IN (
  SELECT p.tenant_id FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.id = auth.uid() AND ur.role = 'admin'
));

-- Enable RLS on ai_tags
ALTER TABLE public.ai_tags ENABLE ROW LEVEL SECURITY;

-- RLS policies for ai_tags
CREATE POLICY "Users can view their tenant ai_tags"
ON public.ai_tags FOR SELECT
USING (tenant_id IN (
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
) AND deleted_at IS NULL);

CREATE POLICY "Admins can insert ai_tags"
ON public.ai_tags FOR INSERT
WITH CHECK (tenant_id IN (
  SELECT p.tenant_id FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.id = auth.uid() AND ur.role = 'admin'
));

CREATE POLICY "Admins can update ai_tags"
ON public.ai_tags FOR UPDATE
USING (tenant_id IN (
  SELECT p.tenant_id FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.id = auth.uid() AND ur.role = 'admin'
));

CREATE POLICY "Admins can delete ai_tags"
ON public.ai_tags FOR DELETE
USING (tenant_id IN (
  SELECT p.tenant_id FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.id
  WHERE p.id = auth.uid() AND ur.role = 'admin'
));

-- Create indexes for performance
CREATE INDEX idx_ai_settings_tenant ON public.ai_settings(tenant_id, setting_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_tags_tenant_type ON public.ai_tags(tenant_id, tag_type) WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX idx_incidents_tags ON public.incidents USING GIN(tags) WHERE deleted_at IS NULL;

-- Triggers for updated_at
CREATE TRIGGER update_ai_settings_updated_at
BEFORE UPDATE ON public.ai_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_tags_updated_at
BEFORE UPDATE ON public.ai_tags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();