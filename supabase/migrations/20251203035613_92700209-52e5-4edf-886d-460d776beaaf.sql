-- Add latitude and longitude columns to branches table
ALTER TABLE public.branches 
ADD COLUMN latitude DOUBLE PRECISION,
ADD COLUMN longitude DOUBLE PRECISION;