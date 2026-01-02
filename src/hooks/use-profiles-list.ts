import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ProfileListItem {
  id: string;
  full_name: string;
  job_title: string | null;
  phone_number: string | null;
  email: string | null;
}

export function useProfilesList() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['profiles-list', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, job_title, phone_number, email')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('full_name');

      if (error) throw error;
      return data as ProfileListItem[];
    },
    enabled: !!tenantId,
  });
}
