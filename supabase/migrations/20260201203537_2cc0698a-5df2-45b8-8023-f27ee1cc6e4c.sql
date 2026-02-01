-- Add missing club management acknowledgment columns for the complete approval workflow
ALTER TABLE public.material_gate_passes
ADD COLUMN IF NOT EXISTS club_mgmt_ack_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS club_mgmt_ack_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS club_mgmt_ack_notes TEXT;

-- Add index for faster lookups on pending club management acknowledgments
CREATE INDEX IF NOT EXISTS idx_material_gate_passes_club_mgmt_ack
ON public.material_gate_passes(club_mgmt_ack_by)
WHERE deleted_at IS NULL;