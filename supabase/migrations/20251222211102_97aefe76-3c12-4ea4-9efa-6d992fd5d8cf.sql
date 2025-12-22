-- Add boundary_polygon column to sites table for polygon boundary storage
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS boundary_polygon JSONB;

-- Add comment explaining the structure
COMMENT ON COLUMN public.sites.boundary_polygon IS 'Array of [lat, lng] coordinates defining the site boundary polygon, e.g., [[24.7136, 46.6753], [24.7140, 46.6760], ...]';

-- Create site_departments junction table for site-to-department mapping
CREATE TABLE IF NOT EXISTS public.site_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  deleted_at TIMESTAMPTZ,
  UNIQUE(site_id, department_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_site_departments_site_id ON public.site_departments(site_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_site_departments_department_id ON public.site_departments(department_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_site_departments_tenant_id ON public.site_departments(tenant_id) WHERE deleted_at IS NULL;

-- Enable RLS on site_departments
ALTER TABLE public.site_departments ENABLE ROW LEVEL SECURITY;

-- RLS policies for site_departments
CREATE POLICY "Tenant isolation for site_departments"
ON public.site_departments
FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create function to find site by GPS location (point-in-polygon check)
CREATE OR REPLACE FUNCTION public.find_site_by_location(
  p_tenant_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
)
RETURNS TABLE(
  site_id UUID,
  site_name TEXT,
  primary_department_id UUID,
  primary_department_name TEXT,
  distance_meters DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_site RECORD;
  v_polygon JSONB;
  v_inside BOOLEAN;
  v_min_distance DOUBLE PRECISION := 999999;
  v_nearest_site UUID;
  v_nearest_site_name TEXT;
  v_nearest_dept_id UUID;
  v_nearest_dept_name TEXT;
BEGIN
  -- Loop through sites with polygon boundaries
  FOR v_site IN 
    SELECT s.id, s.name, s.boundary_polygon, s.latitude, s.longitude
    FROM sites s
    WHERE s.tenant_id = p_tenant_id 
      AND s.deleted_at IS NULL
      AND s.boundary_polygon IS NOT NULL
  LOOP
    v_polygon := v_site.boundary_polygon;
    
    -- Point-in-polygon check using ray casting algorithm
    v_inside := public.point_in_polygon(p_lat, p_lng, v_polygon);
    
    IF v_inside THEN
      -- Get primary department for this site
      SELECT sd.department_id, d.name 
      INTO v_nearest_dept_id, v_nearest_dept_name
      FROM site_departments sd
      JOIN departments d ON d.id = sd.department_id
      WHERE sd.site_id = v_site.id 
        AND sd.is_primary = true 
        AND sd.deleted_at IS NULL
      LIMIT 1;
      
      RETURN QUERY SELECT v_site.id, v_site.name::TEXT, v_nearest_dept_id, v_nearest_dept_name, 0::DOUBLE PRECISION;
      RETURN;
    END IF;
  END LOOP;
  
  -- Fallback: find nearest site by center point within 500m
  FOR v_site IN 
    SELECT s.id, s.name, s.latitude, s.longitude,
           public.haversine_distance(p_lat, p_lng, s.latitude, s.longitude) as dist
    FROM sites s
    WHERE s.tenant_id = p_tenant_id 
      AND s.deleted_at IS NULL
      AND s.latitude IS NOT NULL 
      AND s.longitude IS NOT NULL
    ORDER BY dist
    LIMIT 1
  LOOP
    IF v_site.dist <= 500 THEN
      -- Get primary department
      SELECT sd.department_id, d.name 
      INTO v_nearest_dept_id, v_nearest_dept_name
      FROM site_departments sd
      JOIN departments d ON d.id = sd.department_id
      WHERE sd.site_id = v_site.id 
        AND sd.is_primary = true 
        AND sd.deleted_at IS NULL
      LIMIT 1;
      
      RETURN QUERY SELECT v_site.id, v_site.name::TEXT, v_nearest_dept_id, v_nearest_dept_name, v_site.dist;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- Create point_in_polygon helper function (ray casting algorithm)
CREATE OR REPLACE FUNCTION public.point_in_polygon(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_polygon JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_n INTEGER;
  v_inside BOOLEAN := false;
  v_j INTEGER;
  v_xi DOUBLE PRECISION;
  v_yi DOUBLE PRECISION;
  v_xj DOUBLE PRECISION;
  v_yj DOUBLE PRECISION;
BEGIN
  v_n := jsonb_array_length(p_polygon);
  v_j := v_n - 1;
  
  FOR i IN 0..v_n-1 LOOP
    v_xi := (p_polygon->i->0)::DOUBLE PRECISION;
    v_yi := (p_polygon->i->1)::DOUBLE PRECISION;
    v_xj := (p_polygon->v_j->0)::DOUBLE PRECISION;
    v_yj := (p_polygon->v_j->1)::DOUBLE PRECISION;
    
    IF ((v_yi > p_lng) != (v_yj > p_lng)) AND
       (p_lat < (v_xj - v_xi) * (p_lng - v_yi) / (v_yj - v_yi) + v_xi) THEN
      v_inside := NOT v_inside;
    END IF;
    
    v_j := i;
  END LOOP;
  
  RETURN v_inside;
END;
$$;

-- Create haversine_distance function if it doesn't exist
CREATE OR REPLACE FUNCTION public.haversine_distance(
  lat1 DOUBLE PRECISION,
  lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lng2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_r DOUBLE PRECISION := 6371000; -- Earth radius in meters
  v_dlat DOUBLE PRECISION;
  v_dlng DOUBLE PRECISION;
  v_a DOUBLE PRECISION;
  v_c DOUBLE PRECISION;
BEGIN
  v_dlat := radians(lat2 - lat1);
  v_dlng := radians(lng2 - lng1);
  
  v_a := sin(v_dlat / 2) * sin(v_dlat / 2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(v_dlng / 2) * sin(v_dlng / 2);
  
  v_c := 2 * atan2(sqrt(v_a), sqrt(1 - v_a));
  
  RETURN v_r * v_c;
END;
$$;