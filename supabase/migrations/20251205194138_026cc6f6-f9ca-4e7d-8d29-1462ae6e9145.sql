-- Create supported_currencies reference table
CREATE TABLE public.supported_currencies (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  symbol TEXT NOT NULL,
  symbol_ar TEXT,
  decimal_places INTEGER NOT NULL DEFAULT 2,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supported_currencies ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read currencies (reference data)
CREATE POLICY "Currencies are viewable by authenticated users"
ON public.supported_currencies
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins can manage currencies
CREATE POLICY "Admins can manage currencies"
ON public.supported_currencies
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed GCC currencies, USD, and CNY
INSERT INTO public.supported_currencies (code, name, name_ar, symbol, symbol_ar, decimal_places, sort_order) VALUES
  ('SAR', 'Saudi Riyal', 'ريال سعودي', 'SAR', 'ر.س', 2, 1),
  ('AED', 'UAE Dirham', 'درهم إماراتي', 'AED', 'د.إ', 2, 2),
  ('BHD', 'Bahraini Dinar', 'دينار بحريني', 'BHD', 'د.ب', 3, 3),
  ('KWD', 'Kuwaiti Dinar', 'دينار كويتي', 'KWD', 'د.ك', 3, 4),
  ('OMR', 'Omani Rial', 'ريال عماني', 'OMR', 'ر.ع', 3, 5),
  ('QAR', 'Qatari Riyal', 'ريال قطري', 'QAR', 'ر.ق', 2, 6),
  ('USD', 'US Dollar', 'دولار أمريكي', 'USD', '$', 2, 7),
  ('CNY', 'Chinese Yuan', 'يوان صيني', 'CNY', '¥', 2, 8);

-- Add preferred_currency column to tenants table
ALTER TABLE public.tenants 
ADD COLUMN preferred_currency TEXT NOT NULL DEFAULT 'SAR';

-- Create index for currency lookups
CREATE INDEX idx_supported_currencies_active ON public.supported_currencies(is_active, sort_order);