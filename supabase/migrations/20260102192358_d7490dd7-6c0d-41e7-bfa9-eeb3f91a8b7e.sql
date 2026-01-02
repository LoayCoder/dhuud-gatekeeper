-- Add foreign key for host_id referencing profiles
ALTER TABLE public.visit_requests
ADD CONSTRAINT visit_requests_host_id_fkey
FOREIGN KEY (host_id) REFERENCES public.profiles(id);

-- Add foreign key for approved_by referencing profiles
ALTER TABLE public.visit_requests
ADD CONSTRAINT visit_requests_approved_by_fkey
FOREIGN KEY (approved_by) REFERENCES public.profiles(id);