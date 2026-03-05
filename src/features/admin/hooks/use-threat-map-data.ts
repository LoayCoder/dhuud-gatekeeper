import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ThreatLocation {
  id: string;
  ip_address: string;
  block_type: string;
  reason: string | null;
  blocked_at: string;
  failed_attempts: number;
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ThreatMapStats {
  total_blocked: number;
  permanent_blocks: number;
  temporary_blocks: number;
  countries_count: number;
  top_countries: Array<{ country: string; count: number }>;
  unresolved_count: number;
}

export type TimeRange = '24h' | '7d' | '30d' | 'all';

export function useThreatMapData(timeRange: TimeRange = 'all') {
  return useQuery({
    queryKey: ['threat-map-data', timeRange],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_blocked_ips_geo', {
        p_time_range: timeRange
      });

      if (error) throw error;
      
      const threats = (data || []) as ThreatLocation[];
      
      // Calculate statistics
      const countryMap = new Map<string, number>();
      let permanent = 0;
      let temporary = 0;
      let unresolved = 0;

      threats.forEach(t => {
        if (t.block_type === 'permanent') permanent++;
        else temporary++;
        
        if (t.latitude === null || t.longitude === null) {
          unresolved++;
        }
        
        if (t.country) {
          countryMap.set(t.country, (countryMap.get(t.country) || 0) + 1);
        }
      });

      const top_countries = Array.from(countryMap.entries())
        .map(([country, count]) => ({ country, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const stats: ThreatMapStats = {
        total_blocked: threats.length,
        permanent_blocks: permanent,
        temporary_blocks: temporary,
        countries_count: countryMap.size,
        top_countries,
        unresolved_count: unresolved
      };

      return { threats, stats };
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useResolveGeolocations() {
  const queryClient = useQueryClient();
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  return useMutation({
    mutationFn: async (ipAddresses: string[]) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${supabaseUrl}/functions/v1/geolocate-ip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ ip_addresses: ipAddresses })
      });

      if (!response.ok) {
        throw new Error('Failed to resolve IP geolocations');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['threat-map-data'] });
    }
  });
}
