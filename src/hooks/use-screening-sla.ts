import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ScreeningSLAConfig {
  id: string;
  tenant_id: string;
  severity_level: string;
  max_screening_hours: number;
  warning_hours_before: number;
  escalation_hours: number;
  is_active: boolean;
}

export interface ScreeningSLAStatus {
  incidentId: string;
  hoursWaiting: number;
  maxHours: number;
  warningThreshold: number;
  escalationThreshold: number;
  status: 'ok' | 'warning' | 'escalated';
  escalationLevel: number;
}

// Default SLA configs
const DEFAULT_SLA_CONFIGS: Record<string, { maxHours: number; warningHours: number; escalationHours: number }> = {
  'Level 1': { maxHours: 24, warningHours: 4, escalationHours: 8 },
  'Level 2': { maxHours: 12, warningHours: 2, escalationHours: 4 },
  'Level 3': { maxHours: 8, warningHours: 2, escalationHours: 4 },
  'Level 4': { maxHours: 4, warningHours: 1, escalationHours: 2 },
  'Level 5': { maxHours: 2, warningHours: 1, escalationHours: 1 },
};

export function useScreeningSLAConfigs() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['screening-sla-configs'],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('screening_sla_configs')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .is('deleted_at', null);

      if (error) throw error;
      return (data || []) as ScreeningSLAConfig[];
    },
    enabled: !!user?.id,
  });
}

export function useScreeningSLAStatus(incidentId: string | null, createdAt: string | null, severity: string | null) {
  const { data: configs } = useScreeningSLAConfigs();

  if (!incidentId || !createdAt) {
    return null;
  }

  const severityLevel = severity || 'Level 2';
  const config = configs?.find(c => c.severity_level === severityLevel);
  
  const maxHours = config?.max_screening_hours || DEFAULT_SLA_CONFIGS[severityLevel]?.maxHours || 8;
  const warningHours = config?.warning_hours_before || DEFAULT_SLA_CONFIGS[severityLevel]?.warningHours || 2;
  const escalationHours = config?.escalation_hours || DEFAULT_SLA_CONFIGS[severityLevel]?.escalationHours || 4;

  const createdDate = new Date(createdAt);
  const now = new Date();
  const hoursWaiting = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);

  const warningThreshold = maxHours - warningHours;
  const escalationThreshold = maxHours + escalationHours;

  let status: 'ok' | 'warning' | 'escalated' = 'ok';
  let escalationLevel = 0;

  if (hoursWaiting >= escalationThreshold) {
    status = 'escalated';
    escalationLevel = hoursWaiting >= (maxHours + escalationHours * 2) ? 2 : 1;
  } else if (hoursWaiting >= warningThreshold) {
    status = 'warning';
  }

  return {
    incidentId,
    hoursWaiting,
    maxHours,
    warningThreshold,
    escalationThreshold,
    status,
    escalationLevel,
  } as ScreeningSLAStatus;
}

export function useUpdateScreeningSLAConfig() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (config: Partial<ScreeningSLAConfig> & { severity_level: string }) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.tenant_id) throw new Error('No tenant found');

      const { error } = await supabase
        .from('screening_sla_configs')
        .upsert({
          tenant_id: profile.tenant_id,
          severity_level: config.severity_level,
          max_screening_hours: config.max_screening_hours,
          warning_hours_before: config.warning_hours_before,
          escalation_hours: config.escalation_hours,
          is_active: true,
        }, {
          onConflict: 'tenant_id,severity_level',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screening-sla-configs'] });
    },
  });
}
