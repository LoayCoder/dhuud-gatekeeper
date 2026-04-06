-- Schedule daily issues report at 8:00 AM UTC
SELECT cron.schedule(
  'generate-daily-issues-report',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xdlowvfzhvjzbtgvurzj.supabase.co/functions/v1/generate-daily-issues-report',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkbG93dmZ6aHZqemJ0Z3Z1cnpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTAyNDcsImV4cCI6MjA4MDE4NjI0N30.XYNA3yg_7jdgCHJVcOBSZc-wiks17QvLn4oDhtoG5Ac"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);