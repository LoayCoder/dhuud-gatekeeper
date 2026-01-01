-- Add HSSE department name columns to tenants table
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS hsse_department_name TEXT,
ADD COLUMN IF NOT EXISTS hsse_department_name_ar TEXT;