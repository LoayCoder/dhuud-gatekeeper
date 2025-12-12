-- Add new columns to corrective_actions table for enhanced workflow
ALTER TABLE public.corrective_actions
ADD COLUMN IF NOT EXISTS completion_notes TEXT,
ADD COLUMN IF NOT EXISTS progress_notes TEXT,
ADD COLUMN IF NOT EXISTS overdue_justification TEXT,
ADD COLUMN IF NOT EXISTS delegated_verifier_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS delegated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delegated_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS return_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_returned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_return_reason TEXT,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;

-- Create action_extension_requests table for extension workflow
CREATE TABLE IF NOT EXISTS public.action_extension_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  action_id UUID NOT NULL REFERENCES public.corrective_actions(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.profiles(id),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  current_due_date DATE NOT NULL,
  requested_due_date DATE NOT NULL,
  extension_reason TEXT NOT NULL,
  
  manager_id UUID REFERENCES public.profiles(id),
  manager_status TEXT DEFAULT 'pending',
  manager_decision_at TIMESTAMP WITH TIME ZONE,
  manager_notes TEXT,
  
  hsse_manager_id UUID REFERENCES public.profiles(id),
  hsse_manager_status TEXT DEFAULT 'pending',
  hsse_manager_decision_at TIMESTAMP WITH TIME ZONE,
  hsse_manager_notes TEXT,
  
  status TEXT DEFAULT 'pending_manager',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on action_extension_requests
ALTER TABLE public.action_extension_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for action_extension_requests
CREATE POLICY "Users can view extension requests in their tenant"
ON public.action_extension_requests
FOR SELECT
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "Users can create extension requests for their actions"
ON public.action_extension_requests
FOR INSERT
WITH CHECK (
  tenant_id = get_auth_tenant_id() 
  AND requested_by = auth.uid()
);

CREATE POLICY "Managers and HSSE can update extension requests"
ON public.action_extension_requests
FOR UPDATE
USING (
  tenant_id = get_auth_tenant_id() 
  AND deleted_at IS NULL
  AND (
    has_hsse_incident_access(auth.uid())
    OR manager_id = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_extension_requests_action ON public.action_extension_requests(action_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_extension_requests_status ON public.action_extension_requests(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_corrective_actions_delegated_verifier ON public.corrective_actions(delegated_verifier_id) WHERE deleted_at IS NULL;