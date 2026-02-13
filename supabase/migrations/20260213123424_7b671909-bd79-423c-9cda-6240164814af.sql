
-- Set search_path on get_kpi_historical_trend which was missing it
ALTER FUNCTION public.get_kpi_historical_trend(date, date, uuid, uuid) SET search_path TO 'public';
