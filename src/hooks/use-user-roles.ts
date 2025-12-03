import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type RoleCategory = 'general' | 'hsse' | 'environmental' | 'ptw' | 'security' | 'audit' | 'food_safety';

export interface Role {
  id: string;
  code: string;
  name: string;
  category: RoleCategory;
  description: string | null;
  is_system: boolean;
  module_access: string[];
  sort_order: number;
  is_active: boolean;
}

export interface UserRoleAssignment {
  role_id: string;
  role_code: string;
  role_name: string;
  category: RoleCategory;
}

export function useUserRoles() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<UserRoleAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all available roles
  const fetchRoles = useCallback(async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (!error && data) {
      setRoles(data as Role[]);
    }
  }, []);

  // Fetch roles for a specific user
  const fetchUserRoles = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .rpc('get_user_roles', { p_user_id: userId });

    if (!error && data) {
      return data as UserRoleAssignment[];
    }
    return [];
  }, []);

  // Fetch current user's roles
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      await fetchRoles();
      
      if (user?.id) {
        const roles = await fetchUserRoles(user.id);
        setUserRoles(roles);
      }
      
      setIsLoading(false);
    }
    loadData();
  }, [user?.id, fetchRoles, fetchUserRoles]);

  // Check if user has a specific role
  const hasRole = useCallback((roleCode: string): boolean => {
    return userRoles.some(r => r.role_code === roleCode);
  }, [userRoles]);

  // Check if user has any role in a category
  const hasRoleInCategory = useCallback((category: RoleCategory): boolean => {
    return userRoles.some(r => r.category === category);
  }, [userRoles]);

  // Check if user has module access based on their roles
  const hasModuleAccess = useCallback((moduleCode: string): boolean => {
    for (const userRole of userRoles) {
      const role = roles.find(r => r.id === userRole.role_id);
      if (role?.module_access.includes(moduleCode)) {
        return true;
      }
    }
    return false;
  }, [userRoles, roles]);

  // Get roles grouped by category
  const rolesByCategory = roles.reduce((acc, role) => {
    if (!acc[role.category]) {
      acc[role.category] = [];
    }
    acc[role.category].push(role);
    return acc;
  }, {} as Record<RoleCategory, Role[]>);

  // Assign roles to a user (admin only)
  const assignRoles = useCallback(async (userId: string, roleIds: string[], tenantId: string) => {
    // First, get current assignments to preserve normal_user - WITH tenant filter for security
    const { data: existingAssignments } = await supabase
      .from('user_role_assignments')
      .select('role_id')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId); // CRITICAL: tenant isolation

    const normalUserRole = roles.find(r => r.code === 'normal_user');
    
    // Ensure normal_user is always included
    const finalRoleIds = normalUserRole && !roleIds.includes(normalUserRole.id)
      ? [...roleIds, normalUserRole.id]
      : roleIds;

    // Delete existing non-normal_user assignments - WITH tenant filter for security
    if (normalUserRole) {
      await supabase
        .from('user_role_assignments')
        .delete()
        .eq('user_id', userId)
        .eq('tenant_id', tenantId) // CRITICAL: tenant isolation
        .neq('role_id', normalUserRole.id);
    }

    // Insert new assignments (excluding normal_user if it already exists)
    const existingRoleIds = (existingAssignments || []).map(a => a.role_id);
    const newAssignments = finalRoleIds
      .filter(roleId => !existingRoleIds.includes(roleId))
      .map(roleId => ({
        user_id: userId,
        role_id: roleId,
        tenant_id: tenantId,
        assigned_by: user?.id,
      }));

    if (newAssignments.length > 0) {
      const { error } = await supabase
        .from('user_role_assignments')
        .insert(newAssignments);

      if (error) throw error;
    }

    return true;
  }, [roles, user?.id]);

  return {
    roles,
    userRoles,
    rolesByCategory,
    isLoading,
    hasRole,
    hasRoleInCategory,
    hasModuleAccess,
    fetchUserRoles,
    assignRoles,
    refetch: fetchRoles,
  };
}
