-- Phase 1b: Clean up duplicates and create schema

-- 1.0 Modify trigger function temporarily to allow migration cleanup
CREATE OR REPLACE FUNCTION prevent_contractor_rep_status_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip check if auth.uid() is null (migration context)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- If user is a contractor rep (not admin/doc controller)
  IF NOT has_document_controller_access(auth.uid()) 
     AND NOT is_admin(auth.uid()) 
  THEN
    -- Block changes to sensitive fields
    IF OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
      RAISE EXCEPTION 'Contractor representatives cannot change worker approval status';
    END IF;
    IF OLD.deleted_at IS DISTINCT FROM NEW.deleted_at THEN
      RAISE EXCEPTION 'Contractor representatives cannot delete workers';
    END IF;
    IF OLD.approved_by IS DISTINCT FROM NEW.approved_by THEN
      RAISE EXCEPTION 'Contractor representatives cannot set approval details';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 1.0a Clean up duplicate site reps in contractor_workers (keep the oldest one)
WITH ranked_site_reps AS (
  SELECT id, company_id, 
    ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at ASC) as rn
  FROM contractor_workers
  WHERE worker_type = 'site_representative' AND deleted_at IS NULL
)
UPDATE contractor_workers 
SET deleted_at = now()
WHERE id IN (SELECT id FROM ranked_site_reps WHERE rn > 1);

-- 1.1 Add contractor roles to roles table
INSERT INTO roles (id, code, name, category, description, is_system, is_active)
VALUES 
  (gen_random_uuid(), 'contractor_site_rep', 'Contractor Site Representative', 'contractor', 'Primary contact for contractor company on site', false, true),
  (gen_random_uuid(), 'contractor_safety_officer', 'Contractor Safety Officer', 'contractor', 'Safety officer assigned by contractor company', false, true)
ON CONFLICT DO NOTHING;

-- 1.2 Extend contractor_safety_officers table with additional fields
ALTER TABLE contractor_safety_officers
ADD COLUMN IF NOT EXISTS national_id text,
ADD COLUMN IF NOT EXISTS mobile_number text,
ADD COLUMN IF NOT EXISTS nationality text,
ADD COLUMN IF NOT EXISTS photo_path text,
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS worker_id uuid REFERENCES contractor_workers(id);

-- 1.3 Create contractor_site_representatives table (enforces ONE per company)
CREATE TABLE IF NOT EXISTS contractor_site_representatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  company_id uuid NOT NULL REFERENCES contractor_companies(id),
  worker_id uuid REFERENCES contractor_workers(id),
  user_id uuid REFERENCES auth.users(id),
  full_name text NOT NULL,
  national_id text NOT NULL,
  mobile_number text NOT NULL,
  phone text,
  email text,
  nationality text,
  photo_path text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT unique_site_rep_per_company UNIQUE (company_id)
);

-- Enable RLS on contractor_site_representatives
ALTER TABLE contractor_site_representatives ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contractor_site_representatives
CREATE POLICY "Users can view site reps in their tenant" 
ON contractor_site_representatives 
FOR SELECT 
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert site reps in their tenant" 
ON contractor_site_representatives 
FOR INSERT 
WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update site reps in their tenant" 
ON contractor_site_representatives 
FOR UPDATE 
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete site reps in their tenant" 
ON contractor_site_representatives 
FOR DELETE 
USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- 1.4 Create unique index for site rep in contractor_workers (soft delete aware)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_site_rep_per_company_workers
ON contractor_workers (company_id) 
WHERE worker_type = 'site_representative' AND deleted_at IS NULL;

-- 1.5 Create unique index for safety officer email within tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_safety_officer_email 
ON contractor_safety_officers (tenant_id, email) 
WHERE email IS NOT NULL AND deleted_at IS NULL;

-- 1.6 Create trigger to update updated_at on contractor_site_representatives
CREATE OR REPLACE FUNCTION update_contractor_site_rep_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_contractor_site_representatives_updated_at ON contractor_site_representatives;
CREATE TRIGGER update_contractor_site_representatives_updated_at
BEFORE UPDATE ON contractor_site_representatives
FOR EACH ROW
EXECUTE FUNCTION update_contractor_site_rep_updated_at();

-- 1.7 Migrate existing site rep data from contractor_companies to new table
INSERT INTO contractor_site_representatives (
  tenant_id, company_id, full_name, national_id, mobile_number, 
  phone, email, nationality, photo_path, status
)
SELECT DISTINCT ON (cc.id)
  cc.tenant_id,
  cc.id,
  COALESCE(cc.contractor_site_rep_name, 'Unknown'),
  COALESCE(cc.contractor_site_rep_national_id, 'Unknown'),
  COALESCE(cc.contractor_site_rep_mobile, 'Unknown'),
  cc.contractor_site_rep_phone,
  cc.contractor_site_rep_email,
  cc.contractor_site_rep_nationality,
  cc.contractor_site_rep_photo,
  'active'
FROM contractor_companies cc
WHERE cc.deleted_at IS NULL
  AND cc.contractor_site_rep_name IS NOT NULL
  AND cc.contractor_site_rep_name != ''
ON CONFLICT (company_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  national_id = EXCLUDED.national_id,
  mobile_number = EXCLUDED.mobile_number,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email,
  nationality = EXCLUDED.nationality,
  photo_path = EXCLUDED.photo_path;