-- Temporarily disable the date validation trigger to allow backfill
ALTER TABLE public.material_gate_passes DISABLE TRIGGER trg_validate_gate_pass_dates;

-- Backfill submitted_at
UPDATE public.material_gate_passes
SET submitted_at = created_at
WHERE submitted_at IS NULL AND deleted_at IS NULL;

-- Auto-expire stale pending passes
UPDATE public.material_gate_passes
SET status = 'expired', updated_at = now()
WHERE deleted_at IS NULL
  AND end_date < CURRENT_DATE
  AND status IN ('pending_contractor_approval', 'pending_club_mgmt_ack', 'pending_security_approval', 'pending_dept_approval', 'pending_safety_approval');

-- Re-enable trigger
ALTER TABLE public.material_gate_passes ENABLE TRIGGER trg_validate_gate_pass_dates;