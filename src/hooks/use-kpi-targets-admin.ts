import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface KPITargetAdmin {
  id: string;
  kpi_code: string;
  target_value: number;
  warning_threshold: number | null;
  critical_threshold: number | null;
}

// KPI metadata - stored client-side since schema doesn't have these columns
export const KPI_METADATA: Record<string, { name: string; comparison_type: 'less_than' | 'greater_than'; description: string }> = {
  trir: { name: 'TRIR', comparison_type: 'less_than', description: 'Total recordable incidents per 200,000 man-hours' },
  ltifr: { name: 'LTIFR', comparison_type: 'less_than', description: 'Lost time injuries per 200,000 man-hours' },
  dart_rate: { name: 'DART Rate', comparison_type: 'less_than', description: 'Days away from work cases per 200,000 man-hours' },
  fatality_rate: { name: 'Fatality Rate', comparison_type: 'less_than', description: 'Fatalities per 200,000 man-hours' },
  severity_rate: { name: 'Severity Rate', comparison_type: 'less_than', description: 'Average lost days per recordable incident' },
  near_miss_rate: { name: 'Near Miss Rate', comparison_type: 'greater_than', description: 'Near misses per 200,000 man-hours (higher is better - indicates reporting culture)' },
  action_closure_pct: { name: 'Action Closure %', comparison_type: 'greater_than', description: 'Percentage of corrective actions closed on time' },
  observation_completion_pct: { name: 'Observation Completion %', comparison_type: 'greater_than', description: 'Percentage of observations resolved' },
};

export function useKPITargetsAdmin() {
  return useQuery({
    queryKey: ['kpi-targets-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kpi_targets')
        .select('id, kpi_code, target_value, warning_threshold, critical_threshold')
        .is('deleted_at', null)
        .order('kpi_code');

      if (error) throw error;
      return (data ?? []) as KPITargetAdmin[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateKPITarget() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      id,
      target_value,
      warning_threshold,
      critical_threshold,
    }: {
      id: string;
      target_value: number;
      warning_threshold: number;
      critical_threshold: number;
    }) => {
      const { data, error } = await supabase
        .from('kpi_targets')
        .update({
          target_value,
          warning_threshold,
          critical_threshold,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-targets-admin'] });
      queryClient.invalidateQueries({ queryKey: ['kpi-targets'] });
      toast.success(t('kpiAdmin.saveSuccess', 'KPI target updated successfully'));
    },
    onError: (error) => {
      toast.error(t('kpiAdmin.saveError', 'Failed to update KPI target'));
      console.error('KPI update error:', error);
    },
  });
}
