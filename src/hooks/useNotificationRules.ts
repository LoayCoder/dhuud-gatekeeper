import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export type NotificationEventType = 
  | 'incident_created'
  | 'incident_critical'
  | 'visitor_registered'
  | 'visitor_checked_in'
  | 'action_assigned'
  | 'action_overdue';

export type NotificationChannel = 'whatsapp' | 'sms' | 'push' | 'email';

export interface NotificationRule {
  id: string;
  tenant_id: string;
  event_type: NotificationEventType;
  role_code: string | null;
  branch_id: string | null;
  user_id: string | null;
  channel: NotificationChannel;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  branch?: { id: string; name: string } | null;
  user?: { id: string; full_name: string } | null;
}

export interface NotificationRuleInput {
  event_type: NotificationEventType;
  role_code?: string | null;
  branch_id?: string | null;
  user_id?: string | null;
  channel?: NotificationChannel;
  is_active?: boolean;
}

export function useNotificationRules() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['notification-rules', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('notification_recipients')
        .select(`
          id, tenant_id, event_type, role_code, branch_id, user_id, channel, is_active, created_at, updated_at,
          branch:branches!notification_recipients_branch_id_fkey(id, name),
          user:profiles!notification_recipients_user_id_fkey(id, full_name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('event_type', { ascending: true });

      if (error) throw error;
      return data as unknown as NotificationRule[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useCreateNotificationRule() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NotificationRuleInput) => {
      if (!profile?.tenant_id || !user?.id) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('notification_recipients')
        .insert({
          tenant_id: profile.tenant_id,
          event_type: input.event_type,
          role_code: input.role_code || null,
          branch_id: input.branch_id || null,
          user_id: input.user_id || null,
          channel: input.channel || 'whatsapp',
          is_active: input.is_active ?? true,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-rules'] });
      toast({
        title: t('common.success'),
        description: t('admin.notifications.ruleCreated', 'Notification rule created'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateNotificationRule() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<NotificationRuleInput> & { id: string }) => {
      const { error } = await supabase
        .from('notification_recipients')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-rules'] });
      toast({
        title: t('common.success'),
        description: t('admin.notifications.ruleUpdated', 'Notification rule updated'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteNotificationRule() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notification_recipients')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-rules'] });
      toast({
        title: t('common.success'),
        description: t('admin.notifications.ruleDeleted', 'Notification rule deleted'),
      });
    },
    onError: (error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useToggleNotificationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('notification_recipients')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-rules'] });
    },
  });
}

// Available event types with labels
export const EVENT_TYPE_OPTIONS: Array<{ value: NotificationEventType; labelKey: string; labelAr: string; labelEn: string }> = [
  { value: 'incident_created', labelKey: 'admin.notifications.events.incidentCreated', labelAr: 'عند الإبلاغ عن حادثة', labelEn: 'When incident is reported' },
  { value: 'incident_critical', labelKey: 'admin.notifications.events.incidentCritical', labelAr: 'عند الإبلاغ عن حادثة خطيرة', labelEn: 'When critical incident is reported' },
  { value: 'visitor_registered', labelKey: 'admin.notifications.events.visitorRegistered', labelAr: 'عند تسجيل زائر', labelEn: 'When visitor is registered' },
  { value: 'visitor_checked_in', labelKey: 'admin.notifications.events.visitorCheckedIn', labelAr: 'عند دخول زائر', labelEn: 'When visitor checks in' },
  { value: 'action_assigned', labelKey: 'admin.notifications.events.actionAssigned', labelAr: 'عند تعيين إجراء تصحيحي', labelEn: 'When action is assigned' },
  { value: 'action_overdue', labelKey: 'admin.notifications.events.actionOverdue', labelAr: 'عند تأخر إجراء تصحيحي', labelEn: 'When action is overdue' },
];

// Available role options
export const ROLE_OPTIONS = [
  { value: 'admin', labelAr: 'مدير النظام', labelEn: 'Admin' },
  { value: 'hsse_manager', labelAr: 'مدير السلامة', labelEn: 'HSSE Manager' },
  { value: 'hsse_officer', labelAr: 'مسؤول السلامة', labelEn: 'HSSE Officer' },
  { value: 'manager', labelAr: 'مدير', labelEn: 'Manager' },
  { value: 'security_manager', labelAr: 'مدير الأمن', labelEn: 'Security Manager' },
  { value: 'area_manager', labelAr: 'مدير المنطقة', labelEn: 'Area Manager' },
];
