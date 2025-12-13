
-- ============================================
-- SECURITY OPERATIONS MODULE - COMPLETE SCHEMA
-- ============================================

-- 1. ENHANCE VISITORS TABLE
ALTER TABLE public.visitors 
ADD COLUMN IF NOT EXISTS car_plate text,
ADD COLUMN IF NOT EXISTS passenger_count integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS nationality text,
ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en',
ADD COLUMN IF NOT EXISTS destination_id uuid,
ADD COLUMN IF NOT EXISTS whatsapp_sent_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS gate_entry_method text DEFAULT 'manual';

-- 2. GATE ENTRY LOGS (High-volume daily gate activity)
CREATE TABLE IF NOT EXISTS public.gate_entry_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  visitor_id uuid REFERENCES public.visitors(id),
  entry_type text NOT NULL DEFAULT 'visitor', -- visitor, contractor, employee, vehicle
  person_name text NOT NULL,
  mobile_number text,
  car_plate text,
  passenger_count integer DEFAULT 1,
  destination_id uuid,
  destination_name text,
  purpose text,
  nationality text,
  preferred_language text DEFAULT 'en',
  entry_time timestamp with time zone NOT NULL DEFAULT now(),
  exit_time timestamp with time zone,
  guard_id uuid REFERENCES public.profiles(id),
  gate_id text,
  site_id uuid REFERENCES public.sites(id),
  anpr_image_path text,
  anpr_confidence numeric,
  whatsapp_sent_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone
);

-- 3. CONTRACTORS TABLE
CREATE TABLE IF NOT EXISTS public.contractors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  contractor_code text NOT NULL,
  full_name text NOT NULL,
  company_name text,
  mobile_number text,
  email text,
  national_id text,
  nationality text,
  preferred_language text DEFAULT 'en',
  photo_path text,
  qr_code_data text,
  permit_number text,
  permit_expiry_date date,
  safety_induction_date date,
  safety_induction_expiry date,
  medical_exam_date date,
  medical_exam_expiry date,
  is_banned boolean DEFAULT false,
  ban_reason text,
  banned_at timestamp with time zone,
  banned_by uuid REFERENCES public.profiles(id),
  ban_expires_at timestamp with time zone,
  allowed_sites uuid[],
  allowed_zones uuid[],
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  UNIQUE(tenant_id, contractor_code)
);

-- 4. CONTRACTOR ACCESS LOGS
CREATE TABLE IF NOT EXISTS public.contractor_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id),
  access_type text NOT NULL DEFAULT 'entry', -- entry, exit, denied
  site_id uuid REFERENCES public.sites(id),
  zone_id uuid,
  guard_id uuid REFERENCES public.profiles(id),
  validation_status text NOT NULL, -- valid, banned, permit_expired, induction_expired, medical_expired
  validation_errors jsonb DEFAULT '[]',
  alert_sent boolean DEFAULT false,
  alert_language text,
  entry_time timestamp with time zone NOT NULL DEFAULT now(),
  exit_time timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone
);

-- 5. SECURITY ZONES (Polygon-based areas)
CREATE TABLE IF NOT EXISTS public.security_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  site_id uuid REFERENCES public.sites(id),
  zone_code text NOT NULL,
  zone_name text NOT NULL,
  zone_name_ar text,
  zone_type text DEFAULT 'general', -- general, restricted, vip, gate, perimeter
  description text,
  polygon_geojson jsonb NOT NULL, -- GeoJSON Polygon format
  center_lat double precision,
  center_lng double precision,
  color text DEFAULT '#3B82F6',
  risk_level text DEFAULT 'low', -- low, medium, high, critical
  requires_escort boolean DEFAULT false,
  max_occupancy integer,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  UNIQUE(tenant_id, zone_code)
);

-- 6. SECURITY SHIFTS
CREATE TABLE IF NOT EXISTS public.security_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  shift_code text NOT NULL,
  shift_name text NOT NULL,
  shift_name_ar text,
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_overnight boolean DEFAULT false,
  break_duration_minutes integer DEFAULT 30,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  UNIQUE(tenant_id, shift_code)
);

-- 7. SHIFT ROSTER (Guard assignments)
CREATE TABLE IF NOT EXISTS public.shift_roster (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  guard_id uuid NOT NULL REFERENCES public.profiles(id),
  zone_id uuid NOT NULL REFERENCES public.security_zones(id),
  shift_id uuid NOT NULL REFERENCES public.security_shifts(id),
  roster_date date NOT NULL,
  status text DEFAULT 'scheduled', -- scheduled, checked_in, on_duty, checked_out, absent, relieved
  check_in_time timestamp with time zone,
  check_in_lat double precision,
  check_in_lng double precision,
  check_out_time timestamp with time zone,
  check_out_lat double precision,
  check_out_lng double precision,
  relief_guard_id uuid REFERENCES public.profiles(id),
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone
);

-- 8. GUARD TRACKING HISTORY
CREATE TABLE IF NOT EXISTS public.guard_tracking_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  guard_id uuid NOT NULL REFERENCES public.profiles(id),
  roster_id uuid REFERENCES public.shift_roster(id),
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  altitude double precision,
  speed double precision,
  heading double precision,
  battery_level integer,
  is_within_zone boolean,
  assigned_zone_id uuid REFERENCES public.security_zones(id),
  distance_from_zone double precision,
  recorded_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- 9. GEOFENCE ALERTS
