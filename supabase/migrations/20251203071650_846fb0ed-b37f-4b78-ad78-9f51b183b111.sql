-- Add business registration fields to tenants table
ALTER TABLE public.tenants
ADD COLUMN cr_number text,
ADD COLUMN vat_number text,
ADD COLUMN employee_count integer;