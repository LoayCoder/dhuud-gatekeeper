-- Add project manager to contractor_projects
ALTER TABLE public.contractor_projects 
ADD COLUMN IF NOT EXISTS project_manager_id UUID REFERENCES public.profiles(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contractor_projects_pm ON public.contractor_projects(project_manager_id);

-- Add QR code and verification fields to material_gate_passes
ALTER TABLE public.material_gate_passes
ADD COLUMN IF NOT EXISTS qr_code_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS qr_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS entry_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS entry_confirmed_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS exit_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS exit_confirmed_by UUID REFERENCES public.profiles(id);

-- Create index for QR token lookup
CREATE INDEX IF NOT EXISTS idx_gate_passes_qr_token ON public.material_gate_passes(qr_code_token);

-- Function to generate QR token when fully approved
CREATE OR REPLACE FUNCTION public.generate_gate_pass_qr_token()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate QR token when both PM and safety have approved
  IF NEW.pm_approved_at IS NOT NULL 
     AND NEW.safety_approved_at IS NOT NULL 
     AND OLD.qr_code_token IS NULL 
     AND NEW.qr_code_token IS NULL THEN
    NEW.qr_code_token := 'GP-' || encode(gen_random_bytes(16), 'hex');
    NEW.qr_generated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for QR generation
DROP TRIGGER IF EXISTS generate_qr_on_approval ON public.material_gate_passes;
CREATE TRIGGER generate_qr_on_approval
  BEFORE UPDATE ON public.material_gate_passes
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_gate_pass_qr_token();