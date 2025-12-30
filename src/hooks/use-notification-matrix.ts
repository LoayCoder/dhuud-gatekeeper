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
  'dept_representative',
  'hsse_expert',
  'bc_team',
  'first_aider',
  'clinic_team',
  'security',
] as const;

export type StakeholderRole = typeof STAKEHOLDER_ROLES[number];

export const SEVERITY_LEVELS = ['level_1', 'level_2', 'level_3', 'level_4', 'level_5'] as const;
export const CHANNELS = ['push', 'email', 'whatsapp'] as const;

// Event types for separate notification matrices - now fully separate
export const EVENT_TYPES = ['incident', 'observation'] as const;
export type EventType = typeof EVENT_TYPES[number];

export function useNotificationMatrix(eventType?: EventType) {
  return useQuery({
    queryKey: ['notification-matrix', eventType],
    queryFn: async () => {
      let query = supabase
        .from('incident_notification_matrix')
        .select('*')
        .is('deleted_at', null);
      
      // Filter by exact event_type - separate matrices for incidents and observations
      if (eventType) {
        query = query.eq('event_type', eventType);
      }
      
      const { data, error } = await query
        .order('stakeholder_role')
        .order('severity_level');

      if (error) throw error;
      return data;
    },
  });
}

// Helper to get the current user's tenant_id
async function getCurrentTenantId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Not authenticated');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  if (!profile?.tenant_id) throw new Error('No tenant found');

  return profile.tenant_id;
}

export function useCreateMatrixRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (rule: Omit<NotificationMatrixInsert, 'tenant_id'> & { 
      whatsapp_template_id?: string | null; 
      email_template_id?: string | null;
      event_type?: EventType;
    }) => {
      const tenantId = await getCurrentTenantId();

      // Insert directly with event_type support
      const { data, error } = await supabase
        .from('incident_notification_matrix')
        .insert({
          tenant_id: tenantId,
          stakeholder_role: rule.stakeholder_role,
          severity_level: rule.severity_level,
          channels: rule.channels || [],
          condition_type: rule.condition_type || null,
          user_id: rule.user_id || null,
          event_type: rule.event_type || 'all',
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

// New batch create hook for creating multiple rules efficiently
export function useBatchCreateMatrixRules() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (rules: Array<Omit<NotificationMatrixInsert, 'tenant_id'> & { whatsapp_template_id?: string | null; email_template_id?: string | null }>) => {
      const tenantId = await getCurrentTenantId();

      // Process all rules using upsert RPC
      const results = await Promise.all(
        rules.map(rule =>
          supabase.rpc('upsert_notification_matrix_rule', {
            p_tenant_id: tenantId,
            p_stakeholder_role: rule.stakeholder_role,
            p_severity_level: rule.severity_level,
            p_channels: rule.channels || [],
            p_condition_type: rule.condition_type || null,
            p_user_id: rule.user_id || null,
            p_whatsapp_template_id: rule.whatsapp_template_id || null,
            p_email_template_id: rule.email_template_id || null,
          })
        )
      );

      // Check for any errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(errors[0].error?.message || 'Failed to create some rules');
      }

      return results.map(r => r.data);
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
      const tenantId = await getCurrentTenantId();

      const { error } = await supabase.rpc('reset_notification_matrix_to_defaults', {
        p_tenant_id: tenantId,
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
