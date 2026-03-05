import { useQuery } from '@tanstack/react-query';
import { useState, useCallback } from 'react';

export interface SIMOPSConflict {
  conflicting_permit_id: string;
  conflicting_reference_id: string;
  conflicting_permit_type: string;
  conflict_type: 'spatial' | 'temporal' | 'both';
  distance_meters: number | null;
  time_overlap_minutes: number;
  rule_description: string;
  auto_reject: boolean;
  is_blocking: boolean;
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

export function useSIMOPSCheckQuery(params: SIMOPSCheckParams) {
  const { typeId, siteId, gpsLat, gpsLng, startTime, endTime, excludePermitId } = params;

  const enabled = Boolean(typeId && siteId && startTime && endTime);

  return useQuery({
    queryKey: ['simops-conflicts', typeId, siteId, gpsLat, gpsLng, startTime?.toISOString(), endTime?.toISOString()],
    queryFn: async (): Promise<SIMOPSConflict[]> => {
      if (!typeId || !siteId || !startTime || !endTime) {
        return [];
      }

      const { checkSimopsConflicts } = await import('@/features/ptw/services/ptwProjectService');
      const data = await checkSimopsConflicts({
        p_type_id: typeId,
        p_site_id: siteId,
        p_gps_lat: gpsLat ?? null,
        p_gps_lng: gpsLng ?? null,
        p_start_time: startTime.toISOString(),
        p_end_time: endTime.toISOString(),
        p_exclude_permit_id: excludePermitId ?? null,
      });

      return ((data || []) as Array<Omit<SIMOPSConflict, 'is_blocking'> & { auto_reject: boolean }>).map(c => ({
        ...c,
        is_blocking: c.auto_reject,
      }));
    },
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useSIMOPSCheck() {
  const [conflicts, setConflicts] = useState<SIMOPSConflict[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  const checkConflicts = useCallback(async (params: {
    type_id: string;
    site_id: string;
    planned_start_time: string;
    planned_end_time: string;
    building_id?: string;
    floor_zone_id?: string;
    gps_lat?: number;
    gps_lng?: number;
    exclude_permit_id?: string;
  }) => {
    setIsChecking(true);
    try {
      const { checkSimopsConflicts } = await import('@/features/ptw/services/ptwProjectService');
      const data = await checkSimopsConflicts({
        p_type_id: params.type_id,
        p_site_id: params.site_id,
        p_gps_lat: params.gps_lat ?? null,
        p_gps_lng: params.gps_lng ?? null,
        p_start_time: params.planned_start_time,
        p_end_time: params.planned_end_time,
        p_exclude_permit_id: params.exclude_permit_id ?? null,
      });

      const mappedConflicts = ((data || []) as Array<Omit<SIMOPSConflict, 'is_blocking'> & { auto_reject: boolean }>).map(c => ({
        ...c,
        is_blocking: c.auto_reject,
      }));

      setConflicts(mappedConflicts);
      return mappedConflicts;
    } finally {
      setIsChecking(false);
    }
  }, []);

  return { conflicts, isChecking, checkConflicts };
}

export function useHasBlockingConflict(conflicts: SIMOPSConflict[] | undefined) {
  if (!conflicts || conflicts.length === 0) return false;
  return conflicts.some(c => c.is_blocking);
}
