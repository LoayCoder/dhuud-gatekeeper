-- Create platform_settings table for global app configurations
CREATE TABLE public.platform_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read platform settings
CREATE POLICY "Authenticated users can read platform settings"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (true);

-- Only super admins can modify platform settings
CREATE POLICY "Super admins can manage platform settings"
ON public.platform_settings
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default splash screen configuration
INSERT INTO public.platform_settings (setting_key, value, description)
VALUES (
  'splash_screen',
  '{
    "enabled": true,
    "duration_ms": 3000,
    "message_ar": "مرحباً بك في منصة الصحة والسلامة",
    "message_en": "Welcome to HSSE Platform",
    "subtitle_ar": "نحو بيئة عمل آمنة",
    "subtitle_en": "Towards a Safe Work Environment"
  }'::jsonb,
  'Splash screen configuration shown on app launch'
);