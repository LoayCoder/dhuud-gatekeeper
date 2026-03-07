// Stub: contractor-management hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';

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

export function useContractorCompanies(tenantId?: string) {
  return useQuery({ queryKey: ['contractor-companies', tenantId], queryFn: async () => [] as ContractorCompany[], enabled: !!tenantId });
}

export function useContractorProjects(tenantId?: string) {
  return useQuery({ queryKey: ['contractor-projects', tenantId], queryFn: async () => [] as ContractorProjectRecord[], enabled: !!tenantId });
}
