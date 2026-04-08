import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserWithRoles {
  id: string;
  full_name: string;
  email?: string;
  phone_number?: string;
  user_type?: string;
  is_active?: boolean;
  has_login?: boolean;
  employee_id?: string;
  job_title?: string;
  assigned_branch_id?: string;
  branch_name?: string;
  assigned_division_id?: string;
  division_name?: string;
  assigned_department_id?: string;
  department_name?: string;
  assigned_section_id?: string;
  section_name?: string;
  contractor_company_name?: string;
  contract_start?: string;
  contract_end?: string;
  has_full_branch_access?: boolean;
  membership_id?: string;
  membership_start?: string;
  membership_end?: string;
  role_assignments?: Array<{ role_id: string; role_code: string; role_name: string; category?: string }>;
  roles?: Array<{ role_id: string; role_code: string; role_name: string; category?: string }>;
  total_count?: number;
  [key: string]: unknown;
}

export interface UseUsersPaginatedFilters {
  search?: string;
  searchTerm?: string | null;
  branchId?: string | null;
  divisionId?: string | null;
  userType?: string | null;
  isActive?: boolean | null;
  roleCode?: string | null;
  page?: number;
  pageSize?: number;
  [key: string]: unknown;
}

export function useUsersPaginated(options?: { filters?: UseUsersPaginatedFilters; pageSize?: number }) {
  const [page, setPage] = useState(1);
  const pageSize = options?.pageSize || 25;
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  const query = useQuery({
    queryKey: ['users-paginated', tenantId, options?.filters, page, pageSize],
    queryFn: async () => {
      if (!tenantId) return { data: [] as UserWithRoles[], total: 0 };

      const offset = (page - 1) * pageSize;
      const filters = options?.filters;

      const { data, error } = await supabase.rpc('get_users_with_roles_paginated', {
        p_tenant_id: tenantId,
        p_user_type: filters?.userType || null,
        p_is_active: filters?.isActive ?? null,
        p_branch_id: filters?.branchId || null,
        p_division_id: filters?.divisionId || null,
        p_role_code: filters?.roleCode || null,
        p_search_term: filters?.searchTerm || null,
        p_offset: offset,
        p_limit: pageSize,
      });

      if (error) throw error;

      const rows = (data || []) as UserWithRoles[];
      const total = rows.length > 0 ? Number(rows[0].total_count) || rows.length : 0;

      // Map role_assignments for backward compat
      const mapped = rows.map(r => ({
        ...r,
        roles: r.role_assignments,
      }));

      return { data: mapped, total };
    },
    enabled: !!tenantId,
  });

  const users = query.data?.data || [];
  const totalCount = query.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    users,
    isLoading: query.isLoading,
    loading: query.isLoading,
    page,
    totalPages,
    totalCount,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    goToNextPage: () => setPage(p => Math.min(p + 1, totalPages)),
    goToPreviousPage: () => setPage(p => Math.max(p - 1, 1)),
    goToPage: (p: number) => setPage(p),
    refetch: query.refetch,
    refetchUsers: query.refetch,
    resetPage: useCallback(() => setPage(1), []),
  };
}
