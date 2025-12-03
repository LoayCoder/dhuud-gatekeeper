
-- Add yearly pricing support to modules
ALTER TABLE public.modules
ADD COLUMN IF NOT EXISTS base_price_yearly INTEGER DEFAULT 0;

-- Update modules with yearly pricing (10% discount)
UPDATE public.modules SET base_price_yearly = ROUND(base_price_monthly * 12 * 0.9) WHERE base_price_yearly = 0 OR base_price_yearly IS NULL;

-- Update plans with yearly pricing structure
UPDATE public.plans SET 
  price_yearly = ROUND(base_price_monthly * 12 * 0.9)
WHERE price_yearly IS NULL OR price_yearly = 0;

-- Add yearly per-user pricing
ALTER TABLE public.plans
ADD COLUMN IF NOT EXISTS price_per_user_yearly INTEGER DEFAULT 0;

UPDATE public.plans SET price_per_user_yearly = ROUND(price_per_user * 12 * 0.9) WHERE price_per_user_yearly = 0 OR price_per_user_yearly IS NULL;

-- Add billing_period to subscription_requests
ALTER TABLE public.subscription_requests
ADD COLUMN IF NOT EXISTS billing_period TEXT DEFAULT 'monthly';

-- Update the calculate_subscription_price function to support yearly
CREATE OR REPLACE FUNCTION public.calculate_subscription_price(
  p_plan_id UUID,
  p_user_count INTEGER,
  p_module_ids UUID[],
  p_billing_period TEXT DEFAULT 'monthly'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan RECORD;
  v_base_price INTEGER := 0;
  v_user_price INTEGER := 0;
  v_module_price INTEGER := 0;
  v_extra_users INTEGER := 0;
  v_module RECORD;
  v_price_per_user INTEGER := 0;
  v_multiplier INTEGER := 1;
BEGIN
  -- Get plan details
  SELECT * INTO v_plan FROM plans WHERE id = p_plan_id;
  
  IF v_plan IS NULL THEN
    RETURN jsonb_build_object('error', 'Plan not found');
  END IF;
  
  -- Set multiplier and prices based on billing period
  IF p_billing_period = 'yearly' THEN
    v_multiplier := 12;
    v_base_price := COALESCE(v_plan.price_yearly, v_plan.base_price_monthly * 12);
    v_price_per_user := COALESCE(v_plan.price_per_user_yearly, v_plan.price_per_user * 12);
  ELSE
    v_base_price := COALESCE(v_plan.base_price_monthly, v_plan.price_monthly, 0);
    v_price_per_user := COALESCE(v_plan.price_per_user, 0);
  END IF;
  
  -- Calculate extra user cost
  v_extra_users := GREATEST(0, p_user_count - COALESCE(v_plan.included_users, 1));
  v_user_price := v_extra_users * v_price_per_user;
  
  -- Calculate module costs
  FOR v_module IN 
    SELECT m.id, m.code, m.name, 
           CASE WHEN p_billing_period = 'yearly' 
             THEN COALESCE(m.base_price_yearly, m.base_price_monthly * 12)
             ELSE COALESCE(pm.custom_price, m.base_price_monthly)
           END as price,
           COALESCE(pm.included_in_base, false) as included
    FROM unnest(p_module_ids) AS mid
    JOIN modules m ON m.id = mid
    LEFT JOIN plan_modules pm ON pm.module_id = m.id AND pm.plan_id = p_plan_id
    WHERE m.is_active = true
  LOOP
    IF NOT v_module.included THEN
      v_module_price := v_module_price + v_module.price;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'base_price', v_base_price,
    'included_users', COALESCE(v_plan.included_users, 1),
    'extra_users', v_extra_users,
    'price_per_user', v_price_per_user,
    'user_price', v_user_price,
    'module_price', v_module_price,
    'total', v_base_price + v_user_price + v_module_price,
    'billing_period', p_billing_period,
    'total_monthly', CASE WHEN p_billing_period = 'yearly' 
      THEN ROUND((v_base_price + v_user_price + v_module_price) / 12.0)
      ELSE v_base_price + v_user_price + v_module_price
    END
  );
END;
$$;
