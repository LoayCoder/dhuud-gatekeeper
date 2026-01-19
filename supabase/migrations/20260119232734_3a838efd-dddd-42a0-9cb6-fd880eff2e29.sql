
-- HSSE ASSET PARTS - BATCH 2 (First Aid, PPE, Emergency)

-- AED Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'aed_battery_level', 'Battery Level Indicator', 'مؤشر مستوى البطارية', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'aed' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'aed_battery_level' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'aed_pads_expiry', 'Pads Expiry Date Valid', 'تاريخ انتهاء الضمادات ساري', true, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'aed' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'aed_pads_expiry' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'aed_self_test', 'Self-Test Passed', 'اجتاز الاختبار الذاتي', true, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'aed' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'aed_self_test' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'aed_accessible', 'Accessibility Clear', 'سهولة الوصول', false, 'pass_fail', 4, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'aed' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'aed_accessible' AND type_id = t.id);

-- FIRST AID KIT Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system, content_count)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'fak_bandages', 'Bandages Adequate', 'الضمادات كافية', true, 'pass_fail', 1, true, true, 20
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'first_aid_kit' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'fak_bandages' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system, content_count)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'fak_antiseptic', 'Antiseptic Wipes', 'مناديل مطهرة', true, 'pass_fail', 2, true, true, 10
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'first_aid_kit' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'fak_antiseptic' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'fak_gloves', 'Disposable Gloves', 'قفازات للاستخدام الواحد', true, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'first_aid_kit' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'fak_gloves' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'fak_expiry_check', 'Expiry Dates Checked', 'تواريخ الصلاحية مراجعة', true, 'pass_fail', 4, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'first_aid_kit' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'fak_expiry_check' AND type_id = t.id);

-- HARD HAT Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'hh_shell_condition', 'Shell Condition', 'حالة الغلاف', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'hard_hat' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'hh_shell_condition' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'hh_suspension', 'Suspension System', 'نظام التعليق', true, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'hard_hat' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'hh_suspension' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'hh_expiry', 'Expiry Date Valid', 'تاريخ الصلاحية ساري', true, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'hard_hat' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'hh_expiry' AND type_id = t.id);

-- SAFETY GLASSES Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'sg_lens_condition', 'Lens Condition', 'حالة العدسات', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'safety_glasses' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'sg_lens_condition' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'sg_frame_integrity', 'Frame Integrity', 'سلامة الإطار', true, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'safety_glasses' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'sg_frame_integrity' AND type_id = t.id);

-- SAFETY HARNESS Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'sh_webbing', 'Webbing Condition', 'حالة الأشرطة', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'safety_harness' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'sh_webbing' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'sh_d_rings', 'D-Rings Condition', 'حالة حلقات D', true, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'safety_harness' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'sh_d_rings' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'sh_buckles', 'Buckles Functional', 'الأبازيم تعمل', true, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'safety_harness' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'sh_buckles' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'sh_stitching', 'Stitching Intact', 'الخياطة سليمة', true, 'pass_fail', 4, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'safety_harness' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'sh_stitching' AND type_id = t.id);

-- EMERGENCY LIGHTING Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'el_light_output', 'Light Output Adequate', 'إخراج الضوء كافي', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'emergency_light' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'el_light_output' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'el_battery_test', 'Battery Backup Test', 'اختبار البطارية الاحتياطية', true, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'emergency_light' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'el_battery_test' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'el_test_button', 'Test Button Functional', 'زر الاختبار يعمل', false, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'emergency_light' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'el_test_button' AND type_id = t.id);

-- SPILL KIT Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'sk_absorbent_pads', 'Absorbent Pads Adequate', 'الوسائد الماصة كافية', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'spill_kit' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'sk_absorbent_pads' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'sk_disposal_bags', 'Disposal Bags Present', 'أكياس التخلص موجودة', true, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'spill_kit' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'sk_disposal_bags' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'sk_ppe_included', 'PPE Included', 'معدات الحماية متضمنة', true, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'spill_kit' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'sk_ppe_included' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'sk_container_sealed', 'Container Sealed', 'الحاوية مختومة', false, 'pass_fail', 4, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'spill_kit' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'sk_container_sealed' AND type_id = t.id);

-- EYE WASH STATION Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'ews_water_flow', 'Water Flow Adequate', 'تدفق الماء كافي', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'eye_wash_station' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'ews_water_flow' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'ews_nozzle_caps', 'Nozzle Caps Present', 'أغطية الفوهات موجودة', true, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'eye_wash_station' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'ews_nozzle_caps' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'ews_activation', 'Activation Handle Working', 'مقبض التشغيل يعمل', true, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'eye_wash_station' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'ews_activation' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'ews_weekly_flush', 'Weekly Flush Log Current', 'سجل الغسل الأسبوعي محدث', false, 'pass_fail', 4, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'eye_wash_station' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'ews_weekly_flush' AND type_id = t.id);
