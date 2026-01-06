-- Fix the get_accessible_menu_items function to use correct joins
CREATE OR REPLACE FUNCTION public.get_accessible_menu_items(_user_id uuid)
RETURNS TABLE(menu_code text, menu_url text, parent_code text, sort_order integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT m.code, m.url, m.parent_code, m.sort_order
  FROM menu_items m
  WHERE m.id IN (
      -- Role-based access
      SELECT rma.menu_item_id
      FROM role_menu_access rma
      JOIN user_role_assignments ura ON ura.role_id = rma.role_id
      JOIN profiles p ON p.user_id = ura.user_id
      WHERE ura.user_id = _user_id 
        AND rma.tenant_id = p.tenant_id
      
      UNION
      
      -- User-specific access (override)
      SELECT uma.menu_item_id
      FROM user_menu_access uma
      JOIN profiles p ON p.user_id = _user_id
      WHERE uma.user_id = _user_id 
        AND uma.tenant_id = p.tenant_id
        AND uma.deleted_at IS NULL
    )
  ORDER BY sort_order;
$$;