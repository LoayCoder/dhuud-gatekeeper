import { supabase } from '@/integrations/supabase/client';
import type { Site, Branch, Department, Section, Coordinate } from '@/hooks/use-org-hierarchy';

export const getTenantSites = async (tenantId: string) => {
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
      geofence_radius_meters,
      branches!sites_branch_id_fkey (name)
    `)
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name');

    if (error) throw error;

    return data.map((site) => {
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
            geofence_radius_meters: site.geofence_radius_meters,
        };
    }) as Site[];
};

export const getTenantBranches = async (tenantId: string) => {
    const { data, error } = await supabase
        .from('branches')
        .select('id, name, location, latitude, longitude')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('name');

    if (error) throw error;
    return (data as Branch[]).filter(
        (b, i, arr) => arr.findIndex(x => x.id === b.id) === i
    );
};

export const getTenantDepartments = async (tenantId: string) => {
    const { data, error } = await supabase
        .from('departments')
        .select(`
      id,
      name,
      division_id,
      branch_id,
      divisions!departments_division_id_fkey (name)
    `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('name');

    if (error) throw error;

    return data.map((dept) => ({
        id: dept.id,
        name: dept.name,
        division_id: dept.division_id,
        division_name: dept.divisions?.name ?? null,
        branch_id: dept.branch_id ?? null,
    })) as Department[];
};

export const getTenantSections = async (tenantId: string) => {
    const { data, error } = await supabase
        .from('sections')
        .select(`
      id,
      name,
      department_id,
      departments!sections_department_id_fkey (name)
    `)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('name');

    if (error) throw error;

    return data.map((sec) => ({
        id: sec.id,
        name: sec.name,
        department_id: sec.department_id,
        department_name: sec.departments?.name ?? null,
    })) as Section[];
};
