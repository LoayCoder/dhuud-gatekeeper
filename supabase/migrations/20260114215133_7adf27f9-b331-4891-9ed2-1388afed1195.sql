-- Backfill branch_id for existing records by inheriting from parent

-- 1. Buildings: inherit branch from parent site
UPDATE public.buildings b
SET branch_id = s.branch_id
FROM public.sites s
WHERE b.site_id = s.id
AND b.branch_id IS NULL
AND s.branch_id IS NOT NULL;

-- 2. Floors/Zones: inherit branch from parent building
UPDATE public.floors_zones fz
SET branch_id = b.branch_id
FROM public.buildings b
WHERE fz.building_id = b.id
AND fz.branch_id IS NULL
AND b.branch_id IS NOT NULL;

-- 3. Create trigger function to auto-inherit branch_id for buildings
CREATE OR REPLACE FUNCTION public.set_building_branch_from_site()
RETURNS TRIGGER AS $$
BEGIN
  -- If branch_id is not explicitly set, inherit from parent site
  IF NEW.branch_id IS NULL AND NEW.site_id IS NOT NULL THEN
    SELECT branch_id INTO NEW.branch_id FROM public.sites WHERE id = NEW.site_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 4. Create trigger for buildings
DROP TRIGGER IF EXISTS trg_buildings_inherit_branch ON public.buildings;
CREATE TRIGGER trg_buildings_inherit_branch
  BEFORE INSERT OR UPDATE OF site_id ON public.buildings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_building_branch_from_site();

-- 5. Create trigger function to auto-inherit branch_id for floors_zones
CREATE OR REPLACE FUNCTION public.set_floor_zone_branch_from_building()
RETURNS TRIGGER AS $$
BEGIN
  -- If branch_id is not explicitly set, inherit from parent building
  IF NEW.branch_id IS NULL AND NEW.building_id IS NOT NULL THEN
    SELECT branch_id INTO NEW.branch_id FROM public.buildings WHERE id = NEW.building_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 6. Create trigger for floors_zones
DROP TRIGGER IF EXISTS trg_floors_zones_inherit_branch ON public.floors_zones;
CREATE TRIGGER trg_floors_zones_inherit_branch
  BEFORE INSERT OR UPDATE OF building_id ON public.floors_zones
  FOR EACH ROW
  EXECUTE FUNCTION public.set_floor_zone_branch_from_building();