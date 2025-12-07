import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { Json } from "@/integrations/supabase/types";

export interface ClosureRequest {
  id: string;
  reference_id: string;
  title: string;
  status: string;
  closure_requested_by: string | null;
  closure_requested_at: string | null;
  closure_request_notes: string | null;
  requester_name?: string;
}

export interface ClosureCheckResult {
  can_close: boolean;
  total_actions: number;
  verified_actions: number;
  pending_actions: { id: string; title: string; status: string }[];
}

// Check if all actions for an incident are verified/closed
export function useCanCloseIncident(incidentId: string | null) {
  return useQuery({
    queryKey: ['can-close-incident', incidentId],
    queryFn: async (): Promise<ClosureCheckResult> => {
      if (!incidentId) return { can_close: false, total_actions: 0, verified_actions: 0, pending_actions: [] };

      const { data, error } = await supabase.rpc('can_close_investigation', {
        p_incident_id: incidentId,
      });

      if (error) throw error;
      return data as unknown as ClosureCheckResult;
    },
    enabled: !!incidentId,
  });
}

// Alias for useCanCloseIncident for compatibility
export const useIncidentClosureEligibility = useCanCloseIncident;

// Combined hook for approval actions
export function useIncidentClosureApproval(incidentId: string) {
  const approveMutation = useApproveIncidentClosure();
  const rejectMutation = useRejectIncidentClosure();
  
  return {
    approveClosureMutation: {
      mutate: ({ notes }: { notes?: string }) => approveMutation.mutate({ incidentId }),
      isPending: approveMutation.isPending,
    },
    rejectClosureMutation: {
      mutate: ({ notes }: { notes?: string }) => rejectMutation.mutate({ incidentId, rejectionNotes: notes || '' }),
      isPending: rejectMutation.isPending,
    },
  };
}

// Request incident closure
export function useRequestIncidentClosure() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      incidentId,
      notes,
    }: {
      incidentId: string;
      notes?: string;
    }) => {
      if (!profile?.tenant_id || !user?.id) {
        throw new Error('User not authenticated');
      }

      // Update incident to pending_closure status
      // Using type assertion since pending_closure is a new enum value
      const { data, error } = await supabase
        .from('incidents')
        .update({
          status: 'pending_closure' as unknown as 'submitted',
          closure_requested_by: user.id,
          closure_requested_at: new Date().toISOString(),
          closure_request_notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', incidentId)
        .select('id, reference_id')
        .single();

      if (error) throw error;

      // Log audit entry
      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'closure_requested',
        new_value: { notes, requested_at: new Date().toISOString() } as unknown as Json,
      });

      // Send email notification to HSSE Managers
      try {
        await supabase.functions.invoke('send-incident-email', {
          body: {
            type: 'closure_requested',
            incident_id: incidentId,
            incident_reference: data.reference_id,
            tenant_id: profile.tenant_id,
            requested_by_name: profile.full_name,
            notes,
          },
        });
      } catch (emailError) {
        console.error('Failed to send closure request email:', emailError);
      }

      return data;
    },
    onSuccess: (_, { incidentId }) => {
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['pending-closures'] });
      toast.success(t('investigation.closureRequested', 'Closure request submitted'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error: ') + error.message);
    },
  });
}

// Approve incident closure
export function useApproveIncidentClosure() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      incidentId,
    }: {
      incidentId: string;
    }) => {
      if (!profile?.tenant_id || !user?.id) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('incidents')
        .update({
          status: 'closed',
          closure_approved_by: user.id,
          closure_approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', incidentId)
        .select('id, reference_id, closure_requested_by')
        .single();

      if (error) throw error;

      // Log audit entry
      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'closure_approved',
        new_value: { approved_at: new Date().toISOString() } as unknown as Json,
      });

      // Send email to investigator
      try {
        await supabase.functions.invoke('send-incident-email', {
          body: {
            type: 'closure_approved',
            incident_id: incidentId,
            incident_reference: data.reference_id,
            tenant_id: profile.tenant_id,
            approved_by_name: profile.full_name,
          },
        });
      } catch (emailError) {
        console.error('Failed to send closure approval email:', emailError);
      }

      return data;
    },
    onSuccess: (_, { incidentId }) => {
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['pending-closures'] });
      toast.success(t('investigation.closureApproved', 'Incident closed successfully'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error: ') + error.message);
    },
  });
}

// Reject incident closure
export function useRejectIncidentClosure() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async ({
      incidentId,
      rejectionNotes,
    }: {
      incidentId: string;
      rejectionNotes: string;
    }) => {
      if (!profile?.tenant_id || !user?.id) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('incidents')
        .update({
          status: 'investigation_in_progress',
          closure_rejection_notes: rejectionNotes,
          closure_requested_by: null,
          closure_requested_at: null,
          closure_request_notes: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', incidentId)
        .select('id, reference_id, closure_requested_by')
        .single();

      if (error) throw error;

      // Log audit entry
      await supabase.from('incident_audit_logs').insert({
        incident_id: incidentId,
        tenant_id: profile.tenant_id,
        actor_id: user.id,
        action: 'closure_rejected',
        new_value: { rejection_notes: rejectionNotes, rejected_at: new Date().toISOString() } as unknown as Json,
      });

      // Send email to investigator
      try {
        await supabase.functions.invoke('send-incident-email', {
          body: {
            type: 'closure_rejected',
            incident_id: incidentId,
            incident_reference: data.reference_id,
            tenant_id: profile.tenant_id,
            rejected_by_name: profile.full_name,
            rejection_notes: rejectionNotes,
          },
        });
      } catch (emailError) {
        console.error('Failed to send closure rejection email:', emailError);
      }

      return data;
    },
    onSuccess: (_, { incidentId }) => {
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      queryClient.invalidateQueries({ queryKey: ['pending-closures'] });
      toast.success(t('investigation.closureRejected', 'Closure request rejected'));
    },
    onError: (error) => {
      toast.error(t('common.error', 'Error: ') + error.message);
    },
  });
}

// Get all pending closure requests for HSSE Managers
export function usePendingClosureRequests() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['pending-closures', profile?.tenant_id],
    queryFn: async () => {
      if (!profile?.tenant_id) return [];

      // Using filter instead of eq for new enum value not in types yet
      const { data, error } = await supabase
        .from('incidents')
        .select(`
          id,
          reference_id,
          title,
          status,
          closure_requested_by,
          closure_requested_at,
          closure_request_notes,
          profiles!incidents_closure_requested_by_fkey(full_name)
        `)
        .eq('tenant_id', profile.tenant_id)
        .filter('status', 'eq', 'pending_closure')
        .is('deleted_at', null)
        .order('closure_requested_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        reference_id: row.reference_id,
        title: row.title,
        status: row.status,
        closure_requested_by: row.closure_requested_by,
        closure_requested_at: row.closure_requested_at,
        closure_request_notes: row.closure_request_notes,
        requester_name: (row.profiles as { full_name?: string } | null)?.full_name,
      })) as ClosureRequest[];
    },
    enabled: !!profile?.tenant_id,
  });
}
