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
  [key: string]: any;
}

export interface UseUsersPaginatedFilters {
  search?: string;
  branchId?: string;
  userType?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export function useUsersPaginated(filters?: UseUsersPaginatedFilters) {
  return useQuery({
    queryKey: ['users-paginated', filters],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('id, full_name, email, user_type, is_active, has_login, employee_id, job_title')
        .is('deleted_at', null)
        .range(0, 49);
      if (error) throw error;
      return { data: (data || []) as UserWithRoles[], total: data?.length || 0 };
    },
  });
}
