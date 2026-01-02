-- Phase 1: Database Schema Fixes for Visitor System (Fixed)

-- 1.1 Add missing columns to visit_requests table
ALTER TABLE public.visit_requests 
ADD COLUMN IF NOT EXISTS entry_logged_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS exit_logged_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS host_exit_notified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 1.2 Add visit_request_id to gate_entry_logs to link entry to visit request
ALTER TABLE public.gate_entry_logs 
ADD COLUMN IF NOT EXISTS visit_request_id UUID REFERENCES public.visit_requests(id);

-- 1.3 Create index on visitors.qr_code_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_visitors_qr_code_token ON public.visitors(qr_code_token);

-- 1.4 Create index on visit_requests for common queries
CREATE INDEX IF NOT EXISTS idx_visit_requests_status ON public.visit_requests(status);
CREATE INDEX IF NOT EXISTS idx_visit_requests_visitor_id ON public.visit_requests(visitor_id);

-- 1.5 Create visitor_workflow_settings table for configurable visitor workflow
CREATE TABLE IF NOT EXISTS public.visitor_workflow_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  require_photo BOOLEAN DEFAULT false,
  auto_approve_internal BOOLEAN DEFAULT false,
  default_duration_hours INTEGER DEFAULT 4,
  expiry_warning_minutes INTEGER DEFAULT 60,
  notify_host_on_arrival BOOLEAN DEFAULT true,
  notify_host_on_departure BOOLEAN DEFAULT true,
  allow_multiple_active_visits BOOLEAN DEFAULT false,
  require_security_approval BOOLEAN DEFAULT true,
  max_visit_duration_hours INTEGER DEFAULT 24,
  badge_valid_hours INTEGER DEFAULT 8,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT unique_tenant_visitor_settings UNIQUE(tenant_id)
);

-- Enable RLS on visitor_workflow_settings
ALTER TABLE public.visitor_workflow_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for visitor_workflow_settings
CREATE POLICY "Users can view their tenant visitor settings" 
ON public.visitor_workflow_settings 
FOR SELECT 
USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can insert visitor settings" 
ON public.visitor_workflow_settings 
FOR INSERT 
WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can update their tenant visitor settings" 
ON public.visitor_workflow_settings 
FOR UPDATE 
USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_visitor_workflow_settings_updated_at
BEFORE UPDATE ON public.visitor_workflow_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 1.6 Add comment for documentation
COMMENT ON TABLE public.visitor_workflow_settings IS 'Configurable settings for visitor management workflow per tenant';