-- Create notification_templates table for Hybrid WhatsApp System
CREATE TABLE public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  slug TEXT NOT NULL,
  meta_template_name TEXT,
  content_pattern TEXT NOT NULL,
  variable_keys TEXT[] NOT NULL DEFAULT '{}',
  default_gateway TEXT NOT NULL DEFAULT 'wasender' CHECK (default_gateway IN ('official', 'wasender')),
  category TEXT DEFAULT 'general',
  language TEXT DEFAULT 'en',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, slug)
);

-- Enable RLS
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant isolation
CREATE POLICY "Users can view templates in their tenant"
  ON public.notification_templates
  FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "Admins can manage templates"
  ON public.notification_templates
  FOR ALL
  USING (tenant_id = get_auth_tenant_id() AND is_admin(auth.uid()));

-- Create updated_at trigger
CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();