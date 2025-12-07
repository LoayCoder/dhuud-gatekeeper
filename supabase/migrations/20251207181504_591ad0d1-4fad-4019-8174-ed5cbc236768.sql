
-- Create inspection_schedules table for recurring inspection management
CREATE TABLE public.inspection_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  reference_id TEXT NOT NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  schedule_type TEXT NOT NULL DEFAULT 'area' CHECK (schedule_type IN ('asset', 'area', 'audit')),
  template_id UUID NOT NULL REFERENCES public.inspection_templates(id) ON DELETE RESTRICT,
  
  -- Frequency configuration
  frequency_type TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'semi_annually', 'annually', 'custom')),
  frequency_value INTEGER NOT NULL DEFAULT 1 CHECK (frequency_value > 0),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  month_of_year INTEGER CHECK (month_of_year >= 1 AND month_of_year <= 12),
  
  -- Location filters (optional)
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  floor_zone_id UUID REFERENCES public.floors_zones(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.asset_categories(id) ON DELETE SET NULL,
  type_id UUID REFERENCES public.asset_types(id) ON DELETE SET NULL,
  
  -- Assignment
  assigned_inspector_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_team JSONB DEFAULT '[]'::jsonb,
  
  -- Timing
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  next_due DATE,
  last_generated TIMESTAMPTZ,
  reminder_days_before INTEGER NOT NULL DEFAULT 3 CHECK (reminder_days_before >= 1 AND reminder_days_before <= 30),
  last_reminder_sent TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX idx_inspection_schedules_tenant ON public.inspection_schedules(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inspection_schedules_template ON public.inspection_schedules(template_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_inspection_schedules_next_due ON public.inspection_schedules(next_due) WHERE deleted_at IS NULL AND is_active = true;
CREATE INDEX idx_inspection_schedules_active ON public.inspection_schedules(tenant_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_inspection_schedules_type ON public.inspection_schedules(schedule_type) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE public.inspection_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view schedules in their tenant"
ON public.inspection_schedules FOR SELECT
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL);

CREATE POLICY "HSSE users can create schedules"
ON public.inspection_schedules FOR INSERT
WITH CHECK (tenant_id = get_auth_tenant_id() AND has_asset_management_access(auth.uid()));

CREATE POLICY "HSSE users can update schedules"
ON public.inspection_schedules FOR UPDATE
USING (tenant_id = get_auth_tenant_id() AND deleted_at IS NULL AND has_asset_management_access(auth.uid()));

CREATE POLICY "Admins can delete schedules"
ON public.inspection_schedules FOR DELETE
USING (has_role(auth.uid(), 'admin') AND tenant_id = get_auth_tenant_id());

-- Auto-generate reference_id trigger
CREATE OR REPLACE FUNCTION generate_inspection_schedule_reference_id()
RETURNS TRIGGER AS $$
DECLARE
  v_year TEXT;
  v_sequence INT;
  v_prefix TEXT;
BEGIN
  v_year := to_char(CURRENT_DATE, 'YYYY');
  v_prefix := 'SCH';
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(reference_id FROM 10 FOR 4) AS INT)), 0) + 1
  INTO v_sequence
  FROM inspection_schedules
  WHERE reference_id LIKE v_prefix || '-' || v_year || '-%'
  AND tenant_id = NEW.tenant_id;
  
  NEW.reference_id := v_prefix || '-' || v_year || '-' || LPAD(v_sequence::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_inspection_schedule_reference_id
BEFORE INSERT ON public.inspection_schedules
FOR EACH ROW
WHEN (NEW.reference_id IS NULL OR NEW.reference_id = '')
EXECUTE FUNCTION generate_inspection_schedule_reference_id();

-- Auto-update updated_at trigger
CREATE TRIGGER update_inspection_schedules_updated_at
BEFORE UPDATE ON public.inspection_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate next inspection due date
CREATE OR REPLACE FUNCTION calculate_next_inspection_due(
  p_frequency_type TEXT,
  p_frequency_value INT,
  p_last_due DATE,
  p_day_of_week INT DEFAULT NULL,
  p_day_of_month INT DEFAULT NULL
) RETURNS DATE AS $$
DECLARE
  v_next_due DATE;
BEGIN
  CASE p_frequency_type
    WHEN 'daily' THEN 
      v_next_due := p_last_due + (p_frequency_value || ' days')::interval;
    WHEN 'weekly' THEN 
      v_next_due := p_last_due + (p_frequency_value * 7 || ' days')::interval;
    WHEN 'monthly' THEN 
      v_next_due := p_last_due + (p_frequency_value || ' months')::interval;
    WHEN 'quarterly' THEN 
      v_next_due := p_last_due + (p_frequency_value * 3 || ' months')::interval;
    WHEN 'semi_annually' THEN 
      v_next_due := p_last_due + (p_frequency_value * 6 || ' months')::interval;
    WHEN 'annually' THEN 
      v_next_due := p_last_due + (p_frequency_value || ' years')::interval;
    ELSE 
      v_next_due := p_last_due + (p_frequency_value || ' days')::interval;
  END CASE;
  
  -- Adjust for day_of_month if specified
  IF p_day_of_month IS NOT NULL AND p_frequency_type IN ('monthly', 'quarterly', 'semi_annually', 'annually') THEN
    v_next_due := make_date(
      EXTRACT(YEAR FROM v_next_due)::INT,
      EXTRACT(MONTH FROM v_next_due)::INT,
      LEAST(p_day_of_month, (DATE_TRUNC('month', v_next_due) + INTERVAL '1 month - 1 day')::DATE - DATE_TRUNC('month', v_next_due)::DATE + 1)
    );
  END IF;
  
  RETURN v_next_due;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Auto-calculate next_due on insert
CREATE OR REPLACE FUNCTION set_initial_next_due()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.next_due IS NULL THEN
    NEW.next_due := GREATEST(NEW.start_date, CURRENT_DATE);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_inspection_schedule_next_due
BEFORE INSERT ON public.inspection_schedules
FOR EACH ROW
EXECUTE FUNCTION set_initial_next_due();

-- RPC function to get upcoming schedules
CREATE OR REPLACE FUNCTION get_upcoming_inspection_schedules(p_days_ahead INT DEFAULT 7)
RETURNS TABLE (
  id UUID,
  reference_id TEXT,
  name TEXT,
  schedule_type TEXT,
  next_due DATE,
  days_until INT,
  assigned_inspector_id UUID,
  template_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.reference_id,
    s.name,
    s.schedule_type,
    s.next_due,
    (s.next_due - CURRENT_DATE)::INT as days_until,
    s.assigned_inspector_id,
    s.template_id
  FROM inspection_schedules s
  WHERE s.tenant_id = get_auth_tenant_id()
    AND s.deleted_at IS NULL
    AND s.is_active = true
    AND s.next_due IS NOT NULL
    AND s.next_due <= CURRENT_DATE + (p_days_ahead || ' days')::interval
    AND (s.end_date IS NULL OR s.end_date >= CURRENT_DATE)
  ORDER BY s.next_due ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC function to get overdue schedules count
CREATE OR REPLACE FUNCTION get_overdue_schedules_count()
RETURNS INT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INT
    FROM inspection_schedules
    WHERE tenant_id = get_auth_tenant_id()
      AND deleted_at IS NULL
      AND is_active = true
      AND next_due IS NOT NULL
      AND next_due < CURRENT_DATE
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
