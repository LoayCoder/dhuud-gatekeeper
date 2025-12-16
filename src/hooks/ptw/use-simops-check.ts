import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SIMOPSConflict {
  conflicting_permit_id: string;
  conflicting_reference_id: string;
  conflicting_permit_type: string;
  conflict_type: 'spatial' | 'temporal' | 'both';
  distance_meters: number | null;
  time_overlap_minutes: number;
  rule_description: string;
  auto_reject: boolean;
}

interface SIMOPSCheckParams {
  typeId?: string;
  siteId?: string;
  gpsLat?: number;
  gpsLng?: number;
  startTime?: Date;
  endTime?: Date;
  excludePermitId?: string;
}

export function useSIMOPSCheck(params: SIMOPSCheckParams) {
  const { typeId, siteId, gpsLat, gpsLng, startTime, endTime, excludePermitId } = params;
  
  const enabled = Boolean(typeId && siteId && startTime && endTime);
  
  return useQuery({
    queryKey: ['simops-conflicts', typeId, siteId, gpsLat, gpsLng, startTime?.toISOString(), endTime?.toISOString()],
    queryFn: async (): Promise<SIMOPSConflict[]> => {
      if (!typeId || !siteId || !startTime || !endTime) {
        return [];
      }
      
      const { data, error } = await supabase.rpc('check_simops_conflicts', {
        p_type_id: typeId,
        p_site_id: siteId,
        p_gps_lat: gpsLat ?? null,
        p_gps_lng: gpsLng ?? null,
        p_start_time: startTime.toISOString(),
        p_end_time: endTime.toISOString(),
        p_exclude_permit_id: excludePermitId ?? null,
      });
      
      if (error) {
        console.error('SIMOPS check error:', error);
        return [];
      }
      
      return (data || []) as SIMOPSConflict[];
    },
    enabled,
    staleTime: 30 * 1000, // 30 seconds - refresh often during form edits
  });
}

export function useHasBlockingConflict(conflicts: SIMOPSConflict[] | undefined) {
  if (!conflicts || conflicts.length === 0) return false;
  return conflicts.some(c => c.auto_reject);
}
