-- Phase 1: Database Schema Updates for Incident Workflow (Fixed v2)

-- 1.1 Add new status values to incident_status enum if not exists
DO $$ 
BEGIN
  -- Check and add pending_department_manager_approval
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending_department_manager_approval' 
                 AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'incident_status')) THEN
    ALTER TYPE incident_status ADD VALUE 'pending_department_manager_approval';
  END IF;
  
  -- Check and add pending_clinic_review
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending_clinic_review' 
                 AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'incident_status')) THEN
    ALTER TYPE incident_status ADD VALUE 'pending_clinic_review';
  END IF;
END $$;

-- 1.2 Update Investigations Table for Team Investigation
ALTER TABLE public.investigations 
  ADD COLUMN IF NOT EXISTS investigation_type TEXT DEFAULT 'single' CHECK (investigation_type IN ('single', 'team'));

ALTER TABLE public.investigations 
  ADD COLUMN IF NOT EXISTS team_leader_id UUID REFERENCES public.profiles(id);

ALTER TABLE public.investigations 
  ADD COLUMN IF NOT EXISTS team_member_ids UUID[];

-- 1.3 Create Investigation Team Tasks Table
CREATE TABLE IF NOT EXISTS public.investigation_team_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  branch_id UUID REFERENCES public.branches(id),
  investigation_id UUID NOT NULL REFERENCES public.investigations(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES public.profiles(id),
  assigned_by UUID NOT NULL REFERENCES public.profiles(id),
  task_type TEXT NOT NULL CHECK (task_type IN ('evidence_collection', 'witness_interview', 'property_assessment', 'injury_documentation', 'environmental_assessment', 'other')),
  task_description TEXT NOT NULL,
  target_area TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  completion_notes TEXT,
  completed_at TIMESTAMPTZ,
  due_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes for investigation_team_tasks
CREATE INDEX IF NOT EXISTS idx_investigation_team_tasks_investigation_id 
  ON public.investigation_team_tasks(investigation_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_investigation_team_tasks_assigned_to 
  ON public.investigation_team_tasks(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_investigation_team_tasks_tenant_id 
  ON public.investigation_team_tasks(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_investigation_team_tasks_status 
  ON public.investigation_team_tasks(status) WHERE deleted_at IS NULL;

-- Enable RLS on investigation_team_tasks
ALTER TABLE public.investigation_team_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for investigation_team_tasks (using correct app_role values)
CREATE POLICY "Users can view tasks in their tenant" ON public.investigation_team_tasks
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Team leader or HSSE can insert tasks" ON public.investigation_team_tasks
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (
      -- Is team leader of the investigation
      EXISTS (
        SELECT 1 FROM public.investigations i 
        WHERE i.id = investigation_id AND i.team_leader_id = auth.uid()
      )
      -- Or has HSSE/admin role
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('hsse_expert'::app_role, 'admin'::app_role, 'security_manager'::app_role)
      )
    )
  );

CREATE POLICY "Team leader or assignee can update tasks" ON public.investigation_team_tasks
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (
      assigned_to = auth.uid()
      OR assigned_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.investigations i 
        WHERE i.id = investigation_id AND i.team_leader_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid() 
        AND ur.role IN ('admin'::app_role, 'security_manager'::app_role)
      )
    )
  );

-- 1.4 Add Clinic Review Tracking to Incidents Table
ALTER TABLE public.incidents 
  ADD COLUMN IF NOT EXISTS clinic_review_required BOOLEAN DEFAULT false;

ALTER TABLE public.incidents 
  ADD COLUMN IF NOT EXISTS clinic_reviewed_at TIMESTAMPTZ;

ALTER TABLE public.incidents 
  ADD COLUMN IF NOT EXISTS clinic_reviewed_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.incidents 
  ADD COLUMN IF NOT EXISTS clinic_review_notes TEXT;

-- 1.5 Add department manager approval tracking
ALTER TABLE public.incidents 
  ADD COLUMN IF NOT EXISTS dept_manager_approved_at TIMESTAMPTZ;

ALTER TABLE public.incidents 
  ADD COLUMN IF NOT EXISTS dept_manager_approved_by UUID REFERENCES public.profiles(id);

ALTER TABLE public.incidents 
  ADD COLUMN IF NOT EXISTS dept_manager_notes TEXT;

-- Trigger to update updated_at on investigation_team_tasks
CREATE OR REPLACE FUNCTION public.update_investigation_team_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_investigation_team_tasks_updated_at_trigger ON public.investigation_team_tasks;
CREATE TRIGGER update_investigation_team_tasks_updated_at_trigger
  BEFORE UPDATE ON public.investigation_team_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_investigation_team_tasks_updated_at();

-- Enable realtime for investigation_team_tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.investigation_team_tasks;