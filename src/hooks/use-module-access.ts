import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type ModuleCode = 
  | 'hsse_core' 
  | 'visitor_management' 
  | 'incidents' 
  | 'audits' 
  | 'reports_analytics'
  | 'api_access'
  | 'priority_support'
  | 'ptw'
  | 'security'
  | 'food_safety'
  | 'environmental'
  | 'asset_management';

interface TenantSubscription {
  planId: string | null;
  planName: string | null;
  subscriptionStatus: string;
  trialStartDate: string | null;
  trialEndDate: string | null;
  maxUsers: number;
  currentUsers: number;
}

export function useModuleAccess() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  // Fetch tenant's modules
  const { data: modules = [], isLoading: modulesLoading } = useQuery({
    queryKey: ['tenant-modules', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      
      const { data, error } = await supabase
        .rpc('get_tenant_modules', { p_tenant_id: tenantId });
      
      if (error) {
        console.error('Error fetching modules:', error);
        return [];
      }
      
      return (data || []) as ModuleCode[];
    },
    enabled: !!tenantId,
  });

  // Fetch tenant subscription info
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['tenant-subscription', tenantId],
    queryFn: async (): Promise<TenantSubscription | null> => {
      if (!tenantId) return null;
      
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select(`
          plan_id,
          subscription_status,
          trial_start_date,
          trial_end_date,
          max_users_override,
          plans (
            name,
            max_users
          )
        `)
        .eq('id', tenantId)
        .single();
      
      if (tenantError) {
        console.error('Error fetching subscription:', tenantError);
        return null;
      }

      // Get current user count
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      const plan = tenant?.plans as { name: string; max_users: number } | null;
      
      return {
        planId: tenant?.plan_id,
        planName: plan?.name || null,
        subscriptionStatus: tenant?.subscription_status || 'inactive',
        trialStartDate: tenant?.trial_start_date,
        trialEndDate: tenant?.trial_end_date,
        maxUsers: tenant?.max_users_override || plan?.max_users || 5,
        currentUsers: count || 0,
      };
    },
    enabled: !!tenantId,
  });

  const hasModule = (module: ModuleCode): boolean => {
    return modules.includes(module);
  };

  const isTrialActive = (): boolean => {
    if (!subscription?.trialEndDate) return false;
    if (subscription?.subscriptionStatus !== 'trialing') return false;
    return new Date(subscription.trialEndDate) > new Date();
  };

  const isTrialExpired = (): boolean => {
    if (!subscription?.trialEndDate) return false;
    return subscription?.subscriptionStatus === 'trialing' && 
           new Date(subscription.trialEndDate) <= new Date();
  };

  const getTrialDaysRemaining = (): number => {
    if (!subscription?.trialEndDate) return 0;
    const endDate = new Date(subscription.trialEndDate);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const isSubscriptionActive = (): boolean => {
    return subscription?.subscriptionStatus === 'active' || 
           subscription?.subscriptionStatus === 'trialing';
  };

  const hasReachedUserLimit = (): boolean => {
    if (!subscription) return false;
    return subscription.currentUsers >= subscription.maxUsers;
  };

  const getUserLimitPercentage = (): number => {
    if (!subscription || subscription.maxUsers === 0) return 0;
    return Math.min(100, (subscription.currentUsers / subscription.maxUsers) * 100);
  };

  return {
    modules,
    subscription,
    isLoading: modulesLoading || subscriptionLoading,
    hasModule,
    isTrialActive,
    isTrialExpired,
    getTrialDaysRemaining,
    isSubscriptionActive,
    hasReachedUserLimit,
    getUserLimitPercentage,
  };
}
