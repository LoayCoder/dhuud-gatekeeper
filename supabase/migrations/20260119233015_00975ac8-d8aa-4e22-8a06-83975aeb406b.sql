
-- HSSE ASSET PARTS - BATCH 3 (Fire Extinguisher Subtypes, Electrical, CCTV)

-- FIRE EXTINGUISHER - CO2 Subtype Parts
INSERT INTO public.asset_type_parts (id, tenant_id, subtype_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, s.id, 'fe_pressure_gauge', 'Pressure Gauge Condition', 'حالة مقياس الضغط', true, 'pass_fail', 1, true, true
FROM public.asset_subtypes s 
CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE s.code = 'co2' AND s.deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'fe_pressure_gauge' AND subtype_id = s.id);

INSERT INTO public.asset_type_parts (id, tenant_id, subtype_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, s.id, 'fe_safety_pin', 'Safety Pin Intact', 'دبوس الأمان سليم', true, 'pass_fail', 2, true, true
FROM public.asset_subtypes s CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE s.code = 'co2' AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'fe_safety_pin' AND subtype_id = s.id);

INSERT INTO public.asset_type_parts (id, tenant_id, subtype_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, s.id, 'fe_hose_condition', 'Hose Condition', 'حالة الخرطوم', true, 'pass_fail', 3, true, true
FROM public.asset_subtypes s CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE s.code = 'co2' AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'fe_hose_condition' AND subtype_id = s.id);

INSERT INTO public.asset_type_parts (id, tenant_id, subtype_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, s.id, 'fe_discharge_horn', 'Discharge Horn Condition', 'حالة قرن التفريغ', true, 'pass_fail', 4, true, true
FROM public.asset_subtypes s CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE s.code = 'co2' AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'fe_discharge_horn' AND subtype_id = s.id);

INSERT INTO public.asset_type_parts (id, tenant_id, subtype_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, s.id, 'fe_cylinder_body', 'Cylinder Body Condition', 'حالة جسم الاسطوانة', true, 'pass_fail', 5, true, true
FROM public.asset_subtypes s CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE s.code = 'co2' AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'fe_cylinder_body' AND subtype_id = s.id);

INSERT INTO public.asset_type_parts (id, tenant_id, subtype_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, s.id, 'fe_inspection_tag', 'Inspection Tag Current', 'بطاقة الفحص محدثة', false, 'pass_fail', 6, true, true
FROM public.asset_subtypes s CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE s.code = 'co2' AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'fe_inspection_tag' AND subtype_id = s.id);

INSERT INTO public.asset_type_parts (id, tenant_id, subtype_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, s.id, 'fe_mounting_bracket', 'Mounting Bracket Secure', 'حامل التثبيت آمن', false, 'pass_fail', 7, true, true
FROM public.asset_subtypes s CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE s.code = 'co2' AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'fe_mounting_bracket' AND subtype_id = s.id);

INSERT INTO public.asset_type_parts (id, tenant_id, subtype_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, s.id, 'fe_tamper_seal', 'Tamper Seal Intact', 'ختم العبث سليم', true, 'pass_fail', 8, true, true
FROM public.asset_subtypes s CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE s.code = 'co2' AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'fe_tamper_seal' AND subtype_id = s.id);

-- FIRE EXTINGUISHER - Dry Powder Subtype Parts
INSERT INTO public.asset_type_parts (id, tenant_id, subtype_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, s.id, 'dp_pressure_gauge', 'Pressure Gauge Condition', 'حالة مقياس الضغط', true, 'pass_fail', 1, true, true
FROM public.asset_subtypes s CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE s.code = 'dry_powder' AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'dp_pressure_gauge' AND subtype_id = s.id);

INSERT INTO public.asset_type_parts (id, tenant_id, subtype_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, s.id, 'dp_safety_pin', 'Safety Pin Intact', 'دبوس الأمان سليم', true, 'pass_fail', 2, true, true
FROM public.asset_subtypes s CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE s.code = 'dry_powder' AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'dp_safety_pin' AND subtype_id = s.id);

INSERT INTO public.asset_type_parts (id, tenant_id, subtype_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, s.id, 'dp_hose_nozzle', 'Hose & Nozzle Condition', 'حالة الخرطوم والفوهة', true, 'pass_fail', 3, true, true
FROM public.asset_subtypes s CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE s.code = 'dry_powder' AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'dp_hose_nozzle' AND subtype_id = s.id);

INSERT INTO public.asset_type_parts (id, tenant_id, subtype_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, s.id, 'dp_powder_shake', 'Powder Condition (Shake Test)', 'حالة المسحوق (اختبار الرج)', true, 'pass_fail', 4, true, true
FROM public.asset_subtypes s CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE s.code = 'dry_powder' AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'dp_powder_shake' AND subtype_id = s.id);

INSERT INTO public.asset_type_parts (id, tenant_id, subtype_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, s.id, 'dp_cylinder_body', 'Cylinder Body Condition', 'حالة جسم الاسطوانة', true, 'pass_fail', 5, true, true
FROM public.asset_subtypes s CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE s.code = 'dry_powder' AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'dp_cylinder_body' AND subtype_id = s.id);

INSERT INTO public.asset_type_parts (id, tenant_id, subtype_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, s.id, 'dp_tamper_seal', 'Tamper Seal Intact', 'ختم العبث سليم', true, 'pass_fail', 6, true, true
FROM public.asset_subtypes s CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE s.code = 'dry_powder' AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'dp_tamper_seal' AND subtype_id = s.id);

