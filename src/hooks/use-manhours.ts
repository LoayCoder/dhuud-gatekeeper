import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ManhourRecord {
  id: string;
  tenant_id: string;
  period_date: string;
  period_type: 'daily' | 'weekly' | 'monthly';
  employee_hours: number;
  contractor_hours: number;
  employee_count: number;
  contractor_count: number;
  hours_per_day: number;
  working_days: number;
  calculation_mode: 'manual' | 'auto';
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

export interface CreateManhourInput {
  period_date: string;
  period_type: 'daily' | 'weekly' | 'monthly';
  employee_hours: number;
  contractor_hours: number;
  employee_count?: number;
  contractor_count?: number;
  hours_per_day?: number;
  working_days?: number;
  calculation_mode?: 'manual' | 'auto';
  branch_id?: string | null;
  site_id?: string | null;
  department_id?: string | null;
  notes?: string | null;
}

export function useManhours(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['manhours', startDate, endDate],
    queryFn: async () => {
      const { getManhours } = await import('@/features/admin');
      return getManhours(startDate, endDate) as Promise<ManhourRecord[]>;
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

      const { createManhour } = await import('@/features/admin');
      return createManhour(input, user.id, profile.tenant_id);
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
      const { updateManhour } = await import('@/features/admin');
      return updateManhour(id, input);
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
      const { deleteManhour } = await import('@/features/admin');
      return deleteManhour(id);
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
      const { getManhoursSummary } = await import('@/features/admin');
      return getManhoursSummary(startDate, endDate, branchId, siteId);
    },
    enabled: !!startDate && !!endDate,
    staleTime: 5 * 60 * 1000,
  });
}
