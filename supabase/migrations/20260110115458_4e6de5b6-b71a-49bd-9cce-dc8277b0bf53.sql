-- Force PostgREST to reload its cached schema and config
SELECT pg_notify('pgrst', 'reload schema');
SELECT pg_notify('pgrst', 'reload config');

-- Also use NOTIFY for compatibility
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';