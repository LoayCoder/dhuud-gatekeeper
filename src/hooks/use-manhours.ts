import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ManhourRecord {
  id: string;
  tenant_id: string;
  period_date: string;
  period_type: 'daily' | 'weekly' | 'monthly';
  employee_hours: number;
  contractor_hours: number;
  branch_id: string | null;
  site_id: string | null;
  department_id: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
  branches?: { name: string } | null;
  sites?: { name: string } | null;
  departments?: { name: string } | null;
}

interface CreateManhourInput {
  period_date: string;
  period_type: 'daily' | 'weekly' | 'monthly';
  employee_hours: number;
  contractor_hours: number;
  branch_id?: string | null;
  site_id?: string | null;
  department_id?: string | null;
  notes?: string | null;
}

export function useManhours(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['manhours', startDate, endDate],
    queryFn: async () => {
      let query = supabase
        .from('manhours')
        .select(`
          id,
          tenant_id,
          period_date,
          period_type,
          employee_hours,
          contractor_hours,
          branch_id,
          site_id,
          department_id,
          notes,
          recorded_by,
          created_at,
          updated_at,
          branches(name),
          sites(name),
          departments(name)
        `)
        .is('deleted_at', null)
        .order('period_date', { ascending: false });

      if (startDate) {
        query = query.gte('period_date', startDate);
      }
      if (endDate) {
        query = query.lte('period_date', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ManhourRecord[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateManhour() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateManhourInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('Profile not found');

      const { data, error } = await supabase
        .from('manhours')
        .insert({
          ...input,
          tenant_id: profile.tenant_id,
          recorded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manhours'] });
      toast.success('Manhours record created successfully');
    },
    onError: (error: Error) => {
      console.error('Error creating manhours:', error);
      toast.error(error.message || 'Failed to create manhours record');
    },
  });
}

export function useUpdateManhour() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<CreateManhourInput>) => {
      const { data, error } = await supabase
        .from('manhours')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manhours'] });
      toast.success('Manhours record updated successfully');
    },
    onError: (error: Error) => {
      console.error('Error updating manhours:', error);
      toast.error(error.message || 'Failed to update manhours record');
    },
  });
}

export function useDeleteManhour() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('manhours')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manhours'] });
      toast.success('Manhours record deleted successfully');
    },
    onError: (error: Error) => {
      console.error('Error deleting manhours:', error);
      toast.error(error.message || 'Failed to delete manhours record');
    },
  });
}

export function useManhoursSummary(startDate: string, endDate: string, branchId?: string, siteId?: string) {
  return useQuery({
    queryKey: ['manhours-summary', startDate, endDate, branchId, siteId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_manhours_summary', {
        p_start_date: startDate,
        p_end_date: endDate,
        p_branch_id: branchId || null,
        p_site_id: siteId || null,
        p_department_id: null,
      });

      if (error) throw error;
      return data?.[0] || { total_employee_hours: 0, total_contractor_hours: 0, total_hours: 0, record_count: 0 };
    },
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });
}
