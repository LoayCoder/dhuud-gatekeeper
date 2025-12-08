import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MenuAccessItem {
  menu_code: string;
  menu_url: string | null;
  parent_code: string | null;
  sort_order: number;
}

export function useMenuAccess() {
  const { user } = useAuth();
  const [accessibleMenus, setAccessibleMenus] = useState<Set<string>>(new Set());
  const [menuItems, setMenuItems] = useState<MenuAccessItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAccess = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('get_accessible_menu_items', {
          _user_id: user.id
        });

        if (error) {
          console.error('Error fetching menu access:', error);
          // Fallback: give dashboard access at minimum
          setAccessibleMenus(new Set(['dashboard']));
        } else {
          const menuCodes = new Set((data || []).map((d: MenuAccessItem) => d.menu_code));
          setAccessibleMenus(menuCodes);
          setMenuItems(data || []);
        }
      } catch (err) {
        console.error('Error in menu access fetch:', err);
        setAccessibleMenus(new Set(['dashboard']));
      } finally {
        setIsLoading(false);
      }
    };

    fetchAccess();
  }, [user?.id]);

  const canAccess = useCallback((menuCode: string) => {
    // While loading, allow access to prevent flash of empty menus
    if (isLoading) return true;
    return accessibleMenus.has(menuCode);
  }, [accessibleMenus, isLoading]);

  // Check if a parent group should be visible (has any accessible children)
  const hasAccessibleChildren = useCallback((parentCode: string) => {
    if (isLoading) return true;
    return menuItems.some(item => 
      item.parent_code === parentCode && accessibleMenus.has(item.menu_code)
    );
  }, [menuItems, accessibleMenus, isLoading]);

  return { 
    canAccess, 
    hasAccessibleChildren,
    accessibleMenus, 
    menuItems,
    isLoading 
  };
}
