
-- =====================================================
-- HSSE ASSET DATA COMPLETENESS MIGRATION - PART 2
-- Phase 4: Populate Inspectable Parts for ALL Types
-- =====================================================

-- Note: We need a tenant_id for parts. Since these are system parts,
-- we'll create them for each tenant, OR we need to adjust the schema.
-- Let me first check if we can use NULL tenant_id

-- For this migration, we'll use a function to create parts for a system tenant placeholder
-- or create a temporary approach

-- FIRE HOSE REEL Parts (Type-level, no subtypes)
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT 
  gen_random_uuid(),
  p.tenant_id,
  t.id,
  'hose_condition',
  'Hose Condition',
  'حالة الخرطوم',
  true,
  'pass_fail',
  1,
  true,
  true
FROM public.asset_types t
CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'fire_hose' AND t.deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'hose_condition' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'nozzle_condition', 'Nozzle Condition', 'حالة الفوهة', true, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'fire_hose' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'nozzle_condition' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'water_pressure', 'Water Pressure Adequate', 'ضغط الماء كافي', true, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'fire_hose' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'water_pressure' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'cabinet_condition', 'Cabinet/Housing Condition', 'حالة الخزانة', false, 'pass_fail', 4, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'fire_hose' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'cabinet_condition' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'reel_mechanism', 'Reel Mechanism Working', 'آلية البكرة تعمل', true, 'pass_fail', 5, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'fire_hose' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'reel_mechanism' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'valve_operational', 'Valve Operational', 'الصمام يعمل', true, 'pass_fail', 6, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'fire_hose' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'valve_operational' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'signage_visible', 'Signage Visible', 'اللافتة مرئية', false, 'pass_fail', 7, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'fire_hose' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'signage_visible' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'break_hammer', 'Glass Break Hammer Present', 'مطرقة كسر الزجاج موجودة', false, 'pass_fail', 8, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'fire_hose' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'break_hammer' AND type_id = t.id);

-- FIRE ALARM PANEL Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'panel_power', 'Panel Power On', 'لوحة التحكم تعمل', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'fire_alarm' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'panel_power' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'battery_backup', 'Battery Backup Status', 'حالة البطارية الاحتياطية', true, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'fire_alarm' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'battery_backup' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'zone_indicators', 'Zone Indicators Working', 'مؤشرات المناطق تعمل', true, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'fire_alarm' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'zone_indicators' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'alarm_sound_test', 'Alarm Sound Test', 'اختبار صوت الإنذار', true, 'pass_fail', 4, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'fire_alarm' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'alarm_sound_test' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'fault_indicators', 'Fault Indicators Clear', 'مؤشرات الأعطال واضحة', false, 'pass_fail', 5, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'fire_alarm' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'fault_indicators' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'log_book_current', 'Log Book Current', 'سجل الصيانة محدث', false, 'pass_fail', 6, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'fire_alarm' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'log_book_current' AND type_id = t.id);

-- SMOKE DETECTOR Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'power_indicator', 'Power Indicator On', 'مؤشر الطاقة مضاء', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'smoke_detector' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'power_indicator' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'test_button', 'Test Button Functional', 'زر الاختبار يعمل', true, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'smoke_detector' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'test_button' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'detector_clean', 'Detector Cleanliness', 'نظافة الكاشف', false, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'smoke_detector' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'detector_clean' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'mounting_secure', 'Mounting Secure', 'التثبيت آمن', true, 'pass_fail', 4, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'smoke_detector' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'mounting_secure' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'expiry_valid', 'Expiry Date Valid', 'تاريخ الصلاحية ساري', true, 'pass_fail', 5, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'smoke_detector' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'expiry_valid' AND type_id = t.id);

-- SPRINKLER SYSTEM Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'sprinkler_heads', 'Sprinkler Heads Condition', 'حالة رؤوس الرشاشات', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'sprinkler_system' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'sprinkler_heads' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'pipes_condition', 'Pipes Condition', 'حالة الأنابيب', true, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'sprinkler_system' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'pipes_condition' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'control_valve', 'Control Valve Accessible', 'صمام التحكم متاح', true, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'sprinkler_system' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'control_valve' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'pressure_gauge', 'Pressure Gauge Reading', 'قراءة مقياس الضغط', true, 'pass_fail', 4, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'sprinkler_system' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'pressure_gauge' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'no_obstructions', 'No Obstructions', 'لا توجد عوائق', true, 'pass_fail', 5, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'sprinkler_system' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'no_obstructions' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'fdc_accessible', 'Fire Dept Connection Accessible', 'وصلة الإطفاء متاحة', true, 'pass_fail', 6, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'sprinkler_system' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'fdc_accessible' AND type_id = t.id);

-- FIRE BLANKET Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'blanket_condition', 'Blanket Condition', 'حالة البطانية', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'fire_blanket' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'blanket_condition' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'container_intact', 'Container/Pouch Intact', 'الحاوية/الغلاف سليم', true, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'fire_blanket' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'container_intact' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'pull_tabs_visible', 'Pull Tabs Visible', 'ألسنة السحب مرئية', true, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'fire_blanket' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'pull_tabs_visible' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'fb_signage_visible', 'Signage Visible', 'اللافتة مرئية', false, 'pass_fail', 4, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'fire_blanket' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'fb_signage_visible' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'fb_mounting_secure', 'Mounting Secure', 'التثبيت آمن', false, 'pass_fail', 5, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'fire_blanket' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'fb_mounting_secure' AND type_id = t.id);
