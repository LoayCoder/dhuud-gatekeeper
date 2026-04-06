// Re-exports real contractor hooks for use by PTW and other modules
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { useContractorCompanies as useRealContractorCompanies } from '@/features/contractors/hooks/use-contractor-companies';
import { useContractorProjects as useRealContractorProjects } from '@/features/contractors/hooks/use-contractor-projects';

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

// Wrap real hooks to match the no-arg call signature used by PTW
export function useContractorCompanies() {
  return useRealContractorCompanies();
}

export function useContractorProjects() {
  return useRealContractorProjects();
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
