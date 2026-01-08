-- Seed default incident tags for all tenants
INSERT INTO ai_tags (tenant_id, tag_type, name, name_ar, color, keywords, is_active, sort_order)
SELECT 
  t.id as tenant_id,
  'incident' as tag_type,
  v.name,
  v.name_ar,
  v.color,
  v.keywords::text[],
  true,
  v.sort_order
FROM tenants t
CROSS JOIN (VALUES 
  ('Fall from Height', 'سقوط من ارتفاع', '#EF4444', ARRAY['fall', 'height', 'ladder', 'scaffolding'], 1),
  ('Electrical Hazard', 'خطر كهربائي', '#F59E0B', ARRAY['electrical', 'shock', 'wire', 'power'], 2),
  ('Chemical Exposure', 'تعرض كيميائي', '#8B5CF6', ARRAY['chemical', 'spill', 'exposure', 'toxic'], 3),
  ('Vehicle Incident', 'حادث مركبة', '#3B82F6', ARRAY['vehicle', 'car', 'truck', 'collision'], 4),
  ('Slip/Trip/Fall', 'انزلاق/تعثر/سقوط', '#EC4899', ARRAY['slip', 'trip', 'floor', 'wet'], 5),
  ('Fire Hazard', 'خطر حريق', '#DC2626', ARRAY['fire', 'flame', 'smoke', 'burn'], 6),
  ('PPE Violation', 'مخالفة معدات الوقاية', '#6366F1', ARRAY['ppe', 'helmet', 'glasses', 'gloves'], 7),
  ('Housekeeping', 'التنظيف والترتيب', '#14B8A6', ARRAY['clean', 'organize', 'storage', 'clutter'], 8)
) AS v(name, name_ar, color, keywords, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM ai_tags WHERE tag_type = 'incident' AND tenant_id = t.id);

-- Seed default observation tags for all tenants
INSERT INTO ai_tags (tenant_id, tag_type, name, name_ar, color, keywords, is_active, sort_order)
SELECT 
  t.id as tenant_id,
  'observation' as tag_type,
  v.name,
  v.name_ar,
  v.color,
  v.keywords::text[],
  true,
  v.sort_order
FROM tenants t
CROSS JOIN (VALUES 
  ('Unsafe Act', 'تصرف غير آمن', '#EF4444', ARRAY['unsafe', 'behavior', 'action', 'violation'], 1),
  ('Unsafe Condition', 'حالة غير آمنة', '#F59E0B', ARRAY['condition', 'hazard', 'danger', 'risk'], 2),
  ('Near Miss', 'حادث وشيك', '#8B5CF6', ARRAY['near', 'miss', 'close', 'almost'], 3),
  ('Good Practice', 'ممارسة جيدة', '#22C55E', ARRAY['good', 'positive', 'best', 'practice'], 4),
  ('Environmental', 'بيئي', '#3B82F6', ARRAY['environment', 'pollution', 'waste', 'spill'], 5),
  ('Ergonomic', 'هندسة بشرية', '#EC4899', ARRAY['ergonomic', 'posture', 'lifting', 'strain'], 6),
  ('Security', 'أمني', '#6366F1', ARRAY['security', 'access', 'unauthorized', 'breach'], 7),
  ('Quality', 'جودة', '#14B8A6', ARRAY['quality', 'defect', 'standard', 'specification'], 8)
) AS v(name, name_ar, color, keywords, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM ai_tags WHERE tag_type = 'observation' AND tenant_id = t.id);