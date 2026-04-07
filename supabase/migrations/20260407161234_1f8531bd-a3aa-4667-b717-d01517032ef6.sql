ALTER TABLE public.contractor_module_audit_logs
  DROP CONSTRAINT contractor_module_audit_logs_action_check;

ALTER TABLE public.contractor_module_audit_logs
  ADD CONSTRAINT contractor_module_audit_logs_action_check
  CHECK (action = ANY (ARRAY[
    'created', 'updated', 'deleted',
    'approved', 'rejected', 'suspended', 'activated',
    'revoked', 'assigned', 'removed',
    'sent', 'viewed', 'acknowledged', 'verified', 'expired',
    'worker_edited_by_rep', 'worker_edits_approved',
    'security_approved', 'security_rejected',
    'blacklisted', 'unblacklisted',
    'photo_verified'
  ]));