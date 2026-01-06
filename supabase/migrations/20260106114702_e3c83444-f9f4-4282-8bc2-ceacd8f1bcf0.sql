-- Multi-Tenant User Profiles Migration
-- This migration enables the same email to have profiles in multiple tenants

-- Step 1: Add user_id column to profiles (initially nullable for migration)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Backfill user_id with id for existing profiles
UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;

-- Step 3: Make user_id NOT NULL after backfill
ALTER TABLE public.profiles ALTER COLUMN user_id SET NOT NULL;

-- Step 4: Create composite unique constraint (user can only have ONE profile per tenant)
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_tenant_unique UNIQUE (user_id, tenant_id);

-- Step 5: Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Step 6: Update RLS policies to use user_id instead of id

-- Drop old policies first
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create new policies using user_id
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Step 7: Update user_role_assignments RLS to work with multi-tenant profiles
DROP POLICY IF EXISTS "Users can view their own role assignments" ON public.user_role_assignments;
DROP POLICY IF EXISTS "Admins can view all role assignments" ON public.user_role_assignments;
DROP POLICY IF EXISTS "Admins can manage role assignments" ON public.user_role_assignments;

CREATE POLICY "Users can view their own role assignments"
ON public.user_role_assignments FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all role assignments in tenant"
ON public.user_role_assignments FOR SELECT
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles 
    WHERE user_id = auth.uid() AND is_deleted = false AND is_active = true
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_role_assignments ura ON p.id = ura.user_id
    JOIN public.roles r ON ura.role_id = r.id
    WHERE p.user_id = auth.uid() AND r.code = 'admin'
  )
);

CREATE POLICY "Admins can manage role assignments in tenant"
ON public.user_role_assignments FOR ALL
USING (
  tenant_id IN (
    SELECT tenant_id FROM public.profiles 
    WHERE user_id = auth.uid() AND is_deleted = false AND is_active = true
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.user_role_assignments ura ON p.id = ura.user_id
    JOIN public.roles r ON ura.role_id = r.id
    WHERE p.user_id = auth.uid() AND r.code = 'admin'
  )
);

-- Step 8: Update tenant_user_mfa_status RLS
DROP POLICY IF EXISTS "Users can view their own MFA status" ON public.tenant_user_mfa_status;
DROP POLICY IF EXISTS "Users can update their own MFA status" ON public.tenant_user_mfa_status;
DROP POLICY IF EXISTS "Users can insert their own MFA status" ON public.tenant_user_mfa_status;

CREATE POLICY "Users can view their own MFA status"
ON public.tenant_user_mfa_status FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own MFA status"
ON public.tenant_user_mfa_status FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can insert their own MFA status"
ON public.tenant_user_mfa_status FOR INSERT
WITH CHECK (user_id = auth.uid());