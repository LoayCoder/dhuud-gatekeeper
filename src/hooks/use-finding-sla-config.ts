import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface FindingSLAConfig {
  id: string;
  tenant_id: string;
  classification: string;
  target_days: number;
  warning_days_before: number;
  escalation_days_after: number;
  second_escalation_days_after: number | null;
  created_at: string;
  updated_at: string;
}

// Default SLA configurations by classification
const DEFAULT_SLA_CONFIGS: Record<string, Omit<FindingSLAConfig, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>> = {
  critical_nc: {
    classification: 'critical_nc',
    target_days: 3,
    warning_days_before: 1,
    escalation_days_after: 1,
    second_escalation_days_after: 2,
  },
  major_nc: {
    classification: 'major_nc',
    target_days: 7,
    warning_days_before: 2,
    escalation_days_after: 2,
    second_escalation_days_after: 4,
  },
  minor_nc: {
    classification: 'minor_nc',
    target_days: 14,
    warning_days_before: 3,
    escalation_days_after: 3,
    second_escalation_days_after: 7,
  },
  observation: {
    classification: 'observation',
    target_days: 30,
    warning_days_before: 5,
    escalation_days_after: 5,
    second_escalation_days_after: 10,
  },
};

export function useFindingSLAConfigs() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['finding-sla-configs', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('finding_sla_configs')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('classification');

      if (error) throw error;

      // Merge with defaults for any missing classifications
      const configMap = new Map(data.map(c => [c.classification, c]));
      const allConfigs: FindingSLAConfig[] = [];

      for (const [classification, defaultConfig] of Object.entries(DEFAULT_SLA_CONFIGS)) {
        if (configMap.has(classification)) {
          allConfigs.push(configMap.get(classification)!);
        } else {
          // Return a virtual config (not saved to DB yet)
          allConfigs.push({
            id: `default-${classification}`,
            tenant_id: profile.tenant_id,
            ...defaultConfig,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as FindingSLAConfig);
        }
      }

      return allConfigs;
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useFindingSLAConfigByClassification(classification: string) {
  const { data: configs } = useFindingSLAConfigs();
  
  return configs?.find(c => c.classification === classification) ?? {
    ...DEFAULT_SLA_CONFIGS[classification] ?? DEFAULT_SLA_CONFIGS.observation,
    id: `default-${classification}`,
    tenant_id: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as FindingSLAConfig;
}

export function useUpdateFindingSLAConfig() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (config: Partial<FindingSLAConfig> & { classification: string }) => {
      if (!profile?.tenant_id) throw new Error('No tenant ID');

      // Check if config exists
      const { data: existing } = await supabase
        .from('finding_sla_configs')
        .select('id')
        .eq('tenant_id', profile.tenant_id)
        .eq('classification', config.classification)
        .is('deleted_at', null)
        .single();

      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('finding_sla_configs')
          .update({
            target_days: config.target_days,
            warning_days_before: config.warning_days_before,
            escalation_days_after: config.escalation_days_after,
            second_escalation_days_after: config.second_escalation_days_after,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('finding_sla_configs')
          .insert({
            tenant_id: profile.tenant_id,
            classification: config.classification,
            target_days: config.target_days ?? DEFAULT_SLA_CONFIGS[config.classification]?.target_days ?? 14,
            warning_days_before: config.warning_days_before ?? DEFAULT_SLA_CONFIGS[config.classification]?.warning_days_before ?? 3,
            escalation_days_after: config.escalation_days_after ?? DEFAULT_SLA_CONFIGS[config.classification]?.escalation_days_after ?? 3,
            second_escalation_days_after: config.second_escalation_days_after ?? DEFAULT_SLA_CONFIGS[config.classification]?.second_escalation_days_after ?? 7,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finding-sla-configs'] });
      toast.success(t('sla.configUpdated', 'SLA configuration updated'));
    },
    onError: (error) => {
      console.error('Error updating SLA config:', error);
      toast.error(t('sla.configUpdateError', 'Failed to update SLA configuration'));
    },
  });
}

export function useInitializeFindingSLAConfigs() {
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error('No tenant ID');

      // Check what configs already exist
      const { data: existing } = await supabase
        .from('finding_sla_configs')
        .select('classification')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null);

      const existingClassifications = new Set(existing?.map(c => c.classification) ?? []);

      // Insert missing configs
      const toInsert = Object.entries(DEFAULT_SLA_CONFIGS)
        .filter(([classification]) => !existingClassifications.has(classification))
        .map(([classification, config]) => ({
          tenant_id: profile.tenant_id,
          ...config,
        }));

      if (toInsert.length > 0) {
        const { error } = await supabase
          .from('finding_sla_configs')
          .insert(toInsert);

        if (error) throw error;
      }

      return toInsert.length;
    },
  });
}
