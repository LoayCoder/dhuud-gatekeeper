-- Insert contractor approval templates for Dhuud Platform tenant
-- Copy from Golf Saudi tenant templates
INSERT INTO notification_templates (
  tenant_id, 
  slug, 
  content_pattern, 
  variable_keys, 
  category, 
  language, 
  channel_type, 
  email_subject, 
  is_active
)
SELECT 
  '9290e913-c735-405c-91c6-141e966011ae' as tenant_id,
  slug,
  content_pattern,
  variable_keys,
  category,
  language,
  channel_type,
  email_subject,
  is_active
FROM notification_templates
WHERE tenant_id = 'e30ae1a5-7eab-4776-bd0b-bb0b391e68e8'
AND slug IN (
  'company_approved_en', 'company_approved_ar',
  'company_rejected_en', 'company_rejected_ar',
  'worker_stage1_approved_en', 'worker_stage1_approved_ar',
  'worker_security_approved_en', 'worker_security_approved_ar',
  'worker_rejected_en', 'worker_rejected_ar',
  'worker_security_returned_en', 'worker_security_returned_ar'
)
AND NOT EXISTS (
  SELECT 1 FROM notification_templates nt2 
  WHERE nt2.tenant_id = '9290e913-c735-405c-91c6-141e966011ae' 
  AND nt2.slug = notification_templates.slug
);