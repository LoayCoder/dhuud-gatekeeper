import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RecentEvent {
  id: string;
  reference_id: string;
  description_preview: string;
  event_type: string;
  subtype: string | null;
  status: string;
  severity: string | null;
  created_at: string;
  occurred_at: string | null;
  branch_id?: string | null;
}

interface RecentEventsFilters {
  branchId?: string;
  startDate?: Date;
  endDate?: Date;
}

export function useRecentEvents(limit: number = 10, filters?: RecentEventsFilters) {
  const { profile } = useAuth();
  const branchId = filters?.branchId;
  const startDate = filters?.startDate;
  const endDate = filters?.endDate;

  return useQuery({
    queryKey: ['recent-hsse-events', profile?.tenant_id, branchId || 'all', startDate?.toISOString(), endDate?.toISOString(), limit],
    queryFn: async () => {
      let query = supabase
        .from('incidents')
        .select('id, reference_id, description, event_type, subtype, status, severity, created_at, occurred_at, branch_id')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      // Apply branch filter
      if (branchId) {
        query = query.eq('branch_id', branchId);
      }

      // Apply date range filter
      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return (data || []).map(incident => ({
        id: incident.id,
        reference_id: incident.reference_id || '',
        description_preview: incident.description?.substring(0, 100) || '',
        event_type: incident.event_type,
        subtype: incident.subtype,
        status: incident.status || '',
        severity: incident.severity,
        created_at: incident.created_at || '',
        occurred_at: incident.occurred_at,
        branch_id: incident.branch_id,
      })) as RecentEvent[];
    },
    enabled: !!profile?.tenant_id,
    staleTime: 60 * 1000,
  });
}
