import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface BillingRecord {
  id: string;
  tenant_id: string;
  billing_month: string;
  plan_id: string | null;
  visitor_count: number;
  member_count: number;
  contractor_count: number;
  total_profiles: number;
  free_quota: number;
  billable_profiles: number;
  rate_per_profile: number;
  profile_charges: number;
  licensed_users: number;
  licensed_user_charges: number;
  total_charge: number;
  status: string;
  created_at: string;
}

export function useProfileBilling(tenantId?: string) {
  const { profile } = useAuth();
  const targetTenantId = tenantId || profile?.tenant_id;

  const { data: billingRecords, isLoading, error, refetch } = useQuery({
    queryKey: ['billing-records', targetTenantId],
    queryFn: async (): Promise<BillingRecord[]> => {
      if (!targetTenantId) return [];

      const { data, error } = await supabase
        .from('tenant_billing_records')
        .select('*')
        .eq('tenant_id', targetTenantId)
        .order('billing_month', { ascending: false });

      if (error) throw error;
      return data as BillingRecord[];
    },
    enabled: !!targetTenantId,
  });

  const currentMonthBilling = billingRecords?.[0] || null;
  const lastMonthBilling = billingRecords?.[1] || null;

  return {
    billingRecords,
    currentMonthBilling,
    lastMonthBilling,
    isLoading,
    error,
    refetch,
  };
}

export function useAllTenantsBilling() {
  const { data: allBilling, isLoading, error, refetch } = useQuery({
    queryKey: ['all-tenants-billing'],
    queryFn: async () => {
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
      const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7) + '-01';

      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select(`
          id, 
          name, 
          plan_id,
          plans(name, display_name)
        `)
        .order('name');

      if (tenantsError) throw tenantsError;

      const billingPromises = tenants.map(async (tenant) => {
        const { data: currentBilling } = await supabase
          .from('tenant_billing_records')
          .select('*')
          .eq('tenant_id', tenant.id)
          .eq('billing_month', currentMonth)
          .maybeSingle();

        const { data: lastBilling } = await supabase
          .from('tenant_billing_records')
          .select('*')
          .eq('tenant_id', tenant.id)
          .eq('billing_month', lastMonth)
          .maybeSingle();

        return {
          ...tenant,
          currentBilling,
          lastBilling,
        };
      });

      return Promise.all(billingPromises);
    },
  });

  return {
    allBilling,
    isLoading,
    error,
    refetch,
  };
}

export function useGenerateBillingRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tenantId, billingMonth }: { tenantId: string; billingMonth: string }) => {
      // Calculate billing using RPC
      const { data: billingData, error: calcError } = await supabase
        .rpc('calculate_profile_billing', { 
          p_tenant_id: tenantId, 
          p_billing_month: billingMonth 
        });

      if (calcError) throw calcError;

      const billing = billingData as unknown as Record<string, number>;

      // Insert or update billing record
      const { data, error } = await supabase
        .from('tenant_billing_records')
        .upsert({
          tenant_id: tenantId,
          billing_month: billingMonth,
          visitor_count: billing.visitor_count,
          member_count: billing.member_count,
          contractor_count: billing.contractor_count,
          total_profiles: billing.total_profiles,
          free_quota: billing.free_quota,
          billable_profiles: billing.billable_profiles,
          rate_per_profile: billing.rate_per_profile,
          profile_charges: billing.profile_charges,
          total_charge: billing.profile_charges,
        }, {
          onConflict: 'tenant_id,billing_month',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-records'] });
      queryClient.invalidateQueries({ queryKey: ['all-tenants-billing'] });
      toast.success('Billing record generated');
    },
    onError: (error) => {
      toast.error('Failed to generate billing record');
      console.error(error);
    },
  });
}
