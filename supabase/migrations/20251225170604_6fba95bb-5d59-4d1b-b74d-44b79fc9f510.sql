-- Fix old verified records to closed
UPDATE corrective_actions 
SET status = 'closed' 
WHERE status = 'verified' AND deleted_at IS NULL;