import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables, TablesInsert, TablesUpdate, Enums } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export type VisitRequest = Tables<'visit_requests'>;
export type VisitRequestInsert = TablesInsert<'visit_requests'>;
export type VisitRequestUpdate = TablesUpdate<'visit_requests'>;
export type VisitStatus = Enums<'visit_status'>;

interface VisitRequestWithRelations extends VisitRequest {
  visitor?: {
    id: string;
    full_name: string;
    email: string | null;
    company_name: string | null;
    national_id: string | null;
    qr_code_token: string;
  } | null;
  site?: {
    id: string;
    name: string;
  } | null;
}

interface UseVisitRequestsFilters {
  status?: VisitStatus;
  hostId?: string;
  siteId?: string;
  todayOnly?: boolean;
}

export function useVisitRequests(filters?: UseVisitRequestsFilters) {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ['visit-requests', tenantId, filters],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant');

      let query = supabase
        .from('visit_requests')
        .select(`
          id, status, valid_from, valid_until, security_notes, created_at, host_id, visitor_id, site_id, tenant_id, approved_by,
          visitor:visitors(id, full_name, email, company_name, national_id, qr_code_token),
          site:sites(id, name)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.hostId) {
        query = query.eq('host_id', filters.hostId);
      }

      if (filters?.siteId) {
        query = query.eq('site_id', filters.siteId);
      }

      if (filters?.todayOnly) {
        const today = new Date().toISOString().split('T')[0];
        query = query.lte('valid_from', today + 'T23:59:59').gte('valid_until', today + 'T00:00:00');
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data as VisitRequestWithRelations[];
    },
    enabled: !!tenantId,
  });
}

export function usePendingSecurityRequests() {
  return useVisitRequests({ status: 'pending_security' });
}

export function useTodaysVisitors() {
  return useVisitRequests({ todayOnly: true });
}

export function useMyHostedVisits() {
  const { user } = useAuth();
  return useVisitRequests({ hostId: user?.id });
}

export function useCurrentlyOnSite() {
  return useVisitRequests({ status: 'checked_in' });
}

export function useCreateVisitRequest() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;

  return useMutation({
    mutationFn: async (request: Omit<VisitRequestInsert, 'tenant_id'>) => {
      if (!tenantId) throw new Error('No tenant');

      const { data, error } = await supabase
        .from('visit_requests')
        .insert({
          ...request,
          tenant_id: tenantId,
          status: 'pending_security',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-requests'] });
      toast({ title: 'Visit request submitted' });
    },
    onError: (error) => {
      toast({ title: 'Failed to submit request', description: error.message, variant: 'destructive' });
    },
  });
}

export function useApproveVisitRequest() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('visit_requests')
        .update({
          status: 'approved',
          approved_by: user?.id,
          security_notes: notes,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-requests'] });
      toast({ title: 'Visit approved' });
    },
    onError: (error) => {
      toast({ title: 'Failed to approve', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRejectVisitRequest() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error } = await supabase
        .from('visit_requests')
        .update({
          status: 'rejected',
          approved_by: user?.id,
          security_notes: reason,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-requests'] });
      toast({ title: 'Visit rejected' });
    },
    onError: (error) => {
      toast({ title: 'Failed to reject', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCheckInVisitor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase
        .from('visit_requests')
        .update({ status: 'checked_in' })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;

      // Update visitor's last_visit_at
      const request = data as VisitRequest;
      await supabase
        .from('visitors')
        .update({ last_visit_at: new Date().toISOString() })
        .eq('id', request.visitor_id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-requests'] });
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      toast({ title: 'Visitor checked in' });
    },
    onError: (error) => {
      toast({ title: 'Check-in failed', description: error.message, variant: 'destructive' });
    },
  });
}

export function useCheckOutVisitor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase
        .from('visit_requests')
        .update({ status: 'checked_out' })
        .eq('id', requestId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-requests'] });
      toast({ title: 'Visitor checked out' });
    },
    onError: (error) => {
      toast({ title: 'Check-out failed', description: error.message, variant: 'destructive' });
    },
  });
}
