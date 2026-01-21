-- Clean Slate: DROP legacy site rep and safety officer columns from contractor_companies
-- These columns have been migrated to contractor_representatives and contractor_safety_officers tables

ALTER TABLE contractor_companies 
  DROP COLUMN IF EXISTS contractor_site_rep_name,
  DROP COLUMN IF EXISTS contractor_site_rep_email,
  DROP COLUMN IF EXISTS contractor_site_rep_phone,
  DROP COLUMN IF EXISTS contractor_site_rep_mobile,
  DROP COLUMN IF EXISTS contractor_site_rep_national_id,
  DROP COLUMN IF EXISTS contractor_site_rep_nationality,
  DROP COLUMN IF EXISTS contractor_site_rep_photo,
  DROP COLUMN IF EXISTS contractor_safety_officer_name,
  DROP COLUMN IF EXISTS contractor_safety_officer_email,
  DROP COLUMN IF EXISTS contractor_safety_officer_phone;