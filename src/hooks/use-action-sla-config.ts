import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface ActionSLAConfig {
  id: string;
  priority: string;
  warning_days_before: number;
  escalation_days_after: number;
  second_escalation_days_after: number | null;
  created_at: string;
  updated_at: string;
}

export function useActionSLAConfig() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: slaConfigs = [], isLoading } = useQuery({
    queryKey: ['action-sla-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('action_sla_configs')
        .select('*')
        .order('warning_days_before', { ascending: true });

      if (error) throw error;
      return data as ActionSLAConfig[];
    },
  });

  const updateSLAConfig = useMutation({
    mutationFn: async ({
      priority,
      warning_days_before,
      escalation_days_after,
      second_escalation_days_after,
    }: Omit<ActionSLAConfig, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase
        .from('action_sla_configs')
        .update({
          warning_days_before,
          escalation_days_after,
          second_escalation_days_after,
          updated_at: new Date().toISOString(),
        })
        .eq('priority', priority);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-sla-configs'] });
      toast.success(t('adminActions.slaUpdated', 'SLA configuration updated successfully'));
    },
    onError: (error) => {
      console.error('Error updating action SLA config:', error);
      toast.error(t('adminActions.slaUpdateError', 'Failed to update SLA configuration'));
    },
  });

  const getConfigByPriority = (priority: string | null) => {
    return slaConfigs.find(config => config.priority === (priority || 'medium'));
  };

  return {
    slaConfigs,
    isLoading,
    updateSLAConfig,
    getConfigByPriority,
  };
}
