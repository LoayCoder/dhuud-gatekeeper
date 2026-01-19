-- Add department_id to contractor_projects
ALTER TABLE contractor_projects 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);

-- Add site_id and department_id to visitors
ALTER TABLE visitors 
ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id),
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);

-- Add department_id to visit_requests
ALTER TABLE visit_requests 
ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(id);