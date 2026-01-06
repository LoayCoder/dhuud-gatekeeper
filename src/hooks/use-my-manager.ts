import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ManagerInfo {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  email: string | null;
  job_title: string | null;
}

export function useMyManager() {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ['my-manager', user?.id, profile?.tenant_id],
    queryFn: async (): Promise<ManagerInfo | null> => {
      if (!user?.id || !profile?.tenant_id) return null;

      // Get manager assignment for current user
      const { data: assignment, error: assignmentError } = await supabase
        .from('manager_team')
        .select('manager_id')
        .eq('user_id', user.id)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .maybeSingle();

      if (assignmentError) {
        console.error('Error fetching manager assignment:', assignmentError);
        return null;
      }
      
      if (!assignment?.manager_id) return null;

      // Fetch manager profile with contact info
      const { data: managerProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, phone_number, email, job_title')
        .eq('id', assignment.manager_id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching manager profile:', profileError);
        return null;
      }
      
      return managerProfile;
    },
    enabled: !!user?.id && !!profile?.tenant_id,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}
