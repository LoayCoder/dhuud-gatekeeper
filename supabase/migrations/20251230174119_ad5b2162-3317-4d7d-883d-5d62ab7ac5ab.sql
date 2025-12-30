-- =============================================
-- ENHANCED WORKFLOW DIAGRAMS SYSTEM TABLES
-- =============================================

-- 1. Workflow Definitions (extends static TypeScript definitions)
CREATE TABLE public.workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  workflow_key TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  description_ar TEXT,
  category TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  config JSONB DEFAULT '{}',
  layout_data JSONB DEFAULT '{}',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(tenant_id, workflow_key, version)
);

-- 2. Workflow Instances (active executions)
CREATE TABLE public.workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.workflow_definitions(id),
  workflow_key TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  current_step_id TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  started_by UUID REFERENCES public.profiles(id),
  participants JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  deleted_at TIMESTAMPTZ
);

-- 3. Workflow Step History (tracking progress)
CREATE TABLE public.workflow_step_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES public.workflow_instances(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  step_name TEXT,
  actor_id UUID REFERENCES public.profiles(id),
  action_taken TEXT,
  notes TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}'
);

-- 4. Workflow Live Status (real-time aggregated metrics)
CREATE TABLE public.workflow_live_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  workflow_key TEXT NOT NULL,
  active_instances INTEGER DEFAULT 0,
  completed_today INTEGER DEFAULT 0,
  avg_completion_time_hours DECIMAL(10, 2),
  bottleneck_step TEXT,
  bottleneck_count INTEGER DEFAULT 0,
  performance_trend TEXT DEFAULT 'stable' CHECK (performance_trend IN ('improving', 'stable', 'declining')),
  last_updated TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, workflow_key)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_workflow_definitions_tenant ON public.workflow_definitions(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_workflow_definitions_key ON public.workflow_definitions(workflow_key) WHERE deleted_at IS NULL;
CREATE INDEX idx_workflow_instances_tenant ON public.workflow_instances(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_workflow_instances_status ON public.workflow_instances(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_workflow_instances_entity ON public.workflow_instances(entity_type, entity_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_workflow_step_history_instance ON public.workflow_step_history(instance_id);
CREATE INDEX idx_workflow_live_status_tenant ON public.workflow_live_status(tenant_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_step_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_live_status ENABLE ROW LEVEL SECURITY;

-- Workflow Definitions Policies (tenant isolation)
CREATE POLICY "Users can view workflow definitions for their tenant"
  ON public.workflow_definitions FOR SELECT
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Admins can insert workflow definitions"
  ON public.workflow_definitions FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND (p.is_super_admin = true OR EXISTS (
        SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin'
      ))
    )
  );

CREATE POLICY "Admins can update workflow definitions"
  ON public.workflow_definitions FOR UPDATE
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND (p.is_super_admin = true OR EXISTS (
        SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin'
      ))
    )
  );

CREATE POLICY "Admins can delete workflow definitions"
  ON public.workflow_definitions FOR DELETE
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND (p.is_super_admin = true OR EXISTS (
        SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin'
      ))
    )
  );

-- Workflow Instances Policies
CREATE POLICY "Users can view workflow instances for their tenant"
  ON public.workflow_instances FOR SELECT
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can create workflow instances for their tenant"
  ON public.workflow_instances FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can update workflow instances for their tenant"
  ON public.workflow_instances FOR UPDATE
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- Workflow Step History Policies
CREATE POLICY "Users can view step history for their tenant"
  ON public.workflow_step_history FOR SELECT
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Users can create step history for their tenant"
  ON public.workflow_step_history FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

-- Workflow Live Status Policies
CREATE POLICY "Users can view live status for their tenant"
  ON public.workflow_live_status FOR SELECT
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p WHERE p.id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage live status insert"
  ON public.workflow_live_status FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND (p.is_super_admin = true OR EXISTS (
        SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin'
      ))
    )
  );

CREATE POLICY "Admins can manage live status update"
  ON public.workflow_live_status FOR UPDATE
  USING (
    tenant_id IN (
      SELECT p.tenant_id FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND (p.is_super_admin = true OR EXISTS (
        SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'admin'
      ))
    )
  );

-- =============================================
-- ENABLE REAL-TIME
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_step_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_live_status;

-- =============================================
-- UPDATED_AT TRIGGER
-- =============================================

CREATE TRIGGER update_workflow_definitions_updated_at
  BEFORE UPDATE ON public.workflow_definitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_live_status_updated_at
  BEFORE UPDATE ON public.workflow_live_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();