-- Insert default tracking interval setting if not exists
INSERT INTO public.platform_settings (setting_key, value, description)
VALUES (
  'guard_tracking_interval_minutes',
  '{"default": 5, "min": 1, "max": 30, "current": 5}'::jsonb,
  'Guard location tracking interval in minutes'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Allow security managers and supervisors to manage tracking-related platform settings
CREATE POLICY "Security roles can manage tracking settings"
ON public.platform_settings
FOR ALL
TO authenticated
USING (
  setting_key = 'guard_tracking_interval_minutes'
  AND (
    is_admin(auth.uid())
    OR has_role_by_code(auth.uid(), 'security_manager')
    OR has_role_by_code(auth.uid(), 'security_supervisor')
  )
)
WITH CHECK (
  setting_key = 'guard_tracking_interval_minutes'
  AND (
    is_admin(auth.uid())
    OR has_role_by_code(auth.uid(), 'security_manager')
    OR has_role_by_code(auth.uid(), 'security_supervisor')
  )
);