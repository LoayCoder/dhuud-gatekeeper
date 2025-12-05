import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface SLAConfig {
  id: string;
  priority: string;
  first_response_hours: number;
  resolution_hours: number;
  escalation_hours: number;
  created_at: string;
  updated_at: string;
}

export function useSLAConfig() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: slaConfigs = [], isLoading } = useQuery({
    queryKey: ['sla-configs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sla_configs')
        .select('*')
        .order('first_response_hours', { ascending: true });

      if (error) throw error;
      return data as SLAConfig[];
    },
  });

  const updateSLAConfig = useMutation({
    mutationFn: async ({ 
      priority, 
      first_response_hours, 
      resolution_hours, 
      escalation_hours 
    }: Omit<SLAConfig, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase
        .from('sla_configs')
        .update({ 
          first_response_hours, 
          resolution_hours, 
          escalation_hours,
          updated_at: new Date().toISOString()
        })
        .eq('priority', priority);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sla-configs'] });
      toast.success(t('adminSupport.slaUpdated'));
    },
    onError: (error) => {
      console.error('Error updating SLA config:', error);
      toast.error(t('adminSupport.slaUpdateError'));
    },
  });

  const getSLAConfigByPriority = (priority: string) => {
    return slaConfigs.find(config => config.priority === priority);
  };

  return {
    slaConfigs,
    isLoading,
    updateSLAConfig,
    getSLAConfigByPriority,
  };
}
