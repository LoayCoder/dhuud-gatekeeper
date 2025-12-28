-- Create inspection-reports storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('inspection-reports', 'inspection-reports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for inspection reports bucket - tenant isolation
CREATE POLICY "Users can view their tenant reports"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'inspection-reports' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (
    SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Service role can upload reports"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'inspection-reports');

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  title_ar TEXT,
  body TEXT,
  body_ar TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  related_entity_type TEXT,
  related_entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create index for faster queries
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_tenant ON public.notifications(tenant_id) WHERE deleted_at IS NULL;

-- Create analytics RPC function
CREATE OR REPLACE FUNCTION public.get_inspection_analytics(
  p_tenant_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_site_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'sessions', (
      SELECT json_build_object(
        'total', COUNT(*),
        'by_status', json_object_agg(status, cnt)
      )
      FROM (
        SELECT status, COUNT(*) as cnt
        FROM inspection_sessions
        WHERE tenant_id = p_tenant_id
          AND deleted_at IS NULL
          AND created_at >= p_start_date
          AND created_at < p_end_date + INTERVAL '1 day'
          AND (p_site_id IS NULL OR site_id = p_site_id)
        GROUP BY status
      ) s
    ),
    'findings', (
      SELECT json_build_object(
        'total', COUNT(*),
        'by_classification', json_object_agg(classification, cnt),
        'by_status', json_object_agg(status, status_cnt)
      )
      FROM (
        SELECT classification, COUNT(*) as cnt
        FROM area_inspection_findings f
        JOIN inspection_sessions s ON f.session_id = s.id
        WHERE f.tenant_id = p_tenant_id
          AND f.deleted_at IS NULL
          AND f.created_at >= p_start_date
          AND f.created_at < p_end_date + INTERVAL '1 day'
          AND (p_site_id IS NULL OR s.site_id = p_site_id)
        GROUP BY classification
      ) fc,
      (
        SELECT status, COUNT(*) as status_cnt
        FROM area_inspection_findings f
        JOIN inspection_sessions s ON f.session_id = s.id
        WHERE f.tenant_id = p_tenant_id
          AND f.deleted_at IS NULL
          AND f.created_at >= p_start_date
          AND f.created_at < p_end_date + INTERVAL '1 day'
          AND (p_site_id IS NULL OR s.site_id = p_site_id)
        GROUP BY status
      ) fs
    ),
    'sla_compliance', (
      SELECT json_build_object(
        'on_time', COUNT(*) FILTER (WHERE closed_at IS NOT NULL AND closed_at <= due_date),
        'overdue', COUNT(*) FILTER (WHERE closed_at IS NULL AND due_date < NOW()),
        'total_with_due', COUNT(*) FILTER (WHERE due_date IS NOT NULL)
      )
      FROM area_inspection_findings f
      JOIN inspection_sessions s ON f.session_id = s.id
      WHERE f.tenant_id = p_tenant_id
        AND f.deleted_at IS NULL
        AND f.created_at >= p_start_date
        AND f.created_at < p_end_date + INTERVAL '1 day'
        AND (p_site_id IS NULL OR s.site_id = p_site_id)
    ),
    'completion_rate', (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE status IN ('completed_with_open_actions', 'closed'))::numeric * 100 /
        NULLIF(COUNT(*), 0),
        2
      )
      FROM inspection_sessions
      WHERE tenant_id = p_tenant_id
        AND deleted_at IS NULL
        AND created_at >= p_start_date
        AND created_at < p_end_date + INTERVAL '1 day'
        AND (p_site_id IS NULL OR site_id = p_site_id)
    )
  ) INTO result;
  
  RETURN result;
END;
$$;