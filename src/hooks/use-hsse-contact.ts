import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface HSSEContact {
  id: string;
  full_name: string | null;
  phone_number: string | null;
  role_name: string;
  role_code: string;
  avatar_url: string | null;
  match_scope: 'site' | 'branch' | 'organization';
}

/**
 * Fetch HSSE contact person with smart fallback resolution
 * Priority: Site → Branch → Organization (tenant-wide)
 */
export function useHSSEContact(branchId: string | null, siteId: string | null = null) {
  return useQuery({
    queryKey: ['hsse-contact', branchId, siteId],
    queryFn: async (): Promise<HSSEContact | null> => {
      const { data, error } = await supabase
        .rpc('get_hsse_contact_for_location', { 
          p_branch_id: branchId,
          p_site_id: siteId 
        });

      if (error) {
        console.error('Error fetching HSSE contact:', error);
        return null;
      }

      if (!data?.[0]) return null;
      
      return {
        ...data[0],
        match_scope: data[0].match_scope as 'site' | 'branch' | 'organization'
      };
    },
    enabled: true, // Always enabled - let DB handle fallback
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 30 * 60 * 1000,
  });
}
