import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface HSSEValidationStats {
  pending_validation: number;
  pending_closure: number;
  level_3_count: number;
  level_4_count: number;
  level_5_count: number;
  avg_pending_days: number | null;
}

export interface PendingValidation {
  id: string;
  reference_id: string;
  title: string;
  severity_v2: string;
  status: string;
  created_at: string;
  occurred_at: string;
  days_pending: number;
  site_name: string | null;
  branch_name: string | null;
  reporter_name: string | null;
}

export interface HSSEValidationDashboardData {
  stats: HSSEValidationStats | null;
  pending_validations: PendingValidation[] | null;
}

interface UseHSSEValidationDashboardParams {
  severityFilter?: string;
  siteId?: string;
}

export function useHSSEValidationDashboard(params: UseHSSEValidationDashboardParams = {}) {
  const { severityFilter, siteId } = params;
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['hsse-validation-dashboard', severityFilter, siteId, profile?.tenant_id],
    queryFn: async (): Promise<HSSEValidationDashboardData> => {
      // CRITICAL: Tenant isolation - must have tenant_id
      if (!profile?.tenant_id) {
        return { stats: null, pending_validations: null };
      }

      const { data, error } = await supabase.rpc('get_hsse_validation_dashboard', {
        p_severity_filter: severityFilter || null,
        p_site_id: siteId || null,
      });

      if (error) throw error;
      return data as unknown as HSSEValidationDashboardData;
    },
    staleTime: 30 * 1000, // 30 seconds - more frequent for pending tasks
    refetchInterval: 60 * 1000, // Auto-refresh every minute
    enabled: !!profile?.tenant_id,
  });
}
