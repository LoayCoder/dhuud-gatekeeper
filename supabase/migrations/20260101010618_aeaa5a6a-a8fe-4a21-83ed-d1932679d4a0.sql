-- Insert Worker Induction Video Template for all tenants
INSERT INTO notification_templates (tenant_id, slug, category, channel_type, content_pattern, variable_keys, language, is_active, default_gateway)
SELECT 
  id as tenant_id,
  'worker_induction_video' as slug,
  'contractors' as category,
  'whatsapp' as channel_type,
  'مرحباً {{worker_name}}،

مطلوب منك إكمال فيديو السلامة التالي قبل بدء العمل في مشروع {{project_name}}:

🎬 الفيديو: {{video_title}}
⏱️ المدة: {{duration_min}} دقيقة
🔗 الرابط: {{video_url}}

يرجى مشاهدة الفيديو والموافقة على شروط السلامة.

---

Hello {{worker_name}},

Please complete the following safety induction video before starting work on {{project_name}} project:

🎬 Video: {{video_title}}
⏱️ Duration: {{duration_min}} minutes
🔗 Link: {{video_url}}

Please watch the video and acknowledge the safety terms.' as content_pattern,
  ARRAY['worker_name', 'project_name', 'video_title', 'duration_min', 'video_url'] as variable_keys,
  'ar' as language,
  true as is_active,
  'wasender' as default_gateway
FROM tenants
ON CONFLICT DO NOTHING;

-- Insert Worker QR Code Access Template for all tenants
INSERT INTO notification_templates (tenant_id, slug, category, channel_type, content_pattern, variable_keys, language, is_active, default_gateway)
SELECT 
  id as tenant_id,
  'worker_qr_code_access' as slug,
  'contractors' as category,
  'whatsapp' as channel_type,
  '✅ {{worker_name}}، تم إنشاء رمز QR الخاص بك!

🏗️ المشروع: {{project_name}}
📅 صالح حتى: {{expiry_date}}

📱 أظهر رمز QR هذا عند البوابة للدخول.

---

✅ {{worker_name}}, your site access QR code is ready!

🏗️ Project: {{project_name}}
📅 Valid until: {{expiry_date}}

📱 Show this QR code at the gate for entry.' as content_pattern,
  ARRAY['worker_name', 'project_name', 'expiry_date'] as variable_keys,
  'ar' as language,
  true as is_active,
  'wasender' as default_gateway
FROM tenants
ON CONFLICT DO NOTHING;