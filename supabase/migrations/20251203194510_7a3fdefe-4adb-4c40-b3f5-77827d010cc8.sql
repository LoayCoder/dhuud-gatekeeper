-- Part 1: Add profile quotas to plans table
ALTER TABLE plans ADD COLUMN IF NOT EXISTS profile_quota_monthly INTEGER DEFAULT 50;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS extra_profile_price_sar DECIMAL(10,2) DEFAULT 0.50;

-- Update existing plans with correct quotas
UPDATE plans SET profile_quota_monthly = 50, extra_profile_price_sar = 0.50 WHERE name = 'starter';
UPDATE plans SET profile_quota_monthly = 500, extra_profile_price_sar = 0.25 WHERE name = 'professional';
UPDATE plans SET profile_quota_monthly = 2000, extra_profile_price_sar = 0.10 WHERE name = 'enterprise';

-- Part 2: Create profile_type enum
DO $$ BEGIN
  CREATE TYPE profile_type AS ENUM ('visitor', 'member', 'contractor');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Part 3: Create user_type enum for user management
DO $$ BEGIN
  CREATE TYPE user_type AS ENUM ('employee', 'contractor_longterm', 'contractor_shortterm', 'member', 'visitor');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Part 4: Create contractor_type enum
DO $$ BEGIN
  CREATE TYPE contractor_type AS ENUM ('long_term', 'short_term');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Part 5: Create tenant_profiles table (extends visitors concept)
CREATE TABLE IF NOT EXISTS public.tenant_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  profile_type profile_type NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  national_id TEXT,
  company_name TEXT,
  has_login BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  -- Member-specific fields
  membership_id TEXT,
  membership_start DATE,
  membership_end DATE,
  -- Contractor-specific fields
  contractor_type contractor_type,
  contract_start DATE,
  contract_end DATE,
  -- Visitor-specific fields (also in visitors table)
  visit_reason TEXT,
  host_id UUID,
  visit_date DATE,
  visit_duration_hours INTEGER,
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);

-- Part 6: Create monthly usage tracking table
CREATE TABLE IF NOT EXISTS public.tenant_profile_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  billing_month DATE NOT NULL,
  visitor_count INTEGER DEFAULT 0,
  member_count INTEGER DEFAULT 0,
  contractor_count INTEGER DEFAULT 0,
  total_profiles INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, billing_month)
);

-- Part 7: Create billing records table
CREATE TABLE IF NOT EXISTS public.tenant_billing_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  billing_month DATE NOT NULL,
  plan_id UUID REFERENCES plans(id),
  -- Usage breakdown
  visitor_count INTEGER DEFAULT 0,
  member_count INTEGER DEFAULT 0,
  contractor_count INTEGER DEFAULT 0,
  total_profiles INTEGER DEFAULT 0,
  -- Billing calculation
  free_quota INTEGER DEFAULT 0,
  billable_profiles INTEGER DEFAULT 0,
  rate_per_profile DECIMAL(10,2) DEFAULT 0,
  profile_charges DECIMAL(10,2) DEFAULT 0,
  -- Licensed users
  licensed_users INTEGER DEFAULT 0,
  licensed_user_charges DECIMAL(10,2) DEFAULT 0,
  -- Total
  total_charge DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tenant_id, billing_month)
);

-- Part 8: Extend profiles table with user_type and additional fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS user_type user_type DEFAULT 'employee';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_login BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
-- Contractor fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contractor_type contractor_type;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contractor_company_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contract_start DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contract_end DATE;
-- Member fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_start DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_end DATE;

-- Part 9: Enable RLS on new tables
ALTER TABLE tenant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_profile_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_billing_records ENABLE ROW LEVEL SECURITY;

-- Part 10: RLS Policies for tenant_profiles
CREATE POLICY "Users can view profiles in their tenant" ON tenant_profiles
  FOR SELECT USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Admins can manage all tenant profiles" ON tenant_profiles
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Part 11: RLS Policies for tenant_profile_usage
CREATE POLICY "Users can view their tenant usage" ON tenant_profile_usage
  FOR SELECT USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Admins can manage all usage records" ON tenant_profile_usage
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Part 12: RLS Policies for tenant_billing_records
CREATE POLICY "Users can view their tenant billing" ON tenant_billing_records
  FOR SELECT USING (tenant_id = get_auth_tenant_id());

