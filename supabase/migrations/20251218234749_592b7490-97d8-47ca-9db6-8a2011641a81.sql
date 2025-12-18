-- Add is_internal_work column to ptw_projects table
ALTER TABLE public.ptw_projects 
ADD COLUMN is_internal_work BOOLEAN DEFAULT FALSE NOT NULL;