-- Add incident_type column to store the top-level HSSE incident category
-- This is used when event_type = 'incident' to further classify: safety, health, process_safety, etc.
ALTER TABLE public.incidents 
ADD COLUMN IF NOT EXISTS incident_type TEXT;

-- Add a comment to document the field
COMMENT ON COLUMN public.incidents.incident_type IS 'HSSE incident type category (safety, health, process_safety, environment, security, property_asset, road_traffic, quality_service, community_third_party, compliance_regulatory, emergency_crisis). Only used when event_type = incident.';