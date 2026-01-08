-- Add missing site rep columns to contractor_companies
ALTER TABLE contractor_companies
ADD COLUMN IF NOT EXISTS contractor_site_rep_national_id text,
ADD COLUMN IF NOT EXISTS contractor_site_rep_mobile text,
ADD COLUMN IF NOT EXISTS contractor_site_rep_nationality text,
ADD COLUMN IF NOT EXISTS contractor_site_rep_photo text;