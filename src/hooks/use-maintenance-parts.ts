import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import type { Database } from '@/integrations/supabase/types';

// Use database types directly
type MaintenancePartRow = Database['public']['Tables']['maintenance_parts']['Row'];
type MaintenancePartInsert = Database['public']['Tables']['maintenance_parts']['Insert'];

export type MaintenancePart = MaintenancePartRow;

export interface PartFilters {
  search?: string;
  category?: string;
  stockStatus?: 'all' | 'low' | 'out-of-stock';
  page?: number;
  pageSize?: number;
}

export function useMaintenanceParts(filters: PartFilters = {}) {
  const { profile } = useAuth();
  const { search = '', category, page = 1, pageSize = 20 } = filters;

  return useQuery({
    queryKey: ['maintenance-parts', filters, profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return { data: [], count: 0 };

      let query = supabase
        .from('maintenance_parts')
        .select('*', { count: 'exact' })
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .order('name');

      if (search) {
        query = query.or(`name.ilike.%${search}%,part_number.ilike.%${search}%`);
      }

      if (category) {
        query = query.eq('category', category);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      
      return { data: data || [], count: count ?? 0 };
    },
    enabled: !!profile?.tenant_id,
  });
}

export function useMaintenancePart(id: string | undefined) {
  return useQuery({
    queryKey: ['maintenance-part', id],
    queryFn: async () => {
      if (!id) return null;
      
      const { data, error } = await supabase
        .from('maintenance_parts')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateMaintenancePart() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (part: Omit<MaintenancePartInsert, 'tenant_id'>) => {
      if (!profile?.tenant_id) throw new Error('No tenant');
      
      const { data, error } = await supabase
        .from('maintenance_parts')
        .insert({ ...part, tenant_id: profile.tenant_id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-parts'] });
      toast.success('Part created successfully');
    },
    onError: (error) => {
      console.error('Failed to create part:', error);
      toast.error('Failed to create part');
    },
  });
}

export function useUpdateMaintenancePart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MaintenancePartRow> & { id: string }) => {
      const { data, error } = await supabase
        .from('maintenance_parts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-parts'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance-part', data.id] });
      toast.success('Part updated successfully');
    },
    onError: (error) => {
      console.error('Failed to update part:', error);
      toast.error('Failed to update part');
    },
  });
}

export function useDeleteMaintenancePart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('maintenance_parts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-parts'] });
      toast.success('Part deleted successfully');
    },
    onError: (error) => {
      console.error('Failed to delete part:', error);
      toast.error('Failed to delete part');
    },
  });
}

export function usePartCategories() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['part-categories', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];
      
      const { data, error } = await supabase
        .from('maintenance_parts')
        .select('category')
        .eq('tenant_id', profile.tenant_id)
        .is('deleted_at', null)
        .not('category', 'is', null);
      
      if (error) throw error;
      
      const categories = [...new Set(data.map(d => d.category).filter(Boolean))];
      return categories as string[];
    },
    enabled: !!profile?.tenant_id,
  });
}
