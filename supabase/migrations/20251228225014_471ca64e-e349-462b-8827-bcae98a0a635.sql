-- =============================================
-- Security Module Enhancements Migration (Corrected)
-- =============================================

-- 1. Shift Reminder Columns on shift_roster table (using roster_date)
ALTER TABLE public.shift_roster 
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reminder_acknowledged_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reminder_minutes_before INTEGER DEFAULT 30;

-- 2. Add photo_url to gate_entry_logs
ALTER TABLE public.gate_entry_logs 
ADD COLUMN IF NOT EXISTS visitor_photo_url TEXT,
ADD COLUMN IF NOT EXISTS photo_captured_at TIMESTAMPTZ;

-- 3. Create offline_patrol_checkpoints table for offline sync tracking
CREATE TABLE public.offline_patrol_checkpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  patrol_id UUID NOT NULL,
  checkpoint_id UUID NOT NULL,
  guard_id UUID NOT NULL REFERENCES public.profiles(id),
  device_id TEXT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL,
  gps_lat NUMERIC(10, 7),
  gps_lng NUMERIC(10, 7),
  gps_accuracy NUMERIC(10, 2),
  notes TEXT,
  photo_paths JSONB,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed', 'conflict')),
  synced_at TIMESTAMPTZ,
  sync_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for offline_patrol_checkpoints
ALTER TABLE public.offline_patrol_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_offline_checkpoints" ON public.offline_patrol_checkpoints
  FOR ALL USING (tenant_id IN (
    SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "guards_can_insert_own_checkpoints" ON public.offline_patrol_checkpoints
  FOR INSERT WITH CHECK (guard_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_offline_patrol_checkpoints_sync ON public.offline_patrol_checkpoints(sync_status, created_at);
CREATE INDEX IF NOT EXISTS idx_offline_patrol_checkpoints_patrol ON public.offline_patrol_checkpoints(patrol_id);
CREATE INDEX IF NOT EXISTS idx_shift_roster_reminder ON public.shift_roster(roster_date, reminder_sent_at) WHERE deleted_at IS NULL;

-- Create storage bucket for visitor photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('visitor-photos', 'visitor-photos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for visitor photos
CREATE POLICY "Authenticated users can upload visitor photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'visitor-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view visitor photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'visitor-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete visitor photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'visitor-photos' AND auth.role() = 'authenticated');