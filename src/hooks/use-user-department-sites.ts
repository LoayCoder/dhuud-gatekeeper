// Stub: use-user-department-sites
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useUserDepartmentSites() {
  const { user, profile } = useAuth();
  return useQuery({
    queryKey: ['user-department-sites', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('sites')
        .select('id, name, branch_id')
        .eq('tenant_id', (profile as any)?.tenant_id)
        .is('deleted_at', null);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id && !!(profile as any)?.tenant_id,
  });
}
