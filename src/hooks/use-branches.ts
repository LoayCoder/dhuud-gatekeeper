import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Branch {
  id: string;
  name: string;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export function useBranches() {
  return useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile) return [];

      const { data, error } = await supabase
        .from('branches')
        .select('id, name, location, latitude, longitude')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      return data as Branch[];
    },
    staleTime: 10 * 60 * 1000,
  });
}
