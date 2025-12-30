-- Drop the old function variants that are causing the overload conflict
-- Keep only the latest version with (text, text) parameters

-- Drop version with (uuid, uuid, text, boolean, boolean) signature (no event_type)
DROP FUNCTION IF EXISTS public.get_incident_notification_recipients(
  uuid, uuid, text, boolean, boolean
);

-- Drop version with (uuid, integer, boolean, boolean, character varying) signature
DROP FUNCTION IF EXISTS public.get_incident_notification_recipients(
  uuid, integer, boolean, boolean, character varying
);