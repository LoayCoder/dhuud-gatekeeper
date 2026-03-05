import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface GeofenceEscalationRule {
  id: string;
  tenant_id: string;
  zone_id: string | null;
  rule_name: string;
  zone_type: string | null;
  breach_count_threshold: number;
  time_window_minutes: number;
  escalation_level: number;
  notify_roles: string[];
  notify_user_ids: string[] | null;
  auto_escalate: boolean;
  escalation_delay_minutes: number;
  is_active: boolean;
  created_at: string;
  zone?: { zone_name: string } | null;
}

export function useGeofenceEscalationRules() {
  return useQuery({
    queryKey: ['geofence-escalation-rules'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('geofence_escalation_rules' as any)
        .select(`*, zone:security_zones(zone_name)`)
        .is('deleted_at', null)
        .order('escalation_level', { ascending: true }));

      if (error) throw error;
      return data as unknown as GeofenceEscalationRule[];
    },
  });
}

export function useCreateEscalationRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { profile, user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      rule_name: string;
      zone_id?: string;
      zone_type?: string;
      breach_count_threshold: number;
      time_window_minutes: number;
      escalation_level: number;
      notify_roles: string[];
      notify_user_ids?: string[];
      auto_escalate?: boolean;
      escalation_delay_minutes?: number;
    }) => {
      if (!profile?.tenant_id) throw new Error('No tenant');

      const { data, error } = await (supabase
        .from('geofence_escalation_rules' as any)
        .insert({
          tenant_id: profile.tenant_id,
          rule_name: params.rule_name,
          zone_id: params.zone_id || null,
          zone_type: params.zone_type || null,
          breach_count_threshold: params.breach_count_threshold,
          time_window_minutes: params.time_window_minutes,
          escalation_level: params.escalation_level,
          notify_roles: params.notify_roles,
          notify_user_ids: params.notify_user_ids || null,
          auto_escalate: params.auto_escalate ?? true,
          escalation_delay_minutes: params.escalation_delay_minutes ?? 5,
          created_by: user?.id,
        })
        .select()
        .single());

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofence-escalation-rules'] });
      toast({ title: 'Escalation rule created' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create rule',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateEscalationRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<GeofenceEscalationRule> & { id: string }) => {
      const { data, error } = await (supabase
        .from('geofence_escalation_rules' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single());

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofence-escalation-rules'] });
      toast({ title: 'Escalation rule updated' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update rule',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteEscalationRule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await (supabase
        .from('geofence_escalation_rules' as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', ruleId));

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofence-escalation-rules'] });
      toast({ title: 'Escalation rule deleted' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete rule',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}

export function useEscalatedAlerts() {
  return useQuery({
    queryKey: ['escalated-geofence-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('geofence_alerts')
        .select(`
          *,
          guard:profiles!geofence_alerts_guard_id_fkey(full_name),
          zone:security_zones(zone_name)
        `)
        .gt('escalation_level', 0)
        .is('deleted_at', null)
        .order('escalated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });
}
