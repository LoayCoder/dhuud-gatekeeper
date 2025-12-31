import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DepartmentSite {
  id: string;
  name: string;
  address: string | null;
  is_primary: boolean;
}

export function useUserDepartmentSites(departmentId: string | null | undefined) {
  return useQuery({
    queryKey: ['user-department-sites', departmentId],
    queryFn: async (): Promise<DepartmentSite[]> => {
      if (!departmentId) return [];

      const { data, error } = await supabase
        .from('site_departments')
        .select(`
          is_primary,
          sites!inner(id, name, address)
        `)
        .eq('department_id', departmentId)
        .is('deleted_at', null);

      if (error) throw error;
      
      // Transform the data - handle the nested sites object
      return (data || []).map(sd => {
        const site = sd.sites as unknown as { id: string; name: string; address: string | null };
        return {
          id: site.id,
          name: site.name,
          address: site.address,
          is_primary: sd.is_primary ?? false
        };
      });
    },
    enabled: !!departmentId,
    staleTime: 5 * 60 * 1000,
  });
}
