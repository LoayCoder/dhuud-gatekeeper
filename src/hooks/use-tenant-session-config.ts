import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface TenantSessionConfig {
  sessionTimeoutMinutes: number;
  warningThresholdMinutes: number;
}

const DEFAULT_TIMEOUT_MINUTES = 15;
const DEFAULT_WARNING_THRESHOLD_MINUTES = 2;

/**
 * Hook to fetch the tenant's session timeout configuration.
 * Falls back to defaults if not configured or on error.
 */
export function useTenantSessionConfig() {
  const query = useQuery({
    queryKey: ['tenant-session-config'],
    queryFn: async (): Promise<TenantSessionConfig> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return {
          sessionTimeoutMinutes: DEFAULT_TIMEOUT_MINUTES,
          warningThresholdMinutes: DEFAULT_WARNING_THRESHOLD_MINUTES,
        };
      }

      // Get user's tenant_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) {
        return {
          sessionTimeoutMinutes: DEFAULT_TIMEOUT_MINUTES,
          warningThresholdMinutes: DEFAULT_WARNING_THRESHOLD_MINUTES,
        };
      }

      // Get tenant's session timeout configuration
      const { data: tenant } = await supabase
        .from('tenants')
        .select('session_timeout_minutes')
        .eq('id', profile.tenant_id)
        .single();

      const timeoutMinutes = tenant?.session_timeout_minutes ?? DEFAULT_TIMEOUT_MINUTES;
      
      // Warning threshold is 2 minutes or 10% of timeout, whichever is greater
      const warningThreshold = Math.max(2, Math.floor(timeoutMinutes * 0.1));

      return {
        sessionTimeoutMinutes: timeoutMinutes,
        warningThresholdMinutes: warningThreshold,
      };
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  return {
    config: query.data ?? {
      sessionTimeoutMinutes: DEFAULT_TIMEOUT_MINUTES,
      warningThresholdMinutes: DEFAULT_WARNING_THRESHOLD_MINUTES,
    },
    isLoading: query.isLoading,
    error: query.error,
  };
}
