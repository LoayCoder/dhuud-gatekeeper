
-- =====================================================
-- HSSE ASSET DATA COMPLETENESS MIGRATION - PART 1
-- Phase 1: Fix Data Quality Issues
-- Phase 2: Add Missing Types & Subtypes
-- =====================================================

-- PHASE 1: DATA QUALITY FIXES

-- Fix "Dry Power" typo to "Dry Powder"
UPDATE public.asset_subtypes 
SET name = 'Dry Powder', name_ar = 'مسحوق جاف', code = 'dry_powder'
WHERE code = 'dry_power' AND deleted_at IS NULL;

-- Fix duplicate "Dry Power 6 kg" typo
UPDATE public.asset_subtypes 
SET name = 'Dry Powder 6kg', name_ar = 'مسحوق جاف 6 كجم', code = 'dry_powder_6kg'
WHERE code = 'dry_power_6_kg' AND deleted_at IS NULL;

-- Add missing Arabic translations for existing subtypes
UPDATE public.asset_subtypes SET name_ar = 'ثاني أكسيد الكربون' WHERE code = 'co2' AND name_ar IS NULL;
UPDATE public.asset_subtypes SET name_ar = 'ثاني أكسيد الكربون 4 كجم' WHERE code = 'co2_4kg' AND name_ar IS NULL;
UPDATE public.asset_subtypes SET name_ar = 'ضمادة لاصقة' WHERE code = 'adhesive_plastic_bandage' AND name_ar IS NULL;
UPDATE public.asset_subtypes SET name_ar = 'كاميرا عد' WHERE code = 'couniting' AND name_ar IS NULL;
UPDATE public.asset_subtypes SET name_ar = 'التعرف على لوحات الأرقام' WHERE code = 'lpr' AND name_ar IS NULL;
UPDATE public.asset_subtypes SET name_ar = 'عادي' WHERE code = 'normal' AND name_ar IS NULL;
UPDATE public.asset_subtypes SET name_ar = 'حراري' WHERE code = 'thermal' AND name_ar IS NULL;
UPDATE public.asset_subtypes SET name_ar = 'تتبع' WHERE code = 'tracking' AND name_ar IS NULL;

-- Soft delete duplicate CO2 subtype (keep only one)
UPDATE public.asset_subtypes 
SET deleted_at = now() 
WHERE id = '7d450ed1-b1f6-4ee9-b7fa-4db33f8f1aa3';

-- =====================================================
-- PHASE 2: ADD MISSING ASSET TYPES
-- =====================================================

-- Fire Safety - Fire Blanket
INSERT INTO public.asset_types (id, category_id, code, name, name_ar, inspection_interval_days, requires_certification, is_active, is_system)
SELECT gen_random_uuid(), id, 'fire_blanket', 'Fire Blanket', 'بطانية الحريق', 365, false, true, true
FROM public.asset_categories WHERE code = 'fire_safety' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_types WHERE code = 'fire_blanket' AND deleted_at IS NULL);

-- Fire Safety - Fire Pump
INSERT INTO public.asset_types (id, category_id, code, name, name_ar, inspection_interval_days, requires_certification, is_active, is_system)
SELECT gen_random_uuid(), id, 'fire_pump', 'Fire Pump', 'مضخة الحريق', 180, true, true, true
FROM public.asset_categories WHERE code = 'fire_safety' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_types WHERE code = 'fire_pump' AND deleted_at IS NULL);

-- Fall Protection - Harness Set
INSERT INTO public.asset_types (id, category_id, code, name, name_ar, inspection_interval_days, requires_certification, is_active, is_system)
SELECT gen_random_uuid(), id, 'harness_set', 'Safety Harness Set', 'طقم حزام السلامة', 180, true, true, true
FROM public.asset_categories WHERE code = 'fall_protection' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_types WHERE code = 'harness_set' AND deleted_at IS NULL);

-- Fall Protection - Lanyard
INSERT INTO public.asset_types (id, category_id, code, name, name_ar, inspection_interval_days, requires_certification, is_active, is_system)
SELECT gen_random_uuid(), id, 'lanyard', 'Safety Lanyard', 'حبل التوصيل', 180, false, true, true
FROM public.asset_categories WHERE code = 'fall_protection' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_types WHERE code = 'lanyard' AND deleted_at IS NULL);

-- Fall Protection - Retractable Lifeline
INSERT INTO public.asset_types (id, category_id, code, name, name_ar, inspection_interval_days, requires_certification, is_active, is_system)
SELECT gen_random_uuid(), id, 'retractable_lifeline', 'Retractable Lifeline', 'حبل الحياة القابل للسحب', 180, true, true, true
FROM public.asset_categories WHERE code = 'fall_protection' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_types WHERE code = 'retractable_lifeline' AND deleted_at IS NULL);

