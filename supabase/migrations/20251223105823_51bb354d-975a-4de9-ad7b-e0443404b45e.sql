-- Create glass_break_events table for emergency access audit
CREATE TABLE public.glass_break_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  activated_by UUID NOT NULL,
  reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  deactivated_at TIMESTAMPTZ,
  deactivated_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Add indexes
CREATE INDEX idx_glass_break_events_tenant ON public.glass_break_events(tenant_id);
CREATE INDEX idx_glass_break_events_active ON public.glass_break_events(is_active, expires_at);

-- Enable RLS
ALTER TABLE public.glass_break_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for glass_break_events
CREATE POLICY "Admins can view glass break events" 
  ON public.glass_break_events 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid() AND r.code = 'admin'
    )
  );

CREATE POLICY "Admins can insert glass break events" 
  ON public.glass_break_events 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid() AND r.code = 'admin'
    )
  );

CREATE POLICY "Admins can update glass break events" 
  ON public.glass_break_events 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid() AND r.code = 'admin'
    )
  );

-- Add glass_break columns to tenants table
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS glass_break_active BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS glass_break_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS system_shutdown_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS system_shutdown_by UUID,
  ADD COLUMN IF NOT EXISTS system_shutdown_reason TEXT;

-- Create system_emergency_actions table for audit logging
CREATE TABLE public.system_emergency_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('glass_break_activate', 'glass_break_deactivate', 'system_shutdown', 'system_restore', 'force_password_reset', 'terminate_all_sessions')),
  performed_by UUID NOT NULL,
  reason TEXT NOT NULL,
  affected_users_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Add indexes
CREATE INDEX idx_system_emergency_actions_tenant ON public.system_emergency_actions(tenant_id);
CREATE INDEX idx_system_emergency_actions_type ON public.system_emergency_actions(action_type);
CREATE INDEX idx_system_emergency_actions_created ON public.system_emergency_actions(created_at DESC);

-- Enable RLS
ALTER TABLE public.system_emergency_actions ENABLE ROW LEVEL SECURITY;

-- RLS policies for system_emergency_actions
CREATE POLICY "Admins can view emergency actions" 
  ON public.system_emergency_actions 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid() AND r.code = 'admin'
    )
  );

CREATE POLICY "Admins can insert emergency actions" 
  ON public.system_emergency_actions 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN roles r ON ura.role_id = r.id
      WHERE ura.user_id = auth.uid() AND r.code = 'admin'
    )
  );