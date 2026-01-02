import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface ProtocolStep {
  order: number;
  title: string;
  title_ar?: string;
  description?: string;
  description_ar?: string;
  is_required: boolean;
  photo_required?: boolean;
}

export interface EmergencyProtocol {
  id: string;
  tenant_id: string;
  alert_type: string;
  protocol_name: string;
  protocol_name_ar?: string;
  steps: ProtocolStep[];
  sla_minutes: number;
  is_active: boolean;
  created_at: string;
}

export interface StepCompletion {
  step_order: number;
  completed_at: string;
  completed_by: string;
  notes?: string;
  photo_path?: string;
}

export interface ProtocolExecution {
  id: string;
  tenant_id: string;
  alert_id: string;
  protocol_id?: string;
  status: 'new' | 'in_progress' | 'escalated' | 'closed';
  started_at: string;
  started_by?: string;
  completed_at?: string;
  completed_by?: string;
  escalation_reason?: string;
  escalated_at?: string;
  escalated_to?: string;
  steps_completed: StepCompletion[];
  notes?: string;
}

export function useEmergencyProtocols(alertType?: string) {
  return useQuery({
    queryKey: ['emergency-protocols', alertType],
    queryFn: async () => {
      let query = supabase
        .from('emergency_response_protocols')
        .select('*')
        .is('deleted_at', null)
        .eq('is_active', true);

      if (alertType) {
        query = query.eq('alert_type', alertType);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        steps: (d.steps || []) as unknown as ProtocolStep[],
      })) as EmergencyProtocol[];
    },
  });
}

export function useProtocolExecution(alertId: string) {
  return useQuery({
    queryKey: ['protocol-execution', alertId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emergency_protocol_executions')
        .select('*')
        .eq('alert_id', alertId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        steps_completed: (data.steps_completed || []) as unknown as StepCompletion[],
      } as ProtocolExecution;
    },
    enabled: !!alertId,
  });
}

export function useStartProtocolExecution() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      alertId,
      protocolId,
    }: {
      alertId: string;
      protocolId?: string;
    }) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, tenant_id')
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant');

      const { data, error } = await supabase
        .from('emergency_protocol_executions')
        .insert({
          tenant_id: profile.tenant_id,
          alert_id: alertId,
          protocol_id: protocolId || null,
          status: 'in_progress',
          started_by: profile.id,
          steps_completed: [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['protocol-execution', variables.alertId] });
      queryClient.invalidateQueries({ queryKey: ['emergency-alerts'] });
      toast.success(t('security.emergency.protocolStarted', 'Emergency protocol started'));
    },
    onError: (error) => {
      console.error('Start protocol error:', error);
      toast.error(t('security.emergency.startError', 'Failed to start protocol'));
    },
  });
}

export function useCompleteProtocolStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      executionId,
      alertId,
      stepOrder,
      notes,
      photoPath,
    }: {
      executionId: string;
      alertId: string;
      stepOrder: number;
      notes?: string;
      photoPath?: string;
    }) => {
      const { data: profile } = await supabase.from('profiles').select('id').single();

      // Get current execution
      const { data: execution, error: fetchError } = await supabase
        .from('emergency_protocol_executions')
        .select('steps_completed')
        .eq('id', executionId)
        .single();

      if (fetchError) throw fetchError;

      const currentSteps = ((execution?.steps_completed || []) as unknown as StepCompletion[]);
      const newStep: StepCompletion = {
        step_order: stepOrder,
        completed_at: new Date().toISOString(),
        completed_by: profile?.id || 'unknown',
        notes,
        photo_path: photoPath,
      };

      const updatedSteps = [...currentSteps.filter(s => s.step_order !== stepOrder), newStep];

      const { error } = await supabase
        .from('emergency_protocol_executions')
        .update({ steps_completed: JSON.parse(JSON.stringify(updatedSteps)) })
        .eq('id', executionId);

      if (error) throw error;
      return { executionId, stepOrder };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['protocol-execution', variables.alertId] });
    },
  });
}

export function useEscalateProtocol() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      executionId,
      alertId,
      reason,
      escalateTo,
    }: {
      executionId: string;
      alertId: string;
      reason: string;
      escalateTo?: string;
    }) => {
      const { data: profile } = await supabase.from('profiles').select('id').single();

      const { error } = await supabase
        .from('emergency_protocol_executions')
        .update({
          status: 'escalated',
          escalation_reason: reason,
          escalated_at: new Date().toISOString(),
          escalated_to: escalateTo || null,
        })
        .eq('id', executionId);

      if (error) throw error;

      return { executionId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['protocol-execution', variables.alertId] });
      queryClient.invalidateQueries({ queryKey: ['emergency-alerts'] });
      toast.success(t('security.emergency.escalated', 'Protocol escalated'));
    },
  });
}

export function useCloseProtocol() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      executionId,
      alertId,
      notes,
    }: {
      executionId: string;
      alertId: string;
      notes?: string;
    }) => {
      const { data: profile } = await supabase.from('profiles').select('id').single();
      const now = new Date().toISOString();

      // Update protocol execution status
      const { error: execError } = await supabase
        .from('emergency_protocol_executions')
        .update({
          status: 'closed',
          completed_at: now,
          completed_by: profile?.id,
          notes,
        })
        .eq('id', executionId);

      if (execError) throw execError;

      // Also resolve the emergency alert
      const { error: alertError } = await supabase
        .from('emergency_alerts')
        .update({
          resolved_at: now,
          resolved_by: profile?.id,
          resolution_notes: notes || 'Resolved via protocol execution',
        })
        .eq('id', alertId);

      if (alertError) throw alertError;

      return { executionId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['protocol-execution', variables.alertId] });
      queryClient.invalidateQueries({ queryKey: ['emergency-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['active-emergency-alerts'] });
      toast.success(t('security.emergency.protocolClosed', 'Protocol closed successfully'));
    },
  });
}

