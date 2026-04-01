ALTER TABLE public.inspection_sessions ADD COLUMN subtype_id UUID REFERENCES public.asset_subtypes(id);

CREATE INDEX idx_inspection_sessions_subtype_id ON public.inspection_sessions(subtype_id) WHERE deleted_at IS NULL;