-- FIRE EXTINGUISHER - Foam Subtype Parts
INSERT INTO public.asset_type_parts (id, tenant_id, subtype_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, s.id, 'foam_pressure', 'Pressure Gauge Condition', 'حالة مقياس الضغط', true, 'pass_fail', 1, true, true
FROM public.asset_subtypes s CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE s.code = 'foam' AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'foam_pressure' AND subtype_id = s.id);

INSERT INTO public.asset_type_parts (id, tenant_id, subtype_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, s.id, 'foam_concentrate', 'Foam Concentrate Level', 'مستوى مركز الرغوة', true, 'pass_fail', 2, true, true
FROM public.asset_subtypes s CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE s.code = 'foam' AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'foam_concentrate' AND subtype_id = s.id);

INSERT INTO public.asset_type_parts (id, tenant_id, subtype_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, s.id, 'foam_hose', 'Hose & Nozzle Condition', 'حالة الخرطوم والفوهة', true, 'pass_fail', 3, true, true
FROM public.asset_subtypes s CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE s.code = 'foam' AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'foam_hose' AND subtype_id = s.id);

INSERT INTO public.asset_type_parts (id, tenant_id, subtype_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, s.id, 'foam_cylinder', 'Cylinder Condition', 'حالة الاسطوانة', true, 'pass_fail', 4, true, true
FROM public.asset_subtypes s CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE s.code = 'foam' AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'foam_cylinder' AND subtype_id = s.id);

-- FIRE EXTINGUISHER - Water Subtype Parts
INSERT INTO public.asset_type_parts (id, tenant_id, subtype_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, s.id, 'water_pressure', 'Pressure Gauge Condition', 'حالة مقياس الضغط', true, 'pass_fail', 1, true, true
FROM public.asset_subtypes s CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE s.code = 'water' AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'water_pressure' AND subtype_id = s.id);

INSERT INTO public.asset_type_parts (id, tenant_id, subtype_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, s.id, 'water_hose', 'Hose & Nozzle Condition', 'حالة الخرطوم والفوهة', true, 'pass_fail', 2, true, true
FROM public.asset_subtypes s CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE s.code = 'water' AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'water_hose' AND subtype_id = s.id);

INSERT INTO public.asset_type_parts (id, tenant_id, subtype_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, s.id, 'water_cylinder', 'Cylinder Condition', 'حالة الاسطوانة', true, 'pass_fail', 3, true, true
FROM public.asset_subtypes s CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE s.code = 'water' AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'water_cylinder' AND subtype_id = s.id);

INSERT INTO public.asset_type_parts (id, tenant_id, subtype_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, s.id, 'water_tamper_seal', 'Tamper Seal Intact', 'ختم العبث سليم', true, 'pass_fail', 4, true, true
FROM public.asset_subtypes s CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE s.code = 'water' AND s.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'water_tamper_seal' AND subtype_id = s.id);

-- LOCKOUT/TAGOUT Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'loto_lock_mechanism', 'Lock Mechanism Functional', 'آلية القفل تعمل', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'lockout_tagout' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'loto_lock_mechanism' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'loto_key_present', 'Key Present', 'المفتاح موجود', true, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'lockout_tagout' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'loto_key_present' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'loto_tag_legible', 'Tag Legible', 'البطاقة واضحة', true, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'lockout_tagout' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'loto_tag_legible' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'loto_hasp_condition', 'Hasp Condition', 'حالة المشبك', false, 'pass_fail', 4, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'lockout_tagout' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'loto_hasp_condition' AND type_id = t.id);

-- GROUNDING EQUIPMENT Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'ge_cable_condition', 'Cable Condition', 'حالة الكابل', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'grounding_equipment' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'ge_cable_condition' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'ge_clamps', 'Clamps Functional', 'المشابك تعمل', true, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'grounding_equipment' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'ge_clamps' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'ge_connections', 'Connections Secure', 'التوصيلات آمنة', true, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'grounding_equipment' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'ge_connections' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'ge_resistance', 'Resistance Reading OK', 'قراءة المقاومة سليمة', true, 'pass_fail', 4, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'grounding_equipment' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'ge_resistance' AND type_id = t.id);

-- VOLTAGE TESTER Parts
INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'vt_battery', 'Battery Level', 'مستوى البطارية', true, 'pass_fail', 1, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'voltage_tester' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'vt_battery' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'vt_probe', 'Probe Condition', 'حالة المجسات', true, 'pass_fail', 2, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'voltage_tester' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'vt_probe' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'vt_display', 'Display Working', 'الشاشة تعمل', true, 'pass_fail', 3, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'voltage_tester' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'vt_display' AND type_id = t.id);

INSERT INTO public.asset_type_parts (id, tenant_id, type_id, code, name, name_ar, is_critical, default_response_type, sort_order, is_active, is_system)
SELECT gen_random_uuid(), p.tenant_id, t.id, 'vt_calibration', 'Calibration Current', 'المعايرة محدثة', true, 'pass_fail', 4, true, true
FROM public.asset_types t CROSS JOIN (SELECT DISTINCT tenant_id FROM public.profiles WHERE tenant_id IS NOT NULL LIMIT 1) p
WHERE t.code = 'voltage_tester' AND t.deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM public.asset_type_parts WHERE code = 'vt_calibration' AND type_id = t.id);
