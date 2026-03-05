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
  geofence_radius_meters?: number | null;
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
  branch_id: string | null;
}

export interface Section {
  id: string;
  name: string;
  department_id: string;
  department_name?: string;
}

export function useTenantSites() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['tenant-sites', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { getTenantSites } = await import('@/features/admin');
      return getTenantSites(profile.tenant_id);
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

      const { getTenantBranches } = await import('@/features/admin');
      return getTenantBranches(profile.tenant_id);
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

      const { getTenantDepartments } = await import('@/features/admin');
      return getTenantDepartments(profile.tenant_id);
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useTenantSections() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['tenant-sections', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      const { getTenantSections } = await import('@/features/admin');
      return getTenantSections(profile.tenant_id);
    },
    enabled: !!profile?.tenant_id,
  });
}
