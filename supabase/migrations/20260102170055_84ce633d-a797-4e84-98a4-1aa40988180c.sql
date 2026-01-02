-- Create webpage_notification_settings table for admin configuration
CREATE TABLE public.webpage_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Visitor Settings
  visitor_webpage_enabled BOOLEAN NOT NULL DEFAULT true,
  visitor_message_template TEXT NOT NULL DEFAULT 'Welcome {{visitor_name}}! View your visitor badge here: {{badge_url}}',
  visitor_message_template_ar TEXT NOT NULL DEFAULT 'مرحباً {{visitor_name}}! اطلع على بطاقة الزائر الخاصة بك هنا: {{badge_url}}',
  visitor_allow_download BOOLEAN NOT NULL DEFAULT true,
  visitor_allow_share BOOLEAN NOT NULL DEFAULT true,
  
  -- Worker Settings  
  worker_webpage_enabled BOOLEAN NOT NULL DEFAULT true,
  worker_message_template TEXT NOT NULL DEFAULT 'Your access pass for {{project_name}} is ready: {{pass_url}}',
  worker_message_template_ar TEXT NOT NULL DEFAULT 'تصريح الدخول الخاص بك لمشروع {{project_name}} جاهز: {{pass_url}}',
  worker_allow_download BOOLEAN NOT NULL DEFAULT true,
  worker_allow_share BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT unique_tenant_webpage_settings UNIQUE(tenant_id)
);

-- Enable RLS
ALTER TABLE public.webpage_notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - tenant isolation using existing is_admin function
CREATE POLICY "Tenant users can view their settings"
  ON public.webpage_notification_settings
  FOR SELECT
  USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Tenant admins can manage settings"
  ON public.webpage_notification_settings
  FOR ALL
  USING (tenant_id = get_auth_tenant_id() AND is_admin(auth.uid()));

-- Add visitor_notified_at column to visit_requests
ALTER TABLE public.visit_requests 
ADD COLUMN IF NOT EXISTS visitor_notified_at TIMESTAMPTZ;

-- Create updated_at trigger for webpage_notification_settings
CREATE TRIGGER update_webpage_notification_settings_updated_at
  BEFORE UPDATE ON public.webpage_notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_webpage_notification_settings_tenant 
  ON public.webpage_notification_settings(tenant_id) 
  WHERE deleted_at IS NULL;