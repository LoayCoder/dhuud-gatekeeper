-- Add unique constraint for company_id + email combination to prevent duplicate site reps
CREATE UNIQUE INDEX IF NOT EXISTS idx_contractor_representatives_company_email 
ON contractor_representatives (company_id, email) 
WHERE email IS NOT NULL AND deleted_at IS NULL;