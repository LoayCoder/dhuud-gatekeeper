-- Add comprehensive HSSE event notification templates for all languages
-- Each template includes event_type as the first variable (position {{1}})

DO $$
DECLARE
  tenant_record RECORD;
  templates_data JSONB := '[
    {
      "slug": "hsse_event_new_en",
      "language": "en",
      "content_pattern": "🔔 New {{1}} Reported\n\n🆔 Reference: {{2}}\n📋 Title: {{3}}\n📍 Location: {{4}}\n⚠️ Severity: {{5}}\n👤 Reported By: {{6}}\n🕐 Time: {{7}}\n\n📝 {{9}}\n\n🔗 View: {{8}}",
      "email_subject": "New {{1}}: {{3}} - {{2}}"
    },
    {
      "slug": "hsse_event_new_ar",
      "language": "ar",
      "content_pattern": "🔔 {{1}} جديد تم الإبلاغ عنه\n\n🆔 المرجع: {{2}}\n📋 العنوان: {{3}}\n📍 الموقع: {{4}}\n⚠️ المستوى: {{5}}\n👤 أبلغ عنه: {{6}}\n🕐 الوقت: {{7}}\n\n📝 {{9}}\n\n🔗 عرض: {{8}}",
      "email_subject": "{{1}} جديد: {{3}} - {{2}}"
    },
    {
      "slug": "hsse_event_new_ur",
      "language": "ur",
      "content_pattern": "🔔 نیا {{1}} رپورٹ ہوا\n\n🆔 حوالہ: {{2}}\n📋 عنوان: {{3}}\n📍 مقام: {{4}}\n⚠️ سطح: {{5}}\n👤 رپورٹ کنندہ: {{6}}\n🕐 وقت: {{7}}\n\n📝 {{9}}\n\n🔗 دیکھیں: {{8}}",
      "email_subject": "نیا {{1}}: {{3}} - {{2}}"
    },
    {
      "slug": "hsse_event_new_hi",
      "language": "hi",
      "content_pattern": "🔔 नया {{1}} रिपोर्ट किया गया\n\n🆔 संदर्भ: {{2}}\n📋 शीर्षक: {{3}}\n📍 स्थान: {{4}}\n⚠️ स्तर: {{5}}\n👤 रिपोर्टकर्ता: {{6}}\n🕐 समय: {{7}}\n\n📝 {{9}}\n\n🔗 देखें: {{8}}",
      "email_subject": "नया {{1}}: {{3}} - {{2}}"
    },
    {
      "slug": "hsse_event_new_fil",
      "language": "fil",
      "content_pattern": "🔔 Bagong {{1}} na Naiulat\n\n🆔 Reference: {{2}}\n📋 Pamagat: {{3}}\n📍 Lokasyon: {{4}}\n⚠️ Antas: {{5}}\n👤 Nag-ulat: {{6}}\n🕐 Oras: {{7}}\n\n📝 {{9}}\n\n🔗 Tingnan: {{8}}",
      "email_subject": "Bagong {{1}}: {{3}} - {{2}}"
    },
    {
      "slug": "hsse_event_update_en",
      "language": "en",
      "content_pattern": "📝 {{1}} Updated\n\n🆔 Reference: {{2}}\n📋 Title: {{3}}\n📍 Location: {{4}}\n⚠️ Severity: {{5}}\n\n🔗 View: {{8}}",
      "email_subject": "{{1}} Updated: {{3}} - {{2}}"
    },
    {
      "slug": "hsse_event_update_ar",
      "language": "ar",
      "content_pattern": "📝 تحديث {{1}}\n\n🆔 المرجع: {{2}}\n📋 العنوان: {{3}}\n📍 الموقع: {{4}}\n⚠️ المستوى: {{5}}\n\n🔗 عرض: {{8}}",
      "email_subject": "تحديث {{1}}: {{3}} - {{2}}"
    },
    {
      "slug": "hsse_event_update_ur",
      "language": "ur",
      "content_pattern": "📝 {{1}} اپڈیٹ ہوا\n\n🆔 حوالہ: {{2}}\n📋 عنوان: {{3}}\n📍 مقام: {{4}}\n⚠️ سطح: {{5}}\n\n🔗 دیکھیں: {{8}}",
      "email_subject": "{{1}} اپڈیٹ: {{3}} - {{2}}"
    },
    {
      "slug": "hsse_event_update_hi",
      "language": "hi",
      "content_pattern": "📝 {{1}} अपडेट किया गया\n\n🆔 संदर्भ: {{2}}\n📋 शीर्षक: {{3}}\n📍 स्थान: {{4}}\n⚠️ स्तर: {{5}}\n\n🔗 देखें: {{8}}",
      "email_subject": "{{1}} अपडेट: {{3}} - {{2}}"
    },
    {
      "slug": "hsse_event_update_fil",
      "language": "fil",
      "content_pattern": "📝 Na-update ang {{1}}\n\n🆔 Reference: {{2}}\n📋 Pamagat: {{3}}\n📍 Lokasyon: {{4}}\n⚠️ Antas: {{5}}\n\n🔗 Tingnan: {{8}}",
      "email_subject": "Na-update ang {{1}}: {{3}} - {{2}}"
    },
    {
      "slug": "hsse_event_erp_en",
      "language": "en",
      "content_pattern": "🚨 EMERGENCY - {{1}} ERP ACTIVATED 🚨\n\n🆔 Reference: {{2}}\n📋 Title: {{3}}\n📍 Location: {{4}}\n⚠️ Severity: {{5}}\n👤 Reported By: {{6}}\n🕐 Time: {{7}}\n\n📝 {{9}}\n\n⚡ IMMEDIATE ACTION REQUIRED\n🔗 View: {{8}}",
      "email_subject": "🚨 EMERGENCY {{1}}: {{3}} - {{2}}"
    },
    {
      "slug": "hsse_event_erp_ar",
      "language": "ar",
      "content_pattern": "🚨 طوارئ - تم تفعيل خطة الطوارئ لـ {{1}} 🚨\n\n🆔 المرجع: {{2}}\n📋 العنوان: {{3}}\n📍 الموقع: {{4}}\n⚠️ المستوى: {{5}}\n👤 أبلغ عنه: {{6}}\n🕐 الوقت: {{7}}\n\n📝 {{9}}\n\n⚡ مطلوب إجراء فوري\n🔗 عرض: {{8}}",
      "email_subject": "🚨 طوارئ {{1}}: {{3}} - {{2}}"
    },
    {
      "slug": "hsse_event_erp_ur",
      "language": "ur",
      "content_pattern": "🚨 ایمرجنسی - {{1}} ERP فعال 🚨\n\n🆔 حوالہ: {{2}}\n📋 عنوان: {{3}}\n📍 مقام: {{4}}\n⚠️ سطح: {{5}}\n👤 رپورٹ کنندہ: {{6}}\n🕐 وقت: {{7}}\n\n📝 {{9}}\n\n⚡ فوری کارروائی درکار\n🔗 دیکھیں: {{8}}",
      "email_subject": "🚨 ایمرجنسی {{1}}: {{3}} - {{2}}"
    },
    {
      "slug": "hsse_event_erp_hi",
      "language": "hi",
      "content_pattern": "🚨 आपातकाल - {{1}} ERP सक्रिय 🚨\n\n🆔 संदर्भ: {{2}}\n📋 शीर्षक: {{3}}\n📍 स्थान: {{4}}\n⚠️ स्तर: {{5}}\n👤 रिपोर्टकर्ता: {{6}}\n🕐 समय: {{7}}\n\n📝 {{9}}\n\n⚡ तत्काल कार्रवाई आवश्यक\n🔗 देखें: {{8}}",
      "email_subject": "🚨 आपातकाल {{1}}: {{3}} - {{2}}"
    },
    {
      "slug": "hsse_event_erp_fil",
      "language": "fil",
      "content_pattern": "🚨 EMERGENCY - {{1}} ERP ACTIVATED 🚨\n\n🆔 Reference: {{2}}\n📋 Pamagat: {{3}}\n📍 Lokasyon: {{4}}\n⚠️ Antas: {{5}}\n👤 Nag-ulat: {{6}}\n🕐 Oras: {{7}}\n\n📝 {{9}}\n\n⚡ KAILANGAN NG AGARANG AKSYON\n🔗 Tingnan: {{8}}",
      "email_subject": "🚨 EMERGENCY {{1}}: {{3}} - {{2}}"
    }
  ]'::jsonb;
  template_item JSONB;
  variable_keys TEXT[] := ARRAY['event_type', 'reference_id', 'title', 'location', 'risk_level', 'reported_by', 'incident_time', 'action_link', 'description', 'site_name'];
BEGIN
  -- Loop through all tenants
  FOR tenant_record IN SELECT DISTINCT tenant_id FROM profiles WHERE tenant_id IS NOT NULL
  LOOP
    -- Loop through all template definitions
    FOR template_item IN SELECT * FROM jsonb_array_elements(templates_data)
    LOOP
      -- Insert template if it doesn't exist (use ON CONFLICT on the correct unique constraint)
      INSERT INTO notification_templates (
        tenant_id,
        slug,
        channel_type,
        category,
        language,
        content_pattern,
        variable_keys,
        email_subject,
        is_active,
        default_gateway
      )
      VALUES (
        tenant_record.tenant_id,
        template_item->>'slug',
        'both',
        'incidents',
        template_item->>'language',
        template_item->>'content_pattern',
        variable_keys,
        template_item->>'email_subject',
        true,
        'wasender'
      )
      ON CONFLICT (tenant_id, slug) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Add comment for documentation
COMMENT ON TABLE notification_templates IS 'Notification templates with event_type as first variable for HSSE events. Variable order: 1=event_type, 2=reference_id, 3=title, 4=location, 5=risk_level, 6=reported_by, 7=incident_time, 8=action_link, 9=description, 10=site_name';