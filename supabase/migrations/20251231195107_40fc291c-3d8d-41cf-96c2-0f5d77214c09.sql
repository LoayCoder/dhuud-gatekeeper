-- Add comprehensive contractor company information columns
ALTER TABLE contractor_companies 
ADD COLUMN IF NOT EXISTS scope_of_work TEXT,
ADD COLUMN IF NOT EXISTS contractor_site_rep_name TEXT,
ADD COLUMN IF NOT EXISTS contractor_site_rep_phone TEXT,
ADD COLUMN IF NOT EXISTS contractor_site_rep_email TEXT,
ADD COLUMN IF NOT EXISTS contractor_safety_officer_name TEXT,
ADD COLUMN IF NOT EXISTS contractor_safety_officer_phone TEXT,
ADD COLUMN IF NOT EXISTS contractor_safety_officer_email TEXT,
ADD COLUMN IF NOT EXISTS client_site_rep_id UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS assigned_branch_id UUID REFERENCES branches(id),
ADD COLUMN IF NOT EXISTS assigned_department_id UUID REFERENCES departments(id),
ADD COLUMN IF NOT EXISTS assigned_section_id UUID REFERENCES sections(id),
ADD COLUMN IF NOT EXISTS contract_start_date DATE,
ADD COLUMN IF NOT EXISTS contract_end_date DATE,
ADD COLUMN IF NOT EXISTS total_workers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS safety_officers_count INTEGER DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN contractor_companies.scope_of_work IS 'General scope of work description for the contractor';
COMMENT ON COLUMN contractor_companies.contractor_site_rep_name IS 'Contractor site representative name';
COMMENT ON COLUMN contractor_companies.contractor_safety_officer_name IS 'Contractor safety officer name';
COMMENT ON COLUMN contractor_companies.client_site_rep_id IS 'Company/Client site representative (reference to profiles)';
COMMENT ON COLUMN contractor_companies.total_workers IS 'Total number of workers for safety ratio calculation';
COMMENT ON COLUMN contractor_companies.safety_officers_count IS 'Number of safety officers for ratio calculation';