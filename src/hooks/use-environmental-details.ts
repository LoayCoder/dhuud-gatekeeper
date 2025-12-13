import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

// Use database types directly
type EnvironmentalDetailsRow = Database['public']['Tables']['environmental_incident_details']['Row'];
type EnvironmentalDetailsInsertDB = Database['public']['Tables']['environmental_incident_details']['Insert'];

export type EnvironmentalDetails = EnvironmentalDetailsRow;
export type EnvironmentalDetailsInsert = EnvironmentalDetailsInsertDB;
export type EnvironmentalDetailsUpdate = Partial<EnvironmentalDetailsInsertDB>;

export function useEnvironmentalDetails(incidentId: string | undefined) {
  return useQuery({
    queryKey: ['environmental-details', incidentId],
    queryFn: async () => {
      if (!incidentId) return null;
      
      const { data, error } = await supabase
        .from('environmental_incident_details')
        .select('*')
        .eq('incident_id', incidentId)
        .is('deleted_at', null)
        .maybeSingle();
      
      if (error) throw error;
      return data as EnvironmentalDetails | null;
    },
    enabled: !!incidentId,
  });
}

export function useCreateEnvironmentalDetails() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (details: EnvironmentalDetailsInsert) => {
      const { data, error } = await supabase
        .from('environmental_incident_details')
        .insert(details)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['environmental-details', data.incident_id] });
      toast.success('Environmental details saved');
    },
    onError: (error) => {
      console.error('Failed to create environmental details:', error);
      toast.error('Failed to save environmental details');
    },
  });
}

export function useUpdateEnvironmentalDetails() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: EnvironmentalDetailsUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('environmental_incident_details')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['environmental-details', data.incident_id] });
      toast.success('Environmental details updated');
    },
    onError: (error) => {
      console.error('Failed to update environmental details:', error);
      toast.error('Failed to update environmental details');
    },
  });
}
