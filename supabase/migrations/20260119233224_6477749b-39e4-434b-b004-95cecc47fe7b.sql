
-- HSSE ASSET PARTS - BATCH 4 (CCTV, Emergency Equipment, Signage)

-- CCTV CAMERA - Dome Type Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'cctv_lens', 'Camera Lens Condition', 'حالة عدسة الكاميرا', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'dome' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'cctv_lens' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'cctv_housing', 'Housing/Dome Condition', 'حالة الغلاف/القبة', false, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'dome' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'cctv_housing' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'cctv_power', 'Power Supply Working', 'مصدر الطاقة يعمل', true, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'dome' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'cctv_power' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'cctv_network', 'Network Connection Stable', 'اتصال الشبكة مستقر', true, 'pass_fail', 4, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'dome' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'cctv_network' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'cctv_recording', 'Recording Status OK', 'حالة التسجيل سليمة', true, 'pass_fail', 5, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'dome' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'cctv_recording' AND type_id = t.id);

-- PTZ Camera Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'ptz_lens', 'Camera Lens Condition', 'حالة عدسة الكاميرا', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'ptz' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'ptz_lens' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'ptz_movement', 'Pan/Tilt/Zoom Movement', 'حركة الدوران/الميل/التكبير', true, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'ptz' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'ptz_movement' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'ptz_power', 'Power Supply Working', 'مصدر الطاقة يعمل', true, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'ptz' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'ptz_power' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'ptz_network', 'Network Connection Stable', 'اتصال الشبكة مستقر', true, 'pass_fail', 4, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'ptz' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'ptz_network' AND type_id = t.id);

-- Bullet Camera Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'bullet_lens', 'Camera Lens Condition', 'حالة عدسة الكاميرا', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'bulletnormal' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'bullet_lens' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'bullet_housing', 'Housing Weatherproof', 'الغلاف مقاوم للعوامل الجوية', false, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'bulletnormal' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'bullet_housing' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'bullet_ir', 'IR LEDs Working', 'مصابيح الأشعة تحت الحمراء تعمل', true, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'bulletnormal' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'bullet_ir' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'bullet_power', 'Power Supply Working', 'مصدر الطاقة يعمل', true, 'pass_fail', 4, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'bulletnormal' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'bullet_power' AND type_id = t.id);

-- EVACUATION CHAIR Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'ec_wheels', 'Wheels/Tracks Condition', 'حالة العجلات/المسارات', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'evacuation_chair' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'ec_wheels' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'ec_brakes', 'Brakes Functional', 'الفرامل تعمل', true, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'evacuation_chair' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'ec_brakes' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'ec_straps', 'Straps Condition', 'حالة الأحزمة', true, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'evacuation_chair' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'ec_straps' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'ec_handles', 'Handles Secure', 'المقابض آمنة', true, 'pass_fail', 4, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'evacuation_chair' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'ec_handles' AND type_id = t.id);

-- STRETCHER Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'str_frame', 'Frame Condition', 'حالة الهيكل', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'stretcher' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'str_frame' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'str_straps', 'Straps Condition', 'حالة الأحزمة', true, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'stretcher' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'str_straps' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'str_wheels', 'Wheels/Rollers Working', 'العجلات تعمل', true, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'stretcher' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'str_wheels' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'str_clean', 'Cleanliness', 'النظافة', false, 'pass_fail', 4, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'stretcher' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'str_clean' AND type_id = t.id);

-- EXIT SIGN Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'es_illumination', 'Illumination Working', 'الإضاءة تعمل', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'exit_sign' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'es_illumination' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'es_visibility', 'Visibility from Distance', 'الرؤية من مسافة', true, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'exit_sign' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'es_visibility' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'es_battery', 'Battery Backup', 'البطارية الاحتياطية', true, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'exit_sign' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'es_battery' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'es_mounting', 'Mounting Secure', 'التثبيت آمن', false, 'pass_fail', 4, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'exit_sign' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'es_mounting' AND type_id = t.id);

-- CHEMICAL CABINET Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'cc_door_seal', 'Door Seal Intact', 'ختم الباب سليم', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'chemical_cabinet' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'cc_door_seal' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'cc_ventilation', 'Ventilation Working', 'التهوية تعمل', true, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'chemical_cabinet' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'cc_ventilation' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'cc_lock', 'Lock Functional', 'القفل يعمل', true, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'chemical_cabinet' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'cc_lock' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'cc_labeling', 'Hazard Labeling Visible', 'ملصقات الخطر مرئية', true, 'pass_fail', 4, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'chemical_cabinet' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'cc_labeling' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'cc_spill_tray', 'Spill Containment Tray', 'صينية احتواء التسرب', true, 'pass_fail', 5, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'chemical_cabinet' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'cc_spill_tray' AND type_id = t.id);

-- SAFETY SHOWER Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'ss_water_flow', 'Water Flow Adequate', 'تدفق الماء كافي', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'safety_shower' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'ss_water_flow' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'ss_pull_handle', 'Pull Handle Working', 'مقبض السحب يعمل', true, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'safety_shower' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'ss_pull_handle' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'ss_drainage', 'Drainage Clear', 'الصرف واضح', true, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'safety_shower' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'ss_drainage' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'ss_weekly_test', 'Weekly Test Log Current', 'سجل الاختبار الأسبوعي محدث', false, 'pass_fail', 4, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'safety_shower' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'ss_weekly_test' AND type_id = t.id);

-- SAFETY SIGN Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'sign_visibility', 'Visibility Clear', 'الرؤية واضحة', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'safety_sign' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'sign_visibility' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'sign_condition', 'Sign Condition', 'حالة اللافتة', true, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'safety_sign' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'sign_condition' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'sign_mounting', 'Mounting Secure', 'التثبيت آمن', false, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'safety_sign' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'sign_mounting' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'sign_illumination', 'Illumination (if applicable)', 'الإضاءة (إن وجدت)', false, 'pass_fail', 4, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'safety_sign' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'sign_illumination' AND type_id = t.id);

-- FLOOR MARKING Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'fm_visibility', 'Visibility Clear', 'الرؤية واضحة', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'floor_marking' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'fm_visibility' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'fm_adhesion', 'Adhesion Intact', 'الالتصاق سليم', true, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'floor_marking' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'fm_adhesion' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'fm_color', 'Color Not Faded', 'اللون غير باهت', false, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'floor_marking' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'fm_color' AND type_id = t.id);

-- GUARDRAIL SYSTEM Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'gr_structural', 'Structural Integrity', 'السلامة الهيكلية', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'guardrail' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'gr_structural' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'gr_connections', 'Connections Secure', 'التوصيلات آمنة', true, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'guardrail' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'gr_connections' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'gr_height', 'Height Compliant', 'الارتفاع مطابق', true, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'guardrail' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'gr_height' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'gr_corrosion', 'No Corrosion/Damage', 'لا يوجد صدأ/تلف', false, 'pass_fail', 4, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'guardrail' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'gr_corrosion' AND type_id = t.id);

-- ANCHOR POINT Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'ap_structural', 'Structural Integrity', 'السلامة الهيكلية', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'anchor_point' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'ap_structural' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'ap_bolts', 'Bolts/Fixings Secure', 'البراغي/التثبيتات آمنة', true, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'anchor_point' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'ap_bolts' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'ap_certification', 'Certification Current', 'الشهادة سارية', true, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'anchor_point' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'ap_certification' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'ap_labeling', 'Load Rating Label Visible', 'ملصق تصنيف الحمولة مرئي', true, 'pass_fail', 4, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'anchor_point' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'ap_labeling' AND type_id = t.id);
