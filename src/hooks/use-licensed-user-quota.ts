import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface LicensedUserQuota {
  current_licensed_users: number;
  max_licensed_users: number;
  can_add_user: boolean;
  remaining_slots: number;
}

export interface UserTypeBreakdown {
  employees: number;
  contractors_longterm: number;
  members_with_login: number;
  total: number;
}

export function useLicensedUserQuota(tenantId?: string) {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const targetTenantId = tenantId || profile?.tenant_id;

  const { data: quota, isLoading, error, refetch } = useQuery({
    queryKey: ['licensed-user-quota', targetTenantId],
    queryFn: async (): Promise<LicensedUserQuota | null> => {
      if (!targetTenantId) return null;

      const { data, error } = await supabase
        .rpc('check_licensed_user_quota', { p_tenant_id: targetTenantId });

      if (error) throw error;
      return data as unknown as LicensedUserQuota;
    },
    enabled: !!targetTenantId,
  });

  const { data: breakdown, isLoading: breakdownLoading } = useQuery({
    queryKey: ['user-type-breakdown', targetTenantId],
    queryFn: async (): Promise<UserTypeBreakdown> => {
      if (!targetTenantId) return { employees: 0, contractors_longterm: 0, members_with_login: 0, total: 0 };

      const { data, error } = await supabase
        .from('profiles')
        .select('user_type, has_login, is_active, is_deleted')
        .eq('tenant_id', targetTenantId)
        .eq('has_login', true)
        .eq('is_active', true)
        .or('is_deleted.is.null,is_deleted.eq.false');

      if (error) throw error;

      const breakdown: UserTypeBreakdown = {
        employees: 0,
        contractors_longterm: 0,
        members_with_login: 0,
        total: 0,
      };

      data?.forEach((user) => {
        if (user.user_type === 'employee') breakdown.employees++;
        else if (user.user_type === 'contractor_longterm') breakdown.contractors_longterm++;
        else if (user.user_type === 'member') breakdown.members_with_login++;
        breakdown.total++;
      });

      return breakdown;
    },
    enabled: !!targetTenantId,
  });

  const usagePercentage = quota ? Math.round((quota.current_licensed_users / quota.max_licensed_users) * 100) : 0;
  const isNearQuota = usagePercentage >= 80;
  const isAtQuota = !quota?.can_add_user;

  const checkCanAddUser = () => {
    if (!quota?.can_add_user) {
      toast.error(t('userManagement.quotaReached'));
      return false;
    }
    return true;
  };

  return {
    quota,
    breakdown,
    isLoading: isLoading || breakdownLoading,
    error,
    refetch,
    usagePercentage,
    isNearQuota,
    isAtQuota,
    checkCanAddUser,
  };
}

export function isLicensedUser(user: {
  has_login?: boolean;
  user_type?: string;
  is_active?: boolean;
}): boolean {
  if (!user.has_login || !user.is_active) return false;
  return ['employee', 'contractor_longterm', 'member'].includes(user.user_type || '');
}
