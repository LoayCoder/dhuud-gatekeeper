import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

export interface MenuPermissions {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  isLoading: boolean;
}

const DEFAULT_PERMISSIONS: MenuPermissions = {
  canCreate: false,
  canRead: true,
  canUpdate: false,
  canDelete: false,
  isLoading: true,
};

const ADMIN_PERMISSIONS: MenuPermissions = {
  canCreate: true,
  canRead: true,
  canUpdate: true,
  canDelete: true,
  isLoading: false,
};

const READ_ONLY_PERMISSIONS: MenuPermissions = {
  canCreate: false,
  canRead: true,
  canUpdate: false,
  canDelete: false,
  isLoading: false,
};

/**
 * Hook to fetch CRUD permissions for a specific menu based on user roles.
 * Admins always have full access.
 * Other users get permissions based on role_menu_permissions table.
 */
export function useMenuPermissions(menuCode: string): MenuPermissions {
  const { user, isAdmin } = useAuth();
  const [permissions, setPermissions] = useState<MenuPermissions>(DEFAULT_PERMISSIONS);

  useEffect(() => {
    if (!user?.id || !menuCode) {
      setPermissions({ ...READ_ONLY_PERMISSIONS, isLoading: false });
      return;
    }

    // Admins have full access immediately
    if (isAdmin) {
      setPermissions(ADMIN_PERMISSIONS);
      return;
    }

    const fetchPermissions = async () => {
      try {
        const { data, error } = await supabase.rpc('get_user_menu_permissions', {
          _user_id: user.id,
          _menu_code: menuCode,
        });

        if (error) {
          logger.error('Error fetching menu permissions:', error);
          setPermissions(READ_ONLY_PERMISSIONS);
          return;
        }

        if (data && data.length > 0) {
          const perm = data[0];
          setPermissions({
            canCreate: perm.can_create ?? false,
            canRead: perm.can_read ?? true,
            canUpdate: perm.can_update ?? false,
            canDelete: perm.can_delete ?? false,
            isLoading: false,
          });
        } else {
          // Fallback: read-only if no permissions defined
          setPermissions(READ_ONLY_PERMISSIONS);
        }
      } catch (err) {
        logger.error('Error in menu permissions fetch:', err);
        setPermissions(READ_ONLY_PERMISSIONS);
      }
    };

    fetchPermissions();
  }, [user?.id, menuCode, isAdmin]);

  return permissions;
}

/**
 * Hook that provides permission check functions without requiring a specific menu code upfront.
 * Useful for components that need to check permissions for multiple menus.
 */
export function useMenuPermissionsChecker() {
  const { user, isAdmin } = useAuth();
  const [cache, setCache] = useState<Record<string, MenuPermissions>>({});

  const getPermissions = useCallback(async (menuCode: string): Promise<MenuPermissions> => {
    if (!user?.id || !menuCode) {
      return READ_ONLY_PERMISSIONS;
    }

    // Admins have full access
    if (isAdmin) {
      return ADMIN_PERMISSIONS;
    }

    // Check cache first
    if (cache[menuCode]) {
      return cache[menuCode];
    }

    try {
      const { data, error } = await supabase.rpc('get_user_menu_permissions', {
        _user_id: user.id,
        _menu_code: menuCode,
      });

      if (error) {
        logger.error('Error fetching menu permissions:', error);
        return READ_ONLY_PERMISSIONS;
      }

      if (data && data.length > 0) {
        const perm = data[0];
        const permissions: MenuPermissions = {
          canCreate: perm.can_create ?? false,
          canRead: perm.can_read ?? true,
          canUpdate: perm.can_update ?? false,
          canDelete: perm.can_delete ?? false,
          isLoading: false,
        };
        setCache(prev => ({ ...prev, [menuCode]: permissions }));
        return permissions;
      }

      return READ_ONLY_PERMISSIONS;
    } catch (err) {
      logger.error('Error in menu permissions fetch:', err);
      return READ_ONLY_PERMISSIONS;
    }
  }, [user?.id, isAdmin, cache]);

  return { getPermissions, isAdmin };
}
