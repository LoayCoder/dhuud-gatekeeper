import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface HSSEContact {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  role_name: string;
  role_code: string;
  avatar_url: string | null;
}

/**
 * Fetch HSSE contact person for a specific branch location
 * Priority: hsse_officer > hsse_expert > hsse_manager
 */
export function useHSSEContact(branchId: string | null) {
  return useQuery({
    queryKey: ['hsse-contact', branchId],
    queryFn: async (): Promise<HSSEContact | null> => {
      if (!branchId) return null;

      const { data, error } = await supabase
        .rpc('get_hsse_contact_for_location', { p_branch_id: branchId });

      if (error) {
        console.error('Error fetching HSSE contact:', error);
        return null;
      }

      return data?.[0] || null;
    },
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 30 * 60 * 1000,
  });
}
