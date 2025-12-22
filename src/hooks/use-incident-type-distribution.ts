import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface IncidentTypeCount {
  incident_type: string;
  count: number;
}

export function useIncidentTypeDistribution(startDate?: Date, endDate?: Date) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['incident-type-distribution', profile?.tenant_id, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      let query = supabase
        .from('incidents')
        .select('incident_type')
        .eq('tenant_id', profile.tenant_id)
        .eq('event_type', 'incident')
        .is('deleted_at', null)
        .not('incident_type', 'is', null);

      if (startDate) {
        query = query.gte('occurred_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('occurred_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Count by incident_type
      const counts: Record<string, number> = {};
      (data || []).forEach((row) => {
        const type = row.incident_type || 'unknown';
        counts[type] = (counts[type] || 0) + 1;
      });

      // Convert to array and sort by count descending
      const result: IncidentTypeCount[] = Object.entries(counts)
        .map(([incident_type, count]) => ({ incident_type, count }))
        .sort((a, b) => b.count - a.count);

      return result;
    },
    enabled: !!profile?.tenant_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
