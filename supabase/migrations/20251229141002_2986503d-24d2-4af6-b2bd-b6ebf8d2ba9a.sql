-- Seed Security Zones with required polygon_geojson
INSERT INTO public.security_zones (id, tenant_id, zone_code, zone_name, zone_name_ar, description, zone_type, color, geofence_radius_meters, polygon_geojson, is_active)
SELECT 
  gen_random_uuid(),
  t.id,
  zone.zone_code,
  zone.zone_name,
  zone.zone_name_ar,
  zone.description,
  zone.zone_type,
  zone.color,
  zone.geofence_radius_meters,
  '{"type":"Polygon","coordinates":[[[0,0],[0,0.001],[0.001,0.001],[0.001,0],[0,0]]]}'::jsonb,
  true
FROM tenants t
CROSS JOIN (VALUES 
  ('ZONE-GATE-01', 'Main Entrance Gate', 'بوابة المدخل الرئيسي', 'Primary entry/exit point for all personnel and visitors', 'entry', '#3B82F6', 50),
  ('ZONE-WARE-01', 'Warehouse Area', 'منطقة المستودعات', 'Secure storage area requiring authorized access', 'restricted', '#EF4444', 100),
  ('ZONE-ADMIN-01', 'Admin Building', 'المبنى الإداري', 'Administrative offices and meeting rooms', 'public', '#22C55E', 30)
) AS zone(zone_code, zone_name, zone_name_ar, description, zone_type, color, geofence_radius_meters)
WHERE NOT EXISTS (
  SELECT 1 FROM security_zones sz WHERE sz.tenant_id = t.id AND sz.zone_code = zone.zone_code
);

-- Seed CCTV Cameras
INSERT INTO public.cctv_cameras (id, tenant_id, camera_code, name, name_ar, location_description, status, is_recording, resolution, rtsp_url, is_active)
SELECT 
  gen_random_uuid(),
  t.id,
  cam.camera_code,
  cam.name,
  cam.name_ar,
  cam.location_description,
  cam.status,
  cam.is_recording,
  cam.resolution,
  cam.rtsp_url,
  true
FROM tenants t
CROSS JOIN (VALUES 
  ('CAM-001', 'Main Gate Camera', 'كاميرا البوابة الرئيسية', 'Main Entrance Gate', 'online', true, '1080p', 'rtsp://cam001.local/stream'),
  ('CAM-002', 'Parking Lot', 'كاميرا موقف السيارات', 'Visitor Parking Area', 'online', true, '720p', 'rtsp://cam002.local/stream'),
  ('CAM-003', 'Warehouse Entry', 'كاميرا مدخل المستودع', 'Warehouse Loading Bay', 'online', true, '1080p', 'rtsp://cam003.local/stream'),
  ('CAM-004', 'Loading Dock', 'كاميرا منطقة التحميل', 'Rear Loading Area', 'maintenance', false, '1080p', 'rtsp://cam004.local/stream'),
  ('CAM-005', 'Emergency Exit', 'كاميرا مخرج الطوارئ', 'Building A Emergency Exit', 'online', true, '720p', 'rtsp://cam005.local/stream')
) AS cam(camera_code, name, name_ar, location_description, status, is_recording, resolution, rtsp_url)
WHERE NOT EXISTS (
  SELECT 1 FROM cctv_cameras cc WHERE cc.tenant_id = t.id AND cc.camera_code = cam.camera_code
);

-- Seed Emergency Response SLA Configs
INSERT INTO public.emergency_response_sla_configs (id, tenant_id, alert_type, priority, max_response_seconds, escalation_after_seconds, second_escalation_seconds, is_active)
SELECT 
  gen_random_uuid(),
  t.id,
  sla.alert_type,
  sla.priority,
  sla.max_response_seconds,
  sla.escalation_after_seconds,
  sla.second_escalation_seconds,
  true
FROM tenants t
CROSS JOIN (VALUES 
  ('panic', 'critical', 120, 180, 300),
  ('fire', 'critical', 120, 180, 300),
  ('medical', 'high', 300, 600, 900),
  ('security_breach', 'high', 300, 600, 900),
  ('other', 'medium', 600, 900, 1200)
) AS sla(alert_type, priority, max_response_seconds, escalation_after_seconds, second_escalation_seconds)
WHERE NOT EXISTS (
  SELECT 1 FROM emergency_response_sla_configs e WHERE e.tenant_id = t.id AND e.alert_type = sla.alert_type
);