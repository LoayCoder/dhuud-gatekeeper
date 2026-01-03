-- Phase 1: Standardize nationality codes from full names to ISO 2-letter codes
UPDATE contractor_workers SET nationality = 'SA' WHERE LOWER(nationality) = 'saudi arabia' AND deleted_at IS NULL;
UPDATE contractor_workers SET nationality = 'BD' WHERE LOWER(nationality) = 'bangladesh' AND deleted_at IS NULL;
UPDATE contractor_workers SET nationality = 'IN' WHERE LOWER(nationality) = 'india' AND deleted_at IS NULL;
UPDATE contractor_workers SET nationality = 'EG' WHERE LOWER(nationality) = 'egypt' AND deleted_at IS NULL;
UPDATE contractor_workers SET nationality = 'PK' WHERE LOWER(nationality) = 'pakistan' AND deleted_at IS NULL;
UPDATE contractor_workers SET nationality = 'AE' WHERE LOWER(nationality) = 'united arab emirates' AND deleted_at IS NULL;
UPDATE contractor_workers SET nationality = 'YE' WHERE LOWER(nationality) = 'yemen' AND deleted_at IS NULL;
UPDATE contractor_workers SET nationality = 'SY' WHERE LOWER(nationality) = 'syria' AND deleted_at IS NULL;
UPDATE contractor_workers SET nationality = 'JO' WHERE LOWER(nationality) = 'jordan' AND deleted_at IS NULL;
UPDATE contractor_workers SET nationality = 'IQ' WHERE LOWER(nationality) = 'iraq' AND deleted_at IS NULL;
UPDATE contractor_workers SET nationality = 'PH' WHERE LOWER(nationality) = 'philippines' AND deleted_at IS NULL;
UPDATE contractor_workers SET nationality = 'CN' WHERE LOWER(nationality) = 'china' AND deleted_at IS NULL;
UPDATE contractor_workers SET nationality = 'NP' WHERE LOWER(nationality) = 'nepal' AND deleted_at IS NULL;
UPDATE contractor_workers SET nationality = 'ID' WHERE LOWER(nationality) = 'indonesia' AND deleted_at IS NULL;
UPDATE contractor_workers SET nationality = 'LK' WHERE LOWER(nationality) = 'sri lanka' AND deleted_at IS NULL;
UPDATE contractor_workers SET nationality = 'SD' WHERE LOWER(nationality) = 'sudan' AND deleted_at IS NULL;
UPDATE contractor_workers SET nationality = 'OM' WHERE LOWER(nationality) = 'oman' AND deleted_at IS NULL;
UPDATE contractor_workers SET nationality = 'KW' WHERE LOWER(nationality) = 'kuwait' AND deleted_at IS NULL;
UPDATE contractor_workers SET nationality = 'BH' WHERE LOWER(nationality) = 'bahrain' AND deleted_at IS NULL;
UPDATE contractor_workers SET nationality = 'QA' WHERE LOWER(nationality) = 'qatar' AND deleted_at IS NULL;
UPDATE contractor_workers SET nationality = 'LB' WHERE LOWER(nationality) = 'lebanon' AND deleted_at IS NULL;
UPDATE contractor_workers SET nationality = 'PS' WHERE LOWER(nationality) = 'palestine' AND deleted_at IS NULL;
UPDATE contractor_workers SET nationality = 'MA' WHERE LOWER(nationality) = 'morocco' AND deleted_at IS NULL;
UPDATE contractor_workers SET nationality = 'TN' WHERE LOWER(nationality) = 'tunisia' AND deleted_at IS NULL;
UPDATE contractor_workers SET nationality = 'DZ' WHERE LOWER(nationality) = 'algeria' AND deleted_at IS NULL;
UPDATE contractor_workers SET nationality = 'LY' WHERE LOWER(nationality) = 'libya' AND deleted_at IS NULL;

-- Phase 3: Create notification templates with correct slugs
-- Arabic Template
INSERT INTO notification_templates (tenant_id, slug, meta_template_name, content_pattern, variable_keys, default_gateway, category, language, is_active, channel_type)
SELECT 
  tenant_id,
  'induction_video_ar',
  NULL,
  'مرحباً {{worker_name}}،

أنت مدعو لإكمال تدريب السلامة لمشروع {{project_name}}.

📹 الفيديو: {{video_title}}
⏱️ المدة: {{video_duration}}

🔗 اضغط هنا للبدء:
{{induction_link}}

شكراً لك،
فريق السلامة',
  ARRAY['worker_name', 'project_name', 'video_title', 'video_duration', 'induction_link'],
  'wasender',
  'inductions',
  'ar',
  true,
  'whatsapp'
FROM (SELECT DISTINCT tenant_id FROM contractor_workers WHERE tenant_id IS NOT NULL LIMIT 1) t
WHERE NOT EXISTS (SELECT 1 FROM notification_templates WHERE slug = 'induction_video_ar');

