-- Phase 1: Create shift_swap_requests table for guard shift swap management

CREATE TABLE public.shift_swap_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  requesting_guard_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_guard_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_roster_id UUID NOT NULL REFERENCES public.shift_roster(id) ON DELETE CASCADE,
  swap_roster_id UUID REFERENCES public.shift_roster(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'supervisor_pending', 'approved', 'denied')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  supervisor_id UUID REFERENCES public.profiles(id),
  supervisor_approved_at TIMESTAMPTZ,
  supervisor_notes TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.shift_swap_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant isolation
CREATE POLICY "Users can view swap requests in their tenant"
  ON public.shift_swap_requests
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create swap requests in their tenant"
  ON public.shift_swap_requests
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
    AND requesting_guard_id = auth.uid()
  );

CREATE POLICY "Users can update swap requests they are involved in"
  ON public.shift_swap_requests
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
    AND (
      requesting_guard_id = auth.uid()
      OR target_guard_id = auth.uid()
      OR supervisor_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_shift_swap_requests_updated_at
  BEFORE UPDATE ON public.shift_swap_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster queries
CREATE INDEX idx_shift_swap_requests_tenant ON public.shift_swap_requests(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_shift_swap_requests_status ON public.shift_swap_requests(status) WHERE deleted_at IS NULL;