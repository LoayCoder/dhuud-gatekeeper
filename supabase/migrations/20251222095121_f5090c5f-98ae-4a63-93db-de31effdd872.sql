-- =============================================
-- PHASE 1: COMPLETE NOTIFICATION SYSTEM
-- =============================================

-- Email notification preferences per user
CREATE TABLE IF NOT EXISTS public.email_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- HSSE notifications
  incidents_new BOOLEAN NOT NULL DEFAULT true,
  incidents_assigned BOOLEAN NOT NULL DEFAULT true,
  incidents_status_change BOOLEAN NOT NULL DEFAULT true,
  approvals_requested BOOLEAN NOT NULL DEFAULT true,
  approvals_decision BOOLEAN NOT NULL DEFAULT true,
  sla_warnings BOOLEAN NOT NULL DEFAULT true,
  sla_overdue BOOLEAN NOT NULL DEFAULT true,
  -- Security notifications
  visitor_checkin BOOLEAN NOT NULL DEFAULT true,
  contractor_alerts BOOLEAN NOT NULL DEFAULT true,
  gate_pass_approval BOOLEAN NOT NULL DEFAULT true,
  -- System
  system_announcements BOOLEAN NOT NULL DEFAULT true,
  daily_digest BOOLEAN NOT NULL DEFAULT false,
  weekly_summary BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.email_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email preferences" ON public.email_notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own email preferences" ON public.email_notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email preferences" ON public.email_notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Unified notification delivery log
CREATE TABLE IF NOT EXISTS public.unified_notification_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,
  notification_subtype TEXT,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  email_delivery_status TEXT,
  email_error TEXT,
  push_sent BOOLEAN DEFAULT false,
  push_sent_at TIMESTAMPTZ,
  push_delivery_status TEXT,
  push_error TEXT,
  whatsapp_sent BOOLEAN DEFAULT false,
  whatsapp_sent_at TIMESTAMPTZ,
  whatsapp_delivery_status TEXT,
  whatsapp_error TEXT,
  reference_type TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.unified_notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.unified_notification_log
  FOR SELECT USING (user_id = auth.uid() OR tenant_id = get_auth_tenant_id());

CREATE INDEX idx_unified_notification_log_user ON public.unified_notification_log(user_id, created_at DESC);
CREATE INDEX idx_unified_notification_log_type ON public.unified_notification_log(notification_type, created_at DESC);

-- =============================================
-- PHASE 2: ENHANCED APPROVAL WORKFLOWS  
-- =============================================

CREATE TABLE IF NOT EXISTS public.approval_escalation_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  approval_type TEXT NOT NULL,
  escalation_level INTEGER NOT NULL DEFAULT 1,
  escalate_after_hours INTEGER NOT NULL DEFAULT 24,
  escalate_to_role TEXT,
  escalate_to_user_id UUID REFERENCES auth.users(id),
  send_reminder_hours INTEGER DEFAULT 4,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, approval_type, escalation_level)
);

ALTER TABLE public.approval_escalation_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage escalation config" ON public.approval_escalation_config
  FOR ALL USING (tenant_id = get_auth_tenant_id());

CREATE TABLE IF NOT EXISTS public.approval_delegations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  delegator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delegate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approval_types TEXT[] NOT NULL DEFAULT '{}',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.approval_delegations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own delegations" ON public.approval_delegations
  FOR SELECT USING (delegator_id = auth.uid() OR delegate_id = auth.uid() OR tenant_id = get_auth_tenant_id());

CREATE POLICY "Users manage own delegations" ON public.approval_delegations
  FOR ALL USING (delegator_id = auth.uid() OR tenant_id = get_auth_tenant_id());

CREATE TABLE IF NOT EXISTS public.pending_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  approval_type TEXT NOT NULL,
  reference_id UUID NOT NULL,
  reference_number TEXT,
  title TEXT NOT NULL,
  requested_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  current_escalation_level INTEGER NOT NULL DEFAULT 0,
  escalated_to UUID REFERENCES auth.users(id),
  escalation_reason TEXT,
  reminder_sent_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  priority TEXT DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'pending',
  decided_by UUID REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ,
  decision_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view relevant approvals" ON public.pending_approvals
  FOR SELECT USING (assigned_to = auth.uid() OR escalated_to = auth.uid() OR requested_by = auth.uid() OR tenant_id = get_auth_tenant_id());

