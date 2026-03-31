
CREATE OR REPLACE FUNCTION prevent_self_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.verified_by IS NOT NULL AND NEW.verified_by = NEW.assigned_to THEN
    RAISE EXCEPTION 'Self-verification is not allowed: assignee cannot verify their own action';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_self_verification
  BEFORE UPDATE ON corrective_actions
  FOR EACH ROW EXECUTE FUNCTION prevent_self_verification();
