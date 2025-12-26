-- Fix search_path for remaining functions

-- Drop and recreate haversine_distance with search_path
DROP FUNCTION IF EXISTS public.haversine_distance(double precision, double precision, double precision, double precision);

CREATE FUNCTION public.haversine_distance(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
RETURNS double precision
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  r double precision := 6371000; -- Earth radius in meters
  dlat double precision;
  dlon double precision;
  a double precision;
  c double precision;
BEGIN
  dlat := radians(lat2 - lat1);
  dlon := radians(lng2 - lng1);
  a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2) * sin(dlon/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  RETURN r * c;
END;
$$;

-- Drop and recreate point_in_polygon with search_path
DROP FUNCTION IF EXISTS public.point_in_polygon(double precision, double precision, jsonb);

CREATE FUNCTION public.point_in_polygon(
  p_lat double precision,
  p_lng double precision,
  p_polygon jsonb
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  i integer;
  j integer;
  n integer;
  inside boolean := false;
  xi double precision;
  yi double precision;
  xj double precision;
  yj double precision;
BEGIN
  n := jsonb_array_length(p_polygon);
  j := n - 1;
  
  FOR i IN 0..n-1 LOOP
    xi := (p_polygon->i->>'lng')::double precision;
    yi := (p_polygon->i->>'lat')::double precision;
    xj := (p_polygon->j->>'lng')::double precision;
    yj := (p_polygon->j->>'lat')::double precision;
    
    IF ((yi > p_lat) <> (yj > p_lat)) AND 
       (p_lng < (xj - xi) * (p_lat - yi) / (yj - yi) + xi) THEN
      inside := NOT inside;
    END IF;
    
    j := i;
  END LOOP;
  
  RETURN inside;
END;
$$;