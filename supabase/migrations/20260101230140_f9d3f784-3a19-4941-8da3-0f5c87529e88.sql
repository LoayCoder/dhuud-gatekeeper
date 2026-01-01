-- Add qr_used_at column to track one-time use of visitor QR codes
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS qr_used_at TIMESTAMPTZ DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.visitors.qr_used_at IS 'Timestamp when the visitor QR code was used for entry. NULL means not yet used.';