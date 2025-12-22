-- Add manpower count and calculation fields to manhours table
ALTER TABLE public.manhours ADD COLUMN IF NOT EXISTS employee_count integer DEFAULT 0;
ALTER TABLE public.manhours ADD COLUMN IF NOT EXISTS contractor_count integer DEFAULT 0;
ALTER TABLE public.manhours ADD COLUMN IF NOT EXISTS hours_per_day numeric(5,2) DEFAULT 8;
ALTER TABLE public.manhours ADD COLUMN IF NOT EXISTS working_days integer DEFAULT 22;
ALTER TABLE public.manhours ADD COLUMN IF NOT EXISTS calculation_mode text DEFAULT 'manual';

-- Add check constraint for calculation_mode
ALTER TABLE public.manhours DROP CONSTRAINT IF EXISTS manhours_calculation_mode_check;
ALTER TABLE public.manhours ADD CONSTRAINT manhours_calculation_mode_check 
  CHECK (calculation_mode IN ('manual', 'auto'));

-- Add comment for documentation
COMMENT ON COLUMN public.manhours.employee_count IS 'Number of employees for auto-calculation';
COMMENT ON COLUMN public.manhours.contractor_count IS 'Number of contractors for auto-calculation';
COMMENT ON COLUMN public.manhours.hours_per_day IS 'Standard working hours per day (default 8)';
COMMENT ON COLUMN public.manhours.working_days IS 'Number of working days in the period';
COMMENT ON COLUMN public.manhours.calculation_mode IS 'manual or auto - determines if hours were calculated automatically';