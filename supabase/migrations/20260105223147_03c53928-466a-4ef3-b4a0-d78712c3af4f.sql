-- Phase 2: Add signature columns to shift_handovers for digital signature support
ALTER TABLE public.shift_handovers 
ADD COLUMN IF NOT EXISTS outgoing_signature text,
ADD COLUMN IF NOT EXISTS incoming_signature text,
ADD COLUMN IF NOT EXISTS signature_timestamp timestamptz;