ALTER TABLE public.contractor_module_audit_logs DROP CONSTRAINT contractor_module_audit_logs_action_check;

ALTER TABLE public.contractor_module_audit_logs ADD CONSTRAINT contractor_module_audit_logs_action_check CHECK (action = ANY (ARRAY[
  'created'::text, 'updated'::text, 'deleted'::text, 'approved'::text, 'rejected'::text,
  'suspended'::text, 'activated'::text, 'revoked'::text, 'assigned'::text, 'removed'::text,
  'sent'::text, 'viewed'::text, 'acknowledged'::text, 'verified'::text, 'expired'::text,
  'worker_edited_by_rep'::text, 'worker_edits_approved'::text,
  'security_approved'::text, 'security_rejected'::text,
  'blacklisted'::text, 'unblacklisted'::text, 'photo_verified'::text,
  'invitation_sent'::text
]));