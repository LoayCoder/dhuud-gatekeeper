import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface Site {
  id: string;
  name: string;
  branch_id: string | null;
  branch_name?: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  boundary_polygon?: Coordinate[] | null;
}

export interface Branch {
  id: string;
  name: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Department {
  id: string;
  name: string;
  division_id: string;
  division_name?: string;
}

export function useTenantSites() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['tenant-sites', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('sites')
        .select(`
          id,
          name,
          branch_id,
          address,
          latitude,
          longitude,
          boundary_polygon,
          branches!sites_branch_id_fkey (name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;

      return data.map((site) => {
        // Parse boundary_polygon from JSON if it exists
        let boundaryPolygon: Coordinate[] | null = null;
        if (site.boundary_polygon && Array.isArray(site.boundary_polygon)) {
          boundaryPolygon = (site.boundary_polygon as unknown as Array<{ lat: number; lng: number }>).map(p => ({
            lat: p.lat,
            lng: p.lng,
          }));
        }
        
        return {
          id: site.id,
          name: site.name,
          branch_id: site.branch_id,
          branch_name: site.branches?.name ?? null,
          address: site.address,
          latitude: site.latitude,
          longitude: site.longitude,
          boundary_polygon: boundaryPolygon,
        };
      }) as Site[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useTenantBranches() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['tenant-branches', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('branches')
        .select('id, name, location, latitude, longitude')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;
      return data as Branch[];
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useTenantDepartments() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['tenant-departments', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { data, error } = await supabase
        .from('departments')
        .select(`
          id,
          name,
          division_id,
          divisions!departments_division_id_fkey (name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('name');

      if (error) throw error;

      return data.map((dept) => ({
        id: dept.id,
        name: dept.name,
        division_id: dept.division_id,
        division_name: dept.divisions?.name ?? null,
      })) as Department[];
    },
    enabled: !!profile?.tenant_id,
  });
}
