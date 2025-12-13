import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Site {
  id: string;
  name: string;
  branch_id?: string | null;
}

export function useSites(branchId?: string) {
  return useQuery({
    queryKey: ['sites', branchId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile) return [];

      let query = supabase
        .from('sites')
        .select('id, name, branch_id')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('name');

      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Site[];
    },
    staleTime: 10 * 60 * 1000,
  });
}
