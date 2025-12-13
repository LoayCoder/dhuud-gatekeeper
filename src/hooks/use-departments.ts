import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Department {
  id: string;
  name: string;
  division_id?: string | null;
}

export function useDepartments(divisionId?: string) {
  return useQuery({
    queryKey: ['departments', divisionId],
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
        .from('departments')
        .select('id, name, division_id')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('name');

      if (divisionId) {
        query = query.eq('division_id', divisionId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Department[];
    },
    staleTime: 10 * 60 * 1000,
  });
}
