-- Change default status for new extension requests to go directly to HSSE Expert
ALTER TABLE action_extension_requests 
  ALTER COLUMN status SET DEFAULT 'pending_hsse';

-- Update any existing pending_manager requests to pending_hsse
UPDATE action_extension_requests 
SET status = 'pending_hsse' 
WHERE status = 'pending_manager' AND deleted_at IS NULL;