CREATE TABLE IF NOT EXISTS public.geofence_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  guard_id uuid NOT NULL REFERENCES public.profiles(id),
  roster_id uuid REFERENCES public.shift_roster(id),
  zone_id uuid REFERENCES public.security_zones(id),
  alert_type text NOT NULL, -- zone_exit, zone_entry, extended_absence, no_movement, sos
  severity text DEFAULT 'warning', -- info, warning, critical
  guard_lat double precision,
  guard_lng double precision,
  distance_from_zone double precision,
  alert_message text,
  acknowledged_by uuid REFERENCES public.profiles(id),
  acknowledged_at timestamp with time zone,
  resolved_by uuid REFERENCES public.profiles(id),
  resolved_at timestamp with time zone,
  resolution_notes text,
  created_at timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone
);

-- 10. ENHANCE PATROL CHECKPOINT LOGS
ALTER TABLE public.patrol_checkpoint_logs
ADD COLUMN IF NOT EXISTS gps_validated boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS validation_distance double precision,
ADD COLUMN IF NOT EXISTS validation_threshold double precision DEFAULT 20,
ADD COLUMN IF NOT EXISTS photo_paths jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS linked_incident_id uuid;

-- 11. ENHANCE PATROL ROUTES
ALTER TABLE public.security_patrol_routes
ADD COLUMN IF NOT EXISTS checkpoint_radius_meters integer DEFAULT 20,
ADD COLUMN IF NOT EXISTS require_photo boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS require_gps_validation boolean DEFAULT true;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_gate_entry_logs_tenant_entry ON public.gate_entry_logs(tenant_id, entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_gate_entry_logs_car_plate ON public.gate_entry_logs(tenant_id, car_plate);
CREATE INDEX IF NOT EXISTS idx_contractors_tenant_code ON public.contractors(tenant_id, contractor_code);
CREATE INDEX IF NOT EXISTS idx_contractors_qr ON public.contractors(tenant_id, qr_code_data);
CREATE INDEX IF NOT EXISTS idx_contractor_access_tenant ON public.contractor_access_logs(tenant_id, entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_security_zones_tenant ON public.security_zones(tenant_id, site_id);
CREATE INDEX IF NOT EXISTS idx_shift_roster_guard_date ON public.shift_roster(guard_id, roster_date);
CREATE INDEX IF NOT EXISTS idx_shift_roster_zone_date ON public.shift_roster(zone_id, roster_date);
CREATE INDEX IF NOT EXISTS idx_guard_tracking_guard ON public.guard_tracking_history(guard_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_guard_tracking_roster ON public.guard_tracking_history(roster_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_geofence_alerts_guard ON public.geofence_alerts(guard_id, created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Gate Entry Logs RLS
ALTER TABLE public.gate_entry_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Security users can manage gate entries"
  ON public.gate_entry_logs FOR ALL
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_security_access(auth.uid()));

CREATE POLICY "Users can view gate entries in tenant"
  ON public.gate_entry_logs FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

-- Contractors RLS
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Security users can manage contractors"
  ON public.contractors FOR ALL
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_security_access(auth.uid()));

CREATE POLICY "Users can view contractors in tenant"
  ON public.contractors FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

-- Contractor Access Logs RLS
ALTER TABLE public.contractor_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Security users can manage contractor access"
  ON public.contractor_access_logs FOR ALL
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_security_access(auth.uid()));

CREATE POLICY "Users can view contractor access in tenant"
  ON public.contractor_access_logs FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

-- Security Zones RLS
ALTER TABLE public.security_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage security zones"
  ON public.security_zones FOR ALL
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND (has_role(auth.uid(), 'admin'::app_role) OR has_security_access(auth.uid())));

CREATE POLICY "Users can view security zones in tenant"
  ON public.security_zones FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

-- Security Shifts RLS
ALTER TABLE public.security_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage security shifts"
  ON public.security_shifts FOR ALL
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND (has_role(auth.uid(), 'admin'::app_role) OR has_security_access(auth.uid())));

CREATE POLICY "Users can view security shifts in tenant"
  ON public.security_shifts FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

-- Shift Roster RLS
ALTER TABLE public.shift_roster ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Security users can manage roster"
  ON public.shift_roster FOR ALL
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_security_access(auth.uid()));

CREATE POLICY "Guards can view own roster"
  ON public.shift_roster FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND guard_id = auth.uid());

CREATE POLICY "Users can view roster in tenant"
  ON public.shift_roster FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

-- Guard Tracking History RLS
ALTER TABLE public.guard_tracking_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guards can insert own tracking"
  ON public.guard_tracking_history FOR INSERT
  WITH CHECK (tenant_id = get_auth_tenant_id() AND guard_id = auth.uid());

CREATE POLICY "Security supervisors can view tracking"
  ON public.guard_tracking_history FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND has_security_access(auth.uid()));

CREATE POLICY "Guards can view own tracking"
  ON public.guard_tracking_history FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND guard_id = auth.uid());

-- Geofence Alerts RLS
ALTER TABLE public.geofence_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Security users can manage alerts"
  ON public.geofence_alerts FOR ALL
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_security_access(auth.uid()));

CREATE POLICY "Guards can view own alerts"
  ON public.geofence_alerts FOR SELECT
  USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND guard_id = auth.uid());

-- ============================================
-- HELPER FUNCTION FOR SECURITY ACCESS
-- ============================================
CREATE OR REPLACE FUNCTION public.has_security_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT has_role(_user_id, 'admin'::app_role) 
    OR has_role_by_code(_user_id, 'security_manager')
    OR has_role_by_code(_user_id, 'security_supervisor')
    OR has_role_by_code(_user_id, 'security_officer')
$$;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE TRIGGER update_contractors_updated_at
  BEFORE UPDATE ON public.contractors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_security_zones_updated_at
  BEFORE UPDATE ON public.security_zones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_security_shifts_updated_at
  BEFORE UPDATE ON public.security_shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shift_roster_updated_at
  BEFORE UPDATE ON public.shift_roster
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
