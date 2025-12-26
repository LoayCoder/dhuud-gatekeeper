import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface InvestigationSLAConfig {
  id: string;
  severity_level: string;
  target_days: number;
  warning_days_before: number;
  escalation_days_after: number;
  second_escalation_days_after: number | null;
  created_at: string;
  updated_at: string;
}

export function useInvestigationSLAConfig() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: slaConfigs = [], isLoading } = useQuery({
    queryKey: ['investigation-sla-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investigation_sla_configs')
        .select('*')
        .order('target_days', { ascending: true });

      if (error) throw error;
      return data as InvestigationSLAConfig[];
    },
  });

  const updateSLAConfig = useMutation({
    mutationFn: async ({
      severity_level,
      target_days,
      warning_days_before,
      escalation_days_after,
      second_escalation_days_after,
    }: Omit<InvestigationSLAConfig, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase
        .from('investigation_sla_configs')
        .update({
          target_days,
          warning_days_before,
          escalation_days_after,
          second_escalation_days_after,
          updated_at: new Date().toISOString(),
        })
        .eq('severity_level', severity_level);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investigation-sla-configs'] });
      toast.success(t('adminActions.slaUpdated', 'SLA configuration updated successfully'));
    },
    onError: (error) => {
      console.error('Error updating investigation SLA config:', error);
      toast.error(t('adminActions.slaUpdateError', 'Failed to update SLA configuration'));
    },
  });

  const getConfigBySeverity = (severityLevel: string | null) => {
    return slaConfigs.find(config => config.severity_level === (severityLevel || 'Level 3'));
  };

  return {
    slaConfigs,
    isLoading,
    updateSLAConfig,
    getConfigBySeverity,
  };
}
