-- Create contract_violations table for tracking contractor violations linked to incidents
CREATE TABLE IF NOT EXISTS public.contract_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  incident_id UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES public.contractor_companies(id),
  violation_type TEXT NOT NULL,
  description TEXT,
  fine_amount NUMERIC(12,2),
  currency TEXT DEFAULT 'SAR',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'finalized', 'rejected')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.contract_violations ENABLE ROW LEVEL SECURITY;

-- RLS policies for contract_violations
CREATE POLICY "Users can view contract violations in their tenant"
  ON public.contract_violations
  FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create contract violations in their tenant"
  ON public.contract_violations
  FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update contract violations in their tenant"
  ON public.contract_violations
  FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete contract violations in their tenant"
  ON public.contract_violations
  FOR DELETE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Create lock_rca function to lock root cause analysis
CREATE OR REPLACE FUNCTION public.lock_rca(p_incident_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_investigation_id UUID;
BEGIN
  -- Get the investigation for this incident
  SELECT id INTO v_investigation_id
  FROM public.investigations
  WHERE incident_id = p_incident_id
  AND deleted_at IS NULL;
  
  IF v_investigation_id IS NULL THEN
    RAISE EXCEPTION 'No investigation found for incident %', p_incident_id;
  END IF;
  
  -- Lock the RCA
  UPDATE public.investigations
  SET 
    is_rca_locked = true,
    rca_locked_by = auth.uid(),
    rca_locked_at = NOW(),
    updated_at = NOW()
  WHERE id = v_investigation_id;
  
  RETURN true;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.lock_rca(UUID) TO authenticated;