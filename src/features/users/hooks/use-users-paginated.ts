import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useCallback } from 'react';
import { Json } from '@/integrations/supabase/types';

export interface UserWithRoles {
  id: string;
  full_name: string | null;
  email: string | null;
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
  contractor_company_name: string | null;
  contract_start: string | null;
  contract_end: string | null;
  has_full_branch_access: boolean | null;
  membership_id: string | null;
  membership_start: string | null;
  membership_end: string | null;
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
  searchTerm?: string | null;
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

      const { getUsersPaginated } = await import('@/features/admin');
      return getUsersPaginated(tenantId, filters, offset, pageSize);
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
