-- Update incident-attachments bucket to allow audio MIME types for voice recordings
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'image/jpeg', 'image/png', 'image/webp', 'image/heic', 
  'application/pdf', 
  'video/mp4', 'video/quicktime',
  'audio/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg'
]
WHERE id = 'incident-attachments';