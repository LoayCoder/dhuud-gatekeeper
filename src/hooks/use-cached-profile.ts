import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CachedProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  preferred_language: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  assigned_branch_id: string | null;
  assigned_site_id: string | null;
  assigned_division_id: string | null;
  assigned_department_id: string | null;
  assigned_section_id: string | null;
  has_full_branch_access: boolean | null;
  user_type: string | null;
  job_title: string | null;
  employee_id: string | null;
  created_at: string | null;
  tenant_id: string;
  branches?: { name: string; location: string | null } | null;
  sites?: { name: string; address: string | null } | null;
}

/**
 * Cached profile hook with 5-minute stale time
 * Prevents redundant API calls across page navigations
 */
export function useCachedProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cached-profile', user?.id],
    queryFn: async (): Promise<CachedProfile | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, email, full_name, phone_number, avatar_url, preferred_language,
          emergency_contact_name, emergency_contact_phone,
          assigned_branch_id, assigned_site_id,
          assigned_division_id, assigned_department_id, assigned_section_id,
          has_full_branch_access,
          user_type, job_title, employee_id, created_at, tenant_id,
          branches:assigned_branch_id(name, location),
          sites:assigned_site_id(name, address)
        `)
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as CachedProfile | null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes - won't refetch within this time
    gcTime: 30 * 60 * 1000, // 30 minutes cache
  });
}

/**
 * Cached user role hook
 */
export function useCachedUserRole() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cached-user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) return 'user';

      const { data: isAdminResult } = await supabase
        .rpc('is_admin', { p_user_id: user.id });

      return isAdminResult ? 'admin' : 'user';
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
