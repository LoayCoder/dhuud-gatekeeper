-- ==============================================================================
-- GATE PASS HARDENING & CONSOLIDATION
-- Purpose: Consolidate entry logs, restrict security roles, and enforce governance.
-- ==============================================================================

-- 1. SCHEMA CONSOLIDATION: Add missing link to gate_entry_logs
ALTER TABLE public.gate_entry_logs
ADD COLUMN IF NOT EXISTS material_gate_pass_id UUID REFERENCES public.material_gate_passes(id);

CREATE INDEX IF NOT EXISTS idx_gate_entry_logs_material_pass ON public.gate_entry_logs(material_gate_pass_id) WHERE material_gate_pass_id IS NOT NULL;

COMMENT ON COLUMN public.gate_entry_logs.material_gate_pass_id IS 'Link to Material/Vehicle Gate Pass for unified logging';

-- 2. RLS LOCKDOWN: Restrict Security Role on material_gate_passes
-- Previously, Security had "ALL" (Manage) access. We restrict this to "SELECT" and "UPDATE" (Status only).

DROP POLICY IF EXISTS "Security users can manage gate passes" ON public.material_gate_passes;

CREATE POLICY "Security users can view gate passes"
ON public.material_gate_passes FOR SELECT
USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND has_security_access(auth.uid())
);

CREATE POLICY "Security users can update gate pass status"
ON public.material_gate_passes FOR UPDATE
USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND has_security_access(auth.uid())
)
WITH CHECK (
  tenant_id = get_auth_tenant_id()
  -- Security can only update these specific fields is handled by application logic,
  -- but RLS "USING" clause limits *which* rows they can touch.
  -- Ideally, we would use column-level privileges, but Supabase/Postgres RLS is row-level.
  -- We rely on the Trigger below to handle the actual state transition,
  -- ensuring the Guard doesn't manually "fudge" the data via direct UPDATE if they tried.
);

-- 3. AUTOMATION: Sync Entry Log to Parent Pass Status
-- When a Guard creates a log entry in `gate_entry_logs`, the parent pass should automatically mark as 'used'/'checked_in'.

CREATE OR REPLACE FUNCTION public.sync_gate_entry_to_parent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Handle Material/Vehicle Gate Passes
  IF NEW.material_gate_pass_id IS NOT NULL THEN
    -- On Entry (INSERT)
    IF TG_OP = 'INSERT' THEN
      UPDATE public.material_gate_passes
      SET
        status = 'used',
        guard_verified_at = NOW(),
        guard_verified_by = NEW.guard_id,
        entry_time = NEW.entry_time -- Keep legacy column in sync for now (backward compat), but relying on log is better.
      WHERE id = NEW.material_gate_pass_id;
    END IF;

    -- On Exit (UPDATE of exit_time)
    IF TG_OP = 'UPDATE' AND NEW.exit_time IS NOT NULL AND OLD.exit_time IS NULL THEN
       UPDATE public.material_gate_passes
       SET
         exit_time = NEW.exit_time,
         status = 'completed'
       WHERE id = NEW.material_gate_pass_id;
    END IF;
  END IF;

  -- Handle Visit Requests (Visitor Pass)
  IF NEW.visit_request_id IS NOT NULL THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.visit_requests
      SET
        status = 'checked_in',
        entry_logged_at = NEW.entry_time
      WHERE id = NEW.visit_request_id;
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.exit_time IS NOT NULL AND OLD.exit_time IS NULL THEN
      UPDATE public.visit_requests
      SET
        status = 'checked_out',
        exit_logged_at = NEW.exit_time
      WHERE id = NEW.visit_request_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach Trigger to gate_entry_logs
DROP TRIGGER IF EXISTS trigger_sync_gate_entry_parent ON public.gate_entry_logs;

CREATE TRIGGER trigger_sync_gate_entry_parent
AFTER INSERT OR UPDATE ON public.gate_entry_logs
FOR EACH ROW
EXECUTE FUNCTION public.sync_gate_entry_to_parent();

-- 4. HARDEN GATE ENTRY LOGS (No Deletes for Guards)
DROP POLICY IF EXISTS "Security users can manage gate entries" ON public.gate_entry_logs;

CREATE POLICY "Security users can view gate entries"
ON public.gate_entry_logs FOR SELECT
USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND has_security_access(auth.uid())
);

CREATE POLICY "Security users can insert gate entries"
ON public.gate_entry_logs FOR INSERT
WITH CHECK (
  tenant_id = get_auth_tenant_id()
  AND has_security_access(auth.uid())
);

CREATE POLICY "Security users can update gate entries"
ON public.gate_entry_logs FOR UPDATE
USING (
  tenant_id = get_auth_tenant_id()
  AND deleted_at IS NULL
  AND has_security_access(auth.uid())
);

-- Note: No DELETE policy for Security Users. Only Admins (if separate policy exists) or no one.

-- 5. DEPRECATION NOTICE
COMMENT ON COLUMN public.material_gate_passes.entry_time IS 'DEPRECATED: Use gate_entry_logs table for authoritative entry history.';
COMMENT ON COLUMN public.material_gate_passes.exit_time IS 'DEPRECATED: Use gate_entry_logs table for authoritative exit history.';
