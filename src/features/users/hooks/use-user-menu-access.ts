import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface UserMenuAccessItem {
  menu_item_id: string;
  menu_code: string;
  menu_name: string;
  menu_name_ar: string | null;
  parent_code: string | null;
  sort_order: number;
  access_type: 'role' | 'user';
  granted_by: string | null;
  granted_at: string | null;
  notes: string | null;
}

export interface MenuItem {
  id: string;
  code: string;
  name: string;
  name_ar: string | null;
  parent_code: string | null;
  url: string | null;
  sort_order: number;
}

export interface UserWithMenuOverrides {
  id: string;
  full_name: string | null;
  email: string | null;
  employee_id: string | null;
  override_count: number;
}

/**
 * Hook to manage user-specific menu access
 */
export function useUserMenuAccess() {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all menu items
  const { data: menuItems = [], isLoading: menuLoading } = useQuery({
    queryKey: ['menu-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, code, name, name_ar, parent_code, url, sort_order')
        .order('sort_order');

      if (error) throw error;
      return data as MenuItem[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch user's current menu access (both role-based and user-specific)
  const fetchUserMenuAccess = useCallback(async (userId: string): Promise<UserMenuAccessItem[]> => {
    const { data, error } = await supabase.rpc('get_user_menu_access', {
      _user_id: userId
    });

    if (error) {
      console.error('Error fetching user menu access:', error);
      throw error;
    }

    return (data || []) as UserMenuAccessItem[];
  }, []);

  // Fetch users who have menu overrides
  const { data: usersWithOverrides = [], isLoading: overridesLoading, refetch: refetchOverrides } = useQuery({
    queryKey: ['users-with-menu-overrides', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('user_menu_access')
        .select('user_id')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null);

      if (error) throw error;

      // Group by user_id and count
      const userCounts = (data || []).reduce((acc, item) => {
        acc[item.user_id] = (acc[item.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Fetch user details
      const userIds = Object.keys(userCounts);
      if (userIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, employee_id')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      return (profiles || []).map(p => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        employee_id: p.employee_id,
        override_count: userCounts[p.id] || 0
      })) as UserWithMenuOverrides[];
    },
    enabled: !!profile?.tenant_id,
  });

  // Grant menu access to a user
  const grantAccessMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      menuItemIds, 
      notes 
    }: { 
      userId: string; 
      menuItemIds: string[]; 
      notes?: string;
    }) => {
      if (!profile?.tenant_id || !user?.id) throw new Error('Not authenticated');

      // Insert new access records
      const inserts = menuItemIds.map(menuItemId => ({
        tenant_id: profile.tenant_id,
        user_id: userId,
        menu_item_id: menuItemId,
        granted_by: user.id,
        notes: notes || null
      }));

      const { error } = await supabase
        .from('user_menu_access')
        .upsert(inserts, { 
          onConflict: 'tenant_id,user_id,menu_item_id',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      // Log audit entry
      await supabase.from('user_menu_access_audit_logs').insert({
        tenant_id: profile.tenant_id,
        target_user_id: userId,
        actor_id: user.id,
        action: 'grant',
        menu_item_ids: menuItemIds,
        notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-menu-overrides'] });
      toast.success(t('admin.userMenuAccess.accessGranted'));
    },
    onError: (error) => {
      console.error('Error granting access:', error);
      toast.error(t('common.error'));
    }
  });

  // Revoke menu access from a user
  const revokeAccessMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      menuItemIds,
      notes
    }: { 
      userId: string; 
      menuItemIds: string[];
      notes?: string;
    }) => {
      if (!profile?.tenant_id || !user?.id) throw new Error('Not authenticated');

      // Soft delete the access records
      const { error } = await supabase
        .from('user_menu_access')
        .update({ deleted_at: new Date().toISOString() })
        .eq('tenant_id', profile.tenant_id)
        .eq('user_id', userId)
        .in('menu_item_id', menuItemIds);

      if (error) throw error;

      // Log audit entry
      await supabase.from('user_menu_access_audit_logs').insert({
        tenant_id: profile.tenant_id,
        target_user_id: userId,
        actor_id: user.id,
        action: 'revoke',
        menu_item_ids: menuItemIds,
        notes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-menu-overrides'] });
      toast.success(t('admin.userMenuAccess.accessRevoked'));
    },
    onError: (error) => {
      console.error('Error revoking access:', error);
      toast.error(t('common.error'));
    }
  });

  // Reset user to role-only access (remove all user-specific access)
  const resetToRoleMutation = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      if (!profile?.tenant_id || !user?.id) throw new Error('Not authenticated');

      // Get all current user overrides for audit
      const { data: currentAccess } = await supabase
        .from('user_menu_access')
        .select('menu_item_id')
        .eq('tenant_id', profile.tenant_id)
        .eq('user_id', userId)
        .is('deleted_at', null);

      const menuItemIds = (currentAccess || []).map(a => a.menu_item_id);

      if (menuItemIds.length === 0) return;

      // Soft delete all access records
      const { error } = await supabase
        .from('user_menu_access')
        .update({ deleted_at: new Date().toISOString() })
        .eq('tenant_id', profile.tenant_id)
        .eq('user_id', userId)
        .is('deleted_at', null);

      if (error) throw error;

      // Log audit entry
      await supabase.from('user_menu_access_audit_logs').insert({
        tenant_id: profile.tenant_id,
        target_user_id: userId,
        actor_id: user.id,
        action: 'reset',
        menu_item_ids: menuItemIds,
        notes: 'Reset to role-only access'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-menu-overrides'] });
      toast.success(t('admin.userMenuAccess.resetSuccess'));
    },
    onError: (error) => {
      console.error('Error resetting access:', error);
      toast.error(t('common.error'));
    }
  });

  // Save user menu access (handles both grant and revoke)
  const saveUserAccess = useCallback(async (
    userId: string,
    selectedMenuIds: Set<string>,
    currentUserAccess: UserMenuAccessItem[],
    notes?: string
  ) => {
    // Get current user-specific menu IDs
    const currentUserMenuIds = new Set(
      currentUserAccess
        .filter(a => a.access_type === 'user')
        .map(a => a.menu_item_id)
    );

    // Calculate changes
    const toGrant: string[] = [];
    const toRevoke: string[] = [];

    for (const id of selectedMenuIds) {
      if (!currentUserMenuIds.has(id)) {
        toGrant.push(id);
      }
    }

    for (const id of currentUserMenuIds) {
      if (!selectedMenuIds.has(id)) {
        toRevoke.push(id);
      }
    }

    // Execute changes
    if (toGrant.length > 0) {
      await grantAccessMutation.mutateAsync({ userId, menuItemIds: toGrant, notes });
    }

    if (toRevoke.length > 0) {
      await revokeAccessMutation.mutateAsync({ userId, menuItemIds: toRevoke, notes });
    }

    return { granted: toGrant.length, revoked: toRevoke.length };
  }, [grantAccessMutation, revokeAccessMutation]);

  return {
    menuItems,
    menuLoading,
    usersWithOverrides,
    overridesLoading,
    refetchOverrides,
    fetchUserMenuAccess,
    grantAccess: grantAccessMutation.mutate,
    revokeAccess: revokeAccessMutation.mutate,
    resetToRole: resetToRoleMutation.mutate,
    saveUserAccess,
    isGranting: grantAccessMutation.isPending,
    isRevoking: revokeAccessMutation.isPending,
    isResetting: resetToRoleMutation.isPending,
  };
}
