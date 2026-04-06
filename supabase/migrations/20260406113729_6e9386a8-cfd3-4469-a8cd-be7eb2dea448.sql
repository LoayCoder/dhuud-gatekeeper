-- Step 1: Drop and re-create actor_type CHECK constraint to include 'user'
ALTER TABLE public.contractor_module_audit_logs
  DROP CONSTRAINT IF EXISTS contractor_module_audit_logs_actor_type_check;

ALTER TABLE public.contractor_module_audit_logs
  ADD CONSTRAINT contractor_module_audit_logs_actor_type_check
  CHECK (actor_type = ANY (ARRAY['admin','contractor_rep','supervisor','guard','system','user']));

-- Step 2: Backfill audit records for existing gate passes
-- Insert 'created' audit entries from created_at timestamps
INSERT INTO public.contractor_module_audit_logs (tenant_id, entity_type, entity_id, action, actor_id, actor_type, new_value, created_at)
SELECT 
  gp.tenant_id,
  'gate_pass',
  gp.id,
  'created',
  gp.requested_by,
  'system',
  jsonb_build_object(
    'reference_number', gp.reference_number,
    'pass_type', gp.pass_type,
    'is_internal_request', gp.is_internal_request,
    'is_public_request', gp.is_public_request,
    'backfilled', true
  ),
  gp.created_at
FROM public.material_gate_passes gp
WHERE gp.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.contractor_module_audit_logs al 
    WHERE al.entity_id = gp.id AND al.entity_type = 'gate_pass' AND al.action = 'created'
  );

-- Insert 'approved' audit entries for approved passes
INSERT INTO public.contractor_module_audit_logs (tenant_id, entity_type, entity_id, action, actor_id, actor_type, new_value, created_at)
SELECT 
  gp.tenant_id,
  'gate_pass',
  gp.id,
  'approved',
  gp.security_approved_by,
  'admin',
  jsonb_build_object(
    'reference_number', gp.reference_number,
    'status', gp.status,
    'backfilled', true
  ),
  gp.security_approved_at
FROM public.material_gate_passes gp
WHERE gp.deleted_at IS NULL
  AND gp.security_approved_by IS NOT NULL
  AND gp.security_approved_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.contractor_module_audit_logs al 
    WHERE al.entity_id = gp.id AND al.entity_type = 'gate_pass' AND al.action = 'approved'
  );

-- Insert 'rejected' audit entries for rejected passes
INSERT INTO public.contractor_module_audit_logs (tenant_id, entity_type, entity_id, action, actor_id, actor_type, new_value, created_at)
SELECT 
  gp.tenant_id,
  'gate_pass',
  gp.id,
  'rejected',
  gp.rejected_by,
  'admin',
  jsonb_build_object(
    'reference_number', gp.reference_number,
    'rejection_reason', gp.rejection_reason,
    'backfilled', true
  ),
  gp.rejected_at
FROM public.material_gate_passes gp
WHERE gp.deleted_at IS NULL
  AND gp.rejected_by IS NOT NULL
  AND gp.rejected_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.contractor_module_audit_logs al 
    WHERE al.entity_id = gp.id AND al.entity_type = 'gate_pass' AND al.action = 'rejected'
  );

-- Insert 'acknowledged' audit entries for club management acknowledgements
INSERT INTO public.contractor_module_audit_logs (tenant_id, entity_type, entity_id, action, actor_id, actor_type, new_value, created_at)
SELECT 
  gp.tenant_id,
  'gate_pass',
  gp.id,
  'acknowledged',
  gp.club_mgmt_ack_by,
  'admin',
  jsonb_build_object(
    'reference_number', gp.reference_number,
    'stage', 'club_mgmt_ack',
    'backfilled', true
  ),
  gp.club_mgmt_ack_at
FROM public.material_gate_passes gp
WHERE gp.deleted_at IS NULL
  AND gp.club_mgmt_ack_by IS NOT NULL
  AND gp.club_mgmt_ack_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.contractor_module_audit_logs al 
    WHERE al.entity_id = gp.id AND al.entity_type = 'gate_pass' AND al.action = 'acknowledged'
  );