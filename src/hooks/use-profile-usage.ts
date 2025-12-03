import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ProfileUsage {
  tenant_id: string;
  billing_month: string;
  plan_name: string;
  visitor_count: number;
  member_count: number;
  contractor_count: number;
  total_profiles: number;
  free_quota: number;
  billable_profiles: number;
  rate_per_profile: number;
  profile_charges: number;
}

export function useProfileUsage(tenantId?: string) {
  const { profile } = useAuth();
  const targetTenantId = tenantId || profile?.tenant_id;

  const { data: usage, isLoading, error, refetch } = useQuery({
    queryKey: ['profile-usage', targetTenantId],
    queryFn: async (): Promise<ProfileUsage | null> => {
      if (!targetTenantId) return null;

      const { data, error } = await supabase
        .rpc('get_current_month_usage', { p_tenant_id: targetTenantId });

      if (error) throw error;
      return data as unknown as ProfileUsage;
    },
    enabled: !!targetTenantId,
  });

  const usagePercentage = usage ? Math.round((usage.total_profiles / usage.free_quota) * 100) : 0;
  const isNearQuota = usagePercentage >= 80;
  const isOverQuota = usagePercentage >= 100;

  return {
    usage,
    isLoading,
    error,
    refetch,
    usagePercentage,
    isNearQuota,
    isOverQuota,
  };
}

export function useAllTenantsUsage() {
  const { data: tenantsUsage, isLoading, error, refetch } = useQuery({
    queryKey: ['all-tenants-usage'],
    queryFn: async () => {
      // Get all tenants
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, name, plan_id, plans(name, profile_quota_monthly, extra_profile_price_sar)')
        .order('name');

      if (tenantsError) throw tenantsError;

      // Get usage for each tenant
      const usagePromises = tenants.map(async (tenant) => {
        const { data: usage } = await supabase
          .rpc('get_current_month_usage', { p_tenant_id: tenant.id });
        
        return {
          ...tenant,
          usage: usage as unknown as ProfileUsage,
        };
      });

      return Promise.all(usagePromises);
    },
  });

  return {
    tenantsUsage,
    isLoading,
    error,
    refetch,
  };
}
