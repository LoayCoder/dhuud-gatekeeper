import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DepartmentUser {
  id: string;
  full_name: string | null;
  job_title: string | null;
  employee_id: string | null;
}

export function useDepartmentUsers(departmentId: string | null) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['department-users', profile?.tenant_id, departmentId],
    queryFn: async () => {
      if (!profile?.tenant_id || !departmentId) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, job_title, employee_id')
        .eq('tenant_id', profile.tenant_id)
        .eq('assigned_department_id', departmentId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('full_name');

      if (error) throw error;
      return data as DepartmentUser[];
    },
    enabled: !!profile?.tenant_id && !!departmentId,
  });
}

export function useTenantUsers() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['tenant-users', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, job_title, employee_id, assigned_department_id')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('full_name');

      if (error) throw error;
      return data as (DepartmentUser & { assigned_department_id: string | null })[];
    },
    enabled: !!profile?.tenant_id,
  });
}
