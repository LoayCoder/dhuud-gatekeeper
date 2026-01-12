-- Schedule geofence compliance check every minute using pg_cron
-- This ensures guards with GPS off or outside zone are detected even if they don't send location

SELECT cron.schedule(
  'geofence-compliance-check',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/check-geofence-compliance',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);