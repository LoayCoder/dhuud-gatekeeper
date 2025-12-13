import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export type Visitor = Tables<'visitors'>;
export type VisitorInsert = TablesInsert<'visitors'>;
export type VisitorUpdate = TablesUpdate<'visitors'>;

interface UseVisitorsFilters {
  search?: string;
  isActive?: boolean;
}

export function useVisitors(filters?: UseVisitorsFilters) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['visitors', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      let query = supabase
        .from('visitors')
        .select('id, full_name, email, company_name, national_id, qr_code_token, is_active, last_visit_at, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (filters?.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`);
      }

      if (filters?.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as Visitor[];
    },
    enabled: !!tenantId,
  });
}

export function useVisitor(id: string | undefined) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['visitor', id],
    queryFn: async () => {
      if (!id || !tenantId) throw new Error('Missing required params');

      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      return data as Visitor;
    },
    enabled: !!id && !!tenantId,
  });
}

export function useCreateVisitor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tenantId } = useAuth();

  return useMutation({
    mutationFn: async (visitor: Omit<VisitorInsert, 'tenant_id' | 'qr_code_token'>) => {
      if (!tenantId) throw new Error('No tenant');

      // Generate a unique QR token
      const qrToken = crypto.randomUUID();

      const { data, error } = await supabase
        .from('visitors')
        .insert({
          ...visitor,
          tenant_id: tenantId,
          qr_code_token: qrToken,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      toast({ title: 'Visitor registered successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to register visitor', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateVisitor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: VisitorUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('visitors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      toast({ title: 'Visitor updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to update visitor', description: error.message, variant: 'destructive' });
    },
  });
}

export function useVisitorByQRToken(token: string | undefined) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: ['visitor-qr', token],
    queryFn: async () => {
      if (!token || !tenantId) throw new Error('Missing params');

      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .eq('qr_code_token', token)
        .eq('tenant_id', tenantId)
        .single();

      if (error) throw error;
      return data as Visitor;
    },
    enabled: !!token && !!tenantId,
  });
}
