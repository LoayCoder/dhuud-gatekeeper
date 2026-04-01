ALTER TABLE public.inspection_templates
  ADD COLUMN building_id uuid REFERENCES public.buildings(id) ON DELETE SET NULL,
  ADD COLUMN subtype_id uuid REFERENCES public.asset_subtypes(id) ON DELETE SET NULL;