-- Seed test data for contractor module

-- Insert sample contractor companies
INSERT INTO public.contractor_companies (id, tenant_id, company_name, company_name_ar, email, phone, status, city, address)
SELECT 
  gen_random_uuid(),
  t.id,
  company_data.name,
  company_data.name_ar,
  company_data.email,
  company_data.phone,
  company_data.status,
  company_data.city,
  company_data.address
FROM public.tenants t
CROSS JOIN (VALUES
  ('Al-Faris Construction', 'الفارس للبناء', 'info@alfaris.com', '+966501234567', 'active', 'Riyadh', 'King Fahd Road'),
  ('Gulf Safety Services', 'خدمات الخليج للسلامة', 'contact@gulfsafety.com', '+966507654321', 'active', 'Dammam', 'Industrial Area'),
  ('National Maintenance Co', 'الصيانة الوطنية', 'support@natmaint.com', '+966509876543', 'pending', 'Jeddah', 'Tahlia Street')
) AS company_data(name, name_ar, email, phone, status, city, address)
WHERE NOT EXISTS (
  SELECT 1 FROM public.contractor_companies WHERE company_name = company_data.name
)
LIMIT 3;

-- Insert sample contractor workers (linked to the first company per tenant)
INSERT INTO public.contractor_workers (id, tenant_id, company_id, full_name, full_name_ar, national_id, mobile_number, nationality, approval_status, preferred_language)
SELECT 
  gen_random_uuid(),
  cc.tenant_id,
  cc.id,
  worker_data.name,
  worker_data.name_ar,
  worker_data.national_id,
  worker_data.mobile,
  worker_data.nationality,
  worker_data.status,
  worker_data.lang
FROM public.contractor_companies cc
CROSS JOIN (VALUES
  ('Ahmed Al-Rashid', 'أحمد الراشد', '1234567890', '+966551234567', 'Saudi Arabia', 'approved', 'ar'),
  ('Mohammed Hassan', 'محمد حسن', '2345678901', '+966552345678', 'Egypt', 'approved', 'ar'),
  ('Ali Khan', 'علي خان', '3456789012', '+966553456789', 'Pakistan', 'pending', 'en'),
  ('Ravi Kumar', NULL, '4567890123', '+966554567890', 'India', 'pending', 'en'),
  ('Omar Farooq', 'عمر فاروق', '5678901234', '+966555678901', 'Jordan', 'rejected', 'ar')
) AS worker_data(name, name_ar, national_id, mobile, nationality, status, lang)
WHERE cc.status = 'active'
AND NOT EXISTS (
  SELECT 1 FROM public.contractor_workers WHERE national_id = worker_data.national_id
)
LIMIT 10;