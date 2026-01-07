-- Create security_teams table for persistent team formation
CREATE TABLE public.security_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  supervisor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Create security_team_members table for team membership
CREATE TABLE public.security_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.security_teams(id) ON DELETE CASCADE,
  guard_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  UNIQUE(team_id, guard_id)
);

-- Create indexes for performance
CREATE INDEX idx_security_teams_tenant_id ON public.security_teams(tenant_id);
CREATE INDEX idx_security_teams_supervisor_id ON public.security_teams(supervisor_id);
CREATE INDEX idx_security_teams_deleted_at ON public.security_teams(deleted_at);
CREATE INDEX idx_security_team_members_team_id ON public.security_team_members(team_id);
CREATE INDEX idx_security_team_members_guard_id ON public.security_team_members(guard_id);
CREATE INDEX idx_security_team_members_tenant_id ON public.security_team_members(tenant_id);
CREATE INDEX idx_security_team_members_deleted_at ON public.security_team_members(deleted_at);

-- Enable RLS on security_teams
ALTER TABLE public.security_teams ENABLE ROW LEVEL SECURITY;

-- RLS Policies for security_teams (Separate policies, soft-delete safe)
CREATE POLICY "security_teams_select_policy" 
ON public.security_teams 
FOR SELECT 
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND deleted_at IS NULL
);

CREATE POLICY "security_teams_insert_policy" 
ON public.security_teams 
FOR INSERT 
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "security_teams_update_policy" 
ON public.security_teams 
FOR UPDATE 
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "security_teams_delete_policy" 
ON public.security_teams 
FOR DELETE 
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- Enable RLS on security_team_members
ALTER TABLE public.security_team_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for security_team_members (Separate policies, soft-delete safe)
CREATE POLICY "security_team_members_select_policy" 
ON public.security_team_members 
FOR SELECT 
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
  AND deleted_at IS NULL
);

CREATE POLICY "security_team_members_insert_policy" 
ON public.security_team_members 
FOR INSERT 
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "security_team_members_update_policy" 
ON public.security_team_members 
FOR UPDATE 
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "security_team_members_delete_policy" 
ON public.security_team_members 
FOR DELETE 
USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- Create trigger for updated_at on security_teams
CREATE TRIGGER update_security_teams_updated_at
BEFORE UPDATE ON public.security_teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();