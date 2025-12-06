
-- Complete remaining items (policies already exist, just add missing indexes and trigger)

-- Drop trigger if exists and recreate to avoid conflict
DROP TRIGGER IF EXISTS update_witness_statements_updated_at ON public.witness_statements;
CREATE TRIGGER update_witness_statements_updated_at
  BEFORE UPDATE ON public.witness_statements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
