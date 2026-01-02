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
    phone: string | null;
    company_name: string | null;
    national_id: string | null;
    qr_code_token: string;
    host_name: string | null;
    host_phone: string | null;
    host_email: string | null;
    host_id: string | null;
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
          id, status, valid_from, valid_until, security_notes, created_at, host_id, visitor_id, site_id, tenant_id, approved_by, qr_issued_at, host_notified_at,
          visitor:visitors(id, full_name, email, phone, company_name, national_id, qr_code_token, host_name, host_phone, host_email, host_id),
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
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
      // First, get the request details to find visitor and host info
      const { data: request, error: fetchError } = await supabase
        .from('visit_requests')
        .select(`
          id, visitor_id, host_id, tenant_id, site_id, valid_from, valid_until,
          visitor:visitors(id, full_name, phone, qr_code_token, host_phone, host_name),
          host:profiles!visit_requests_host_id_fkey(id, full_name, phone_number),
          site:sites(id, name)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Update the visit request status
      const { data, error } = await supabase
        .from('visit_requests')
        .update({
          status: 'approved',
          approved_by: user?.id,
          security_notes: notes,
          qr_issued_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Mark QR as generated on the visitor record
      if (request?.visitor_id) {
        await supabase
          .from('visitors')
          .update({ qr_generated_at: new Date().toISOString() })
          .eq('id', request.visitor_id);
      }

      // Get webpage notification settings
      const { data: webpageSettings } = await supabase
        .from('webpage_notification_settings')
        .select('visitor_webpage_enabled, visitor_message_template, visitor_message_template_ar')
        .eq('tenant_id', profile?.tenant_id)
        .is('deleted_at', null)
        .maybeSingle();

      // Pass only qr_code_token - edge function will build correct URL with www.dhuud.com domain
      const qrToken = request?.visitor?.qr_code_token || '';

      // Send WhatsApp notification to VISITOR with badge link
      const visitorPhone = request?.visitor?.phone;
      if (visitorPhone && profile?.tenant_id && webpageSettings?.visitor_webpage_enabled !== false) {
        try {
          await supabase.functions.invoke('send-gate-whatsapp', {
            body: {
              notification_type: 'visitor_badge_link',
              mobile_number: visitorPhone,
              visitor_name: request?.visitor?.full_name || 'Visitor',
              badge_url: qrToken, // Now just the token, edge function builds full URL with correct domain
              destination_name: request?.site?.name || 'Reception',
              tenant_id: profile.tenant_id,
            },
          });

          // Update visitor_notified_at
          await supabase
            .from('visit_requests')
            .update({ visitor_notified_at: new Date().toISOString() })
            .eq('id', id);
        } catch (notifyError) {
          console.error('Failed to send visitor badge notification:', notifyError);
        }
      }

      // Host notification removed - host will be notified when visitor QR is scanned at gate
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-requests'] });
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      toast({ title: 'Visit approved and notifications sent' });
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
