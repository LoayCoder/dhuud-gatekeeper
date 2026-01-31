-- Fixes and Hardening from Audit (Feb 2026)

-- 1. TIGHTEN RLS ON INCIDENT_RCA
-- Previous policy was too broad (tenant-wide). We restrict it to HSSE, Admins, and relevant participants.

DROP POLICY IF EXISTS "View RCA" ON incident_rca;

CREATE POLICY "Restricted View RCA" ON incident_rca
FOR SELECT TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  AND (
    -- 1. HSSE Roles / Admins
    public.has_hsse_incident_access(auth.uid())
    OR public.is_admin_or_manager()
    OR
    -- 2. Incident Approver (e.g. Site Client)
    EXISTS (
      SELECT 1 FROM incidents i
      WHERE i.id = incident_rca.incident_id
      AND i.approval_manager_id = auth.uid()
    )
    OR
    -- 3. Investigator (Legacy check)
    EXISTS (
      SELECT 1 FROM investigations inv
      WHERE inv.incident_id = incident_rca.incident_id
      AND inv.investigator_id = auth.uid()
    )
  )
);

-- 2. CREATE LOCK_RCA FUNCTION
-- Simplifies the locking process and ensures timestamps/user are set correctly.

CREATE OR REPLACE FUNCTION lock_rca(p_incident_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rca_id uuid;
BEGIN
  -- Check permission (HSSE Manager only)
  IF NOT public.has_role(auth.uid(), 'hsse_manager') THEN
    RAISE EXCEPTION 'Only HSSE Managers can lock the RCA';
  END IF;

  -- Verify RCA exists
  SELECT id INTO v_rca_id FROM incident_rca WHERE incident_id = p_incident_id;

  IF v_rca_id IS NULL THEN
    RAISE EXCEPTION 'RCA record not found for this incident';
  END IF;

  -- Update
  UPDATE incident_rca
  SET
    is_locked = true,
    locked_by = auth.uid(),
    locked_at = now(),
    updated_at = now()
  WHERE id = v_rca_id;

  RETURN FOUND;
END;
$$;

-- 3. ENFORCE ACTION EVIDENCE (Trigger)
-- Prevents closing a corrective action if no evidence is attached.

CREATE OR REPLACE FUNCTION check_action_evidence_requirement()
RETURNS TRIGGER AS $$
DECLARE
  v_evidence_count integer;
  v_is_observation_action boolean;
BEGIN
  -- Only check when transitioning to CLOSED or VERIFIED
  IF NEW.status IN ('closed', 'verified') AND (OLD.status NOT IN ('closed', 'verified') OR OLD.status IS NULL) THEN

    -- Check if evidence exists
    SELECT count(*) INTO v_evidence_count
    FROM action_evidence
    WHERE action_id = NEW.id
    AND deleted_at IS NULL;

    IF v_evidence_count = 0 THEN
       RAISE EXCEPTION 'Cannot close or verify action without evidence. Please upload at least one file.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_action_evidence ON corrective_actions;
CREATE TRIGGER trigger_enforce_action_evidence
BEFORE UPDATE ON corrective_actions
FOR EACH ROW
EXECUTE FUNCTION check_action_evidence_requirement();
