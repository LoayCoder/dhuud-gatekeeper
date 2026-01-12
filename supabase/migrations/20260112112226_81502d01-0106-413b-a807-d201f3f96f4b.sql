-- Fix get_tenant_modules to include BOTH plan modules AND manually enabled tenant_modules
CREATE OR REPLACE FUNCTION public.get_tenant_modules(p_tenant_id uuid)
 RETURNS module_code[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result_modules module_code[];
BEGIN
  -- Get modules from plan AND manually enabled tenant_modules
  SELECT ARRAY_AGG(DISTINCT module) INTO result_modules
  FROM (
    -- Modules from subscription plan
    SELECT pm.module
    FROM tenants t
    JOIN plan_modules pm ON pm.plan_id = t.plan_id
    WHERE t.id = p_tenant_id
    
    UNION
    
    -- Modules manually enabled in tenant_modules
    SELECT m.code::module_code
    FROM tenant_modules tm
    JOIN modules m ON m.id = tm.module_id
    WHERE tm.tenant_id = p_tenant_id
      AND tm.enabled = true
      AND tm.disabled_at IS NULL
  ) combined;
  
  RETURN COALESCE(result_modules, ARRAY[]::module_code[]);
END;
$function$;