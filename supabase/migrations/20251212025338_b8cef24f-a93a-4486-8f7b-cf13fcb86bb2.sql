-- Add unique constraint on incident_id to enable upsert and enforce one investigation per incident
ALTER TABLE investigations 
ADD CONSTRAINT investigations_incident_id_unique UNIQUE (incident_id);