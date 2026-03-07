import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserWithRoles {
  id: string;
  full_name: string;
  email?: string;
  user_type?: string;
  is_active?: boolean;
  has_login?: boolean;
  employee_id?: string;
  job_title?: string;
  assigned_branch_id?: string;
  assigned_department_id?: string;
  roles?: Array<{ role_id: string; role_code: string; role_name: string; category?: string }>;
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

  const query = useQuery({
    queryKey: ['users-paginated', options?.filters, page, pageSize],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await supabase
        .from('profiles')
        .select('id, full_name, email, user_type, is_active, has_login, employee_id, job_title, assigned_branch_id', { count: 'exact' })
        .is('deleted_at', null)
        .range(from, to);
      if (error) throw error;
      return { data: (data || []) as UserWithRoles[], total: count || data?.length || 0 };
    },
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