CREATE POLICY "Admins can manage all billing records" ON tenant_billing_records
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Part 13: Function to calculate profile billing
CREATE OR REPLACE FUNCTION calculate_profile_billing(p_tenant_id UUID, p_billing_month DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant RECORD;
  v_plan RECORD;
  v_usage RECORD;
  v_free_quota INTEGER;
  v_billable INTEGER;
  v_rate DECIMAL(10,2);
  v_charges DECIMAL(10,2);
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

  -- Get or create usage record for the month
  SELECT * INTO v_usage
  FROM tenant_profile_usage
  WHERE tenant_id = p_tenant_id AND billing_month = p_billing_month;

  IF v_usage IS NULL THEN
    -- Calculate usage from tenant_profiles
    SELECT 
      COUNT(*) FILTER (WHERE profile_type = 'visitor' AND NOT has_login) as visitors,
      COUNT(*) FILTER (WHERE profile_type = 'member' AND NOT has_login) as members,
      COUNT(*) FILTER (WHERE profile_type = 'contractor' AND NOT has_login) as contractors,
      COUNT(*) FILTER (WHERE NOT has_login) as total
    INTO v_usage
    FROM tenant_profiles
    WHERE tenant_id = p_tenant_id 
      AND NOT is_deleted
      AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', p_billing_month);
  END IF;

  v_free_quota := COALESCE(v_tenant.profile_quota_monthly, 50);
  v_rate := COALESCE(v_tenant.extra_profile_price_sar, 0.50);
  v_billable := GREATEST(0, COALESCE(v_usage.total_profiles, v_usage.total, 0) - v_free_quota);
  v_charges := v_billable * v_rate;

  RETURN jsonb_build_object(
    'tenant_id', p_tenant_id,
    'billing_month', p_billing_month,
    'plan_name', COALESCE(v_tenant.plan_name, 'starter'),
    'visitor_count', COALESCE(v_usage.visitor_count, v_usage.visitors, 0),
    'member_count', COALESCE(v_usage.member_count, v_usage.members, 0),
    'contractor_count', COALESCE(v_usage.contractor_count, v_usage.contractors, 0),
    'total_profiles', COALESCE(v_usage.total_profiles, v_usage.total, 0),
    'free_quota', v_free_quota,
    'billable_profiles', v_billable,
    'rate_per_profile', v_rate,
    'profile_charges', v_charges
  );
END;
$$;

-- Part 14: Function to check licensed user quota
CREATE OR REPLACE FUNCTION check_licensed_user_quota(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count INTEGER;
  v_max_users INTEGER;
  v_plan_max INTEGER;
BEGIN
  -- Count active licensed users (has_login = true, is_active = true)
  SELECT COUNT(*) INTO v_current_count
  FROM profiles
  WHERE tenant_id = p_tenant_id
    AND has_login = true
    AND is_active = true
    AND (is_deleted IS NULL OR is_deleted = false);

  -- Get max users from tenant or plan
  SELECT 
    COALESCE(t.max_users_override, p.max_users, 5)
  INTO v_max_users
  FROM tenants t
  LEFT JOIN plans p ON t.plan_id = p.id
  WHERE t.id = p_tenant_id;

  RETURN jsonb_build_object(
    'current_licensed_users', v_current_count,
    'max_licensed_users', COALESCE(v_max_users, 5),
    'can_add_user', v_current_count < COALESCE(v_max_users, 5),
    'remaining_slots', GREATEST(0, COALESCE(v_max_users, 5) - v_current_count)
  );
END;
$$;

-- Part 15: Function to get current month usage
CREATE OR REPLACE FUNCTION get_current_month_usage(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_month DATE;
BEGIN
  v_current_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  RETURN calculate_profile_billing(p_tenant_id, v_current_month);
END;
$$;

-- Part 16: Trigger to update usage counts
CREATE OR REPLACE FUNCTION update_profile_usage_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_billing_month DATE;
BEGIN
  v_billing_month := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  
  INSERT INTO tenant_profile_usage (tenant_id, billing_month, visitor_count, member_count, contractor_count, total_profiles)
  SELECT 
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    v_billing_month,
    COUNT(*) FILTER (WHERE profile_type = 'visitor' AND NOT has_login AND NOT is_deleted),
    COUNT(*) FILTER (WHERE profile_type = 'member' AND NOT has_login AND NOT is_deleted),
    COUNT(*) FILTER (WHERE profile_type = 'contractor' AND NOT has_login AND NOT is_deleted),
    COUNT(*) FILTER (WHERE NOT has_login AND NOT is_deleted)
  FROM tenant_profiles
  WHERE tenant_id = COALESCE(NEW.tenant_id, OLD.tenant_id)
  ON CONFLICT (tenant_id, billing_month) 
  DO UPDATE SET
    visitor_count = EXCLUDED.visitor_count,
    member_count = EXCLUDED.member_count,
    contractor_count = EXCLUDED.contractor_count,
    total_profiles = EXCLUDED.total_profiles,
    updated_at = now();
    
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE TRIGGER trigger_update_profile_usage
AFTER INSERT OR UPDATE OR DELETE ON tenant_profiles
FOR EACH ROW EXECUTE FUNCTION update_profile_usage_counts();