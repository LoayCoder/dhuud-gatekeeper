-- Create ID Card Settings table for tenant-specific card designs
CREATE TABLE public.tenant_id_card_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  card_type TEXT NOT NULL CHECK (card_type IN ('visitor', 'visitor_vip', 'worker', 'employee', 'contractor_rep')),
  
  -- Front Side Configuration
  front_bg_color VARCHAR(7) DEFAULT '#FFFFFF',
  front_accent_color VARCHAR(7) DEFAULT '#1e40af',
  front_text_color VARCHAR(7) DEFAULT '#1f2937',
  show_photo BOOLEAN DEFAULT true,
  show_qr_code BOOLEAN DEFAULT true,
  qr_position TEXT DEFAULT 'right' CHECK (qr_position IN ('left', 'right', 'bottom')),
  
  -- Front Side Fields (ordered array of field keys)
  front_fields JSONB DEFAULT '["full_name", "company", "role", "valid_until"]',
  
  -- Back Side Configuration (optional)
  back_enabled BOOLEAN DEFAULT false,
  back_bg_color VARCHAR(7) DEFAULT '#f3f4f6',
  back_fields JSONB DEFAULT '["emergency_contact", "safety_instructions"]',
  back_custom_text TEXT,
  back_custom_text_ar TEXT,
  
  -- Card Dimensions (CR-80 standard: 85.6mm x 54mm)
  card_orientation TEXT DEFAULT 'landscape' CHECK (card_orientation IN ('portrait', 'landscape')),
  
  -- Branding
  show_logo BOOLEAN DEFAULT true,
  logo_position TEXT DEFAULT 'top-left' CHECK (logo_position IN ('top-left', 'top-right', 'top-center')),
  show_tenant_name BOOLEAN DEFAULT true,
  
  -- Template preset (for quick selection)
  template_preset TEXT DEFAULT 'standard' CHECK (template_preset IN ('standard', 'minimal', 'corporate', 'safety')),
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  
  UNIQUE(tenant_id, card_type)
);

-- Enable RLS
ALTER TABLE public.tenant_id_card_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their tenant settings" 
  ON public.tenant_id_card_settings FOR SELECT 
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage their tenant settings" 
  ON public.tenant_id_card_settings FOR ALL 
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Add tracking columns to profiles for employee ID cards
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS id_card_image_path TEXT,
  ADD COLUMN IF NOT EXISTS id_card_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS id_card_sent_at TIMESTAMPTZ;

-- Add tracking columns to visitors
ALTER TABLE public.visitors 
  ADD COLUMN IF NOT EXISTS id_card_image_path TEXT,
  ADD COLUMN IF NOT EXISTS id_card_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS id_card_sent_at TIMESTAMPTZ;

-- Add tracking columns to contractor_workers
ALTER TABLE public.contractor_workers 
  ADD COLUMN IF NOT EXISTS id_card_image_path TEXT,
  ADD COLUMN IF NOT EXISTS id_card_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS id_card_sent_at TIMESTAMPTZ;

-- Create storage bucket for ID cards (private)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('id-cards', 'id-cards', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for ID cards bucket
CREATE POLICY "Tenant users can view their ID cards" 
  ON storage.objects FOR SELECT 
  USING (
    bucket_id = 'id-cards' 
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Tenant users can upload ID cards" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'id-cards' 
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
  );

-- Create updated_at trigger for settings table
CREATE TRIGGER update_tenant_id_card_settings_updated_at
  BEFORE UPDATE ON public.tenant_id_card_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();