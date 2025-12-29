-- =====================================================
-- SECURITY ENHANCEMENTS: Complete Database Migration
-- =====================================================

-- 1. Emergency Response SLA Configs Table
CREATE TABLE public.emergency_response_sla_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'high',
  max_response_seconds INTEGER NOT NULL DEFAULT 60,
  escalation_after_seconds INTEGER DEFAULT 180,
  second_escalation_seconds INTEGER DEFAULT 300,
  escalation_recipients JSONB DEFAULT '[]'::jsonb,
  notification_channels TEXT[] DEFAULT ARRAY['push', 'email']::TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  UNIQUE(tenant_id, alert_type, priority)
);

-- Add SLA breach tracking to emergency_alerts
ALTER TABLE public.emergency_alerts 
ADD COLUMN IF NOT EXISTS sla_breach_notified_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS escalated_to JSONB DEFAULT NULL;

-- 2. Guard Attendance Logs Table
CREATE TABLE public.guard_attendance_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  guard_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  roster_id UUID REFERENCES public.shift_roster(id) ON DELETE SET NULL,
  zone_id UUID REFERENCES public.security_zones(id) ON DELETE SET NULL,
  check_in_at TIMESTAMP WITH TIME ZONE,
  check_in_lat DOUBLE PRECISION,
  check_in_lng DOUBLE PRECISION,
  check_in_accuracy DOUBLE PRECISION,
  check_in_method TEXT DEFAULT 'gps',
  check_in_photo_path TEXT,
  check_out_at TIMESTAMP WITH TIME ZONE,
  check_out_lat DOUBLE PRECISION,
  check_out_lng DOUBLE PRECISION,
  check_out_accuracy DOUBLE PRECISION,
  check_out_method TEXT DEFAULT 'gps',
  check_out_photo_path TEXT,
  expected_start_time TIMESTAMP WITH TIME ZONE,
  expected_end_time TIMESTAMP WITH TIME ZONE,
  gps_validated BOOLEAN DEFAULT false,
  late_minutes INTEGER DEFAULT 0,
  early_departure_minutes INTEGER DEFAULT 0,
  overtime_minutes INTEGER DEFAULT 0,
  total_hours_worked DECIMAL(5,2),
  status TEXT DEFAULT 'pending',
  notes TEXT,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 3. CCTV Cameras Table
CREATE TABLE public.cctv_cameras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  camera_code TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  zone_id UUID REFERENCES public.security_zones(id) ON DELETE SET NULL,
  location_description TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  floor_number INTEGER,
  building TEXT,
  provider TEXT,
  model TEXT,
  ip_address TEXT,
  mac_address TEXT,
  stream_url TEXT,
  snapshot_url TEXT,
  rtsp_url TEXT,
  ptz_enabled BOOLEAN DEFAULT false,
  audio_enabled BOOLEAN DEFAULT false,
  night_vision BOOLEAN DEFAULT false,
  resolution TEXT,
  status TEXT DEFAULT 'offline',
  is_recording BOOLEAN DEFAULT true,
  is_motion_detection_enabled BOOLEAN DEFAULT false,
  last_health_check TIMESTAMP WITH TIME ZONE,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  health_check_interval_minutes INTEGER DEFAULT 5,
  installation_date DATE,
  warranty_expiry DATE,
  assigned_to UUID REFERENCES public.profiles(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  UNIQUE(tenant_id, camera_code)
);

-- 4. CCTV Events Table
CREATE TABLE public.cctv_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  camera_id UUID NOT NULL REFERENCES public.cctv_cameras(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  thumbnail_url TEXT,
  clip_url TEXT,
  clip_duration_seconds INTEGER,
  detection_confidence DECIMAL(5,2),
  detection_metadata JSONB,
  linked_incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
  linked_patrol_id UUID REFERENCES public.security_patrols(id) ON DELETE SET NULL,
  linked_alert_id UUID REFERENCES public.emergency_alerts(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  is_false_positive BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 5. Add patrol_id to incidents table
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS patrol_id UUID REFERENCES public.security_patrols(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS patrol_checkpoint_id UUID REFERENCES public.patrol_checkpoint_logs(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.emergency_response_sla_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guard_attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cctv_cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cctv_events ENABLE ROW LEVEL SECURITY;

-- SLA Configs Policies (using tenant-based isolation)
CREATE POLICY "Users can view SLA configs for their tenant"
  ON public.emergency_response_sla_configs FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage SLA configs"
  ON public.emergency_response_sla_configs FOR ALL
  USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- Guard Attendance Policies
CREATE POLICY "Users can view attendance for their tenant"
  ON public.guard_attendance_logs FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Guards can create their own attendance"
  ON public.guard_attendance_logs FOR INSERT
  WITH CHECK (guard_id = auth.uid() AND tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Guards can update their own attendance"
  ON public.guard_attendance_logs FOR UPDATE
  USING (
    guard_id = auth.uid() 
    OR (
      tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
      AND public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Admins can delete attendance"
  ON public.guard_attendance_logs FOR DELETE
  USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- CCTV Cameras Policies
CREATE POLICY "Users can view cameras for their tenant"
  ON public.cctv_cameras FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can manage cameras"
  ON public.cctv_cameras FOR ALL
  USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND public.has_role(auth.uid(), 'admin')
  );

-- CCTV Events Policies
CREATE POLICY "Users can view events for their tenant"
  ON public.cctv_events FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert events for their tenant"
  ON public.cctv_events FOR INSERT
  WITH CHECK (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update events for their tenant"
  ON public.cctv_events FOR UPDATE
  USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Indexes
CREATE INDEX idx_emergency_sla_configs_tenant ON public.emergency_response_sla_configs(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_emergency_sla_configs_type ON public.emergency_response_sla_configs(alert_type, priority) WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX idx_guard_attendance_tenant ON public.guard_attendance_logs(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_guard_attendance_guard ON public.guard_attendance_logs(guard_id, check_in_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_guard_attendance_date ON public.guard_attendance_logs(tenant_id, check_in_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_guard_attendance_status ON public.guard_attendance_logs(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_cctv_cameras_tenant ON public.cctv_cameras(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_cctv_cameras_status ON public.cctv_cameras(tenant_id, status) WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX idx_cctv_cameras_zone ON public.cctv_cameras(zone_id) WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX idx_cctv_events_camera ON public.cctv_events(camera_id, triggered_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_cctv_events_tenant ON public.cctv_events(tenant_id, triggered_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_cctv_events_type ON public.cctv_events(tenant_id, event_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_patrol ON public.incidents(patrol_id) WHERE patrol_id IS NOT NULL AND deleted_at IS NULL;

-- Triggers
CREATE TRIGGER update_emergency_sla_configs_updated_at
  BEFORE UPDATE ON public.emergency_response_sla_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guard_attendance_updated_at
  BEFORE UPDATE ON public.guard_attendance_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cctv_cameras_updated_at
  BEFORE UPDATE ON public.cctv_cameras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();