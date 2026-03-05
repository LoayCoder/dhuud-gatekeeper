// Investigation SLA config hook stub
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useInvestigationSLAConfig(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['investigation-sla-config', tenantId],
    queryFn: async () => {
      if (!tenantId) return null;
      const { data, error } = await (supabase as any)
        .from('investigation_sla_configs')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!tenantId,
  });
}
