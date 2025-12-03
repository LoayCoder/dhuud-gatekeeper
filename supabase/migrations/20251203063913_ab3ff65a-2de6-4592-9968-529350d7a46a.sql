-- Add latitude and longitude columns to sites table
ALTER TABLE public.sites 
ADD COLUMN latitude double precision,
ADD COLUMN longitude double precision;