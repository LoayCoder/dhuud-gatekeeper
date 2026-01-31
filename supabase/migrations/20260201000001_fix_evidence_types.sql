/*
  # Fix Evidence Types

  1.  Update `incident_evidence` check constraint to include 'ptw', 'checklist', 'video_clip' which are used by the frontend.
*/

ALTER TABLE incident_evidence DROP CONSTRAINT IF EXISTS incident_evidence_evidence_type_check;

ALTER TABLE incident_evidence ADD CONSTRAINT incident_evidence_evidence_type_check
  CHECK (evidence_type IN ('photo', 'cctv', 'document', 'ptw', 'checklist', 'video_clip'));