CREATE POLICY "Assigned users can update approvals" ON public.pending_approvals
  FOR UPDATE USING (assigned_to = auth.uid() OR escalated_to = auth.uid());

CREATE INDEX idx_pending_approvals_assigned ON public.pending_approvals(assigned_to, status);

-- =============================================
-- PHASE 3: SCANNING IMPROVEMENTS
-- =============================================

CREATE TABLE IF NOT EXISTS public.offline_scan_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  scan_type TEXT NOT NULL,
  scan_data JSONB NOT NULL,
  scanned_by UUID NOT NULL REFERENCES auth.users(id),
  scanned_at TIMESTAMPTZ NOT NULL,
  gps_lat NUMERIC(10,7),
  gps_lng NUMERIC(10,7),
  gps_accuracy NUMERIC(6,2),
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_error TEXT,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.offline_scan_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own offline scans" ON public.offline_scan_queue
  FOR ALL USING (scanned_by = auth.uid() OR tenant_id = get_auth_tenant_id());

CREATE INDEX idx_offline_scan_queue_sync ON public.offline_scan_queue(sync_status, created_at);

-- NFC checkpoint support (extend existing patrol checkpoints)
ALTER TABLE public.patrol_checkpoints 
  ADD COLUMN IF NOT EXISTS nfc_tag_id TEXT,
  ADD COLUMN IF NOT EXISTS nfc_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS scan_tolerance_meters INTEGER DEFAULT 50;

CREATE TABLE IF NOT EXISTS public.scan_error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  scan_type TEXT NOT NULL,
  error_code TEXT NOT NULL,
  error_message TEXT,
  device_info JSONB,
  stack_trace TEXT,
  context_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.scan_error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own scan errors" ON public.scan_error_logs
  FOR SELECT USING (user_id = auth.uid() OR tenant_id = get_auth_tenant_id());

CREATE POLICY "Users insert scan errors" ON public.scan_error_logs
  FOR INSERT WITH CHECK (tenant_id = get_auth_tenant_id());

-- =============================================
-- PHASE 4: AUDIT & COMPLIANCE
-- =============================================

CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id),
  actor_name TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  action_category TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  entity_identifier TEXT,
  result TEXT NOT NULL,
  result_reason TEXT,
  site_id UUID REFERENCES public.sites(id),
  building_id UUID REFERENCES public.buildings(id),
  gate_name TEXT,
  gps_lat NUMERIC(10,7),
  gps_lng NUMERIC(10,7),
  old_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View security audit logs" ON public.security_audit_logs
  FOR SELECT USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Insert security audit logs" ON public.security_audit_logs
  FOR INSERT WITH CHECK (tenant_id = get_auth_tenant_id());

CREATE INDEX idx_security_audit_logs_action ON public.security_audit_logs(action_category, action, created_at DESC);
CREATE INDEX idx_security_audit_logs_entity ON public.security_audit_logs(entity_type, entity_id);

-- Extend blacklist with photo evidence
ALTER TABLE public.security_blacklist 
  ADD COLUMN IF NOT EXISTS photo_evidence_paths TEXT[],
  ADD COLUMN IF NOT EXISTS supporting_documents JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS incident_reference TEXT,
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'permanent',
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

CREATE TABLE IF NOT EXISTS public.security_report_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  report_name TEXT NOT NULL,
  report_name_ar TEXT,
  schedule_cron TEXT,
  recipients TEXT[] DEFAULT '{}',
  recipient_roles TEXT[] DEFAULT '{}',
  filters JSONB DEFAULT '{}',
  include_charts BOOLEAN DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_generated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.security_report_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage report configs" ON public.security_report_configs
  FOR ALL USING (tenant_id = get_auth_tenant_id());

CREATE TABLE IF NOT EXISTS public.security_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  config_id UUID REFERENCES public.security_report_configs(id),
  report_type TEXT NOT NULL,
  report_title TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  summary_data JSONB NOT NULL DEFAULT '{}',
  file_path TEXT,
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  emailed_to TEXT[],
  emailed_at TIMESTAMPTZ
);

ALTER TABLE public.security_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View security reports" ON public.security_reports
  FOR SELECT USING (tenant_id = get_auth_tenant_id());

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;