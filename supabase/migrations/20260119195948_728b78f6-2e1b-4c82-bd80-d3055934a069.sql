-- Create IP Geolocation Cache Table (if not exists from partial run)
CREATE TABLE IF NOT EXISTS public.ip_geo_cache (
  ip_address text PRIMARY KEY,
  country text,
  country_code text,
  city text,
  region text,
  latitude double precision,
  longitude double precision,
  org text,
  resolved_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_ip_geo_cache_expires ON ip_geo_cache(expires_at);

-- RLS for ip_geo_cache
ALTER TABLE ip_geo_cache ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can read ip_geo_cache" ON ip_geo_cache;
DROP POLICY IF EXISTS "System can insert ip_geo_cache" ON ip_geo_cache;
DROP POLICY IF EXISTS "System can update ip_geo_cache" ON ip_geo_cache;

CREATE POLICY "Admins can read ip_geo_cache"
ON ip_geo_cache FOR SELECT TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "System can insert ip_geo_cache"
ON ip_geo_cache FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "System can update ip_geo_cache"
ON ip_geo_cache FOR UPDATE TO authenticated
USING (true);

-- RPC Function: Get Blocked IPs with Geo Data
CREATE OR REPLACE FUNCTION get_blocked_ips_geo(p_time_range text DEFAULT 'all')
RETURNS TABLE (
  id uuid,
  ip_address text,
  block_type text,
  reason text,
  blocked_at timestamptz,
  failed_attempts integer,
  country text,
  city text,
  latitude double precision,
  longitude double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_date timestamptz;
BEGIN
  -- Check admin permission
  IF NOT is_admin(auth.uid()) THEN
    RETURN;
  END IF;

  -- Calculate time range
  CASE p_time_range
    WHEN '24h' THEN v_start_date := now() - interval '24 hours';
    WHEN '7d' THEN v_start_date := now() - interval '7 days';
    WHEN '30d' THEN v_start_date := now() - interval '30 days';
    ELSE v_start_date := '1970-01-01'::timestamptz;
  END CASE;

  RETURN QUERY
  SELECT 
    b.id,
    b.ip_address,
    b.block_type,
    b.reason,
    b.blocked_at,
    b.failed_attempts,
    COALESCE(b.geo_country, c.country) as country,
    COALESCE(b.geo_city, c.city) as city,
    COALESCE(b.geo_latitude, c.latitude) as latitude,
    COALESCE(b.geo_longitude, c.longitude) as longitude
  FROM ip_blocklist b
  LEFT JOIN ip_geo_cache c ON b.ip_address = c.ip_address
  WHERE (b.expires_at IS NULL OR b.expires_at > now())
    AND b.blocked_at >= v_start_date
  ORDER BY b.blocked_at DESC
  LIMIT 200;
END;
$$;

-- RPC Function: Cache IP Geolocation
CREATE OR REPLACE FUNCTION cache_ip_geolocation(
  p_ip_address text,
  p_country text,
  p_country_code text,
  p_city text,
  p_region text,
  p_latitude double precision,
  p_longitude double precision,
  p_org text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO ip_geo_cache (
    ip_address, country, country_code, city, region, 
    latitude, longitude, org, resolved_at, expires_at
  )
  VALUES (
    p_ip_address, p_country, p_country_code, p_city, p_region,
    p_latitude, p_longitude, p_org, now(), now() + interval '30 days'
  )
  ON CONFLICT (ip_address) DO UPDATE SET
    country = EXCLUDED.country,
    country_code = EXCLUDED.country_code,
    city = EXCLUDED.city,
    region = EXCLUDED.region,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    org = EXCLUDED.org,
    resolved_at = now(),
    expires_at = now() + interval '30 days';
    
  -- Also update the blocklist record if exists
  UPDATE ip_blocklist SET
    geo_country = p_country,
    geo_city = p_city,
    geo_latitude = p_latitude,
    geo_longitude = p_longitude,
    geo_resolved_at = now()
  WHERE ip_address = p_ip_address;
END;
$$;