-- English Template
INSERT INTO notification_templates (tenant_id, slug, meta_template_name, content_pattern, variable_keys, default_gateway, category, language, is_active, channel_type)
SELECT 
  tenant_id,
  'induction_video_en',
  NULL,
  'Hello {{worker_name}},

You are invited to complete safety induction for {{project_name}}.

📹 Video: {{video_title}}
⏱️ Duration: {{video_duration}}

🔗 Click here to start:
{{induction_link}}

Thank you,
Safety Team',
  ARRAY['worker_name', 'project_name', 'video_title', 'video_duration', 'induction_link'],
  'wasender',
  'inductions',
  'en',
  true,
  'whatsapp'
FROM (SELECT DISTINCT tenant_id FROM contractor_workers WHERE tenant_id IS NOT NULL LIMIT 1) t
WHERE NOT EXISTS (SELECT 1 FROM notification_templates WHERE slug = 'induction_video_en');

-- Urdu Template
INSERT INTO notification_templates (tenant_id, slug, meta_template_name, content_pattern, variable_keys, default_gateway, category, language, is_active, channel_type)
SELECT 
  tenant_id,
  'induction_video_ur',
  NULL,
  'السلام علیکم {{worker_name}}،

آپ کو {{project_name}} کے لیے حفاظتی تربیت مکمل کرنے کی دعوت ہے۔

📹 ویڈیو: {{video_title}}
⏱️ دورانیہ: {{video_duration}}

🔗 شروع کرنے کے لیے یہاں کلک کریں:
{{induction_link}}

شکریہ،
سیفٹی ٹیم',
  ARRAY['worker_name', 'project_name', 'video_title', 'video_duration', 'induction_link'],
  'wasender',
  'inductions',
  'ur',
  true,
  'whatsapp'
FROM (SELECT DISTINCT tenant_id FROM contractor_workers WHERE tenant_id IS NOT NULL LIMIT 1) t
WHERE NOT EXISTS (SELECT 1 FROM notification_templates WHERE slug = 'induction_video_ur');

-- Hindi Template
INSERT INTO notification_templates (tenant_id, slug, meta_template_name, content_pattern, variable_keys, default_gateway, category, language, is_active, channel_type)
SELECT 
  tenant_id,
  'induction_video_hi',
  NULL,
  'नमस्ते {{worker_name}},

आपको {{project_name}} के लिए सुरक्षा प्रशिक्षण पूरा करने के लिए आमंत्रित किया गया है।

📹 वीडियो: {{video_title}}
⏱️ अवधि: {{video_duration}}

🔗 शुरू करने के लिए यहां क्लिक करें:
{{induction_link}}

धन्यवाद,
सेफ्टी टीम',
  ARRAY['worker_name', 'project_name', 'video_title', 'video_duration', 'induction_link'],
  'wasender',
  'inductions',
  'hi',
  true,
  'whatsapp'
FROM (SELECT DISTINCT tenant_id FROM contractor_workers WHERE tenant_id IS NOT NULL LIMIT 1) t
WHERE NOT EXISTS (SELECT 1 FROM notification_templates WHERE slug = 'induction_video_hi');

-- Filipino Template
INSERT INTO notification_templates (tenant_id, slug, meta_template_name, content_pattern, variable_keys, default_gateway, category, language, is_active, channel_type)
SELECT 
  tenant_id,
  'induction_video_fil',
  NULL,
  'Kumusta {{worker_name}},

Iniimbitahan ka para kumpletuhin ang safety induction para sa {{project_name}}.

📹 Video: {{video_title}}
⏱️ Tagal: {{video_duration}}

🔗 I-click dito para magsimula:
{{induction_link}}

Salamat,
Safety Team',
  ARRAY['worker_name', 'project_name', 'video_title', 'video_duration', 'induction_link'],
  'wasender',
  'inductions',
  'fil',
  true,
  'whatsapp'
FROM (SELECT DISTINCT tenant_id FROM contractor_workers WHERE tenant_id IS NOT NULL LIMIT 1) t
WHERE NOT EXISTS (SELECT 1 FROM notification_templates WHERE slug = 'induction_video_fil');

-- Chinese Template
INSERT INTO notification_templates (tenant_id, slug, meta_template_name, content_pattern, variable_keys, default_gateway, category, language, is_active, channel_type)
SELECT 
  tenant_id,
  'induction_video_zh',
  NULL,
  '您好 {{worker_name}}，

您被邀请完成 {{project_name}} 的安全培训。

📹 视频：{{video_title}}
⏱️ 时长：{{video_duration}}

🔗 点击这里开始：
{{induction_link}}

谢谢，
安全团队',
  ARRAY['worker_name', 'project_name', 'video_title', 'video_duration', 'induction_link'],
  'wasender',
  'inductions',
  'zh',
  true,
  'whatsapp'
FROM (SELECT DISTINCT tenant_id FROM contractor_workers WHERE tenant_id IS NOT NULL LIMIT 1) t
WHERE NOT EXISTS (SELECT 1 FROM notification_templates WHERE slug = 'induction_video_zh');