-- Add new columns to visitors table for user type and host information
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'external' CHECK (user_type IN ('internal', 'external'));
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS host_name TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS host_phone TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS host_email TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS qr_generated_at TIMESTAMPTZ;

-- Add new columns to visit_requests table for tracking QR issuance and host notification
ALTER TABLE public.visit_requests ADD COLUMN IF NOT EXISTS qr_issued_at TIMESTAMPTZ;
ALTER TABLE public.visit_requests ADD COLUMN IF NOT EXISTS host_notified_at TIMESTAMPTZ;

-- Add comment for clarity
COMMENT ON COLUMN public.visitors.user_type IS 'Type of visitor: internal (platform user) or external';
COMMENT ON COLUMN public.visitors.host_id IS 'Reference to internal host user profile';
COMMENT ON COLUMN public.visitors.qr_generated_at IS 'Timestamp when QR code was generated after approval';
COMMENT ON COLUMN public.visit_requests.qr_issued_at IS 'Timestamp when QR code was issued to visitor';
COMMENT ON COLUMN public.visit_requests.host_notified_at IS 'Timestamp when host was notified via WhatsApp';