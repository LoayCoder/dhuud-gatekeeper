-- Add card_image_path column to store the generated ID card image path
ALTER TABLE public.contractor_company_access_qr 
ADD COLUMN IF NOT EXISTS card_image_path TEXT;