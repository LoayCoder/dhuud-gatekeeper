-- Drop the existing constraint
ALTER TABLE contractor_companies 
DROP CONSTRAINT IF EXISTS contractor_companies_status_check;

-- Add the updated constraint with 'pending_approval'
ALTER TABLE contractor_companies 
ADD CONSTRAINT contractor_companies_status_check 
CHECK (status = ANY (ARRAY['active', 'suspended', 'inactive', 'expired', 'blacklisted', 'pending_approval']));