-- Hazmat - Gas Detector
INSERT INTO public.asset_types (id, category_id, code, name, name_ar, inspection_interval_days, requires_certification, is_active, is_system)
SELECT gen_random_uuid(), id, 'gas_detector', 'Gas Detector', 'كاشف الغازات', 30, true, true, true
FROM public.asset_categories WHERE code = 'hazmat' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_types WHERE code = 'gas_detector' AND deleted_at IS NULL);

-- Hazmat - Spill Pallet
INSERT INTO public.asset_types (id, category_id, code, name, name_ar, inspection_interval_days, requires_certification, is_active, is_system)
SELECT gen_random_uuid(), id, 'spill_pallet', 'Spill Containment Pallet', 'منصة احتواء التسرب', 180, false, true, true
FROM public.asset_categories WHERE code = 'hazmat' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_types WHERE code = 'spill_pallet' AND deleted_at IS NULL);

-- Hazmat - Safety Shower
INSERT INTO public.asset_types (id, category_id, code, name, name_ar, inspection_interval_days, requires_certification, is_active, is_system)
SELECT gen_random_uuid(), id, 'safety_shower', 'Safety Shower', 'دش السلامة', 30, false, true, true
FROM public.asset_categories WHERE code = 'hazmat' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_types WHERE code = 'safety_shower' AND deleted_at IS NULL);

-- Electrical - Voltage Tester
INSERT INTO public.asset_types (id, category_id, code, name, name_ar, inspection_interval_days, requires_certification, is_active, is_system)
SELECT gen_random_uuid(), id, 'voltage_tester', 'Voltage Tester', 'جهاز اختبار الجهد', 90, true, true, true
FROM public.asset_categories WHERE code = 'electrical' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_types WHERE code = 'voltage_tester' AND deleted_at IS NULL);

-- Signage - Prohibition Sign
INSERT INTO public.asset_types (id, category_id, code, name, name_ar, inspection_interval_days, requires_certification, is_active, is_system)
SELECT gen_random_uuid(), id, 'prohibition_sign', 'Prohibition Sign', 'لافتة حظر', 365, false, true, true
FROM public.asset_categories WHERE code = 'signage' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_types WHERE code = 'prohibition_sign' AND deleted_at IS NULL);

-- Signage - Warning Sign
INSERT INTO public.asset_types (id, category_id, code, name, name_ar, inspection_interval_days, requires_certification, is_active, is_system)
SELECT gen_random_uuid(), id, 'warning_sign', 'Warning Sign', 'لافتة تحذير', 365, false, true, true
FROM public.asset_categories WHERE code = 'signage' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_types WHERE code = 'warning_sign' AND deleted_at IS NULL);

-- Signage - Mandatory Sign
INSERT INTO public.asset_types (id, category_id, code, name, name_ar, inspection_interval_days, requires_certification, is_active, is_system)
SELECT gen_random_uuid(), id, 'mandatory_sign', 'Mandatory Sign', 'لافتة إلزامية', 365, false, true, true
FROM public.asset_categories WHERE code = 'signage' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_types WHERE code = 'mandatory_sign' AND deleted_at IS NULL);

-- Signage - Emergency Sign
INSERT INTO public.asset_types (id, category_id, code, name, name_ar, inspection_interval_days, requires_certification, is_active, is_system)
SELECT gen_random_uuid(), id, 'emergency_sign', 'Emergency Sign', 'لافتة طوارئ', 365, false, true, true
FROM public.asset_categories WHERE code = 'signage' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_types WHERE code = 'emergency_sign' AND deleted_at IS NULL);

-- =====================================================
-- PHASE 3: ADD MISSING SUBTYPES
-- =====================================================

-- Fire Extinguisher - Foam
INSERT INTO public.asset_subtypes (id, type_id, code, name, name_ar, is_active)
SELECT gen_random_uuid(), id, 'foam', 'Foam', 'رغوة', true
FROM public.asset_types WHERE code = 'fire_extinguisher' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_subtypes WHERE code = 'foam' AND deleted_at IS NULL);

-- Fire Extinguisher - Water
INSERT INTO public.asset_subtypes (id, type_id, code, name, name_ar, is_active)
SELECT gen_random_uuid(), id, 'water', 'Water', 'ماء', true
FROM public.asset_types WHERE code = 'fire_extinguisher' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_subtypes WHERE code = 'water' AND deleted_at IS NULL);

