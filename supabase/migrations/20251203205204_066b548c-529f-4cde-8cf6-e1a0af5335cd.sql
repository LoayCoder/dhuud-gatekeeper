
-- CRITICAL FIX 1: Fix calculate_profile_billing function with correct field references
CREATE OR REPLACE FUNCTION public.calculate_profile_billing(p_tenant_id uuid, p_billing_month date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant RECORD;
  v_usage RECORD;
  v_free_quota INTEGER;
  v_billable INTEGER;
  v_rate DECIMAL(10,2);
  v_charges DECIMAL(10,2);
  v_visitor_count INTEGER := 0;
  v_member_count INTEGER := 0;
  v_contractor_count INTEGER := 0;
  v_total_profiles INTEGER := 0;
BEGIN
  -- Get tenant and plan info
  SELECT t.*, p.profile_quota_monthly, p.extra_profile_price_sar, p.name as plan_name
  INTO v_tenant
  FROM tenants t
  LEFT JOIN plans p ON t.plan_id = p.id
  WHERE t.id = p_tenant_id;

  IF v_tenant IS NULL THEN
    RETURN jsonb_build_object('error', 'Tenant not found');
  END IF;

  -- First try to get from tenant_profile_usage table
  SELECT 
    COALESCE(visitor_count, 0),
    COALESCE(member_count, 0),
    COALESCE(contractor_count, 0),
    COALESCE(total_profiles, 0)
  INTO v_visitor_count, v_member_count, v_contractor_count, v_total_profiles
  FROM tenant_profile_usage
  WHERE tenant_id = p_tenant_id AND billing_month = p_billing_month;

  -- If no usage record exists, calculate from tenant_profiles
  IF NOT FOUND OR v_total_profiles = 0 THEN
    SELECT 
      COUNT(*) FILTER (WHERE profile_type = 'visitor' AND (has_login IS NULL OR has_login = false) AND (is_deleted IS NULL OR is_deleted = false)),
      COUNT(*) FILTER (WHERE profile_type = 'member' AND (has_login IS NULL OR has_login = false) AND (is_deleted IS NULL OR is_deleted = false)),
      COUNT(*) FILTER (WHERE profile_type = 'contractor' AND (has_login IS NULL OR has_login = false) AND (is_deleted IS NULL OR is_deleted = false)),
      COUNT(*) FILTER (WHERE (has_login IS NULL OR has_login = false) AND (is_deleted IS NULL OR is_deleted = false))
    INTO v_visitor_count, v_member_count, v_contractor_count, v_total_profiles
    FROM tenant_profiles
    WHERE tenant_id = p_tenant_id 
      AND DATE_TRUNC('month', created_at) <= DATE_TRUNC('month', p_billing_month);
  END IF;

  -- Get plan pricing with defaults matching the pricing tiers
  v_free_quota := COALESCE(v_tenant.profile_quota_monthly, 50);
  v_rate := COALESCE(v_tenant.extra_profile_price_sar, 0.50);
  
  -- Calculate billable profiles (only those exceeding free quota)
  v_billable := GREATEST(0, v_total_profiles - v_free_quota);
  v_charges := v_billable * v_rate;

  RETURN jsonb_build_object(
    'tenant_id', p_tenant_id,
    'billing_month', p_billing_month,
    'plan_name', COALESCE(v_tenant.plan_name, 'starter'),
    'visitor_count', v_visitor_count,
    'member_count', v_member_count,
    'contractor_count', v_contractor_count,
    'total_profiles', v_total_profiles,
    'free_quota', v_free_quota,
    'billable_profiles', v_billable,
    'rate_per_profile', v_rate,
    'profile_charges', v_charges
  );
END;
$function$;

-- CRITICAL FIX 2: Fix plans table pricing for Professional plan
UPDATE plans 
SET 
  profile_quota_monthly = 500,
  extra_profile_price_sar = 0.25
WHERE LOWER(name) = 'professional';

-- Ensure Enterprise plan has correct pricing
UPDATE plans 
SET 
  profile_quota_monthly = 2000,
  extra_profile_price_sar = 0.10
WHERE LOWER(name) = 'enterprise';

-- Ensure Starter plan has correct pricing
UPDATE plans 
SET 
  profile_quota_monthly = 50,
  extra_profile_price_sar = 0.50
WHERE LOWER(name) = 'starter';

-- HIGH FIX 1: Create/replace trigger function for tenant_profiles usage tracking
CREATE OR REPLACE FUNCTION public.update_profile_usage_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_billing_month DATE;
  v_tenant_id UUID;
BEGIN
  v_billing_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  v_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);
  
  -- Recalculate and upsert usage for the tenant
  INSERT INTO tenant_profile_usage (tenant_id, billing_month, visitor_count, member_count, contractor_count, total_profiles)
  SELECT 
    v_tenant_id,
    v_billing_month,
    COUNT(*) FILTER (WHERE profile_type = 'visitor' AND (has_login IS NULL OR has_login = false) AND (is_deleted IS NULL OR is_deleted = false)),
    COUNT(*) FILTER (WHERE profile_type = 'member' AND (has_login IS NULL OR has_login = false) AND (is_deleted IS NULL OR is_deleted = false)),
    COUNT(*) FILTER (WHERE profile_type = 'contractor' AND (has_login IS NULL OR has_login = false) AND (is_deleted IS NULL OR is_deleted = false)),
    COUNT(*) FILTER (WHERE (has_login IS NULL OR has_login = false) AND (is_deleted IS NULL OR is_deleted = false))
  FROM tenant_profiles
  WHERE tenant_id = v_tenant_id
  ON CONFLICT (tenant_id, billing_month) 
  DO UPDATE SET
    visitor_count = EXCLUDED.visitor_count,
    member_count = EXCLUDED.member_count,
    contractor_count = EXCLUDED.contractor_count,
    total_profiles = EXCLUDED.total_profiles,
    updated_at = now();
    
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create trigger on tenant_profiles if it doesn't exist
DROP TRIGGER IF EXISTS update_tenant_profile_usage ON tenant_profiles;
CREATE TRIGGER update_tenant_profile_usage
AFTER INSERT OR UPDATE OR DELETE ON tenant_profiles
FOR EACH ROW
EXECUTE FUNCTION update_profile_usage_counts();

-- HIGH FIX 2: Server-side quota enforcement for licensed users
-- Create function to enforce licensed user quota on profile insert/update
CREATE OR REPLACE FUNCTION public.enforce_licensed_user_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_quota_check JSONB;
  v_can_add BOOLEAN;
BEGIN
  -- Only check for users with login enabled
  IF NEW.has_login = true AND (OLD IS NULL OR OLD.has_login = false OR OLD.is_active = false) THEN
    -- Check the quota
    v_quota_check := check_licensed_user_quota(NEW.tenant_id);
    v_can_add := (v_quota_check->>'can_add_user')::boolean;
    
    IF NOT v_can_add THEN
      RAISE EXCEPTION 'Licensed user quota exceeded. Current: %, Max: %', 
        v_quota_check->>'current_licensed_users', 
        v_quota_check->>'max_licensed_users';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on profiles table for quota enforcement
DROP TRIGGER IF EXISTS enforce_licensed_user_quota_trigger ON profiles;
CREATE TRIGGER enforce_licensed_user_quota_trigger
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION enforce_licensed_user_quota();

-- HIGH FIX 3: Assign starter plan to tenants without a plan
UPDATE tenants 
SET plan_id = (SELECT id FROM plans WHERE LOWER(name) = 'starter' LIMIT 1)
WHERE plan_id IS NULL;
