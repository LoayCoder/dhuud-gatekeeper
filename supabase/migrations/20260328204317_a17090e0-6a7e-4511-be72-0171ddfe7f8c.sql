ALTER TABLE public.asset_inspection_part_results
  DROP CONSTRAINT IF EXISTS asset_inspection_part_results_inspection_id_fkey;

ALTER TABLE public.asset_inspection_part_results
  ADD CONSTRAINT asset_inspection_part_results_inspection_id_fkey
  FOREIGN KEY (inspection_id)
  REFERENCES public.inspection_session_assets(id)
  ON DELETE CASCADE;