-- Insert seed data for asset categories (system-wide, tenant_id = NULL)
INSERT INTO asset_categories (code, name, name_ar, icon, color, is_system, sort_order) VALUES
('fire_safety', 'Fire Safety Equipment', 'معدات السلامة من الحريق', 'Flame', '#EF4444', true, 1),
('first_aid', 'First Aid Equipment', 'معدات الإسعافات الأولية', 'Heart', '#10B981', true, 2),
('ppe', 'Personal Protective Equipment', 'معدات الحماية الشخصية', 'Shield', '#3B82F6', true, 3),
('emergency', 'Emergency Response Equipment', 'معدات الاستجابة للطوارئ', 'AlertTriangle', '#F59E0B', true, 4),
('electrical', 'Electrical Safety Equipment', 'معدات السلامة الكهربائية', 'Zap', '#8B5CF6', true, 5),
('fall_protection', 'Fall Protection Equipment', 'معدات الحماية من السقوط', 'ArrowDown', '#EC4899', true, 6),
('hazmat', 'Hazardous Materials Equipment', 'معدات المواد الخطرة', 'Biohazard', '#F97316', true, 7),
('signage', 'Safety Signage', 'لافتات السلامة', 'AlertCircle', '#06B6D4', true, 8)
ON CONFLICT DO NOTHING;

-- Insert seed data for asset types
INSERT INTO asset_types (category_id, code, name, name_ar, requires_certification, inspection_interval_days, is_system) 
SELECT ac.id, at.code, at.name, at.name_ar, at.requires_cert, at.interval_days, true
FROM asset_categories ac
CROSS JOIN (VALUES
  ('fire_safety', 'fire_extinguisher', 'Fire Extinguisher', 'طفاية حريق', true, 30),
  ('fire_safety', 'fire_hose', 'Fire Hose Reel', 'بكرة خرطوم الحريق', true, 90),
  ('fire_safety', 'smoke_detector', 'Smoke Detector', 'كاشف الدخان', false, 180),
  ('fire_safety', 'fire_alarm', 'Fire Alarm Panel', 'لوحة إنذار الحريق', true, 365),
  ('fire_safety', 'sprinkler_system', 'Sprinkler System', 'نظام الرشاشات', true, 365),
  ('first_aid', 'first_aid_kit', 'First Aid Kit', 'حقيبة إسعافات أولية', false, 90),
  ('first_aid', 'aed', 'AED (Defibrillator)', 'جهاز إزالة الرجفان', true, 30),
  ('first_aid', 'eye_wash_station', 'Eye Wash Station', 'محطة غسل العين', false, 30),
  ('first_aid', 'stretcher', 'Emergency Stretcher', 'نقالة طوارئ', false, 180),
  ('ppe', 'hard_hat', 'Hard Hat', 'خوذة السلامة', false, 365),
  ('ppe', 'safety_glasses', 'Safety Glasses', 'نظارات السلامة', false, 180),
  ('ppe', 'safety_harness', 'Safety Harness', 'حزام السلامة', true, 180),
  ('ppe', 'respirator', 'Respirator/Mask', 'جهاز التنفس/قناع', true, 90),
  ('emergency', 'emergency_light', 'Emergency Lighting', 'إضاءة الطوارئ', false, 90),
  ('emergency', 'exit_sign', 'Exit Sign', 'لافتة مخرج', false, 180),
  ('emergency', 'evacuation_chair', 'Evacuation Chair', 'كرسي الإخلاء', false, 365),
  ('emergency', 'spill_kit', 'Spill Kit', 'حقيبة التسرب', false, 180),
  ('electrical', 'lockout_tagout', 'Lockout/Tagout Device', 'جهاز القفل/الإيقاف', false, 365),
  ('electrical', 'grounding_equipment', 'Grounding Equipment', 'معدات التأريض', true, 180),
  ('fall_protection', 'guardrail', 'Guardrail System', 'نظام الدرابزين', false, 365),
  ('fall_protection', 'safety_net', 'Safety Net', 'شبكة الأمان', true, 180),
  ('fall_protection', 'anchor_point', 'Anchor Point', 'نقطة الربط', true, 365),
  ('hazmat', 'chemical_cabinet', 'Chemical Storage Cabinet', 'خزانة المواد الكيميائية', false, 90),
  ('hazmat', 'containment_berm', 'Containment Berm', 'حاجز الاحتواء', false, 180),
  ('signage', 'safety_sign', 'Safety Sign', 'لافتة السلامة', false, 365),
  ('signage', 'floor_marking', 'Floor Marking', 'علامات الأرضية', false, 90)
) AS at(cat_code, code, name, name_ar, requires_cert, interval_days)
WHERE ac.code = at.cat_code
ON CONFLICT DO NOTHING;

-- Register Asset Management module
INSERT INTO modules (code, name, description, icon, base_price_monthly, base_price_yearly, is_active, sort_order)
VALUES ('asset_management', 'Asset Management', 'HSSE Asset tracking, inspection scheduling, and maintenance management', 'Package', 100, 1000, true, 6)
ON CONFLICT DO NOTHING;

-- Create asset-files storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('asset-files', 'asset-files', false, 52428800)
ON CONFLICT DO NOTHING;

-- Storage policies for asset-files bucket
CREATE POLICY "Users can view asset files in their tenant"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'asset-files' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = get_auth_tenant_id()::text
);

CREATE POLICY "Asset managers can upload files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'asset-files'
  AND auth.uid() IS NOT NULL
  AND has_asset_management_access(auth.uid())
  AND (storage.foldername(name))[1] = get_auth_tenant_id()::text
);

CREATE POLICY "Asset managers can update files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'asset-files'
  AND auth.uid() IS NOT NULL
  AND has_asset_management_access(auth.uid())
  AND (storage.foldername(name))[1] = get_auth_tenant_id()::text
);

CREATE POLICY "Asset managers can delete files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'asset-files'
  AND auth.uid() IS NOT NULL
  AND has_asset_management_access(auth.uid())
  AND (storage.foldername(name))[1] = get_auth_tenant_id()::text
);