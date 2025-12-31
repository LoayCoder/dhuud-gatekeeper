-- Drop old constraints
ALTER TABLE contractor_workers 
DROP CONSTRAINT IF EXISTS contractor_workers_approval_status_check;

ALTER TABLE contractor_companies 
DROP CONSTRAINT IF EXISTS contractor_companies_status_check;

-- Add new constraints with complete status lists
ALTER TABLE contractor_workers 
ADD CONSTRAINT contractor_workers_approval_status_check 
CHECK (approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'suspended'::text, 'revoked'::text]));

ALTER TABLE contractor_companies 
ADD CONSTRAINT contractor_companies_status_check 
CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text, 'inactive'::text, 'expired'::text, 'blacklisted'::text]));

-- Update trigger function to handle all status changes properly
CREATE OR REPLACE FUNCTION handle_contractor_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- When contractor is blacklisted, suspended, or expired
  IF NEW.status IN ('blacklisted', 'suspended', 'expired') 
     AND OLD.status NOT IN ('blacklisted', 'suspended', 'expired') THEN
    -- Suspend all active projects for this contractor
    UPDATE public.ptw_projects 
    SET status = 'suspended',
        updated_at = NOW()
    WHERE contractor_company_id = NEW.id 
      AND status = 'active'
      AND deleted_at IS NULL;
      
    -- Suspend workers from this contractor
    UPDATE public.contractor_workers 
    SET approval_status = 'suspended',
        updated_at = NOW()
    WHERE company_id = NEW.id 
      AND approval_status = 'approved'
      AND deleted_at IS NULL;
  END IF;
  
  -- When contractor is reactivated
  IF NEW.status = 'active' 
     AND OLD.status IN ('blacklisted', 'suspended', 'expired') THEN
    -- Reactivate suspended workers (not rejected ones)
    UPDATE public.contractor_workers 
    SET approval_status = 'approved',
        updated_at = NOW()
    WHERE company_id = NEW.id 
      AND approval_status = 'suspended'
      AND deleted_at IS NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;