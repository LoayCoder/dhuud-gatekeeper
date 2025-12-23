import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import type { Database } from '@/integrations/supabase/types';

export type NotificationMatrixRule = Database['public']['Tables']['incident_notification_matrix']['Row'];
export type NotificationMatrixInsert = Database['public']['Tables']['incident_notification_matrix']['Insert'];
export type NotificationMatrixUpdate = Database['public']['Tables']['incident_notification_matrix']['Update'];

export const STAKEHOLDER_ROLES = [
  'area_owner',
  'hsse_manager',
  'hsse_expert',
  'bc_team',
  'first_aider',
  'clinic_team',
  'site_manager',
  'security_manager',
] as const;

export type StakeholderRole = typeof STAKEHOLDER_ROLES[number];

export const SEVERITY_LEVELS = ['1', '2', '3', '4', '5'] as const;
export const CHANNELS = ['push', 'email', 'whatsapp'] as const;

export function useNotificationMatrix() {
  return useQuery({
    queryKey: ['notification-matrix'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('incident_notification_matrix')
        .select('*')
        .is('deleted_at', null)
        .order('stakeholder_role')
        .order('severity_level');

      if (error) throw error;
      return data;
    },
  });
}

export function useCreateMatrixRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (rule: Omit<NotificationMatrixInsert, 'tenant_id'>) => {
      // Get current user's tenant_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant found');

      const { data, error } = await supabase
        .from('incident_notification_matrix')
        .insert({
          ...rule,
          tenant_id: profile.tenant_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-matrix'] });
      toast({
        title: t('settings.notificationMatrix.ruleAdded'),
        description: t('settings.notificationMatrix.ruleAddedDesc'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateMatrixRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: NotificationMatrixUpdate }) => {
      const { data, error } = await supabase
        .from('incident_notification_matrix')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-matrix'] });
      toast({
        title: t('settings.notificationMatrix.ruleUpdated'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteMatrixRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      const { error } = await supabase
        .from('incident_notification_matrix')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-matrix'] });
      toast({
        title: t('settings.notificationMatrix.ruleDeleted'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useResetMatrixToDefaults() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant found');

      const { error } = await supabase.rpc('reset_notification_matrix_to_defaults', {
        p_tenant_id: profile.tenant_id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-matrix'] });
      toast({
        title: t('settings.notificationMatrix.resetSuccess'),
        description: t('settings.notificationMatrix.resetSuccessDesc'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Hook to get users for the user selector
export function useNotificationMatrixUsers() {
  return useQuery({
    queryKey: ['notification-matrix-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, job_title')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return data;
    },
  });
}

// Helper to check if a channel is enabled
export function hasChannel(channels: string[] | null, channel: string): boolean {
  return channels?.includes(channel) ?? false;
}

// Helper to toggle a channel in the array
export function toggleChannel(channels: string[] | null, channel: string): string[] {
  const currentChannels = channels ?? [];
  if (currentChannels.includes(channel)) {
    return currentChannels.filter(c => c !== channel);
  }
  return [...currentChannels, channel];
}
