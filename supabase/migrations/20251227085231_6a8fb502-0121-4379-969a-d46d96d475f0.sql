-- ============================================
-- PHASE 1: Maintenance SLA System
-- ============================================

-- Create SLA configuration table for asset maintenance
CREATE TABLE IF NOT EXISTS public.asset_maintenance_sla_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  warning_days_before INTEGER NOT NULL DEFAULT 7,
  escalation_days_after INTEGER NOT NULL DEFAULT 3,
  second_escalation_days_after INTEGER DEFAULT 7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, priority)
);

-- Enable RLS
ALTER TABLE public.asset_maintenance_sla_configs ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "asset_maintenance_sla_configs_tenant_isolation" ON public.asset_maintenance_sla_configs
FOR ALL TO authenticated
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Add SLA tracking columns to maintenance schedules
ALTER TABLE public.asset_maintenance_schedules 
ADD COLUMN IF NOT EXISTS warning_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_notification_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS criticality TEXT DEFAULT 'medium' CHECK (criticality IN ('critical', 'high', 'medium', 'low'));

-- ============================================
-- PHASE 2: Asset Notification Templates
-- ============================================

INSERT INTO public.notification_templates (
  tenant_id, slug, content_pattern, variable_keys, default_gateway, category, language, is_active, channel_type, email_subject
)
SELECT 
  t.id,
  template.slug,
  template.content_pattern,
  template.variable_keys,
  'wasender',
  'assets',
  'en',
  true,
  'both',
  template.email_subject
FROM public.tenants t
CROSS JOIN (
  VALUES 
    ('asset_maintenance_due_warning', 
     'Maintenance Reminder: {{asset_name}} ({{asset_code}}) is due for {{maintenance_type}} in {{days_until_due}} days. Location: {{location}}',
     ARRAY['asset_name', 'asset_code', 'maintenance_type', 'days_until_due', 'location'],
     'Maintenance Due Soon: {{asset_name}}'),
    ('asset_maintenance_overdue_l1',
     'OVERDUE: {{asset_name}} ({{asset_code}}) maintenance is {{days_overdue}} days overdue. Type: {{maintenance_type}}. Immediate attention required.',
     ARRAY['asset_name', 'asset_code', 'maintenance_type', 'days_overdue'],
     'Overdue Maintenance Alert: {{asset_name}}'),
    ('asset_maintenance_overdue_l2',
     'ESCALATION: {{asset_name}} ({{asset_code}}) maintenance is {{days_overdue}} days overdue. This has been escalated to management.',
     ARRAY['asset_name', 'asset_code', 'maintenance_type', 'days_overdue'],
     'ESCALATED: Overdue Maintenance - {{asset_name}}'),
    ('asset_document_expiring',
     'Document Expiry Alert: {{document_title}} for {{asset_name}} ({{asset_code}}) expires on {{expiry_date}}. Please renew.',
     ARRAY['document_title', 'asset_name', 'asset_code', 'expiry_date'],
     'Document Expiring: {{document_title}}'),
    ('asset_warranty_expiring',
     'Warranty Expiry: {{asset_name}} ({{asset_code}}) warranty expires on {{warranty_expiry_date}}. Consider renewal or replacement planning.',
     ARRAY['asset_name', 'asset_code', 'warranty_expiry_date'],
     'Warranty Expiring: {{asset_name}}')
) AS template(slug, content_pattern, variable_keys, email_subject)
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_templates nt 
  WHERE nt.tenant_id = t.id AND nt.slug = template.slug
);

-- ============================================
-- PHASE 3: Document & Warranty Expiry Tracking
-- ============================================

ALTER TABLE public.asset_documents
ADD COLUMN IF NOT EXISTS expiry_warning_sent_at TIMESTAMPTZ;

ALTER TABLE public.hsse_assets
ADD COLUMN IF NOT EXISTS warranty_warning_sent_at TIMESTAMPTZ;

-- ============================================
-- PHASE 4: Enable Realtime Subscriptions
-- ============================================

ALTER TABLE public.hsse_assets REPLICA IDENTITY FULL;
ALTER TABLE public.asset_inspections REPLICA IDENTITY FULL;
ALTER TABLE public.asset_maintenance_schedules REPLICA IDENTITY FULL;
ALTER TABLE public.asset_transfers REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.hsse_assets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.asset_inspections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.asset_maintenance_schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.asset_transfers;

-- ============================================
-- PHASE 5: Performance Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_hsse_assets_tenant_status_inspection 
ON public.hsse_assets(tenant_id, status, next_inspection_due)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_asset_maintenance_schedules_sla
ON public.asset_maintenance_schedules(tenant_id, next_due, escalation_level, is_active)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_hsse_assets_warranty_expiry
ON public.hsse_assets(tenant_id, warranty_expiry_date)
WHERE deleted_at IS NULL AND warranty_expiry_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_asset_documents_expiry_tenant
ON public.asset_documents(tenant_id, expiry_date)
WHERE deleted_at IS NULL AND expiry_date IS NOT NULL;

-- Trigger for updated_at on SLA configs
CREATE OR REPLACE FUNCTION public.update_asset_maintenance_sla_configs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_asset_maintenance_sla_configs_updated_at ON public.asset_maintenance_sla_configs;
CREATE TRIGGER update_asset_maintenance_sla_configs_updated_at
BEFORE UPDATE ON public.asset_maintenance_sla_configs
FOR EACH ROW EXECUTE FUNCTION public.update_asset_maintenance_sla_configs_updated_at();

-- Insert default SLA configs for existing tenants
INSERT INTO public.asset_maintenance_sla_configs (tenant_id, priority, warning_days_before, escalation_days_after, second_escalation_days_after)
SELECT t.id, 'critical', 3, 1, 3 FROM public.tenants t
WHERE NOT EXISTS (SELECT 1 FROM public.asset_maintenance_sla_configs WHERE tenant_id = t.id AND priority = 'critical');

INSERT INTO public.asset_maintenance_sla_configs (tenant_id, priority, warning_days_before, escalation_days_after, second_escalation_days_after)
SELECT t.id, 'high', 5, 2, 5 FROM public.tenants t
WHERE NOT EXISTS (SELECT 1 FROM public.asset_maintenance_sla_configs WHERE tenant_id = t.id AND priority = 'high');

INSERT INTO public.asset_maintenance_sla_configs (tenant_id, priority, warning_days_before, escalation_days_after, second_escalation_days_after)
SELECT t.id, 'medium', 7, 3, 7 FROM public.tenants t
WHERE NOT EXISTS (SELECT 1 FROM public.asset_maintenance_sla_configs WHERE tenant_id = t.id AND priority = 'medium');

INSERT INTO public.asset_maintenance_sla_configs (tenant_id, priority, warning_days_before, escalation_days_after, second_escalation_days_after)
SELECT t.id, 'low', 14, 5, 10 FROM public.tenants t
WHERE NOT EXISTS (SELECT 1 FROM public.asset_maintenance_sla_configs WHERE tenant_id = t.id AND priority = 'low');