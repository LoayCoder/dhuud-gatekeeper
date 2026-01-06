-- Create app_updates table for tracking broadcast history
CREATE TABLE public.app_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id), -- NULL = all tenants
  version text NOT NULL,
  release_notes text[] DEFAULT '{}',
  priority text DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'critical')),
  broadcast_at timestamptz DEFAULT now(),
  broadcast_by uuid REFERENCES public.profiles(id),
  total_recipients int DEFAULT 0,
  successful_sends int DEFAULT 0,
  failed_sends int DEFAULT 0,
  error_details jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Enable RLS
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;

-- Admins can view update history (using is_super_admin or role assignments)
CREATE POLICY "Admins can view update history"
ON public.app_updates FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.user_role_assignments ura ON ura.user_id = p.id
    LEFT JOIN public.roles r ON r.id = ura.role_id
    WHERE p.id = auth.uid() 
    AND p.deleted_at IS NULL
    AND (p.is_super_admin = true OR r.code IN ('admin', 'super_admin', 'hsse_manager'))
  )
);

-- Admins can insert updates
CREATE POLICY "Admins can insert updates"
ON public.app_updates FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    LEFT JOIN public.user_role_assignments ura ON ura.user_id = p.id
    LEFT JOIN public.roles r ON r.id = ura.role_id
    WHERE p.id = auth.uid() 
    AND p.deleted_at IS NULL
    AND (p.is_super_admin = true OR r.code IN ('admin', 'super_admin', 'hsse_manager'))
  )
);

-- Create indexes for faster queries
CREATE INDEX idx_app_updates_version ON public.app_updates(version);
CREATE INDEX idx_app_updates_broadcast_at ON public.app_updates(broadcast_at DESC);

-- Create trigger for updated_at
CREATE TRIGGER update_app_updates_updated_at
BEFORE UPDATE ON public.app_updates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();