// Re-exports real contractor hooks for use by PTW and other modules
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

// Re-export types for backward compatibility
export interface ContractorCompany {
  id: string;
  company_name: string;
  [key: string]: unknown;
}

export interface ContractorProjectRecord {
  id: string;
  project_code: string;
  project_name: string;
  company_id: string;
  site_id: string | null;
  latitude: number | null;
  longitude: number | null;
  boundary_polygon: Array<{ lat: number; lng: number }> | null;
  geofence_radius_meters: number | null;
  [key: string]: unknown;
}

/**
 * Safe wrapper that fetches contractor companies directly
 * instead of relying on the feature hook (which needs BranchFilter context).
 */
export function useContractorCompanies() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['contractor-companies-ptw', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('contractor_companies')
        .select('id, company_name, company_name_ar, status, tenant_id')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .eq('status', 'approved')
        .order('company_name');
      if (error) throw error;
      return data as ContractorCompany[];
    },
    enabled: !!tenantId,
  });
}

/**
 * Safe wrapper that fetches contractor projects directly.
 */
export function useContractorProjects() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['contractor-projects-ptw', tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const { data, error } = await supabase
        .from('contractor_projects')
        .select('id, project_code, project_name, company_id, site_id, status, tenant_id, latitude, longitude, boundary_polygon, geofence_radius_meters')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('project_name');
      if (error) throw error;
      return data as unknown as ContractorProjectRecord[];
    },
    enabled: !!tenantId,
  });
}

export function useCreateContractorWorker() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const { error } = await supabase
        .from('contractor_workers')
        .insert(data as Database['public']['Tables']['contractor_workers']['Insert']);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractor-workers'] });
      toast.success('Worker created');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
