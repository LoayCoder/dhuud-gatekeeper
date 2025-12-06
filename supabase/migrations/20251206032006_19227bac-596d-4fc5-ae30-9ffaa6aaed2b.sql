-- Add media and AI analysis columns to incidents table
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS media_attachments jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ai_analysis_result jsonb;

-- Add GIN index for media queries
CREATE INDEX IF NOT EXISTS idx_incidents_media ON incidents USING GIN (media_attachments);

-- Add index for AI analysis queries
CREATE INDEX IF NOT EXISTS idx_incidents_ai_analysis ON incidents USING GIN (ai_analysis_result);