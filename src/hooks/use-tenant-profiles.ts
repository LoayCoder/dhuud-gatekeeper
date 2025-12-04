import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface TenantProfile {
  id: string;
  tenant_id: string;
  profile_type: 'visitor' | 'member' | 'contractor';
  full_name: string;
  email?: string;
  phone?: string;
  national_id?: string;
  company_name?: string;
  has_login: boolean;
  is_active: boolean;
  is_deleted: boolean;
  deleted_at?: string;
  // Member fields
  membership_id?: string;
  membership_start?: string;
  membership_end?: string;
  // Contractor fields
  contractor_type?: 'long_term' | 'short_term';
  contract_start?: string;
  contract_end?: string;
  // Visitor fields
  visit_reason?: string;
  host_id?: string;
  visit_date?: string;
  visit_duration_hours?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateTenantProfileInput {
  profile_type: 'visitor' | 'member' | 'contractor';
  full_name: string;
  email?: string;
  phone?: string;
  national_id?: string;
  company_name?: string;
  has_login?: boolean;
  // Member fields
  membership_id?: string;
  membership_start?: string;
  membership_end?: string;
  // Contractor fields
  contractor_type?: 'long_term' | 'short_term';
  contract_start?: string;
  contract_end?: string;
  // Visitor fields
  visit_reason?: string;
  host_id?: string;
  visit_date?: string;
  visit_duration_hours?: number;
}

export function useTenantProfiles(tenantId?: string, profileType?: string) {
  const { profile } = useAuth();
  const targetTenantId = tenantId || profile?.tenant_id;

  const { data: profiles, isLoading, error, refetch } = useQuery({
    queryKey: ['tenant-profiles', targetTenantId, profileType],
    queryFn: async (): Promise<TenantProfile[]> => {
      if (!targetTenantId) return [];

      let query = supabase
        .from('tenant_profiles')
        .select(`
          id, tenant_id, profile_type, full_name, email, phone,
          company_name, has_login, is_active, is_deleted,
          membership_id, membership_start, membership_end,
          contractor_type, contract_start, contract_end,
          visit_reason, host_id, visit_date, visit_duration_hours,
          created_at, updated_at
        `)
        .eq('tenant_id', targetTenantId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (profileType && ['visitor', 'member', 'contractor'].includes(profileType)) {
        query = query.eq('profile_type', profileType as 'visitor' | 'member' | 'contractor');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TenantProfile[];
    },
    enabled: !!targetTenantId,
  });

  return {
    profiles,
    isLoading,
    error,
    refetch,
  };
}

export function useCreateTenantProfile() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (input: CreateTenantProfileInput) => {
      if (!profile?.tenant_id) throw new Error('No tenant ID');

      const { data, error } = await supabase
        .from('tenant_profiles')
        .insert({
          tenant_id: profile.tenant_id,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profile-usage'] });
      toast.success(t('common.saved'));
    },
    onError: (error) => {
      toast.error(t('common.error'));
      console.error(error);
    },
  });
}

export function useUpdateTenantProfile() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TenantProfile> & { id: string }) => {
      const { data, error } = await supabase
        .from('tenant_profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profile-usage'] });
      toast.success(t('common.saved'));
    },
    onError: (error) => {
      toast.error(t('common.error'));
      console.error(error);
    },
  });
}

export function useDeleteTenantProfile() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      const { error } = await supabase
        .from('tenant_profiles')
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString(),
          is_active: false,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-profiles'] });
      queryClient.invalidateQueries({ queryKey: ['profile-usage'] });
      toast.success(t('common.deleted'));
    },
    onError: (error) => {
      toast.error(t('common.error'));
      console.error(error);
    },
  });
}