-- Fire Extinguisher - Wet Chemical
INSERT INTO public.asset_subtypes (id, type_id, code, name, name_ar, is_active)
SELECT gen_random_uuid(), id, 'wet_chemical', 'Wet Chemical', 'كيميائي رطب', true
FROM public.asset_types WHERE code = 'fire_extinguisher' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_subtypes WHERE code = 'wet_chemical' AND deleted_at IS NULL);

-- Fire Pump - Diesel
INSERT INTO public.asset_subtypes (id, type_id, code, name, name_ar, is_active)
SELECT gen_random_uuid(), id, 'diesel_pump', 'Diesel Pump', 'مضخة ديزل', true
FROM public.asset_types WHERE code = 'fire_pump' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_subtypes WHERE code = 'diesel_pump' AND deleted_at IS NULL);

-- Fire Pump - Electric
INSERT INTO public.asset_subtypes (id, type_id, code, name, name_ar, is_active)
SELECT gen_random_uuid(), id, 'electric_pump', 'Electric Pump', 'مضخة كهربائية', true
FROM public.asset_types WHERE code = 'fire_pump' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_subtypes WHERE code = 'electric_pump' AND deleted_at IS NULL);

-- Fire Pump - Jockey
INSERT INTO public.asset_subtypes (id, type_id, code, name, name_ar, is_active)
SELECT gen_random_uuid(), id, 'jockey_pump', 'Jockey Pump', 'مضخة جوكي', true
FROM public.asset_types WHERE code = 'fire_pump' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_subtypes WHERE code = 'jockey_pump' AND deleted_at IS NULL);

-- Gas Detector - Single Gas
INSERT INTO public.asset_subtypes (id, type_id, code, name, name_ar, is_active)
SELECT gen_random_uuid(), id, 'single_gas', 'Single Gas Detector', 'كاشف غاز واحد', true
FROM public.asset_types WHERE code = 'gas_detector' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_subtypes WHERE code = 'single_gas' AND deleted_at IS NULL);

-- Gas Detector - Multi Gas
INSERT INTO public.asset_subtypes (id, type_id, code, name, name_ar, is_active)
SELECT gen_random_uuid(), id, 'multi_gas', 'Multi Gas Detector', 'كاشف غازات متعددة', true
FROM public.asset_types WHERE code = 'gas_detector' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_subtypes WHERE code = 'multi_gas' AND deleted_at IS NULL);

-- Gas Detector - Fixed Monitor
INSERT INTO public.asset_subtypes (id, type_id, code, name, name_ar, is_active)
SELECT gen_random_uuid(), id, 'fixed_monitor', 'Fixed Gas Monitor', 'راصد غاز ثابت', true
FROM public.asset_types WHERE code = 'gas_detector' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_subtypes WHERE code = 'fixed_monitor' AND deleted_at IS NULL);

-- Respirator - Half Face
INSERT INTO public.asset_subtypes (id, type_id, code, name, name_ar, is_active)
SELECT gen_random_uuid(), id, 'half_face', 'Half-Face Respirator', 'جهاز تنفس نصف وجه', true
FROM public.asset_types WHERE code = 'respirator' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_subtypes WHERE code = 'half_face' AND deleted_at IS NULL);

-- Respirator - Full Face
INSERT INTO public.asset_subtypes (id, type_id, code, name, name_ar, is_active)
SELECT gen_random_uuid(), id, 'full_face', 'Full-Face Respirator', 'جهاز تنفس كامل الوجه', true
FROM public.asset_types WHERE code = 'respirator' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_subtypes WHERE code = 'full_face' AND deleted_at IS NULL);

-- Respirator - Dust Mask
INSERT INTO public.asset_subtypes (id, type_id, code, name, name_ar, is_active)
SELECT gen_random_uuid(), id, 'dust_mask', 'Disposable Dust Mask', 'قناع غبار للاستخدام الواحد', true
FROM public.asset_types WHERE code = 'respirator' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_subtypes WHERE code = 'dust_mask' AND deleted_at IS NULL);

-- Respirator - SCBA
INSERT INTO public.asset_subtypes (id, type_id, code, name, name_ar, is_active)
SELECT gen_random_uuid(), id, 'scba', 'SCBA', 'جهاز تنفس ذاتي', true
FROM public.asset_types WHERE code = 'respirator' AND deleted_at IS NULL
AND NOT EXISTS (SELECT 1 FROM public.asset_subtypes WHERE code = 'scba' AND deleted_at IS NULL);
