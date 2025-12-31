-- Insert notification templates for contractor module
-- Template 1: Welcome notification for new contractor companies
INSERT INTO public.notification_templates (
  tenant_id,
  slug,
  meta_template_name,
  content_pattern,
  variable_keys,
  default_gateway,
  category,
  language,
  is_active,
  channel_type,
  email_subject
) 
SELECT 
  t.id,
  'contractor_company_welcome',
  NULL,
  'Welcome {{1}}! 

Your company {{2}} has been registered with {{3}}.

Contract valid until: {{4}}

You will receive your access credentials shortly.

مرحباً {{1}}!

تم تسجيل شركتكم {{2}} لدى {{3}}.

العقد صالح حتى: {{4}}

ستتلقون بيانات الدخول قريباً.',
  ARRAY['person_name', 'company_name', 'tenant_name', 'contract_end_date'],
  'wasender',
  'contractors',
  'ar',
  true,
  'both',
  'Welcome to {{tenant_name}} - Contractor Access Confirmed | مرحباً بكم'
FROM public.tenants t
ON CONFLICT DO NOTHING;

-- Template 2: Contractor ID Card notification
INSERT INTO public.notification_templates (
  tenant_id,
  slug,
  meta_template_name,
  content_pattern,
  variable_keys,
  default_gateway,
  category,
  language,
  is_active,
  channel_type,
  email_subject
)
SELECT 
  t.id,
  'contractor_id_card',
  NULL,
  '🪪 *{{1}}*
━━━━━━━━━━━━━━━━━━
*CONTRACTOR ACCESS CARD*
بطاقة دخول المقاول
━━━━━━━━━━━━━━━━━━

👤 *{{2}}*

🏢 {{3}}

💼 {{4}}
     {{5}}

📅 Valid until: {{6}}

━━━━━━━━━━━━━━━━━━
🔐 *ACCESS CODE*
`{{7}}`
━━━━━━━━━━━━━━━━━━

📱 Scan QR or present code at gate
امسح الرمز أو قدمه عند البوابة

🔗 {{8}}',
  ARRAY['tenant_name', 'person_name', 'company_name', 'role', 'role_ar', 'valid_until', 'qr_token', 'qr_url'],
  'wasender',
  'contractors',
  'ar',
  true,
  'both',
  'Contractor Access Card - {{company_name}} | بطاقة دخول المقاول'
FROM public.tenants t
ON CONFLICT DO NOTHING;