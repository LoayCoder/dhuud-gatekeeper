-- Function to check investigation readiness (Gate n26)
CREATE OR REPLACE FUNCTION check_investigation_readiness(p_incident_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_evidence_count INTEGER;
  v_pending_witnesses INTEGER;
  v_rca_locked BOOLEAN;
  v_ready BOOLEAN;
BEGIN
  -- Check 1: Evidence Existence
  SELECT COUNT(*) INTO v_evidence_count
  FROM incident_evidence
  WHERE incident_id = p_incident_id
  AND is_soft_deleted = false;

  -- Check 2: Witness Statements Status (None should be pending)
  SELECT COUNT(*) INTO v_pending_witnesses
  FROM witness_statements
  WHERE incident_id = p_incident_id
  AND status = 'pending'
  AND deleted_at IS NULL;

  -- Check 3: RCA Locking
  SELECT is_locked INTO v_rca_locked
  FROM incident_rca
  WHERE incident_id = p_incident_id;

  -- Handle case where no RCA record exists yet (treat as not locked)
  IF v_rca_locked IS NULL THEN
    v_rca_locked := false;
  END IF;

  -- Determine readiness
  v_ready := (v_evidence_count > 0) AND (v_pending_witnesses = 0) AND (v_rca_locked = true);

  RETURN jsonb_build_object(
    'ready', v_ready,
    'has_evidence', v_evidence_count > 0,
    'witnesses_approved', v_pending_witnesses = 0,
    'rca_locked', v_rca_locked
  );
END;
$$;
