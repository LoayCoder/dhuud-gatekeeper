import React, { createContext, useContext } from 'react';
import { MenuPermissions, useMenuPermissions } from '@/hooks/use-menu-permissions';

interface MenuPermissionsContextValue extends MenuPermissions {
  menuCode: string;
}

const MenuPermissionsContext = createContext<MenuPermissionsContextValue | null>(null);

interface MenuPermissionsProviderProps {
  children: React.ReactNode;
  menuCode: string;
}

/**
 * Provider component that wraps pages/routes to provide menu permissions context.
 * Used by MenuBasedAdminRoute to pass permissions to child components.
 */
export function MenuPermissionsProvider({ children, menuCode }: MenuPermissionsProviderProps) {
  const permissions = useMenuPermissions(menuCode);

  return (
    <MenuPermissionsContext.Provider value={{ ...permissions, menuCode }}>
      {children}
    </MenuPermissionsContext.Provider>
  );
}

/**
 * Hook to consume menu permissions from context.
 * Must be used within a MenuPermissionsProvider or MenuBasedAdminRoute.
 */
export function useMenuPermissionsContext(): MenuPermissionsContextValue {
  const context = useContext(MenuPermissionsContext);
  
  if (!context) {
    // Return read-only permissions as fallback if not within a provider
    return {
      menuCode: '',
      canCreate: false,
      canRead: true,
      canUpdate: false,
      canDelete: false,
      isLoading: false,
    };
  }
  
  return context;
}

/**
 * Hook to check if user has specific permission for current menu context.
 */
export function useCanCreate(): boolean {
  const { canCreate, isLoading } = useMenuPermissionsContext();
  return !isLoading && canCreate;
}

export function useCanUpdate(): boolean {
  const { canUpdate, isLoading } = useMenuPermissionsContext();
  return !isLoading && canUpdate;
}

export function useCanDelete(): boolean {
  const { canDelete, isLoading } = useMenuPermissionsContext();
  return !isLoading && canDelete;
}

export function useCanRead(): boolean {
  const { canRead, isLoading } = useMenuPermissionsContext();
  return !isLoading && canRead;
}
