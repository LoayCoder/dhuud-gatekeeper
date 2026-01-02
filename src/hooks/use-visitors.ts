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
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['visitors', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      let query = supabase
        .from('visitors')
        .select('id, full_name, phone, company_name, national_id, qr_code_token, is_active, last_visit_at, created_at, user_type, host_name, host_phone, host_email, host_id, qr_generated_at, visit_end_time, deleted_at')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null) // Soft-delete filter (HSSA compliance)
        .order('created_at', { ascending: false });

      if (filters?.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
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
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['visitor', id],
    queryFn: async () => {
      if (!id || !tenantId) throw new Error('Missing required params');

      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null) // Soft-delete filter
        .single();

      if (error) throw error;
      return data as Visitor;
    },
    enabled: !!id && !!tenantId,
  });
}

interface CreateVisitorParams {
  full_name: string;
  phone?: string | null;
  company_name?: string | null;
  national_id?: string | null;
  user_type?: 'internal' | 'external';
  host_id?: string | null;
  host_name?: string | null;
  host_phone?: string | null;
  host_email?: string | null;
}

export function useCreateVisitor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async (visitor: CreateVisitorParams) => {
      if (!tenantId) throw new Error('No tenant');

      // Generate a unique QR token (but don't set qr_generated_at until approved)
      const qrToken = crypto.randomUUID();

      const { data, error } = await supabase
        .from('visitors')
        .insert({
          full_name: visitor.full_name,
          phone: visitor.phone,
          company_name: visitor.company_name,
          national_id: visitor.national_id,
          user_type: visitor.user_type || 'external',
          host_id: visitor.host_id,
          host_name: visitor.host_name,
          host_phone: visitor.host_phone,
          host_email: visitor.host_email,
          tenant_id: tenantId,
          qr_code_token: qrToken,
          // qr_generated_at remains null until approval
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

export function useResetVisitorQR() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Generate a new QR token and clear qr_used_at
      const newQrToken = crypto.randomUUID();

      const { data, error } = await supabase
        .from('visitors')
        .update({
          qr_code_token: newQrToken,
          qr_used_at: null,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      queryClient.invalidateQueries({ queryKey: ['visitor'] });
      toast({ title: 'Visitor QR code reset successfully' });
    },
    onError: (error) => {
      toast({ title: 'Failed to reset QR code', description: error.message, variant: 'destructive' });
    },
  });
}

export function useVisitorByQRToken(token: string | undefined) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['visitor-qr', token],
    queryFn: async () => {
      if (!token || !tenantId) throw new Error('Missing params');

      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .eq('qr_code_token', token)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null) // Soft-delete filter
        .single();

      if (error) throw error;
      return data as Visitor;
    },
    enabled: !!token && !!tenantId,
  });
}

// Mark QR as generated (called after approval)
export function useMarkQRGenerated() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (visitorId: string) => {
      const { data, error } = await supabase
        .from('visitors')
        .update({ qr_generated_at: new Date().toISOString() })
        .eq('id', visitorId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      queryClient.invalidateQueries({ queryKey: ['visitor'] });
    },
  });
}
