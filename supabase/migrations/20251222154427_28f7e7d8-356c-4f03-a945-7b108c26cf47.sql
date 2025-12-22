-- Fix the trigger version of calculate_scheduled_notification_next (no params)
CREATE OR REPLACE FUNCTION public.calculate_scheduled_notification_next()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.is_active AND NEW.deleted_at IS NULL THEN
    NEW.next_scheduled_at := public.calculate_next_schedule_time(
      NEW.schedule_type,
      NEW.schedule_time,
      NEW.schedule_days_of_week,
      NEW.schedule_day_of_month,
      NEW.schedule_timezone,
      NEW.last_sent_at
    );
  ELSE
    NEW.next_scheduled_at := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix the complex overload of calculate_next_schedule_time
CREATE OR REPLACE FUNCTION public.calculate_next_schedule_time(
  p_schedule_type text,
  p_schedule_time time without time zone,
  p_schedule_days_of_week integer[],
  p_schedule_day_of_month integer,
  p_schedule_timezone text,
  p_last_sent_at timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_now TIMESTAMPTZ;
  v_next TIMESTAMPTZ;
  v_today DATE;
  v_day_of_week INTEGER;
  v_i INTEGER;
BEGIN
  v_now := COALESCE(p_last_sent_at, now());
  v_today := (v_now AT TIME ZONE COALESCE(p_schedule_timezone, 'Asia/Riyadh'))::DATE;
  v_day_of_week := EXTRACT(DOW FROM v_today)::INTEGER;

  CASE p_schedule_type
    WHEN 'daily' THEN
      v_next := (v_today + interval '1 day') + p_schedule_time;
      
    WHEN 'weekly' THEN
      FOR v_i IN 1..7 LOOP
        IF ((v_day_of_week + v_i) % 7) = ANY(p_schedule_days_of_week) THEN
          v_next := (v_today + (v_i || ' days')::INTERVAL) + p_schedule_time;
          EXIT;
        END IF;
      END LOOP;
      
    WHEN 'monthly' THEN
      v_next := (date_trunc('month', v_today) + interval '1 month' + ((COALESCE(p_schedule_day_of_month, 1) - 1) || ' days')::INTERVAL) + p_schedule_time;
      
    WHEN 'once' THEN
      v_next := NULL;
      
    ELSE
      v_next := NULL;
  END CASE;

  IF v_next IS NOT NULL THEN
    v_next := v_next AT TIME ZONE COALESCE(p_schedule_timezone, 'Asia/Riyadh');
  END IF;

  RETURN v_next;
END;
$function$;