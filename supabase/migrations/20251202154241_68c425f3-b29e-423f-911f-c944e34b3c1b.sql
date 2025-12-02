-- Add favicon_url column to tenants table
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS favicon_url text;