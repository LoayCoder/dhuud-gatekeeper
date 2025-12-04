import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useCallback } from 'react';
import { Json } from '@/integrations/supabase/types';

export interface UserWithRoles {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  user_type: string | null;
  has_login: boolean | null;
  is_active: boolean | null;
  employee_id: string | null;
  job_title: string | null;
  assigned_branch_id: string | null;
  branch_name: string | null;
  assigned_division_id: string | null;
  division_name: string | null;
  assigned_department_id: string | null;
  department_name: string | null;
  assigned_section_id: string | null;
  section_name: string | null;
  role_assignments: Array<{
    role_id: string;
    role_code: string;
    role_name: string;
    category: string;
  }>;
}

export interface UseUsersPaginatedFilters {
  userType?: string | null;
  isActive?: boolean | null;
  branchId?: string | null;
  divisionId?: string | null;
  roleCode?: string | null;
}

interface UseUsersPaginatedOptions {
  filters?: UseUsersPaginatedFilters;
  pageSize?: number;
}

// Helper to parse role_assignments JSON
function parseRoleAssignments(json: Json | null): Array<{
  role_id: string;
  role_code: string;
  role_name: string;
  category: string;
}> {
  if (!json || !Array.isArray(json)) return [];
  return json.map((item: unknown) => {
    const obj = item as Record<string, unknown>;
    return {
      role_id: String(obj.role_id || ''),
      role_code: String(obj.role_code || ''),
      role_name: String(obj.role_name || ''),
      category: String(obj.category || 'general'),
    };
  });
}

export function useUsersPaginated(options: UseUsersPaginatedOptions = {}) {
  const { filters = {}, pageSize = 25 } = options;
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['users-paginated', tenantId, filters, page, pageSize],
    queryFn: async (): Promise<{ users: UserWithRoles[]; totalCount: number }> => {
      if (!tenantId) return { users: [], totalCount: 0 };

      const offset = (page - 1) * pageSize;

      const { data, error } = await supabase.rpc('get_users_with_roles_paginated', {
        p_tenant_id: tenantId,
        p_user_type: filters.userType || null,
        p_is_active: filters.isActive ?? null,
        p_branch_id: filters.branchId || null,
        p_division_id: filters.divisionId || null,
        p_role_code: filters.roleCode || null,
        p_offset: offset,
        p_limit: pageSize,
      });

      if (error) throw error;

      // Extract total count from first row (all rows have the same total_count)
      const totalCount = data && data.length > 0 ? Number(data[0].total_count) : 0;

      const users: UserWithRoles[] = (data || []).map((row) => ({
        id: row.id,
        full_name: row.full_name,
        phone_number: row.phone_number,
        user_type: row.user_type,
        has_login: row.has_login,
        is_active: row.is_active,
        employee_id: row.employee_id,
        job_title: row.job_title,
        assigned_branch_id: row.assigned_branch_id,
        branch_name: row.branch_name,
        assigned_division_id: row.assigned_division_id,
        division_name: row.division_name,
        assigned_department_id: row.assigned_department_id,
        department_name: row.department_name,
        assigned_section_id: row.assigned_section_id,
        section_name: row.section_name,
        role_assignments: parseRoleAssignments(row.role_assignments),
      }));

      return { users, totalCount };
    },
    enabled: !!tenantId,
  });

  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasNextPage = page < totalPages;
  const hasPreviousPage = page > 1;

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1 && (totalPages === 0 || newPage <= totalPages)) {
      setPage(newPage);
    }
  }, [totalPages]);

  const goToNextPage = useCallback(() => {
    if (hasNextPage) setPage(p => p + 1);
  }, [hasNextPage]);

  const goToPreviousPage = useCallback(() => {
    if (hasPreviousPage) setPage(p => p - 1);
  }, [hasPreviousPage]);

  const resetPage = useCallback(() => {
    setPage(1);
  }, []);

  return {
    users: data?.users || [],
    isLoading,
    error: error as Error | null,
    refetch,
    // Pagination
    page,
    totalCount,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    resetPage,
  };
}
