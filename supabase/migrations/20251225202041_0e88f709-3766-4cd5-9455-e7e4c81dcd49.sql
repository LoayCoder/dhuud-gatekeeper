-- Add recognition columns to incidents table for positive observations
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS recognition_type TEXT;
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS recognized_user_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.incidents ADD COLUMN IF NOT EXISTS recognized_contractor_worker_id UUID REFERENCES public.contractor_workers(id);

-- Add comment for documentation
COMMENT ON COLUMN public.incidents.recognition_type IS 'Type of recognition for positive observations: individual, department, or contractor';
COMMENT ON COLUMN public.incidents.recognized_user_id IS 'User being recognized for positive observation';
COMMENT ON COLUMN public.incidents.recognized_contractor_worker_id IS 'Contractor worker being recognized for positive observation';

-- Create index for faster lookups on recognition queries
CREATE INDEX IF NOT EXISTS idx_incidents_recognized_user_id ON public.incidents(recognized_user_id) WHERE recognized_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_recognized_contractor_worker_id ON public.incidents(recognized_contractor_worker_id) WHERE recognized_contractor_worker_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incidents_recognition_type ON public.incidents(recognition_type) WHERE recognition_type IS NOT NULL;