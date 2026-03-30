ALTER TABLE public.inspection_session_assets DROP CONSTRAINT IF EXISTS inspection_session_assets_quick_result_check;

ALTER TABLE public.inspection_session_assets ADD CONSTRAINT inspection_session_assets_quick_result_check CHECK (quick_result = ANY (ARRAY['good'::text, 'not_good'::text, 'not_accessible'::text, 'partial'::text]));